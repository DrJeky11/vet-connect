import Link from "next/link";
import { getOutreach } from "@/lib/outreach/server";
import { CHANNEL_LABELS } from "@/lib/outreach/rules";
import { staffOrRedirect } from "../guard";
import { ComposeForm } from "./ComposeForm";

export const metadata = { title: "Messages" };

export default async function Messages() {
  await staffOrRedirect();
  const { store, cfg } = getOutreach();
  const list = store.campaigns();
  return (
    <div className="grid gap-6">
      <h1 className="text-3xl font-bold">Messages</h1>
      <section aria-labelledby="new-h" className="grid gap-2 rounded-xl border-2 border-line p-4">
        <h2 id="new-h" className="text-2xl font-bold">Write a new message</h2>
        <p className="text-base">
          Saving makes a draft. You will see who it reaches before anything is sent. Use plain words, and never promise
          that someone qualifies.
        </p>
        <ComposeForm sender={cfg.senderName} />
      </section>
      <section aria-labelledby="list-h" className="grid gap-2">
        <h2 id="list-h" className="text-2xl font-bold">All messages</h2>
        {list.length === 0 ? (
          <p className="text-muted">None yet.</p>
        ) : (
          <ul className="grid gap-2">
            {list.map((c) => (
              <li key={c.id} className="rounded-lg border border-line p-3">
                <Link href={`/staff/messages/${c.id}`} className="font-bold">{c.title}</Link>
                <span className="block text-base text-muted">
                  {c.status === "draft" ? "Draft" : c.status === "sending" ? "Sending" : "Sent"} · {c.channels.map((ch) => CHANNEL_LABELS[ch]).join(", ")} · by {c.created_by},{" "}
                  {new Date(c.created_at).toLocaleString("en-US")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
