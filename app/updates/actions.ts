"use server";
import { headers } from "next/headers";
import { CATEGORY_IDS, LOCALITY_IDS, type CategoryId, type LocalityId } from "@/lib/schema";
import { getOutreach } from "@/lib/outreach/server";
import { confirmationText } from "@/lib/outreach/engine";
import { OutreachError, type Language } from "@/lib/outreach/store";
import { CHANNELS, type Channel } from "@/lib/outreach/rules";
import { toE164 } from "@/lib/outreach/phone";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { getDict } from "@/lib/i18n/server";

export type SignupValues = Record<string, string | string[]>;
export type SignupState =
  | { status: "idle" }
  | { status: "error"; message: string; values: SignupValues }
  | { status: "done"; channels: Channel[]; needsSmsConfirm: boolean; simulated: boolean };

const str = (f: FormData, k: string) => (typeof f.get(k) === "string" ? (f.get(k) as string).trim() : "");

function values(f: FormData): SignupValues {
  const out: SignupValues = {};
  for (const k of ["phone", "name", "line1", "line2", "city", "state", "zip", "locality", "language"]) out[k] = str(f, k);
  out.channel = f.getAll("channel").map(String);
  out.topic = f.getAll("topic").map(String);
  out.permission = str(f, "permission");
  return out;
}

export async function signup(_prev: SignupState, f: FormData): Promise<SignupState> {
  const t = await getDict();
  const v = values(f);
  const fail = (message: string): SignupState => ({ status: "error", message, values: v });

  if (!rateLimit(`signup:${clientKey(await headers())}`, 8, 60 * 60 * 1000)) return fail(t.updates.tooMany);

  const channels = (v.channel as string[]).filter((c): c is Channel => (CHANNELS as readonly string[]).includes(c));
  if (!channels.length) return fail(t.updates.errNoChannel);
  const wantsPhone = channels.includes("sms") || channels.includes("voice");
  if (wantsPhone && !toE164(v.phone as string)) return fail(t.updates.errPhone);
  const wantsMail = channels.includes("mail");
  if (wantsMail && !(v.name as string)) return fail(t.updates.errName);
  if (wantsMail && (!(v.line1 as string) || !(v.city as string) || !/^[A-Za-z]{2}$/.test(v.state as string) || !/^\d{5}(-\d{4})?$/.test(v.zip as string))) {
    return fail(t.updates.errAddress);
  }
  if (v.permission !== "yes") return fail(t.updates.errPermission);

  const { store, cfg, provider } = getOutreach();
  const language: Language = v.language === "es" ? "es" : "en";
  try {
    const r = store.upsert({
      phone: wantsPhone ? (v.phone as string) : null,
      name: wantsMail ? (v.name as string) : null,
      address: wantsMail
        ? { line1: v.line1 as string, line2: v.line2 as string, city: v.city as string, state: v.state as string, zip: v.zip as string }
        : null,
      locality: (LOCALITY_IDS as string[]).includes(v.locality as string) ? (v.locality as LocalityId) : null,
      language,
      topics: (v.topic as string[]).filter((x): x is CategoryId => (CATEGORY_IDS as string[]).includes(x)),
      channels,
      source: "web",
      method: "web_form",
      recordedBy: "self",
      consentLocale: t.locale,
    });
    if (r.needsSmsConfirm) await provider.sendSms(toE164(v.phone as string)!, confirmationText(cfg.senderName));
    return { status: "done", channels, needsSmsConfirm: r.needsSmsConfirm, simulated: provider.name === "simulated" };
  } catch (e) {
    return fail(e instanceof OutreachError ? e.message : t.updates.errGeneric);
  }
}

export type StopState = { status: "idle" } | { status: "done" } | { status: "error"; message: string };

export async function stopUpdates(_prev: StopState, f: FormData): Promise<StopState> {
  const t = await getDict();
  if (!rateLimit(`stop:${clientKey(await headers())}`, 10, 60 * 60 * 1000)) return { status: "error", message: t.updates.tooMany };
  const phone = toE164(str(f, "phone"));
  if (!phone) return { status: "error", message: t.updates.errPhone };
  const { store } = getOutreach();
  const channels: Channel[] = str(f, "mail") === "yes" ? ["sms", "voice", "mail"] : ["sms", "voice"];
  store.optOutPhone(phone, channels, "web_stop", "self");
  // Same answer whether or not the number was on file, so the page reveals nothing.
  return { status: "done" };
}
