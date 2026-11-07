"use client";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LOCALITIES, type LocalityId, type Resource } from "@/lib/schema";
import { callScript, decodeShare, encodeShare } from "@/lib/plan";
import { usePlan } from "@/lib/usePlan";
import { effectiveStatus, formatDate, STATUS_LABELS } from "@/lib/status";
import { telHref } from "@/lib/contact";
import { StatusBadge } from "@/components/StatusBadge";

export function PlanView({ resources }: { resources: Resource[] }) {
  const params = useSearchParams();
  const { plan, ready, add, remove, toggle, setLocality, setForSomeone, clear } = usePlan();
  const [copied, setCopied] = useState(false);
  const byId = new Map(resources.map((r) => [r.id, r]));
  const shared = decodeShare(params.get("ids")).filter((id) => byId.has(id));
  const sharedNotSaved = shared.filter((id) => !plan.items.some((i) => i.id === id));

  if (!ready) return <p>Loading your plan…</p>;

  const items = plan.items.map((i) => ({ ...i, r: byId.get(i.id) })).filter((i) => i.r) as {
    id: string;
    done: boolean;
    r: Resource;
  }[];
  const missing = plan.items.length - items.length;

  const shareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/plan?ids=${encodeShare(items.map((i) => i.id))}` : "";

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Call list", url: shareUrl });
        return;
      }
    } catch {
      /* fall through to copy */
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      window.prompt("Copy this link:", shareUrl);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-5">
      <div>
        <h1 className="text-3xl font-bold">My Plan: who to call</h1>
        <p className="text-muted">
          Saved on this device only. Printed {new Date().toLocaleDateString("en-US", { dateStyle: "long" })}.
        </p>
      </div>

      {sharedNotSaved.length > 0 && (
        <div className="no-print rounded-xl border-2 border-brand bg-wash p-4" role="region" aria-label="Shared plan">
          <p className="font-bold">Someone shared {sharedNotSaved.length} listing(s) with you.</p>
          <ul className="ml-5 list-disc">
            {sharedNotSaved.map((id) => (
              <li key={id}>{byId.get(id)!.name}</li>
            ))}
          </ul>
          <button type="button" className="btn btn-primary mt-2" onClick={() => sharedNotSaved.forEach(add)}>
            Add to my plan
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-xl bg-wash p-4">
          <p className="text-xl">Your plan is empty.</p>
          <p className="mt-2">Find a service and tap “Save to My Plan”.</p>
          <Link href="/intake" className="btn btn-primary mt-3">
            Find help
          </Link>
        </div>
      ) : (
        <>
          <div className="no-print grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-2">
            <div className="grid gap-1">
              <label htmlFor="plan-loc" className="font-bold">
                Where does the veteran live?
              </label>
              <select
                id="plan-loc"
                className="field"
                value={plan.locality ?? ""}
                onChange={(e) => setLocality((e.target.value || null) as LocalityId | null)}
              >
                <option value="">Leave out of script</option>
                {LOCALITIES.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex min-h-[48px] items-center gap-2 self-end">
              <input
                type="checkbox"
                className="h-6 w-6"
                checked={plan.forSomeone}
                onChange={(e) => setForSomeone(e.target.checked)}
              />
              I am calling for someone else
            </label>
          </div>

          <ol className="grid gap-4" data-testid="plan-list">
            {items.map(({ id, done, r }, n) => {
              const tel = telHref(r.phone);
              const status = effectiveStatus(r);
              return (
                <li key={id} className="card print-break rounded-xl border-2 border-line p-4" data-testid="plan-item">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id={`done-${id}`}
                      className="mt-1 h-7 w-7 shrink-0"
                      checked={done}
                      onChange={() => toggle(id)}
                    />
                    <div className="grid flex-1 gap-1">
                      <label htmlFor={`done-${id}`} className="text-2xl font-bold">
                        {n + 1}. {r.name}
                        <span className="sr-only">{done ? " (called)" : " (not called yet)"}</span>
                      </label>
                      <p className="text-xl">
                        <strong>Phone:</strong>{" "}
                        {r.phone ? (tel ? <a href={tel}>{r.phone}</a> : r.phone) : "Not listed — see source"}
                      </p>
                      {r.hours && (
                        <p>
                          <strong>Hours:</strong> {r.hours}
                        </p>
                      )}
                      {r.address && (
                        <p>
                          <strong>Address:</strong> {r.address}
                        </p>
                      )}
                      <div className="mt-1 rounded-lg bg-wash p-3">
                        <p className="font-bold">What to say:</p>
                        <p data-testid="call-script">“{callScript(r, plan.locality, plan.forSomeone)}”</p>
                      </div>
                      <p className="text-base">
                        <span className="no-print">
                          <StatusBadge status={status} />{" "}
                        </span>
                        <span className="hidden print:inline">Status: {STATUS_LABELS[status]}. </span>
                        Last verified: {formatDate(r.last_verified_at)}. Source:{" "}
                        <a href={r.source_url}>{r.source_name}</a>
                        <span className="hidden print:inline"> ({r.source_url})</span>
                      </p>
                      <p className="no-print">
                        <button type="button" className="btn btn-secondary !min-h-[44px]" onClick={() => remove(id)}>
                          Remove<span className="sr-only"> {r.name}</span>
                        </button>
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
          {missing > 0 && <p className="text-muted">{missing} saved listing(s) are no longer in the directory.</p>}

          <p className="font-bold">Each provider decides who it serves. You may be eligible — call to confirm.</p>

          <div className="no-print flex flex-wrap gap-3">
            <button type="button" className="btn btn-primary text-xl" onClick={() => window.print()}>
              Print large-type list
            </button>
            <button type="button" className="btn btn-secondary" onClick={share}>
              Share link
            </button>
            <button type="button" className="btn btn-secondary !border-transparent" onClick={() => confirm("Remove everything from your plan?") && clear()}>
              Clear plan
            </button>
          </div>
          <p className="no-print text-base text-muted" aria-live="polite">
            {copied ? "Link copied. " : ""}The share link contains only listing IDs — no names or personal details.
          </p>
        </>
      )}
    </div>
  );
}
