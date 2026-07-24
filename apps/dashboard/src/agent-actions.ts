export type AgentAction = "promote-shared" | "apply-codex";

export interface AgentActionProfile {
  name: string;
  description: string;
  role: string;
  skills: string[];
  sourceEnvironment: string;
  sourceProjectIds: string[];
}

export interface AgentActionPlan {
  planId: string;
  action: AgentAction;
  targetLabel: string;
  exists: boolean;
  expiresInSeconds: number;
  preview: { name: string; description: string; role: string; skills: string[]; format: string };
}

export interface AgentActionResult {
  operationId: string;
  undoToken: string;
  targetLabel: string;
  action: AgentAction;
  status: "created";
}

const configuredBase = (import.meta.env.VITE_OBSERVATORY_API ?? "").replace(/\/$/, "");

async function request<T>(pathname: string, body: unknown, approved = false): Promise<T> {
  const response = await fetch(configuredBase + pathname, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(approved ? { "X-Agent-Observatory-Action": "approved" } : {}),
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof payload.error === "string" ? payload.error : "Local action failed.");
  }
  return payload as T;
}

export function planAgentAction(action: AgentAction, profile: AgentActionProfile) {
  return request<AgentActionPlan>("/api/actions/plan", { action, profile });
}

export function executeAgentAction(planId: string) {
  return request<AgentActionResult>("/api/actions/execute", { planId, confirmation: "APPLY" }, true);
}

export function undoAgentAction(operationId: string, undoToken: string) {
  return request<{ operationId: string; targetLabel: string; status: "undone" }>(
    "/api/actions/undo",
    { operationId, undoToken },
    true,
  );
}
