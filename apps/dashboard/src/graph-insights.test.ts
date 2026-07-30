import { describe, expect, it } from "vitest";
import {
  calculateGraphSignals,
  countRepeatedDescriptions,
  type GraphSignalNode,
} from "./graph-insights";

const observedAt = "2026-07-30T00:00:00.000Z";

describe("calculateGraphSignals", () => {
  it("rates a strongly reused, connected node high and exposes numeric evidence", () => {
    const nodes: GraphSignalNode[] = [
      {
        id: "project-a",
        kind: "project",
        description: "Project A",
        projectId: "project-a",
      },
      {
        id: "project-b",
        kind: "project",
        description: "Project B",
        projectId: "project-b",
      },
      {
        id: "primary-a",
        kind: "primary",
        description: "Primary execution",
        projectId: "project-a",
        executionCount: 1,
        observedAt,
      },
      {
        id: "primary-b",
        kind: "primary",
        description: "Another primary execution",
        projectId: "project-b",
        executionCount: 1,
        observedAt,
      },
      {
        id: "shared-skill",
        kind: "skill",
        description: "Reused capability",
        observedUses: 12,
        observedAt: "2026-07-29T12:00:00.000Z",
      },
    ];
    const edges = [
      { source: "project-a", target: "primary-a" },
      { source: "project-b", target: "primary-b" },
      { source: "primary-a", target: "shared-skill" },
      { source: "primary-b", target: "shared-skill" },
    ];

    const signals = calculateGraphSignals(nodes, edges, observedAt);
    const skill = signals.find((signal) => signal.nodeId === "shared-skill");

    expect(skill).toMatchObject({
      kind: "skill",
      band: "high",
      connectionCount: 2,
      observedUses: 12,
      projectBreadth: 2,
    });
    expect(skill!.influenceScore).toBeGreaterThanOrEqual(70);
    expect(skill!.efficiencyProxyScore).toBeGreaterThanOrEqual(70);
    expect(skill!.recencyWeight).toBeGreaterThan(0);
    expect(Number.isFinite(skill!.influenceScore)).toBe(true);
    expect(Number.isFinite(skill!.efficiencyProxyScore)).toBe(true);
  });

  it("keeps an unused scoreable node low", () => {
    const signals = calculateGraphSignals(
      [
        {
          id: "used",
          kind: "subagent",
          projectId: "project-a",
          executionCount: 8,
          observedAt,
        },
        {
          id: "unused",
          kind: "skill",
          projectId: "project-a",
          executionCount: 0,
          observedAt: "2025-01-01T00:00:00.000Z",
        },
      ],
      [],
      observedAt,
    );

    expect(signals.find((signal) => signal.nodeId === "unused")).toMatchObject({
      influenceScore: expect.any(Number),
      efficiencyProxyScore: expect.any(Number),
      band: "low",
      efficiencyProxyBand: "low",
      observedUses: 0,
    });
  });

  it("does not return scores for environment or project nodes", () => {
    const signals = calculateGraphSignals(
      [
        { id: "environment-codex", kind: "environment" },
        { id: "project-a", kind: "project" },
        {
          id: "primary-a",
          kind: "primary",
          executionCount: 1,
          projectId: "project-a",
          observedAt,
        },
      ],
      [
        { source: "environment-codex", target: "project-a" },
        { source: "project-a", target: "primary-a" },
      ],
      observedAt,
    );

    expect(signals.map((signal) => signal.nodeId)).toEqual(["primary-a"]);
  });

  it("returns safe finite values for invalid or missing timestamps", () => {
    const signals = calculateGraphSignals(
      [
        {
          id: "invalid-time",
          kind: "subagent",
          executionCount: Number.NaN,
          observedAt: "not-a-date",
        },
        {
          id: "missing-time",
          kind: "skill",
          executionCount: Number.POSITIVE_INFINITY,
        },
      ],
      [{ source: "invalid-time", target: "missing-time" }],
      "also-not-a-date",
    );

    for (const signal of signals) {
      expect(signal.recencyWeight).toBe(0);
      expect(signal.evidence.ageHours).toBeNull();
      expect(signal.observedUses).toBe(0);
      expect(Number.isFinite(signal.influenceScore)).toBe(true);
      expect(Number.isFinite(signal.efficiencyProxyScore)).toBe(true);
      expect(Number.isNaN(signal.influenceScore)).toBe(false);
      expect(Number.isNaN(signal.efficiencyProxyScore)).toBe(false);
    }
  });
});

describe("countRepeatedDescriptions", () => {
  it("counts exact descriptions after Unicode, case, and whitespace normalization", () => {
    const counts = countRepeatedDescriptions([
      {
        id: "one",
        description: "  Review\u00a0the   API  ",
      },
      {
        id: "two",
        description: "review the api",
      },
      {
        id: "three",
        description: "ＲＥＶＩＥＷ THE API",
      },
      {
        id: "different",
        description: "Review the API.",
      },
      {
        id: "empty",
        description: " ",
      },
    ]);

    expect(counts.get("one")).toBe(3);
    expect(counts.get("two")).toBe(3);
    expect(counts.get("three")).toBe(3);
    expect(counts.has("different")).toBe(false);
    expect(counts.has("empty")).toBe(false);
  });
});
