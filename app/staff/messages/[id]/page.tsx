import Link from "next/link";
import { notFound } from "next/navigation";
import { getOutreach } from "@/lib/outreach/server";
import { CHANNEL_LABELS, withSmsFooter, inContactHours } from "@/lib/outreach/rules";
import { categoryLabel, localityLabel } from "@/lib/schema";
import { staffOrRedirect } from "../../guard";
import { markMailed, sendMessage } from "../../actions";
import { SendProgress } from "./SendProgress";

export const metadata = { title: "Message" };

const STATUS_WORDS: Record<string, string> = {
  queued: "waiting to send",
  sent: "sent",
  simulated: "simulated (not really sent)",
  delivered: "delivered",
  failed: "failed",
  skipped_opted_out: "skipped (opted out)",
  to_print: "ready to print",
  mailed: "mailed",
};

export default async function MessagePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  await staffOrRedirect();
  const { store, cfg } = getOutreach();
  const c = store.campaign(Number((await params).id));
  if (!c) notFound();
  const error = (await searchParams).error;
  const stats = store.deliveryStats(c.id);
  const remaining = store.queuedCount(c.id);
  const a = c.audience;
  return (
    <div className="grid gap-5">
      <p><Link href="/staff/messages">← All messages</Link></p>
      <h1 className="text-3xl font-bold">{c.title}</h1>
      {error && <p role="alert" className="font-bold text-bad">{error}</p>}
      <p className="text-base text-muted">
        {c.status === "draft" ? "Draft" : c.status === "sending" ? "Sending" : "Sent"} · written by {c.created_by} · audience:{" "}
        {a.topics.length ? a.topics.map(categoryLabel).join(", ") : "all topics"} ·{" "}
        {a.localities.length ? a.localities.map(localityLabel).join(", ") : "all places"} ·{" "}
        {a.language === "es" ? "Spanish" : a.language === "en" ? "English" : "all languages"}
      </p>

      <section aria-labelledby="content-h" className="grid gap-3">
        <h2 id="content-h" className="text-2xl font-bold">What it says</h2>
        {c.sms_body && (
          <div className="rounded-lg bg-wash p-3">
            <p className="font-bold">Text message</p>
            <p>{withSmsFooter(c.sms_body, cfg.senderName)}</p>
          </div>
        )}
        {c.voice_script && (
          <div className="rounded-lg bg-wash p-3">
            <p className="font-bold">Phone call</p>
            <p>This is the {cfg.senderName} with an update for veterans. {c.voice_script} To hear this again, press 1. To stop these calls, press 9.</p>
          </div>
        )}
        {c.mail_body && (
          <div className="rounded-lg bg-wash p-3">
            <p className="font-bold">Letter{c.include_listings ? " (with each person's listings)" : ""}</p>
            <p className="whitespace-pre-wrap">{c.mail_body}</p>
          </div>
        )}
      </section>

      <section aria-labelledby="who-h" className="grid gap-2">
        <h2 id="who-h" className="text-2xl font-bold">{c.status === "draft" ? "Who it will reach" : "Delivery"}</h2>
        <ul className="grid gap-2" data-testid="delivery-stats">
          {c.channels.map((ch) => (
            <li key={ch} className="rounded-lg border border-line p-3">
              <strong>{CHANNEL_LABELS[ch]}:</strong>{" "}
              {c.status === "draft"
                ? `${store.audience(a, ch).length} people`
                : Object.entries(stats[ch]).map(([k, v]) => `${v} ${STATUS_WORDS[k] ?? k}`).join(", ") || "nobody matched"}
            </li>
          ))}
        </ul>
      </section>

      {c.status === "draft" && (
        <form action={sendMessage} className="grid gap-2 rounded-xl border-2 border-brand p-4">
          <input type="hidden" name="id" value={c.id} />
          <p>
            {cfg.live ? <strong>This sends real texts and calls.</strong> : "Simulated mode: nothing will actually be sent."} Texts and
            calls only go out between 8 a.m. and 9 p.m. Eastern; outside those hours they wait.
            {(c.channels.includes("sms") || c.channels.includes("voice")) && !inContactHours() && <strong> It is outside those hours now.</strong>}
          </p>
          <p><button className="btn btn-primary">Send now</button></p>
        </form>
      )}

      {c.status === "sending" && remaining > 0 && <SendProgress id={c.id} initialRemaining={remaining} />}

      {c.channels.includes("mail") && c.status !== "draft" && (
        <section aria-labelledby="mail-h" className="grid gap-2 rounded-xl border-2 border-line p-4">
          <h2 id="mail-h" className="text-2xl font-bold">Letters</h2>
          <p>
            Print the letters (one per page, sized for a window envelope), mail them, then mark them mailed.
            {cfg.staffPasscodeIsDemo && " In demo mode, names and addresses print as placeholders."}
          </p>
          <p className="flex flex-wrap gap-2">
            <Link href={`/staff/messages/${c.id}/letters`} className="btn btn-primary">Open letters to print</Link>
          </p>
          {(stats.mail.to_print ?? 0) > 0 && (
            <form action={markMailed}>
              <input type="hidden" name="id" value={c.id} />
              <button className="btn btn-secondary">Mark {stats.mail.to_print} letter(s) as mailed</button>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
