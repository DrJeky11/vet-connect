/**
 * Bulk-load listings from a spreadsheet exported as CSV.
 *
 *   npm run import:csv -- path/to/listings.csv          # dry run: validate only
 *   npm run import:csv -- path/to/listings.csv --write  # merge into data/resources.json
 *
 * Columns match the fields in data/templates/resources-template.csv. List
 * fields (categories, service_area, languages, accessibility) use ";" between
 * values. Empty cells become null. Every row must have source_name and
 * source_url. Imported rows are always unverified.
 */
import { readFileSync } from "node:fs";
import { CONTACT_FIELDS, ResourceSchema, type Resource } from "../src/lib/schema.ts";
import { parseCsv } from "./lib/csv.ts";
import { mergeResources } from "./lib/merge.ts";

export function rowToResource(row: Record<string, string>): { record?: Resource; errors: string[] } {
  const errors: string[] = [];
  const nul = (v: string | undefined) => (v && v.trim() ? v.trim() : null);
  const list = (v: string | undefined) => (v ? v.split(";").map((s) => s.trim()).filter(Boolean) : []);

  if (!nul(row.source_url)) errors.push("source_url is required");
  for (const f of CONTACT_FIELDS) {
    if (nul(row[f]) && !nul(row.source_url)) errors.push(`${f} is filled but there is no source_url`);
  }
  const candidate = {
    id: row.id,
    name: row.name,
    organization: row.organization || row.name,
    categories: list(row.categories),
    description: row.description,
    eligibility_text: nul(row.eligibility_text) ?? "Not stated by source. Call to confirm.",
    cost_type: nul(row.cost_type) ?? "unknown",
    service_area: list(row.service_area),
    address: nul(row.address),
    phone: nul(row.phone),
    website: nul(row.website),
    hours: nul(row.hours),
    how_to_apply: nul(row.how_to_apply) ?? "Call to ask how to apply.",
    languages: list(row.languages),
    accessibility: list(row.accessibility),
    source_name: row.source_name,
    source_url: row.source_url,
    source_checked_at: nul(row.source_checked_at),
    source_notes: nul(row.source_notes),
    additional_sources: [],
    last_verified_at: null,
    verified_by: null,
    status: "unverified",
  };
  const parsed = ResourceSchema.safeParse(candidate);
  if (!parsed.success) errors.push(...parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`));
  return errors.length ? { errors } : { record: parsed.data!, errors };
}

function main() {
  const file = process.argv.slice(2).find((a) => !a.startsWith("--"));
  if (!file) {
    console.error("Usage: npm run import:csv -- <file.csv> [--write]");
    process.exit(2);
  }
  const rows = parseCsv(readFileSync(file, "utf8"));
  const good: Resource[] = [];
  let bad = 0;
  rows.forEach((row, i) => {
    const { record, errors } = rowToResource(row);
    if (record) good.push(record);
    else {
      bad++;
      console.error(`Row ${i + 2} (${row.id || "no id"}):\n  - ${errors.join("\n  - ")}`);
    }
  });
  console.log(`${good.length} valid row(s), ${bad} rejected.`);
  if (bad) {
    console.error("Fix the rejected rows and run again. Nothing was written.");
    process.exit(1);
  }
  const write = process.argv.includes("--write");
  const result = mergeResources(good, { write });
  console.log(write ? `Merged: ${result.added} added, ${result.updated} updated, ${result.total} total.` : "Dry run. Re-run with --write to save.");
}

if (import.meta.url === `file://${process.argv[1]}`) main();
