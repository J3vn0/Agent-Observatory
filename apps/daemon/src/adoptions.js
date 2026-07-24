import { createHash, randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const DEFAULT_PLAN_TTL_MS = 10 * 60 * 1000;
const DEFAULT_MIN_SCHEDULE_INTERVAL_MINUTES = 60;
const DEFAULT_TOKEN_BUDGET = Object.freeze({ perRun: 8_000, daily: 32_000 });
const DEFAULT_USAGE_LIMITS = Object.freeze({
  contextTokens: 512,
  maxOutputTokens: 256,
  maxCallsPerHour: 1,
  maxCallsPerDay: 4,
});
const CAPABILITY_KINDS = new Set(["skill", "plugin", "hook", "mcp-server"]);
const PERMISSION_RANK = Object.freeze({ low: 0, medium: 1, high: 2, critical: 3 });
const HIGH_RISK_PERMISSION_PATTERNS = [
  /^admin(?::|$)/,
  /^install(?::|$)/,
  /^network:write$/,
  /^filesystem:write$/,
  /^shell(?::|$)/,
  /^write(?::|$)/,
];
const CRITICAL_PERMISSION_PATTERNS = [
  /^destructive(?::|$)/,
  /^filesystem:unrestricted$/,
  /^secrets:write$/,
  /^shell:unrestricted$/,
];
const SECRET_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/i,
  /\b(?:sk|rk|pk)-[a-z0-9_-]{16,}\b/i,
  /\bgh[pousr]_[a-z0-9]{16,}\b/i,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bBearer\s+[a-z0-9._~+/=-]{12,}\b/i,
  /\b(?:api[_-]?key|access[_-]?token|client[_-]?secret|password|secret|token)\s*[:=]\s*\S+/i,
];

export const ADOPTION_APPROVAL_HEADER = "approved";

export class AdoptionError extends Error {
  constructor(statusCode, message, code = "adoption_error") {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

const token = (bytes = 18) => randomBytes(bytes).toString("base64url");
const hash = (value) => createHash("sha256").update(value).digest("hex");

const hasAbsolutePath = (value) => (
  /(?:^|[^a-z0-9])[a-z]:[\\/]/i.test(value)
  || /(?:^|[\s("'=])\\\\[^\\\s]+\\[^\\\s]+/.test(value)
  || /(?:^|[\s("'=])~[\\/]/.test(value)
  || /(?:^|[\s("'=])\/[a-z0-9._-]+(?:[\\/][a-z0-9._-]+)*(?=$|[\s)"'])/i.test(value)
);

const assertNoSensitiveText = (value, field) => {
  if (value.includes("://") || hasAbsolutePath(value) || SECRET_PATTERNS.some((pattern) => pattern.test(value))) {
    throw new AdoptionError(400, field + " contains a URL, absolute path, or secret-like value.", "sensitive_value");
  }
};

const safeText = (value, maximum, field, fallback) => {
  const candidate = value === undefined ? fallback : value;
  if (typeof candidate !== "string") {
    throw new AdoptionError(400, field + " must be text.", "invalid_adoption");
  }
  const cleaned = candidate.normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || cleaned.length > maximum) {
    throw new AdoptionError(400, field + " is invalid.", "invalid_adoption");
  }
  assertNoSensitiveText(cleaned, field);
  return cleaned;
};

const safeIdentifier = (value, field, maximum = 128) => {
  const cleaned = safeText(value, maximum, field);
  if (!/^[a-z0-9][a-z0-9._:@-]*$/i.test(cleaned) || cleaned.includes("..")) {
    throw new AdoptionError(400, field + " must be a stable identifier, not a path.", "invalid_identifier");
  }
  return cleaned;
};

const safeInteger = (value, field, minimum, maximum, fallback) => {
  const candidate = value === undefined ? fallback : value;
  if (!Number.isSafeInteger(candidate) || candidate < minimum || candidate > maximum) {
    throw new AdoptionError(400, field + " is outside the allowed range.", "invalid_policy");
  }
  return candidate;
};

const slug = (value, maximum = 64) => {
  const normalized = value.normalize("NFKD")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maximum);
  return normalized || "item-" + hash(value).slice(0, 10);
};

const normalizeAgent = (raw) => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new AdoptionError(400, "agent or profile is required.", "invalid_agent");
  }
  const sourceEnvironment = safeIdentifier(raw.sourceEnvironment || "shared", "agent.sourceEnvironment", 32).toLocaleLowerCase();
  if (!new Set(["claude", "codex", "shared"]).has(sourceEnvironment)) {
    throw new AdoptionError(400, "agent.sourceEnvironment is invalid.", "invalid_agent");
  }
  const name = safeText(raw.name, 96, "agent.name");
  const id = safeIdentifier(raw.id || slug(name), "agent.id").toLocaleLowerCase();
  return {
    id,
    slug: slug(id),
    projectId: safeIdentifier(raw.projectId || "global", "agent.projectId").toLocaleLowerCase(),
    name,
    description: safeText(raw.description, 280, "agent.description", "No role description was supplied."),
    role: safeIdentifier(raw.role || "subagent", "agent.role", 96).toLocaleLowerCase(),
    sourceEnvironment,
  };
};

const normalizePermission = (value, index) => safeIdentifier(value, "assets.permissions[" + index + "]", 80).toLocaleLowerCase();

const inferPermissionRisk = (permissions) => {
  if (permissions.some((permission) => CRITICAL_PERMISSION_PATTERNS.some((pattern) => pattern.test(permission)))) return "critical";
  if (permissions.some((permission) => HIGH_RISK_PERMISSION_PATTERNS.some((pattern) => pattern.test(permission)))) return "high";
  if (permissions.some((permission) => permission !== "read" && permission !== "none")) return "medium";
  return "low";
};

const normalizeRisk = (declaredRisk, permissions) => {
  const declared = safeIdentifier(declaredRisk || "low", "assets.permissionRisk", 16).toLocaleLowerCase();
  if (!(declared in PERMISSION_RANK)) {
    throw new AdoptionError(400, "assets.permissionRisk is invalid.", "invalid_permission_risk");
  }
  const inferred = inferPermissionRisk(permissions);
  return PERMISSION_RANK[inferred] > PERMISSION_RANK[declared] ? inferred : declared;
};

const normalizeActivation = (raw, index, policy) => {
  if (raw === undefined) return { mode: "on-demand" };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new AdoptionError(400, "assets[" + index + "].activation is invalid.", "invalid_activation");
  }
  const mode = safeIdentifier(raw.mode || "on-demand", "assets[" + index + "].activation.mode", 24).toLocaleLowerCase();
  if (mode === "on-demand" || mode === "once-per-session") {
    if (raw.intervalMinutes !== undefined) {
      throw new AdoptionError(400, mode + " activation cannot define an interval.", "invalid_activation");
    }
    return { mode };
  }
  if (mode !== "scheduled") {
    throw new AdoptionError(400, "Unsupported activation mode.", "invalid_activation");
  }
  return {
    mode,
    intervalMinutes: safeInteger(
      raw.intervalMinutes,
      "assets[" + index + "].activation.intervalMinutes",
      policy.minScheduleIntervalMinutes,
      525_600,
    ),
  };
};

const normalizeUsageLimits = (raw, index) => {
  const value = raw === undefined ? {} : raw;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AdoptionError(400, "assets[" + index + "].usageLimits is invalid.", "invalid_usage_limits");
  }
  const normalized = {
    contextTokens: safeInteger(
      value.contextTokens,
      "assets[" + index + "].usageLimits.contextTokens",
      0,
      200_000,
      DEFAULT_USAGE_LIMITS.contextTokens,
    ),
    maxOutputTokens: safeInteger(
      value.maxOutputTokens,
      "assets[" + index + "].usageLimits.maxOutputTokens",
      0,
      200_000,
      DEFAULT_USAGE_LIMITS.maxOutputTokens,
    ),
    maxCallsPerHour: safeInteger(
      value.maxCallsPerHour,
      "assets[" + index + "].usageLimits.maxCallsPerHour",
      1,
      10_000,
      DEFAULT_USAGE_LIMITS.maxCallsPerHour,
    ),
    maxCallsPerDay: safeInteger(
      value.maxCallsPerDay,
      "assets[" + index + "].usageLimits.maxCallsPerDay",
      1,
      100_000,
      DEFAULT_USAGE_LIMITS.maxCallsPerDay,
    ),
  };
  if (normalized.contextTokens + normalized.maxOutputTokens < 1) {
    throw new AdoptionError(400, "A capability must reserve at least one token.", "invalid_usage_limits");
  }
  if (normalized.maxCallsPerHour > normalized.maxCallsPerDay) {
    throw new AdoptionError(400, "maxCallsPerHour cannot exceed maxCallsPerDay.", "invalid_usage_limits");
  }
  return normalized;
};

const comparableAsset = (asset) => JSON.stringify({
  kind: asset.kind,
  id: asset.id,
  name: asset.name,
  description: asset.description,
  loadMode: asset.loadMode,
  activation: asset.activation,
  usageLimits: asset.usageLimits,
  estimatedTokensPerUse: asset.estimatedTokensPerUse,
  projectedDailyTokens: asset.projectedDailyTokens,
  permissionRisk: asset.permissionRisk,
  permissions: asset.permissions,
});

const normalizeAsset = (raw, index, policy, options = {}) => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new AdoptionError(400, "assets[" + index + "] is invalid.", "invalid_asset");
  }
  const kind = safeIdentifier(raw.kind, "assets[" + index + "].kind", 24).toLocaleLowerCase();
  if (!CAPABILITY_KINDS.has(kind)) {
    throw new AdoptionError(400, "Unsupported capability kind.", "unsupported_capability");
  }
  const id = safeIdentifier(raw.id, "assets[" + index + "].id");
  const permissions = raw.permissions === undefined ? [] : raw.permissions;
  if (!Array.isArray(permissions) || permissions.length > 24) {
    throw new AdoptionError(400, "assets[" + index + "].permissions is invalid.", "invalid_permission");
  }
  const normalizedPermissions = [...new Set(permissions.map(normalizePermission))].sort();
  const permissionRisk = normalizeRisk(raw.permissionRisk, normalizedPermissions);
  if (permissionRisk === "critical") {
    throw new AdoptionError(400, kind + ":" + id + " requests a prohibited critical permission.", "critical_permission");
  }
  if (permissionRisk === "high" && options.requirePermissionApproval !== false && raw.permissionApproved !== true) {
    throw new AdoptionError(400, kind + ":" + id + " requires explicit high-risk permission approval.", "permission_approval_required");
  }

  const loadMode = safeIdentifier(raw.loadMode || "lazy", "assets[" + index + "].loadMode", 16).toLocaleLowerCase();
  if (loadMode !== "lazy") {
    throw new AdoptionError(400, "Capabilities must use lazy loading.", "lazy_loading_required");
  }
  const activation = normalizeActivation(raw.activation, index, policy);
  const usageLimits = normalizeUsageLimits(raw.usageLimits, index);
  const derivedTokensPerUse = usageLimits.contextTokens + usageLimits.maxOutputTokens;
  const declaredTokensPerUse = safeInteger(
    raw.estimatedTokensPerUse,
    "assets[" + index + "].estimatedTokensPerUse",
    0,
    200_000,
    derivedTokensPerUse,
  );
  const estimatedTokensPerUse = Math.max(derivedTokensPerUse, declaredTokensPerUse);
  if (estimatedTokensPerUse > policy.tokenBudget.perRun) {
    throw new AdoptionError(400, kind + ":" + id + " exceeds the per-run token budget.", "per_run_budget_exceeded");
  }

  const projectedCallsPerDay = activation.mode === "scheduled"
    ? Math.ceil(1_440 / activation.intervalMinutes)
    : usageLimits.maxCallsPerDay;
  if (activation.mode === "scheduled" && projectedCallsPerDay > usageLimits.maxCallsPerDay) {
    throw new AdoptionError(400, kind + ":" + id + " schedule exceeds maxCallsPerDay.", "scheduled_call_limit_exceeded");
  }
  if (activation.mode === "scheduled" && Math.ceil(60 / activation.intervalMinutes) > usageLimits.maxCallsPerHour) {
    throw new AdoptionError(400, kind + ":" + id + " schedule exceeds maxCallsPerHour.", "scheduled_call_limit_exceeded");
  }
  const projectedDailyTokens = projectedCallsPerDay * estimatedTokensPerUse;
  if (projectedDailyTokens > policy.tokenBudget.daily) {
    throw new AdoptionError(400, kind + ":" + id + " exceeds the daily token budget.", "daily_budget_exceeded");
  }

  return {
    kind,
    id,
    name: safeText(raw.name, 96, "assets[" + index + "].name", id),
    description: safeText(raw.description, 280, "assets[" + index + "].description", kind + " capability"),
    loadMode,
    activation,
    usageLimits,
    estimatedTokensPerUse,
    projectedDailyTokens,
    permissionRisk,
    permissions: normalizedPermissions,
  };
};

const normalizePolicy = (raw = {}) => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new AdoptionError(400, "policy is invalid.", "invalid_policy");
  }
  const rawBudget = raw.tokenBudget === undefined ? {} : raw.tokenBudget;
  if (!rawBudget || typeof rawBudget !== "object" || Array.isArray(rawBudget)) {
    throw new AdoptionError(400, "policy.tokenBudget is invalid.", "invalid_policy");
  }
  const perRun = safeInteger(rawBudget.perRun, "policy.tokenBudget.perRun", 256, 200_000, DEFAULT_TOKEN_BUDGET.perRun);
  const daily = safeInteger(
    rawBudget.daily,
    "policy.tokenBudget.daily",
    perRun,
    10_000_000,
    Math.max(DEFAULT_TOKEN_BUDGET.daily, perRun),
  );
  return {
    tokenBudget: { perRun, daily },
    lazyLoading: true,
    duplicateSuppression: true,
    minScheduleIntervalMinutes: safeInteger(
      raw.minScheduleIntervalMinutes,
      "policy.minScheduleIntervalMinutes",
      DEFAULT_MIN_SCHEDULE_INTERVAL_MINUTES,
      43_200,
      DEFAULT_MIN_SCHEDULE_INTERVAL_MINUTES,
    ),
  };
};

const summarizeTokens = (capabilities, policy) => {
  const projectedDailyTokens = capabilities.reduce((total, asset) => total + asset.projectedDailyTokens, 0);
  if (projectedDailyTokens > policy.tokenBudget.daily) {
    throw new AdoptionError(400, "Projected capability usage exceeds the aggregate daily token budget.", "daily_budget_exceeded");
  }
  return {
    perRunBudget: policy.tokenBudget.perRun,
    dailyBudget: policy.tokenBudget.daily,
    peakOnDemandTokens: capabilities
      .filter((asset) => asset.activation.mode !== "scheduled")
      .reduce((maximum, asset) => Math.max(maximum, asset.estimatedTokensPerUse), 0),
    scheduledTokensPerDay: capabilities
      .filter((asset) => asset.activation.mode === "scheduled")
      .reduce((total, asset) => total + asset.projectedDailyTokens, 0),
    projectedDailyTokens,
    catalogTokens: capabilities.reduce((total, asset) => total + asset.estimatedTokensPerUse, 0),
  };
};

const normalizeRequest = (raw) => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new AdoptionError(400, "Adoption request is required.", "invalid_adoption");
  }
  const policy = normalizePolicy(raw.policy);
  const agent = normalizeAgent(raw.agent || raw.profile);
  if (!Array.isArray(raw.assets) || raw.assets.length === 0 || raw.assets.length > 100) {
    throw new AdoptionError(400, "assets must contain between 1 and 100 capabilities.", "invalid_assets");
  }

  const capabilities = [];
  const seen = new Map();
  const suppressedDuplicates = [];
  raw.assets.forEach((rawAsset, index) => {
    const asset = normalizeAsset(rawAsset, index, policy);
    const key = asset.kind + ":" + asset.id.toLocaleLowerCase();
    const previous = seen.get(key);
    if (!previous) {
      seen.set(key, asset);
      capabilities.push(asset);
      return;
    }
    if (comparableAsset(previous) !== comparableAsset(asset)) {
      throw new AdoptionError(409, key + " was selected more than once with conflicting settings.", "duplicate_conflict");
    }
    suppressedDuplicates.push(key);
  });

  capabilities.sort((left, right) => (left.kind + ":" + left.id).localeCompare(right.kind + ":" + right.id));
  const tokenSummary = summarizeTokens(capabilities, policy);
  const warnings = [];
  if (tokenSummary.catalogTokens > policy.tokenBudget.perRun) {
    warnings.push("Catalog token estimates exceed one run; the runtime must activate capabilities lazily within the per-run budget.");
  }
  if (capabilities.some((asset) => asset.permissionRisk === "high")) {
    warnings.push("High-risk permissions were explicitly approved; retain runtime confirmation for consequential actions.");
  }
  return { agent, policy, capabilities, suppressedDuplicates, tokenSummary, warnings };
};

const capabilitySlug = (capability) => slug(capability.id, 48) + "-" + hash(capability.kind + "\u0000" + capability.id.toLocaleLowerCase()).slice(0, 8);
const targetLabelFor = (agent, capability) => (
  ".agent-observatory/adoptions/" + agent.slug + "/" + capability.kind + "--" + capabilitySlug(capability) + ".json"
);
const adoptionIdFor = (agent, capability) => (
  "adoption-" + hash(agent.id + "\u0000" + agent.projectId + "\u0000" + capability.kind + "\u0000" + capability.id.toLocaleLowerCase()).slice(0, 20)
);
const scheduledTokensFor = (capability) => (
  capability.activation.mode === "scheduled" ? capability.projectedDailyTokens : 0
);

const displayRecord = (manifest, targetLabel) => ({
  id: adoptionIdFor(manifest.agent, manifest.capability),
  agentId: manifest.agent.id,
  agentName: manifest.agent.name,
  agentRole: manifest.agent.role,
  projectId: manifest.agent.projectId,
  sourceEnvironment: manifest.agent.sourceEnvironment,
  kind: manifest.capability.kind,
  capabilityId: manifest.capability.id,
  capabilityName: manifest.capability.name,
  description: manifest.capability.description,
  loadMode: manifest.capability.loadMode,
  activation: manifest.capability.activation,
  tokenBudget: manifest.policy.tokenBudget,
  usageLimits: manifest.capability.usageLimits,
  estimatedTokensPerUse: manifest.capability.estimatedTokensPerUse,
  projectedDailyTokens: manifest.capability.projectedDailyTokens,
  scheduledTokensPerDay: scheduledTokensFor(manifest.capability),
  permissionRisk: manifest.capability.permissionRisk,
  permissions: manifest.capability.permissions,
  targetLabel,
});

const exists = async (target) => {
  try {
    await fs.access(target);
    return true;
  } catch (error) {
    if (error && error.code === "ENOENT") return false;
    throw error;
  }
};

export function createAdoptionManager(options = {}) {
  if (!options.projectRoot) {
    throw new AdoptionError(500, "projectRoot must be injected.", "missing_project_root");
  }
  const projectRoot = path.resolve(options.projectRoot);
  const manifestRoot = path.resolve(projectRoot, ".agent-observatory", "adoptions");
  const planTtlMs = safeInteger(options.planTtlMs, "planTtlMs", 1, 60 * 60 * 1000, DEFAULT_PLAN_TTL_MS);
  const now = typeof options.now === "function" ? options.now : Date.now;
  const plans = new Map();
  const operations = new Map();

  const cleanup = () => {
    const cutoff = now() - planTtlMs;
    for (const [id, planned] of plans) {
      if (planned.createdAt < cutoff) plans.delete(id);
    }
  };

  const buildEntry = (agent, policy, tokenSummary, capability) => {
    const targetLabel = targetLabelFor(agent, capability);
    const targetPath = path.resolve(projectRoot, ...targetLabel.split("/"));
    const agentRoot = path.resolve(manifestRoot, agent.slug);
    if (path.dirname(targetPath) !== agentRoot || path.dirname(agentRoot) !== manifestRoot) {
      throw new AdoptionError(400, "Adoption target escaped the manifest directory.", "invalid_target");
    }
    const manifest = {
      schemaVersion: 2,
      managedBy: "agent-observatory",
      agent,
      capability,
      policy,
      tokenSummary: {
        perRunBudget: tokenSummary.perRunBudget,
        dailyBudget: tokenSummary.dailyBudget,
        estimatedTokensPerUse: capability.estimatedTokensPerUse,
        projectedDailyTokens: capability.projectedDailyTokens,
        scheduledTokensPerDay: scheduledTokensFor(capability),
      },
    };
    const content = JSON.stringify(manifest, null, 2) + "\n";
    return { targetPath, targetLabel, manifest, content, record: displayRecord(manifest, targetLabel) };
  };

  const plan = async (rawRequest) => {
    cleanup();
    const normalized = normalizeRequest(rawRequest);
    const entries = normalized.capabilities.map((capability) => (
      buildEntry(normalized.agent, normalized.policy, normalized.tokenSummary, capability)
    ));
    const targets = await Promise.all(entries.map(async (entry) => ({
      kind: entry.manifest.capability.kind,
      capabilityId: entry.manifest.capability.id,
      targetLabel: entry.targetLabel,
      exists: await exists(entry.targetPath),
    })));
    const planId = token();
    plans.set(planId, { entries, createdAt: now() });
    return {
      planId,
      ...(targets.length === 1 ? { targetLabel: targets[0].targetLabel } : {}),
      targetLabels: targets.map((target) => target.targetLabel),
      targets,
      exists: targets.some((target) => target.exists),
      expiresInSeconds: Math.floor(planTtlMs / 1_000),
      preview: {
        agent: normalized.agent,
        policy: normalized.policy,
        capabilities: normalized.capabilities,
        tokenSummary: normalized.tokenSummary,
        suppressedDuplicates: normalized.suppressedDuplicates,
        warnings: normalized.warnings,
      },
    };
  };

  const rollbackCreated = async (created) => {
    for (const entry of [...created].reverse()) {
      try {
        const current = await fs.readFile(entry.targetPath, "utf8");
        if (hash(current) === hash(entry.content)) await fs.unlink(entry.targetPath);
      } catch {
        // Rollback only files from this execution whose content still matches.
      }
    }
  };

  const execute = async (planId, confirmation, approvalHeader) => {
    cleanup();
    if (approvalHeader !== ADOPTION_APPROVAL_HEADER) {
      throw new AdoptionError(403, "The adoption approval header is required.", "approval_header_required");
    }
    if (confirmation !== "APPLY") {
      throw new AdoptionError(400, "Explicit APPLY confirmation is required.", "confirmation_required");
    }
    const planned = plans.get(planId);
    if (!planned) {
      throw new AdoptionError(404, "Plan expired or was not found.", "plan_not_found");
    }
    if ((await Promise.all(planned.entries.map((entry) => exists(entry.targetPath)))).some(Boolean)) {
      throw new AdoptionError(409, "At least one target already exists; no file was changed.", "target_exists");
    }

    const created = [];
    try {
      for (const entry of planned.entries) {
        await fs.mkdir(path.dirname(entry.targetPath), { recursive: true });
        await fs.writeFile(entry.targetPath, entry.content, { encoding: "utf8", flag: "wx", mode: 0o600 });
        created.push(entry);
      }
    } catch (error) {
      await rollbackCreated(created);
      if (error && error.code === "EEXIST") {
        throw new AdoptionError(409, "At least one target already exists; files from this execution were rolled back.", "target_exists");
      }
      throw error;
    }

    plans.delete(planId);
    const operationId = token(12);
    const undoToken = token();
    operations.set(operationId, {
      entries: created.map((entry) => ({
        targetPath: entry.targetPath,
        targetLabel: entry.targetLabel,
        contentHash: hash(entry.content),
      })),
      undoToken,
      undone: false,
    });
    const targetLabels = created.map((entry) => entry.targetLabel);
    const manifests = created.map((entry) => entry.manifest);
    const adoptionProfiles = created.map((entry) => entry.record);
    return {
      operationId,
      undoToken,
      status: "created",
      ...(created.length === 1 ? {
        targetLabel: targetLabels[0],
        manifest: manifests[0],
        adoptionProfile: adoptionProfiles[0],
      } : {}),
      targetLabels,
      manifests,
      adoptionProfiles,
    };
  };

  const undo = async (operationId, suppliedToken, approvalHeader) => {
    if (approvalHeader !== ADOPTION_APPROVAL_HEADER) {
      throw new AdoptionError(403, "The adoption approval header is required.", "approval_header_required");
    }
    const operation = operations.get(operationId);
    if (!operation || operation.undoToken !== suppliedToken) {
      throw new AdoptionError(404, "Undo operation was not found.", "undo_not_found");
    }
    if (operation.undone) {
      throw new AdoptionError(409, "Operation was already undone.", "already_undone");
    }
    for (const entry of operation.entries) {
      let current;
      try {
        current = await fs.readFile(entry.targetPath, "utf8");
      } catch (error) {
        if (error && error.code === "ENOENT") {
          throw new AdoptionError(409, "A created file is already missing.", "target_missing");
        }
        throw error;
      }
      if (hash(current) !== entry.contentHash) {
        throw new AdoptionError(409, "A created file changed after execution; undo was refused.", "target_changed");
      }
    }
    for (const entry of operation.entries) await fs.unlink(entry.targetPath);
    operation.undone = true;
    return {
      operationId,
      targetLabels: operation.entries.map((entry) => entry.targetLabel),
      status: "undone",
    };
  };

  const list = async () => {
    let agentDirectories;
    try {
      agentDirectories = await fs.readdir(manifestRoot, { withFileTypes: true });
    } catch (error) {
      if (error && error.code === "ENOENT") return [];
      throw error;
    }
    const records = [];
    for (const agentDirectory of agentDirectories) {
      if (!agentDirectory.isDirectory() || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(agentDirectory.name)) continue;
      const directoryPath = path.join(manifestRoot, agentDirectory.name);
      const files = await fs.readdir(directoryPath, { withFileTypes: true });
      for (const file of files) {
        if (!file.isFile() || !/^(skill|plugin|hook|mcp-server)--[a-z0-9][a-z0-9-]*\.json$/.test(file.name)) continue;
        try {
          const raw = JSON.parse(await fs.readFile(path.join(directoryPath, file.name), "utf8"));
          if (!raw || raw.schemaVersion !== 2 || raw.managedBy !== "agent-observatory") continue;
          const agent = normalizeAgent(raw.agent);
          const policy = normalizePolicy(raw.policy);
          const capability = normalizeAsset(raw.capability, 0, policy, { requirePermissionApproval: false });
          if (agent.slug !== agentDirectory.name) continue;
          const targetLabel = targetLabelFor(agent, capability);
          if (path.posix.basename(targetLabel) !== file.name) continue;
          const manifest = { ...raw, agent, capability, policy };
          records.push(displayRecord(manifest, targetLabel));
        } catch {
          // Ignore malformed or non-display-safe files instead of echoing their content.
        }
      }
    }
    return records.sort((left, right) => left.id.localeCompare(right.id));
  };

  return { plan, execute, undo, list };
}
