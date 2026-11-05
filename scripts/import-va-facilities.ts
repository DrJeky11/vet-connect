/**
 * Import Fredericksburg-area VA health facilities from the VA Facilities API
 * (https://developer.va.gov/explore/api/va-facilities).
 *
 *   VA_FACILITIES_API_KEY=... npm run import:va            # dry run, prints records
 *   VA_FACILITIES_API_KEY=... npm run import:va -- --write # merge into data/resources.json
 *
 * Skips cleanly when the key is absent. Every field comes from the API
 * response; anything the API leaves out stays null. Records import unverified.
 */
import { resolveLocality, type Resource } from "../src/lib/schema.ts";
import { mergeResources } from "./lib/merge.ts";

const KEY = process.env.VA_FACILITIES_API_KEY;
const BASE = process.env.VA_FACILITIES_API_BASE || "https://api.va.gov/services/va_facilities/v1";
// Center of the City of Fredericksburg; 30-mile radius covers the five localities.
const LAT = 38.3032;
const LONG = -77.4605;
const RADIUS_MILES = 30;

interface Facility {
  id: string;
  attributes: {
    name: string;
    facilityType: string;
    website?: string | null;
    address?: { physical?: { address1?: string; address2?: string; address3?: string; city?: string; state?: string; zip?: string } };
    phone?: { main?: string | null };
    hours?: Record<string, string | null>;
  };
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function formatHours(h: Facility["attributes"]["hours"]): string | null {
  if (!h) return null;
  const parts = Object.entries(h)
    .filter(([, v]) => v)
    .map(([d, v]) => `${d[0].toUpperCase()}${d.slice(1, 3)} ${v}`);
  return parts.length ? parts.join("; ") : null;
}

export function toResource(f: Facility, sourceUrl: string): Resource | null {
  const a = f.attributes;
  const p = a.address?.physical;
  const zip = p?.zip?.slice(0, 5) ?? "";
  const locality = resolveLocality(zip);
  if (!locality) return null; // outside the five localities
  const street = [p?.address1, p?.address2, p?.address3].filter(Boolean).join(", ");
  const address = street && p?.city ? `${street}, ${p.city}, ${p.state ?? ""} ${p.zip ?? ""}`.replace(/\s+/g, " ").trim() : null;
  return {
    id: `va-${slug(a.name)}`,
    name: a.name,
    organization: "U.S. Department of Veterans Affairs",
    categories: ["health"],
    description: "A VA health care location. Call to ask which services are offered here.",
    eligibility_text: "Not stated by source. VA health care enrollment rules apply. Call to confirm.",
    cost_type: "unknown",
    service_area: [locality],
    address,
    phone: a.phone?.main ?? null,
    website: a.website ?? null,
    hours: formatHours(a.hours),
    how_to_apply: "Call to ask how to apply.",
    languages: [],
    accessibility: [],
    source_name: "VA Facilities API",
    source_url: a.website || sourceUrl,
    source_checked_at: new Date().toISOString().slice(0, 10),
    source_notes: `Imported from the VA Facilities API (facility id ${f.id}).`,
    additional_sources: a.website ? [{ name: "VA Facilities API", url: sourceUrl }] : [],
    last_verified_at: null,
    verified_by: null,
    status: "unverified",
  };
}

async function main() {
  if (!KEY) {
    console.log("VA_FACILITIES_API_KEY is not set. Skipping VA Facilities import.");
    return;
  }
  const url = `${BASE}/facilities?lat=${LAT}&long=${LONG}&radius=${RADIUS_MILES}&type=health&per_page=100`;
  const res = await fetch(url, { headers: { apikey: KEY, accept: "application/json" } });
  if (!res.ok) throw new Error(`VA Facilities API returned ${res.status}: ${await res.text()}`);
  const body = (await res.json()) as { data: Facility[] };
  const records = body.data.map((f) => toResource(f, url.replace(/&per_page=\d+/, ""))).filter((r): r is Resource => r !== null);
  console.log(`Found ${body.data.length} facilities; ${records.length} inside the service area.`);
  const write = process.argv.includes("--write");
  if (!write) console.log(JSON.stringify(records, null, 2));
  const result = mergeResources(records, { write });
  console.log(write ? `Merged: ${result.added} added, ${result.updated} updated, ${result.total} total.` : "Dry run. Re-run with --write to save.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
