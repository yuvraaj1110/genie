import { describe, it, expect } from "vitest";
import { HEADLINE_PHRASES, PRESETS, PIPELINE, EYEBROW } from "@/lib/content";

describe("content", () => {
  it("alternates headline phrases English, Hindi, English, Hindi", () => {
    expect(HEADLINE_PHRASES.length).toBe(4);
    expect(HEADLINE_PHRASES[0].lang).toBe("en");
    expect(HEADLINE_PHRASES[1].lang).toBe("hi");
    expect(HEADLINE_PHRASES[2].lang).toBe("en");
    expect(HEADLINE_PHRASES[3].lang).toBe("hi");
    for (const p of HEADLINE_PHRASES) expect(p.html).toContain('class="accent"');
  });

  it("ships 4 fintech presets, each with goal + dataPoints", () => {
    const ids = PRESETS.map((p) => p.id);
    expect(ids).toEqual(["loan", "collections", "kyc", "insurance"]);
    for (const p of PRESETS) {
      expect(p.goal.length).toBeGreaterThan(10);
      expect(p.dataPoints.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("defines a 4-node pipeline customer->agent->json->rep", () => {
    expect(PIPELINE.map((n) => n.id)).toEqual(["customer", "agent", "json", "rep"]);
  });

  it("eyebrow names the fintech vertical", () => {
    expect(EYEBROW.toLowerCase()).toContain("lending");
  });
});
