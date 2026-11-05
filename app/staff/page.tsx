import Link from "next/link";
import { currentStaff } from "@/lib/outreach/staff-session";
import { getOutreach } from "@/lib/outreach/server";
import { readiness } from "@/lib/outreach/config";
import { CHANNELS, CHANNEL_LABELS } from "@/lib/outreach/rules";
import { categoryLabel, localityLabel } from "@/lib/schema";
import { StaffLoginForm } from "./LoginForm";

export default async function StaffHome() {
  const who = await currentStaff();
  const { store, cfg } = getOutreach();
  if (!who) return <StaffLoginForm demo={cfg.staffPasscodeIsDemo} />;
  const counts = store.counts();
  const checks = readiness(cfg);
  const demand = store.demand(30);
  return (
    <div className="grid gap-6">
      <h1 className="text-3xl font-bold">Outreach overview</h1>

      <section aria-labelledby="ready-h" className="grid gap-2">
        <h2 id="ready-h" className="text-2xl font-bold">Ready to go live?</h2>
        <p className="text-base">
          Real texts and calls go out only when <code>OUTREACH_LIVE=true</code> and every item below is done.
          {cfg.liveRequested && !cfg.live && <strong> Live was requested, but some items are not done, so it stays simulated.</strong>}
        </p>
        <ul className="grid gap-2" data-testid="readiness">
          {checks.map((c) => (
            <li key={c.id} className={`rounded-lg border-2 p-3 ${c.ok ? "border-ok bg-ok-bg" : "border-warn bg-warn-bg"}`}>
              <p className="font-bold">
                <span aria-hidden="true">{c.ok ? "✓ " : "✗ "}</span>
                {c.label}
                <span className="sr-only">{c.ok ? " (done)" : " (not done)"}</span>
              </p>
              {!c.ok && <p className="text-base">{c.fix}</p>}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="subs-h" className="grid gap-2">
        <h2 id="subs-h" className="text-2xl font-bold">Who has signed up</h2>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-lg bg-wash p-3 text-center">
            <dt className="text-base">People</dt>
            <dd className="text-3xl font-bold" data-testid="count-total">{counts.total}</dd>
          </div>
          {CHANNELS.map((c) => (
            <div key={c} className="rounded-lg bg-wash p-3 text-center">
              <dt className="text-base">{CHANNEL_LABELS[c]}</dt>
              <dd className="text-3xl font-bold">{counts[c].on}</dd>
              {counts[c].pending > 0 && <dd className="text-base">{counts[c].pending} waiting for YES</dd>}
            </div>
          ))}
        </dl>
        <p className="flex flex-wrap gap-2">
          <Link href="/staff/subscribers" className="btn btn-primary">Add or find a subscriber</Link>
          <Link href="/staff/messages" className="btn btn-primary">Send a message</Link>
          <Link href="/updates/paper-form" className="btn btn-secondary">Print paper sign-up forms</Link>
          <Link href="/print" className="btn btn-secondary">Print the directory</Link>
        </p>
      </section>

      <section aria-labelledby="demand-h" className="grid gap-2">
        <h2 id="demand-h" className="text-2xl font-bold">What people asked the text and phone lines for (30 days)</h2>
        <p className="text-base text-muted">
          {demand.total} request(s). Rows marked “found nothing” are gaps to fill in the directory. The message text itself is never stored.
        </p>
        {demand.rows.length === 0 ? (
          <p className="text-muted">No requests yet. Try the text line to see how this fills in.</p>
        ) : (
          <table className="w-full border-collapse text-left text-base">
            <thead>
              <tr className="border-b-2 border-ink">
                <th className="p-2">Topic</th>
                <th className="p-2">Place</th>
                <th className="p-2">Line</th>
                <th className="p-2">Requests</th>
                <th className="p-2">Found nothing</th>
              </tr>
            </thead>
            <tbody>
              {demand.rows.map((r) => (
                <tr key={`${r.channel}-${r.topic}-${r.locality}`} className="border-b border-line">
                  <td className="p-2">{categoryLabel(r.topic)}</td>
                  <td className="p-2">{r.locality ? localityLabel(r.locality) : "Not given"}</td>
                  <td className="p-2">{r.channel === "sms" ? "Text" : "Phone"}</td>
                  <td className="p-2">{r.n}</td>
                  <td className={`p-2 ${r.empty ? "font-bold text-bad" : ""}`}>{r.empty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section aria-labelledby="line-h" className="grid gap-2 rounded-xl bg-wash p-4">
        <h2 id="line-h" className="text-2xl font-bold">Connecting the text and phone line</h2>
        <p>In Twilio, point the phone number&apos;s webhooks here (HTTP POST):</p>
        <ul className="ml-5 list-disc text-base">
          <li>A message comes in: <code>{cfg.siteUrl ?? "https://YOUR-SITE"}/api/sms</code></li>
          <li>A call comes in: <code>{cfg.siteUrl ?? "https://YOUR-SITE"}/api/voice</code></li>
        </ul>
        <p className="text-base">Both reject any request without a valid Twilio signature.</p>
      </section>
    </div>
  );
}
