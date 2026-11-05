import Link from "next/link";
import { notFound } from "next/navigation";
import { getOutreach } from "@/lib/outreach/server";
import { formatUs, maskPhone } from "@/lib/outreach/phone";
import { CHANNELS, CHANNEL_LABELS } from "@/lib/outreach/rules";
import { SOURCE_LABELS } from "@/lib/outreach/store";
import { categoryLabel, localityLabel } from "@/lib/schema";
import { staffOrRedirect } from "../../guard";
import { eraseSubscriber, stopSubscriber } from "../../actions";

export const metadata = { title: "Subscriber" };

export default async function SubscriberPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erase?: string }> }) {
  await staffOrRedirect();
  const { store, cfg } = getOutreach();
  const s = store.get(Number((await params).id));
  if (!s) notFound();
  const confirmErase = (await searchParams).erase === "confirm";
  // With the demo passcode anyone could sign in, so personal details stay hidden.
  const reveal = !cfg.staffPasscodeIsDemo;
  const hidden = "Hidden in demo mode";
  return (
    <div className="grid gap-5">
      <p><Link href="/staff/subscribers">← All subscribers</Link></p>
      <h1 className="text-3xl font-bold">Subscriber #{s.id}</h1>
      <dl className="grid gap-2 rounded-xl border-2 border-line p-4 sm:grid-cols-[12rem_1fr]">
        <dt className="font-bold">Phone</dt>
        <dd>{s.phone ? (reveal ? formatUs(s.phone) : `${maskPhone(s.phoneLast4)} (${hidden})`) : "—"}</dd>
        <dt className="font-bold">Name</dt>
        <dd>{s.name ? (reveal ? s.name : hidden) : "—"}</dd>
        <dt className="font-bold">Mailing address</dt>
        <dd>
          {s.address
            ? reveal
              ? `${s.address.line1}${s.address.line2 ? `, ${s.address.line2}` : ""}, ${s.address.city}, ${s.address.state} ${s.address.zip}`
              : hidden
            : "—"}
        </dd>
        <dt className="font-bold">Place</dt>
        <dd>{s.locality ? localityLabel(s.locality) : "Not given"}</dd>
        <dt className="font-bold">Topics</dt>
        <dd>{s.topics.length ? s.topics.map(categoryLabel).join(", ") : "Everything"}</dd>
        <dt className="font-bold">Language</dt>
        <dd>{s.language === "es" ? "Español" : "English"}</dd>
        <dt className="font-bold">Signed up</dt>
        <dd>{SOURCE_LABELS[s.source]}, {new Date(s.created_at).toLocaleString("en-US")}</dd>
        {CHANNELS.map((c) => (
          <div key={c} className="contents">
            <dt className="font-bold">{CHANNEL_LABELS[c]}</dt>
            <dd>{s[c] === "on" ? "On" : s[c] === "pending" ? "Waiting for the phone to reply YES" : "Off"}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="stop-h" className="grid gap-2">
        <h2 id="stop-h" className="text-2xl font-bold">Stop messages</h2>
        <p className="text-base">Use this when the person asks you to stop. It is recorded with your initials.</p>
        <div className="flex flex-wrap gap-2">
          {CHANNELS.filter((c) => s[c] !== "off").map((c) => (
            <form key={c} action={stopSubscriber}>
              <input type="hidden" name="id" value={s.id} />
              <input type="hidden" name="channel" value={c} />
              <button className="btn btn-secondary">Stop {CHANNEL_LABELS[c].toLowerCase()}</button>
            </form>
          ))}
          {CHANNELS.some((c) => s[c] !== "off") && (
            <form action={stopSubscriber}>
              <input type="hidden" name="id" value={s.id} />
              <button className="btn btn-primary">Stop everything</button>
            </form>
          )}
        </div>
      </section>

      <section aria-labelledby="consent-h" className="grid gap-2">
        <h2 id="consent-h" className="text-2xl font-bold">Consent history</h2>
        <ol className="grid gap-1 text-base" data-testid="consent-history">
          {store.consents(s.id).map((c, i) => (
            <li key={i} className="rounded-lg border border-line p-2">
              <strong>{c.granted ? "Agreed to" : "Stopped"} {CHANNEL_LABELS[c.channel].toLowerCase()}</strong> · {c.method.replace(/_/g, " ")} ·
              recorded by {c.recorded_by} · {new Date(c.at).toLocaleString("en-US")}
              {c.consent_version && <> · wording {c.consent_version}</>}
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="erase-h" className="grid gap-2 rounded-xl border-2 border-bad p-4">
        <h2 id="erase-h" className="text-2xl font-bold text-bad">Erase this person</h2>
        <p className="text-base">
          Deletes their contact details, consent history and delivery records for good. Use this if they ask to be removed
          completely. To just stop messages, use “Stop everything” instead.
        </p>
        <form action={eraseSubscriber} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="id" value={s.id} />
          <div className="grid gap-1">
            <label htmlFor="erase-confirm" className="font-bold">Type ERASE to confirm</label>
            <input id="erase-confirm" name="confirm" className="field" autoComplete="off" />
          </div>
          <button className="btn btn-secondary !border-bad !text-bad">Erase</button>
        </form>
        {confirmErase && <p role="alert" className="font-bold text-bad">Type ERASE in the box to confirm.</p>}
      </section>
    </div>
  );
}
