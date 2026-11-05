import { describe, expect, it } from "vitest";
import seed from "../../data/resources.json";
import { handleSms, pickListings, speakPhone, toTwiml, voiceStep, broadcastNode } from "@/lib/outreach/lines";
import { isValidTwilioSignature, twilioSignature } from "@/lib/outreach/twilio-signature";
import type { SubscriberSummary } from "@/lib/outreach/store";
import type { Resource } from "@/lib/schema";

const resources = seed as Resource[];
const cfg = { senderName: "Veteran Services Navigator", siteUrl: "https://vets.example.org" };
const sms = (text: string, subscriber: Partial<SubscriberSummary> | null = null) =>
  handleSms(text, { subscriber: subscriber as SubscriberSummary | null, resources, cfg });

describe("text line", () => {
  it("answers a topic and ZIP with directory listings and a link", () => {
    const r = sms("RIDE 22553");
    expect(r.reply).toContain("Transportation near Spotsylvania County");
    expect(r.reply).toContain("Mobility Options");
    expect(r.reply).toContain("https://vets.example.org/resources?category=transportation&locality=spotsylvania");
    expect(r.reply).toContain("may be eligible");
    expect(r.reply).not.toMatch(/you qualify/i);
    expect(r.effects).toEqual([{ type: "log", intent: "search", topic: "transportation", locality: "spotsylvania", results: expect.any(Number) }]);
  });

  it("says when nothing lists the place, and shows nearby listings instead", () => {
    const r = sms("legal 22554");
    expect(r.reply).toContain("none list Stafford County");
    expect(r.reply).toContain("Legal Aid Works");
  });

  it("understands a plain sentence", () => {
    expect(sms("I need a lawyer for my landlord in Stafford").reply).toContain("Legal help");
  });

  it("uses the subscriber's saved place when no ZIP is given", () => {
    expect(sms("FOOD", { locality: "caroline", sms: "on" }).reply).toMatch(/Caroline County|We don't have a food listing/);
  });

  it("puts the crisis line first, even if the text also says stop", () => {
    const r = sms("stop, I want to kill myself");
    expect(r.reply).toContain("988 and press 1");
    expect(r.reply).toContain("838255");
    expect(r.effects.map((e) => e.type)).toEqual(["log", "opt_out"]);
  });

  it("handles STOP words anywhere, START, HELP, JOIN and YES", () => {
    for (const t of ["STOP", "stop", "Unsubscribe", "please stop texting me", "QUIT", "opt out"]) {
      expect(sms(t).effects, t).toEqual([{ type: "opt_out", channels: ["sms", "voice"], method: "sms_stop" }]);
    }
    expect(sms("START").effects[0]).toMatchObject({ type: "opt_in", channels: ["sms"], method: "sms_start" });
    expect(sms("HELP").reply).toMatch(/RIDE 22553.*STOP/s);
    expect(sms("ayuda").reply).toMatch(/STOP/);
    expect(sms("JOIN 22401").effects[0]).toMatchObject({ type: "opt_in", method: "sms_keyword", locality: "fredericksburg" });
    expect(sms("JOIN 22401").reply).toMatch(/Msg & data rates/);
    expect(sms("YES", { sms: "pending" }).effects).toEqual([{ type: "confirm_sms" }]);
    expect(sms("YES", null).effects).toEqual([]);
    expect(sms("MENU").reply).toContain("RIDE (transportation)");
  });

  it("explains when a ZIP is outside the service area", () => {
    expect(sms("90210").reply).toContain("outside our area");
  });

  it("puts listings with phone numbers first", () => {
    const p = pickListings(resources, "mental_health", null);
    expect(p.items[0].phone).not.toBeNull();
  });
});

describe("phone line", () => {
  const call = (step: string | null, digits: string | null = null, extra: object = {}) =>
    voiceStep({ step, digits, from: "+15405550134", ...extra }, { resources, cfg });

  it("greets with the crisis line and a keypad menu", () => {
    const r = call(null);
    expect(r.node.say.join(" ")).toContain("dial 9 8 8, then press 1");
    expect(r.node.say).toContain("For rides and transportation, press 1.");
    expect(r.node.say).toContain("For other public services, press 9.");
    expect(r.node.gather?.action).toBe("/api/voice?step=menu");
  });

  it("walks topic → ZIP → listings → text me", () => {
    const menu = call("menu", "1");
    expect(menu.node.gather).toMatchObject({ action: "/api/voice?step=zip&c=transportation", numDigits: 5 });
    const res = call("zip", "22553", { c: "transportation" });
    expect(res.node.say.join(" ")).toContain("Mobility Options, from Healthy Generations");
    expect(res.node.say.join(" ")).toContain("may be eligible");
    expect(res.node.gather?.action).toBe("/api/voice?step=after&c=transportation&l=spotsylvania");
    expect(res.effects[0]).toMatchObject({ type: "log", topic: "transportation", locality: "spotsylvania" });
    const text = call("after", "1", { c: "transportation", l: "spotsylvania" });
    expect(text.effects[0]).toMatchObject({ type: "send_sms" });
    expect((text.effects[0] as { body: string }).body).toContain("Mobility Options");
  });

  it("signs a caller up by keypress, and press 9 on an update call opts out", () => {
    expect(call("signup", "2").effects[0]).toMatchObject({ type: "opt_in", channels: ["voice", "sms"], method: "voice_keypress" });
    expect(call("broadcast", "9").effects[0]).toMatchObject({ type: "opt_out", channels: ["voice", "sms"] });
    expect(voiceStep({ step: "signup", digits: "1", from: "anonymous" }, { resources, cfg }).effects).toEqual([]);
  });

  it("reads phone numbers digit by digit and keeps words", () => {
    expect(speakPhone("(540) 555-0134")).toBe("5 4 0, 5 5 5, 0 1 3 4");
    expect(speakPhone("988, then press 1")).toBe("9 8 8, then press 1");
  });

  it("renders TwiML with escaped text", () => {
    const xml = toTwiml({ say: ["Tom & Jerry's <clinic>"], gather: { action: "/api/voice?step=a&c=b", numDigits: 1 }, redirect: "/api/voice?step=goodbye" });
    expect(xml).toContain("<Say language=\"en-US\">Tom &amp; Jerry&apos;s &lt;clinic&gt;</Say>");
    expect(xml).toContain('action="/api/voice?step=a&amp;c=b"');
    expect(xml).toMatch(/<\/Gather><Redirect method="POST">\/api\/voice\?step=goodbye<\/Redirect><\/Response>$/);
  });

  it("update calls offer replay and opt-out at an absolute URL", () => {
    const n = broadcastNode("Food drive Saturday.", cfg, 7);
    expect(n.gather?.action).toBe("https://vets.example.org/api/voice?step=broadcast&m=7");
    expect(n.say.join(" ")).toContain("To stop these calls, press 9.");
  });
});

describe("Twilio signatures", () => {
  it("accepts a correct signature and rejects tampering", () => {
    const url = "https://vets.example.org/api/sms";
    const params = { From: "+15405550134", Body: "RIDE" };
    const sig = twilioSignature("token", url, params);
    expect(isValidTwilioSignature("token", url, params, sig)).toBe(true);
    expect(isValidTwilioSignature("token", url, { ...params, Body: "STOP" }, sig)).toBe(false);
    expect(isValidTwilioSignature("other", url, params, sig)).toBe(false);
    expect(isValidTwilioSignature("token", url, params, null)).toBe(false);
  });
});
