import type { Resource } from "../schema";
import type { OutreachConfig } from "./config";
import { broadcastNode, handleSms, toTwiml, voiceStep, type Effect, type VoiceParams } from "./lines";
import { toE164 } from "./phone";
import type { MessagingProvider } from "./providers";
import { inContactHours, withSmsFooter } from "./rules";
import type { OutreachStore } from "./store";

/**
 * Glue between the pure text/phone line logic, the database and the provider.
 */

export function confirmationText(sender: string): string {
  return `${sender}: Reply YES to confirm you want texts about veteran services. Msg frequency varies. Msg & data rates may apply. Reply HELP for help, STOP to opt out. Didn't sign up? Ignore this.`;
}

function statusCallback(cfg: OutreachConfig) {
  return cfg.siteUrl ? `${cfg.siteUrl}/api/twilio/status` : undefined;
}

/** Apply what a text or call asked for. Returns short notes for logs and the simulator. */
export async function applyEffects(
  effects: Effect[],
  ctx: { store: OutreachStore; provider: MessagingProvider; from: string | null; channel: "sms" | "voice"; cfg: OutreachConfig; now?: Date },
): Promise<string[]> {
  const notes: string[] = [];
  const from = toE164(ctx.from);
  const now = ctx.now ?? new Date();
  for (const e of effects) {
    switch (e.type) {
      case "log":
        ctx.store.logInbound({ channel: ctx.channel, phone: from, intent: e.intent, topic: e.topic, locality: e.locality, results: e.results }, now);
        break;
      case "confirm_sms":
        if (from && ctx.store.confirmSms(from, now)) notes.push("Text sign-up confirmed.");
        break;
      case "opt_out":
        if (from) {
          const changed = ctx.store.optOutPhone(from, e.channels, e.method, "self", now);
          notes.push(changed.length ? `Opted out of ${changed.join(", ")}.` : "Opt-out received (number was not subscribed).");
        }
        break;
      case "opt_in":
        if (from) {
          ctx.store.upsert(
            { phone: from, channels: e.channels, source: e.source, method: e.method, recordedBy: "self", locality: e.locality },
            now,
          );
          notes.push(`Opted in to ${e.channels.join(", ")}.`);
        }
        break;
      case "send_sms":
        if (from) {
          const r = await ctx.provider.sendSms(from, e.body, { statusCallback: statusCallback(ctx.cfg) });
          notes.push(r.ok ? (r.simulated ? "Text simulated." : "Text sent.") : `Text failed: ${r.error}`);
        }
        break;
    }
  }
  return notes;
}

export async function answerText(
  body: string,
  from: string | null,
  ctx: { store: OutreachStore; provider: MessagingProvider; resources: Resource[]; cfg: OutreachConfig },
) {
  const subscriber = from ? ctx.store.findByPhone(from) : null;
  const result = handleSms(body, { subscriber, resources: ctx.resources, cfg: ctx.cfg });
  const notes = await applyEffects(result.effects, { ...ctx, from, channel: "sms" });
  return { ...result, notes };
}

export async function answerCall(
  params: VoiceParams,
  ctx: { store: OutreachStore; provider: MessagingProvider; resources: Resource[]; cfg: OutreachConfig },
) {
  let script: string | null = null;
  if (params.step === "broadcast" && params.m) script = ctx.store.campaign(Number(params.m))?.voice_script ?? null;
  const result = voiceStep({ ...params, script }, { resources: ctx.resources, cfg: ctx.cfg });
  const notes = await applyEffects(result.effects, { ...ctx, from: params.from, channel: "voice" });
  return { ...result, twiml: toTwiml(result.node), notes };
}

export interface ProcessResult {
  processed: number;
  remaining: number;
  paused: null | "contact_hours";
}

/**
 * Send the next batch of queued texts and calls for one message. Called
 * repeatedly from the dashboard so no single request runs long. Re-checks
 * each person's choices first, so an opt-out after queueing still wins.
 */
export async function processCampaign(
  store: OutreachStore,
  provider: MessagingProvider,
  cfg: OutreachConfig,
  campaignId: number,
  limit = 20,
  now: Date = new Date(),
): Promise<ProcessResult> {
  const campaign = store.campaign(campaignId);
  if (!campaign) throw new Error("No such message.");
  const batch = store.queued(campaignId, limit);
  if (batch.length && !inContactHours(now)) {
    return { processed: 0, remaining: store.queuedCount(campaignId), paused: "contact_hours" };
  }
  for (const d of batch) {
    const s = store.get(d.subscriber_id);
    if (!s || s[d.channel] !== "on" || !s.phone) {
      store.markDelivery(d.id, "skipped_opted_out", null, null, now);
      continue;
    }
    const result =
      d.channel === "sms"
        ? await provider.sendSms(s.phone, withSmsFooter(campaign.sms_body ?? "", cfg.senderName), { statusCallback: statusCallback(cfg) })
        : await provider.call(s.phone, toTwiml(broadcastNode(campaign.voice_script ?? "", cfg, campaign.id)), {
            statusCallback: statusCallback(cfg),
          });
    if (result.ok) store.markDelivery(d.id, result.simulated ? "simulated" : "sent", result.id, null, now);
    else store.markDelivery(d.id, "failed", null, result.error, now);
  }
  store.finishIfDone(campaignId);
  return { processed: batch.length, remaining: store.queuedCount(campaignId), paused: null };
}
