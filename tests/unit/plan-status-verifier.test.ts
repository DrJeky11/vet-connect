import { describe, expect, it } from "vitest";
import seed from "../../data/resources.json";
import { addToPlan, callScript, decodeShare, emptyPlan, encodeShare, parsePlan, removeFromPlan, toggleDone } from "@/lib/plan";
import { effectiveStatus } from "@/lib/status";
import { MemoryVerifierStore } from "@/lib/verifier";
import type { Resource } from "@/lib/schema";
import { telHref } from "@/lib/contact";

const resources = seed as Resource[];
const NOW = new Date("2026-11-05T12:00:00Z");

describe("plan", () => {
  it("adds, toggles and removes without duplicates", () => {
    let p = addToPlan(emptyPlan(), "a-b");
    p = addToPlan(p, "a-b");
    expect(p.items).toHaveLength(1);
    p = toggleDone(p, "a-b");
    expect(p.items[0].done).toBe(true);
    expect(removeFromPlan(p, "a-b").items).toHaveLength(0);
  });

  it("survives corrupt storage", () => {
    expect(parsePlan("{not json")).toEqual(emptyPlan());
    expect(parsePlan(JSON.stringify({ items: [{ id: "<script>" }, { id: "ok-id" }] })).items).toEqual([{ id: "ok-id", done: false }]);
  });

  it("share links encode only valid ids", () => {
    expect(encodeShare(["a", "b-c", "Bad Id"])).toBe("a,b-c");
    expect(decodeShare("a,b-c,a,javascript:alert(1)")).toEqual(["a", "b-c"]);
    expect(decodeShare(null)).toEqual([]);
  });

  it("call scripts never promise eligibility", () => {
    for (const r of resources) {
      for (const who of [false, true]) {
        const s = callScript(r, "spotsylvania", who).toLowerCase();
        expect(s).toContain("may be eligible");
        expect(s).not.toContain("i qualify");
      }
    }
    expect(callScript(resources[0], "spotsylvania", true)).toContain("calling for a veteran in Spotsylvania County");
  });
});

describe("status", () => {
  it("only stays verified for 90 days", () => {
    expect(effectiveStatus({ status: "verified", last_verified_at: "2026-10-01" }, NOW)).toBe("verified");
    expect(effectiveStatus({ status: "verified", last_verified_at: "2026-07-01" }, NOW)).toBe("stale");
    expect(effectiveStatus({ status: "unverified", last_verified_at: null }, NOW)).toBe("unverified");
  });
});

describe("telHref", () => {
  it("extracts dialable numbers", () => {
    expect(telHref("(540) 555-0100")).toBe("tel:5405550100");
    expect(telHref("988, then press 1")).toBe("tel:988");
    expect(telHref("Dial 2-1-1")).toBe("tel:211");
    // A note after the number must not leak into the link
    expect(telHref("866-534-5243 (866-LEGLAID)")).toBe("tel:8665345243");
    expect(telHref("1-434-480-6585 (24-hour hotline)")).toBe("tel:14344806585");
    expect(telHref("540-373-9373 (24-hour hotline); toll-free 1-877-734-7238")).toBe("tel:5403739373");
    expect(telHref(null)).toBeNull();
  });
});

describe("verifier store", () => {
  const id = "lsnv-fredericksburg";

  it("marks a listing verified with initials and date, and logs it", () => {
    const s = new MemoryVerifierStore();
    const r = s.verify(resources, id, "ab", "Called office", NOW);
    expect(r.status).toBe("verified");
    expect(r.verified_by).toBe("AB");
    expect(r.last_verified_at).toBe("2026-11-05");
    expect(s.merged(resources).find((x) => x.id === id)?.status).toBe("verified");
    const [entry] = s.log(id);
    expect(entry.action).toBe("verify");
    expect(entry.initials).toBe("AB");
    expect(entry.note).toBe("Called office");
  });

  it("requires a source note when filling contact fields", () => {
    // A listing whose phone is still empty because its sources conflict.
    const blank = "dvs-quantico-benefits-office";
    expect(resources.find((x) => x.id === blank)?.phone).toBeNull();
    const s = new MemoryVerifierStore();
    expect(() => s.edit(resources, blank, "AB", { phone: "540-555-0100" }, null, NOW)).toThrow(/came from/);
    const r = s.edit(resources, blank, "AB", { phone: "540-555-0100" }, "Phoned the office", NOW);
    expect(r.phone).toBe("540-555-0100");
    expect(s.log(blank)[0].changes).toEqual({ phone: { from: null, to: "540-555-0100" } });
  });

  it("rejects non-editable fields and bad initials", () => {
    const s = new MemoryVerifierStore();
    expect(() => s.edit(resources, id, "AB", { status: "verified" }, "x", NOW)).toThrow(/cannot be edited/);
    expect(() => s.verify(resources, id, "A", null, NOW)).toThrow(/Initials/);
    expect(() => s.verify(resources, "nope", "AB", null, NOW)).toThrow(/No listing/);
  });

  it("archives and sorts the queue never-verified first, archived last", () => {
    const s = new MemoryVerifierStore();
    s.verify(resources, id, "AB", null, NOW);
    s.setArchived(resources, "211-virginia", "AB", true, "dup", NOW);
    const q = s.queue(resources, NOW);
    expect(q.at(-1)?.id).toBe("211-virginia");
    expect(q.at(-2)?.id).toBe(id);
    expect(() => s.verify(resources, "211-virginia", "AB", null, NOW)).toThrow(/Unarchive/);
  });
});
