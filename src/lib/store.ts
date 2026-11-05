import "server-only";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { DatabaseSync as DatabaseSyncType } from "node:sqlite";
import { applyOverride, normalizeInitials, type ResourceOverride, VerifierError, VerifierStore } from "./verifier";

/**
 * SQLite-backed store for verifier edits, using Node's built-in `node:sqlite`
 * (no native build step, Node 22.13+). Seed JSON stays read-only; edits live as per-record
 * overrides plus an append-only log.
 */

function defaultPath(): string {
  if (process.env.VERIFIER_DB_PATH) return resolve(process.env.VERIFIER_DB_PATH);
  // Vercel and similar hosts only allow writes to /tmp, which resets on cold start.
  if (process.env.VERCEL) return "/tmp/verifier.db";
  return resolve(process.cwd(), ".data/verifier.db");
}

export function openDatabase(path: string = defaultPath()): DatabaseSyncType {
  // Loaded at runtime so the bundler leaves Node's built-in SQLite alone.
  const { DatabaseSync } = process.getBuiltinModule("node:sqlite") as typeof import("node:sqlite");
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`
    CREATE TABLE IF NOT EXISTS resource_overrides (
      resource_id TEXT PRIMARY KEY,
      data TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS suggestions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL,
      resource_id TEXT,
      details TEXT NOT NULL,
      source_url TEXT,
      how_known TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL,
      resolved_by TEXT,
      resolved_at TEXT,
      resolution_note TEXT
    );
    CREATE TABLE IF NOT EXISTS verification_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resource_id TEXT NOT NULL,
      action TEXT NOT NULL,
      initials TEXT NOT NULL,
      note TEXT,
      changes TEXT,
      at TEXT NOT NULL
    );
  `);
  return db;
}

export class SqliteVerifierStore extends VerifierStore {
  constructor(private db: DatabaseSyncType) {
    super();
  }

  protected readOverrides(): Map<string, ResourceOverride> {
    const rows = this.db.prepare("SELECT resource_id, data FROM resource_overrides").all() as {
      resource_id: string;
      data: string;
    }[];
    return new Map(rows.map((r) => [r.resource_id, JSON.parse(r.data) as ResourceOverride]));
  }

  protected writeOverride(id: string, o: ResourceOverride): void {
    this.db
      .prepare(
        "INSERT INTO resource_overrides (resource_id, data) VALUES (?, ?) ON CONFLICT(resource_id) DO UPDATE SET data = excluded.data",
      )
      .run(id, JSON.stringify(o));
  }

  protected readLog() {
    const rows = this.db.prepare("SELECT * FROM verification_log ORDER BY id DESC").all() as {
      id: number;
      resource_id: string;
      action: string;
      initials: string;
      note: string | null;
      changes: string | null;
      at: string;
    }[];
    return rows.map((r) => ({
      ...r,
      action: r.action as never,
      changes: r.changes ? JSON.parse(r.changes) : null,
    }));
  }

  protected appendLog(e: Omit<import("./schema").LogEntry, "id">): void {
    this.db
      .prepare("INSERT INTO verification_log (resource_id, action, initials, note, changes, at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(e.resource_id, e.action, e.initials, e.note, e.changes ? JSON.stringify(e.changes) : null, e.at);
  }

  protected transaction<T>(fn: () => T): T {
    this.db.exec("BEGIN");
    try {
      const out = fn();
      this.db.exec("COMMIT");
      return out;
    } catch (err) {
      this.db.exec("ROLLBACK");
      throw err;
    }
  }
}

export const SUGGESTION_KINDS = ["wrong_info", "closed", "new_listing", "other"] as const;
export type SuggestionKind = (typeof SUGGESTION_KINDS)[number];
export interface Suggestion {
  id: number;
  kind: SuggestionKind;
  resource_id: string | null;
  details: string;
  source_url: string | null;
  how_known: string | null;
  status: "open" | "resolved";
  created_at: string;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
}

/**
 * Reports from the public ("this phone number is wrong", "add this service").
 * They never change a listing by themselves; a verifier reads each one.
 */
export class SuggestionBox {
  constructor(private db: DatabaseSyncType) {}

  add(input: { kind: string; resource_id?: string | null; details: string; source_url?: string | null; how_known?: string | null }, now = new Date()): number {
    if (!(SUGGESTION_KINDS as readonly string[]).includes(input.kind)) throw new VerifierError("Pick what kind of report this is.");
    const details = input.details?.trim() ?? "";
    if (details.length < 5) throw new VerifierError("Tell us a little more.");
    if (details.length > 2000) throw new VerifierError("Please keep it under 2,000 characters.");
    let url: string | null = input.source_url?.trim() || null;
    if (url) {
      try {
        const u = new URL(url);
        if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error();
      } catch {
        throw new VerifierError("The web page should start with https://");
      }
    }
    const rid = input.resource_id && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(input.resource_id) ? input.resource_id : null;
    const res = this.db
      .prepare("INSERT INTO suggestions (kind, resource_id, details, source_url, how_known, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(input.kind, rid, details, url, input.how_known?.trim().slice(0, 500) || null, now.toISOString());
    return Number(res.lastInsertRowid);
  }

  list(status?: "open" | "resolved"): Suggestion[] {
    const rows = status
      ? this.db.prepare("SELECT * FROM suggestions WHERE status = ? ORDER BY id DESC").all(status)
      : this.db.prepare("SELECT * FROM suggestions ORDER BY id DESC").all();
    // node:sqlite rows have a null prototype; copy them so they can be passed to client components.
    return rows.map((r) => ({ ...r })) as unknown as Suggestion[];
  }

  resolve(id: number, rawInitials: unknown, note: string | null, now = new Date()): void {
    const initials = normalizeInitials(rawInitials);
    const res = this.db
      .prepare("UPDATE suggestions SET status = 'resolved', resolved_by = ?, resolved_at = ?, resolution_note = ? WHERE id = ? AND status = 'open'")
      .run(initials, now.toISOString(), note?.trim() || null, id);
    if (Number(res.changes) === 0) throw new VerifierError("That report is already resolved or does not exist.", 404);
  }
}

const globalForStore = globalThis as unknown as { __verifierStore?: SqliteVerifierStore; __suggestions?: SuggestionBox; __verifierDb?: DatabaseSyncType };

function db(): DatabaseSyncType {
  if (!globalForStore.__verifierDb) globalForStore.__verifierDb = openDatabase();
  return globalForStore.__verifierDb;
}

export function getStore(): SqliteVerifierStore {
  if (!globalForStore.__verifierStore) globalForStore.__verifierStore = new SqliteVerifierStore(db());
  return globalForStore.__verifierStore;
}

export function getSuggestions(): SuggestionBox {
  if (!globalForStore.__suggestions) globalForStore.__suggestions = new SuggestionBox(db());
  return globalForStore.__suggestions;
}

export { applyOverride };
