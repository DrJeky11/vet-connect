import { describe, expect, it } from "vitest";
import { applyFilters, filtersToParams, paramsToFilters, servesLocality } from "@/lib/filter";
import type { Resource } from "@/lib/schema";
import { resolveLocality } from "@/lib/schema";

function r(p: Partial<Resource> & { id: string }): Resource {
  return {
    name: p.id,
    organization: "Org",
    categories: ["legal"],
    description: "desc",
    eligibility_text: "Not stated by source. Call to confirm.",
    cost_type: "unknown",
    service_area: ["fredericksburg"],
    address: null,
    phone: null,
    website: null,
    hours: null,
    how_to_apply: "Call",
    languages: [],
    accessibility: [],
    source_name: "Test",
    source_url: "https://example.org",
    source_checked_at: null,
    source_notes: null,
    additional_sources: [],
    last_verified_at: null,
    verified_by: null,
    status: "unverified",
    ...p,
  };
}

const data = [
  r({ id: "ride-stafford", name: "Stafford Rides", categories: ["transportation"], service_area: ["stafford"], cost_type: "free" }),
  r({ id: "ride-spotsy", name: "Spotsy Van", categories: ["transportation"], service_area: ["spotsylvania"], languages: ["Spanish"] }),
  r({ id: "legal-all", name: "Legal Aid", categories: ["legal"], service_area: ["statewide"], cost_type: "free", accessibility: ["Wheelchair accessible"] }),
  r({ id: "dental", name: "Smile Clinic", categories: ["health"], service_area: [], cost_type: "sliding_scale", description: "Dental care" }),
  r({ id: "gone", categories: ["transportation"], status: "archived", service_area: ["stafford"] }),
];

describe("applyFilters", () => {
  it("filters by category and hides archived", () => {
    expect(applyFilters(data, { category: "transportation" }).map((x) => x.id).sort()).toEqual(["ride-spotsy", "ride-stafford"]);
  });

  it("filters by locality, keeping statewide and unstated service areas, exact matches first", () => {
    const ids = applyFilters(data, { locality: "stafford" }).map((x) => x.id);
    expect(ids[0]).toBe("ride-stafford");
    expect(ids).toContain("legal-all");
    expect(ids).toContain("dental");
    expect(ids).not.toContain("ride-spotsy");
  });

  it("filters by cost and free-only", () => {
    expect(applyFilters(data, { freeOnly: true }).map((x) => x.id).sort()).toEqual(["legal-all", "ride-stafford"]);
    expect(applyFilters(data, { cost: ["sliding_scale"] }).map((x) => x.id)).toEqual(["dental"]);
  });

  it("matches language and accessibility only when stated", () => {
    expect(applyFilters(data, { language: "spanish" }).map((x) => x.id)).toEqual(["ride-spotsy"]);
    expect(applyFilters(data, { accessibility: "wheelchair" }).map((x) => x.id)).toEqual(["legal-all"]);
  });

  it("fuzzy searches text", () => {
    expect(applyFilters(data, { q: "dental" })[0].id).toBe("dental");
    expect(applyFilters(data, { q: "stafford ride" })[0].id).toBe("ride-stafford");
  });

  it("round-trips through URL params", () => {
    const f = { category: "legal" as const, locality: "caroline" as const, freeOnly: true, cost: ["insurance" as const], language: "Spanish", accessibility: "wheelchair", q: "lawyer" };
    expect(paramsToFilters(filtersToParams(f))).toEqual(f);
  });

  it("servesLocality treats statewide and empty as all", () => {
    expect(servesLocality(data[2], "king_george")).toBe(true);
    expect(servesLocality(data[3], "caroline")).toBe(true);
    expect(servesLocality(data[0], "caroline")).toBe(false);
  });
});

describe("resolveLocality", () => {
  it("resolves ZIPs and names", () => {
    expect(resolveLocality("22401")).toBe("fredericksburg");
    expect(resolveLocality("22554")).toBe("stafford");
    expect(resolveLocality("Spotsylvania")).toBe("spotsylvania");
    expect(resolveLocality("king george")).toBe("king_george");
    expect(resolveLocality("90210")).toBeNull();
  });
});
