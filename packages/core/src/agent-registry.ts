export type AgentDefinitionScope = "global" | "project";
export type AgentSimilarityLevel = "exact" | "high" | "related" | "distinct";

export interface AgentDefinition {
  id: string;
  environment: string;
  scope: AgentDefinitionScope;
  projectId?: string;
  label: string;
  role: string;
  description: string;
  tags: string[];
  capabilities: string[];
  skills: string[];
  mcpServers: string[];
  permissions: string[];
  usageCount: number;
  projectIds: string[];
  lastObservedAt: string;
}

export interface AgentSimilarityComponent {
  feature: "name" | "role" | "tags" | "capabilities" | "skills" | "mcpServers" | "permissions";
  score: number;
  effectiveWeight: number;
  matched: string[];
  onlyLeft: string[];
  onlyRight: string[];
}

export interface AgentSimilarity {
  leftId: string;
  rightId: string;
  score: number;
  level: AgentSimilarityLevel;
  exactDuplicate: boolean;
  components: AgentSimilarityComponent[];
}

export interface PromotionCandidate {
  id: string;
  agentIds: string[];
  projectIds: string[];
  environments: string[];
  suggestedGlobalName: string;
  averageScore: number;
  confidence: "exact" | "high" | "review";
  recommendation: "promote-global" | "review";
  blockers: string[];
}

export interface AgentRegistry {
  globalAgents: AgentDefinition[];
  projectAgents: AgentDefinition[];
  similarities: AgentSimilarity[];
  promotionCandidates: PromotionCandidate[];
}

interface SafeSessionLike {
  id: string;
  environment: string;
  projectId: string;
  kind: "primary" | "subagent";
  label: string;
  role: string;
  description?: string;
  skills?: string[];
  observedAt: string;
}

interface SafeNodeLike {
  id: string;
  label: string;
  kind: string;
  tags: string[];
  origin?: string;
}

interface SafeEdgeLike {
  source: string;
  target: string;
  kind: string;
}

export interface AgentRegistrySnapshotLike {
  sessions?: SafeSessionLike[];
  nodes?: SafeNodeLike[];
  edges?: SafeEdgeLike[];
}

const FEATURE_WEIGHTS = {
  name: 0.24,
  role: 0.2,
  tags: 0.14,
  capabilities: 0.1,
  skills: 0.14,
  mcpServers: 0.1,
  permissions: 0.08,
} as const;

function normalize(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}+/]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

function unique(values: string[]): string[] {
  return [...new Set(values.map(normalize).filter(Boolean))].sort();
}

function words(value: string): string[] {
  return unique(value.split(/[^\p{L}\p{N}+/]+/gu));
}

function isLikelyAgentNode(node: SafeNodeLike): boolean {
  if (node.kind !== "agent") return false;
  const label = node.label.trim().toLocaleLowerCase();
  if (!label) return false;
  if (/^\d+(?:\.\d+)+(?:\s+agents?)?$/.test(label)) return false;
  if (label.startsWith(".") && !label.includes("/agents/") && !label.includes("\\agents\\")) return false;
  if (/\/agents\/|\\agents\\/.test(label)) return true;
  return /\b(agent|architect|expert|optimizer|engineer|reviewer|researcher|specialist|manager|analyst|planner|auditor|advisor)\b/.test(label);
}

function compareValues(
  feature: AgentSimilarityComponent["feature"],
  leftValues: string[],
  rightValues: string[],
): AgentSimilarityComponent | null {
  const left = unique(leftValues);
  const right = unique(rightValues);
  if (!left.length && !right.length) return null;
  const matched = left.filter((value) => right.includes(value));
  const universe = unique([...left, ...right]);
  return {
    feature,
    score: Math.round((matched.length / Math.max(universe.length, 1)) * 100),
    effectiveWeight: FEATURE_WEIGHTS[feature],
    matched,
    onlyLeft: left.filter((value) => !right.includes(value)),
    onlyRight: right.filter((value) => !left.includes(value)),
  };
}

function definitionFingerprint(agent: AgentDefinition): string {
  return JSON.stringify({
    name: words(agent.label),
    role: words(agent.role),
    tags: unique(agent.tags),
    capabilities: unique(agent.capabilities),
    skills: unique(agent.skills),
    mcpServers: unique(agent.mcpServers),
    permissions: unique(agent.permissions),
  });
}

export function compareAgentDefinitions(left: AgentDefinition, right: AgentDefinition): AgentSimilarity {
  const candidates: Array<AgentSimilarityComponent | null> = [
    compareValues("name", words(left.label), words(right.label)),
    compareValues("role", words(left.role), words(right.role)),
    compareValues("tags", left.tags, right.tags),
    compareValues("capabilities", left.capabilities, right.capabilities),
    compareValues("skills", left.skills, right.skills),
    compareValues("mcpServers", left.mcpServers, right.mcpServers),
    compareValues("permissions", left.permissions, right.permissions),
  ];
  const components = candidates.filter((component): component is AgentSimilarityComponent => Boolean(component));
  const availableWeight = components.reduce((sum, component) => sum + component.effectiveWeight, 0);
  const score = availableWeight
    ? Math.round(components.reduce((sum, component) => sum + component.score * component.effectiveWeight, 0) / availableWeight)
    : 0;
  const exactDuplicate = definitionFingerprint(left) === definitionFingerprint(right);
  const level: AgentSimilarityLevel = exactDuplicate ? "exact" : score >= 80 ? "high" : score >= 60 ? "related" : "distinct";
  return { leftId: left.id, rightId: right.id, score: exactDuplicate ? 100 : score, level, exactDuplicate, components };
}

function stableId(prefix: string, values: string[]): string {
  let hash = 2166136261;
  const input = values.join("|");
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return prefix + "-" + (hash >>> 0).toString(16).padStart(8, "0");
}

export function deriveAgentDefinitions(snapshot: AgentRegistrySnapshotLike): { globalAgents: AgentDefinition[]; projectAgents: AgentDefinition[] } {
  const grouped = new Map<string, SafeSessionLike[]>();
  for (const session of snapshot.sessions ?? []) {
    if (session.kind !== "subagent") continue;
    const key = [session.environment, session.projectId, session.kind, normalize(session.label), normalize(session.role)].join("|");
    const current = grouped.get(key) ?? [];
    current.push(session);
    grouped.set(key, current);
  }

  const projectAgents = [...grouped.entries()].map(([key, sessions]) => {
    const latest = sessions.reduce((left, right) => left.observedAt >= right.observedAt ? left : right);
    const first = sessions[0];
    return {
      id: stableId("project-agent", [key]),
      environment: first.environment,
      scope: "project" as const,
      projectId: first.projectId,
      label: first.label,
      role: first.role,
      description: first.description || "Runs the " + first.role + " role for this project.",
      tags: unique([...words(first.label), ...words(first.role), ...sessions.flatMap((session) => session.skills ?? [])]),
      capabilities: [first.kind],
      skills: unique(sessions.flatMap((session) => session.skills ?? [])),
      mcpServers: [],
      permissions: [],
      usageCount: sessions.length,
      projectIds: [first.projectId],
      lastObservedAt: latest.observedAt,
    };
  });

  const nodes = snapshot.nodes ?? [];
  const edges = snapshot.edges ?? [];
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const globalAgents = nodes.filter(isLikelyAgentNode).map((node) => {
    const dependencies = edges
      .filter((edge) => edge.source === node.id && (edge.kind === "USES" || edge.kind === "REQUIRES"))
      .map((edge) => nodesById.get(edge.target))
      .filter((target): target is SafeNodeLike => Boolean(target));
    return {
      id: node.id,
      environment: node.origin ?? "global",
      scope: "global" as const,
      label: node.label,
      role: "global-agent",
      description: "Reusable global agent definition.",
      tags: unique(node.tags),
      capabilities: ["global"],
      skills: unique(dependencies.filter((target) => target.kind === "skill").map((target) => target.label)),
      mcpServers: unique(dependencies.filter((target) => target.kind === "mcp-server").map((target) => target.label)),
      permissions: [],
      usageCount: 0,
      projectIds: [],
      lastObservedAt: "",
    };
  });
  return { globalAgents, projectAgents };
}

export function buildPromotionCandidates(agents: AgentDefinition[], similarities: AgentSimilarity[], threshold = 80): PromotionCandidate[] {
  const parent = new Map(agents.map((agent) => [agent.id, agent.id]));
  const find = (id: string): string => {
    const current = parent.get(id) ?? id;
    if (current === id) return id;
    const root = find(current);
    parent.set(id, root);
    return root;
  };
  const join = (left: string, right: string) => {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot !== rightRoot) parent.set(rightRoot, leftRoot);
  };
  for (const similarity of similarities) {
    const left = agents.find((agent) => agent.id === similarity.leftId);
    const right = agents.find((agent) => agent.id === similarity.rightId);
    if (left && right && left.projectId !== right.projectId && similarity.score >= threshold) join(left.id, right.id);
  }
  const clusters = new Map<string, AgentDefinition[]>();
  for (const agent of agents) {
    const root = find(agent.id);
    const cluster = clusters.get(root) ?? [];
    cluster.push(agent);
    clusters.set(root, cluster);
  }
  return [...clusters.values()]
    .filter((cluster) => new Set(cluster.flatMap((agent) => agent.projectIds)).size >= 2)
    .map((cluster) => {
      const agentIds = cluster.map((agent) => agent.id).sort();
      const clusterScores = similarities
        .filter((similarity) => agentIds.includes(similarity.leftId) && agentIds.includes(similarity.rightId))
        .map((similarity) => similarity.score);
      const averageScore = clusterScores.length ? Math.round(clusterScores.reduce((sum, score) => sum + score, 0) / clusterScores.length) : 0;
      const environments = unique(cluster.map((agent) => agent.environment));
      const blockers: string[] = [];
      if (environments.length > 1) blockers.push("cross-environment");
      const confidence: PromotionCandidate["confidence"] = clusterScores.every((score) => score === 100) ? "exact" : averageScore >= 90 ? "high" : "review";
      return {
        id: stableId("promotion", agentIds),
        agentIds,
        projectIds: unique(cluster.flatMap((agent) => agent.projectIds)),
        environments,
        suggestedGlobalName: cluster.slice().sort((left, right) => right.usageCount - left.usageCount)[0].label,
        averageScore,
        confidence,
        recommendation: (averageScore >= 90 && blockers.length === 0 ? "promote-global" : "review") as PromotionCandidate["recommendation"],
        blockers,
      };
    })
    .sort((left, right) => right.averageScore - left.averageScore);
}

export function buildAgentRegistry(snapshot: AgentRegistrySnapshotLike, threshold = 80): AgentRegistry {
  const { globalAgents, projectAgents } = deriveAgentDefinitions(snapshot);
  const similarities: AgentSimilarity[] = [];
  for (let leftIndex = 0; leftIndex < projectAgents.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < projectAgents.length; rightIndex += 1) {
      const left = projectAgents[leftIndex];
      const right = projectAgents[rightIndex];
      if (left.projectId === right.projectId) continue;
      const similarity = compareAgentDefinitions(left, right);
      if (similarity.score >= 60) similarities.push(similarity);
    }
  }
  similarities.sort((left, right) => right.score - left.score);
  return {
    globalAgents,
    projectAgents,
    similarities,
    promotionCandidates: buildPromotionCandidates(projectAgents, similarities, threshold),
  };
}
