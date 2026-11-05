import seedJson from "../../data/resources.json";
import { CONTACT_FIELDS, ResourceSchema, type Resource } from "./schema";

export interface SeedProblem {
  id: string;
  message: string;
}

/**
 * Validate raw seed records. Returns every problem found rather than throwing on
 * the first, so the validation test can show all of them at once.
 */
export function validateSeed(raw: unknown): { records: Resource[]; problems: SeedProblem[] } {
  const problems: SeedProblem[] = [];
  const records: Resource[] = [];
  if (!Array.isArray(raw)) {
    return { records, problems: [{ id: "(root)", message: "seed must be a JSON array" }] };
  }
  const seen = new Set<string>();
  raw.forEach((item, i) => {
    const id = typeof item?.id === "string" ? item.id : `(index ${i})`;
    const parsed = ResourceSchema.safeParse(item);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        problems.push({ id, message: `${issue.path.join(".") || "(record)"}: ${issue.message}` });
      }
      return;
    }
    const r = parsed.data;
    if (seen.has(r.id)) problems.push({ id, message: "duplicate id" });
    seen.add(r.id);

    // Guardrail 5: a contact field may only be filled if the record cites a source.
    for (const f of CONTACT_FIELDS) {
      if (r[f] !== null && !r.source_url) {
        problems.push({ id, message: `${f} is filled but the record has no source_url` });
      }
    }
    // Guardrail 2: nothing in seed data is marked verified by code.
    if (r.status === "verified" || r.last_verified_at !== null || r.verified_by !== null) {
      problems.push({ id, message: "seed records must be unverified with no verification date or verifier" });
    }
    // Guardrail 3: never promise access.
    const text = `${r.description} ${r.eligibility_text} ${r.how_to_apply}`.toLowerCase();
    for (const banned of ["you qualify", "you are eligible", "guaranteed", "you will get"]) {
      if (text.includes(banned)) problems.push({ id, message: `uses promising language: "${banned}"` });
    }
    records.push(r);
  });
  return { records, problems };
}

let cached: Resource[] | null = null;

export function loadSeed(): Resource[] {
  if (cached) return cached;
  const { records, problems } = validateSeed(seedJson);
  if (problems.length) {
    throw new Error(
      "Seed data failed validation:\n" + problems.map((p) => `  ${p.id}: ${p.message}`).join("\n"),
    );
  }
  cached = records;
  return records;
}
