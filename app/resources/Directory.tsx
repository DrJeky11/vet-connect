"use client";
import { useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CATEGORIES, COST_TYPES, LOCALITIES, type CostType, type Resource } from "@/lib/schema";
import { applyFilters, filtersToParams, paramsToFilters, type Filters } from "@/lib/filter";
import { ResourceCard } from "@/components/ResourceCard";
import { useDict } from "@/lib/i18n/client";
import { placeShort } from "@/lib/i18n";

export function Directory({ resources, now }: { resources: Resource[]; now: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const t = useDict();
  const filters = paramsToFilters(params);
  const results = useMemo(() => applyFilters(resources, filters), [resources, params]); // eslint-disable-line react-hooks/exhaustive-deps
  const nowDate = new Date(now);
  // With a locality set, also show same-topic listings elsewhere in the region whose
  // service area for that locality is not confirmed, clearly labeled.
  const nearby = useMemo(() => {
    if (!filters.locality) return [];
    const ids = new Set(results.map((r) => r.id));
    return applyFilters(resources, { ...filters, locality: null }).filter((r) => !ids.has(r.id));
  }, [resources, results, params]); // eslint-disable-line react-hooks/exhaustive-deps

  function set(patch: Partial<Filters>) {
    const p = filtersToParams({ ...filters, ...patch });
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  }

  const active: { label: string; clear: Partial<Filters> }[] = [];
  if (filters.category) active.push({ label: t.categories[filters.category].label, clear: { category: null } });
  if (filters.locality) active.push({ label: t.localities[filters.locality], clear: { locality: null } });
  if (filters.freeOnly) active.push({ label: t.intake.freeOnly, clear: { freeOnly: false } });
  if (filters.language) active.push({ label: t.directory.langChip(filters.language), clear: { language: null } });
  if (filters.accessibility) active.push({ label: t.directory.accessChip(filters.accessibility), clear: { accessibility: null } });
  filters.cost?.forEach((c) =>
    active.push({ label: t.cost[c].split(" (")[0], clear: { cost: filters.cost!.filter((x) => x !== c) } }),
  );

  return (
    <div className="grid gap-5">
      <h1 className="text-3xl font-bold">
        {filters.category ? t.categories[filters.category].label : t.directory.allServices}
        {filters.locality ? t.directory.near(placeShort(t, filters.locality)) : ""}
      </h1>
      {t.card.sourceLanguageNote && <p className="text-base text-muted">{t.card.sourceLanguageNote}</p>}

      <form role="search" className="grid gap-2" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="q" className="font-bold">
          {t.directory.searchLabel}
        </label>
        <input
          id="q"
          type="search"
          className="field"
          placeholder={t.directory.searchPlaceholder}
          defaultValue={filters.q ?? ""}
          onChange={(e) => set({ q: e.target.value || undefined })}
        />
      </form>

      <details className="no-print rounded-xl border border-line p-3" open={false}>
        <summary className="btn btn-secondary !border-transparent w-full justify-start">{t.directory.filters}</summary>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1">
            <label htmlFor="f-category" className="font-bold">{t.directory.topic}</label>
            <select
              id="f-category"
              className="field"
              value={filters.category ?? ""}
              onChange={(e) => set({ category: (e.target.value || null) as Filters["category"] })}
            >
              <option value="">{t.directory.allTopics}</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{t.categories[c.id].label}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-1">
            <label htmlFor="f-locality" className="font-bold">{t.directory.place}</label>
            <select
              id="f-locality"
              className="field"
              value={filters.locality ?? ""}
              onChange={(e) => set({ locality: (e.target.value || null) as Filters["locality"] })}
            >
              <option value="">{t.allLocalities}</option>
              {LOCALITIES.map((l) => (
                <option key={l.id} value={l.id}>{t.localities[l.id]}</option>
              ))}
            </select>
          </div>
          <fieldset className="grid gap-1">
            <legend className="font-bold">{t.directory.costLegend}</legend>
            {COST_TYPES.filter((c) => c !== "unknown").map((c) => (
              <label key={c} className="flex min-h-[44px] items-center gap-2">
                <input
                  type="checkbox"
                  className="h-6 w-6"
                  checked={filters.cost?.includes(c) || (c === "free" && !!filters.freeOnly)}
                  onChange={(e) => {
                    const cur = new Set<CostType>(filters.cost ?? []);
                    if (e.target.checked) cur.add(c);
                    else cur.delete(c);
                    set({ cost: [...cur], ...(c === "free" && !e.target.checked ? { freeOnly: false } : {}) });
                  }}
                />
                {t.cost[c]}
              </label>
            ))}
          </fieldset>
          <div className="grid content-start gap-3">
            <div className="grid gap-1">
              <label htmlFor="f-lang" className="font-bold">{t.directory.language}</label>
              <select id="f-lang" className="field" value={filters.language ?? ""} onChange={(e) => set({ language: e.target.value || null })}>
                <option value="">{t.directory.any}</option>
                <option value="Spanish">{t.directory.spanish}</option>
              </select>
            </div>
            <div className="grid gap-1">
              <label htmlFor="f-access" className="font-bold">{t.directory.accessibility}</label>
              <select id="f-access" className="field" value={filters.accessibility ?? ""} onChange={(e) => set({ accessibility: e.target.value || null })}>
                <option value="">{t.directory.any}</option>
                <option value="wheelchair">{t.directory.wheelchair}</option>
              </select>
            </div>
          </div>
        </div>
      </details>

      {active.length > 0 && (
        <div className="no-print flex flex-wrap items-center gap-2" aria-label={t.directory.activeFilters}>
          {active.map((a) => (
            <button key={a.label} type="button" className="btn btn-secondary !min-h-[44px] !py-1" onClick={() => set(a.clear)}>
              {a.label} <span aria-hidden="true">×</span>
              <span className="sr-only">{t.directory.removeFilter}</span>
            </button>
          ))}
          <Link href="/resources" className="btn btn-secondary !border-transparent">{t.directory.clearAll}</Link>
        </div>
      )}

      <p aria-live="polite" className="font-bold" data-testid="result-count">
        {t.directory.count(results.length)}
        {filters.locality ? t.directory.thatList(t.localities[filters.locality]) : ""}
      </p>

      {results.length === 0 && nearby.length === 0 && (
        <div className="rounded-xl bg-warn-bg p-4" role="status">
          <p className="font-bold">{t.directory.noneTitle}</p>
          <p className="mt-1">{t.directory.noneBody}</p>
          {(filters.language || filters.accessibility) && (
            <p className="mt-1">{t.directory.noneFacets}</p>
          )}
          <p className="mt-1">
            <a href="https://search.211virginia.org/">{t.directory.none211}</a>
          </p>
        </div>
      )}

      <ul className="grid gap-4">
        {results.map((r) => (
          <li key={r.id}>
            <ResourceCard r={r} now={nowDate} />
          </li>
        ))}
      </ul>

      {nearby.length > 0 && (
        <section aria-labelledby="nearby-h" className="grid gap-3" data-testid="nearby">
          <h2 id="nearby-h" className="text-2xl font-bold">
            {t.directory.nearbyTitle}
          </h2>
          <p>{t.directory.nearbyBody(t.localities[filters.locality!])}</p>
          <ul className="grid gap-4">
            {nearby.map((r) => (
              <li key={r.id}>
                <ResourceCard r={r} now={nowDate} headingLevel={3} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="no-print">
        <Link href="/plan" className="btn btn-primary">{t.directory.goPlan}</Link>
      </p>
    </div>
  );
}
