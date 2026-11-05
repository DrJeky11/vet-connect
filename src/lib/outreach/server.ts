import "server-only";
import { resolve } from "node:path";
import { readConfig, type OutreachConfig } from "./config";
import { deriveKeys } from "./crypto";
import { providerFor, type MessagingProvider } from "./providers";
import { openOutreachDb, OutreachStore } from "./store";

function dbPath(): string {
  if (process.env.OUTREACH_DB_PATH) return resolve(process.env.OUTREACH_DB_PATH);
  if (process.env.VERCEL) return "/tmp/outreach.db";
  return resolve(process.cwd(), ".data/outreach.db");
}

const g = globalThis as unknown as { __outreachStore?: OutreachStore };

export function getOutreach(): { store: OutreachStore; cfg: OutreachConfig; provider: MessagingProvider } {
  if (!g.__outreachStore) g.__outreachStore = new OutreachStore(openOutreachDb(dbPath()), deriveKeys());
  const cfg = readConfig();
  return { store: g.__outreachStore, cfg, provider: providerFor(cfg) };
}
