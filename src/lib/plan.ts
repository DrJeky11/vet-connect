import { categoryLabel, localityLabel, type LocalityId, type Resource } from "./schema";

/**
 * My Plan lives only in this browser (localStorage). It stores resource IDs,
 * a done flag and an optional locality for the call script. No names or
 * personal details.
 */
export interface PlanItem {
  id: string;
  done: boolean;
}
export interface Plan {
  items: PlanItem[];
  locality: LocalityId | null;
  /** True when a caregiver or helper is calling on a veteran's behalf. */
  forSomeone: boolean;
}

export const PLAN_KEY = "vsn-plan-v1";
const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function emptyPlan(): Plan {
  return { items: [], locality: null, forSomeone: false };
}

export function parsePlan(raw: string | null): Plan {
  if (!raw) return emptyPlan();
  try {
    const p = JSON.parse(raw);
    const items = Array.isArray(p?.items)
      ? p.items
          .filter((i: unknown): i is PlanItem => typeof (i as PlanItem)?.id === "string" && ID_RE.test((i as PlanItem).id))
          .map((i: PlanItem) => ({ id: i.id, done: Boolean(i.done) }))
      : [];
    return { items, locality: typeof p?.locality === "string" ? p.locality : null, forSomeone: p?.forSomeone === true };
  } catch {
    return emptyPlan();
  }
}

export function addToPlan(plan: Plan, id: string): Plan {
  if (plan.items.some((i) => i.id === id)) return plan;
  return { ...plan, items: [...plan.items, { id, done: false }] };
}

export function removeFromPlan(plan: Plan, id: string): Plan {
  return { ...plan, items: plan.items.filter((i) => i.id !== id) };
}

export function toggleDone(plan: Plan, id: string): Plan {
  return { ...plan, items: plan.items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)) };
}

/** Share link encodes only resource IDs (and nothing else). */
export function encodeShare(ids: string[]): string {
  return ids.filter((id) => ID_RE.test(id)).join(",");
}

export function decodeShare(param: string | null | undefined): string[] {
  if (!param) return [];
  return [...new Set(param.split(",").map((s) => s.trim()).filter((s) => ID_RE.test(s)))].slice(0, 50);
}

/** A short, plain call script. It asks; it never assumes eligibility. */
export function callScript(r: Resource, locality: LocalityId | null, forSomeone = false): string {
  const where = locality ? ` in ${localityLabel(locality).replace(/^City of /, "")}` : "";
  const need = r.categories.map(categoryLabel)[0]?.toLowerCase() ?? "help";
  const who = forSomeone ? `I'm calling for a veteran${where}` : `I'm a veteran${where}`;
  const subj = forSomeone ? "they" : "I";
  return `Hi, ${who} looking for ${need}. I found ${r.name} in a directory. Can you tell me if ${subj} may be eligible, what to bring, and how to get started?`;
}

/** Spanish meaning of the English call script, shown under it in Spanish mode. */
export function callScriptMeaningEs(
  r: Resource,
  placeEs: string | null,
  needEs: string,
  forSomeone = false,
): string {
  const where = placeEs ? ` en ${placeEs}` : "";
  return forSomeone
    ? `Hola, llamo por un veterano${where} que busca ${needEs}. Encontré ${r.name} en un directorio. ¿Me puede decir si podría calificar, qué debe llevar y cómo empezar?`
    : `Hola, soy veterano${where} y busco ${needEs}. Encontré ${r.name} en un directorio. ¿Me puede decir si podría calificar, qué debo llevar y cómo empiezo?`;
}
