import { randomUUID } from "node:crypto";
import type { OutreachConfig, TwilioConfig } from "./config";

export type SendResult = { ok: true; id: string; simulated: boolean } | { ok: false; error: string };

export interface MessagingProvider {
  readonly name: "twilio" | "simulated";
  sendSms(to: string, body: string, opts?: { statusCallback?: string }): Promise<SendResult>;
  /** Place a call that plays the given TwiML. */
  call(to: string, twiml: string, opts?: { statusCallback?: string }): Promise<SendResult>;
}

/** Records nothing outside this app. Used whenever outreach is not live. */
export class SimulatedProvider implements MessagingProvider {
  readonly name = "simulated" as const;
  readonly sent: { kind: "sms" | "call"; to: string; body: string }[] = [];
  async sendSms(to: string, body: string): Promise<SendResult> {
    this.sent.push({ kind: "sms", to, body });
    return { ok: true, id: `sim-${randomUUID()}`, simulated: true };
  }
  async call(to: string, twiml: string): Promise<SendResult> {
    this.sent.push({ kind: "call", to, body: twiml });
    return { ok: true, id: `sim-${randomUUID()}`, simulated: true };
  }
}

/** Twilio's REST API over fetch; no SDK needed. */
export class TwilioProvider implements MessagingProvider {
  readonly name = "twilio" as const;
  constructor(
    private cfg: TwilioConfig,
    private fetchImpl: typeof fetch = fetch,
  ) {}

  private async post(resource: "Messages" | "Calls", params: Record<string, string>): Promise<SendResult> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(this.cfg.accountSid)}/${resource}.json`;
    try {
      const res = await this.fetchImpl(url, {
        method: "POST",
        headers: {
          authorization: `Basic ${Buffer.from(`${this.cfg.accountSid}:${this.cfg.authToken}`).toString("base64")}`,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(params).toString(),
      });
      const body = (await res.json().catch(() => ({}))) as { sid?: string; message?: string; code?: number };
      if (!res.ok || !body.sid) {
        return { ok: false, error: `Twilio ${res.status}${body.code ? ` (${body.code})` : ""}: ${body.message ?? "request failed"}` };
      }
      return { ok: true, id: body.sid, simulated: false };
    } catch (err) {
      return { ok: false, error: `Could not reach Twilio: ${(err as Error).message}` };
    }
  }

  sendSms(to: string, body: string, opts: { statusCallback?: string } = {}) {
    const params: Record<string, string> = { To: to, Body: body };
    if (this.cfg.messagingServiceSid) params.MessagingServiceSid = this.cfg.messagingServiceSid;
    else params.From = this.cfg.from;
    if (opts.statusCallback) params.StatusCallback = opts.statusCallback;
    return this.post("Messages", params);
  }

  call(to: string, twiml: string, opts: { statusCallback?: string } = {}) {
    const params: Record<string, string> = { To: to, From: this.cfg.from, Twiml: twiml };
    if (opts.statusCallback) params.StatusCallback = opts.statusCallback;
    return this.post("Calls", params);
  }
}

export function providerFor(cfg: OutreachConfig): MessagingProvider {
  return cfg.live && cfg.twilio ? new TwilioProvider(cfg.twilio) : new SimulatedProvider();
}
