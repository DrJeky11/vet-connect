import "server-only";
import { loadSeed } from "./seed";
import { getStore } from "./store";
import type { Resource } from "./schema";

/** All listings (seed + verifier edits), including archived ones. */
export function getAllResources(): Resource[] {
  return getStore().merged(loadSeed());
}

/** Listings shown to the public: everything except archived. */
export function getPublicResources(): Resource[] {
  return getAllResources().filter((r) => r.status !== "archived");
}

export function getResource(id: string): Resource | undefined {
  return getAllResources().find((r) => r.id === id);
}
