import {
  createCapabilityAdoptionPlan,
  type CapabilityKind,
  type CapabilityPolicyFinding,
} from "@agent-observatory/core";

export type AdoptableCapabilityKind =
  | "skill"
  | "plugin"
  | "hook"
  | "mcp-server";

export type ActivationMode = "on-demand" | "session" | "scheduled";

export interface CapabilityBudget {
  contextTokens: number;
  maxTokensPerCall: number;
  maxCallsPerHour: number;
  maxCallsPerDay: number;
  dailyTokenCeiling: number;
  scheduleIntervalMinutes?: number;
}

export interface CapabilityAdoptionProfile {
  agent: {
    id: string;
    label: string;
    role: string;
    environment: string;
    projectId: string;
  };
  capability: {
    id: string;
    label: string;
    kind: AdoptableCapabilityKind;
    summary: string;
    tags: string[];
  };
  activationMode: ActivationMode;
  budget: CapabilityBudget;
}

export interface CapabilityAdoptionPlan {
  planId: string;
  targetLabel: string;
  exists: boolean;
  allowed: boolean;
  expiresInSeconds: number;
  blockers: string[];
  warnings: string[];
  preview: CapabilityAdoptionProfile & {
    projectedDailyTokens: number;
    risk: "low" | "medium" | "high";
    lazyLoaded: boolean;
    duplicateSuppression: boolean;
  };
}

export interface CapabilityAdoptionResult {
  operationId: string;
  undoToken: string;
  targetLabel: string;
  status: "created";
  adoption: CapabilityAdoptionProfile;
}

export interface CapabilityAdoptionRecord {
  id: string;
  targetLabel: string;
  adoptedAt: string;
  profile: CapabilityAdoptionProfile;
}

interface ServerAdoptionRecord {
  id: string;
  agentId: string;
  agentName: string;
  agentRole: string;
  projectId: string;
  sourceEnvironment: string;
  kind: AdoptableCapabilityKind;
  capabilityId: string;
  capabilityName: string;
  description: string;
  loadMode: "lazy";
  activation:
    | { mode: "on-demand" | "once-per-session" }
    | { mode: "scheduled"; intervalMinutes: number };
  tokenBudget: { perRun: number; daily: number };
  usageLimits: {
    contextTokens: number;
    maxOutputTokens: number;
    maxCallsPerHour: number;
    maxCallsPerDay: number;
  };
  estimatedTokensPerUse: number;
  projectedDailyTokens: number;
  permissionRisk: "low" | "medium" | "high";
  permissions: string[];
  targetLabel: string;
}

interface ServerAdoptionPlan {
  planId: string;
  targetLabel: string;
  exists: boolean;
  expiresInSeconds: number;
  preview: {
    capabilities: Array<{
      permissionRisk: "low" | "medium" | "high";
      projectedDailyTokens: number;
    }>;
    warnings: string[];
  };
}

interface ServerAdoptionResult {
  operationId: string;
  undoToken: string;
  targetLabel: string;
  status: "created";
  adoptionProfile: ServerAdoptionRecord;
}

const configuredBase = (import.meta.env.VITE_OBSERVATORY_API ?? "").replace(
  /\/$/,
  "",
);

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof payload.error === "string"
        ? payload.error
        : "Local adoption action failed.";
    throw new Error(message);
  }
  return payload as T;
}

async function post<T>(
  pathname: string,
  body: unknown,
  approved = false,
): Promise<T> {
  const response = await fetch(configuredBase + pathname, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(approved
        ? { "X-Agent-Observatory-Action": "approved" }
        : {}),
    },
    body: JSON.stringify(body),
  });
  return parseResponse<T>(response);
}

const activationFromServer = (
  activation: ServerAdoptionRecord["activation"],
): ActivationMode =>
  activation.mode === "once-per-session" ? "session" : activation.mode;

const toDashboardRecord = (
  record: ServerAdoptionRecord,
): CapabilityAdoptionRecord => ({
  id: record.id,
  targetLabel: record.targetLabel,
  adoptedAt: "",
  profile: {
    agent: {
      id: record.agentId,
      label: record.agentName,
      role: record.agentRole,
      environment: record.sourceEnvironment,
      projectId: record.projectId,
    },
    capability: {
      id: record.capabilityId,
      label: record.capabilityName,
      kind: record.kind,
      summary: record.description,
      tags: [],
    },
    activationMode: activationFromServer(record.activation),
    budget: {
      contextTokens: record.usageLimits.contextTokens,
      maxTokensPerCall: record.usageLimits.maxOutputTokens,
      maxCallsPerHour: record.usageLimits.maxCallsPerHour,
      maxCallsPerDay: record.usageLimits.maxCallsPerDay,
      dailyTokenCeiling: record.tokenBudget.daily,
      ...(record.activation.mode === "scheduled"
        ? { scheduleIntervalMinutes: record.activation.intervalMinutes }
        : {}),
    },
  },
});

export async function listCapabilityAdoptions() {
  const response = await fetch(configuredBase + "/api/adoptions", {
    headers: { Accept: "application/json" },
  });
  const payload = await parseResponse<{ records: ServerAdoptionRecord[] }>(
    response,
  );
  return { records: payload.records.map(toDashboardRecord) };
}

const toCoreKind = (kind: AdoptableCapabilityKind): CapabilityKind =>
  kind === "mcp-server" ? "mcp" : kind;

const findingMessages = (
  findings: CapabilityPolicyFinding[],
  severity: CapabilityPolicyFinding["severity"],
) =>
  findings
    .filter((finding) => finding.severity === severity)
    .map((finding) => finding.message);

export async function planCapabilityAdoption(
  profile: CapabilityAdoptionProfile,
): Promise<CapabilityAdoptionPlan> {
  const scheduledInterval = Math.max(
    60,
    Math.ceil(1_440 / Math.max(profile.budget.maxCallsPerDay, 1)),
  );
  const corePlan = createCapabilityAdoptionPlan({
    agentId: profile.agent.id,
    capability: {
      id: profile.capability.id,
      kind: toCoreKind(profile.capability.kind),
      label: profile.capability.label,
      description: profile.capability.summary,
      tags: profile.capability.tags,
    },
    evidence: [
      {
        kind: "user",
        label: "Explicit dashboard selection",
        confidence: 1,
      },
    ],
    cost: {
      contextTokens: profile.budget.contextTokens,
      tokensPerCall: profile.budget.maxTokensPerCall,
      maxCallsPerHour: profile.budget.maxCallsPerHour,
      maxCallsPerDay: profile.budget.maxCallsPerDay,
      ...(profile.activationMode === "scheduled"
        ? {
            scheduleIntervalMinutes:
              profile.budget.scheduleIntervalMinutes ?? scheduledInterval,
          }
        : {}),
      loadStrategy: "lazy",
      risk: "low",
    },
    policy: {
      maxContextTokens: 8_000,
      maxTokensPerCall: 12_000,
      maxTokensPerHour: Math.min(
        40_000,
        profile.budget.dailyTokenCeiling,
      ),
      maxTokensPerDay: Math.min(
        160_000,
        profile.budget.dailyTokenCeiling,
      ),
      minimumScheduleIntervalMinutes: 60,
    },
  });
  const blockers = findingMessages(corePlan.assessment.findings, "blocking");
  const warnings = findingMessages(corePlan.assessment.findings, "warning");
  const preview = {
    ...profile,
    projectedDailyTokens:
      corePlan.assessment.projection.projectedTokensPerDay,
    risk:
      profile.capability.kind === "hook"
        ? ("medium" as const)
        : ("low" as const),
    lazyLoaded: true,
    duplicateSuppression: true,
  };

  if (corePlan.assessment.decision === "block") {
    return {
      planId: corePlan.id,
      targetLabel: "Policy must pass before a target is reserved.",
      exists: false,
      allowed: false,
      expiresInSeconds: 0,
      blockers,
      warnings,
      preview,
    };
  }

  const activation =
    profile.activationMode === "scheduled"
      ? {
          mode: "scheduled" as const,
          intervalMinutes: profile.budget.scheduleIntervalMinutes ?? scheduledInterval,
        }
      : {
          mode:
            profile.activationMode === "session"
              ? ("once-per-session" as const)
              : ("on-demand" as const),
        };
  const tokensPerUse =
    profile.budget.contextTokens + profile.budget.maxTokensPerCall;
  const serverPlan = await post<ServerAdoptionPlan>(
    "/api/adoptions/plan",
    {
      agent: {
        id: profile.agent.id,
        projectId: profile.agent.projectId || "global",
        name: profile.agent.label,
        description: `${profile.agent.role} capability profile`,
        role: profile.agent.role || "subagent",
        sourceEnvironment:
          profile.agent.environment === "claude"
            ? "claude"
            : profile.agent.environment === "codex"
              ? "codex"
              : "shared",
      },
      policy: {
        tokenBudget: {
          perRun: tokensPerUse,
          daily: profile.budget.dailyTokenCeiling,
        },
        minScheduleIntervalMinutes: 60,
      },
      assets: [
        {
          kind: profile.capability.kind,
          id: profile.capability.id,
          name: profile.capability.label,
          description: profile.capability.summary,
          loadMode: "lazy",
          activation,
          usageLimits: {
            contextTokens: profile.budget.contextTokens,
            maxOutputTokens: profile.budget.maxTokensPerCall,
            maxCallsPerHour: profile.budget.maxCallsPerHour,
            maxCallsPerDay: profile.budget.maxCallsPerDay,
          },
          estimatedTokensPerUse: tokensPerUse,
          permissionRisk:
            profile.capability.kind === "hook" ? "medium" : "low",
          permissions:
            profile.capability.kind === "plugin"
              || profile.capability.kind === "mcp-server"
              ? ["network:read"]
              : ["read"],
        },
      ],
    },
  );
  const capability = serverPlan.preview.capabilities[0];
  return {
    planId: serverPlan.planId,
    targetLabel: serverPlan.targetLabel,
    exists: serverPlan.exists,
    allowed: !serverPlan.exists && blockers.length === 0,
    expiresInSeconds: serverPlan.expiresInSeconds,
    blockers,
    warnings: [...warnings, ...serverPlan.preview.warnings],
    preview: {
      ...preview,
      projectedDailyTokens:
        capability?.projectedDailyTokens
        ?? preview.projectedDailyTokens,
      risk: capability?.permissionRisk ?? preview.risk,
    },
  };
}

export async function executeCapabilityAdoption(planId: string) {
  const result = await post<ServerAdoptionResult>(
    "/api/adoptions/execute",
    { planId, confirmation: "APPLY" },
    true,
  );
  return {
    operationId: result.operationId,
    undoToken: result.undoToken,
    targetLabel: result.targetLabel,
    status: result.status,
    adoption: toDashboardRecord(result.adoptionProfile).profile,
  } satisfies CapabilityAdoptionResult;
}

export function undoCapabilityAdoption(
  operationId: string,
  undoToken: string,
) {
  return post<{
    operationId: string;
    targetLabels: string[];
    status: "undone";
  }>(
    "/api/adoptions/undo",
    { operationId, undoToken },
    true,
  );
}
