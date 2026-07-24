import type { AgentSessionRecord, EnvironmentKind, LocalizedText } from "./index";

export interface AgentExecutionGroup {
  id: string;
  environment: EnvironmentKind;
  projectId: string;
  parentSessionId?: string;
  label: string;
  role: string;
  description: string;
  localizedDescription?: LocalizedText;
  skills: string[];
  executionCount: number;
  sessionIds: string[];
  lastObservedAt: string;
}

function normalizeIdentityPart(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-");
}

function executionGroupId(parts: string[]): string {
  let hash = 2166136261;
  for (const character of parts.join("|")) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return "agent-group-" + (hash >>> 0).toString(16).padStart(8, "0");
}

export function groupSubagentExecutions(
  sessions: AgentSessionRecord[],
  options: { preserveParent?: boolean } = {},
): AgentExecutionGroup[] {
  const preserveParent = options.preserveParent ?? true;
  const groups = new Map<string, AgentSessionRecord[]>();

  for (const session of sessions) {
    if (session.kind !== "subagent") continue;
    const key = [
      session.environment,
      session.projectId,
      preserveParent ? session.parentSessionId ?? "" : "",
      normalizeIdentityPart(session.label),
      normalizeIdentityPart(session.role),
      ...(session.skills ?? []).map(normalizeIdentityPart).sort(),
    ].join("|");
    const current = groups.get(key) ?? [];
    current.push(session);
    groups.set(key, current);
  }

  return [...groups.entries()]
    .map(([key, executions]) => {
      const latest = executions.reduce((left, right) =>
        left.observedAt >= right.observedAt ? left : right,
      );
      const first = executions[0];
      return {
        id: executionGroupId([key]),
        environment: first.environment,
        projectId: first.projectId,
        ...(preserveParent && first.parentSessionId
          ? { parentSessionId: first.parentSessionId }
          : {}),
        label: first.label,
        role: first.role,
        description: first.description || "Runs the " + (first.role || "subagent") + " role for this project.",
        ...(first.localizedDescription ? { localizedDescription: first.localizedDescription } : {}),
        skills: [...new Set(executions.flatMap((execution) => execution.skills ?? []))].sort(),
        executionCount: executions.length,
        sessionIds: executions.map((execution) => execution.id).sort(),
        lastObservedAt: latest.observedAt,
      };
    })
    .sort((left, right) =>
      right.lastObservedAt.localeCompare(left.lastObservedAt) || left.label.localeCompare(right.label),
    );
}
