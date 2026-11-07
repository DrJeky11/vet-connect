"use client";
import { useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CATEGORIES,
  COST_LABELS,
  COST_TYPES,
  LOCALITIES,
  categoryLabel,
  localityLabel,
  type CostType,
  type Resource,
} from "@/lib/schema";
import { applyFilters, filtersToParams, paramsToFilters, type Filters } from "@/lib/filter";
import { ResourceCard } from "@/components/ResourceCard";
import { CATEGORY_STYLE } from "@/lib/category-style";

export function Directory({ resources, now }: { resources: Resource[]; now: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
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
  if (filters.category) active.push({ label: categoryLabel(filters.category), clear: { category: null } });
  if (filters.locality) active.push({ label: localityLabel(filters.locality), clear: { locality: null } });
  if (filters.freeOnly) active.push({ label: "Free only", clear: { freeOnly: false } });
  if (filters.language) active.push({ label: `Language: ${filters.language}`, clear: { language: null } });
  if (filters.accessibility) active.push({ label: `Accessible: ${filters.accessibility}`, clear: { accessibility: null } });
  filters.cost?.forEach((c) =>
    active.push({ label: COST_LABELS[c].split(" (")[0], clear: { cost: filters.cost!.filter((x) => x !== c) } }),
  );

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-5">
      <h1 className="text-3xl font-bold">
        {filters.category ? categoryLabel(filters.category) : "All services"}
        {filters.locality ? ` near ${localityLabel(filters.locality).replace(/^City of /, "")}` : ""}
      </h1>

      <nav aria-label="Browse by subject" className="no-print -mx-1 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => {
          const on = filters.category === c.id;
          const s = CATEGORY_STYLE[c.id];
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={on}
              onClick={() => set({ category: on ? null : c.id })}
              className={`chip inline-flex min-h-[44px] items-center gap-1.5 rounded-full border-2 px-3 text-base font-bold ${
                on ? `chip-solid ${s.accent} border-transparent text-white` : "border-line bg-white text-ink hover:border-brand"
              }`}
            >
              <span aria-hidden="true">{s.emoji}</span>
              {c.label}
            </button>
          );
        })}
      </nav>

      <form role="search" className="grid gap-2" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="q" className="font-bold">
          Search listings
        </label>
        <input
          id="q"
          type="search"
          className="field"
          placeholder="Try: ride, lawyer, dental, food"
          defaultValue={filters.q ?? ""}
          onChange={(e) => set({ q: e.target.value || undefined })}
        />
      </form>

      <details className="no-print rounded-xl border border-line p-3" open={false}>
        <summary className="btn btn-secondary !border-transparent w-full justify-start">Filters</summary>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1">
            <label htmlFor="f-category" className="font-bold">Topic</label>
            <select
              id="f-category"
              className="field"
              value={filters.category ?? ""}
              onChange={(e) => set({ category: (e.target.value || null) as Filters["category"] })}
            >
              <option value="">All topics</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-1">
            <label htmlFor="f-locality" className="font-bold">City or county</label>
            <select
              id="f-locality"
              className="field"
              value={filters.locality ?? ""}
              onChange={(e) => set({ locality: (e.target.value || null) as Filters["locality"] })}
            >
              <option value="">All five localities</option>
              {LOCALITIES.map((l) => (
                <option key={l.id} value={l.id}>{l.label}</option>
              ))}
            </select>
          </div>
          <fieldset className="grid gap-1">
            <legend className="font-bold">Cost</legend>
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
                {COST_LABELS[c]}
              </label>
            ))}
          </fieldset>
          <div className="grid content-start gap-3">
            <div className="grid gap-1">
              <label htmlFor="f-lang" className="font-bold">Language spoken</label>
              <select id="f-lang" className="field" value={filters.language ?? ""} onChange={(e) => set({ language: e.target.value || null })}>
                <option value="">Any</option>
                <option value="Spanish">Spanish</option>
              </select>
            </div>
            <div className="grid gap-1">
              <label htmlFor="f-access" className="font-bold">Accessibility</label>
              <select id="f-access" className="field" value={filters.accessibility ?? ""} onChange={(e) => set({ accessibility: e.target.value || null })}>
                <option value="">Any</option>
                <option value="wheelchair">Wheelchair accessible</option>
              </select>
            </div>
          </div>
        </div>
      </details>

      {active.length > 0 && (
        <div className="no-print flex flex-wrap items-center gap-2" aria-label="Active filters">
          {active.map((a) => (
            <button key={a.label} type="button" className="btn btn-secondary !min-h-[44px] !py-1" onClick={() => set(a.clear)}>
              {a.label} <span aria-hidden="true">×</span>
              <span className="sr-only">(remove filter)</span>
            </button>
          ))}
          <Link href="/resources" className="btn btn-secondary !border-transparent">Clear all</Link>
        </div>
      )}

      <p aria-live="polite" className="font-bold" data-testid="result-count">
        {results.length} {results.length === 1 ? "listing" : "listings"} found
        {filters.locality ? ` that list ${localityLabel(filters.locality)}` : ""}
      </p>

      {results.length === 0 && nearby.length === 0 && (
        <div className="rounded-xl bg-warn-bg p-4" role="status">
          <p className="font-bold">No listings match all of these.</p>
          <p className="mt-1">We would rather show nothing than guess. Try fewer filters.</p>
          {(filters.language || filters.accessibility) && (
            <p className="mt-1">
              Language and accessibility only match when a source states them, and many sources do not. Try removing
              that filter and asking when you call.
            </p>
          )}
          <p className="mt-1">
            You can also search <a href="https://search.211virginia.org/">211 Virginia</a> for more options.
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
            Elsewhere in the region
          </h2>
          <p>
            These listings are for another nearby city or county. Their sources do not say they serve{" "}
            {localityLabel(filters.locality!)}. Call to ask.
          </p>
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
        <Link href="/plan" className="btn btn-primary">Go to My Plan →</Link>
      </p>
    </div>
  );
}
