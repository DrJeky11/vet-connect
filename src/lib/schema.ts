import { z } from "zod";

export const CATEGORIES = [
  { id: "transportation", label: "Transportation", hint: "Rides to appointments, buses, senior transport" },
  { id: "legal", label: "Legal help", hint: "Free or low-cost lawyers, landlord problems" },
  { id: "health", label: "Dental and health", hint: "Clinics, dental care, VA health care" },
  { id: "mental_health", label: "Mental health", hint: "Counseling, peer support, crisis help" },
  { id: "housing", label: "Housing", hint: "Rent help, shelter, homelessness" },
  { id: "food", label: "Food", hint: "Food pantries, SNAP" },
  { id: "benefits", label: "Benefits and claims help", hint: "VA claims, service officers (VSOs)" },
  { id: "employment", label: "Employment", hint: "Job help, training" },
  { id: "public_services", label: "Public services", hint: "Social services, family support, 211" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];
export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as [CategoryId, ...CategoryId[]];

export const LOCALITIES = [
  { id: "fredericksburg", label: "City of Fredericksburg", zips: ["22401", "22402", "22403", "22404"] },
  { id: "spotsylvania", label: "Spotsylvania County", zips: ["22407", "22408", "22551", "22553", "22534"] },
  { id: "stafford", label: "Stafford County", zips: ["22405", "22406", "22554", "22555", "22556", "22463", "22471"] },
  { id: "king_george", label: "King George County", zips: ["22485", "22448", "22481"] },
  { id: "caroline", label: "Caroline County", zips: ["22427", "22546", "22580", "22514", "22535", "22501", "22428", "22538"] },
] as const;

export type LocalityId = (typeof LOCALITIES)[number]["id"];
export const LOCALITY_IDS = LOCALITIES.map((l) => l.id) as [LocalityId, ...LocalityId[]];
/** "statewide" marks a Virginia-wide service usable from every locality. */
export const SERVICE_AREA_VALUES = [...LOCALITY_IDS, "statewide"] as const;

export const COST_TYPES = ["free", "sliding_scale", "insurance", "va_covered", "unknown"] as const;
export type CostType = (typeof COST_TYPES)[number];
export const COST_LABELS: Record<CostType, string> = {
  free: "Free",
  sliding_scale: "Sliding scale (cost based on income)",
  insurance: "Takes insurance",
  va_covered: "VA-covered",
  unknown: "Cost not stated — call to ask",
};

export const STATUSES = ["verified", "unverified", "stale", "archived"] as const;
export type Status = (typeof STATUSES)[number];

/** Days after which a verified listing is treated as stale. */
export const STALE_AFTER_DAYS = 90;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}/, "must be an ISO date");
const nullableText = z.string().trim().min(1).nullable();

export const SourceSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
});

export const ResourceSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "id must be a kebab-case slug"),
    name: z.string().min(1),
    organization: z.string().min(1),
    categories: z.array(z.enum(CATEGORY_IDS)).min(1),
    description: z.string().min(1),
    eligibility_text: z.string().min(1),
    cost_type: z.enum(COST_TYPES),
    /** Empty means the source did not state a service area. */
    service_area: z.array(z.enum(SERVICE_AREA_VALUES)),
    address: nullableText,
    phone: nullableText,
    website: z.string().url().nullable(),
    hours: nullableText,
    how_to_apply: z.string().min(1),
    languages: z.array(z.string().min(1)),
    accessibility: z.array(z.string().min(1)),
    source_name: z.string().min(1),
    source_url: z.string().url(),
    /** Date a person or script last read the source page (not a verification). */
    source_checked_at: isoDate.nullable(),
    /** Context for verifiers, e.g. conflicts between sources. */
    source_notes: z.string().nullable(),
    additional_sources: z.array(SourceSchema),
    last_verified_at: isoDate.nullable(),
    verified_by: z.string().nullable(),
    status: z.enum(STATUSES),
  })
  .strict();

export type Resource = z.infer<typeof ResourceSchema>;

/** Fields that tell a person how to reach a provider. Must never be invented. */
export const CONTACT_FIELDS = ["address", "phone", "website", "hours"] as const;
export type ContactField = (typeof CONTACT_FIELDS)[number];

/** Fields a verifier may edit from the dashboard. */
export const EDITABLE_FIELDS = [
  "name",
  "organization",
  "description",
  "eligibility_text",
  "cost_type",
  "address",
  "phone",
  "website",
  "hours",
  "how_to_apply",
  "source_url",
  "source_name",
  "source_notes",
] as const;
export type EditableField = (typeof EDITABLE_FIELDS)[number];

export const LOG_ACTIONS = ["verify", "edit", "note", "archive", "unarchive"] as const;
export type LogAction = (typeof LOG_ACTIONS)[number];

export const LogEntrySchema = z.object({
  id: z.number().int(),
  resource_id: z.string(),
  action: z.enum(LOG_ACTIONS),
  initials: z.string().min(1),
  note: z.string().nullable(),
  changes: z.record(z.string(), z.object({ from: z.unknown(), to: z.unknown() })).nullable(),
  at: z.string(),
});
export type LogEntry = z.infer<typeof LogEntrySchema>;

export function categoryLabel(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export function localityLabel(id: string): string {
  if (id === "statewide") return "Statewide (Virginia)";
  return LOCALITIES.find((l) => l.id === id)?.label ?? id;
}

/** Resolve a free-text locality or ZIP to a locality id. */
export function resolveLocality(input: string): LocalityId | null {
  const q = input.trim().toLowerCase();
  if (!q) return null;
  for (const l of LOCALITIES) {
    if ((l.zips as readonly string[]).includes(q)) return l.id;
    if (l.id === q.replace(/\s+/g, "_")) return l.id;
    const short = l.label.toLowerCase().replace(/^city of /, "").replace(/ county$/, "");
    if (q === short || q === l.label.toLowerCase() || q.startsWith(short)) return l.id;
  }
  return null;
}
