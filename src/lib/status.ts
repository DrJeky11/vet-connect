import { STALE_AFTER_DAYS, type Resource, type Status } from "./schema";

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysSince(date: string | null, now: Date = new Date()): number | null {
  if (!date) return null;
  const t = Date.parse(date);
  if (Number.isNaN(t)) return null;
  return Math.floor((now.getTime() - t) / DAY_MS);
}

/**
 * The status a person should see. A listing only becomes "verified" when a
 * verifier marks it so; it turns "stale" by itself once that check is older
 * than STALE_AFTER_DAYS. Code never promotes anything to verified.
 */
export function effectiveStatus(r: Pick<Resource, "status" | "last_verified_at">, now: Date = new Date()): Status {
  if (r.status === "archived") return "archived";
  if (r.status === "verified") {
    const age = daysSince(r.last_verified_at, now);
    if (age === null || age > STALE_AFTER_DAYS) return "stale";
    return "verified";
  }
  return r.status;
}

export const STATUS_LABELS: Record<Status, string> = {
  verified: "Verified",
  unverified: "Unverified",
  stale: "Stale",
  archived: "Archived",
};

export const STATUS_HELP: Record<Status, string> = {
  verified: "A person checked this listing in the last 90 days.",
  unverified: "No person has checked this listing yet. Call to confirm.",
  stale: "This listing was checked more than 90 days ago. Call to confirm.",
  archived: "This listing is no longer shown in search.",
};

/**
 * Sort key for the verifier queue: never-verified first, then oldest checks.
 * Returns days since last verification; never-verified sorts as Infinity.
 */
export function stalenessScore(r: Pick<Resource, "last_verified_at">, now: Date = new Date()): number {
  return daysSince(r.last_verified_at, now) ?? Number.POSITIVE_INFINITY;
}

export function formatDate(date: string | null): string {
  if (!date) return "Not yet verified";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}
