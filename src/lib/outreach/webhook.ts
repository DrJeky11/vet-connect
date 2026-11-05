import "server-only";
import type { OutreachConfig } from "./config";
import { isValidTwilioSignature } from "./twilio-signature";

/**
 * Read and authenticate a Twilio webhook. The text and phone lines only accept
 * requests once Twilio is configured, and every request must carry a valid
 * signature, so nobody can post fake sign-ups or opt-outs.
 */
export async function readTwilioRequest(
  req: Request,
  cfg: OutreachConfig,
): Promise<{ ok: true; params: Record<string, string>; query: URLSearchParams } | { ok: false; response: Response }> {
  if (!cfg.twilio) {
    return { ok: false, response: new Response("The text and phone line is not connected.", { status: 404 }) };
  }
  const form = await req.formData().catch(() => null);
  const params: Record<string, string> = {};
  form?.forEach((v, k) => {
    if (typeof v === "string") params[k] = v;
  });
  const u = new URL(req.url);
  // Twilio signs the public URL it called, which can differ from req.url behind a proxy.
  const signedUrl = cfg.siteUrl ? `${cfg.siteUrl}${u.pathname}${u.search}` : req.url;
  if (!isValidTwilioSignature(cfg.twilio.authToken, signedUrl, params, req.headers.get("x-twilio-signature"))) {
    return { ok: false, response: new Response("Invalid signature.", { status: 403 }) };
  }
  return { ok: true, params, query: u.searchParams };
}

export function twiml(body: string): Response {
  return new Response(body, { headers: { "content-type": "text/xml; charset=utf-8" } });
}
