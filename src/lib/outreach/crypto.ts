import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes } from "node:crypto";

/**
 * Field-level encryption for subscriber contact details (phone, name, mailing
 * address). AES-256-GCM with a key from OUTREACH_ENCRYPTION_KEY. Phone lookups
 * (opt-outs, replies) use an HMAC "blind index" so the plain number is never
 * stored in a searchable column.
 *
 * Without OUTREACH_ENCRYPTION_KEY a fixed development key is used. That is
 * fine for a demo and flagged on the staff readiness checklist; it is not
 * acceptable for real veterans' data.
 */
const DEV_KEY = Buffer.alloc(32, 7);

export interface Keys {
  enc: Buffer;
  index: Buffer;
  isDevKey: boolean;
}

export function parseMasterKey(raw: string | undefined): { key: Buffer; isDevKey: boolean } {
  if (!raw) return { key: DEV_KEY, isDevKey: true };
  const trimmed = raw.trim();
  const buf = /^[0-9a-f]{64}$/i.test(trimmed) ? Buffer.from(trimmed, "hex") : Buffer.from(trimmed, "base64");
  if (buf.length !== 32) {
    throw new Error("OUTREACH_ENCRYPTION_KEY must be 32 bytes, as 64 hex characters or base64.");
  }
  return { key: buf, isDevKey: false };
}

export function deriveKeys(raw: string | undefined = process.env.OUTREACH_ENCRYPTION_KEY): Keys {
  const { key, isDevKey } = parseMasterKey(raw);
  const derive = (info: string) => Buffer.from(hkdfSync("sha256", key, Buffer.alloc(0), info, 32));
  return { enc: derive("vsn-outreach-enc-v1"), index: derive("vsn-outreach-index-v1"), isDevKey };
}

export function encrypt(keys: Keys, plain: string | null | undefined): string | null {
  if (plain === null || plain === undefined || plain === "") return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keys.enc, iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `v1:${Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64")}`;
}

export function decrypt(keys: Keys, stored: string | null | undefined): string | null {
  if (!stored) return null;
  if (!stored.startsWith("v1:")) throw new Error("Unknown encrypted field format.");
  const raw = Buffer.from(stored.slice(3), "base64");
  const decipher = createDecipheriv("aes-256-gcm", keys.enc, raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
}

/** Deterministic, keyed lookup value for an E.164 phone number. */
export function blindIndex(keys: Keys, e164: string): string {
  return createHmac("sha256", keys.index).update(e164).digest("base64url");
}
