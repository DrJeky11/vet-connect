"use server";
import { headers } from "next/headers";
import { getSuggestions } from "@/lib/store";
import { VerifierError } from "@/lib/verifier";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { getDict } from "@/lib/i18n/server";

import type { FormValues } from "@/lib/form-values";

export type SuggestState = { status: "idle" } | { status: "done" } | { status: "error"; message: string; values?: FormValues };

export async function suggest(_prev: SuggestState, f: FormData): Promise<SuggestState> {
  const t = await getDict();
  if (!rateLimit(`suggest:${clientKey(await headers())}`, 10, 60 * 60 * 1000)) return { status: "error", message: t.suggest.tooMany };
  const get = (k: string) => (typeof f.get(k) === "string" ? (f.get(k) as string) : "");
  const values: FormValues = Object.fromEntries(["kind", "listing", "details", "source_url", "how_known"].map((k) => [k, [get(k)]]));
  try {
    getSuggestions().add({
      kind: get("kind"),
      resource_id: get("listing") || null,
      details: get("details"),
      source_url: get("source_url") || null,
      how_known: get("how_known") || null,
    });
    return { status: "done" };
  } catch (e) {
    return { status: "error", message: e instanceof VerifierError ? e.message : t.updates.errGeneric, values };
  }
}
