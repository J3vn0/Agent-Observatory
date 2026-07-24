import { describe, expect, it } from "vitest";
import { groupSubagentExecutions } from "./agent-executions";
import type { AgentSessionRecord } from "./index";

const subagent = (overrides: Partial<AgentSessionRecord> = {}): AgentSessionRecord => ({
  id: "session-a",
  environment: "claude",
  projectId: "project-a",
  kind: "subagent",
  parentSessionId: "parent-a",
  label: "Deep Research",
  role: "deep-research",
  description: "Researches multiple sources and synthesizes evidence.",
  localizedDescription: { en: "Researches multiple sources.", ko: "여러 출처를 조사합니다." },
  skills: ["deep-research"],
  observedAt: "2026-07-25T00:00:00.000Z",
  source: "claude-subagent-meta",
  ...overrides,
});

describe("groupSubagentExecutions", () => {
  it("collapses repeated executions with the same role and parent", () => {
    const groups = groupSubagentExecutions([
      subagent(),
      subagent({ id: "session-b", observedAt: "2026-07-25T01:00:00.000Z" }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].executionCount).toBe(2);
    expect(groups[0].lastObservedAt).toBe("2026-07-25T01:00:00.000Z");
  });

  it("keeps different roles and parents separate when requested", () => {
    const groups = groupSubagentExecutions([
      subagent(),
      subagent({ id: "session-b", role: "code-review", label: "Code Review", skills: ["code-review"] }),
      subagent({ id: "session-c", parentSessionId: "parent-b" }),
    ]);
    expect(groups).toHaveLength(3);
  });

  it("can group definitions across parent executions", () => {
    const groups = groupSubagentExecutions([
      subagent(),
      subagent({ id: "session-b", parentSessionId: "parent-b" }),
    ], { preserveParent: false });
    expect(groups).toHaveLength(1);
    expect(groups[0].parentSessionId).toBeUndefined();
  });
});
