import Fuse from "fuse.js";
import type { CategoryId, CostType, LocalityId, Resource } from "./schema";

export interface Filters {
  q?: string;
  category?: CategoryId | null;
  locality?: LocalityId | null;
  cost?: CostType[];
  /** Shortcut from intake: free only. */
  freeOnly?: boolean;
  language?: string | null;
  /** Free-text accessibility feature, e.g. "wheelchair". */
  accessibility?: string | null;
}

/** Filter keys that map 1:1 to URL search params. */
export function filtersToParams(f: Filters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.category) p.set("category", f.category);
  if (f.locality) p.set("locality", f.locality);
  if (f.cost?.length) p.set("cost", f.cost.join(","));
  if (f.freeOnly) p.set("free", "1");
  if (f.language) p.set("language", f.language);
  if (f.accessibility) p.set("access", f.accessibility);
  return p;
}

export function paramsToFilters(p: URLSearchParams | Record<string, string | string[] | undefined>): Filters {
  const get = (k: string): string | undefined => {
    if (p instanceof URLSearchParams) return p.get(k) ?? undefined;
    const v = p[k];
    return Array.isArray(v) ? v[0] : v;
  };
  return {
    q: get("q") || undefined,
    category: (get("category") as CategoryId) || null,
    locality: (get("locality") as LocalityId) || null,
    cost: get("cost") ? (get("cost")!.split(",").filter(Boolean) as CostType[]) : [],
    freeOnly: get("free") === "1",
    language: get("language") || null,
    accessibility: get("access") || null,
  };
}

function includesCI(list: string[], needle: string): boolean {
  const n = needle.toLowerCase();
  return list.some((x) => x.toLowerCase().includes(n));
}

/** Locality match: listing serves it, is statewide, or has no stated service area. */
export function servesLocality(r: Resource, locality: LocalityId): boolean {
  return r.service_area.length === 0 || r.service_area.includes("statewide") || r.service_area.includes(locality);
}

export function applyFilters(resources: Resource[], f: Filters): Resource[] {
  let out = resources.filter((r) => r.status !== "archived");
  if (f.category) out = out.filter((r) => r.categories.includes(f.category!));
  if (f.locality) out = out.filter((r) => servesLocality(r, f.locality!));
  const costs = new Set(f.cost ?? []);
  if (f.freeOnly) costs.add("free");
  if (costs.size) out = out.filter((r) => costs.has(r.cost_type));
  // Languages and accessibility only match when the source states them.
  if (f.language) out = out.filter((r) => includesCI(r.languages, f.language!));
  if (f.accessibility) out = out.filter((r) => includesCI(r.accessibility, f.accessibility!));

  if (f.q?.trim()) {
    const fuse = new Fuse(out, {
      keys: [
        { name: "name", weight: 3 },
        { name: "organization", weight: 2 },
        { name: "description", weight: 1.5 },
        { name: "categories", weight: 1 },
        { name: "eligibility_text", weight: 0.5 },
      ],
      threshold: 0.4,
      ignoreLocation: true,
    });
    return fuse.search(f.q.trim()).map((x) => x.item);
  }
  // Exact locality matches before statewide / unstated ones, then by name.
  return out.sort((a, b) => {
    if (f.locality) {
      const da = a.service_area.includes(f.locality) ? 0 : 1;
      const db = b.service_area.includes(f.locality) ? 0 : 1;
      if (da !== db) return da - db;
    }
    return a.name.localeCompare(b.name);
  });
}

/** Languages and accessibility features that actually appear in the data. */
export function facetValues(resources: Resource[]) {
  const langs = new Set<string>();
  const access = new Set<string>();
  for (const r of resources) {
    r.languages.forEach((l) => langs.add(l));
    r.accessibility.forEach((a) => access.add(a));
  }
  return { languages: [...langs].sort(), accessibility: [...access].sort() };
}
