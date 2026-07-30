export type GraphSignalNodeKind =
  | "environment"
  | "project"
  | "primary"
  | "subagent"
  | "skill";

export type GraphSignalBand = "low" | "medium" | "high";

type TimestampValue = string | number | Date | null | undefined;

export interface GraphSignalNode {
  id: string;
  kind: GraphSignalNodeKind;
  description?: string | null;
  executionCount?: number | null;
  observedUses?: number | null;
  observedAt?: TimestampValue;
  lastObservedAt?: TimestampValue;
  projectId?: string | null;
  projectIds?: readonly string[] | null;
}

export interface GraphSignalEdge {
  source: string;
  target: string;
}

export interface GraphSignalEvidence {
  ageHours: number | null;
  normalizedConnections: number;
  normalizedObservedUses: number;
  normalizedProjectBreadth: number;
  normalizedReuseDensity: number;
}

export interface GraphSignal {
  nodeId: string;
  kind: "primary" | "subagent" | "skill";
  influenceScore: number;
  /**
   * An observed-reuse proxy only. It is not a success rate, quality measure,
   * token-efficiency measure, or cost-efficiency measure.
   */
  efficiencyProxyScore: number;
  /** The display band for influenceScore. */
  band: GraphSignalBand;
  efficiencyProxyBand: GraphSignalBand;
  connectionCount: number;
  observedUses: number;
  projectBreadth: number;
  /** A 0..1 freshness weight relative to the supplied observation time. */
  recencyWeight: number;
  evidence: GraphSignalEvidence;
}

interface RawSignal {
  nodeId: string;
  kind: GraphSignal["kind"];
  connectionCount: number;
  observedUses: number;
  projectBreadth: number;
  ageHours: number | null;
  recencyWeight: number;
  reuseDensity: number;
}

const SCOREABLE_KINDS = new Set<GraphSignal["kind"]>([
  "primary",
  "subagent",
  "skill",
]);

const RECENCY_HALF_LIFE_HOURS = 30 * 24;

function isScoreableKind(
  kind: GraphSignalNodeKind,
): kind is GraphSignal["kind"] {
  return SCOREABLE_KINDS.has(kind as GraphSignal["kind"]);
}

function safeCount(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.floor(value);
}

function timestampMs(value: TimestampValue): number | null {
  if (value instanceof Date) {
    const milliseconds = value.getTime();
    return Number.isFinite(milliseconds) ? milliseconds : null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "string" || value.trim() === "") return null;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) ? milliseconds : null;
}

function latestNodeTimestamp(node: GraphSignalNode): number | null {
  const timestamps = [node.observedAt, node.lastObservedAt]
    .map(timestampMs)
    .filter((value): value is number => value !== null);
  return timestamps.length > 0 ? Math.max(...timestamps) : null;
}

function freshness(
  node: GraphSignalNode,
  observationTimestamp: number | null,
): { ageHours: number | null; recencyWeight: number } {
  const nodeTimestamp = latestNodeTimestamp(node);
  if (nodeTimestamp === null || observationTimestamp === null) {
    return { ageHours: null, recencyWeight: 0 };
  }

  const ageHours = Math.max(
    0,
    (observationTimestamp - nodeTimestamp) / (60 * 60 * 1_000),
  );
  const recencyWeight = Math.pow(0.5, ageHours / RECENCY_HALF_LIFE_HOURS);
  return {
    ageHours: Number.isFinite(ageHours) ? ageHours : null,
    recencyWeight: Number.isFinite(recencyWeight) ? recencyWeight : 0,
  };
}

function ownProjectIds(node: GraphSignalNode): Set<string> {
  const ids = new Set<string>();
  if (typeof node.projectId === "string" && node.projectId.trim() !== "") {
    ids.add(node.projectId);
  }
  for (const projectId of node.projectIds ?? []) {
    if (typeof projectId === "string" && projectId.trim() !== "") {
      ids.add(projectId);
    }
  }
  if (node.kind === "project") ids.add(node.id);
  return ids;
}

function ratio(value: number, maximum: number): number {
  if (
    !Number.isFinite(value) ||
    !Number.isFinite(maximum) ||
    value <= 0 ||
    maximum <= 0
  ) {
    return 0;
  }
  return Math.min(1, value / maximum);
}

function boundedScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scoreBand(score: number): GraphSignalBand {
  if (score >= 70) return "high";
  if (score >= 35) return "medium";
  return "low";
}

/**
 * Computes relative graph signals from data observable in the current scope.
 *
 * Count metrics are normalized against the largest scoreable node in `nodes`.
 * Recency is returned as evidence only and does not raise influence or reuse scores.
 * Environment and project nodes help establish graph evidence but are not
 * returned because they are not scoreable entities.
 */
export function calculateGraphSignals(
  nodes: readonly GraphSignalNode[],
  edges: readonly GraphSignalEdge[],
  observedAt: TimestampValue,
): GraphSignal[] {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const connectionCounts = new Map<string, number>();
  const projectIdsByNode = new Map(
    nodes.map((node) => [node.id, ownProjectIds(node)]),
  );

  for (const edge of edges) {
    if (edge.source === edge.target) {
      connectionCounts.set(
        edge.source,
        (connectionCounts.get(edge.source) ?? 0) + 1,
      );
    } else {
      connectionCounts.set(
        edge.source,
        (connectionCounts.get(edge.source) ?? 0) + 1,
      );
      connectionCounts.set(
        edge.target,
        (connectionCounts.get(edge.target) ?? 0) + 1,
      );
    }

    const source = nodesById.get(edge.source);
    const target = nodesById.get(edge.target);
    if (!source || !target) continue;

    const sourceProjects = projectIdsByNode.get(source.id);
    const targetProjects = projectIdsByNode.get(target.id);
    if (!sourceProjects || !targetProjects) continue;

    for (const projectId of ownProjectIds(target)) {
      sourceProjects.add(projectId);
    }
    for (const projectId of ownProjectIds(source)) {
      targetProjects.add(projectId);
    }
  }

  const observationTimestamp = timestampMs(observedAt);
  const rawSignals: RawSignal[] = nodes
    .filter(
      (node): node is GraphSignalNode & { kind: GraphSignal["kind"] } =>
        isScoreableKind(node.kind),
    )
    .map((node) => {
      const connectionCount = connectionCounts.get(node.id) ?? 0;
      const observedUses = safeCount(
        node.observedUses ?? node.executionCount,
      );
      const projectBreadth = projectIdsByNode.get(node.id)?.size ?? 0;
      const recency = freshness(node, observationTimestamp);
      return {
        nodeId: node.id,
        kind: node.kind,
        connectionCount,
        observedUses,
        projectBreadth,
        ...recency,
        reuseDensity: observedUses / Math.max(1, connectionCount),
      };
    });

  const maxima = rawSignals.reduce(
    (current, signal) => ({
      connections: Math.max(current.connections, signal.connectionCount),
      observedUses: Math.max(current.observedUses, signal.observedUses),
      projectBreadth: Math.max(
        current.projectBreadth,
        signal.projectBreadth,
      ),
      reuseDensity: Math.max(current.reuseDensity, signal.reuseDensity),
    }),
    {
      connections: 0,
      observedUses: 0,
      projectBreadth: 0,
      reuseDensity: 0,
    },
  );

  return rawSignals.map((signal) => {
    const normalizedConnections = ratio(
      signal.connectionCount,
      maxima.connections,
    );
    const normalizedObservedUses = ratio(
      signal.observedUses,
      maxima.observedUses,
    );
    const normalizedProjectBreadth = ratio(
      signal.projectBreadth,
      maxima.projectBreadth,
    );
    const normalizedReuseDensity = ratio(
      signal.reuseDensity,
      maxima.reuseDensity,
    );

    let influenceScore = boundedScore(
      100 *
        (normalizedObservedUses * 0.55 +
          normalizedConnections * 0.3 +
          normalizedProjectBreadth * 0.15),
    );
    if (signal.observedUses === 0) {
      influenceScore = Math.min(influenceScore, 34);
    }

    const efficiencyProxyScore = boundedScore(
      100 *
        (normalizedReuseDensity * 0.65 +
          normalizedObservedUses * 0.2 +
          normalizedProjectBreadth * 0.15),
    );

    return {
      nodeId: signal.nodeId,
      kind: signal.kind,
      influenceScore,
      efficiencyProxyScore,
      band: scoreBand(influenceScore),
      efficiencyProxyBand: scoreBand(efficiencyProxyScore),
      connectionCount: signal.connectionCount,
      observedUses: signal.observedUses,
      projectBreadth: signal.projectBreadth,
      recencyWeight: signal.recencyWeight,
      evidence: {
        ageHours: signal.ageHours,
        normalizedConnections,
        normalizedObservedUses,
        normalizedProjectBreadth,
        normalizedReuseDensity,
      },
    };
  });
}

export function normalizeDescription(
  description: string | null | undefined,
): string {
  if (typeof description !== "string") return "";
  return description
    .normalize("NFKC")
    .trim()
    .replace(/\s+/gu, " ")
    .toLocaleLowerCase("en-US");
}

/**
 * Returns duplicate occurrence counts keyed by node ID. A duplicate group of
 * three nodes produces `3` for each member; unique or empty descriptions are
 * omitted. The normalization remains exact after NFKC, case folding, trimming,
 * and whitespace collapsing—punctuation and wording are not fuzzily matched.
 */
export function countRepeatedDescriptions(
  nodes: readonly Pick<GraphSignalNode, "id" | "description">[],
): ReadonlyMap<string, number> {
  const nodesByDescription = new Map<string, string[]>();

  for (const node of nodes) {
    const description = normalizeDescription(node.description);
    if (!description) continue;
    const ids = nodesByDescription.get(description) ?? [];
    ids.push(node.id);
    nodesByDescription.set(description, ids);
  }

  const countsByNodeId = new Map<string, number>();
  for (const ids of nodesByDescription.values()) {
    if (ids.length < 2) continue;
    for (const id of ids) countsByNodeId.set(id, ids.length);
  }
  return countsByNodeId;
}
