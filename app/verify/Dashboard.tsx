"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { COST_LABELS, COST_TYPES, EDITABLE_FIELDS, type EditableField, type LogEntry, type Resource } from "@/lib/schema";
import { daysSince, effectiveStatus, formatDate } from "@/lib/status";
import { StatusBadge } from "@/components/StatusBadge";
import type { Suggestion } from "@/lib/store";

const KIND_LABELS: Record<Suggestion["kind"], string> = {
  wrong_info: "Something is wrong",
  closed: "Closed or moved",
  new_listing: "New listing suggested",
  other: "Other",
};

function Reports({ items, names }: { items: Suggestion[]; names: Map<string, string> }) {
  const router = useRouter();
  const [note, setNote] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  async function resolve(id: number) {
    setError(null);
    const res = await fetch(`/api/verify/suggestions/${id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ note: note[id] ?? "" }),
    });
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error ?? "Something went wrong.");
    router.refresh();
  }
  return (
    <section aria-labelledby="reports-h" data-testid="reports">
      <h2 id="reports-h" className="mb-2 text-2xl font-bold">Reports from the public ({items.length} open)</h2>
      <p className="mb-2 text-base text-muted">
        Reports never change a listing by themselves. Check the source or call the provider, then edit or verify the listing.
        New listings are added with the CSV import (see README).
      </p>
      {error && <p role="alert" className="font-bold text-bad">{error}</p>}
      {items.length === 0 ? (
        <p className="text-muted">No open reports.</p>
      ) : (
        <ol className="grid gap-3">
          {items.map((s) => (
            <li key={s.id} className="rounded-xl border-2 border-warn p-3" data-testid="report">
              <p className="font-bold">
                {KIND_LABELS[s.kind]}
                {s.resource_id && (
                  <>
                    {" · "}
                    <Link href={`/resources/${s.resource_id}`}>{names.get(s.resource_id) ?? s.resource_id}</Link>
                  </>
                )}
              </p>
              <p className="mt-1 whitespace-pre-wrap">{s.details}</p>
              {s.source_url && (
                <p className="mt-1 text-base">
                  Page: <a href={s.source_url} target="_blank" rel="noopener noreferrer nofollow">{s.source_url}</a>
                </p>
              )}
              {s.how_known && <p className="mt-1 text-base">How they know: {s.how_known}</p>}
              <p className="mt-1 text-base text-muted">Received {new Date(s.created_at).toLocaleString("en-US")}</p>
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <div className="grid flex-1 gap-1">
                  <label htmlFor={`rs-${s.id}`} className="text-base font-bold">What you did (optional)</label>
                  <input id={`rs-${s.id}`} className="field" value={note[s.id] ?? ""} onChange={(e) => setNote({ ...note, [s.id]: e.target.value })} />
                </div>
                <button type="button" className="btn btn-secondary" onClick={() => resolve(s.id)}>
                  Mark resolved
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

const FIELD_LABELS: Record<EditableField, string> = {
  name: "Name",
  organization: "Organization",
  description: "Description",
  eligibility_text: "Who it serves (provider's words)",
  cost_type: "Cost type",
  address: "Address",
  phone: "Phone",
  website: "Website",
  hours: "Hours",
  how_to_apply: "How to apply",
  source_url: "Source URL",
  source_name: "Source name",
  source_notes: "Notes for verifiers",
};
const LONG: EditableField[] = ["description", "eligibility_text", "source_notes"];

async function post(id: string, body: object): Promise<string | null> {
  const res = await fetch(`/api/verify/resources/${encodeURIComponent(id)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.ok) return null;
  return (await res.json().catch(() => ({}))).error ?? "Something went wrong.";
}

function Row({ r, now, log, reports }: { r: Resource; now: Date; log: LogEntry[]; reports: number }) {
  const router = useRouter();
  const [mode, setMode] = useState<null | "verify" | "edit" | "note" | "archive">(null);
  const [note, setNote] = useState("");
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const status = effectiveStatus(r, now);
  const age = daysSince(r.last_verified_at, now);

  async function run(body: object) {
    setBusy(true);
    setError(null);
    const err = await post(r.id, body);
    setBusy(false);
    if (err) return setError(err);
    setMode(null);
    setNote("");
    setDraft({});
    router.refresh();
  }

  function startEdit() {
    const d: Record<string, string> = {};
    for (const f of EDITABLE_FIELDS) d[f] = (r[f] as string | null) ?? "";
    setDraft(d);
    setMode("edit");
  }

  function saveEdit() {
    const changes: Record<string, string | null> = {};
    for (const f of EDITABLE_FIELDS) {
      const before = (r[f] as string | null) ?? "";
      if (draft[f] !== before) changes[f] = draft[f] === "" ? null : draft[f];
    }
    run({ action: "edit", changes, note });
  }

  const hasConflict = r.source_notes?.toUpperCase().includes("CONFLICT");

  return (
    <li className="card rounded-xl border border-line p-4" data-testid="queue-row" data-id={r.id}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-xl font-bold">
            <Link href={`/resources/${r.id}`}>{r.name}</Link>
          </h3>
          <p className="text-base text-muted">
            {age === null ? "Never verified" : `Verified ${age} day(s) ago by ${r.verified_by}`} · id <code>{r.id}</code>
          </p>
        </div>
        <StatusBadge status={status} />
      </div>
      {reports > 0 && (
        <p className="mt-2 rounded-lg bg-warn-bg p-2 font-bold text-warn">{reports} open report(s) from the public — see Reports above.</p>
      )}
      {hasConflict && (
        <p className="mt-2 rounded-lg bg-bad-bg p-2 font-bold text-bad">Sources disagree — check before verifying.</p>
      )}
      <p className="mt-2 text-base">
        Source: <a href={r.source_url} target="_blank" rel="noopener noreferrer">{r.source_name}</a>
        {r.additional_sources.map((s) => (
          <span key={s.url}> · <a href={s.url} target="_blank" rel="noopener noreferrer">{s.name}</a></span>
        ))}
      </p>
      {r.source_notes && <p className="mt-1 text-base text-muted">{r.source_notes}</p>}
      <p className="mt-1 text-base">
        Phone: {r.phone ?? "—"} · Address: {r.address ?? "—"} · Hours: {r.hours ?? "—"}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {r.status !== "archived" && (
          <button type="button" className="btn btn-primary" onClick={() => setMode(mode === "verify" ? null : "verify")}>
            Mark verified<span className="sr-only"> {r.name}</span>
          </button>
        )}
        <button type="button" className="btn btn-secondary" onClick={() => (mode === "edit" ? setMode(null) : startEdit())}>
          Edit<span className="sr-only"> {r.name}</span>
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => setMode(mode === "note" ? null : "note")}>
          Add note<span className="sr-only"> to {r.name}</span>
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => setMode(mode === "archive" ? null : "archive")}>
          {r.status === "archived" ? "Unarchive" : "Archive"}<span className="sr-only"> {r.name}</span>
        </button>
      </div>

      {mode && (
        <div className="mt-3 grid gap-3 rounded-lg bg-wash p-3">
          {mode === "verify" && (
            <p>
              Confirm you checked this listing with the provider or its source today. It will show as verified by{" "}
              <strong>you</strong> on {formatDate(now.toISOString())}.
            </p>
          )}
          {mode === "edit" && (
            <div className="grid gap-3">
              {EDITABLE_FIELDS.map((f) => (
                <div key={f} className="grid gap-1">
                  <label htmlFor={`${r.id}-${f}`} className="font-bold">{FIELD_LABELS[f]}</label>
                  {f === "cost_type" ? (
                    <select id={`${r.id}-${f}`} className="field" value={draft[f]} onChange={(e) => setDraft({ ...draft, [f]: e.target.value })}>
                      {COST_TYPES.map((c) => <option key={c} value={c}>{COST_LABELS[c]}</option>)}
                    </select>
                  ) : LONG.includes(f) ? (
                    <textarea id={`${r.id}-${f}`} className="field" rows={3} value={draft[f]} onChange={(e) => setDraft({ ...draft, [f]: e.target.value })} />
                  ) : (
                    <input id={`${r.id}-${f}`} className="field" value={draft[f]} onChange={(e) => setDraft({ ...draft, [f]: e.target.value })} />
                  )}
                </div>
              ))}
              <p className="text-base text-muted">Leave a field empty if no source states it. Never guess.</p>
            </div>
          )}
          <div className="grid gap-1">
            <label htmlFor={`${r.id}-note`} className="font-bold">
              {mode === "edit" ? "Where did this information come from? (required for contact details)" : mode === "note" ? "Note" : "Note (optional)"}
            </label>
            <textarea id={`${r.id}-note`} className="field" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          {error && <p role="alert" className="font-bold text-bad">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={() =>
                mode === "verify"
                  ? run({ action: "verify", note })
                  : mode === "edit"
                    ? saveEdit()
                    : mode === "note"
                      ? run({ action: "note", note })
                      : run({ action: r.status === "archived" ? "unarchive" : "archive", note })
              }
            >
              {mode === "verify" ? "Confirm verified" : mode === "edit" ? "Save changes" : mode === "note" ? "Save note" : r.status === "archived" ? "Confirm unarchive" : "Confirm archive"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setMode(null)}>Cancel</button>
          </div>
        </div>
      )}

      {log.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer font-bold">History ({log.length})</summary>
          <LogList entries={log} />
        </details>
      )}
    </li>
  );
}

function fmt(v: unknown) {
  return v === null || v === undefined || v === "" ? "(empty)" : String(v);
}

function LogList({ entries, showId = false }: { entries: LogEntry[]; showId?: boolean }) {
  return (
    <ol className="mt-2 grid gap-2" data-testid="change-log">
      {entries.map((e) => (
        <li key={e.id} className="rounded-lg border border-line p-2 text-base">
          <strong>{e.action}</strong> by <strong>{e.initials}</strong> on {new Date(e.at).toLocaleString("en-US")}
          {showId && <> · <code>{e.resource_id}</code></>}
          {e.note && <p className="mt-1">Note: {e.note}</p>}
          {e.changes && (
            <ul className="ml-5 mt-1 list-disc">
              {Object.entries(e.changes).map(([k, c]) => (
                <li key={k}>
                  {k}: {fmt(c.from)} → {fmt(c.to)}
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ol>
  );
}

export function Dashboard({
  initials,
  queue,
  log,
  now,
  suggestions,
}: {
  initials: string;
  queue: Resource[];
  log: LogEntry[];
  now: string;
  suggestions: Suggestion[];
}) {
  const router = useRouter();
  const nowDate = new Date(now);
  const counts = { verified: 0, unverified: 0, stale: 0, archived: 0 };
  queue.forEach((r) => counts[effectiveStatus(r, nowDate)]++);

  async function logout() {
    await fetch("/api/verify/logout", { method: "POST" });
    router.refresh();
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl font-bold">Verifier dashboard</h1>
        <p>
          Signed in as <strong>{initials}</strong>{" "}
          <button type="button" className="btn btn-secondary !min-h-[44px]" onClick={logout}>Sign out</button>
        </p>
      </div>
      <p>
        Listings older than 90 days since their last check show as Stale. Never-verified listings come first, then the
        oldest checks. Every change is logged.
      </p>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Object.entries(counts).map(([k, v]) => (
          <div key={k} className="rounded-lg bg-wash p-2 text-center">
            <dt className="text-base capitalize">{k}</dt>
            <dd className="text-2xl font-bold">{v}</dd>
          </div>
        ))}
      </dl>
      <Reports items={suggestions} names={new Map(queue.map((r) => [r.id, r.name]))} />
      <section aria-labelledby="queue-h">
        <h2 id="queue-h" className="mb-2 text-2xl font-bold">Queue</h2>
        <ol className="grid gap-3">
          {queue.map((r) => (
            <Row
              key={r.id}
              r={r}
              now={nowDate}
              log={log.filter((e) => e.resource_id === r.id)}
              reports={suggestions.filter((s) => s.resource_id === r.id).length}
            />
          ))}
        </ol>
      </section>
      <section aria-labelledby="log-h">
        <h2 id="log-h" className="mb-2 text-2xl font-bold">Change log</h2>
        {log.length ? <LogList entries={log} showId /> : <p className="text-muted">No changes yet.</p>}
      </section>
    </div>
  );
}
