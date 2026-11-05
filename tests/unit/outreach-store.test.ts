import { describe, expect, it } from "vitest";
import seed from "../../data/resources.json";
import { deriveKeys, decrypt, encrypt, blindIndex, parseMasterKey } from "@/lib/outreach/crypto";
import { maskPhone, toE164, formatUs } from "@/lib/outreach/phone";
import { openOutreachDb, OutreachStore } from "@/lib/outreach/store";
import { SimulatedProvider, TwilioProvider } from "@/lib/outreach/providers";
import { processCampaign, answerText, confirmationText } from "@/lib/outreach/engine";
import { readConfig, readiness } from "@/lib/outreach/config";
import { inContactHours, smsSegments, withSmsFooter } from "@/lib/outreach/rules";
import type { Resource } from "@/lib/schema";

const KEY = "11".repeat(32);
// 2 p.m. Eastern on a weekday: inside contact hours.
const DAY = new Date("2026-11-05T19:00:00Z");
const NIGHT = new Date("2026-11-06T03:30:00Z"); // 10:30 p.m. Eastern

function fresh() {
  const db = openOutreachDb(":memory:");
  return { db, store: new OutreachStore(db, deriveKeys(KEY)) };
}

const cfg = readConfig({ PUBLIC_SITE_URL: "https://vets.example.org" });

describe("phone numbers", () => {
  it("normalizes US numbers and rejects bad ones", () => {
    expect(toE164("(540) 555-0134")).toBe("+15405550134");
    expect(toE164("1-540-555-0134")).toBe("+15405550134");
    expect(toE164("555-0134")).toBeNull();
    expect(toE164("(040) 555-0134")).toBeNull();
    expect(formatUs("+15405550134")).toBe("(540) 555-0134");
    expect(maskPhone("0134")).toBe("(•••) •••-0134");
  });
});

describe("encryption", () => {
  it("round-trips and detects tampering or a wrong key", () => {
    const k = deriveKeys(KEY);
    const c = encrypt(k, "+15405550134")!;
    expect(c).not.toContain("5405550134");
    expect(decrypt(k, c)).toBe("+15405550134");
    expect(() => decrypt(deriveKeys("22".repeat(32)), c)).toThrow();
    expect(blindIndex(k, "+15405550134")).toBe(blindIndex(k, "+15405550134"));
    expect(() => parseMasterKey("too-short")).toThrow(/32 bytes/);
    expect(deriveKeys(undefined).isDevKey).toBe(true);
  });
});

describe("subscribers and consent", () => {
  it("never stores phone, name or address in the clear", () => {
    const { db, store } = fresh();
    store.upsert(
      {
        phone: "540-555-0134",
        name: "Pat Example",
        address: { line1: "100 Example St", city: "Fredericksburg", state: "va", zip: "22401" },
        channels: ["sms", "mail"],
        source: "web",
        method: "web_form",
        recordedBy: "self",
      },
      DAY,
    );
    const dump = JSON.stringify(db.prepare("SELECT * FROM subscribers").all());
    expect(dump).not.toMatch(/5405550134|Pat Example|100 Example St/);
    expect(dump).toContain("0134"); // last four only
  });

  it("holds web text sign-ups as pending until the phone replies YES", () => {
    const { store } = fresh();
    const r = store.upsert({ phone: "5405550134", channels: ["sms", "voice"], source: "web", method: "web_form", recordedBy: "self" }, DAY);
    expect(r.needsSmsConfirm).toBe(true);
    expect(r.subscriber.sms).toBe("pending");
    expect(r.subscriber.voice).toBe("on");
    expect(store.confirmSms("(540) 555-0134", DAY)).toBe(true);
    expect(store.findByPhone("5405550134")!.sms).toBe("on");
    expect(store.consents(r.subscriber.id).map((c) => c.method)).toEqual(["web_form", "web_form", "sms_yes"]);
  });

  it("staff entries are active at once and record who entered them", () => {
    const { store } = fresh();
    const r = store.upsert({ phone: "5405550134", channels: ["sms"], source: "staff_phone", method: "verbal_phone", recordedBy: "QA" }, DAY);
    expect(r.subscriber.sms).toBe("on");
    expect(store.consents(r.subscriber.id)[0]).toMatchObject({ method: "verbal_phone", recorded_by: "QA", consent_version: expect.any(String) });
  });

  it("matches the same person however the number is typed, and keeps earlier choices", () => {
    const { store } = fresh();
    store.upsert({ phone: "5405550134", channels: ["sms"], topics: ["food"], locality: "stafford", source: "staff_phone", method: "verbal_phone", recordedBy: "QA" }, DAY);
    const again = store.upsert({ phone: "+1 (540) 555-0134", channels: ["voice"], source: "sms_keyword", method: "sms_keyword", recordedBy: "self" }, DAY);
    expect(again.created).toBe(false);
    expect(again.subscriber).toMatchObject({ sms: "on", voice: "on", topics: ["food"], locality: "stafford" });
    expect(store.list()).toHaveLength(1);
  });

  it("validates what each channel needs", () => {
    const { store } = fresh();
    const base = { source: "web" as const, method: "web_form" as const, recordedBy: "self" };
    expect(() => store.upsert({ ...base, channels: [] })).toThrow(/at least one/);
    expect(() => store.upsert({ ...base, channels: ["sms"] })).toThrow(/phone number/);
    expect(() => store.upsert({ ...base, channels: ["sms"], phone: "12345" })).toThrow(/10-digit/);
    expect(() => store.upsert({ ...base, channels: ["mail"], name: "A B" })).toThrow(/mailing address/);
    expect(() =>
      store.upsert({ ...base, channels: ["mail"], name: "A B", address: { line1: "1 Main", city: "X", state: "Virginia", zip: "22401" } }),
    ).toThrow(/two-letter/);
  });

  it("STOP turns off texts and calls, keeps letters, and is recorded", () => {
    const { store } = fresh();
    const r = store.upsert(
      {
        phone: "5405550134",
        name: "A B",
        address: { line1: "1 Main St", city: "Stafford", state: "VA", zip: "22554" },
        channels: ["sms", "voice", "mail"],
        source: "staff_paper",
        method: "paper_form",
        recordedBy: "QA",
      },
      DAY,
    );
    expect(store.optOutPhone("540.555.0134", ["sms", "voice"], "sms_stop", "self", DAY)).toEqual(["sms", "voice"]);
    expect(store.summary(r.subscriber.id)).toMatchObject({ sms: "off", voice: "off", mail: "on" });
    expect(store.consents(r.subscriber.id).filter((c) => !c.granted)).toHaveLength(2);
  });
});

describe("messages to subscribers", () => {
  function setup() {
    const { store } = fresh();
    const add = (phone: string, extra: object) =>
      store.upsert({ phone, channels: ["sms"], source: "staff_phone", method: "verbal_phone", recordedBy: "QA", ...extra }, DAY);
    add("5405550101", { topics: ["food"], locality: "stafford" });
    add("5405550102", { topics: [], locality: "caroline" }); // everything
    add("5405550103", { topics: ["legal"], locality: "stafford" });
    add("5405550104", { topics: ["food"], locality: "stafford", language: "es" });
    store.upsert({ phone: "5405550105", channels: ["sms"], source: "web", method: "web_form", recordedBy: "self" }, DAY); // pending
    return store;
  }

  it("targets by topic, place and language, and skips anyone not opted in", () => {
    const store = setup();
    const phones = (a: Parameters<typeof store.audience>[0]) => store.audience(a, "sms").map((s) => s.phoneLast4).sort();
    expect(phones({ topics: ["food"], localities: [], language: null })).toEqual(["0101", "0102", "0104"]);
    expect(phones({ topics: ["food"], localities: ["stafford"], language: null })).toEqual(["0101", "0104"]);
    expect(phones({ topics: [], localities: [], language: "es" })).toEqual(["0104"]);
    expect(phones({ topics: [], localities: [], language: null })).not.toContain("0105");
  });

  it("queues, sends in batches, honors late opt-outs, and never double-sends", async () => {
    const store = setup();
    const provider = new SimulatedProvider();
    const c = store.createCampaign({ title: "Food drive", sms_body: "Free food Saturday at the pantry.", channels: ["sms"], audience: { topics: ["food"] } }, "QA", DAY);
    expect(store.enqueue(c.id, DAY).sms).toBe(3);
    expect(() => store.enqueue(c.id, DAY)).toThrow(/already sent/);
    store.optOutPhone("5405550104", ["sms", "voice"], "sms_stop", "self", DAY);

    const first = await processCampaign(store, provider, cfg, c.id, 2, DAY);
    expect(first).toMatchObject({ processed: 2, remaining: 1, paused: null });
    const second = await processCampaign(store, provider, cfg, c.id, 2, DAY);
    expect(second.remaining).toBe(0);
    expect(store.campaign(c.id)!.status).toBe("sent");
    expect(store.deliveryStats(c.id).sms).toEqual({ simulated: 2, skipped_opted_out: 1 });
    expect(provider.sent).toHaveLength(2);
    expect(provider.sent[0].body).toMatch(/^Veteran Services Navigator: Free food/);
    expect(provider.sent[0].body).toMatch(/Reply STOP to opt out\.$/);
  });

  it("pauses texts and calls outside 8 a.m. to 9 p.m. Eastern", async () => {
    const store = setup();
    const c = store.createCampaign({ title: "Late", sms_body: "Hi", channels: ["sms"], audience: {} }, "QA", NIGHT);
    store.enqueue(c.id, NIGHT);
    const r = await processCampaign(store, new SimulatedProvider(), cfg, c.id, 20, NIGHT);
    expect(r).toMatchObject({ processed: 0, paused: "contact_hours" });
    expect(r.remaining).toBeGreaterThan(0);
  });

  it("prepares letters for printing and leaves out anyone who stopped letters", () => {
    const { store } = fresh();
    const mk = (line1: string, zip: string) =>
      store.upsert({ name: "Resident", address: { line1, city: "Fredericksburg", state: "VA", zip }, channels: ["mail"], source: "staff_paper", method: "paper_form", recordedBy: "QA" }, DAY);
    const a = mk("1 A St", "22401");
    mk("2 B St", "22401");
    // Same address typed again is the same person.
    expect(mk("1  a st", "22401").created).toBe(false);
    const c = store.createCampaign({ title: "Letter", mail_body: "Dear veteran…", channels: ["mail"], audience: {} }, "QA", DAY);
    expect(store.enqueue(c.id, DAY).mail).toBe(2);
    store.optOut(a.subscriber.id, ["mail"], "staff_removal", "QA", DAY);
    expect(store.letters(c.id).map((l) => l.address.line1)).toEqual(["2 B St"]);
    expect(store.markMailed(c.id, DAY)).toBe(2);
    expect(store.campaign(c.id)!.status).toBe("sent");
  });

  it("erasing a person removes their consents and deliveries", () => {
    const store = setup();
    const id = store.findByPhone("5405550101")!.id;
    const c = store.createCampaign({ title: "x", sms_body: "y", channels: ["sms"], audience: {} }, "QA", DAY);
    store.enqueue(c.id, DAY);
    store.erase(id);
    expect(store.get(id)).toBeNull();
    expect(store.consents(id)).toHaveLength(0);
  });
});

describe("text line end to end (simulated)", () => {
  it("confirms a pending web sign-up when the phone replies YES", async () => {
    const { store } = fresh();
    store.upsert({ phone: "5405550134", channels: ["sms"], source: "web", method: "web_form", recordedBy: "self" }, DAY);
    const provider = new SimulatedProvider();
    const out = await answerText("yes", "+15405550134", { store, provider, resources: seed as Resource[], cfg });
    expect(out.reply).toMatch(/confirmed/);
    expect(store.findByPhone("5405550134")!.sms).toBe("on");
    const stop = await answerText("STOP", "+15405550134", { store, provider, resources: seed as Resource[], cfg });
    expect(stop.reply).toMatch(/unsubscribed/);
    expect(store.findByPhone("5405550134")!.sms).toBe("off");
  });

  it("records what people ask for, without the message text", async () => {
    const { db, store } = fresh();
    await answerText("RIDE 22553 my name is Pat", "+15405550134", { store, provider: new SimulatedProvider(), resources: seed as Resource[], cfg });
    expect(store.demand(30, new Date()).rows[0]).toMatchObject({ topic: "transportation", locality: "spotsylvania", n: 1 });
    expect(JSON.stringify(db.prepare("SELECT * FROM inbound").all())).not.toMatch(/Pat|5405550134/);
  });

  it("confirmation text explains how to stop", () => {
    expect(confirmationText("VSN")).toMatch(/Reply YES/);
    expect(confirmationText("VSN")).toMatch(/STOP/);
  });
});

describe("rules and config", () => {
  it("contact hours follow Eastern time, including daylight saving", () => {
    expect(inContactHours(new Date("2026-07-01T11:59:00Z"))).toBe(false); // 7:59 EDT
    expect(inContactHours(new Date("2026-07-01T12:00:00Z"))).toBe(true); // 8:00 EDT
    expect(inContactHours(new Date("2026-12-01T01:59:00Z"))).toBe(true); // 8:59 p.m. EST
    expect(inContactHours(new Date("2026-12-01T02:00:00Z"))).toBe(false); // 9:00 p.m. EST
  });

  it("counts SMS segments", () => {
    expect(smsSegments("a".repeat(160)).segments).toBe(1);
    expect(smsSegments("a".repeat(161)).segments).toBe(2);
    expect(smsSegments("Hola, ¿cómo está? 😀").encoding).toBe("UCS-2");
  });

  it("adds sender and opt-out to broadcast texts once", () => {
    expect(withSmsFooter("Hello", "VSN")).toBe("VSN: Hello Reply STOP to opt out.");
    expect(withSmsFooter("VSN: Hi. Reply STOP to end.", "VSN")).toBe("VSN: Hi. Reply STOP to end.");
  });

  it("stays simulated until every safeguard is in place", () => {
    expect(readConfig({ OUTREACH_LIVE: "true" }).live).toBe(false);
    const full = {
      OUTREACH_LIVE: "true",
      OUTREACH_PASSCODE: "a-long-private-passcode",
      OUTREACH_ENCRYPTION_KEY: KEY,
      TWILIO_ACCOUNT_SID: "AC123",
      TWILIO_AUTH_TOKEN: "tok",
      TWILIO_FROM_NUMBER: "540-555-0100",
      PUBLIC_SITE_URL: "https://vets.example.org/",
    };
    expect(readConfig(full).live).toBe(true);
    expect(readConfig(full).siteUrl).toBe("https://vets.example.org");
    expect(readConfig({ ...full, VERCEL: "1" }).live).toBe(false);
    expect(readiness(readConfig({ ...full, OUTREACH_PASSCODE: "short" })).find((r) => r.id === "passcode")!.ok).toBe(false);
  });
});

describe("Twilio provider", () => {
  it("posts form-encoded requests with basic auth and maps errors", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const ok = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ sid: "SM1" }), { status: 201 });
    }) as unknown as typeof fetch;
    const p = new TwilioProvider({ accountSid: "AC1", authToken: "t", from: "+15405550100", messagingServiceSid: null }, ok);
    expect(await p.sendSms("+15405550134", "Hi", { statusCallback: "https://x/cb" })).toEqual({ ok: true, id: "SM1", simulated: false });
    expect(calls[0].url).toBe("https://api.twilio.com/2010-04-01/Accounts/AC1/Messages.json");
    expect((calls[0].init.headers as Record<string, string>).authorization).toBe(`Basic ${Buffer.from("AC1:t").toString("base64")}`);
    expect(Object.fromEntries(new URLSearchParams(calls[0].init.body as string))).toEqual({
      To: "+15405550134",
      Body: "Hi",
      From: "+15405550100",
      StatusCallback: "https://x/cb",
    });

    const bad = (async () => new Response(JSON.stringify({ code: 21610, message: "Unsubscribed recipient" }), { status: 400 })) as unknown as typeof fetch;
    const r = await new TwilioProvider({ accountSid: "AC1", authToken: "t", from: "+15405550100", messagingServiceSid: null }, bad).sendSms("+1", "x");
    expect(r).toEqual({ ok: false, error: "Twilio 400 (21610): Unsubscribed recipient" });
  });
});
