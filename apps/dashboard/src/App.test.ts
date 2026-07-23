import { describe, expect, it } from "vitest";
import { deriveOverview, explainSimilarity } from "@agent-observatory/core";
import { fixture } from "./data/fixture";

describe("observatory overview", () => {
  it("derives operational metrics from the observed graph", () => {
    expect(deriveOverview(fixture)).toEqual({
      totalAssets: 11,
      healthyPercent: 64,
      disconnectedCount: 1,
      overlapCount: 1,
      financeCoveragePercent: 67,
    });
  });

  it("explains agent similarity with evidence", () => {
    const result = explainSimilarity(
      fixture,
      "agent-research",
      "agent-portfolio",
    );

    expect(result.score).toBe(56);
    expect(result.sharedTags).toEqual(["research", "finance", "citations"]);
    expect(result.sharedDependencies).toEqual(["skill-etf"]);
  });
});



