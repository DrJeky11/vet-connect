import { applyFilters, filtersToParams } from "../filter";
import { parseSentence } from "../navigator";
import {
  CATEGORIES,
  categoryLabel,
  localityLabel,
  resolveLocality,
  type CategoryId,
  type LocalityId,
  type Resource,
} from "../schema";
import type { OutreachConfig } from "./config";
import { speakDigits, toE164 } from "./phone";
import type { Channel } from "./rules";
import type { ConsentMethod, Source, SubscriberSummary } from "./store";

/**
 * The text line and the phone line: two more doors into the same directory,
 * for people who do not use the website. Both are pure functions. They return
 * a reply plus a list of side effects; the Twilio webhooks apply the effects,
 * and the staff simulator only describes them.
 */

export type Effect =
  | { type: "confirm_sms" }
  | { type: "opt_in"; channels: Channel[]; method: ConsentMethod; source: Source; locality: LocalityId | null }
  | { type: "opt_out"; channels: Channel[]; method: ConsentMethod }
  | { type: "send_sms"; body: string }
  | { type: "log"; intent: string; topic: CategoryId | null; locality: LocalityId | null; results: number | null };

export type LineConfig = Pick<OutreachConfig, "senderName" | "siteUrl">;

export const CRISIS_TEXT =
  "If you are in crisis or thinking about hurting yourself, call 988 and press 1, or text 838255, to reach the Veterans Crisis Line now.";

const CRISIS_RE = /suicid|kill (my ?self|me)|end (it all|my life)|want to die|hurt (my ?self)|self[- ]harm|\bcrisis\b|\b988\b/i;
const STOP_FIRST = new Set(["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT", "REVOKE", "OPTOUT"]);
const STOP_ANYWHERE = /\b(stop|unsubscribe|opt[\s-]?out|revoke)\b/i;
const START_FIRST = new Set(["START", "UNSTOP", "RESUME"]);
const YES_FIRST = new Set(["YES", "Y", "SI", "SÍ"]);
const HELP_FIRST = new Set(["HELP", "INFO", "AYUDA"]);
const JOIN_FIRST = new Set(["JOIN", "SUBSCRIBE", "SIGNUP", "UPDATES"]);
const MENU_FIRST = new Set(["MENU", "TOPICS", "LIST", "OPTIONS"]);

/** One-word topics people can text, including a few in Spanish. */
export const SMS_KEYWORDS: Record<CategoryId, string[]> = {
  transportation: ["RIDE", "RIDES", "TRANSPORT", "TRANSPORTATION", "BUS", "TRANSPORTE"],
  legal: ["LEGAL", "LAWYER", "LAW", "ABOGADO"],
  health: ["HEALTH", "DENTAL", "DENTIST", "DOCTOR", "CLINIC", "MEDICAL", "SALUD"],
  mental_health: ["MENTAL", "COUNSELING", "COUNSELOR", "TALK", "PTSD"],
  housing: ["HOUSING", "RENT", "SHELTER", "HOMELESS", "VIVIENDA"],
  food: ["FOOD", "PANTRY", "SNAP", "MEALS", "COMIDA"],
  benefits: ["BENEFITS", "CLAIM", "CLAIMS", "VSO", "BENEFICIOS"],
  employment: ["JOB", "JOBS", "WORK", "EMPLOYMENT", "TRABAJO"],
  public_services: ["SERVICES", "SOCIAL", "211", "SERVICIOS"],
};

/** The first keyword listed for each topic, shown in menus. */
export const MENU_WORDS: [string, CategoryId][] = [
  ["RIDE", "transportation"],
  ["LEGAL", "legal"],
  ["HEALTH", "health"],
  ["MENTAL", "mental_health"],
  ["HOUSING", "housing"],
  ["FOOD", "food"],
  ["BENEFITS", "benefits"],
  ["JOBS", "employment"],
  ["SERVICES", "public_services"],
];

export function keywordTopic(words: string[]): CategoryId | null {
  for (const w of words) {
    for (const [cat, keys] of Object.entries(SMS_KEYWORDS) as [CategoryId, string[]][]) {
      if (keys.includes(w)) return cat;
    }
  }
  return null;
}

export interface Picked {
  items: Resource[];
  /** "local": listings say they serve the locality (or all of Virginia). "region": none did, so these are elsewhere nearby. */
  scope: "local" | "region";
  total: number;
}

/** Up to n listings for a topic and place, putting ones with a phone number first. */
export function pickListings(resources: Resource[], category: CategoryId, locality: LocalityId | null, n = 3): Picked {
  let found = applyFilters(resources, { category, locality });
  let scope: Picked["scope"] = "local";
  if (found.length === 0 && locality) {
    found = applyFilters(resources, { category, locality: null });
    scope = "region";
  }
  const withPhone = [...found].sort((a, b) => Number(!a.phone) - Number(!b.phone));
  return { items: withPhone.slice(0, n), scope, total: found.length };
}

function placeName(locality: LocalityId | null) {
  return locality ? localityLabel(locality).replace(/^City of /, "") : "the Fredericksburg region";
}

function listingLink(cfg: LineConfig, category: CategoryId, locality: LocalityId | null) {
  return cfg.siteUrl ? `${cfg.siteUrl}/resources?${filtersToParams({ category, locality }).toString()}` : null;
}

/** Results as a text message, kept to about three SMS segments. */
export function smsResults(picked: Picked, category: CategoryId, locality: LocalityId | null, cfg: LineConfig): string {
  const topic = categoryLabel(category);
  if (picked.items.length === 0) {
    return `We don't have a ${topic.toLowerCase()} listing yet. Try 211 Virginia, or text MENU for other topics.`;
  }
  const head =
    picked.scope === "region" && locality
      ? `${topic}: none list ${placeName(locality)}, but these serve nearby:`
      : `${topic} near ${placeName(locality)}:`;
  const lines = picked.items.map((r, i) => {
    const name = r.name.length > 48 ? `${r.name.slice(0, 47)}…` : r.name;
    return `${i + 1}. ${name} - ${r.phone ?? "no phone listed yet"}`;
  });
  const link = listingLink(cfg, category, locality);
  const more = link ? `More: ${link}` : picked.total > picked.items.length ? `${picked.total - picked.items.length} more on our website.` : "";
  return [head, ...lines, more, "Call to confirm you may be eligible."].filter(Boolean).join("\n");
}

export function smsHelp(cfg: LineConfig): string {
  return `${cfg.senderName}: Text a topic and your ZIP, like RIDE 22553. Topics: ${MENU_WORDS.map(([w]) => w).join(", ")}. Text JOIN for updates. Msg & data rates may apply. Reply STOP to opt out. Crisis: call 988, press 1.`;
}

export function smsMenu(): string {
  return `Text one word and your ZIP (example: FOOD 22401): ${MENU_WORDS.map(([w, c]) => `${w} (${categoryLabel(c).toLowerCase()})`).join(", ")}.`;
}

export interface SmsReply {
  reply: string;
  effects: Effect[];
}

export function handleSms(text: string, ctx: { subscriber: SubscriberSummary | null; resources: Resource[]; cfg: LineConfig }): SmsReply {
  const raw = (text ?? "").trim();
  const upper = raw.toUpperCase();
  const words = upper.split(/[^A-Z0-9ÁÉÍÓÚÑ]+/).filter(Boolean);
  const first = words[0] ?? "";
  const zip = raw.match(/\b(\d{5})\b/)?.[1] ?? null;
  const zipLocality = zip ? resolveLocality(zip) : null;
  const { subscriber, cfg } = ctx;

  // Safety first: any sign of crisis gets the crisis line before anything else.
  const wantsStop = STOP_FIRST.has(first) || STOP_ANYWHERE.test(raw);
  if (CRISIS_RE.test(raw)) {
    // Still honor a stop request, but the reply is always the crisis line.
    const effects: Effect[] = [{ type: "log", intent: "crisis", topic: null, locality: null, results: null }];
    if (wantsStop) effects.push({ type: "opt_out", channels: ["sms", "voice"], method: "sms_stop" });
    return { reply: CRISIS_TEXT, effects };
  }
  if (wantsStop) {
    return {
      reply: `${cfg.senderName}: You are unsubscribed. You will not get more automated texts or calls from us. Reply START to sign up again.`,
      effects: [{ type: "opt_out", channels: ["sms", "voice"], method: "sms_stop" }],
    };
  }
  if (START_FIRST.has(first)) {
    return {
      reply: `${cfg.senderName}: You are signed up for texts again. Msg frequency varies. Msg & data rates may apply. Reply HELP for help, STOP to opt out.`,
      effects: [{ type: "opt_in", channels: ["sms"], method: "sms_start", source: "sms_keyword", locality: zipLocality }],
    };
  }
  if (YES_FIRST.has(first) && words.length <= 2) {
    if (subscriber?.sms === "pending") {
      return {
        reply: `${cfg.senderName}: Thanks, you're confirmed. We'll text you about veteran services. Msg frequency varies. Msg & data rates may apply. Reply HELP for help, STOP to opt out.`,
        effects: [{ type: "confirm_sms" }],
      };
    }
    if (subscriber?.sms === "on") return { reply: `${cfg.senderName}: You're already signed up. ${smsMenu()}`, effects: [] };
    return { reply: `${cfg.senderName}: Text JOIN to sign up for updates, or ${smsMenu()}`, effects: [] };
  }
  if (HELP_FIRST.has(first)) return { reply: smsHelp(cfg), effects: [] };
  if (JOIN_FIRST.has(first)) {
    if (subscriber?.sms === "on") return { reply: `${cfg.senderName}: You're already signed up. Reply STOP to opt out.`, effects: [] };
    return {
      reply: `${cfg.senderName}: You're signed up for texts about veteran services${zipLocality ? ` near ${placeName(zipLocality)}` : ""}. Msg frequency varies. Msg & data rates may apply. Reply HELP for help, STOP to opt out.`,
      effects: [{ type: "opt_in", channels: ["sms"], method: "sms_keyword", source: "sms_keyword", locality: zipLocality }],
    };
  }
  if (MENU_FIRST.has(first)) return { reply: smsMenu(), effects: [] };

  let category = keywordTopic(words);
  let locality = zipLocality;
  if (!category) {
    const guess = parseSentence(raw);
    category = guess.category;
    locality = locality ?? guess.locality;
  }
  locality = locality ?? subscriber?.locality ?? null;

  if (category) {
    const picked = pickListings(ctx.resources, category, locality);
    return {
      reply: smsResults(picked, category, locality, cfg),
      effects: [{ type: "log", intent: "search", topic: category, locality, results: picked.total }],
    };
  }
  if (zip && !zipLocality) {
    return {
      reply: `That ZIP is outside our area (Fredericksburg, Spotsylvania, Stafford, King George, Caroline). Try 211 Virginia. ${smsMenu()}`,
      effects: [{ type: "log", intent: "outside_area", topic: null, locality: null, results: null }],
    };
  }
  return { reply: smsHelp(cfg), effects: [{ type: "log", intent: "unknown", topic: null, locality: null, results: null }] };
}

// ---- Phone line -----------------------------------------------------------

export interface VoiceNode {
  say: string[];
  gather?: { action: string; numDigits?: number; finishOnKey?: string; timeout?: number };
  /** Where to go if the caller presses nothing. */
  redirect?: string;
  hangup?: boolean;
}

export interface VoiceResult {
  node: VoiceNode;
  effects: Effect[];
}

/** Topics in keypad order: 1 = transportation … 9 = public services. */
export const KEYPAD: CategoryId[] = CATEGORIES.map((c) => c.id);

const SPOKEN: Record<CategoryId, string> = {
  transportation: "rides and transportation",
  legal: "legal help",
  health: "health and dental care",
  mental_health: "mental health and counseling",
  housing: "housing",
  food: "food",
  benefits: "benefits and claims help",
  employment: "jobs",
  public_services: "other public services",
};

/** Read numbers digit by digit; keep words like "then press 1". */
export function speakPhone(phone: string): string {
  if (/^[\d\s().+-]+$/.test(phone)) {
    const d = speakDigits(phone).split(" ");
    const ten = d.length === 11 && d[0] === "1" ? d.slice(1) : d;
    if (ten.length === 10) return `${ten.slice(0, 3).join(" ")}, ${ten.slice(3, 6).join(" ")}, ${ten.slice(6).join(" ")}`;
    return ten.join(" ");
  }
  return phone.replace(/\d+/g, (m) => m.split("").join(" "));
}

const VOICE_BASE = "/api/voice";
const url = (q: Record<string, string | number | null | undefined>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v !== null && v !== undefined && v !== "") p.set(k, String(v));
  return `${VOICE_BASE}?${p.toString()}`;
};

function mainMenu(cfg: LineConfig, greet: boolean, attempt = 0): VoiceNode {
  const say: string[] = [];
  if (greet) {
    say.push(
      `Welcome to the ${cfg.senderName}, a free directory of local services for veterans in Fredericksburg, Spotsylvania, Stafford, King George and Caroline.`,
      "If you are in crisis, hang up and dial 9 8 8, then press 1, for the Veterans Crisis Line.",
    );
  }
  KEYPAD.forEach((c, i) => say.push(`For ${SPOKEN[c]}, press ${i + 1}.`));
  say.push("To sign up for updates by phone call or text, press 0.", "To hear this again, press star.");
  return {
    say,
    gather: { action: url({ step: "menu" }), numDigits: 1, timeout: 7 },
    redirect: attempt >= 2 ? url({ step: "goodbye" }) : url({ step: "welcome", n: attempt + 1, quiet: 1 }),
  };
}

function resultsSpeech(picked: Picked, category: CategoryId, locality: LocalityId | null): string[] {
  if (picked.items.length === 0) {
    return [`We do not have a listing for ${SPOKEN[category]} yet. You can also call 2 1 1 Virginia.`];
  }
  const say: string[] = [];
  if (picked.scope === "region" && locality) {
    say.push(`No listing for ${SPOKEN[category]} says it serves ${placeName(locality)}. Here are listings nearby.`);
  } else {
    say.push(`Here are listings for ${SPOKEN[category]} near ${placeName(locality)}.`);
  }
  picked.items.forEach((r, i) => {
    const org = r.organization !== r.name ? `, from ${r.organization}` : "";
    say.push(`Listing ${i + 1}. ${r.name}${org}.`);
    say.push(r.phone ? `Phone: ${speakPhone(r.phone)}.` : "This listing has no phone number on file yet.");
  });
  say.push("These listings come from public sources and can change. Call to confirm you may be eligible.");
  return say;
}

function afterMenu(category: CategoryId, locality: LocalityId | null): VoiceNode["gather"] & object {
  return { action: url({ step: "after", c: category, l: locality }), numDigits: 1, timeout: 7 };
}

const AFTER_SAY = [
  "To get these listings by text message, press 1.",
  "To hear them again, press 2.",
  "To choose another topic, press 3.",
  "To sign up for updates, press 0.",
];

function signupMenu(): VoiceNode {
  return {
    say: [
      "To get recorded phone calls with updates about veteran services, press 1.",
      "To get both phone calls and text messages, press 2.",
      "To go back, press star.",
      "Consent is not required to get any service. You can stop at any time.",
    ],
    gather: { action: url({ step: "signup" }), numDigits: 1, timeout: 7 },
    redirect: url({ step: "welcome", quiet: 1 }),
  };
}

const isCategory = (v: string | null | undefined): v is CategoryId => KEYPAD.includes(v as CategoryId);

export interface VoiceParams {
  step: string | null;
  digits: string | null;
  from: string | null;
  c?: string | null;
  l?: string | null;
  n?: string | null;
  quiet?: string | null;
  /** Broadcast call: the campaign id, and its script if the caller asks to hear it again. */
  m?: string | null;
  script?: string | null;
}

export function voiceStep(p: VoiceParams, ctx: { resources: Resource[]; cfg: LineConfig }): VoiceResult {
  const { cfg } = ctx;
  const digits = (p.digits ?? "").replace(/[^0-9*#]/g, "");
  const category = isCategory(p.c) ? p.c : null;
  const locality = p.l ? resolveLocality(p.l) : null;
  const canText = Boolean(toE164(p.from));

  switch (p.step) {
    case null:
    case undefined:
    case "":
    case "welcome":
      return { node: mainMenu(cfg, p.quiet !== "1", Number(p.n ?? 0)), effects: [] };

    case "menu": {
      if (digits === "0") return { node: signupMenu(), effects: [] };
      const idx = Number(digits) - 1;
      const chosen = KEYPAD[idx];
      if (!chosen || digits.length !== 1) return { node: mainMenu(cfg, false), effects: [] };
      return {
        node: {
          say: [
            `You chose ${SPOKEN[chosen]}.`,
            "Enter your 5 digit ZIP code now. Or press pound to hear listings for the whole region.",
          ],
          gather: { action: url({ step: "zip", c: chosen }), numDigits: 5, finishOnKey: "#", timeout: 8 },
          redirect: url({ step: "zip", c: chosen }),
        },
        effects: [],
      };
    }

    case "zip": {
      if (!category) return { node: mainMenu(cfg, false), effects: [] };
      const zipLoc = digits.length === 5 ? resolveLocality(digits) : null;
      const say: string[] = [];
      if (digits.length === 5 && !zipLoc) {
        say.push("That ZIP code is outside our area, so here are listings for the whole region.");
      }
      const picked = pickListings(ctx.resources, category, zipLoc);
      say.push(...resultsSpeech(picked, category, zipLoc), ...AFTER_SAY);
      return {
        node: { say, gather: afterMenu(category, zipLoc), redirect: url({ step: "goodbye" }) },
        effects: [{ type: "log", intent: "search", topic: category, locality: zipLoc, results: picked.total }],
      };
    }

    case "after": {
      if (!category) return { node: mainMenu(cfg, false), effects: [] };
      const picked = pickListings(ctx.resources, category, locality);
      if (digits === "1") {
        if (!canText) {
          return {
            node: { say: ["We could not read your phone number, so we cannot send a text.", ...AFTER_SAY], gather: afterMenu(category, locality), redirect: url({ step: "goodbye" }) },
            effects: [],
          };
        }
        return {
          node: {
            say: ["We are sending a text message with these listings to the number you are calling from.", "To choose another topic, press 3. Otherwise you can hang up. Thank you for calling."],
            gather: afterMenu(category, locality),
            redirect: url({ step: "goodbye" }),
          },
          effects: [{ type: "send_sms", body: `${cfg.senderName}: ${smsResults(picked, category, locality, cfg)}` }],
        };
      }
      if (digits === "2") {
        return {
          node: { say: [...resultsSpeech(picked, category, locality), ...AFTER_SAY], gather: afterMenu(category, locality), redirect: url({ step: "goodbye" }) },
          effects: [],
        };
      }
      if (digits === "0") return { node: signupMenu(), effects: [] };
      return { node: mainMenu(cfg, false), effects: [] };
    }

    case "signup": {
      if (digits !== "1" && digits !== "2") return { node: mainMenu(cfg, false), effects: [] };
      if (!canText) {
        return { node: { say: ["We could not read your phone number. Please call back from the phone you want us to reach."], hangup: true }, effects: [] };
      }
      const channels: Channel[] = digits === "2" ? ["voice", "sms"] : ["voice"];
      return {
        node: {
          say: [
            digits === "2"
              ? "You are signed up for phone calls and text messages about veteran services."
              : "You are signed up for recorded phone calls about veteran services.",
            "To stop at any time, press 9 during one of our calls, or text STOP to this number.",
            "Thank you for calling. Goodbye.",
          ],
          hangup: true,
        },
        effects: [{ type: "opt_in", channels, method: "voice_keypress", source: "voice_keypress", locality: null }],
      };
    }

    case "broadcast": {
      if (digits === "9") {
        return {
          node: { say: ["You will not get any more automated calls or texts from us. Goodbye."], hangup: true },
          effects: [{ type: "opt_out", channels: ["voice", "sms"], method: "voice_keypress" }],
        };
      }
      if (digits === "1" && p.script) {
        return { node: broadcastNode(p.script, cfg, p.m ?? ""), effects: [] };
      }
      return { node: { say: ["Thank you. Goodbye."], hangup: true }, effects: [] };
    }

    case "goodbye":
    default:
      return {
        node: { say: ["Thank you for calling. If you are in crisis, dial 9 8 8 and press 1. Goodbye."], hangup: true },
        effects: [],
      };
  }
}

/** What an outbound update call says. `campaignRef` lets "press 1" replay it. */
export function broadcastNode(script: string, cfg: LineConfig, campaignRef: string | number): VoiceNode {
  const action = `${cfg.siteUrl ?? ""}${url({ step: "broadcast", m: campaignRef })}`;
  return {
    say: [`This is the ${cfg.senderName} with an update for veterans.`, script, "To hear this again, press 1. To stop these calls, press 9."],
    gather: { action, numDigits: 1, timeout: 6 },
    hangup: true,
  };
}

// ---- TwiML ----------------------------------------------------------------

export function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);
}

export function toTwiml(node: VoiceNode): string {
  const says = node.say.map((s) => `<Say language="en-US">${escapeXml(s)}</Say>`).join("");
  let body = "";
  if (node.gather) {
    const g = node.gather;
    const attrs = [
      `input="dtmf"`,
      `action="${escapeXml(g.action)}"`,
      `method="POST"`,
      g.numDigits ? `numDigits="${g.numDigits}"` : "",
      g.finishOnKey ? `finishOnKey="${escapeXml(g.finishOnKey)}"` : "",
      `timeout="${g.timeout ?? 6}"`,
    ]
      .filter(Boolean)
      .join(" ");
    body += `<Gather ${attrs}>${says}</Gather>`;
  } else {
    body += says;
  }
  if (node.redirect) body += `<Redirect method="POST">${escapeXml(node.redirect)}</Redirect>`;
  else if (node.hangup) body += "<Hangup/>";
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`;
}
