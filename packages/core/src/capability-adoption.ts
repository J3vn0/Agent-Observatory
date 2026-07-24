export type CapabilityKind = "skill" | "plugin" | "hook" | "mcp" | "schedule";
export type CapabilityRelationState = "observed" | "proposed" | "adopted" | "in-use" | "disabled";
export type CapabilityEvidenceKind = "manifest" | "configuration" | "runtime" | "user" | "inference";
export type CapabilityRiskLevel = "low" | "medium" | "high";
export type CapabilityLoadStrategy = "eager" | "lazy";
export type CapabilityPlanState = "draft" | "ready" | "blocked" | "approved" | "applied" | "rolled-back";

export interface CapabilityDescriptor {
  id: string;
  kind: CapabilityKind;
  label: string;
  description: string;
  tags: string[];
}

export interface CapabilityEvidence {
  kind: CapabilityEvidenceKind;
  label: string;
  confidence: number;
  observedAt?: string;
}

export interface CapabilityCostEnvelope {
  contextTokens: number;
  tokensPerCall: number;
  maxCallsPerHour: number;
  maxCallsPerDay: number;
  scheduleIntervalMinutes?: number;
  loadStrategy: CapabilityLoadStrategy;
  risk: CapabilityRiskLevel;
}

export interface CapabilityTokenProjection {
  callsPerHour: number;
  callsPerDay: number;
  contextTokensPerActivation: number;
  projectedTokensPerHour: number;
  projectedTokensPerDay: number;
}

export interface CapabilityAdoptionPolicy {
  maxContextTokens: number;
  maxTokensPerCall: number;
  maxTokensPerHour: number;
  maxTokensPerDay: number;
  duplicateSimilarityThreshold: number;
  lazyLoadThresholdTokens: number;
  minimumScheduleIntervalMinutes: number;
}

export interface CapabilitySimilarity {
  score: number;
  sameKind: boolean;
  matchedTags: string[];
  explanation: string;
}

export interface AgentCapabilityRelation {
  id: string;
  agentId: string;
  capability: CapabilityDescriptor;
  state: CapabilityRelationState;
  evidence: CapabilityEvidence[];
  confidence: number;
  cost: CapabilityCostEnvelope;
  similarity?: CapabilitySimilarity;
}

export type CapabilityPolicyCode =
  | "context-hard-budget"
  | "per-call-hard-budget"
  | "hourly-hard-budget"
  | "daily-hard-budget"
  | "duplicate-suppressed"
  | "lazy-load-required"
  | "schedule-interval-required"
  | "schedule-minimum-interval"
  | "high-risk-review";

export interface CapabilityPolicyFinding {
  code: CapabilityPolicyCode;
  severity: "warning" | "blocking";
  message: string;
}

export interface CapabilityAdoptionAssessment {
  decision: "allow" | "review" | "block";
  projection: CapabilityTokenProjection;
  findings: CapabilityPolicyFinding[];
  duplicateOf?: string;
}

export interface CapabilityAdoptionPlan {
  id: string;
  state: CapabilityPlanState;
  proposedRelation: AgentCapabilityRelation;
  assessment: CapabilityAdoptionAssessment;
}

export interface CreateCapabilityAdoptionPlanInput {
  agentId: string;
  capability: CapabilityDescriptor;
  evidence: CapabilityEvidence[];
  cost: CapabilityCostEnvelope;
  existingRelations?: AgentCapabilityRelation[];
  policy?: Partial<CapabilityAdoptionPolicy>;
}

export interface CapabilityPlanTransition {
  ok: boolean;
  plan: CapabilityAdoptionPlan;
  reason?: string;
}

export const DEFAULT_CAPABILITY_ADOPTION_POLICY: CapabilityAdoptionPolicy = {
  maxContextTokens: 8_000,
  maxTokensPerCall: 12_000,
  maxTokensPerHour: 40_000,
  maxTokensPerDay: 160_000,
  duplicateSimilarityThreshold: 85,
  lazyLoadThresholdTokens: 2_000,
  minimumScheduleIntervalMinutes: 15,
};

const SECRET_PATTERN =
  /\b(?:bearer\s+[\w.-]+|(?:api[_-]?key|access[_-]?token|secret|password)\s*[:=]\s*\S+)/giu;
const PATH_PATTERN =
  /(?:[a-z]:\\(?:[^\\\s]+\\)+[^\\\s]*|\/(?:Users|home)\/[^/\s]+(?:\/[^\s]*)?)/giu;
const QUERY_SECRET_PATTERN =
  /([?&](?:api[_-]?key|access[_-]?token|secret|password)=)[^&\s]+/giu;

function finiteInteger(value: number, minimum = 0): number {
  return Number.isFinite(value) ? Math.max(minimum, Math.floor(value)) : minimum;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Number.isFinite(value) ? Math.min(maximum, Math.max(minimum, value)) : minimum;
}

function normalize(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");
}

function unique(values: string[]): string[] {
  return [...new Set(values.map(normalize).filter(Boolean))].sort();
}

function words(value: string): string[] {
  return unique(value.split(/[^\p{L}\p{N}]+/gu));
}

function stableId(prefix: string, values: string[]): string {
  let hash = 2166136261;
  for (const character of values.join("|")) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function sanitizeCapabilityDisplayText(value: string, maximumLength = 280): string {
  return value.normalize("NFKC")
    .replace(SECRET_PATTERN, "[redacted-secret]")
    .replace(PATH_PATTERN, "[redacted-path]")
    .replace(QUERY_SECRET_PATTERN, "$1[redacted-secret]")
    .replace(/\s+/g, " ").trim().slice(0, finiteInteger(maximumLength, 1));
}

export function toDisplaySafeCapability(capability: CapabilityDescriptor): CapabilityDescriptor {
  return {
    id: normalize(capability.id) || stableId("capability", [capability.kind, capability.label]),
    kind: capability.kind,
    label: sanitizeCapabilityDisplayText(capability.label, 100) || "Unnamed capability",
    description: sanitizeCapabilityDisplayText(capability.description, 280)
      || "No display-safe description is available.",
    tags: unique(capability.tags).slice(0, 24),
  };
}

export function toDisplaySafeEvidence(evidence: CapabilityEvidence[]): CapabilityEvidence[] {
  const byIdentity = new Map<string, CapabilityEvidence>();
  for (const item of evidence) {
    const label = sanitizeCapabilityDisplayText(item.label, 120);
    if (!label) continue;
    const safe: CapabilityEvidence = {
      kind: item.kind,
      label,
      confidence: Math.round(clamp(item.confidence, 0, 1) * 1_000) / 1_000,
      ...(item.observedAt ? { observedAt: sanitizeCapabilityDisplayText(item.observedAt, 40) } : {}),
    };
    const key = `${safe.kind}|${normalize(safe.label)}`;
    const current = byIdentity.get(key);
    if (!current || current.confidence < safe.confidence) byIdentity.set(key, safe);
  }
  return [...byIdentity.values()].sort(
    (left, right) => right.confidence - left.confidence
      || left.kind.localeCompare(right.kind) || left.label.localeCompare(right.label),
  );
}

export function combineCapabilityEvidenceConfidence(evidence: CapabilityEvidence[]): number {
  const remaining = toDisplaySafeEvidence(evidence)
    .reduce((value, item) => value * (1 - item.confidence), 1);
  return Math.round((1 - remaining) * 1_000) / 1_000;
}

export function normalizeCapabilityCostEnvelope(cost: CapabilityCostEnvelope): CapabilityCostEnvelope {
  return {
    contextTokens: finiteInteger(cost.contextTokens),
    tokensPerCall: finiteInteger(cost.tokensPerCall),
    maxCallsPerHour: finiteInteger(cost.maxCallsPerHour),
    maxCallsPerDay: finiteInteger(cost.maxCallsPerDay),
    ...(cost.scheduleIntervalMinutes === undefined
      ? {} : { scheduleIntervalMinutes: finiteInteger(cost.scheduleIntervalMinutes) }),
    loadStrategy: cost.loadStrategy,
    risk: cost.risk,
  };
}

export function projectCapabilityTokenCost(cost: CapabilityCostEnvelope): CapabilityTokenProjection {
  const normalized = normalizeCapabilityCostEnvelope(cost);
  const scheduledCallsPerHour = normalized.scheduleIntervalMinutes === undefined
    || normalized.scheduleIntervalMinutes === 0
    ? normalized.maxCallsPerHour : Math.ceil(60 / normalized.scheduleIntervalMinutes);
  const scheduledCallsPerDay = normalized.scheduleIntervalMinutes === undefined
    || normalized.scheduleIntervalMinutes === 0
    ? normalized.maxCallsPerDay : Math.ceil(1_440 / normalized.scheduleIntervalMinutes);
  const callsPerHour = Math.min(normalized.maxCallsPerHour, scheduledCallsPerHour);
  const callsPerDay = Math.min(normalized.maxCallsPerDay, scheduledCallsPerDay);
  const eagerContext = normalized.loadStrategy === "eager" ? normalized.contextTokens : 0;
  const perCallTokens = normalized.tokensPerCall
    + (normalized.loadStrategy === "lazy" ? normalized.contextTokens : 0);
  return {
    callsPerHour,
    callsPerDay,
    contextTokensPerActivation: normalized.contextTokens,
    projectedTokensPerHour: eagerContext + perCallTokens * callsPerHour,
    projectedTokensPerDay: eagerContext + perCallTokens * callsPerDay,
  };
}

function jaccard(left: string[], right: string[]): number {
  const universe = unique([...left, ...right]);
  return universe.length
    ? left.filter((value) => right.includes(value)).length / universe.length : 0;
}

export function compareCapabilities(
  left: CapabilityDescriptor,
  right: CapabilityDescriptor,
): CapabilitySimilarity {
  const safeLeft = toDisplaySafeCapability(left);
  const safeRight = toDisplaySafeCapability(right);
  if (safeLeft.id === safeRight.id) {
    return {
      score: 100,
      sameKind: safeLeft.kind === safeRight.kind,
      matchedTags: safeLeft.tags.filter((tag) => safeRight.tags.includes(tag)),
      explanation: "The capability identifiers are identical.",
    };
  }
  const sameKind = safeLeft.kind === safeRight.kind;
  const matchedTags = safeLeft.tags.filter((tag) => safeRight.tags.includes(tag));
  const score = Math.round((Number(sameKind) * 0.35
    + jaccard(words(safeLeft.label), words(safeRight.label)) * 0.25
    + jaccard(safeLeft.tags, safeRight.tags) * 0.25
    + jaccard(words(safeLeft.description), words(safeRight.description)) * 0.15) * 100);
  return {
    score,
    sameKind,
    matchedTags,
    explanation: sameKind
      ? `${matchedTags.length} shared tags and display-safe label/description similarity explain this score.`
      : "Different capability kinds are not treated as duplicates.",
  };
}

export function createAgentCapabilityRelation(
  input: Omit<AgentCapabilityRelation, "id" | "confidence"> & {
    id?: string;
    confidence?: number;
  },
): AgentCapabilityRelation {
  const capability = toDisplaySafeCapability(input.capability);
  const evidence = toDisplaySafeEvidence(input.evidence);
  const agentId = normalize(input.agentId) || "unknown-agent";
  return {
    id: input.id ?? stableId(
      "agent-capability", [agentId, capability.kind, capability.id, input.state],
    ),
    agentId,
    capability,
    state: input.state,
    evidence,
    confidence: input.confidence === undefined
      ? combineCapabilityEvidenceConfidence(evidence)
      : Math.round(clamp(input.confidence, 0, 1) * 1_000) / 1_000,
    cost: normalizeCapabilityCostEnvelope(input.cost),
    ...(input.similarity ? { similarity: input.similarity } : {}),
  };
}

function mergePolicy(policy: Partial<CapabilityAdoptionPolicy> = {}): CapabilityAdoptionPolicy {
  return {
    maxContextTokens: finiteInteger(
      policy.maxContextTokens ?? DEFAULT_CAPABILITY_ADOPTION_POLICY.maxContextTokens,
    ),
    maxTokensPerCall: finiteInteger(
      policy.maxTokensPerCall ?? DEFAULT_CAPABILITY_ADOPTION_POLICY.maxTokensPerCall,
    ),
    maxTokensPerHour: finiteInteger(
      policy.maxTokensPerHour ?? DEFAULT_CAPABILITY_ADOPTION_POLICY.maxTokensPerHour,
    ),
    maxTokensPerDay: finiteInteger(
      policy.maxTokensPerDay ?? DEFAULT_CAPABILITY_ADOPTION_POLICY.maxTokensPerDay,
    ),
    duplicateSimilarityThreshold: clamp(
      policy.duplicateSimilarityThreshold
        ?? DEFAULT_CAPABILITY_ADOPTION_POLICY.duplicateSimilarityThreshold, 0, 100,
    ),
    lazyLoadThresholdTokens: finiteInteger(
      policy.lazyLoadThresholdTokens
        ?? DEFAULT_CAPABILITY_ADOPTION_POLICY.lazyLoadThresholdTokens,
    ),
    minimumScheduleIntervalMinutes: finiteInteger(
      policy.minimumScheduleIntervalMinutes
        ?? DEFAULT_CAPABILITY_ADOPTION_POLICY.minimumScheduleIntervalMinutes, 1,
    ),
  };
}

export function assessCapabilityAdoption(
  proposed: AgentCapabilityRelation,
  existingRelations: AgentCapabilityRelation[] = [],
  policyInput: Partial<CapabilityAdoptionPolicy> = {},
): CapabilityAdoptionAssessment {
  const policy = mergePolicy(policyInput);
  const projection = projectCapabilityTokenCost(proposed.cost);
  const findings: CapabilityPolicyFinding[] = [];
  const block = (code: CapabilityPolicyCode, message: string) =>
    findings.push({ code, severity: "blocking", message });
  if (proposed.cost.contextTokens > policy.maxContextTokens) {
    block("context-hard-budget", "Capability context exceeds the hard context-token budget.");
  }
  if (proposed.cost.tokensPerCall > policy.maxTokensPerCall) {
    block("per-call-hard-budget", "Capability usage exceeds the hard per-call token budget.");
  }
  if (projection.projectedTokensPerHour > policy.maxTokensPerHour) {
    block("hourly-hard-budget", "Projected usage exceeds the hard hourly token budget.");
  }
  if (projection.projectedTokensPerDay > policy.maxTokensPerDay) {
    block("daily-hard-budget", "Projected usage exceeds the hard daily token budget.");
  }
  if (proposed.cost.contextTokens > policy.lazyLoadThresholdTokens
    && proposed.cost.loadStrategy !== "lazy") {
    block("lazy-load-required", "Large capability context must use lazy loading.");
  }
  if (proposed.capability.kind === "schedule"
    && proposed.cost.scheduleIntervalMinutes === undefined) {
    block("schedule-interval-required", "Scheduled capabilities require an explicit interval.");
  } else if (proposed.cost.scheduleIntervalMinutes !== undefined
    && proposed.cost.scheduleIntervalMinutes < policy.minimumScheduleIntervalMinutes) {
    block(
      "schedule-minimum-interval",
      `Schedule interval must be at least ${policy.minimumScheduleIntervalMinutes} minutes.`,
    );
  }

  let duplicateOf: string | undefined;
  let duplicateScore = -1;
  for (const existing of existingRelations) {
    if (existing.agentId !== proposed.agentId
      || existing.state === "disabled" || existing.state === "observed") continue;
    const similarity = compareCapabilities(proposed.capability, existing.capability);
    if (similarity.sameKind && similarity.score >= policy.duplicateSimilarityThreshold
      && similarity.score > duplicateScore) {
      duplicateOf = existing.id;
      duplicateScore = similarity.score;
    }
  }
  if (duplicateOf) {
    block("duplicate-suppressed", "A matching capability is already proposed, adopted, or in use.");
  }
  if (proposed.cost.risk === "high") {
    findings.push({
      code: "high-risk-review",
      severity: "warning",
      message: "High-risk capabilities require explicit human review.",
    });
  }
  const decision = findings.some((finding) => finding.severity === "blocking")
    ? "block" : findings.length ? "review" : "allow";
  return { decision, projection, findings, ...(duplicateOf ? { duplicateOf } : {}) };
}

export function createCapabilityAdoptionPlan(
  input: CreateCapabilityAdoptionPlanInput,
): CapabilityAdoptionPlan {
  const proposedRelation = createAgentCapabilityRelation({
    agentId: input.agentId,
    capability: input.capability,
    state: "proposed",
    evidence: input.evidence,
    cost: input.cost,
  });
  const assessment = assessCapabilityAdoption(
    proposedRelation, input.existingRelations, input.policy,
  );
  return {
    id: stableId("capability-plan", [
      proposedRelation.agentId,
      proposedRelation.capability.id,
      JSON.stringify(proposedRelation.cost),
    ]),
    state: assessment.decision === "block" ? "blocked" : "ready",
    proposedRelation,
    assessment,
  };
}

const PLAN_TRANSITIONS: Record<CapabilityPlanState, CapabilityPlanState[]> = {
  draft: ["ready", "blocked"],
  ready: ["approved"],
  blocked: [],
  approved: ["applied"],
  applied: ["rolled-back"],
  "rolled-back": [],
};

export function transitionCapabilityAdoptionPlan(
  plan: CapabilityAdoptionPlan,
  nextState: CapabilityPlanState,
): CapabilityPlanTransition {
  if (!PLAN_TRANSITIONS[plan.state].includes(nextState)) {
    return {
      ok: false,
      plan,
      reason: `Capability plan cannot transition from ${plan.state} to ${nextState}.`,
    };
  }
  if ((nextState === "ready" || nextState === "approved")
    && plan.assessment.decision === "block") {
    return {
      ok: false,
      plan,
      reason: "A blocked capability plan cannot be readied or approved.",
    };
  }
  return { ok: true, plan: { ...plan, state: nextState } };
}

export function materializeAppliedCapabilityRelation(
  plan: CapabilityAdoptionPlan,
): AgentCapabilityRelation | null {
  if (plan.state !== "applied") return null;
  return createAgentCapabilityRelation({
    ...plan.proposedRelation,
    id: stableId("agent-capability", [
      plan.proposedRelation.agentId,
      plan.proposedRelation.capability.kind,
      plan.proposedRelation.capability.id,
      "adopted",
    ]),
    state: "adopted",
  });
}
