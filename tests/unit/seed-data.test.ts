import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import seed from "../../data/resources.json";
import log from "../../data/verification_log.json";
import { validateSeed } from "@/lib/seed";
import { CONTACT_FIELDS } from "@/lib/schema";

/**
 * This test is the build gate for guardrails 1, 2, 3 and 5. `npm test` (and
 * therefore CI) fails if any seed record breaks them.
 */
describe("seed data", () => {
  const { records, problems } = validateSeed(seed);

  it("passes schema and guardrail validation", () => {
    expect(problems, problems.map((p) => `${p.id}: ${p.message}`).join("\n")).toEqual([]);
    expect(records.length).toBe((seed as unknown[]).length);
  });

  it("cites a source on every record", () => {
    for (const r of records) {
      expect(r.source_url, r.id).toMatch(/^https:\/\//);
      expect(r.source_name.length, r.id).toBeGreaterThan(0);
    }
  });

  it("never fills a contact field without a source", () => {
    for (const r of records) {
      for (const f of CONTACT_FIELDS) {
        if (r[f] !== null) expect(r.source_url, `${r.id}.${f}`).toBeTruthy();
      }
    }
  });

  it("marks nothing verified in seed data", () => {
    for (const r of records) {
      expect(r.status).toBe("unverified");
      expect(r.last_verified_at).toBeNull();
      expect(r.verified_by).toBeNull();
    }
    expect(log).toEqual([]);
  });

  it("does not store personal fields", () => {
    const raw = readFileSync(new URL("../../data/resources.json", import.meta.url), "utf8").toLowerCase();
    for (const banned of ["service_number", "ssn", "discharge", "dob"]) expect(raw).not.toContain(`"${banned}"`);
  });
});

describe("validateSeed catches bad records", () => {
  const good = (seed as Record<string, unknown>[])[0];

  it("rejects a contact field when the record has no source", () => {
    const bad = { ...good, phone: "540-555-0100", source_url: "" };
    const { problems } = validateSeed([bad]);
    expect(problems.length).toBeGreaterThan(0);
  });

  it("rejects a record marked verified by code", () => {
    const { problems } = validateSeed([{ ...good, status: "verified", last_verified_at: "2026-01-01", verified_by: "BOT" }]);
    expect(problems.some((p) => p.message.includes("unverified"))).toBe(true);
  });

  it("rejects promising language", () => {
    const { problems } = validateSeed([{ ...good, description: "You qualify for free rides." }]);
    expect(problems.some((p) => p.message.includes("you qualify"))).toBe(true);
  });

  it("rejects unknown fields and duplicate ids", () => {
    expect(validateSeed([{ ...good, ssn: "x" }]).problems.length).toBeGreaterThan(0);
    expect(validateSeed([good, good]).problems.some((p) => p.message === "duplicate id")).toBe(true);
  });
});
