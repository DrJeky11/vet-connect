import "server-only";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { DatabaseSync as DatabaseSyncType } from "node:sqlite";
import { applyOverride, type ResourceOverride, VerifierStore } from "./verifier";

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

const globalForStore = globalThis as unknown as { __verifierStore?: SqliteVerifierStore };

export function getStore(): SqliteVerifierStore {
  if (!globalForStore.__verifierStore) {
    globalForStore.__verifierStore = new SqliteVerifierStore(openDatabase());
  }
  return globalForStore.__verifierStore;
}

export { applyOverride };
