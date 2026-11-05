import { getOutreach } from "@/lib/outreach/server";
import { readTwilioRequest } from "@/lib/outreach/webhook";

export const dynamic = "force-dynamic";

const DELIVERED = new Set(["delivered", "read", "completed"]);
const FAILED = new Set(["failed", "undelivered", "busy", "no-answer", "canceled"]);

/** Twilio status callback: marks a text or call delivered or failed. */
export async function POST(req: Request) {
  const { store, cfg } = getOutreach();
  const r = await readTwilioRequest(req, cfg);
  if (!r.ok) return r.response;
  const sid = r.params.MessageSid || r.params.CallSid;
  const status = (r.params.MessageStatus || r.params.CallStatus || "").toLowerCase();
  if (sid && DELIVERED.has(status)) store.updateByProviderId(sid, "delivered", null);
  else if (sid && FAILED.has(status)) store.updateByProviderId(sid, "failed", `${status}${r.params.ErrorCode ? ` (${r.params.ErrorCode})` : ""}`);
  return new Response(null, { status: 204 });
}
