import { readFileSync, writeFileSync } from "node:fs";
import { ResourceSchema, type Resource } from "../../src/lib/schema.ts";

export const RESOURCES_PATH = new URL("../../data/resources.json", import.meta.url);

export function readResources(): Resource[] {
  return JSON.parse(readFileSync(RESOURCES_PATH, "utf8"));
}

/**
 * Upsert imported records into data/resources.json. Imported records always
 * arrive unverified: an import is never a verification.
 */
export function mergeResources(incoming: Resource[], { write }: { write: boolean }) {
  const existing = readResources();
  const byId = new Map(existing.map((r) => [r.id, r]));
  let added = 0;
  let updated = 0;
  for (const raw of incoming) {
    const r = ResourceSchema.parse({ ...raw, status: "unverified", last_verified_at: null, verified_by: null });
    if (byId.has(r.id)) updated++;
    else added++;
    byId.set(r.id, r);
  }
  const out = [...byId.values()];
  if (write) writeFileSync(RESOURCES_PATH, JSON.stringify(out, null, 2) + "\n");
  return { added, updated, total: out.length };
}
