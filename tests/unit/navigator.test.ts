import { describe, expect, it } from "vitest";
import seed from "../../data/resources.json";
import { answer, parseSentence, sanitize } from "@/lib/navigator";
import type { Resource } from "@/lib/schema";

const resources = seed as Resource[];

describe("navigator (retrieval only)", () => {
  it("turns a sentence into filters", () => {
    expect(parseSentence("I need a ride to my dentist in Stafford")).toMatchObject({ category: "transportation", locality: "stafford" });
    expect(parseSentence("my landlord is trying to evict me, I can't afford a lawyer")).toMatchObject({ category: "legal", free_only: true });
    expect(parseSentence("help with a VA claim in Fredericksburg")).toMatchObject({ category: "benefits", locality: "fredericksburg" });
  });

  it("only cites directory IDs", () => {
    const a = answer(resources, parseSentence("I need a ride in Spotsylvania"));
    const ids = new Set(resources.map((r) => r.id));
    expect(a.resource_ids.length).toBeGreaterThan(0);
    for (const id of a.resource_ids) {
      expect(ids.has(id)).toBe(true);
      expect(a.message).toContain(`[${id}]`);
    }
  });

  it("says it has no listing instead of inventing one", () => {
    expect(answer(resources, parseSentence("what's the weather")).message).toMatch(/I don't have a listing/);
    expect(answer(resources, parseSentence("free rides with Spanish in Caroline")).message).toBe("I don't have a listing for that.");
  });

  it("drops filter values the model invents", () => {
    expect(sanitize({ category: "pets" as never, locality: "richmond" as never, free_only: "yes" as never })).toEqual({
      category: null, locality: null, free_only: false, spanish: false, wheelchair: false,
    });
  });
});
