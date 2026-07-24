import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  ADOPTION_APPROVAL_HEADER,
  AdoptionError,
  createAdoptionManager,
} from "../src/adoptions.js";

let fixtureRoot;

const baseAgent = () => ({
  id: "agent.research",
  projectId: "project-alpha",
  name: "Research Agent",
  description: "Synthesizes evidence for product decisions.",
  role: "deep-research",
  sourceEnvironment: "claude",
});

const skillAsset = () => ({
  kind: "skill",
  id: "deep-research",
  name: "Deep Research",
  description: "Investigates multiple sources.",
  estimatedTokensPerUse: 1_200,
  permissions: ["read"],
});

const pluginAsset = () => ({
  kind: "plugin",
  id: "github:review",
  name: "GitHub Review",
  description: "Reads repository review context.",
  estimatedTokensPerUse: 800,
  permissions: ["network:read"],
  permissionRisk: "medium",
});

const baseRequest = () => ({
  agent: baseAgent(),
  policy: {
    tokenBudget: { perRun: 4_000, daily: 12_000 },
    minScheduleIntervalMinutes: 60,
  },
  assets: [skillAsset(), pluginAsset()],
});

const singleAssetRequest = (asset) => ({
  ...baseRequest(),
  assets: [asset],
});

const targetPath = (targetLabel) => path.join(fixtureRoot, ...targetLabel.split("/"));
const rejectsWith = (code, statusCode = 400) => (
  (error) => error instanceof AdoptionError && error.code === code && error.statusCode === statusCode
);

beforeEach(async () => {
  fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), "observatory-adoptions-"));
});

afterEach(async () => {
  await fs.rm(fixtureRoot, { recursive: true, force: true });
});

describe("capability adoption planning", () => {
  it("creates lazy, duplicate-suppressed, per-asset targets with stable agent identity", async () => {
    const request = baseRequest();
    request.assets.push({ ...request.assets[0] });
    const manager = createAdoptionManager({ projectRoot: fixtureRoot });
    const planned = await manager.plan(request);

    assert.equal(planned.targetLabels.length, 2);
    assert.equal(planned.targets.every((target) => target.targetLabel.startsWith(".agent-observatory/adoptions/agent-research/")), true);
    assert.equal(planned.targets.some((target) => target.targetLabel.includes("skill--deep-research-")), true);
    assert.equal(planned.targets.some((target) => target.targetLabel.includes("plugin--github-review-")), true);
    assert.equal(planned.exists, false);
    assert.equal(planned.preview.agent.id, "agent.research");
    assert.equal(planned.preview.agent.projectId, "project-alpha");
    assert.equal(planned.preview.capabilities.length, 2);
    assert.deepEqual(planned.preview.suppressedDuplicates, ["skill:deep-research"]);
    assert.equal(planned.preview.policy.lazyLoading, true);
    assert.equal(planned.preview.policy.duplicateSuppression, true);
    assert.equal(planned.preview.capabilities.every((asset) => asset.loadMode === "lazy"), true);
    assert.equal(planned.preview.capabilities.every((asset) => ["skill", "plugin", "hook", "mcp-server"].includes(asset.kind)), true);
    assert.equal(planned.preview.tokenSummary.peakOnDemandTokens, 1_200);
    assert.equal(planned.preview.tokenSummary.catalogTokens, 2_000);
    assert.equal(planned.preview.tokenSummary.projectedDailyTokens, 8_000);
    assert.deepEqual(planned.preview.capabilities[0].usageLimits, {
      contextTokens: 512,
      maxOutputTokens: 256,
      maxCallsPerHour: 1,
      maxCallsPerDay: 4,
    });
  });

  it("normalizes all activation modes and hard-enforces usage budgets", async () => {
    const manager = createAdoptionManager({ projectRoot: fixtureRoot });
    const request = baseRequest();
    request.assets = [
      {
        kind: "skill",
        id: "session-research",
        activation: { mode: "once-per-session" },
        usageLimits: {
          contextTokens: 900,
          maxOutputTokens: 600,
          maxCallsPerHour: 2,
          maxCallsPerDay: 3,
        },
        estimatedTokensPerUse: 100,
      },
      {
        kind: "hook",
        id: "daily-summary",
        activation: { mode: "scheduled", intervalMinutes: 1_440 },
        usageLimits: {
          contextTokens: 100,
          maxOutputTokens: 100,
          maxCallsPerHour: 1,
          maxCallsPerDay: 1,
        },
      },
    ];
    const planned = await manager.plan(request);
    const sessionAsset = planned.preview.capabilities.find((asset) => asset.id === "session-research");
    assert.equal(sessionAsset.activation.mode, "once-per-session");
    assert.equal(sessionAsset.estimatedTokensPerUse, 1_500);
    assert.equal(sessionAsset.projectedDailyTokens, 4_500);
    assert.equal(planned.preview.tokenSummary.projectedDailyTokens, 4_700);

    const invalidCalls = singleAssetRequest({
      kind: "skill",
      id: "invalid-calls",
      usageLimits: { contextTokens: 100, maxOutputTokens: 100, maxCallsPerHour: 5, maxCallsPerDay: 4 },
    });
    await assert.rejects(() => manager.plan(invalidCalls), rejectsWith("invalid_usage_limits"));

    const onDemandOverflow = singleAssetRequest({
      kind: "plugin",
      id: "daily-overflow",
      usageLimits: { contextTokens: 500, maxOutputTokens: 500, maxCallsPerHour: 1, maxCallsPerDay: 13 },
    });
    await assert.rejects(() => manager.plan(onDemandOverflow), rejectsWith("daily_budget_exceeded"));

    const aggregateOverflow = baseRequest();
    aggregateOverflow.assets = ["one", "two"].map((id) => ({
      kind: "skill",
      id,
      usageLimits: { contextTokens: 500, maxOutputTokens: 500, maxCallsPerHour: 1, maxCallsPerDay: 7 },
    }));
    await assert.rejects(() => manager.plan(aggregateOverflow), rejectsWith("daily_budget_exceeded"));

    const scheduledCallOverflow = singleAssetRequest({
      kind: "mcp-server",
      id: "hourly-browser",
      activation: { mode: "scheduled", intervalMinutes: 60 },
      usageLimits: { contextTokens: 100, maxOutputTokens: 100, maxCallsPerHour: 1, maxCallsPerDay: 23 },
    });
    await assert.rejects(() => manager.plan(scheduledCallOverflow), rejectsWith("scheduled_call_limit_exceeded"));
  });

  it("refuses conflicting duplicates, legacy MCP names, and eager loading", async () => {
    const manager = createAdoptionManager({ projectRoot: fixtureRoot });
    const conflicting = baseRequest();
    conflicting.assets.push({ ...conflicting.assets[0], estimatedTokensPerUse: 900 });
    await assert.rejects(() => manager.plan(conflicting), rejectsWith("duplicate_conflict", 409));

    const legacyMcp = singleAssetRequest({ kind: "mcp", id: "browser" });
    await assert.rejects(() => manager.plan(legacyMcp), rejectsWith("unsupported_capability"));

    const eager = baseRequest();
    eager.assets[0].loadMode = "eager";
    await assert.rejects(() => manager.plan(eager), rejectsWith("lazy_loading_required"));
  });

  it("enforces per-run and scheduled-activation token budgets plus minimum intervals", async () => {
    const manager = createAdoptionManager({ projectRoot: fixtureRoot });
    const oversized = baseRequest();
    oversized.assets[0].estimatedTokensPerUse = 4_001;
    await assert.rejects(() => manager.plan(oversized), rejectsWith("per_run_budget_exceeded"));

    const tooFrequent = singleAssetRequest({
      kind: "skill",
      id: "scheduled-research",
      estimatedTokensPerUse: 400,
      activation: { mode: "scheduled", intervalMinutes: 30 },
    });
    await assert.rejects(() => manager.plan(tooFrequent), rejectsWith("invalid_policy"));

    const dailyOverflow = singleAssetRequest({
      kind: "plugin",
      id: "scheduled-review",
      estimatedTokensPerUse: 600,
      activation: { mode: "scheduled", intervalMinutes: 60 },
      usageLimits: { contextTokens: 300, maxOutputTokens: 300, maxCallsPerHour: 1, maxCallsPerDay: 24 },
    });
    await assert.rejects(() => manager.plan(dailyOverflow), rejectsWith("daily_budget_exceeded"));

    const valid = singleAssetRequest({
      kind: "mcp-server",
      id: "daily-research",
      estimatedTokensPerUse: 2_000,
      activation: { mode: "scheduled", intervalMinutes: 1_440 },
    });
    const planned = await manager.plan(valid);
    assert.equal(planned.preview.capabilities[0].loadMode, "lazy");
    assert.deepEqual(planned.preview.capabilities[0].activation, { mode: "scheduled", intervalMinutes: 1_440 });
    assert.equal(planned.preview.tokenSummary.scheduledTokensPerDay, 2_000);
  });

  it("requires explicit approval for high-risk permissions and prohibits critical permissions", async () => {
    const manager = createAdoptionManager({ projectRoot: fixtureRoot });
    const highRisk = singleAssetRequest({
      kind: "hook",
      id: "format-on-save",
      permissions: ["filesystem:write"],
    });
    await assert.rejects(() => manager.plan(highRisk), rejectsWith("permission_approval_required"));

    highRisk.assets[0].permissionApproved = true;
    const approved = await manager.plan(highRisk);
    assert.equal(approved.preview.capabilities[0].permissionRisk, "high");
    assert.equal(approved.preview.warnings.length, 1);

    const critical = singleAssetRequest({
      kind: "mcp-server",
      id: "unsafe-shell",
      permissions: ["shell:unrestricted"],
      permissionApproved: true,
    });
    await assert.rejects(() => manager.plan(critical), rejectsWith("critical_permission"));
  });

  it("rejects secret-like values and absolute paths before a plan is stored", async () => {
    const manager = createAdoptionManager({ projectRoot: fixtureRoot });
    const secret = baseRequest();
    secret.assets[0].description = "Use token=super-secret-value";
    await assert.rejects(() => manager.plan(secret), rejectsWith("sensitive_value"));

    const absolutePath = baseRequest();
    absolutePath.agent.description = "Reads C:\\Users\\person\\private-data";
    await assert.rejects(() => manager.plan(absolutePath), rejectsWith("sensitive_value"));
  });
});

describe("capability adoption execution, listing, and undo", () => {
  it("requires approval, returns manifests and display profiles, omits unknown secrets, and undoes all files", async () => {
    const manager = createAdoptionManager({ projectRoot: fixtureRoot });
    const request = baseRequest();
    request.secret = "must-never-be-persisted";
    request.assets[0].sourcePath = "C:\\Users\\person\\skill";
    const planned = await manager.plan(request);

    await assert.rejects(
      () => manager.execute(planned.planId, "APPLY"),
      rejectsWith("approval_header_required", 403),
    );
    const executed = await manager.execute(planned.planId, "APPLY", ADOPTION_APPROVAL_HEADER);

    assert.equal(executed.manifests.length, 2);
    assert.equal(executed.adoptionProfiles.length, 2);
    assert.equal(executed.adoptionProfiles.every((record) => record.tokenBudget.perRun === 4_000), true);
    assert.equal(executed.adoptionProfiles.every((record) => record.tokenBudget.daily === 12_000), true);
    assert.equal(executed.adoptionProfiles.every((record) => record.usageLimits.maxCallsPerDay === 4), true);
    assert.deepEqual(executed.adoptionProfiles.map((record) => record.projectedDailyTokens).sort((a, b) => a - b), [3_200, 4_800]);
    assert.equal(executed.manifests.every((manifest) => manifest.agent.id === "agent.research"), true);
    assert.equal(executed.manifests.every((manifest) => manifest.agent.projectId === "project-alpha"), true);
    assert.equal(executed.adoptionProfiles.every((record) => !path.isAbsolute(record.targetLabel)), true);
    for (const label of executed.targetLabels) {
      const content = await fs.readFile(targetPath(label), "utf8");
      assert.equal(content.includes("must-never-be-persisted"), false);
      assert.equal(content.includes("C:\\Users"), false);
      assert.equal(JSON.parse(content).capability !== undefined, true);
    }

    await assert.rejects(
      () => manager.undo(executed.operationId, executed.undoToken),
      rejectsWith("approval_header_required", 403),
    );
    const undone = await manager.undo(executed.operationId, executed.undoToken, ADOPTION_APPROVAL_HEADER);
    assert.equal(undone.status, "undone");
    for (const label of executed.targetLabels) await assert.rejects(() => fs.access(targetPath(label)));
  });

  it("supports sequential adoption for one agent and lists display-safe records", async () => {
    const manager = createAdoptionManager({ projectRoot: fixtureRoot });
    const firstPlan = await manager.plan(singleAssetRequest(skillAsset()));
    const first = await manager.execute(firstPlan.planId, "APPLY", ADOPTION_APPROVAL_HEADER);
    assert.equal(first.manifest.capability.kind, "skill");
    assert.equal(first.adoptionProfile.capabilityId, "deep-research");

    const mcpAsset = {
      kind: "mcp-server",
      id: "browser-tools",
      name: "Browser Tools",
      description: "Provides browser inspection tools.",
      estimatedTokensPerUse: 700,
      permissions: ["network:read"],
    };
    const secondPlan = await manager.plan(singleAssetRequest(mcpAsset));
    assert.equal(secondPlan.exists, false);
    const second = await manager.execute(secondPlan.planId, "APPLY", ADOPTION_APPROVAL_HEADER);
    assert.equal(second.manifest.capability.kind, "mcp-server");

    const records = await manager.list();
    assert.equal(records.length, 2);
    assert.deepEqual(records.map((record) => record.kind).sort(), ["mcp-server", "skill"]);
    assert.equal(records.every((record) => record.agentId === "agent.research"), true);
    assert.equal(records.every((record) => record.projectId === "project-alpha"), true);
    assert.equal(records.every((record) => record.tokenBudget.daily === 12_000), true);
    assert.equal(records.every((record) => Number.isInteger(record.usageLimits.contextTokens)), true);
    assert.equal(records.every((record) => Number.isInteger(record.projectedDailyTokens)), true);
    assert.equal(records.every((record) => !path.isAbsolute(record.targetLabel)), true);
    assert.equal(JSON.stringify(records).includes(fixtureRoot), false);
  });

  it("never overwrites an existing asset manifest", async () => {
    const manager = createAdoptionManager({ projectRoot: fixtureRoot });
    const request = singleAssetRequest(skillAsset());
    const firstPlan = await manager.plan(request);
    await manager.execute(firstPlan.planId, "APPLY", ADOPTION_APPROVAL_HEADER);

    const secondPlan = await manager.plan(request);
    assert.equal(secondPlan.exists, true);
    assert.equal(secondPlan.targets[0].exists, true);
    await assert.rejects(
      () => manager.execute(secondPlan.planId, "APPLY", ADOPTION_APPROVAL_HEADER),
      rejectsWith("target_exists", 409),
    );
  });

  it("refuses hash-protected undo after a user edit", async () => {
    const manager = createAdoptionManager({ projectRoot: fixtureRoot });
    const planned = await manager.plan(singleAssetRequest(skillAsset()));
    const executed = await manager.execute(planned.planId, "APPLY", ADOPTION_APPROVAL_HEADER);
    const target = targetPath(executed.targetLabel);
    await fs.appendFile(target, "\nuser edit\n");

    await assert.rejects(
      () => manager.undo(executed.operationId, executed.undoToken, ADOPTION_APPROVAL_HEADER),
      rejectsWith("target_changed", 409),
    );
    assert.match(await fs.readFile(target, "utf8"), /user edit/);
  });

  it("expires server-stored plans", async () => {
    let currentTime = 1_000;
    const manager = createAdoptionManager({
      projectRoot: fixtureRoot,
      planTtlMs: 100,
      now: () => currentTime,
    });
    const planned = await manager.plan(singleAssetRequest(skillAsset()));
    currentTime += 101;
    await assert.rejects(
      () => manager.execute(planned.planId, "APPLY", ADOPTION_APPROVAL_HEADER),
      rejectsWith("plan_not_found", 404),
    );
  });
});
