import { applyFilters, type Filters } from "./filter";
import { CATEGORY_IDS, LOCALITIES, LOCALITY_IDS, type CategoryId, type LocalityId, type Resource } from "./schema";

/**
 * Stretch feature 6: conversational navigator, retrieval only.
 * A sentence becomes directory filters; the answer is always built from
 * directory entries and cites their IDs. It never writes new facts.
 */
export interface NavigatorFilters {
  category: CategoryId | null;
  locality: LocalityId | null;
  free_only: boolean;
  spanish: boolean;
  wheelchair: boolean;
}

const KEYWORDS: Record<CategoryId, string[]> = {
  transportation: ["ride", "rides", "transport", "bus", "van", "drive", "driving", "car", "get to", "transit"],
  legal: ["lawyer", "legal", "attorney", "landlord", "evict", "court", "lawsuit"],
  health: ["dentist", "dental", "teeth", "doctor", "clinic", "health", "medical", "medicine"],
  mental_health: ["counsel", "therapy", "therapist", "ptsd", "depress", "anxiety", "mental", "suicid", "crisis"],
  housing: ["housing", "rent", "homeless", "shelter", "apartment", "house"],
  food: ["food", "hungry", "pantry", "snap", "meal", "groceries"],
  benefits: ["claim", "benefit", "disability rating", "vso", "pension", "va benefits", "service officer"],
  employment: ["job", "work", "employ", "resume", "career", "hire"],
  public_services: ["social services", "family support", "national guard", "211"],
};

export function parseSentence(text: string): NavigatorFilters {
  const t = ` ${text.toLowerCase()} `;
  let category: CategoryId | null = null;
  let best = 0;
  for (const id of CATEGORY_IDS) {
    const hits = KEYWORDS[id].filter((k) => t.includes(k)).length;
    if (hits > best) {
      best = hits;
      category = id;
    }
  }
  let locality: LocalityId | null = null;
  for (const l of LOCALITIES) {
    const short = l.label.toLowerCase().replace(/^city of /, "").replace(/ county$/, "");
    if (t.includes(short) || (l.zips as readonly string[]).some((z) => t.includes(z))) {
      locality = l.id;
      // Prefer a county name over "Fredericksburg" when both appear.
      if (l.id !== "fredericksburg") break;
    }
  }
  return {
    category,
    locality,
    free_only: /\bfree\b|no cost|can't afford|cannot afford/.test(t),
    spanish: /spanish|español|espanol/.test(t),
    wheelchair: /wheelchair/.test(t),
  };
}

export function sanitize(f: Partial<NavigatorFilters>): NavigatorFilters {
  return {
    category: f.category && (CATEGORY_IDS as string[]).includes(f.category) ? f.category : null,
    locality: f.locality && (LOCALITY_IDS as string[]).includes(f.locality) ? f.locality : null,
    free_only: f.free_only === true,
    spanish: f.spanish === true,
    wheelchair: f.wheelchair === true,
  };
}

export function toFilters(n: NavigatorFilters): Filters {
  return {
    category: n.category,
    locality: n.locality,
    freeOnly: n.free_only,
    language: n.spanish ? "Spanish" : null,
    accessibility: n.wheelchair ? "wheelchair" : null,
  };
}

export interface NavigatorAnswer {
  filters: NavigatorFilters;
  resource_ids: string[];
  message: string;
}

/** Build the reply from directory entries only. */
export function answer(resources: Resource[], n: NavigatorFilters): NavigatorAnswer {
  if (!n.category) {
    return {
      filters: n,
      resource_ids: [],
      message: "I don't have a listing for that. Try naming what you need, like a ride, a lawyer, dental care or food.",
    };
  }
  const found = applyFilters(resources, toFilters(n)).slice(0, 5);
  if (found.length === 0) {
    return { filters: n, resource_ids: [], message: "I don't have a listing for that." };
  }
  return {
    filters: n,
    resource_ids: found.map((r) => r.id),
    message: `I found ${found.length} listing(s) in the directory: ${found.map((r) => `${r.name} [${r.id}]`).join("; ")}. Call to confirm you may be eligible.`,
  };
}
