export type NodeKind =
  | "agent"
  | "skill"
  | "mcp-server"
  | "mcp-tool"
  | "provider"
  | "project"
  | "permission"
  | "execution"
  | "memory"
  | "workflow"
  | "tag";

export type HealthState = "healthy" | "attention" | "critical" | "unknown";
export type EdgeKind =
  | "USES"
  | "REQUIRES"
  | "PROVIDES"
  | "OVERLAPS"
  | "CONFLICTS_WITH"
  | "INSTALLED_IN"
  | "INVOKED_BY"
  | "READS_FROM"
  | "WRITES_TO";

export interface GraphNode {
  id: string;
  label: string;
  kind: NodeKind;
  health: HealthState;
  summary: string;
  tags: string[];
  source?: string;
  version?: string;
  risk?: "low" | "medium" | "high";
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  kind: EdgeKind;
  evidence?: string[];
}

export interface Finding {
  id: string;
  severity: Exclude<HealthState, "healthy" | "unknown"> | "info";
  title: string;
  detail: string;
  action: string;
}

export interface ObservatorySnapshot {
  observedAt: string;
  mode: "fixture" | "live";
  nodes: GraphNode[];
  edges: GraphEdge[];
  findings: Finding[];
}

export interface OverviewMetrics {
  totalAssets: number;
  healthyPercent: number;
  disconnectedCount: number;
  overlapCount: number;
  financeCoveragePercent: number;
}

export interface SimilarityEvidence {
  score: number;
  sharedTags: string[];
  sharedDependencies: string[];
  explanation: string;
}

const intersection = <T>(left: T[], right: T[]) =>
  left.filter((value) => right.includes(value));

const union = <T>(left: T[], right: T[]) => [...new Set([...left, ...right])];

export function explainSimilarity(
  snapshot: ObservatorySnapshot,
  leftId: string,
  rightId: string,
): SimilarityEvidence {
  const left = snapshot.nodes.find((node) => node.id === leftId);
  const right = snapshot.nodes.find((node) => node.id === rightId);

  if (!left || !right) {
    return {
      score: 0,
      sharedTags: [],
      sharedDependencies: [],
      explanation: "One or both assets are missing from the current observation.",
    };
  }

  const sharedTags = intersection(left.tags, right.tags);
  const tagUniverse = union(left.tags, right.tags);
  const dependenciesFor = (id: string) =>
    snapshot.edges
      .filter((edge) => edge.source === id && ["USES", "REQUIRES"].includes(edge.kind))
      .map((edge) => edge.target);
  const sharedDependencies = intersection(
    dependenciesFor(leftId),
    dependenciesFor(rightId),
  );

  const tagScore = tagUniverse.length ? sharedTags.length / tagUniverse.length : 0;
  const dependencyUniverse = union(
    dependenciesFor(leftId),
    dependenciesFor(rightId),
  );
  const dependencyScore = dependencyUniverse.length
    ? sharedDependencies.length / dependencyUniverse.length
    : 0;
  const score = Math.round((tagScore * 0.65 + dependencyScore * 0.35) * 100);

  return {
    score,
    sharedTags,
    sharedDependencies,
    explanation:
      score === 0
        ? "No shared tags or dependencies were observed."
        : `${sharedTags.length} shared tags and ${sharedDependencies.length} shared dependencies explain this score.`,
  };
}

export function deriveOverview(snapshot: ObservatorySnapshot): OverviewMetrics {
  const operationalNodes = snapshot.nodes.filter((node) =>
    ["agent", "skill", "mcp-server"].includes(node.kind),
  );
  const healthyCount = operationalNodes.filter(
    (node) => node.health === "healthy",
  ).length;
  const connectedIds = new Set(
    snapshot.edges.flatMap((edge) => [edge.source, edge.target]),
  );
  const disconnectedCount = operationalNodes.filter(
    (node) => !connectedIds.has(node.id),
  ).length;
  const overlapCount = snapshot.edges.filter(
    (edge) => edge.kind === "OVERLAPS",
  ).length;
  const financeCapabilities = snapshot.nodes.filter(
    (node) => node.kind === "skill" && node.tags.includes("finance"),
  );
  const activeFinanceCapabilities = financeCapabilities.filter(
    (node) => node.health === "healthy",
  );

  return {
    totalAssets: operationalNodes.length,
    healthyPercent: operationalNodes.length
      ? Math.round((healthyCount / operationalNodes.length) * 100)
      : 0,
    disconnectedCount,
    overlapCount,
    financeCoveragePercent: financeCapabilities.length
      ? Math.round(
          (activeFinanceCapabilities.length / financeCapabilities.length) * 100,
        )
      : 0,
  };
}

