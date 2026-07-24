import { createHash, randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

const PLAN_TTL_MS = 10 * 60 * 1000;
const ACTIONS = new Set(["promote-shared", "apply-codex"]);

export class ActionError extends Error {
  constructor(statusCode, message, code = "action_error") {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

const token = (bytes = 18) => randomBytes(bytes).toString("base64url");
const hash = (value) => createHash("sha256").update(value).digest("hex");

const safeText = (value, maximum, field) => {
  if (typeof value !== "string") throw new ActionError(400, field + " must be text.", "invalid_profile");
  const cleaned = value.normalize("NFKC").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned || cleaned.length > maximum || cleaned.includes("://") || /[\\/]/.test(cleaned)) {
    throw new ActionError(400, field + " is not display-safe.", "invalid_profile");
  }
  return cleaned;
};

const safeList = (value, field, maximum = 16) => {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > maximum) throw new ActionError(400, field + " is invalid.", "invalid_profile");
  return [...new Set(value.map((item) => safeText(item, 80, field)))].sort();
};

const slug = (value) => {
  const normalized = value.normalize("NFKD").toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);
  if (normalized) return normalized;
  return "agent-" + hash(value).slice(0, 10);
};

const normalizeProfile = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ActionError(400, "profile is required.", "invalid_profile");
  const sourceEnvironment = safeText(value.sourceEnvironment || "claude", 24, "sourceEnvironment").toLocaleLowerCase();
  if (!new Set(["claude", "codex", "shared"]).has(sourceEnvironment)) throw new ActionError(400, "sourceEnvironment is invalid.", "invalid_profile");
  return {
    name: safeText(value.name, 96, "name"),
    description: safeText(value.description, 280, "description"),
    role: safeText(value.role || "subagent", 96, "role"),
    skills: safeList(value.skills, "skills", 20),
    sourceEnvironment,
    sourceProjectIds: safeList(value.sourceProjectIds, "sourceProjectIds", 40),
  };
};

const sharedContent = (profile) => [
  "---",
  "name: " + JSON.stringify(profile.name),
  "description: " + JSON.stringify(profile.description),
  "role: " + JSON.stringify(profile.role),
  "skills: " + JSON.stringify(profile.skills),
  "source_environment: " + JSON.stringify(profile.sourceEnvironment),
  "managed_by: agent-observatory",
  "---",
  "",
  "# " + profile.name,
  "",
  profile.description,
  "",
  "## Role",
  "",
  "- Primary role: `" + profile.role + "`",
  profile.skills.length ? "- Observed skills: " + profile.skills.map((skill) => "`" + skill + "`").join(", ") : "- Observed skills: none recorded",
  "- Source projects observed: " + profile.sourceProjectIds.length,
  "",
  "## Safety",
  "",
  "This definition was promoted from display-safe metadata. Review its instructions before granting write permissions or external access.",
  "",
].join("\n");

const codexContent = (profile) => {
  const instructions = [
    "You are " + profile.name + ".",
    profile.description,
    "Primary role: " + profile.role + ".",
    profile.skills.length ? "Use these locally installed skills when relevant: " + profile.skills.map((skill) => "$" + skill).join(", ") + "." : "No specific skill dependency was observed.",
    "This profile was translated from " + profile.sourceEnvironment + " metadata by Agent Observatory.",
    "Stay within the current workspace permissions and ask before consequential external actions.",
  ].join("\n\n");
  return [
    "name = " + JSON.stringify(profile.name),
    "description = " + JSON.stringify(profile.description),
    "developer_instructions = " + JSON.stringify(instructions),
    "",
  ].join("\n");
};

const exists = async (target) => {
  try { await fs.access(target); return true; } catch { return false; }
};

export function createActionManager(options = {}) {
  const codexRoot = path.resolve(options.codexRoot || path.join(os.homedir(), ".codex"));
  const agentsRoot = path.resolve(options.agentsRoot || path.join(os.homedir(), ".agents"));
  const plans = new Map();
  const operations = new Map();

  const cleanup = () => {
    const cutoff = Date.now() - PLAN_TTL_MS;
    for (const [id, plan] of plans) if (plan.createdAt < cutoff) plans.delete(id);
  };

  const plan = async (action, rawProfile) => {
    cleanup();
    if (!ACTIONS.has(action)) throw new ActionError(400, "Unsupported action.", "unsupported_action");
    const profile = normalizeProfile(rawProfile);
    const fileName = slug(profile.name) + (action === "apply-codex" ? ".toml" : ".md");
    const targetPath = action === "apply-codex"
      ? path.join(codexRoot, "agents", fileName)
      : path.join(agentsRoot, "agents", fileName);
    const content = action === "apply-codex" ? codexContent(profile) : sharedContent(profile);
    const planId = token();
    const targetLabel = action === "apply-codex" ? "~/.codex/agents/" + fileName : "~/.agents/agents/" + fileName;
    const targetExists = await exists(targetPath);
    plans.set(planId, { action, profile, targetPath, targetLabel, content, createdAt: Date.now() });
    return {
      planId,
      action,
      targetLabel,
      exists: targetExists,
      expiresInSeconds: Math.floor(PLAN_TTL_MS / 1000),
      preview: { name: profile.name, description: profile.description, role: profile.role, skills: profile.skills, format: action === "apply-codex" ? "Codex TOML" : "Shared Markdown" },
    };
  };

  const execute = async (planId, confirmation) => {
    cleanup();
    if (confirmation !== "APPLY") throw new ActionError(400, "Explicit APPLY confirmation is required.", "confirmation_required");
    const planned = plans.get(planId);
    if (!planned) throw new ActionError(404, "Plan expired or was not found.", "plan_not_found");
    await fs.mkdir(path.dirname(planned.targetPath), { recursive: true });
    try {
      await fs.writeFile(planned.targetPath, planned.content, { encoding: "utf8", flag: "wx", mode: 0o600 });
    } catch (error) {
      if (error && error.code === "EEXIST") throw new ActionError(409, "Target already exists; no file was changed.", "target_exists");
      throw error;
    }
    plans.delete(planId);
    const operationId = token(12);
    const undoToken = token();
    operations.set(operationId, { targetPath: planned.targetPath, targetLabel: planned.targetLabel, contentHash: hash(planned.content), undoToken, undone: false });
    return { operationId, undoToken, targetLabel: planned.targetLabel, action: planned.action, status: "created" };
  };

  const undo = async (operationId, suppliedToken) => {
    const operation = operations.get(operationId);
    if (!operation || operation.undoToken !== suppliedToken) throw new ActionError(404, "Undo operation was not found.", "undo_not_found");
    if (operation.undone) throw new ActionError(409, "Operation was already undone.", "already_undone");
    let current;
    try { current = await fs.readFile(operation.targetPath, "utf8"); } catch (error) {
      if (error && error.code === "ENOENT") throw new ActionError(409, "Created file is already missing.", "target_missing");
      throw error;
    }
    if (hash(current) !== operation.contentHash) throw new ActionError(409, "Created file changed after execution; undo was refused.", "target_changed");
    await fs.unlink(operation.targetPath);
    operation.undone = true;
    return { operationId, targetLabel: operation.targetLabel, status: "undone" };
  };

  return { plan, execute, undo };
}

export function isAllowedLocalOrigin(origin) {
  if (!origin) return true;
  try {
    const url = new URL(origin);
    return (url.hostname === "127.0.0.1" || url.hostname === "localhost" || url.hostname === "[::1]") && (url.protocol === "http:" || url.protocol === "https:");
  } catch { return false; }
}

export async function readJsonBody(request, maximumBytes = 64 * 1024) {
  const declared = Number.parseInt(request.headers["content-length"] || "0", 10);
  if (declared > maximumBytes) throw new ActionError(413, "Request body is too large.", "body_too_large");
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maximumBytes) throw new ActionError(413, "Request body is too large.", "body_too_large");
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); }
  catch { throw new ActionError(400, "Request body must be valid JSON.", "invalid_json"); }
}
