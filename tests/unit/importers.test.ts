import { describe, expect, it } from "vitest";
import { parseCsv } from "../../scripts/lib/csv.ts";
import { rowToResource } from "../../scripts/import-csv.ts";
import { toResource } from "../../scripts/import-va-facilities.ts";

describe("CSV importer", () => {
  it("parses quotes, commas and CRLF", () => {
    const rows = parseCsv('id,name\r\n"a-b","Smith, ""Jr"""\r\n\r\n');
    expect(rows).toEqual([{ id: "a-b", name: 'Smith, "Jr"' }]);
  });

  const base = {
    id: "test-pantry",
    name: "Test Pantry",
    categories: "food",
    description: "Food.",
    service_area: "stafford;caroline",
    source_name: "Example",
    source_url: "https://example.org/x",
  };

  it("turns a row into an unverified record with nulls for blanks", () => {
    const { record, errors } = rowToResource({ ...base, phone: "", status: "verified" } as Record<string, string>);
    expect(errors).toEqual([]);
    expect(record?.status).toBe("unverified");
    expect(record?.phone).toBeNull();
    expect(record?.service_area).toEqual(["stafford", "caroline"]);
  });

  it("rejects contact details without a source", () => {
    const { errors } = rowToResource({ ...base, source_url: "", phone: "540-555-0100" });
    expect(errors.join(" ")).toMatch(/phone is filled but there is no source_url/);
  });
});

describe("VA Facilities mapper", () => {
  const facility = {
    id: "vha_000",
    attributes: {
      name: "Example VA Clinic",
      facilityType: "va_health_facility",
      website: null,
      address: { physical: { address1: "1 Example Way", city: "Fredericksburg", state: "VA", zip: "22408-1234" } },
      phone: { main: "540-555-0100" },
      hours: { monday: "800AM-430PM", sunday: null },
    },
  };

  it("maps only what the API states and keeps it unverified", () => {
    const r = toResource(facility, "https://api.va.gov/x")!;
    expect(r.service_area).toEqual(["spotsylvania"]);
    expect(r.phone).toBe("540-555-0100");
    expect(r.website).toBeNull();
    expect(r.hours).toBe("Mon 800AM-430PM");
    expect(r.status).toBe("unverified");
    expect(r.source_url).toBe("https://api.va.gov/x");
  });

  it("drops facilities outside the five localities", () => {
    const far = { ...facility, attributes: { ...facility.attributes, address: { physical: { zip: "23219" } } } };
    expect(toResource(far, "https://api.va.gov/x")).toBeNull();
  });
});
