"use client";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LOCALITIES, type LocalityId, type Resource } from "@/lib/schema";
import { callScript, callScriptMeaningEs, decodeShare, encodeShare } from "@/lib/plan";
import { usePlan } from "@/lib/usePlan";
import { effectiveStatus } from "@/lib/status";
import { telHref } from "@/lib/contact";
import { StatusBadge } from "@/components/StatusBadge";
import { useDict } from "@/lib/i18n/client";
import { formatDateIn } from "@/lib/i18n";

export function PlanView({ resources }: { resources: Resource[] }) {
  const params = useSearchParams();
  const { plan, ready, add, remove, toggle, setLocality, setForSomeone, clear } = usePlan();
  const [copied, setCopied] = useState(false);
  const t = useDict();
  const byId = new Map(resources.map((r) => [r.id, r]));
  const shared = decodeShare(params.get("ids")).filter((id) => byId.has(id));
  const sharedNotSaved = shared.filter((id) => !plan.items.some((i) => i.id === id));

  if (!ready) return <p>{t.plan.loading}</p>;

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
        await navigator.share({ title: t.plan.shareTitle, url: shareUrl });
        return;
      }
    } catch {
      /* fall through to copy */
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      window.prompt(t.plan.copyPrompt, shareUrl);
    }
  }

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-3xl font-bold">{t.plan.title}</h1>
        <p className="text-muted">{t.plan.savedOnDevice(new Date().toLocaleDateString(t.dateLocale, { dateStyle: "long" }))}</p>
        {t.card.sourceLanguageNote && <p className="text-base text-muted">{t.card.sourceLanguageNote}</p>}
      </div>

      {sharedNotSaved.length > 0 && (
        <div className="no-print rounded-xl border-2 border-brand bg-wash p-4" role="region" aria-label={t.plan.sharedRegion}>
          <p className="font-bold">{t.plan.sharedTitle(sharedNotSaved.length)}</p>
          <ul className="ml-5 list-disc">
            {sharedNotSaved.map((id) => (
              <li key={id}>{byId.get(id)!.name}</li>
            ))}
          </ul>
          <button type="button" className="btn btn-primary mt-2" onClick={() => sharedNotSaved.forEach(add)}>
            {t.plan.addShared}
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-xl bg-wash p-4">
          <p className="text-xl">{t.plan.empty}</p>
          <p className="mt-2">{t.plan.emptyHint}</p>
          <Link href="/intake" className="btn btn-primary mt-3">
            {t.plan.findHelp}
          </Link>
        </div>
      ) : (
        <>
          <div className="no-print grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-2">
            <div className="grid gap-1">
              <label htmlFor="plan-loc" className="font-bold">
                {t.plan.whereLabel}
              </label>
              <select
                id="plan-loc"
                className="field"
                value={plan.locality ?? ""}
                onChange={(e) => setLocality((e.target.value || null) as LocalityId | null)}
              >
                <option value="">{t.plan.leaveOut}</option>
                {LOCALITIES.map((l) => (
                  <option key={l.id} value={l.id}>
                    {t.localities[l.id]}
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
              {t.plan.callingFor}
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
                        <span className="sr-only">{done ? t.plan.called : t.plan.notCalled}</span>
                      </label>
                      <p className="text-xl">
                        <strong>{t.plan.phone}</strong>{" "}
                        {r.phone ? (tel ? <a href={tel}>{r.phone}</a> : r.phone) : t.plan.phoneMissing}
                      </p>
                      {r.hours && (
                        <p>
                          <strong>{t.plan.hours}</strong> {r.hours}
                        </p>
                      )}
                      {r.address && (
                        <p>
                          <strong>{t.plan.address}</strong> {r.address}
                        </p>
                      )}
                      <div className="mt-1 rounded-lg bg-wash p-3">
                        <p className="font-bold">{t.plan.whatToSay}</p>
                        <p data-testid="call-script" lang="en">“{callScript(r, plan.locality, plan.forSomeone)}”</p>
                        {t.plan.meaning && (
                          <p className="mt-2 text-base">
                            <span className="font-bold">{t.plan.meaning}</span>{" "}
                            {callScriptMeaningEs(
                              r,
                              plan.locality ? t.localities[plan.locality] : null,
                              t.categories[r.categories[0]].label.toLowerCase(),
                              plan.forSomeone,
                            )}
                          </p>
                        )}
                      </div>
                      <p className="text-base">
                        <span className="no-print">
                          <StatusBadge status={status} />{" "}
                        </span>
                        <span className="hidden print:inline">{t.plan.status} {t.status.labels[status]}. </span>
                        {t.plan.lastVerified} {formatDateIn(t, r.last_verified_at)}. {t.plan.source}{" "}
                        <a href={r.source_url}>{r.source_name}</a>
                        <span className="hidden print:inline"> ({r.source_url})</span>
                      </p>
                      <p className="no-print">
                        <button type="button" className="btn btn-secondary !min-h-[44px]" onClick={() => remove(id)}>
                          {t.plan.remove}<span className="sr-only"> {r.name}</span>
                        </button>
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
          {missing > 0 && <p className="text-muted">{t.plan.missing(missing)}</p>}

          <p className="font-bold">{t.plan.eligibility}</p>

          <div className="no-print flex flex-wrap gap-3">
            <button type="button" className="btn btn-primary text-xl" onClick={() => window.print()}>
              {t.plan.print}
            </button>
            <button type="button" className="btn btn-secondary" onClick={share}>
              {t.plan.share}
            </button>
            <button type="button" className="btn btn-secondary !border-transparent" onClick={() => confirm(t.plan.confirmClear) && clear()}>
              {t.plan.clear}
            </button>
          </div>
          <p className="no-print text-base text-muted" aria-live="polite">
            {copied ? t.plan.copied : ""}
            {t.plan.shareNote}
          </p>
          <p className="no-print">
            <Link href="/updates">{t.plan.getUpdates}</Link>
          </p>
        </>
      )}
    </div>
  );
}
