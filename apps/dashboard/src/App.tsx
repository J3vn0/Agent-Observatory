import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bot,
  Boxes,
  Braces,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Code2,
  Database,
  GitBranch,
  Languages,
  Network,
  PlugZap,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Webhook,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  PROGRAMMING_TAG_LABELS,
  PROGRAMMING_TAGS,
  deriveOverview,
  type GraphNode,
  type HealthState,
  type NodeKind,
  type ObservatorySnapshot,
  type ProgrammingTag,
} from "@agent-observatory/core";
import {
  getLocalizedNodeText,
  t,
  type Language,
} from "./i18n";
import { useSnapshot, type SnapshotConnection } from "./useSnapshot";

const PAGE_SIZE = 24;
const GRAPH_LIMITS: Partial<Record<NodeKind, number>> = {
  agent: 3,
  skill: 5,
  plugin: 2,
  hook: 2,
  "mcp-server": 3,
};
const KIND_FILTERS: Array<NodeKind | "all"> = [
  "all",
  "skill",
  "agent",
  "plugin",
  "hook",
  "mcp-server",
];

function Brand() {
  return (
    <a className="brand" href="#overview" aria-label="Agent Observatory">
      <span className="brand-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span>Agent Observatory</span>
    </a>
  );
}

function nodeIcon(kind: NodeKind): LucideIcon {
  const icons: Partial<Record<NodeKind, LucideIcon>> = {
    agent: Bot,
    skill: Braces,
    plugin: PlugZap,
    hook: Webhook,
    "mcp-server": Database,
    "mcp-tool": Settings2,
  };
  return icons[kind] ?? Boxes;
}

function HealthBadge({
  health,
  language,
}: {
  health: HealthState;
  language: Language;
}) {
  return (
    <span className={`health-badge health-${health}`}>
      <span aria-hidden="true" />
      {t(language, "health", health)}
    </span>
  );
}

function ConnectionBadge({
  connection,
  language,
}: {
  connection: SnapshotConnection;
  language: Language;
}) {
  const label =
    connection === "live"
      ? t(language, "status", "live")
      : connection === "loading"
        ? t(language, "status", "connecting")
        : t(language, "status", "fallback");
  return (
    <span className={`connection-badge connection-${connection}`}>
      <span className="pulse-dot" aria-hidden="true" />
      {label}
    </span>
  );
}

function tagLabel(tag: string, language: Language) {
  return PROGRAMMING_TAGS.includes(tag as ProgrammingTag)
    ? PROGRAMMING_TAG_LABELS[tag as ProgrammingTag][language]
    : tag;
}

function kindLabel(kind: NodeKind, language: Language) {
  return t(language, "kinds", kind);
}

function localizedFinding(
  finding: ObservatorySnapshot["findings"][number],
  language: Language,
) {
  return {
    title: finding.localized?.title[language] ?? finding.title,
    detail: finding.localized?.detail[language] ?? finding.detail,
    action: finding.localized?.action[language] ?? finding.action,
  };
}

interface LayoutNode {
  node: GraphNode;
  x: number;
  y: number;
}

function graphLayout(nodes: GraphNode[]): LayoutNode[] {
  const columns: Array<{ kinds: NodeKind[]; x: number }> = [
    { kinds: ["agent"], x: 105 },
    { kinds: ["skill"], x: 390 },
    { kinds: ["plugin", "hook", "mcp-server"], x: 690 },
  ];
  const result: LayoutNode[] = [];

  columns.forEach(({ kinds, x }) => {
    const column = kinds.flatMap((kind) =>
      nodes
        .filter((node) => node.kind === kind)
        .slice(0, GRAPH_LIMITS[kind] ?? 2),
    );
    const spacing = 360 / Math.max(column.length, 1);
    column.forEach((node, index) => {
      result.push({ node, x, y: 42 + spacing * index + spacing / 2 });
    });
  });

  return result;
}

function RelationshipGraph({
  snapshot,
  language,
  selectedId,
  onSelect,
}: {
  snapshot: ObservatorySnapshot;
  language: Language;
  selectedId: string | null;
  onSelect: (node: GraphNode) => void;
}) {
  const candidates = useMemo(() => {
    const scored = [...snapshot.nodes].sort((left, right) => {
      const programming = Number(Boolean(right.programming)) - Number(Boolean(left.programming));
      if (programming) return programming;
      return left.label.localeCompare(right.label);
    });
    return scored.filter((node) => Object.hasOwn(GRAPH_LIMITS, node.kind));
  }, [snapshot.nodes]);
  const layout = useMemo(() => graphLayout(candidates), [candidates]);
  const points = new Map(layout.map((item) => [item.node.id, item]));
  const edges = snapshot.edges.filter(
    (edge) => points.has(edge.source) && points.has(edge.target),
  );

  if (!layout.length) {
    return (
      <div className="empty-state">
        <Network size={24} />
        <strong>{t(language, "states", "empty")}</strong>
        <span>{t(language, "states", "emptyDescription")}</span>
      </div>
    );
  }

  return (
    <div className="graph-shell">
      <svg
        className="relationship-graph"
        viewBox="0 0 900 440"
        role="img"
        aria-label={t(language, "graph", "description")}
      >
        <defs>
          <marker
            id="edge-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" />
          </marker>
        </defs>
        <g className="graph-guides" aria-hidden="true">
          <line x1="105" y1="20" x2="105" y2="420" />
          <line x1="390" y1="20" x2="390" y2="420" />
          <line x1="690" y1="20" x2="690" y2="420" />
        </g>
        <g className="graph-edges">
          {edges.map((edge) => {
            const source = points.get(edge.source)!;
            const target = points.get(edge.target)!;
            return (
              <line
                key={edge.id}
                x1={source.x + 82}
                y1={source.y}
                x2={target.x - 82}
                y2={target.y}
                markerEnd="url(#edge-arrow)"
              >
                <title>{edge.kind}</title>
              </line>
            );
          })}
        </g>
        {layout.map(({ node, x, y }) => {
          const text = getLocalizedNodeText(node, language);
          const active = selectedId === node.id;
          return (
            <g
              key={node.id}
              className={`graph-node graph-node-${node.kind} ${active ? "is-selected" : ""}`}
              transform={`translate(${x - 82} ${y - 25})`}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(node)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") onSelect(node);
              }}
            >
              <rect width="164" height="50" rx="11" />
              <circle cx="18" cy="17" r="4" className={`node-health-${node.health}`} />
              <text x="30" y="20" className="node-title">
                {text.label.length > 18 ? `${text.label.slice(0, 17)}…` : text.label}
              </text>
              <text x="18" y="37" className="node-kind">
                {kindLabel(node.kind, language)}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="graph-column-labels" aria-hidden="true">
        <span>{kindLabel("agent", language)}</span>
        <span>{kindLabel("skill", language)}</span>
        <span>MCP · Plugin · Hook</span>
      </div>
    </div>
  );
}

function NodeDetail({
  node,
  language,
  onClose,
}: {
  node: GraphNode;
  language: Language;
  onClose: () => void;
}) {
  const Icon = nodeIcon(node.kind);
  const text = getLocalizedNodeText(node, language);
  return (
    <aside className="node-detail" aria-label={t(language, "detail", "details")}>
      <button className="detail-close" type="button" onClick={onClose}>
        <X size={17} />
        <span className="sr-only">{t(language, "detail", "close")}</span>
      </button>
      <div className={`detail-icon detail-icon-${node.kind}`}>
        <Icon size={19} />
      </div>
      <p className="eyebrow">{kindLabel(node.kind, language)}</p>
      <h3>{text.label}</h3>
      <p className="detail-summary">{text.summary}</p>
      <HealthBadge health={node.health} language={language} />
      <dl>
        <div>
          <dt>{t(language, "detail", "origin")}</dt>
          <dd>{node.origin ?? node.source ?? "—"}</dd>
        </div>
        <div>
          <dt>{t(language, "detail", "path")}</dt>
          <dd className="mono">{node.path ?? "—"}</dd>
        </div>
        <div>
          <dt>{t(language, "detail", "programming")}</dt>
          <dd>{node.programming ? t(language, "common", "yes") : t(language, "common", "no")}</dd>
        </div>
      </dl>
      <div className="detail-tags">
        {node.tags.map((tag) => (
          <span key={tag}>{tagLabel(tag, language)}</span>
        ))}
      </div>
    </aside>
  );
}

export default function App() {
  const { snapshot, connection, error, refresh } = useSnapshot();
  const [language, setLanguage] = useState<Language>(() =>
    window.localStorage.getItem("agent-observatory-language") === "en"
      ? "en"
      : "ko",
  );
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<NodeKind | "all">("all");
  const [tag, setTag] = useState("all");
  const [programmingOnly, setProgrammingOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const metrics = useMemo(() => deriveOverview(snapshot), [snapshot]);

  useEffect(() => {
    window.localStorage.setItem("agent-observatory-language", language);
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => setPage(1), [search, kind, tag, programmingOnly]);

  const programmingTags = useMemo(
    () =>
      PROGRAMMING_TAGS.filter((candidate) =>
        snapshot.nodes.some((node) => node.tags.includes(candidate)),
      ),
    [snapshot.nodes],
  );

  const filteredNodes = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return snapshot.nodes.filter((node) => {
      const localized = getLocalizedNodeText(node, language);
      const haystack = [
        node.label,
        node.summary,
        localized.label,
        localized.summary,
        node.path ?? "",
        node.source ?? "",
        ...node.tags,
        ...node.tags.map((item) => tagLabel(item, language)),
      ]
        .join(" ")
        .toLocaleLowerCase();
      return (
        (!query || haystack.includes(query)) &&
        (kind === "all" || node.kind === kind) &&
        (tag === "all" || node.tags.includes(tag)) &&
        (!programmingOnly || Boolean(node.programming))
      );
    });
  }, [snapshot.nodes, search, kind, tag, programmingOnly, language]);

  const pageCount = Math.max(1, Math.ceil(filteredNodes.length / PAGE_SIZE));
  const pageNodes = filteredNodes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const observed = new Intl.DateTimeFormat(language === "ko" ? "ko-KR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(snapshot.observedAt));

  const coverage = PROGRAMMING_TAGS.filter((item) => item !== "programming")
    .map((item) => ({
      tag: item,
      count: snapshot.nodes.filter((node) => node.tags.includes(item)).length,
    }))
    .filter((item) => item.count > 0)
    .sort((left, right) => right.count - left.count)
    .slice(0, 7);
  const maxCoverage = Math.max(...coverage.map((item) => item.count), 1);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        {t(language, "navigation", "overview")}
      </a>
      <header className="topbar">
        <Brand />
        <nav aria-label={t(language, "navigation", "productName")}>
          <a className="active" href="#overview">{t(language, "navigation", "overview")}</a>
          <a href="#graph">{t(language, "navigation", "graph")}</a>
          <a href="#registry">{t(language, "navigation", "registry")}</a>
        </nav>
        <div className="topbar-actions">
          <ConnectionBadge connection={connection} language={language} />
          <button
            className="language-toggle"
            type="button"
            onClick={() => setLanguage((current) => (current === "ko" ? "en" : "ko"))}
            aria-label={t(language, "language", "toggleLabel")}
          >
            <Languages size={16} />
            {language === "ko" ? "EN" : "한"}
          </button>
        </div>
      </header>

      <aside className="sidebar">
        <p>{t(language, "navigation", "workspace")}</p>
        <a className="active" href="#overview"><Activity size={16} />{t(language, "navigation", "overview")}</a>
        <a href="#graph"><Network size={16} />{t(language, "navigation", "graphExplorer")}</a>
        <a href="#registry"><Braces size={16} />{t(language, "navigation", "skillLibrary")}</a>
        <div className="sidebar-note">
          <ShieldCheck size={18} />
          <strong>{t(language, "scan", "readOnlyNotice")}</strong>
          <span>{t(language, "scan", "sensitiveDataRedacted")}</span>
        </div>
      </aside>

      <main id="main">
        <section className="hero" id="overview">
          <div>
            <p className="eyebrow">{t(language, "overview", "eyebrow")}</p>
            <h1>{t(language, "overview", "title")}</h1>
            <p>{t(language, "overview", "subtitle")}</p>
          </div>
          <div className="hero-actions">
            <div className="observed-time">
              <span>{t(language, "timestamps", "observedAt")}</span>
              <strong>{observed}</strong>
            </div>
            <button className="primary-button" type="button" onClick={refresh} disabled={connection === "loading"}>
              <RefreshCw size={16} className={connection === "loading" ? "is-spinning" : ""} />
              {connection === "loading" ? t(language, "scan", "scanning") : t(language, "scan", "scanAgain")}
            </button>
          </div>
        </section>

        {connection === "fallback" && (
          <div className="fallback-banner" role="status">
            <CircleAlert size={18} />
            <div>
              <strong>{t(language, "scan", "fallbackActivated")}</strong>
              <span>{t(language, "scan", "fallbackReason")}{error ? ` · ${error}` : ""}</span>
            </div>
          </div>
        )}

        <section className="metric-strip" aria-label={t(language, "overview", "title")}>
          {[
            { label: t(language, "overview", "observedAssets"), value: metrics.totalAssets, icon: Boxes },
            { label: t(language, "overview", "skills"), value: metrics.skillCount, icon: Braces },
            { label: t(language, "overview", "programming"), value: metrics.programmingCount, icon: Code2 },
            { label: t(language, "overview", "plugins"), value: metrics.pluginCount + metrics.hookCount, icon: PlugZap },
            { label: t(language, "overview", "mcp"), value: metrics.mcpCount, icon: Database },
          ].map((metric) => (
            <div className="metric" key={metric.label}>
              <metric.icon size={17} />
              <span>{metric.label}</span>
              <strong>{metric.value.toLocaleString()}</strong>
            </div>
          ))}
        </section>

        <section className="observatory-grid" id="graph">
          <article className="panel graph-panel">
            <header className="panel-header">
              <div>
                <p className="eyebrow">{t(language, "graph", "relationMap")}</p>
                <h2>{t(language, "graph", "title")}</h2>
              </div>
              <span className="panel-meta">
                {t(language, "graph", "connectedNodes", { count: snapshot.nodes.length })}
              </span>
            </header>
            <RelationshipGraph
              snapshot={snapshot}
              language={language}
              selectedId={selected?.id ?? null}
              onSelect={setSelected}
            />
          </article>

          <article className="panel coverage-panel">
            <header className="panel-header">
              <div>
                <p className="eyebrow">{t(language, "programming", "label")}</p>
                <h2>{t(language, "programming", "tag")}</h2>
              </div>
              <Code2 size={19} />
            </header>
            <div className="coverage-list">
              {coverage.length ? coverage.map((item) => (
                <button key={item.tag} type="button" onClick={() => setTag(item.tag)}>
                  <span>{tagLabel(item.tag, language)}</span>
                  <span className="coverage-track"><span style={{ width: `${(item.count / maxCoverage) * 100}%` }} /></span>
                  <strong>{item.count}</strong>
                </button>
              )) : (
                <div className="empty-compact">{t(language, "states", "noResults")}</div>
              )}
            </div>
            <div className="scan-proof">
              <div><ShieldCheck size={17} /><span>{t(language, "scan", "sensitiveDataRedacted")}</span></div>
              <div><GitBranch size={17} /><span>{snapshot.source?.scannedPaths.length ?? 0} {t(language, "scan", "scannedPaths")}</span></div>
              <div><Activity size={17} /><span>{snapshot.source?.scanDurationMs ?? 0} ms</span></div>
            </div>
          </article>
        </section>

        <section className="registry-section" id="registry">
          <header className="section-header">
            <div>
              <p className="eyebrow">{t(language, "registry", "inventory")}</p>
              <h2>{t(language, "registry", "title")}</h2>
              <p>{t(language, "registry", "subtitle")}</p>
            </div>
            <span className="result-count">{t(language, "controls", "resultCount", { count: filteredNodes.length })}</span>
          </header>

          <div className="registry-controls">
            <label className="search-field">
              <Search size={17} />
              <span className="sr-only">{t(language, "controls", "search")}</span>
              <input
                id="asset-search"
                name="asset-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t(language, "controls", "searchPlaceholder")}
              />
              {search && <button type="button" onClick={() => setSearch("")}><X size={15} /></button>}
            </label>
            <div className="kind-filters" aria-label={t(language, "controls", "filters")}>
              {KIND_FILTERS.map((item) => (
                <button
                  type="button"
                  key={item}
                  className={kind === item ? "active" : ""}
                  onClick={() => setKind(item)}
                >
                  {item === "all" ? t(language, "controls", "allKinds") : kindLabel(item, language)}
                </button>
              ))}
            </div>
            <label className="programming-toggle">
              <input
                id="programming-only"
                name="programming-only"
                type="checkbox"
                checked={programmingOnly}
                onChange={(event) => setProgrammingOnly(event.target.checked)}
              />
              <span>{t(language, "controls", "showProgrammingOnly")}</span>
            </label>
          </div>

          {programmingTags.length > 0 && (
            <div className="tag-filters">
              <button className={tag === "all" ? "active" : ""} type="button" onClick={() => setTag("all")}>
                {t(language, "controls", "clearFilters")}
              </button>
              {programmingTags.map((item) => (
                <button className={tag === item ? "active" : ""} type="button" key={item} onClick={() => setTag(item)}>
                  {tagLabel(item, language)}
                </button>
              ))}
            </div>
          )}

          <div className={`registry-layout ${selected ? "has-detail" : ""}`}>
            <div className="registry-table-wrap">
              <table className="registry-table">
                <thead>
                  <tr>
                    <th>{t(language, "registry", "name")}</th>
                    <th>{t(language, "registry", "kind")}</th>
                    <th>{t(language, "detail", "tags")}</th>
                    <th>{t(language, "registry", "health")}</th>
                    <th>{t(language, "registry", "source")}</th>
                  </tr>
                </thead>
                <tbody>
                  {pageNodes.map((node) => {
                    const Icon = nodeIcon(node.kind);
                    const text = getLocalizedNodeText(node, language);
                    return (
                      <tr key={node.id} className={selected?.id === node.id ? "is-selected" : ""} onClick={() => setSelected(node)}>
                        <td>
                          <div className="asset-name">
                            <span className={`asset-icon asset-icon-${node.kind}`}><Icon size={16} /></span>
                            <span><strong>{text.label}</strong><small>{text.summary}</small></span>
                          </div>
                        </td>
                        <td><span className="kind-label">{kindLabel(node.kind, language)}</span></td>
                        <td><div className="row-tags">{node.tags.slice(0, 3).map((item) => <span key={item}>{tagLabel(item, language)}</span>)}</div></td>
                        <td><HealthBadge health={node.health} language={language} /></td>
                        <td className="source-cell">{node.source ?? node.origin ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!pageNodes.length && (
                <div className="empty-state table-empty">
                  <Search size={24} />
                  <strong>{t(language, "states", "noResults")}</strong>
                  <button type="button" onClick={() => { setSearch(""); setKind("all"); setTag("all"); setProgrammingOnly(false); }}>
                    {t(language, "controls", "reset")}
                  </button>
                </div>
              )}
              <footer className="pagination">
                <span>{t(language, "pagination", "showing", {
                  from: filteredNodes.length ? (page - 1) * PAGE_SIZE + 1 : 0,
                  to: Math.min(page * PAGE_SIZE, filteredNodes.length),
                  total: filteredNodes.length,
                })}</span>
                <div>
                  <button type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={16} /></button>
                  <span>{t(language, "pagination", "pageOf", { page, total: pageCount })}</span>
                  <button type="button" disabled={page === pageCount} onClick={() => setPage((value) => value + 1)}><ChevronRight size={16} /></button>
                </div>
              </footer>
            </div>
            {selected && <NodeDetail node={selected} language={language} onClose={() => setSelected(null)} />}
          </div>
        </section>

        <section className="findings-section">
          <header className="section-header">
            <div>
              <p className="eyebrow">{t(language, "findings", "title")}</p>
              <h2>{t(language, "findings", "subtitle")}</h2>
            </div>
            <Sparkles size={19} />
          </header>
          <div className="finding-list">
            {snapshot.findings.length ? snapshot.findings.slice(0, 4).map((finding) => {
              const text = localizedFinding(finding, language);
              return (
                <article key={finding.id}>
                  {finding.severity === "info" ? <CheckCircle2 size={18} /> : <CircleAlert size={18} />}
                  <div><strong>{text.title}</strong><p>{text.detail}</p></div>
                  <span>{text.action}</span>
                </article>
              );
            }) : (
              <div className="empty-state"><CheckCircle2 size={24} /><strong>{t(language, "findings", "noFindings")}</strong><span>{t(language, "findings", "noFindingsDescription")}</span></div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
