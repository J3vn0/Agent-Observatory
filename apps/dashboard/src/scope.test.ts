import { describe, expect, it } from "vitest";
import type { ObservatorySnapshot } from "@agent-observatory/core";
import {
  disambiguatedProjectLabel,
  nodesInScope,
  projectsInScope,
  sessionsInScope,
} from "./scope";

const snapshot = {
  observedAt: "2026-07-23T00:00:00.000Z",
  mode: "live",
  findings: [],
  edges: [],
  nodes: [
    {
      id: "codex-skill",
      label: "Codex skill",
      kind: "skill",
      health: "healthy",
      summary: "Codex",
      tags: [],
      origin: "codex",
    },
    {
      id: "shared-skill",
      label: "Shared skill",
      kind: "skill",
      health: "healthy",
      summary: "Shared",
      tags: [],
      origin: "config",
      metadata: { roots: ["codex", "claude"] },
    },
  ],
  projects: [
    {
      id: "project-codex-0001",
      environment: "codex",
      label: "sample",
      pathLabel: "sample",
      sessionCount: 1,
      subagentCount: 0,
      lastObservedAt: "2026-07-23T00:00:00.000Z",
    },
    {
      id: "project-codex-0002",
      environment: "codex",
      label: "sample",
      pathLabel: "sample",
      sessionCount: 1,
      subagentCount: 1,
      lastObservedAt: "2026-07-23T00:00:00.000Z",
    },
    {
      id: "project-claude-0003",
      environment: "claude",
      label: "other",
      pathLabel: "other",
      sessionCount: 1,
      subagentCount: 1,
      lastObservedAt: "2026-07-23T00:00:00.000Z",
    },
  ],
  sessions: [
    {
      id: "session-1",
      environment: "codex",
      projectId: "project-codex-0001",
      kind: "primary",
      label: "Primary",
      role: "primary",
      observedAt: "2026-07-23T00:00:00.000Z",
      source: "test",
    },
    {
      id: "session-2",
      environment: "claude",
      projectId: "project-claude-0003",
      kind: "subagent",
      label: "Child",
      role: "reviewer",
      observedAt: "2026-07-23T00:00:00.000Z",
      source: "test",
    },
  ],
} satisfies ObservatorySnapshot;

describe("observatory scope", () => {
  it("filters projects and sessions by environment and project", () => {
    expect(
      projectsInScope(snapshot, { environment: "codex", projectId: null }),
    ).toHaveLength(2);
    expect(
      sessionsInScope(snapshot, {
        environment: "claude",
        projectId: "project-claude-0003",
      }),
    ).toHaveLength(1);
  });

  it("keeps shared assets visible in each environment", () => {
    expect(
      nodesInScope(snapshot, { environment: "claude", projectId: null }).map(
        (node) => node.id,
      ),
    ).toEqual(["shared-skill"]);
  });

  it("disambiguates duplicate project labels", () => {
    expect(
      disambiguatedProjectLabel(snapshot.projects![0], snapshot.projects!),
    ).toContain("0001");
  });
});
