import { describe, expect, it } from "vitest";
import {
  buildAgentRegistry,
  buildPromotionCandidates,
  compareAgentDefinitions,
  type AgentDefinition,
} from "./agent-registry";

const agent = (id: string, projectId: string, overrides: Partial<AgentDefinition> = {}): AgentDefinition => ({
  id,
  environment: "codex",
  scope: "project",
  projectId,
  label: "Code review",
  role: "reviewer",
  description: "Reviews code changes and reports actionable findings.",
  tags: ["code", "review"],
  capabilities: ["subagent"],
  skills: ["github-review"],
  mcpServers: ["github"],
  permissions: ["read"],
  usageCount: 3,
  projectIds: [projectId],
  lastObservedAt: "2026-07-24T00:00:00.000Z",
  ...overrides,
});

describe("agent registry similarity", () => {
  it("identifies exact duplicates across projects", () => {
    const result = compareAgentDefinitions(agent("a", "project-a"), agent("b", "project-b"));
    expect(result.exactDuplicate).toBe(true);
    expect(result.level).toBe("exact");
    expect(result.score).toBe(100);
  });

  it("returns weighted evidence for highly similar agents", () => {
    const result = compareAgentDefinitions(
      agent("a", "project-a"),
      agent("b", "project-b", { label: "PR code review", tags: ["code", "review", "pull-request"] }),
    );
    expect(result.exactDuplicate).toBe(false);
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.components.find((component) => component.feature === "skills")?.matched).toEqual(["github-review"]);
  });

  it("keeps project-specialized agents distinct", () => {
    const result = compareAgentDefinitions(
      agent("a", "project-a"),
      agent("b", "project-b", {
        label: "Production deploy",
        role: "release-manager",
        tags: ["deployment", "production"],
        skills: ["aws-deploy"],
        mcpServers: ["aws"],
        permissions: ["write"],
      }),
    );
    expect(result.level).toBe("distinct");
    expect(result.score).toBeLessThan(60);
  });

  it("creates a global promotion candidate only for cross-project reuse", () => {
    const agents = [agent("a", "project-a"), agent("b", "project-b"), agent("c", "project-a")];
    const similarities = [compareAgentDefinitions(agents[0], agents[1]), compareAgentDefinitions(agents[0], agents[2])];
    const candidates = buildPromotionCandidates(agents, similarities);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].projectIds).toEqual(["project-a", "project-b"]);
    expect(candidates[0].recommendation).toBe("promote-global");
  });

  it("derives project definitions from subagents rather than primary sessions", () => {
    const registry = buildAgentRegistry({
      sessions: [
        { id: "primary", environment: "codex", projectId: "project-a", kind: "primary", label: "Primary session", role: "primary", observedAt: "2026-07-24T00:00:00.000Z" },
        { id: "child", environment: "codex", projectId: "project-a", kind: "subagent", label: "Code review", role: "reviewer", observedAt: "2026-07-24T00:00:00.000Z" },
      ],
    });
    expect(registry.projectAgents).toHaveLength(1);
    expect(registry.projectAgents[0].label).toBe("Code review");
  });


  it("normalizes Korean agent labels without losing their identity", () => {
    const registry = buildAgentRegistry({
      sessions: [
        { id: "ko-a", environment: "codex", projectId: "alpha", kind: "subagent", label: "금융 분석 에이전트", role: "시장 분석", observedAt: "2026-07-24T00:00:00.000Z" },
        { id: "ko-b", environment: "codex", projectId: "beta", kind: "subagent", label: "금융 분석 에이전트", role: "시장 분석", observedAt: "2026-07-24T00:00:00.000Z" },
      ],
    });
    expect(registry.promotionCandidates).toHaveLength(1);
    expect(registry.promotionCandidates[0].averageScore).toBe(100);
  });

  it("filters version and extension nodes from the global agent inventory", () => {
    const registry = buildAgentRegistry({
      nodes: [
        { id: "valid", kind: "agent", label: "./agents/finance-analyst.md", tags: ["finance"] },
        { id: "version", kind: "agent", label: "0.1.12 agents", tags: [] },
        { id: "extension", kind: "agent", label: ".mcp", tags: [] },
      ],
    });
    expect(registry.globalAgents.map((agent) => agent.id)).toEqual(["valid"]);
  });
});
