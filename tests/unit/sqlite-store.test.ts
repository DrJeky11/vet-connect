import { describe, expect, it } from "vitest";
import seed from "../../data/resources.json";
import { openDatabase, SqliteVerifierStore } from "@/lib/store";
import type { Resource } from "@/lib/schema";

describe("SQLite verifier store", () => {
  it("persists verification and log entries", () => {
    const db = openDatabase(":memory:");
    const s = new SqliteVerifierStore(db);
    const resources = seed as Resource[];
    s.verify(resources, "dvs-fredericksburg-office", "JD", "Confirmed by phone", new Date("2026-11-05T00:00:00Z"));
    const again = new SqliteVerifierStore(db);
    expect(again.merged(resources).find((r) => r.id === "dvs-fredericksburg-office")?.verified_by).toBe("JD");
    expect(again.log()[0]).toMatchObject({ action: "verify", initials: "JD", resource_id: "dvs-fredericksburg-office" });
  });

  it("rolls back a failed edit", () => {
    const s = new SqliteVerifierStore(openDatabase(":memory:"));
    expect(() => s.edit(seed as Resource[], "211-virginia", "JD", { website: "not a url" }, "x")).toThrow();
    expect(s.log()).toHaveLength(0);
  });
});
