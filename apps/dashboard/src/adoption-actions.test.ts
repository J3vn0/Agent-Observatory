import { afterEach, describe, expect, it, vi } from "vitest";
import {
  executeCapabilityAdoption,
  planCapabilityAdoption,
  type CapabilityAdoptionProfile,
} from "./adoption-actions";

const profile = (
  overrides: Partial<CapabilityAdoptionProfile> = {},
): CapabilityAdoptionProfile => ({
  agent: {
    id: "review-agent",
    label: "Review Agent",
    role: "review",
    environment: "codex",
    projectId: "project-alpha",
  },
  capability: {
    id: "focused-review",
    label: "Focused Review",
    kind: "skill",
    summary: "Reviews selected evidence on demand.",
    tags: ["review"],
  },
  activationMode: "on-demand",
  budget: {
    contextTokens: 500,
    maxTokensPerCall: 1_000,
    maxCallsPerHour: 2,
    maxCallsPerDay: 4,
    dailyTokenCeiling: 8_000,
  },
  ...overrides,
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("dashboard capability adoption client", () => {
  it("blocks an overly frequent schedule before contacting the daemon", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await planCapabilityAdoption(
      profile({
        activationMode: "scheduled",
        budget: {
          ...profile().budget,
          maxCallsPerHour: 24,
          maxCallsPerDay: 100,
          scheduleIntervalMinutes: 30,
        },
      }),
    );
    expect(result.allowed).toBe(false);
    expect(result.blockers.join(" ")).toContain("at least 60 minutes");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends normalized hard limits and maps a server-validated plan", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          planId: "server-plan",
          targetLabel:
            ".agent-observatory/adoptions/review-agent/skill--focused-review.json",
          exists: false,
          expiresInSeconds: 600,
          preview: {
            capabilities: [
              { permissionRisk: "low", projectedDailyTokens: 6_000 },
            ],
            warnings: [],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const result = await planCapabilityAdoption(profile());
    expect(result.allowed).toBe(true);
    expect(result.preview.projectedDailyTokens).toBe(6_000);

    const [, request] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(request.body));
    expect(body.policy.tokenBudget).toEqual({
      perRun: 1_500,
      daily: 8_000,
    });
    expect(body.assets[0].usageLimits).toEqual({
      contextTokens: 500,
      maxOutputTokens: 1_000,
      maxCallsPerHour: 2,
      maxCallsPerDay: 4,
    });
    expect(body.assets[0].loadMode).toBe("lazy");
  });

  it("uses explicit APPLY approval and maps the created adoption", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          operationId: "operation-1",
          undoToken: "undo-1",
          targetLabel:
            ".agent-observatory/adoptions/review-agent/skill--focused-review.json",
          status: "created",
          adoptionProfile: {
            id: "adoption-1",
            agentId: "review-agent",
            agentName: "Review Agent",
            agentRole: "review",
            projectId: "project-alpha",
            sourceEnvironment: "codex",
            kind: "skill",
            capabilityId: "focused-review",
            capabilityName: "Focused Review",
            description: "Reviews selected evidence on demand.",
            loadMode: "lazy",
            activation: { mode: "on-demand" },
            tokenBudget: { perRun: 1_500, daily: 8_000 },
            usageLimits: {
              contextTokens: 500,
              maxOutputTokens: 1_000,
              maxCallsPerHour: 2,
              maxCallsPerDay: 4,
            },
            estimatedTokensPerUse: 1_500,
            projectedDailyTokens: 6_000,
            permissionRisk: "low",
            permissions: ["read"],
            targetLabel:
              ".agent-observatory/adoptions/review-agent/skill--focused-review.json",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const result = await executeCapabilityAdoption("server-plan");
    expect(result.adoption.budget.dailyTokenCeiling).toBe(8_000);

    const [, request] = fetchMock.mock.calls[0];
    expect(JSON.parse(String(request.body)).confirmation).toBe("APPLY");
    expect(
      (request.headers as Record<string, string>)[
        "X-Agent-Observatory-Action"
      ],
    ).toBe("approved");
  });

  it("derives a schedule interval that stays within the daily call ceiling", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          planId: "scheduled-plan",
          targetLabel:
            ".agent-observatory/adoptions/review-agent/skill--focused-review.json",
          exists: false,
          expiresInSeconds: 600,
          preview: {
            capabilities: [
              { permissionRisk: "low", projectedDailyTokens: 7_500 },
            ],
            warnings: [],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    await planCapabilityAdoption(
      profile({
        activationMode: "scheduled",
        budget: {
          contextTokens: 500,
          maxTokensPerCall: 1_000,
          maxCallsPerHour: 2,
          maxCallsPerDay: 5,
          dailyTokenCeiling: 8_000,
        },
      }),
    );

    const [, request] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(request.body));
    expect(body.assets[0].activation).toEqual({
      mode: "scheduled",
      intervalMinutes: 288,
    });
  });
});
