import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

const MAX_SESSION_FILES = 2_000;
const MAX_PREFIX_BYTES = 512 * 1024;
const MAX_LINES = 160;
const UUID_LIKE = /^[a-z0-9][a-z0-9_-]{5,}$/i;

const stableId = (...parts) =>
  createHash("sha256").update(parts.join(":")).digest("hex").slice(0, 14);

const safeText = (value, fallback = "") => {
  if (typeof value !== "string") return fallback;
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/[\\/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
};

const safeBasename = (value, fallback = "Local project") => {
  if (typeof value !== "string" || !value.trim()) return fallback;
  const normalized = value.replace(/[\\/]+$/, "");
  const base = path.basename(normalized);
  if (base.toLocaleLowerCase("en-US") === path.basename(os.homedir()).toLocaleLowerCase("en-US")) return fallback;
  const cleaned = safeText(base);
  if (!cleaned || cleaned === "." || /^[a-z]:$/i.test(cleaned)) return fallback;
  return cleaned;
};

const safeTimestamp = (value, fallback) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(value > 10_000_000_000 ? value : value * 1_000);
    if (!Number.isNaN(date.valueOf())) return date.toISOString();
  }
  if (typeof value === "string") {
    const date = new Date(value);
    if (!Number.isNaN(date.valueOf())) return date.toISOString();
  }
  return fallback;
};

const exists = async (target) => {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
};

const listFiles = async (root, accept) => {
  const result = [];
  const queue = [root];

  while (queue.length && result.length < MAX_SESSION_FILES) {
    const directory = queue.shift();
    let entries = [];
    try {
      entries = await fs.readdir(directory, { withFileTypes: true });
    } catch {
      continue;
    }
    entries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      if (result.length >= MAX_SESSION_FILES) break;
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
      } else if (entry.isFile() && accept(fullPath, entry.name)) {
        result.push(fullPath);
      }
    }
  }
  return result;
};

const readPrefix = async (file) => {
  let handle;
  try {
    handle = await fs.open(file, "r");
    const buffer = Buffer.alloc(MAX_PREFIX_BYTES);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    return buffer.subarray(0, bytesRead).toString("utf8");
  } catch {
    return "";
  } finally {
    await handle?.close().catch(() => {});
  }
};

const safeRecords = async (file) => {
  const prefix = await readPrefix(file);
  const records = [];
  for (const line of prefix.split(/\r?\n/).slice(0, MAX_LINES)) {
    if (!line || line.length > 256 * 1024) continue;
    try {
      const parsed = JSON.parse(line);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        records.push(parsed);
      }
    } catch {
      // Ignore partial or non-JSON lines.
    }
  }
  return records;
};

const fileTimestamp = async (file) => {
  try {
    return (await fs.stat(file)).mtime.toISOString();
  } catch {
    return new Date(0).toISOString();
  }
};

const projectRecord = (environment, key, label) => ({
  id: `project-${stableId(environment, key)}`,
  environment,
  label,
  pathLabel: label,
  sessionCount: 0,
  subagentCount: 0,
  lastObservedAt: new Date(0).toISOString(),
});

const sessionRecord = ({
  environment,
  rawId,
  projectId,
  kind,
  parentSessionId,
  label,
  role,
  observedAt,
  source,
}) => ({
  id: `session-${stableId(environment, rawId)}`,
  environment,
  projectId,
  kind,
  ...(parentSessionId
    ? { parentSessionId: `session-${stableId(environment, parentSessionId)}` }
    : {}),
  label: safeText(label, `${environment} session ${String(rawId).slice(0, 8)}`),
  role: safeText(role, kind === "subagent" ? "subagent" : "primary"),
  observedAt,
  source,
});

const scanCodex = async (codexRoot) => {
  const sessionRoot = path.join(codexRoot, "sessions");
  const installed = await exists(codexRoot);
  if (!installed) return { installed, projects: [], sessions: [] };

  const files = await listFiles(
    sessionRoot,
    (_fullPath, name) => name.toLowerCase().endsWith(".jsonl"),
  );
  const projects = new Map();
  const sessions = new Map();

  for (const file of files) {
    const records = await safeRecords(file);
    const meta = records.find(
      (record) =>
        record.type === "session_meta" &&
        record.payload &&
        typeof record.payload === "object",
    );
    if (!meta) continue;

    const payload = meta.payload;
    const rawId = safeText(payload.session_id || payload.id || path.basename(file, ".jsonl"));
    if (!rawId || !UUID_LIKE.test(rawId)) continue;
    const projectKey =
      typeof payload.cwd === "string" && payload.cwd
        ? payload.cwd.toLocaleLowerCase("en-US")
        : "local";
    const projectLabel = safeBasename(payload.cwd, "Codex global");
    let project = projects.get(projectKey);
    if (!project) {
      project = projectRecord("codex", projectKey, projectLabel);
      projects.set(projectKey, project);
    }

    const subagentSource =
      payload.source &&
      typeof payload.source === "object" &&
      !Array.isArray(payload.source)
        ? payload.source.subagent
        : undefined;
    const spawn =
      subagentSource &&
      typeof subagentSource === "object" &&
      !Array.isArray(subagentSource)
        ? subagentSource.thread_spawn
        : undefined;
    const isSubagent = Boolean(subagentSource);
    const parentRawId =
      spawn && typeof spawn === "object"
        ? spawn.parent_thread_id
        : payload.parent_thread_id || payload.forked_from_id;
    const nickname =
      spawn && typeof spawn === "object" ? spawn.agent_nickname : payload.agent_nickname;
    const role =
      spawn && typeof spawn === "object" ? spawn.agent_role : payload.agent_role;
    const observedAt = safeTimestamp(
      payload.timestamp || meta.timestamp,
      await fileTimestamp(file),
    );
    const session = sessionRecord({
      environment: "codex",
      rawId,
      projectId: project.id,
      kind: isSubagent ? "subagent" : "primary",
      parentSessionId: safeText(parentRawId),
      label: nickname || (isSubagent ? `Codex subagent ${rawId.slice(0, 8)}` : `Codex session ${rawId.slice(0, 8)}`),
      role: role || (isSubagent ? "subagent" : "primary"),
      observedAt,
      source: "codex-session-meta",
    });
    sessions.set(session.id, session);
  }

  return {
    installed,
    projects: [...projects.values()],
    sessions: [...sessions.values()],
  };
};

const claudeFallbackLabel = (token) => {
  if (/^[a-z]--users-[^-]+$/i.test(token)) return "Claude global";
  const withoutDrive = token.replace(/^[a-z]--/i, "");
  const pieces = withoutDrive.split(/--+/).filter(Boolean);
  return safeText(pieces.at(-1) || token, "Claude project");
};

const safeClaudeMetadata = async (file) => {
  const records = await safeRecords(file);
  const candidate = records.find(
    (record) =>
      typeof record.sessionId === "string" ||
      typeof record.cwd === "string" ||
      typeof record.agentId === "string",
  );
  return candidate ?? records[0] ?? {};
};

const scanClaude = async (claudeRoot) => {
  const projectsRoot = path.join(claudeRoot, "projects");
  const installed = await exists(claudeRoot);
  if (!installed) return { installed, projects: [], sessions: [] };

  let projectDirectories = [];
  try {
    projectDirectories = (await fs.readdir(projectsRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .sort((left, right) => left.name.localeCompare(right.name));
  } catch {
    return { installed, projects: [], sessions: [] };
  }

  const projects = [];
  const sessions = new Map();

  for (const directory of projectDirectories.slice(0, 500)) {
    const projectPath = path.join(projectsRoot, directory.name);
    const files = await listFiles(
      projectPath,
      (_fullPath, name) => name.toLowerCase().endsWith(".jsonl"),
    );
    const topLevel = files.filter((file) => path.dirname(file) === projectPath);
    const nestedAgents = files.filter(
      (file) =>
        file.toLowerCase().includes(`${path.sep}subagents${path.sep}`) &&
        path.basename(file).toLowerCase().startsWith("agent-"),
    );

    let detectedLabel = "";
    for (const file of topLevel.slice(0, 8)) {
      const metadata = await safeClaudeMetadata(file);
      if (typeof metadata.cwd === "string") {
        detectedLabel = safeBasename(metadata.cwd, "");
        if (detectedLabel) break;
      }
    }
    const label = detectedLabel || claudeFallbackLabel(directory.name);
    const project = projectRecord("claude", directory.name, label);
    projects.push(project);

    for (const file of topLevel) {
      const metadata = await safeClaudeMetadata(file);
      const rawId = safeText(
        metadata.sessionId || path.basename(file, ".jsonl"),
      );
      if (!rawId || !UUID_LIKE.test(rawId)) continue;
      const observedAt = safeTimestamp(
        metadata.timestamp,
        await fileTimestamp(file),
      );
      const session = sessionRecord({
        environment: "claude",
        rawId,
        projectId: project.id,
        kind: "primary",
        label: `Claude session ${rawId.slice(0, 8)}`,
        role: "primary",
        observedAt,
        source: "claude-project-session",
      });
      sessions.set(session.id, session);
    }

    for (const file of nestedAgents) {
      const metadata = await safeClaudeMetadata(file);
      const rawId = safeText(
        metadata.agentId || path.basename(file, ".jsonl").replace(/^agent-/i, ""),
      );
      if (!rawId) continue;
      const relative = path.relative(projectPath, file).split(path.sep);
      const subagentsIndex = relative.findIndex(
        (segment) => segment.toLowerCase() === "subagents",
      );
      const parentRawId =
        subagentsIndex > 0 ? relative[subagentsIndex - 1] : metadata.sessionId;
      let role = safeText(metadata.slug, "subagent");
      const metaPath = file.replace(/\.jsonl$/i, ".meta.json");
      try {
        const meta = JSON.parse(await fs.readFile(metaPath, "utf8"));
        if (typeof meta.agentType === "string") role = safeText(meta.agentType, role);
      } catch {
        // Metadata is optional.
      }
      const observedAt = safeTimestamp(
        metadata.timestamp,
        await fileTimestamp(file),
      );
      const session = sessionRecord({
        environment: "claude",
        rawId,
        projectId: project.id,
        kind: "subagent",
        parentSessionId: safeText(parentRawId),
        label: role !== "subagent" ? role : `Claude subagent ${rawId.slice(0, 8)}`,
        role,
        observedAt,
        source: "claude-subagent-meta",
      });
      sessions.set(session.id, session);
    }
  }

  return { installed, projects, sessions: [...sessions.values()] };
};

const finalizeProjects = (projects, sessions) => {
  const byId = new Map(projects.map((project) => [project.id, { ...project }]));
  for (const session of sessions) {
    const project = byId.get(session.projectId);
    if (!project) continue;
    project.sessionCount += 1;
    if (session.kind === "subagent") project.subagentCount += 1;
    if (session.observedAt > project.lastObservedAt) {
      project.lastObservedAt = session.observedAt;
    }
  }
  return [...byId.values()].sort(
    (left, right) =>
      right.lastObservedAt.localeCompare(left.lastObservedAt) ||
      left.label.localeCompare(right.label),
  );
};

export async function scanEnvironments(options = {}) {
  const codexRoot =
    options.codexRoot ||
    process.env.AGENT_OBSERVATORY_CODEX_HOME ||
    path.join(os.homedir(), ".codex");
  const claudeRoot =
    options.claudeRoot ||
    process.env.AGENT_OBSERVATORY_CLAUDE_HOME ||
    path.join(os.homedir(), ".claude");
  const [codex, claude] = await Promise.all([
    scanCodex(path.resolve(codexRoot)),
    scanClaude(path.resolve(claudeRoot)),
  ]);
  const sessions = [...codex.sessions, ...claude.sessions].sort(
    (left, right) =>
      right.observedAt.localeCompare(left.observedAt) ||
      left.label.localeCompare(right.label),
  );
  const projects = finalizeProjects(
    [...codex.projects, ...claude.projects],
    sessions,
  );
  const environments = [
    {
      id: "codex",
      label: "Codex",
      installed: codex.installed,
      capabilities: ["projects", "sessions", "subagents", "skills", "plugins", "mcp"],
    },
    {
      id: "claude",
      label: "Claude",
      installed: claude.installed,
      capabilities: ["projects", "sessions", "subagents", "skills", "plugins", "mcp"],
    },
  ].map((environment) => ({
    ...environment,
    projectCount: projects.filter(
      (project) => project.environment === environment.id,
    ).length,
    sessionCount: sessions.filter(
      (session) => session.environment === environment.id,
    ).length,
    subagentCount: sessions.filter(
      (session) =>
        session.environment === environment.id && session.kind === "subagent",
    ).length,
  }));

  return { environments, projects, sessions };
}
