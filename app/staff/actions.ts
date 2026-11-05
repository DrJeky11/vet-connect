"use server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { CATEGORY_IDS, LOCALITY_IDS, categoryLabel, localityLabel, type CategoryId, type LocalityId } from "@/lib/schema";
import { getPublicResources } from "@/lib/data";
import { getOutreach } from "@/lib/outreach/server";
import { checkPasscode, makeStaffToken, requireStaff, STAFF_COOKIE, STAFF_MAX_AGE } from "@/lib/outreach/staff-session";
import { OutreachError, type Language } from "@/lib/outreach/store";
import { CHANNELS, type Channel } from "@/lib/outreach/rules";
import { handleSms, voiceStep, toTwiml, type Effect, type VoiceNode } from "@/lib/outreach/lines";
import { applyEffects, processCampaign, type ProcessResult } from "@/lib/outreach/engine";
import { SimulatedProvider } from "@/lib/outreach/providers";
import { VerifierError } from "@/lib/verifier";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export type FormValues = Record<string, string[]>;
export type FormState = { error?: string; ok?: string; values?: FormValues } | null;

/** What was typed, so a form can be shown again with it after an error. */
function formValues(f: FormData): FormValues {
  const out: FormValues = {};
  f.forEach((v, k) => {
    if (typeof v === "string" && !k.startsWith("$")) (out[k] ??= []).push(v);
  });
  return out;
}

const str = (f: FormData, k: string) => (typeof f.get(k) === "string" ? (f.get(k) as string).trim() : "");
const pick = <T extends string>(f: FormData, k: string, allowed: readonly T[]) =>
  f.getAll(k).map(String).filter((v): v is T => (allowed as readonly string[]).includes(v));

function message(e: unknown) {
  if (e instanceof OutreachError || e instanceof VerifierError) return e.message;
  console.error(e);
  return "Something went wrong.";
}

// ---- Sign in / out --------------------------------------------------------

export async function staffLogin(_prev: FormState, f: FormData): Promise<FormState> {
  if (!rateLimit(`staff-login:${clientKey(await headers())}`, 10, 15 * 60 * 1000)) {
    return { error: "Too many tries. Wait 15 minutes." };
  }
  if (!checkPasscode(str(f, "passcode"))) return { error: "That passcode is not right." };
  let token: string;
  try {
    token = makeStaffToken(str(f, "initials"));
  } catch (e) {
    return { error: message(e) };
  }
  (await cookies()).set(STAFF_COOKIE, token, { httpOnly: true, sameSite: "strict", path: "/", maxAge: STAFF_MAX_AGE, secure: process.env.NODE_ENV === "production" });
  redirect("/staff");
}

export async function staffLogout() {
  (await cookies()).delete(STAFF_COOKIE);
  redirect("/staff");
}

// ---- Subscribers ----------------------------------------------------------

export async function addSubscriber(_prev: FormState, f: FormData): Promise<FormState> {
  const who = await requireStaff();
  const channels = pick(f, "channel", CHANNELS);
  const method = str(f, "method") === "paper_form" ? "paper_form" : "verbal_phone";
  if (str(f, "confirmed") !== "yes") return { error: "Confirm that the person agreed to each way you checked.", values: formValues(f) };
  try {
    const { store } = getOutreach();
    const r = store.upsert({
      phone: str(f, "phone") || null,
      name: str(f, "name") || null,
      address: str(f, "line1") || str(f, "city") || str(f, "zip")
        ? { line1: str(f, "line1"), line2: str(f, "line2"), city: str(f, "city"), state: str(f, "state"), zip: str(f, "zip") }
        : null,
      locality: (LOCALITY_IDS as string[]).includes(str(f, "locality")) ? (str(f, "locality") as LocalityId) : null,
      language: str(f, "language") === "es" ? "es" : "en",
      topics: pick(f, "topic", CATEGORY_IDS),
      channels,
      source: method === "paper_form" ? "staff_paper" : "staff_phone",
      method,
      recordedBy: who,
    });
    revalidatePath("/staff/subscribers");
    return { ok: `${r.created ? "Added" : "Updated"} subscriber #${r.subscriber.id}.` };
  } catch (e) {
    return { error: message(e), values: formValues(f) };
  }
}

export async function stopSubscriber(f: FormData) {
  const who = await requireStaff();
  const id = Number(str(f, "id"));
  const channels = pick(f, "channel", CHANNELS);
  getOutreach().store.optOut(id, channels.length ? channels : [...CHANNELS], "staff_removal", who);
  revalidatePath(`/staff/subscribers/${id}`);
}

export async function eraseSubscriber(f: FormData) {
  await requireStaff();
  if (str(f, "confirm") !== "ERASE") redirect(`/staff/subscribers/${str(f, "id")}?erase=confirm`);
  getOutreach().store.erase(Number(str(f, "id")));
  redirect("/staff/subscribers?erased=1");
}

// ---- Messages -------------------------------------------------------------

export async function createMessage(_prev: FormState, f: FormData): Promise<FormState> {
  const who = await requireStaff();
  let id: number;
  try {
    const lang = str(f, "language");
    const c = getOutreach().store.createCampaign(
      {
        title: str(f, "title"),
        sms_body: str(f, "sms_body"),
        voice_script: str(f, "voice_script"),
        mail_body: str(f, "mail_body"),
        include_listings: str(f, "include_listings") === "yes",
        channels: pick(f, "channel", CHANNELS),
        audience: {
          topics: pick(f, "topic", CATEGORY_IDS) as CategoryId[],
          localities: pick(f, "locality", LOCALITY_IDS) as LocalityId[],
          language: lang === "en" || lang === "es" ? (lang as Language) : null,
        },
      },
      who,
    );
    id = c.id;
  } catch (e) {
    return { error: message(e), values: formValues(f) };
  }
  redirect(`/staff/messages/${id}`);
}

export async function sendMessage(f: FormData) {
  await requireStaff();
  const id = Number(str(f, "id"));
  try {
    getOutreach().store.enqueue(id);
  } catch (e) {
    redirect(`/staff/messages/${id}?error=${encodeURIComponent(message(e))}`);
  }
  redirect(`/staff/messages/${id}?sending=1`);
}

/** One batch of texts and calls. The page calls this until nothing is left. */
export async function processBatch(id: number): Promise<ProcessResult & { error?: string }> {
  await requireStaff();
  const { store, provider, cfg } = getOutreach();
  try {
    return await processCampaign(store, provider, cfg, id, 20);
  } catch (e) {
    return { processed: 0, remaining: 0, paused: null, error: message(e) };
  }
}

export async function markMailed(f: FormData) {
  await requireStaff();
  const id = Number(str(f, "id"));
  getOutreach().store.markMailed(id);
  revalidatePath(`/staff/messages/${id}`);
}

// ---- Try the text and phone lines ----------------------------------------

function describe(e: Effect): string | null {
  switch (e.type) {
    case "confirm_sms":
      return "Confirms a pending text sign-up for this number.";
    case "opt_in":
      return `Signs this number up for ${e.channels.join(" and ")} (${e.method}).`;
    case "opt_out":
      return `Turns off ${e.channels.join(" and ")} for this number.`;
    case "send_sms":
      return `Sends this text to the caller: “${e.body}”`;
    case "log":
      return e.topic
        ? `Counts a request for ${categoryLabel(e.topic).toLowerCase()}${e.locality ? ` in ${localityLabel(e.locality)}` : ""} (${e.results ?? 0} found).`
        : null;
  }
}

export interface TryResult {
  reply?: string;
  node?: VoiceNode;
  twiml?: string;
  effects: string[];
  applied: boolean;
  error?: string;
}

/**
 * Run the real text-line logic. In demo mode its effects (sign-ups, YES,
 * STOP) are applied, with a simulated provider, so the whole flow can be
 * tried. Once outreach is live this is a dry run, so staff can never sign up
 * a real number by typing it here.
 */
export async function tryText(from: string, body: string): Promise<TryResult> {
  await requireStaff();
  const { store, cfg } = getOutreach();
  const subscriber = store.findByPhone(from);
  const r = handleSms(body, { subscriber, resources: getPublicResources(), cfg });
  const applied = !cfg.live;
  if (applied) await applyEffects(r.effects, { store, provider: new SimulatedProvider(), from, channel: "sms", cfg });
  return { reply: r.reply, effects: r.effects.map(describe).filter((x): x is string => Boolean(x)), applied };
}

export async function tryCall(params: Record<string, string | null>, from: string): Promise<TryResult> {
  await requireStaff();
  const { store, cfg } = getOutreach();
  const r = voiceStep(
    { step: params.step ?? null, digits: params.digits ?? null, from, c: params.c, l: params.l, n: params.n, quiet: params.quiet },
    { resources: getPublicResources(), cfg },
  );
  const applied = !cfg.live;
  if (applied) await applyEffects(r.effects, { store, provider: new SimulatedProvider(), from, channel: "voice", cfg });
  return { node: r.node, twiml: toTwiml(r.node), effects: r.effects.map(describe).filter((x): x is string => Boolean(x)), applied };
}
