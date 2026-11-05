import Link from "next/link";
import { getOutreach } from "@/lib/outreach/server";
import { maskPhone } from "@/lib/outreach/phone";
import { SOURCE_LABELS, type ChannelState } from "@/lib/outreach/store";
import { CHANNELS, CHANNEL_LABELS, consentText } from "@/lib/outreach/rules";
import { categoryLabel, localityLabel } from "@/lib/schema";
import { staffOrRedirect } from "../guard";
import { AddSubscriberForm } from "./AddSubscriberForm";

export const metadata = { title: "Subscribers" };

const STATE: Record<ChannelState, string> = { on: "✓ on", pending: "… waiting for YES", off: "—" };

export default async function Subscribers({ searchParams }: { searchParams: Promise<{ erased?: string }> }) {
  await staffOrRedirect();
  const { store, cfg } = getOutreach();
  const list = store.list();
  const consents = CHANNELS.map((c) => ({ id: c, label: CHANNEL_LABELS[c], text: consentText(c, cfg.senderName) }));
  const erased = (await searchParams).erased;
  return (
    <div className="grid gap-6">
      <h1 className="text-3xl font-bold">Subscribers</h1>
      {erased && <p role="status" className="rounded-lg bg-ok-bg p-3 font-bold">Subscriber erased.</p>}

      <section aria-labelledby="add-h" className="grid gap-2 rounded-xl border-2 border-line p-4">
        <h2 id="add-h" className="text-2xl font-bold">Add someone who called or sent a paper form</h2>
        <p className="text-base">
          Use this when a veteran (or someone with their permission) asks you by phone, in person or on paper.
          Read them the consent wording for each way you check. Your initials are recorded with their consent.
        </p>
        <AddSubscriberForm consents={consents} />
      </section>

      <section aria-labelledby="list-h" className="grid gap-2">
        <h2 id="list-h" className="text-2xl font-bold">Everyone ({list.length})</h2>
        <p className="text-base text-muted">Phone numbers show only the last four digits. Names and addresses stay encrypted.</p>
        {list.length === 0 ? (
          <p className="text-muted">No one yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-base" data-testid="subscriber-table">
              <thead>
                <tr className="border-b-2 border-ink">
                  <th className="p-2">#</th>
                  <th className="p-2">Phone</th>
                  <th className="p-2">Texts</th>
                  <th className="p-2">Calls</th>
                  <th className="p-2">Letters</th>
                  <th className="p-2">Place</th>
                  <th className="p-2">Topics</th>
                  <th className="p-2">How they signed up</th>
                </tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s.id} className="border-b border-line">
                    <td className="p-2"><Link href={`/staff/subscribers/${s.id}`}>#{s.id}</Link></td>
                    <td className="p-2 whitespace-nowrap">{maskPhone(s.phoneLast4)}</td>
                    <td className="p-2">{STATE[s.sms]}</td>
                    <td className="p-2">{STATE[s.voice]}</td>
                    <td className="p-2">{STATE[s.mail]}</td>
                    <td className="p-2">{s.locality ? localityLabel(s.locality) : "—"}</td>
                    <td className="p-2">{s.topics.length ? s.topics.map(categoryLabel).join(", ") : "All"}</td>
                    <td className="p-2">{SOURCE_LABELS[s.source]}{s.language === "es" ? " · Español" : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
