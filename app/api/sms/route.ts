import { getPublicResources } from "@/lib/data";
import { answerText } from "@/lib/outreach/engine";
import { getOutreach } from "@/lib/outreach/server";
import { escapeXml } from "@/lib/outreach/lines";
import { readTwilioRequest, twiml } from "@/lib/outreach/webhook";

export const dynamic = "force-dynamic";

/** Twilio "A message comes in" webhook for the text line. */
export async function POST(req: Request) {
  const { store, cfg, provider } = getOutreach();
  const r = await readTwilioRequest(req, cfg);
  if (!r.ok) return r.response;
  const out = await answerText(r.params.Body ?? "", r.params.From ?? null, { store, provider, resources: getPublicResources(), cfg });
  return twiml(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(out.reply)}</Message></Response>`);
}
