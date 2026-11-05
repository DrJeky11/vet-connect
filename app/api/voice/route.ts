import { getPublicResources } from "@/lib/data";
import { answerCall } from "@/lib/outreach/engine";
import { getOutreach } from "@/lib/outreach/server";
import { readTwilioRequest, twiml } from "@/lib/outreach/webhook";

export const dynamic = "force-dynamic";

/** Twilio "A call comes in" webhook for the phone line, and every menu step after it. */
export async function POST(req: Request) {
  const { store, cfg, provider } = getOutreach();
  const r = await readTwilioRequest(req, cfg);
  if (!r.ok) return r.response;
  const q = r.query;
  const out = await answerCall(
    {
      step: q.get("step"),
      digits: r.params.Digits ?? null,
      // Outbound update calls are "from" our number "to" the subscriber.
      from: q.get("step") === "broadcast" ? (r.params.To ?? null) : (r.params.From ?? null),
      c: q.get("c"),
      l: q.get("l"),
      n: q.get("n"),
      quiet: q.get("quiet"),
      m: q.get("m"),
    },
    { store, provider, resources: getPublicResources(), cfg },
  );
  return twiml(out.twiml);
}
