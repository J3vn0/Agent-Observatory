import type {
  AgentSessionRecord,
  EnvironmentKind,
  GraphNode,
  ObservatorySnapshot,
  ProjectRecord,
} from "@agent-observatory/core";

export type EnvironmentScope = "all" | EnvironmentKind;

export interface ObservatoryScope {
  environment: EnvironmentScope;
  projectId: string | null;
}

export function nodeEnvironment(node: GraphNode): EnvironmentKind | "other" {
  if (node.origin === "codex" || node.origin === "claude") return node.origin;
  const roots = node.metadata?.roots;
  if (Array.isArray(roots)) {
    if (roots.includes("claude")) return "claude";
    if (roots.includes("codex")) return "codex";
  }
  if (node.label.toLocaleLowerCase("en-US") === "claude") return "claude";
  if (node.label.toLocaleLowerCase("en-US") === "codex") return "codex";
  return "other";
}

export function projectsInScope(
  snapshot: ObservatorySnapshot,
  scope: ObservatoryScope,
): ProjectRecord[] {
  return (snapshot.projects ?? []).filter(
    (project) =>
      (scope.environment === "all" ||
        project.environment === scope.environment) &&
      (!scope.projectId || project.id === scope.projectId),
  );
}

export function sessionsInScope(
  snapshot: ObservatorySnapshot,
  scope: ObservatoryScope,
): AgentSessionRecord[] {
  return (snapshot.sessions ?? []).filter(
    (session) =>
      (scope.environment === "all" ||
        session.environment === scope.environment) &&
      (!scope.projectId || session.projectId === scope.projectId),
  );
}

export function nodesInScope(
  snapshot: ObservatorySnapshot,
  scope: ObservatoryScope,
): GraphNode[] {
  if (scope.environment === "all") return snapshot.nodes;
  return snapshot.nodes.filter((node) => {
    const roots = node.metadata?.roots;
    return (
      nodeEnvironment(node) === scope.environment ||
      (Array.isArray(roots) && roots.includes(scope.environment))
    );
  });
}

export function disambiguatedProjectLabel(
  project: ProjectRecord,
  projects: ProjectRecord[],
): string {
  const duplicates = projects.filter(
    (candidate) =>
      candidate.environment === project.environment &&
      candidate.label === project.label,
  );
  return duplicates.length > 1
    ? `${project.label} · ${project.id.slice(-4)}`
    : project.label;
}
