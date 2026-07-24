import { describe, expect, it } from "vitest";
import {
  assessCapabilityAdoption,
  combineCapabilityEvidenceConfidence,
  compareCapabilities,
  createAgentCapabilityRelation,
  createCapabilityAdoptionPlan,
  materializeAppliedCapabilityRelation,
  projectCapabilityTokenCost,
  sanitizeCapabilityDisplayText,
  transitionCapabilityAdoptionPlan,
  type AgentCapabilityRelation,
  type CapabilityCostEnvelope,
  type CapabilityDescriptor,
} from "./capability-adoption";

const capability = (
  overrides: Partial<CapabilityDescriptor> = {},
): CapabilityDescriptor => ({
  id: "github-review",
  kind: "skill",
  label: "GitHub review",
  description: "Reviews pull requests using focused evidence.",
  tags: ["git", "review"],
  ...overrides,
});

const cost = (
  overrides: Partial<CapabilityCostEnvelope> = {},
): CapabilityCostEnvelope => ({
  contextTokens: 800,
  tokensPerCall: 1_200,
  maxCallsPerHour: 2,
  maxCallsPerDay: 8,
  loadStrategy: "lazy",
  risk: "low",
  ...overrides,
});

const relation = (
  overrides: Partial<AgentCapabilityRelation> = {},
): AgentCapabilityRelation =>
  createAgentCapabilityRelation({
    agentId: "review-agent",
    capability: capability(),
    state: "adopted",
    evidence: [{ kind: "manifest", label: "Agent manifest", confidence: 0.9 }],
    cost: cost(),
    ...overrides,
  });

describe("capability adoption display safety", () => {
  it("redacts secrets and home paths from display text", () => {
    const value =
      "Loaded C:\\Users\\alice\\.codex\\skills\\review with api_key=secret-value";
    expect(sanitizeCapabilityDisplayText(value)).toBe(
      "Loaded [redacted-path] with [redacted-secret]",
    );
  });

  it("deduplicates evidence and combines independent confidence", () => {
    const confidence = combineCapabilityEvidenceConfidence([
      { kind: "manifest", label: "Manifest", confidence: 0.6 },
      { kind: "manifest", label: "Manifest", confidence: 0.8 },
      { kind: "runtime", label: "Runtime observation", confidence: 0.5 },
    ]);
    expect(confidence).toBe(0.9);
  });

  it("normalizes relation identifiers and display-safe metadata", () => {
    const result = relation({
      agentId: "Review Agent",
      capability: capability({
        label: " Review   Skill ",
        tags: ["Review", "git", "review"],
      }),
    });
    expect(result.agentId).toBe("review-agent");
    expect(result.capability.label).toBe("Review Skill");
    expect(result.capability.tags).toEqual(["git", "review"]);
    expect(result.confidence).toBe(0.9);
  });
});

describe("capability similarity and duplicate suppression", () => {
  it("explains similarity using kind, tags, and display-safe text", () => {
    const result = compareCapabilities(
      capability(),
      capability({
        id: "github-pr-review",
        label: "GitHub PR review",
        tags: ["git", "review", "pull-request"],
      }),
    );
    expect(result.sameKind).toBe(true);
    expect(result.matchedTags).toEqual(["git", "review"]);
    expect(result.score).toBeGreaterThanOrEqual(80);
  });

  it("does not consider different capability kinds duplicates", () => {
    const result = compareCapabilities(
      capability(),
      capability({ id: "github-review-plugin", kind: "plugin" }),
    );
    expect(result.sameKind).toBe(false);
    expect(result.score).toBeLessThan(85);
  });

  it("suppresses an already adopted similar capability for the same agent", () => {
    const proposed = relation({
      state: "proposed",
      capability: capability({ id: "github-pr-review", label: "GitHub PR review" }),
    });
    const existing = relation();
    const assessment = assessCapabilityAdoption(proposed, [existing]);
    expect(assessment.decision).toBe("block");
    expect(assessment.duplicateOf).toBe(existing.id);
    expect(assessment.findings.map((finding) => finding.code)).toContain(
      "duplicate-suppressed",
    );
  });

  it("does not suppress a relation that was only observed", () => {
    const assessment = assessCapabilityAdoption(
      relation({ state: "proposed" }),
      [relation({ state: "observed" })],
    );
    expect(assessment.findings.map((finding) => finding.code)).not.toContain(
      "duplicate-suppressed",
    );
  });
});

describe("deterministic token guardrails", () => {
  it("projects eager and lazy context costs deterministically", () => {
    expect(projectCapabilityTokenCost(cost({ loadStrategy: "eager" }))).toMatchObject({
      callsPerHour: 2,
      callsPerDay: 8,
      projectedTokensPerHour: 3_200,
      projectedTokensPerDay: 10_400,
    });
    expect(projectCapabilityTokenCost(cost({ loadStrategy: "lazy" }))).toMatchObject({
      projectedTokensPerHour: 4_000,
      projectedTokensPerDay: 16_000,
    });
  });

  it("enforces context, per-call, hourly, and daily hard budgets", () => {
    const assessment = assessCapabilityAdoption(
      relation({
        state: "proposed",
        cost: cost({
          contextTokens: 9_000,
          tokensPerCall: 13_000,
          maxCallsPerHour: 4,
          maxCallsPerDay: 20,
        }),
      }),
    );
    expect(assessment.decision).toBe("block");
    expect(assessment.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        "context-hard-budget",
        "per-call-hard-budget",
        "hourly-hard-budget",
        "daily-hard-budget",
      ]),
    );
  });

  it("requires lazy loading for large capability context", () => {
    const assessment = assessCapabilityAdoption(
      relation({
        state: "proposed",
        cost: cost({ contextTokens: 2_001, loadStrategy: "eager" }),
      }),
    );
    expect(assessment.findings.map((finding) => finding.code)).toContain(
      "lazy-load-required",
    );
  });

  it("limits scheduled projections and rejects overly frequent schedules", () => {
    const proposed = relation({
      state: "proposed",
      capability: capability({ id: "daily-review", kind: "schedule" }),
      cost: cost({
        scheduleIntervalMinutes: 5,
        maxCallsPerHour: 100,
        maxCallsPerDay: 100,
      }),
    });
    const assessment = assessCapabilityAdoption(proposed);
    expect(assessment.projection.callsPerHour).toBe(12);
    expect(assessment.projection.callsPerDay).toBe(100);
    expect(assessment.findings.map((finding) => finding.code)).toContain(
      "schedule-minimum-interval",
    );
  });

  it("requires an explicit interval for schedule capabilities", () => {
    const assessment = assessCapabilityAdoption(
      relation({
        state: "proposed",
        capability: capability({ kind: "schedule" }),
      }),
    );
    expect(assessment.findings.map((finding) => finding.code)).toContain(
      "schedule-interval-required",
    );
  });

  it("keeps high-risk capabilities in human review", () => {
    const assessment = assessCapabilityAdoption(
      relation({ state: "proposed", cost: cost({ risk: "high" }) }),
    );
    expect(assessment.decision).toBe("review");
    expect(assessment.findings).toContainEqual(
      expect.objectContaining({ code: "high-risk-review", severity: "warning" }),
    );
  });
});

describe("capability application plans", () => {
  it("creates a ready display-safe plan for an allowed adoption", () => {
    const plan = createCapabilityAdoptionPlan({
      agentId: "Review Agent",
      capability: capability(),
      evidence: [{ kind: "user", label: "User selection", confidence: 1 }],
      cost: cost(),
    });
    expect(plan.state).toBe("ready");
    expect(plan.assessment.decision).toBe("allow");
    expect(plan.proposedRelation.state).toBe("proposed");
  });

  it("creates a blocked plan when a hard policy fails", () => {
    const plan = createCapabilityAdoptionPlan({
      agentId: "review-agent",
      capability: capability(),
      evidence: [],
      cost: cost({ tokensPerCall: 12_001 }),
    });
    expect(plan.state).toBe("blocked");
  });

  it("allows only approval, application, and rollback in order", () => {
    const ready = createCapabilityAdoptionPlan({
      agentId: "review-agent",
      capability: capability(),
      evidence: [],
      cost: cost(),
    });
    const invalid = transitionCapabilityAdoptionPlan(ready, "applied");
    expect(invalid.ok).toBe(false);
    const approved = transitionCapabilityAdoptionPlan(ready, "approved");
    const applied = transitionCapabilityAdoptionPlan(approved.plan, "applied");
    const adopted = materializeAppliedCapabilityRelation(applied.plan);
    const rolledBack = transitionCapabilityAdoptionPlan(applied.plan, "rolled-back");
    expect(approved.ok).toBe(true);
    expect(applied.ok).toBe(true);
    expect(adopted?.state).toBe("adopted");
    expect(rolledBack.ok).toBe(true);
  });
});
