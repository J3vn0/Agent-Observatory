import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { inferProgrammingTags } from "./tags.js";

const CONFIG_EXTENSIONS = new Set([".json", ".toml", ".yaml", ".yml"]);
const AGENT_EXTENSIONS = new Set([".json", ".toml", ".yaml", ".yml", ".md"]);
const IGNORED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  "logs",
  "sessions",
  "tmp",
  "temp",
]);
const MAX_FILES = 50_000;
const MAX_CONFIG_BYTES = 1_048_576;
const REDACTED_FIELDS = [
  "args",
  "command",
  "credentials",
  "env",
  "headers",
  "hashes",
  "secrets",
  "tokens",
  "urls",
];
const TRANSPORTS = new Set(["stdio", "http", "sse", "websocket"]);

const normalizeKey = (value) => value.trim().toLowerCase().replace(/[-_]/g, "");

const isHashLike = (value) =>
  /(?:^|[^a-z0-9])[a-f0-9]{12,}(?:$|[^a-z0-9])/i.test(value) ||
  /^[A-Za-z0-9+/=_-]{32,}$/.test(value);

const sanitizeName = (value, fallback = "unnamed") => {
  if (typeof value !== "string") {
    return fallback;
  }

  const cleaned = value
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 96);

  if (
    !cleaned ||
    cleaned.includes("://") ||
    /^bearer\s/i.test(cleaned) ||
    isHashLike(cleaned)
  ) {
    return fallback;
  }

  return cleaned;
};

const sanitizePathSegment = (segment) => {
  const cleaned = sanitizeName(segment, "[redacted]");
  return isHashLike(cleaned) ? "[id]" : cleaned;
};

const sanitizeRelativePath = (rootName, relativePath) => {
  const segments = relativePath
    .split(/[\\/]+/)
    .filter(Boolean)
    .map(sanitizePathSegment);
  return [rootName, ...segments].join("/");
};

const slug = (value) => {
  const normalized = value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return normalized || "item";
};

const stripQuotes = (value) =>
  value.replace(/^["']|["']$/g, "").trim();

const boolFromValue = (value, defaultValue = true) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (/^\s*true\s*$/i.test(value)) return true;
    if (/^\s*false\s*$/i.test(value)) return false;
  }

  return defaultValue;
};

const enabledFromObject = (value) => {
  if (typeof value === "boolean") {
    return value;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return true;
  }
  if (typeof value.enabled === "boolean") {
    return value.enabled;
  }
  if (typeof value.disabled === "boolean") {
    return !value.disabled;
  }
  return true;
};

const transportFromObject = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "unknown";
  }

  for (const key of ["transport", "type"]) {
    const candidate =
      typeof value[key] === "string" ? value[key].toLowerCase() : "";
    if (TRANSPORTS.has(candidate)) {
      return candidate;
    }
  }

  if (Object.hasOwn(value, "command") || Object.hasOwn(value, "args")) {
    return "stdio";
  }
  if (Object.hasOwn(value, "url")) {
    return "http";
  }
  return "unknown";
};

const mergeTransport = (left, right) =>
  left === "unknown" ? right : left;

const emptyDiscovery = () => ({
  agents: [],
  plugins: [],
  mcps: [],
  hooks: [],
});

const addNamedEntries = (target, value, mapEntry) => {
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === "string") {
        target.push(mapEntry(item, true));
      } else if (item && typeof item === "object") {
        const name =
          typeof item.name === "string"
            ? item.name
            : typeof item.id === "string"
              ? item.id
              : "";
        if (name) target.push(mapEntry(name, item));
      }
    }
    return;
  }

  if (value && typeof value === "object") {
    for (const [name, item] of Object.entries(value)) {
      target.push(mapEntry(name, item));
    }
  }
};

const discoverPluginHooks = (result, pluginName, pluginValue) => {
  if (!pluginValue || typeof pluginValue !== "object" || Array.isArray(pluginValue)) {
    return;
  }
  const hooks = pluginValue.hooks ?? pluginValue.pluginHooks;
  addNamedEntries(result.hooks, hooks, (name, value) => ({
    name,
    plugin: pluginName,
    enabled: enabledFromObject(value),
  }));
};

const discoverFromJson = (content) => {
  const result = emptyDiscovery();
  let document;

  try {
    document = JSON.parse(content);
  } catch {
    return result;
  }

  if (!document || typeof document !== "object" || Array.isArray(document)) {
    return result;
  }

  const mcpContainers = [
    document.mcpServers,
    document.mcp_servers,
    document.mcp?.servers,
  ];
  for (const container of mcpContainers) {
    addNamedEntries(result.mcps, container, (name, value) => ({
      name,
      enabled: enabledFromObject(value),
      transport: transportFromObject(value),
    }));
  }

  for (const container of [document.plugins, document.plugin]) {
    addNamedEntries(result.plugins, container, (name, value) => {
      discoverPluginHooks(result, name, value);
      return {
        name,
        enabled: enabledFromObject(value),
      };
    });
  }

  for (const container of [document.hooks, document.pluginHooks]) {
    addNamedEntries(result.hooks, container, (name, value) => ({
      name,
      enabled: enabledFromObject(value),
    }));
  }

  addNamedEntries(result.agents, document.agents, (name, value) => ({
    name,
    enabled: enabledFromObject(value),
  }));

  return result;
};

const tomlSectionParts = (section) =>
  section
    .split(".")
    .map(stripQuotes)
    .filter(Boolean);

const classifySection = (parts) => {
  const normalized = parts.map(normalizeKey);
  if (
    (normalized[0] === "mcpservers" && parts[1]) ||
    (normalized[0] === "mcp" && normalized[1] === "servers" && parts[2])
  ) {
    return {
      kind: "mcp",
      name: normalized[0] === "mcp" ? parts[2] : parts[1],
    };
  }
  if ((normalized[0] === "plugins" || normalized[0] === "plugin") && parts[1]) {
    const hooksIndex = normalized.findIndex((part) =>
      part === "hooks" || part === "pluginhooks"
    );
    if (hooksIndex >= 0) {
      return {
        kind: "hook",
        plugin: parts[1],
        name: parts[hooksIndex + 1] || "hooks",
      };
    }
    return { kind: "plugin", name: parts[1] };
  }
  if (
    normalized[0] === "hooks" ||
    normalized[0] === "pluginhooks"
  ) {
    return { kind: "hook", name: parts[1] || "hooks" };
  }
  if (normalized[0] === "agents" && parts[1]) {
    return { kind: "agent", name: parts[1] };
  }
  return null;
};

const discoverFromToml = (content) => {
  const result = emptyDiscovery();
  let current = null;
  let record = null;

  const flush = () => {
    if (!current || !record) return;
    const output = {
      name: current.name,
      enabled: record.enabled,
    };
    if (current.kind === "mcp") {
      result.mcps.push({ ...output, transport: record.transport });
    } else if (current.kind === "plugin") {
      result.plugins.push(output);
    } else if (current.kind === "hook") {
      result.hooks.push({ ...output, plugin: current.plugin });
    } else if (current.kind === "agent") {
      result.agents.push(output);
    }
  };

  for (const line of content.split(/\r?\n/)) {
    const sectionMatch = line.match(/^\s*\[\[?([^\]]+)\]\]?\s*(?:#.*)?$/);
    if (sectionMatch) {
      flush();
      current = classifySection(tomlSectionParts(sectionMatch[1]));
      record = current
        ? { enabled: true, transport: "unknown" }
        : null;
      continue;
    }

    const keyMatch = line.match(/^\s*(?:"([^"]+)"|'([^']+)'|([A-Za-z0-9_.@/-]+))\s*=\s*(.*)$/);
    if (!keyMatch) continue;
    const key = keyMatch[1] || keyMatch[2] || keyMatch[3];
    const rawValue = keyMatch[4];
    const normalizedKey = normalizeKey(key);

    if (!current) {
      continue;
    }
    if (normalizedKey === "enabled") {
      record.enabled = boolFromValue(rawValue, true);
    } else if (normalizedKey === "disabled") {
      record.enabled = !boolFromValue(rawValue, false);
    } else if (
      current.kind === "mcp" &&
      (normalizedKey === "transport" || normalizedKey === "type")
    ) {
      const candidate = stripQuotes(rawValue).toLowerCase();
      if (TRANSPORTS.has(candidate)) record.transport = candidate;
    } else if (
      current.kind === "mcp" &&
      (normalizedKey === "command" || normalizedKey === "args")
    ) {
      record.transport = mergeTransport(record.transport, "stdio");
    } else if (current.kind === "mcp" && normalizedKey === "url") {
      record.transport = mergeTransport(record.transport, "http");
    }
  }
  flush();

  // Root tables such as [plugins] and [hooks] encode names as keys.
  let rootSection = "";
  for (const line of content.split(/\r?\n/)) {
    const sectionMatch = line.match(/^\s*\[\[?([^\]]+)\]\]?\s*(?:#.*)?$/);
    if (sectionMatch) {
      const parts = tomlSectionParts(sectionMatch[1]);
      rootSection = parts.length === 1 ? normalizeKey(parts[0]) : "";
      continue;
    }
    const keyMatch = line.match(/^\s*(?:"([^"]+)"|'([^']+)'|([A-Za-z0-9_.@/-]+))\s*=\s*(.*)$/);
    if (!keyMatch) continue;
    const name = keyMatch[1] || keyMatch[2] || keyMatch[3];
    const rawValue = keyMatch[4];
    if (rootSection === "plugins" || rootSection === "plugin") {
      result.plugins.push({
        name,
        enabled: boolFromValue(rawValue, true),
      });
    } else if (rootSection === "hooks" || rootSection === "pluginhooks") {
      result.hooks.push({
        name,
        enabled: boolFromValue(rawValue, true),
      });
    } else if (rootSection === "agents") {
      result.agents.push({
        name,
        enabled: boolFromValue(rawValue, true),
      });
    } else if (rootSection === "mcpservers") {
      result.mcps.push({
        name,
        enabled: true,
        transport: /\b(?:command|args)\s*=/i.test(rawValue)
          ? "stdio"
          : /\burl\s*=/i.test(rawValue)
            ? "http"
            : "unknown",
      });
    }
  }

  return result;
};

const yamlEntries = (content) => {
  const entries = [];
  const stack = [];

  for (const line of content.split(/\r?\n/)) {
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const match = line.match(/^(\s*)(?:"([^"]+)"|'([^']+)'|([A-Za-z0-9_.@/-]+))\s*:\s*(.*)$/);
    if (!match) continue;
    const indent = match[1].replace(/\t/g, "  ").length;
    const key = match[2] || match[3] || match[4];
    const rawValue = match[5];
    while (stack.length && stack.at(-1).indent >= indent) stack.pop();
    const parts = [...stack.map((item) => item.key), key];
    entries.push({ parts, rawValue });
    if (!rawValue.trim()) stack.push({ indent, key });
  }

  return entries;
};

const discoverFromYaml = (content) => {
  const result = emptyDiscovery();
  const records = new Map();

  const getRecord = (kind, name, plugin) => {
    const key = `${kind}:${plugin || ""}:${name}`;
    if (!records.has(key)) {
      records.set(key, {
        kind,
        name,
        plugin,
        enabled: true,
        transport: "unknown",
      });
    }
    return records.get(key);
  };

  for (const { parts, rawValue } of yamlEntries(content)) {
    const normalized = parts.map(normalizeKey);
    let kind = "";
    let name = "";
    let plugin;
    let propertyIndex;

    if (normalized[0] === "mcpservers" && parts[1]) {
      kind = "mcp";
      name = parts[1];
      propertyIndex = 2;
    } else if (
      (normalized[0] === "plugins" || normalized[0] === "plugin") &&
      parts[1]
    ) {
      const hooksIndex = normalized.findIndex((part) =>
        part === "hooks" || part === "pluginhooks"
      );
      if (hooksIndex >= 0 && parts[hooksIndex + 1]) {
        kind = "hook";
        plugin = parts[1];
        name = parts[hooksIndex + 1];
        propertyIndex = hooksIndex + 2;
      } else {
        kind = "plugin";
        name = parts[1];
        propertyIndex = 2;
      }
    } else if (
      (normalized[0] === "hooks" || normalized[0] === "pluginhooks") &&
      parts[1]
    ) {
      kind = "hook";
      name = parts[1];
      propertyIndex = 2;
    } else if (normalized[0] === "agents" && parts[1]) {
      kind = "agent";
      name = parts[1];
      propertyIndex = 2;
    }

    if (!kind) continue;
    const record = getRecord(kind, name, plugin);
    const property = normalized[propertyIndex] || "";
    if (property === "enabled") {
      record.enabled = boolFromValue(rawValue, true);
    } else if (property === "disabled") {
      record.enabled = !boolFromValue(rawValue, false);
    } else if (
      kind === "mcp" &&
      (property === "transport" || property === "type")
    ) {
      const candidate = stripQuotes(rawValue).toLowerCase();
      if (TRANSPORTS.has(candidate)) record.transport = candidate;
    } else if (
      kind === "mcp" &&
      (property === "command" || property === "args")
    ) {
      record.transport = mergeTransport(record.transport, "stdio");
    } else if (kind === "mcp" && property === "url") {
      record.transport = mergeTransport(record.transport, "http");
    }
  }

  for (const record of records.values()) {
    if (record.kind === "mcp") {
      result.mcps.push({
        name: record.name,
        enabled: record.enabled,
        transport: record.transport,
      });
    } else {
      result[`${record.kind}s`].push({
        name: record.name,
        enabled: record.enabled,
        plugin: record.plugin,
      });
    }
  }
  return result;
};

const discoverFromConfig = (extension, content) => {
  if (extension === ".json") return discoverFromJson(content);
  if (extension === ".toml") return discoverFromToml(content);
  if (extension === ".yaml" || extension === ".yml") {
    return discoverFromYaml(content);
  }
  return emptyDiscovery();
};

const isAgentConfig = (relativePath) => {
  const parsed = path.parse(relativePath);
  const normalizedBase = parsed.base.toLowerCase();
  const segments = relativePath.toLowerCase().split(/[\\/]+/);
  return (
    normalizedBase === "agents.md" ||
    /^agents?(?:\.config)?\.(?:json|toml|ya?ml|md)$/.test(normalizedBase) ||
    (segments.includes("agents") && AGENT_EXTENSIONS.has(parsed.ext.toLowerCase()))
  );
};

const isConfigCandidate = (relativePath) => {
  const parsed = path.parse(relativePath);
  const base = parsed.base.toLowerCase();
  if (!CONFIG_EXTENSIONS.has(parsed.ext.toLowerCase())) return false;
  return (
    isAgentConfig(relativePath) ||
    /^(?:config|settings|plugins?|hooks?|mcp(?:-servers?)?)\.(?:json|toml|ya?ml)$/.test(base) ||
    base === ".mcp.json"
  );
};

const originFor = (rootName, relativePath, isConfig = false) => {
  if (isConfig) return "config";
  if (/(?:^|[\\/])plugins?[\\/]cache(?:[\\/]|$)/i.test(relativePath)) {
    return "plugin-cache";
  }
  return rootName;
};

const walkRoot = async (rootName, rootPath) => {
  const files = [];
  let visited = 0;
  let truncated = false;
  let available = true;
  const queue = [rootPath];

  try {
    await fs.access(rootPath);
  } catch {
    return { files, visited, truncated, available: false };
  }

  while (queue.length && visited < MAX_FILES) {
    const directory = queue.shift();
    let entries;
    try {
      entries = await fs.readdir(directory, { withFileTypes: true });
    } catch {
      continue;
    }
    entries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      if (visited >= MAX_FILES) {
        truncated = true;
        break;
      }
      const fullPath = path.join(directory, entry.name);
      const relativePath = path.relative(rootPath, fullPath);
      if (entry.isDirectory()) {
        if (!IGNORED_DIRECTORIES.has(entry.name.toLowerCase())) {
          queue.push(fullPath);
        }
      } else if (entry.isFile()) {
        visited += 1;
        if (
          entry.name.toLowerCase() === "skill.md" ||
          isAgentConfig(relativePath) ||
          isConfigCandidate(relativePath)
        ) {
          files.push({
            rootName,
            fullPath,
            relativePath,
          });
        }
      }
    }
  }

  if (queue.length) truncated = true;
  return { files, visited, truncated, available };
};

const createCollector = () => {
  const records = new Map();

  const upsert = (kind, name, details = {}) => {
    const safe = sanitizeName(name);
    const canonical = `${kind}:${safe.toLocaleLowerCase("en-US")}`;
    const existing = records.get(canonical);
    if (existing) {
      existing.enabled = existing.enabled && details.enabled !== false;
      existing.paths = [...new Set([...existing.paths, ...(details.paths || [])])];
      existing.roots = [...new Set([...existing.roots, ...(details.roots || [])])];
      existing.configCount += details.configCount || 0;
      existing.transport = mergeTransport(
        existing.transport,
        details.transport || "unknown",
      );
      existing.origin =
        existing.origin === details.origin ? existing.origin : existing.origin;
      return existing;
    }

    const record = {
      key: canonical,
      kind,
      name: safe,
      enabled: details.enabled !== false,
      paths: [...new Set(details.paths || [])],
      roots: [...new Set(details.roots || [])],
      configCount: details.configCount || 0,
      transport: details.transport || "unknown",
      origin: details.origin,
      plugin: details.plugin ? sanitizeName(details.plugin) : undefined,
      configType: details.configType,
    };
    records.set(canonical, record);
    return record;
  };

  return { records, upsert };
};

const configTypeFor = (relativePath) => {
  const extension = path.extname(relativePath).toLowerCase();
  return extension === ".md" ? "markdown" : extension.slice(1);
};

const sortRecords = (records) =>
  [...records.values()].sort(
    (left, right) =>
      left.kind.localeCompare(right.kind) ||
      left.name.localeCompare(right.name) ||
      left.key.localeCompare(right.key),
  );

const makeNode = (record, id) => {
  const paths = [...record.paths].sort();
  const roots = [...record.roots].sort();
  const tags = inferProgrammingTags(
    record.name,
    ...paths.map((item) =>
      item
        .split("/")
        .filter((segment) => !["codex", "agents", "skills", "plugins", "cache"].includes(segment))
        .join(" "),
    ),
  );
  const metadata = {};
  if (paths.length) metadata.locationCount = paths.length;
  if (roots.length) metadata.roots = roots;
  if (record.configCount) metadata.configCount = record.configCount;
  if (record.configType) metadata.configType = record.configType;
  if (record.kind === "mcp-server") metadata.transport = record.transport;
  if (record.kind === "hook" && record.plugin) metadata.plugin = record.plugin;

  const summaries = {
    agent: "Local agent configuration discovered.",
    skill: `Local skill discovered in ${paths.length} location${paths.length === 1 ? "" : "s"}.`,
    plugin: "Local plugin configuration discovered.",
    hook: "Local hook configuration discovered.",
    "mcp-server": `Local MCP server configuration with ${record.transport} transport.`,
    provider: "Local configuration root.",
  };

  return {
    id,
    label: record.name,
    kind: record.kind,
    health: record.enabled ? "healthy" : "attention",
    summary: summaries[record.kind],
    tags,
    source:
      record.kind === "mcp-server"
        ? record.transport
        : record.kind === "provider"
          ? "Local"
          : "Local configuration",
    ...(record.origin ? { origin: record.origin } : {}),
    enabled: record.enabled,
    programming: tags.length > 0,
    ...(paths[0] ? { path: paths[0] } : {}),
    metadata,
  };
};

/**
 * Scan local Codex and Agents homes without returning arbitrary config values.
 * The result is structurally compatible with ObservatorySnapshot.
 */
export async function scanObservatory(options = {}) {
  const startedAt = Date.now();
  const codexRoot =
    options.codexRoot ||
    process.env.AGENT_OBSERVATORY_CODEX_HOME ||
    path.join(os.homedir(), ".codex");
  const agentsRoot =
    options.agentsRoot ||
    process.env.AGENT_OBSERVATORY_AGENTS_HOME ||
    path.join(os.homedir(), ".agents");

  const rootSpecs = [
    { name: "codex", path: path.resolve(codexRoot) },
    { name: "agents", path: path.resolve(agentsRoot) },
  ];
  const scans = await Promise.all(
    rootSpecs.map((root) => walkRoot(root.name, root.path)),
  );
  const collector = createCollector();
  const scannedPaths = new Set();
  const pendingHookEdges = [];

  rootSpecs.forEach((root, index) => {
    const scan = scans[index];
    collector.upsert("provider", root.name, {
      enabled: scan.available,
      roots: [root.name],
      origin: root.name,
    });
  });

  const files = scans
    .flatMap((scan) => scan.files)
    .sort(
      (left, right) =>
        left.rootName.localeCompare(right.rootName) ||
        left.relativePath.localeCompare(right.relativePath),
    );

  for (const file of files) {
    const safePath = sanitizeRelativePath(file.rootName, file.relativePath);
    scannedPaths.add(safePath);
    const base = path.basename(file.relativePath).toLowerCase();

    if (base === "skill.md") {
      const skillName = path.basename(path.dirname(file.relativePath));
      collector.upsert("skill", skillName, {
        paths: [safePath],
        roots: [file.rootName],
        origin: originFor(file.rootName, file.relativePath),
      });
      continue;
    }

    if (isAgentConfig(file.relativePath)) {
      const parsed = path.parse(file.relativePath);
      const parent = path.basename(path.dirname(file.relativePath));
      const label =
        parsed.base.toLowerCase() === "agents.md" && parent && parent !== "."
          ? `${parent} agents`
          : parsed.name;
      collector.upsert("agent", label, {
        paths: [safePath],
        roots: [file.rootName],
        origin: "config",
        configCount: 1,
        configType: configTypeFor(file.relativePath),
      });
    }

    if (!isConfigCandidate(file.relativePath)) continue;
    let stat;
    try {
      stat = await fs.stat(file.fullPath);
    } catch {
      continue;
    }
    if (stat.size > MAX_CONFIG_BYTES) continue;

    let content;
    try {
      content = await fs.readFile(file.fullPath, "utf8");
    } catch {
      continue;
    }
    const discovery = discoverFromConfig(
      path.extname(file.relativePath).toLowerCase(),
      content,
    );

    for (const item of discovery.agents) {
      collector.upsert("agent", item.name, {
        enabled: item.enabled,
        paths: [safePath],
        roots: [file.rootName],
        origin: "config",
        configCount: 1,
        configType: configTypeFor(file.relativePath),
      });
    }
    for (const item of discovery.plugins) {
      collector.upsert("plugin", item.name, {
        enabled: item.enabled,
        paths: [safePath],
        roots: [file.rootName],
        origin: "config",
        configCount: 1,
      });
    }
    for (const item of discovery.mcps) {
      collector.upsert("mcp-server", item.name, {
        enabled: item.enabled,
        paths: [safePath],
        roots: [file.rootName],
        origin: "config",
        configCount: 1,
        transport: item.transport,
      });
    }
    for (const item of discovery.hooks) {
      const hookName = item.plugin
        ? `${sanitizeName(item.plugin)}:${sanitizeName(item.name)}`
        : item.name;
      const hook = collector.upsert("hook", hookName, {
        enabled: item.enabled,
        paths: [safePath],
        roots: [file.rootName],
        origin: "config",
        configCount: 1,
        plugin: item.plugin,
      });
      if (item.plugin) {
        const plugin = collector.upsert("plugin", item.plugin, {
          paths: [safePath],
          roots: [file.rootName],
          origin: "config",
        });
        pendingHookEdges.push([plugin.key, hook.key]);
      }
    }
  }

  const records = sortRecords(collector.records);
  const usedIds = new Map();
  const idsByKey = new Map();
  const nodes = records.map((record) => {
    const baseId = `${record.kind}-${slug(record.name)}`;
    const count = (usedIds.get(baseId) || 0) + 1;
    usedIds.set(baseId, count);
    const id = count === 1 ? baseId : `${baseId}-${count}`;
    idsByKey.set(record.key, id);
    return makeNode(record, id);
  });

  const edges = [];
  let edgeNumber = 0;
  const edgeKeys = new Set();
  const addEdge = (sourceKey, targetKey, kind, evidence) => {
    const source = idsByKey.get(sourceKey);
    const target = idsByKey.get(targetKey);
    if (!source || !target) return;
    const edgeKey = `${source}:${target}:${kind}`;
    if (edgeKeys.has(edgeKey)) return;
    edgeKeys.add(edgeKey);
    edgeNumber += 1;
    edges.push({
      id: `edge-${edgeNumber}`,
      source,
      target,
      kind,
      evidence: [evidence],
    });
  };

  for (const record of records) {
    if (record.kind === "provider") continue;
    for (const root of record.roots) {
      addEdge(record.key, `provider:${root}`, "INSTALLED_IN", "local discovery");
    }
  }
  for (const [pluginKey, hookKey] of pendingHookEdges.sort()) {
    addEdge(pluginKey, hookKey, "PROVIDES", "local configuration");
  }

  const duplicateSkills = records.filter(
    (record) => record.kind === "skill" && record.paths.length > 1,
  ).length;
  const disabledAssets = records.filter(
    (record) =>
      ["agent", "plugin", "hook", "mcp-server"].includes(record.kind) &&
      !record.enabled,
  ).length;
  const truncatedRoots = scans.filter((scan) => scan.truncated).length;
  const findings = [];

  if (duplicateSkills) {
    findings.push({
      id: "finding-duplicate-skills",
      severity: "info",
      title: "Duplicate skills were deduplicated",
      detail: `${duplicateSkills} skill name${duplicateSkills === 1 ? "" : "s"} appeared in multiple locations.`,
      action: "Review duplicate locations",
    });
  }
  if (disabledAssets) {
    findings.push({
      id: "finding-disabled-assets",
      severity: "attention",
      title: "Disabled local assets discovered",
      detail: `${disabledAssets} configured asset${disabledAssets === 1 ? " is" : "s are"} disabled.`,
      action: "Review local configuration",
    });
  }
  if (truncatedRoots) {
    findings.push({
      id: "finding-scan-truncated",
      severity: "attention",
      title: "Local scan limit reached",
      detail: `${truncatedRoots} configuration root${truncatedRoots === 1 ? " was" : "s were"} only partially scanned.`,
      action: "Reduce files in local configuration roots",
    });
  }

  return {
    observedAt: new Date().toISOString(),
    mode: "live",
    nodes,
    edges,
    findings,
    source: {
      codexRoot: "codex",
      agentsRoot: "agents",
      scannedPaths: [...scannedPaths].sort(),
      scanDurationMs: Math.max(0, Date.now() - startedAt),
      redactedFields: REDACTED_FIELDS,
    },
  };
}
