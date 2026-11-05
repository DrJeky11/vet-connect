import { formatUs, toE164 } from "./phone";

/**
 * Outreach settings come from environment variables. Real messages go out
 * only when OUTREACH_LIVE=true AND every safeguard on the readiness list is in
 * place. Otherwise every send is simulated and labeled as such.
 */
export const TIMEZONE = "America/New_York";
export const DEMO_STAFF_PASSCODE = "demo-outreach";
export const DEFAULT_SENDER = "Veteran Services Navigator";

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  from: string;
  messagingServiceSid: string | null;
}

export interface OutreachConfig {
  senderName: string;
  siteUrl: string | null;
  /** The public text/phone line, for display, e.g. (540) 555-0100. */
  lineNumber: string | null;
  staffPasscode: string;
  staffPasscodeIsDemo: boolean;
  twilio: TwilioConfig | null;
  /** Shown on letters and the paper sign-up form. Use "|" between lines. */
  returnAddress: string[] | null;
  encryptionKeySet: boolean;
  storagePersistent: boolean;
  liveRequested: boolean;
  live: boolean;
}

type Env = Record<string, string | undefined>;

export function readConfig(env: Env = process.env): OutreachConfig {
  const passcode = env.OUTREACH_PASSCODE?.trim() || "";
  const twilio =
    env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && toE164(env.TWILIO_FROM_NUMBER)
      ? {
          accountSid: env.TWILIO_ACCOUNT_SID,
          authToken: env.TWILIO_AUTH_TOKEN,
          from: toE164(env.TWILIO_FROM_NUMBER)!,
          messagingServiceSid: env.TWILIO_MESSAGING_SERVICE_SID || null,
        }
      : null;
  const siteUrl = env.PUBLIC_SITE_URL?.replace(/\/+$/, "") || null;
  const cfg: OutreachConfig = {
    senderName: env.OUTREACH_SENDER_NAME?.trim() || DEFAULT_SENDER,
    siteUrl,
    lineNumber: twilio ? formatUs(twilio.from) : null,
    staffPasscode: passcode || DEMO_STAFF_PASSCODE,
    staffPasscodeIsDemo: !passcode,
    twilio,
    returnAddress: env.OUTREACH_RETURN_ADDRESS
      ? env.OUTREACH_RETURN_ADDRESS.split("|").map((s) => s.trim()).filter(Boolean)
      : null,
    encryptionKeySet: Boolean(env.OUTREACH_ENCRYPTION_KEY),
    // Vercel-style hosts wipe local files; require an explicit persistent path there.
    storagePersistent: !env.VERCEL || Boolean(env.OUTREACH_DB_PATH),
    liveRequested: env.OUTREACH_LIVE === "true",
    live: false,
  };
  cfg.live = cfg.liveRequested && readiness(cfg).every((c) => c.ok);
  return cfg;
}

export interface ReadinessItem {
  id: string;
  label: string;
  ok: boolean;
  fix: string;
}

/** What must be true before real veterans' numbers are used to send anything. */
export function readiness(cfg: OutreachConfig): ReadinessItem[] {
  return [
    {
      id: "passcode",
      label: "A private staff passcode is set",
      ok: !cfg.staffPasscodeIsDemo && cfg.staffPasscode.length >= 12,
      fix: "Set OUTREACH_PASSCODE to a passcode of at least 12 characters that only staff know.",
    },
    {
      id: "encryption",
      label: "Contact details are encrypted with your own key",
      ok: cfg.encryptionKeySet,
      fix: "Set OUTREACH_ENCRYPTION_KEY to 32 random bytes (run: openssl rand -hex 32). Keep a backup; lost keys cannot be recovered.",
    },
    {
      id: "storage",
      label: "Subscriber data is on storage that survives restarts",
      ok: cfg.storagePersistent,
      fix: "This host resets local files. Set OUTREACH_DB_PATH to a persistent volume, or host on a server with a disk.",
    },
    {
      id: "twilio",
      label: "Text and phone provider (Twilio) is connected",
      ok: cfg.twilio !== null,
      fix: "Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER. Register the number for A2P 10DLC texting.",
    },
    {
      id: "site-url",
      label: "The public web address is set",
      ok: Boolean(cfg.siteUrl?.startsWith("https://")),
      fix: "Set PUBLIC_SITE_URL to the site's https:// address so texts can link to listings and calls can offer opt-out.",
    },
  ];
}
