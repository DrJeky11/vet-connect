import {
  CONTACT_FIELDS,
  EDITABLE_FIELDS,
  ResourceSchema,
  type EditableField,
  type LogEntry,
  type Resource,
} from "./schema";
import { effectiveStatus, stalenessScore } from "./status";

export type ResourceOverride = Partial<Resource>;

export function applyOverride(r: Resource, o: ResourceOverride | undefined): Resource {
  return o ? { ...r, ...o, id: r.id } : r;
}

export class VerifierError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export function normalizeInitials(raw: unknown): string {
  const s = typeof raw === "string" ? raw.trim().toUpperCase() : "";
  if (!/^[A-Z]{2,4}$/.test(s)) throw new VerifierError("Initials must be 2 to 4 letters.");
  return s;
}

function today(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Verifier business rules, independent of storage. Subclasses provide
 * persistence (SQLite in the app, in-memory in tests).
 */
export abstract class VerifierStore {
  protected abstract readOverrides(): Map<string, ResourceOverride>;
  protected abstract writeOverride(id: string, o: ResourceOverride): void;
  protected abstract readLog(): LogEntry[];
  protected abstract appendLog(e: Omit<LogEntry, "id">): void;
  protected transaction<T>(fn: () => T): T {
    return fn();
  }

  /** Seed records merged with verifier edits. */
  merged(seed: Resource[]): Resource[] {
    const overrides = this.readOverrides();
    return seed.map((r) => applyOverride(r, overrides.get(r.id)));
  }

  /** Verifier queue: archived last, then never-verified and oldest checks first. */
  queue(seed: Resource[], now: Date = new Date()): Resource[] {
    return this.merged(seed).sort((a, b) => {
      const aa = a.status === "archived" ? 1 : 0;
      const ba = b.status === "archived" ? 1 : 0;
      if (aa !== ba) return aa - ba;
      const d = stalenessScore(b, now) - stalenessScore(a, now);
      if (d !== 0 && !Number.isNaN(d)) return d;
      return a.name.localeCompare(b.name);
    });
  }

  log(resourceId?: string): LogEntry[] {
    const all = this.readLog();
    return resourceId ? all.filter((e) => e.resource_id === resourceId) : all;
  }

  private current(seed: Resource[], id: string): { base: Resource; override: ResourceOverride } {
    const base = seed.find((r) => r.id === id);
    if (!base) throw new VerifierError(`No listing with id "${id}".`, 404);
    return { base, override: { ...(this.readOverrides().get(id) ?? {}) } };
  }

  /** A person confirms the listing. This is the only path to "verified". */
  verify(seed: Resource[], id: string, rawInitials: unknown, note: string | null, now = new Date()): Resource {
    const initials = normalizeInitials(rawInitials);
    return this.transaction(() => {
      const { base, override } = this.current(seed, id);
      const before = applyOverride(base, override);
      if (before.status === "archived") throw new VerifierError("Unarchive this listing before verifying it.");
      const date = today(now);
      const next: ResourceOverride = { ...override, status: "verified", last_verified_at: date, verified_by: initials };
      this.writeOverride(id, next);
      this.appendLog({
        resource_id: id,
        action: "verify",
        initials,
        note: note?.trim() || null,
        changes: {
          status: { from: effectiveStatus(before, now), to: "verified" },
          last_verified_at: { from: before.last_verified_at, to: date },
        },
        at: now.toISOString(),
      });
      return applyOverride(base, next);
    });
  }

  /**
   * Edit fields. Filling a contact field requires the verifier to say where the
   * information came from, so nothing is typed in without a source.
   */
  edit(
    seed: Resource[],
    id: string,
    rawInitials: unknown,
    rawChanges: Record<string, unknown>,
    sourceNote: string | null,
    now = new Date(),
  ): Resource {
    const initials = normalizeInitials(rawInitials);
    return this.transaction(() => {
      const { base, override } = this.current(seed, id);
      const before = applyOverride(base, override);
      const changes: NonNullable<LogEntry["changes"]> = {};
      const next: ResourceOverride = { ...override };

      for (const [key, value] of Object.entries(rawChanges)) {
        if (!(EDITABLE_FIELDS as readonly string[]).includes(key)) {
          throw new VerifierError(`Field "${key}" cannot be edited.`);
        }
        const field = key as EditableField;
        let v: unknown = typeof value === "string" ? value.trim() : value;
        if (v === "") v = null;
        if (before[field] === v) continue;
        changes[field] = { from: before[field], to: v };
        (next as Record<string, unknown>)[field] = v;
      }
      if (Object.keys(changes).length === 0) throw new VerifierError("No changes to save.");

      const filledContact = CONTACT_FIELDS.some((f) => f in changes && changes[f].to !== null);
      if (filledContact && !sourceNote?.trim()) {
        throw new VerifierError(
          "Say where the new contact details came from (for example, a phone call with the office or a web page).",
        );
      }

      const candidate = applyOverride(base, next);
      const parsed = ResourceSchema.safeParse(candidate);
      if (!parsed.success) {
        throw new VerifierError(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
      }

      this.writeOverride(id, next);
      this.appendLog({
        resource_id: id,
        action: "edit",
        initials,
        note: sourceNote?.trim() || null,
        changes,
        at: now.toISOString(),
      });
      return candidate;
    });
  }

  addNote(seed: Resource[], id: string, rawInitials: unknown, note: string, now = new Date()): void {
    const initials = normalizeInitials(rawInitials);
    if (!note?.trim()) throw new VerifierError("Note cannot be empty.");
    this.current(seed, id);
    this.appendLog({ resource_id: id, action: "note", initials, note: note.trim(), changes: null, at: now.toISOString() });
  }

  setArchived(seed: Resource[], id: string, rawInitials: unknown, archived: boolean, note: string | null, now = new Date()): Resource {
    const initials = normalizeInitials(rawInitials);
    return this.transaction(() => {
      const { base, override } = this.current(seed, id);
      const before = applyOverride(base, override);
      const to = archived ? "archived" : before.last_verified_at ? "verified" : "unverified";
      if (before.status === to) throw new VerifierError(archived ? "Already archived." : "Not archived.");
      const next: ResourceOverride = { ...override, status: to };
      this.writeOverride(id, next);
      this.appendLog({
        resource_id: id,
        action: archived ? "archive" : "unarchive",
        initials,
        note: note?.trim() || null,
        changes: { status: { from: before.status, to } },
        at: now.toISOString(),
      });
      return applyOverride(base, next);
    });
  }
}

/** In-memory store, used by tests. */
export class MemoryVerifierStore extends VerifierStore {
  private overrides = new Map<string, ResourceOverride>();
  private entries: LogEntry[] = [];
  protected readOverrides() {
    return new Map(this.overrides);
  }
  protected writeOverride(id: string, o: ResourceOverride) {
    this.overrides.set(id, o);
  }
  protected readLog() {
    return [...this.entries].reverse();
  }
  protected appendLog(e: Omit<LogEntry, "id">) {
    this.entries.push({ ...e, id: this.entries.length + 1 });
  }
}
