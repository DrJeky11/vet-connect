/**
 * Small in-memory rate limiter (per server process). Enough to slow down
 * someone hammering a public form; not a substitute for a gateway limit.
 */
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, max: number, windowMs: number, now = Date.now()): boolean {
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 10_000) buckets.clear();
  return true;
}

export function clientKey(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0].trim() || headers.get("x-real-ip") || "local";
}
