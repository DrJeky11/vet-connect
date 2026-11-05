import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Twilio signs every webhook: base64(HMAC-SHA1(auth token, full URL + each
 * POST parameter name and value, sorted by name)).
 */
export function twilioSignature(authToken: string, url: string, params: Record<string, string>): string {
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join("");
  return createHmac("sha1", authToken).update(data, "utf8").digest("base64");
}

export function isValidTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  header: string | null,
): boolean {
  if (!header) return false;
  const expected = Buffer.from(twilioSignature(authToken, url, params));
  const got = Buffer.from(header);
  return expected.length === got.length && timingSafeEqual(expected, got);
}
