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
  CircleDollarSign,
  Code2,
  Database,
  FolderGit2,
  GitBranch,
  GitMerge,
  Globe2,
  Languages,
  LayoutDashboard,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  PlugZap,
  RefreshCw,
  Search,
  ServerCog,
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
  groupSubagentExecutions,
  type AgentSessionRecord,
  type EnvironmentKind,
  type EnvironmentRecord,
  type GraphNode,
  type HealthState,
  type NodeKind,
  type ObservatorySnapshot,
  type ProgrammingTag,
  type ProjectRecord,
} from "@agent-observatory/core";
import { ec } from "./environment-copy";
import { AgentRegistryPage } from "./AgentRegistryPage";
import { FinancePage } from "./FinancePage";
import { InfoHint } from "./InfoHint";
import { calculateGraphSignals, countRepeatedDescriptions, type GraphSignal } from "./graph-insights";
import {
  disambiguatedProjectLabel,
  nodeEnvironment,
  nodesInScope,
  projectsInScope,
  sessionsInScope,
  type EnvironmentScope,
  type ObservatoryScope,
} from "./scope";
import {
  getLocalizedNodeText,
  t,
  type Language,
} from "./i18n";
import { useSnapshot, type SnapshotConnection } from "./useSnapshot";

type PageKey =
  | "overview"
  | "projects"
  | "agents"
  | "registry"
  | "finance"
  | "skills"
  | "integrations"
  | "graph";

const PAGE_KEYS: PageKey[] = [
  "overview",
  "projects",
  "agents",
  "registry",
  "finance",
  "skills",
  "integrations",
  "graph",
];
const PAGE_SIZE = 24;

function pageFromHash(): PageKey {
  const candidate = window.location.hash.replace(/^#\/?/, "").split("?")[0];
  return PAGE_KEYS.includes(candidate as PageKey)
    ? (candidate as PageKey)
    : "overview";
}

function usePage() {
  const [page, setPage] = useState<PageKey>(pageFromHash);
  useEffect(() => {
    const update = () => setPage(pageFromHash());
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  const navigate = (next: PageKey) => {
    window.location.hash = `/${next}`;
    setPage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return { page, navigate };
}

function Brand() {
  return (
    <a className="brand" href="#/overview" aria-label="Agent Observatory">
      <span className="brand-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span>Agent Observatory</span>
    </a>
  );
}

function NavigationRail({
  page,
  language,
  navigate,
}: {
  page: PageKey;
  language: Language;
  navigate: (page: PageKey) => void;
}) {
  const copy = ec(language);
  const financeLabel = language === "ko" ? "파이낸스" : "Finance";

  return (
    <aside className="app-rail" aria-label="Agent Observatory navigation">
      <a className="rail-brand" href="#/overview" aria-label="Agent Observatory">
        <span className="brand-mark" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </a>
      <nav
        className="rail-navigation"
        aria-label={language === "ko" ? "주요 메뉴" : "Primary navigation"}
      >
        {PAGE_KEYS.map((key) => {
          const Icon = pageIcon(key);
          const label = key === "finance" ? financeLabel : copy.pages[key];
          return (
            <a
              key={key}
              href={`#/${key}`}
              className={page === key ? "active" : ""}
              aria-label={label}
              aria-current={page === key ? "page" : undefined}
              data-tooltip={label}
              onClick={() => navigate(key)}
            >
              <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
            </a>
          );
        })}
      </nav>
      <div className="rail-status" title={copy.liveMetadataOnly}>
        <span className="pulse-dot" aria-hidden="true" />
        <span className="sr-only">{copy.liveMetadataOnly}</span>
      </div>
    </aside>
  );
}
function nodeIcon(kind: NodeKind): LucideIcon {
  const icons: Partial<Record<NodeKind, LucideIcon>> = {
    agent: Bot,
    skill: Braces,
    plugin: PlugZap,
    hook: Webhook,
    "mcp-server": Database,
    project: FolderGit2,
    execution: Activity,
    provider: ServerCog,
  };
  return icons[kind] ?? Boxes;
}

function pageIcon(page: PageKey): LucideIcon {
  const icons: Record<PageKey, LucideIcon> = {
    overview: LayoutDashboard,
    projects: FolderGit2,
    agents: Bot,
    registry: GitMerge,
    finance: CircleDollarSign,
    skills: Braces,
    integrations: PlugZap,
    graph: Network,
  };
  return icons[page];
}

function tagLabel(tag: string, language: Language) {
  return PROGRAMMING_TAGS.includes(tag as ProgrammingTag)
    ? PROGRAMMING_TAG_LABELS[tag as ProgrammingTag][language]
    : tag;
}

function kindLabel(kind: NodeKind, language: Language) {
  return t(language, "kinds", kind);
}

function formatDate(language: Language, value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "—";
  return new Intl.DateTimeFormat(language === "ko" ? "ko-KR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
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
    <span className={`connection-badge connection-${connection}`} role="status" aria-live="polite">
      <span className="pulse-dot" aria-hidden="true" />
      {label}
    </span>
  );
}

function PageHeader({
  page,
  language,
  actions,
}: {
  page: Exclude<PageKey, "finance">;
  language: Language;
  actions?: React.ReactNode;
}) {
  const copy = ec(language);
  const Icon = pageIcon(page);
  return (
    <header className="page-header">
      <div className="page-title">
        <span className="page-icon"><Icon size={19} /></span>
        <div>
          <p className="eyebrow">{copy.currentScope}</p>
          <h1>{copy.pages[page]}</h1>
          <p>{copy.pageDescriptions[page]}</p>
        </div>
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

function ScopeBar({
  snapshot,
  scope,
  language,
  connection,
  onScopeChange,
  onLanguageChange,
  onRefresh,
}: {
  snapshot: ObservatorySnapshot;
  scope: ObservatoryScope;
  language: Language;
  connection: SnapshotConnection;
  onScopeChange: (scope: ObservatoryScope) => void;
  onLanguageChange: () => void;
  onRefresh: () => void;
}) {
  const copy = ec(language);
  const environments = snapshot.environments ?? [];
  const allProjects = snapshot.projects ?? [];
  const selectableProjects = allProjects.filter(
    (project) =>
      scope.environment === "all" || project.environment === scope.environment,
  );
  return (
    <div className="scope-bar">
      <div className="scope-control">
        <span>{copy.environment}</span>
        <div className="environment-segments" role="group" aria-label={copy.environment}>
          <button
            className={scope.environment === "all" ? "active" : ""}
            type="button"
            aria-pressed={scope.environment === "all"}
            onClick={() => onScopeChange({ environment: "all", projectId: null })}
          >
            <Globe2 size={14} />
            {copy.globalScope}
          </button>
          {environments.map((environment) => (
            <button
              className={scope.environment === environment.id ? "active" : ""}
              type="button"
              key={environment.id}
              aria-pressed={scope.environment === environment.id}
              disabled={!environment.installed}
              onClick={() =>
                onScopeChange({ environment: environment.id, projectId: null })
              }
            >
              <span className={`environment-dot environment-${environment.id}`} />
              {environment.label}
            </button>
          ))}
        </div>
      </div>
      <label className="project-select">
        <span>{copy.projectScope}</span>
        <select
          id="observatory-project-scope"
          name="observatory-project-scope"
          value={scope.projectId ?? ""}
          onChange={(event) => {
            const project = allProjects.find(
              (candidate) => candidate.id === event.target.value,
            );
            onScopeChange({
              environment: project?.environment ?? scope.environment,
              projectId: project?.id ?? null,
            });
          }}
        >
          <option value="">{copy.allProjects}</option>
          {selectableProjects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.environment.toUpperCase()} ·{" "}
              {disambiguatedProjectLabel(project, allProjects)}
            </option>
          ))}
        </select>
      </label>
      <div className="scope-actions">
        <ConnectionBadge connection={connection} language={language} />
        <button
          className="icon-action"
          type="button"
          onClick={onRefresh}
          aria-label={t(language, "scan", "scanAgain")}
        >
          <RefreshCw
            size={16}
            className={connection === "loading" ? "is-spinning" : ""}
          />
        </button>
        <button
          className="language-toggle"
          type="button"
          onClick={onLanguageChange}
          aria-label={t(language, "language", "toggleLabel")}
        >
          <Languages size={16} />
          {language === "ko" ? "EN" : "한"}
        </button>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  note?: string;
}) {
  return (
    <div className="metric">
      <div className="metric-label"><Icon size={16} /><span>{label}</span></div>
      <strong>{value.toLocaleString()}</strong>
      {note && <small>{note}</small>}
    </div>
  );
}

function EnvironmentCard({
  environment,
  language,
  active,
  onSelect,
}: {
  environment: EnvironmentRecord;
  language: Language;
  active: boolean;
  onSelect: () => void;
}) {
  const copy = ec(language);
  return (
    <button
      type="button"
      className={`environment-card ${active ? "active" : ""}`}
      onClick={onSelect}
      disabled={!environment.installed}
    >
      <div className="environment-card-head">
        <span className={`environment-logo environment-${environment.id}`}>
          {environment.id === "codex" ? "CX" : environment.id === "claude" ? "CL" : environment.label.slice(0, 2)}
        </span>
        <div>
          <strong>{environment.label}</strong>
          <span className={environment.installed ? "detected" : "not-detected"}>
            {environment.installed ? copy.detected : copy.notDetected}
          </span>
        </div>
        <ChevronRight size={18} />
      </div>
      <div className="environment-stats">
        <span><strong>{environment.projectCount}</strong>{copy.projects}</span>
        <span><strong>{environment.sessionCount}</strong>{copy.sessions}</span>
        <span><strong>{environment.subagentCount}</strong>{copy.subagents}</span>
      </div>
      <div className="capability-list">
        {environment.capabilities.slice(0, 6).map((capability) => (
          <span key={capability}>{capability}</span>
        ))}
      </div>
    </button>
  );
}

function OverviewPage({
  snapshot,
  scope,
  language,
  navigate,
  onScopeChange,
}: {
  snapshot: ObservatorySnapshot;
  scope: ObservatoryScope;
  language: Language;
  navigate: (page: PageKey) => void;
  onScopeChange: (scope: ObservatoryScope) => void;
}) {
  const copy = ec(language);
  const metrics = deriveOverview(snapshot);
  const projects = projectsInScope(snapshot, scope);
  const sessions = sessionsInScope(snapshot, scope);
  const primaryCount = sessions.filter((session) => session.kind === "primary").length;
  const subagentCount = sessions.filter((session) => session.kind === "subagent").length;
  const recent = sessions.slice(0, 8);
  return (
    <>
      <PageHeader page="overview" language={language} />
      <section className="metric-strip metric-strip-wide">
        <Metric icon={FolderGit2} label={copy.projects} value={projects.length} />
        <Metric icon={Activity} label={copy.primarySessions} value={primaryCount} />
        <Metric icon={Bot} label={copy.subagents} value={subagentCount} />
        <Metric icon={Braces} label={t(language, "overview", "skills")} value={metrics.skillCount} />
        <Metric icon={PlugZap} label={t(language, "overview", "plugins")} value={metrics.pluginCount + metrics.hookCount + metrics.mcpCount} />
      </section>

      <section className="content-section">
        <div className="section-heading">
          <div><p className="eyebrow">{copy.environmentCoverage}</p><h2>{copy.installedCapabilities}</h2></div>
          <span className="privacy-note"><ShieldCheck size={15} />{copy.liveMetadataOnly}</span>
        </div>
        <div className="environment-grid">
          {(snapshot.environments ?? []).map((environment) => (
            <EnvironmentCard
              key={environment.id}
              environment={environment}
              language={language}
              active={scope.environment === environment.id}
              onSelect={() =>
                onScopeChange({ environment: environment.id, projectId: null })
              }
            />
          ))}
        </div>
      </section>

      <section className="overview-columns">
        <article className="surface-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">{copy.projectHistory}</p><h2>{copy.recentActivity}</h2></div>
            <button type="button" onClick={() => navigate("projects")}>{copy.projects}<ChevronRight size={15} /></button>
          </div>
          <div className="activity-list">
            {recent.length ? recent.map((session) => {
              const project = (snapshot.projects ?? []).find(
                (candidate) => candidate.id === session.projectId,
              );
              return (
                <div key={session.id} className="activity-row">
                  <span className={`session-kind-icon session-${session.kind}`}>
                    {session.kind === "subagent" ? <Bot size={15} /> : <Activity size={15} />}
                  </span>
                  <div><strong>{session.label}</strong><span>{project?.label ?? "—"} · {session.environment}</span></div>
                  <time>{formatDate(language, session.observedAt)}</time>
                </div>
              );
            }) : <EmptyState text={copy.noAgentActivity} />}
          </div>
        </article>
        <article className="surface-panel selected-scope-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">{copy.currentScope}</p><h2>{scope.projectId ? copy.selectedProject : copy.globalScope}</h2></div>
            <Network size={18} />
          </div>
          <div className="scope-summary">
            <div><span>{copy.projectCount}</span><strong>{projects.length}</strong></div>
            <div><span>{copy.sessionCount}</span><strong>{sessions.length}</strong></div>
            <div><span>{copy.subagentCount}</span><strong>{subagentCount}</strong></div>
          </div>
          <button className="primary-button" type="button" onClick={() => navigate("graph")}>
            <Network size={16} />{copy.environmentGraph}
          </button>
        </article>
      </section>
    </>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="empty-state">
      <CircleAlert size={23} />
      <span>{text}</span>
    </div>
  );
}

function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="search-field">
      <Search size={17} />
      <input
        name="observatory-search"
        aria-label={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
      {value && <button type="button" onClick={() => onChange("")}><X size={15} /></button>}
    </label>
  );
}

function Pagination({
  page,
  pageCount,
  language,
  onChange,
}: {
  page: number;
  pageCount: number;
  language: Language;
  onChange: (page: number) => void;
}) {
  const copy = ec(language);
  return (
    <div className="pagination">
      <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <ChevronLeft size={16} />{copy.previous}
      </button>
      <span>{copy.page} {page} {copy.of} {pageCount}</span>
      <button type="button" disabled={page >= pageCount} onClick={() => onChange(page + 1)}>
        {copy.next}<ChevronRight size={16} />
      </button>
    </div>
  );
}

function ProjectsPage({
  snapshot,
  scope,
  language,
  navigate,
  onScopeChange,
}: {
  snapshot: ObservatorySnapshot;
  scope: ObservatoryScope;
  language: Language;
  navigate: (page: PageKey) => void;
  onScopeChange: (scope: ObservatoryScope) => void;
}) {
  const copy = ec(language);
  const allProjects = snapshot.projects ?? [];
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const projects = projectsInScope(snapshot, { ...scope, projectId: null }).filter(
    (project) =>
      !search ||
      disambiguatedProjectLabel(project, allProjects)
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()),
  );
  useEffect(() => setPage(1), [search, scope.environment]);
  const pageCount = Math.max(1, Math.ceil(projects.length / 12));
  const visible = projects.slice((page - 1) * 12, page * 12);
  return (
    <>
      <PageHeader
        page="projects"
        language={language}
        actions={<SearchField value={search} onChange={setSearch} placeholder={copy.searchProjects} />}
      />
      {scope.projectId && (
        <button className="clear-scope" type="button" onClick={() => onScopeChange({ ...scope, projectId: null })}>
          <X size={14} />{copy.clearProject}
        </button>
      )}
      <section className="project-grid">
        {visible.length ? visible.map((project) => (
          <article
            key={project.id}
            className={`project-card ${scope.projectId === project.id ? "active" : ""}`}
          >
            <div className="project-card-top">
              <span className={`environment-pill environment-${project.environment}`}>
                {project.environment}
              </span>
              <FolderGit2 size={19} />
            </div>
            <h2>{disambiguatedProjectLabel(project, allProjects)}</h2>
            <p>{copy.lastObserved} · {formatDate(language, project.lastObservedAt)}</p>
            <div className="project-card-stats">
              <span><strong>{project.sessionCount}</strong>{copy.sessions}</span>
              <span><strong>{project.subagentCount}</strong>{copy.subagents}</span>
            </div>
            <div className="project-card-actions">
              <button type="button" onClick={() => {
                onScopeChange({ environment: project.environment, projectId: project.id });
                navigate("agents");
              }}>{copy.viewAgents}<ChevronRight size={15} /></button>
              <button type="button" onClick={() => {
                onScopeChange({ environment: project.environment, projectId: project.id });
                navigate("graph");
              }}><Network size={15} /></button>
            </div>
          </article>
        )) : <EmptyState text={copy.noProjectActivity} />}
      </section>
      <Pagination page={page} pageCount={pageCount} language={language} onChange={setPage} />
    </>
  );
}

function AgentsPage({
  snapshot,
  scope,
  language,
}: {
  snapshot: ObservatorySnapshot;
  scope: ObservatoryScope;
  language: Language;
}) {
  const copy = ec(language);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const projects = snapshot.projects ?? [];
  const scopedSessions = sessionsInScope(snapshot, scope);
  const groupedSubagents = groupSubagentExecutions(scopedSessions, { preserveParent: false });
  const primaryRows = scopedSessions.filter((session) => session.kind === "primary").map((session) => ({
    id: session.id,
    kind: "primary" as const,
    environment: session.environment,
    projectId: session.projectId,
    parentSessionId: session.parentSessionId,
    label: session.label,
    role: session.role,
    description: language === "ko" ? "프로젝트의 기본 실행 세션입니다." : "Primary execution session for this project.",
    skills: session.skills ?? [],
    executionCount: 1,
    observedAt: session.observedAt,
  }));
  const subagentRows = groupedSubagents.map((group) => ({
    ...group,
    kind: "subagent" as const,
    description: group.localizedDescription?.[language] ?? group.description,
    observedAt: group.lastObservedAt,
  }));
  const rows = [...primaryRows, ...subagentRows]
    .filter((row) =>
      !search ||
      (row.label + " " + row.role + " " + row.description + " " + row.skills.join(" "))
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()),
    )
    .sort((left, right) => right.observedAt.localeCompare(left.observedAt));
  useEffect(() => setPage(1), [search, scope.environment, scope.projectId]);
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const visible = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const byId = new Map((snapshot.sessions ?? []).map((session) => [session.id, session]));
  return (
    <>
      <PageHeader
        page="agents"
        language={language}
        actions={<SearchField value={search} onChange={setSearch} placeholder={copy.searchAgents} />}
      />
      <section className="metric-strip compact-metrics">
        <Metric icon={Activity} label={copy.primarySessions} value={primaryRows.length} />
        <Metric icon={Bot} label={language === "ko" ? "서브에이전트 정의" : "Subagent definitions"} value={groupedSubagents.length} />
        <Metric icon={Sparkles} label={language === "ko" ? "서브에이전트 실행" : "Subagent runs"} value={groupedSubagents.reduce((sum, group) => sum + group.executionCount, 0)} />
        <Metric icon={FolderGit2} label={copy.projects} value={new Set(rows.map((row) => row.projectId)).size} />
      </section>
      <section className="wide-table-panel">
        <div className="table-title">
          <div><p className="eyebrow">{copy.agentHierarchy}</p><h2>{copy.projectHistory}</h2></div>
          <span>{rows.length.toLocaleString()}</span>
        </div>
        <div className="agent-table">
          <div className="agent-table-head">
            <span>{t(language, "registry", "name")}</span>
            <span>{copy.projects}</span>
            <span>{copy.parentSession}</span>
            <span>{copy.role}</span>
            <span>{copy.lastObserved}</span>
          </div>
          {visible.length ? visible.map((row) => {
            const project = projects.find((candidate) => candidate.id === row.projectId);
            const parent = row.parentSessionId ? byId.get(row.parentSessionId) : undefined;
            const parentLabel = row.kind === "subagent"
              ? (row.executionCount > 1
                ? (language === "ko" ? "여러 실행에서 관찰" : "Observed across runs")
                : parent?.label ?? copy.standalone)
              : parent?.label ?? copy.standalone;
            return (
              <div key={row.id} className={"agent-table-row session-row-" + row.kind}>
                <div className="session-name">
                  <span className={"session-kind-icon session-" + row.kind}>
                    {row.kind === "subagent" ? <Bot size={15} /> : <Activity size={15} />}
                  </span>
                  <span><strong>{row.label}</strong><small>{row.environment} · {row.kind}</small></span>
                  <InfoHint label={row.label} description={row.description} meta={[row.role, ...row.skills]} />
                </div>
                <span>{project ? disambiguatedProjectLabel(project, projects) : "—"}</span>
                <span>{parentLabel}</span>
                <span className="role-cell"><span className="role-pill">{row.role}</span>{row.executionCount > 1 && <small>{row.executionCount}×</small>}</span>
                <time>{formatDate(language, row.observedAt)}</time>
              </div>
            );
          }) : <EmptyState text={copy.noAgentActivity} />}
        </div>
      </section>
      <Pagination page={page} pageCount={pageCount} language={language} onChange={setPage} />
    </>
  );
}

function AssetTable({
  nodes,
  language,
}: {
  nodes: GraphNode[];
  language: Language;
}) {
  return (
    <div className="asset-table">
      <div className="asset-table-head">
        <span>{t(language, "registry", "name")}</span>
        <span>{t(language, "registry", "kind")}</span>
        <span>{t(language, "detail", "tags")}</span>
        <span>{t(language, "registry", "health")}</span>
        <span>{t(language, "registry", "source")}</span>
      </div>
      {nodes.map((node) => {
        const Icon = nodeIcon(node.kind);
        const text = getLocalizedNodeText(node, language);
        return (
          <div className="asset-table-row" key={node.id}>
            <div className="asset-name">
              <span className={`asset-icon asset-icon-${node.kind}`}><Icon size={16} /></span>
              <span><strong>{text.label}</strong><small>{text.summary}</small></span>
              <InfoHint label={text.label} description={text.summary} meta={[kindLabel(node.kind, language), ...node.tags.slice(0, 3).map((tag) => tagLabel(tag, language))]} />
            </div>
            <span><span className="kind-label">{kindLabel(node.kind, language)}</span></span>
            <div className="row-tags">{node.tags.slice(0, 4).map((tag) => <span key={tag}>{tagLabel(tag, language)}</span>)}</div>
            <span><HealthBadge health={node.health} language={language} /></span>
            <span className="source-cell">{nodeEnvironment(node)}</span>
          </div>
        );
      })}
    </div>
  );
}

function AssetsPage({
  page,
  snapshot,
  scope,
  language,
}: {
  page: "skills" | "integrations";
  snapshot: ObservatorySnapshot;
  scope: ObservatoryScope;
  language: Language;
}) {
  const copy = ec(language);
  const [search, setSearch] = useState("");
  const [tag, setTag] = useState("all");
  const [kind, setKind] = useState<NodeKind | "all">("all");
  const [pageNumber, setPageNumber] = useState(1);
  const scoped = nodesInScope(snapshot, scope);
  const kinds: NodeKind[] =
    page === "skills" ? ["skill"] : ["plugin", "hook", "mcp-server"];
  const filtered = scoped.filter((node) => {
    if (!kinds.includes(node.kind)) return false;
    if (kind !== "all" && node.kind !== kind) return false;
    if (tag !== "all" && !node.tags.includes(tag)) return false;
    const text = getLocalizedNodeText(node, language);
    return (
      !search ||
      `${text.label} ${text.summary} ${node.tags.join(" ")}`
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase())
    );
  });
  useEffect(() => setPageNumber(1), [search, tag, kind, scope.environment]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice(
    (pageNumber - 1) * PAGE_SIZE,
    pageNumber * PAGE_SIZE,
  );
  const placeholder =
    page === "skills" ? copy.searchSkills : copy.searchIntegrations;
  return (
    <>
      <PageHeader
        page={page}
        language={language}
        actions={<SearchField value={search} onChange={setSearch} placeholder={placeholder} />}
      />
      {scope.projectId && <div className="scope-notice"><CircleAlert size={15} />{copy.projectAssetsNotice}</div>}
      <div className="asset-toolbar">
        {page === "integrations" && (
          <div className="kind-filters">
            <button type="button" className={kind === "all" ? "active" : ""} onClick={() => setKind("all")}>{t(language, "controls", "allKinds")}</button>
            {kinds.map((candidate) => (
              <button type="button" key={candidate} className={kind === candidate ? "active" : ""} onClick={() => setKind(candidate)}>
                {kindLabel(candidate, language)}
              </button>
            ))}
          </div>
        )}
        {page === "skills" && (
          <div className="tag-filters">
            <button type="button" className={tag === "all" ? "active" : ""} onClick={() => setTag("all")}>{t(language, "controls", "clearFilters")}</button>
            {PROGRAMMING_TAGS.filter((candidate) => scoped.some((node) => node.tags.includes(candidate))).map((candidate) => (
              <button type="button" key={candidate} className={tag === candidate ? "active" : ""} onClick={() => setTag(candidate)}>
                {tagLabel(candidate, language)}
              </button>
            ))}
          </div>
        )}
        <span className="result-count">{t(language, "controls", "resultCount", { count: filtered.length })}</span>
      </div>
      <section className="wide-table-panel">
        {visible.length ? <AssetTable nodes={visible} language={language} /> : <EmptyState text={t(language, "states", "noResults")} />}
      </section>
      <Pagination page={pageNumber} pageCount={pageCount} language={language} onChange={setPageNumber} />
    </>
  );
}

interface VisualNode {
  id: string;
  label: string;
  sublabel: string;
  kind: "environment" | "project" | "primary" | "subagent" | "skill";
  x: number;
  y: number;
  environment?: EnvironmentKind;
  projectId?: string;
  description: string;
  descriptionSource: "derived" | "role-template" | "skill-manifest" | "session-attribution";
  descriptionReason: string;
  skills: string[];
  executionCount?: number;
  lastObservedAt?: string;
  observedUses?: number;
  projectBreadth?: number;
  projectIds?: string[];
  signal?: GraphSignal;
  repeatedDescriptionCount?: number;
}

interface VisualEdge {
  source: string;
  target: string;
  relation: "contains" | "runs" | "uses";
}

interface AgentSkillLink {
  sourceId: string;
  skill: string;
  observedAt?: string;
  observedUses: number;
  projectId: string;
}

const normalizeGraphIdentity = (value: string) =>
  value.normalize("NFKC").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-");

const graphDescriptionReason = (
  language: Language,
  source: VisualNode["descriptionSource"],
) => {
  const reasons = {
    derived: {
      en: "Generated from observed project and session counts.",
      ko: "관찰된 프로젝트·세션 수를 바탕으로 생성한 요약입니다.",
    },
    "role-template": {
      en: "A privacy-safe role template is used because the local log exposes a role or attributed skill, not the private task prompt.",
      ko: "로컬 로그에는 비공개 작업 프롬프트가 아니라 역할 또는 귀속 스킬만 남기 때문에 개인정보를 보호하는 공통 역할 설명을 사용합니다.",
    },
    "skill-manifest": {
      en: "Read from the installed skill manifest.",
      ko: "설치된 스킬 매니페스트에서 읽은 설명입니다.",
    },
    "session-attribution": {
      en: "The skill name was observed in session metadata, but no matching installed manifest description was found.",
      ko: "세션 메타데이터에서 스킬 이름은 관찰했지만 일치하는 설치 매니페스트 설명을 찾지 못했습니다.",
    },
  } as const;
  return reasons[source][language];
};

function appendSkillLayer(
  snapshot: ObservatorySnapshot,
  nodes: VisualNode[],
  edges: VisualEdge[],
  links: AgentSkillLink[],
  language: Language,
  x: number,
  limit = 12,
) {
  const manifests = new Map(
    snapshot.nodes
      .filter((node) => node.kind === "skill")
      .map((node) => [normalizeGraphIdentity(node.label), node]),
  );
  const aggregate = new Map<string, {
    label: string;
    sourceIds: Set<string>;
    projectIds: Set<string>;
    observedUses: number;
    lastObservedAt?: string;
  }>();

  for (const link of links) {
    const key = normalizeGraphIdentity(link.skill);
    if (!key) continue;
    const current = aggregate.get(key) ?? {
      label: link.skill,
      sourceIds: new Set<string>(),
      projectIds: new Set<string>(),
      observedUses: 0,
    };
    current.sourceIds.add(link.sourceId);
    current.projectIds.add(link.projectId);
    current.observedUses += Math.max(1, link.observedUses);
    if (link.observedAt && (!current.lastObservedAt || link.observedAt > current.lastObservedAt)) {
      current.lastObservedAt = link.observedAt;
    }
    aggregate.set(key, current);
  }

  const visible = [...aggregate.entries()]
    .sort((left, right) =>
      right[1].observedUses - left[1].observedUses
      || right[1].sourceIds.size - left[1].sourceIds.size
      || left[1].label.localeCompare(right[1].label),
    )
    .slice(0, limit);
  const visibleKeys = new Set(visible.map(([key]) => key));
  const rowStep = Math.min(58, 620 / Math.max(visible.length, 1));

  visible.forEach(([key, usage], index) => {
    const manifest = manifests.get(key);
    const localized = manifest ? getLocalizedNodeText(manifest, language) : null;
    const descriptionSource = manifest ? "skill-manifest" : "session-attribution";
    nodes.push({
      id: `skill-${key}`,
      label: localized?.label || usage.label,
      sublabel: `${usage.observedUses} ${language === "ko" ? "회 사용" : "uses"} · ${usage.sourceIds.size} ${language === "ko" ? "개 연결" : "links"}`,
      kind: "skill",
      x,
      y: 38 + index * rowStep,
      description: localized?.summary || (
        language === "ko"
          ? "세션 메타데이터에서 이 스킬의 사용 흔적이 관찰되었습니다."
          : "Use of this skill was observed in session metadata."
      ),
      descriptionSource,
      descriptionReason: graphDescriptionReason(language, descriptionSource),
      skills: [],
      executionCount: usage.observedUses,
      observedUses: usage.observedUses,
      projectBreadth: usage.projectIds.size,
      projectIds: [...usage.projectIds],
      ...(usage.lastObservedAt ? { lastObservedAt: usage.lastObservedAt } : {}),
    });
  });

  for (const link of links) {
    const key = normalizeGraphIdentity(link.skill);
    if (!visibleKeys.has(key)) continue;
    const edgeId = `${link.sourceId}-skill-${key}`;
    if (!edges.some((edge) => `${edge.source}-${edge.target}` === edgeId)) {
      edges.push({ source: link.sourceId, target: `skill-${key}`, relation: "uses" });
    }
  }
}

function buildScopeGraph(
  snapshot: ObservatorySnapshot,
  scope: ObservatoryScope,
  language: Language,
): { nodes: VisualNode[]; edges: VisualEdge[] } {
  const projects = projectsInScope(snapshot, scope);
  const sessions = sessionsInScope(snapshot, scope);
  if (scope.projectId) {
    const project = projects[0];
    if (!project) return { nodes: [], edges: [] };
    const primary = sessions.filter((session) => session.kind === "primary").slice(0, 12);
    const subagents = groupSubagentExecutions(sessions, { preserveParent: false }).slice(0, 20);
    const nodes: VisualNode[] = [{
      id: project.id,
      label: project.label,
      sublabel: project.environment,
      kind: "project",
      x: 40,
      y: 330,
      environment: project.environment,
      projectId: project.id,
      description: project.environment + " project with " + project.sessionCount + " observed sessions.",
      descriptionSource: "derived",
      descriptionReason: graphDescriptionReason(language, "derived"),
      skills: [],
      lastObservedAt: project.lastObservedAt,
    }];
    primary.forEach((session, index) => nodes.push({
      id: session.id,
      label: session.label,
      sublabel: session.role,
      kind: "primary",
      x: 330,
      y: 70 + index * Math.min(54, 590 / Math.max(primary.length, 1)),
      environment: session.environment,
      projectId: session.projectId,
      description: session.localizedDescription?.[language] || session.description || "Primary execution session.",
      descriptionSource: "derived",
      descriptionReason: graphDescriptionReason(language, "derived"),
      skills: session.skills ?? [],
      executionCount: 1,
      observedUses: 1,
      projectBreadth: 1,
      lastObservedAt: session.observedAt,
    }));
    subagents.forEach((group, index) => nodes.push({
      id: group.id,
      label: group.label,
      sublabel: group.role + (group.executionCount > 1 ? ` \u00b7 ${group.executionCount}${language === "ko" ? "\ud68c" : " runs"}` : ""),
      kind: "subagent",
      x: 640 + (index % 2) * 230,
      y: 38 + Math.floor(index / 2) * 58,
      environment: group.environment,
      projectId: group.projectId,
      description: group.localizedDescription?.[language] || group.description,
      descriptionSource: "role-template",
      descriptionReason: graphDescriptionReason(language, "role-template"),
      skills: group.skills,
      executionCount: group.executionCount,
      observedUses: group.executionCount,
      projectBreadth: 1,
      lastObservedAt: group.lastObservedAt,
    }));
    const edges: VisualEdge[] = [
      ...primary.map((session) => ({ source: project.id, target: session.id, relation: "runs" as const })),
      ...subagents.map((group) => ({ source: project.id, target: group.id, relation: "runs" as const })),
    ];
    const skillLinks: AgentSkillLink[] = [
      ...primary.flatMap((session) => (session.skills ?? []).map((skill) => ({
        sourceId: session.id, skill, observedAt: session.observedAt, observedUses: 1, projectId: session.projectId,
      }))),
      ...subagents.flatMap((group) => group.skills.map((skill) => ({
        sourceId: group.id, skill, observedAt: group.lastObservedAt, observedUses: group.executionCount, projectId: group.projectId,
      }))),
    ];
    appendSkillLayer(snapshot, nodes, edges, skillLinks, language, 1170);
    return { nodes, edges };
  }

  const environments = (snapshot.environments ?? []).filter(
    (environment) =>
      scope.environment === "all" || environment.id === scope.environment,
  );
  const visibleProjects = projects.slice(0, 30);
  const nodes: VisualNode[] = environments.map((environment, index) => ({
    id: `environment-${environment.id}`,
    label: environment.label,
    sublabel: `${environment.projectCount} projects`,
    kind: "environment",
    x: 70,
    y: 190 + index * 260,
    environment: environment.id,
    description: environment.label + " local agent environment.",
    descriptionSource: "derived",
    descriptionReason: graphDescriptionReason(language, "derived"),
    skills: [],
  }));
  visibleProjects.forEach((project, index) => nodes.push({
    id: project.id,
    label: project.label,
    sublabel: `${project.sessionCount} sessions \u00b7 ${project.subagentCount} subagents`,
    kind: "project",
    x: 370 + (index % 3) * 245,
    y: 45 + Math.floor(index / 3) * 64,
    environment: project.environment,
    projectId: project.id,
    description: project.sessionCount + " sessions and " + project.subagentCount + " subagent runs observed.",
    descriptionSource: "derived",
    descriptionReason: graphDescriptionReason(language, "derived"),
    skills: [],
    lastObservedAt: project.lastObservedAt,
  }));
  const edges: VisualEdge[] = visibleProjects.map((project) => ({
    source: `environment-${project.environment}`,
    target: project.id,
    relation: "contains",
  }));
  const visibleProjectIds = new Set(visibleProjects.map((project) => project.id));
  const skillLinks: AgentSkillLink[] = sessions
    .filter((session) => visibleProjectIds.has(session.projectId))
    .flatMap((session) => (session.skills ?? []).map((skill) => ({
      sourceId: session.projectId, skill, observedAt: session.observedAt, observedUses: 1, projectId: session.projectId,
    })));
  appendSkillLayer(snapshot, nodes, edges, skillLinks, language, 1170, 10);
  return { nodes, edges };
}

function GraphPage({
  snapshot,
  scope,
  language,
  onScopeChange,
}: {
  snapshot: ObservatorySnapshot;
  scope: ObservatoryScope;
  language: Language;
  onScopeChange: (scope: ObservatoryScope) => void;
}) {
  const copy = ec(language);
  const labels = language === "ko"
    ? {
        title: "에이전트·스킬 영향 지도",
        hint: "현재 관찰 범위에서 반복 사용과 연결이 많은 노드를 강조합니다.",
        high: "강한 관찰 신호",
        medium: "중간 관찰 신호",
        baseline: "기본",
        influence: "관찰 영향력",
        reuse: "활용도 proxy",
        uses: "관찰 사용",
        connections: "연결",
        projects: "프로젝트",
        evidence: "점수 근거",
        caveat: "성공률·토큰·처리 시간 데이터가 없어 실제 효율성을 직접 측정하지 않습니다. 활용도 proxy는 현재 화면의 반복 관찰·연결·프로젝트 범위만 비교한 상대값입니다.",
        descriptionSource: "설명 출처",
        repeated: "개 노드가 같은 설명을 공유합니다.",
        lastObserved: "최근 관찰",
        roleTemplate: "공통 역할 템플릿",
        skillManifest: "SKILL.md 매니페스트",
        sessionAttribution: "세션 귀속 메타데이터",
        derived: "관찰값 기반 요약",
        kinds: {
          environment: "환경",
          project: "프로젝트",
          primary: "기본 세션",
          subagent: "서브에이전트 역할",
          skill: "스킬",
        },
      }
    : {
        title: "Agent and skill influence map",
        hint: "Highlights nodes with stronger reuse and connection evidence in the current observation.",
        high: "Strong observed signal",
        medium: "Moderate observed signal",
        baseline: "Baseline",
        influence: "Observed influence",
        reuse: "Reuse proxy",
        uses: "Observed uses",
        connections: "Connections",
        projects: "Projects",
        evidence: "Score evidence",
        caveat: "Success rate, token use, and elapsed time are not collected, so actual efficiency is not measured. The reuse proxy is a relative comparison of repeated observations, connections, and project breadth in this view.",
        descriptionSource: "Description source",
        repeated: "nodes share this description.",
        lastObserved: "Last observed",
        roleTemplate: "Shared role template",
        skillManifest: "SKILL.md manifest",
        sessionAttribution: "Session attribution metadata",
        derived: "Observation-derived summary",
        kinds: {
          environment: "Environment",
          project: "Project",
          primary: "Primary session",
          subagent: "Subagent role",
          skill: "Skill",
        },
      };

  const graph = useMemo(() => {
    const base = buildScopeGraph(snapshot, scope, language);
    const signals = new Map(
      calculateGraphSignals(base.nodes, base.edges, snapshot.observedAt)
        .map((signal) => [signal.nodeId, signal]),
    );
    const repeatedDescriptions = countRepeatedDescriptions(base.nodes);
    return {
      edges: base.edges,
      nodes: base.nodes.map((node) => ({
        ...node,
        ...(signals.has(node.id) ? { signal: signals.get(node.id) } : {}),
        ...(repeatedDescriptions.has(node.id)
          ? { repeatedDescriptionCount: repeatedDescriptions.get(node.id) }
          : {}),
      })),
    };
  }, [snapshot, scope, language]);
  const positions = new Map(graph.nodes.map((node) => [node.id, node]));
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const activeNode = graph.nodes.find((node) => node.id === activeNodeId);
  const sourceLabel = (source: VisualNode["descriptionSource"]) => ({
    derived: labels.derived,
    "role-template": labels.roleTemplate,
    "skill-manifest": labels.skillManifest,
    "session-attribution": labels.sessionAttribution,
  })[source];
  const scoreLabel = (node: VisualNode) => node.signal
    ? `, ${labels.influence} ${node.signal.influenceScore}, ${labels.reuse} ${node.signal.efficiencyProxyScore}`
    : "";

  return (
    <>
      <PageHeader page="graph" language={language} />
      <section className="graph-page-panel">
        <div className="graph-page-toolbar">
          <div><p className="eyebrow">{copy.environmentGraph}</p><h2>{labels.title}</h2></div>
          <div className="graph-signal-legend" aria-label={labels.hint}>
            <span className="legend-high">{labels.high}</span>
            <span className="legend-medium">{labels.medium}</span>
            <span>{labels.baseline}</span>
          </div>
        </div>
        {graph.nodes.length ? (
          <div className="large-graph-shell">
            {activeNode && (
              <aside className="graph-role-inspector" aria-label={`${activeNode.label} ${labels.evidence}`}>
                <span>{labels.kinds[activeNode.kind]}</span>
                <strong>{activeNode.label}</strong>
                <p>{activeNode.description}</p>
                {activeNode.signal && (
                  <>
                    <div className="graph-inspector-scores">
                      <div><small>{labels.influence}</small><b>{activeNode.signal.influenceScore}</b></div>
                      <div><small>{labels.reuse}</small><b>{activeNode.signal.efficiencyProxyScore}</b></div>
                    </div>
                    <div className="graph-inspector-evidence">
                      <small>{labels.uses} {activeNode.signal.observedUses}</small>
                      <small>{labels.connections} {activeNode.signal.connectionCount}</small>
                      <small>{labels.projects} {activeNode.signal.projectBreadth}</small>
                    </div>
                    <p className="graph-score-caveat">{labels.caveat}</p>
                  </>
                )}
                <div className="graph-description-evidence">
                  <small>{labels.descriptionSource}</small>
                  <b>{sourceLabel(activeNode.descriptionSource)}</b>
                  <p>{activeNode.descriptionReason}</p>
                  {activeNode.repeatedDescriptionCount && activeNode.repeatedDescriptionCount > 1 && (
                    <em>{activeNode.repeatedDescriptionCount} {labels.repeated}</em>
                  )}
                </div>
                <div className="graph-inspector-tags">
                  {activeNode.executionCount && activeNode.executionCount > 1 && (
                    <small>{activeNode.executionCount} {language === "ko" ? "회 반복 관찰" : "observed runs"}</small>
                  )}
                  {activeNode.skills.map((skill) => <small key={skill}>{skill}</small>)}
                  {activeNode.lastObservedAt && <small>{labels.lastObserved} · {formatDate(language, activeNode.lastObservedAt)}</small>}
                </div>
              </aside>
            )}
            <p className="graph-observation-note">{labels.hint}</p>
            <ul className="sr-only">
              {graph.nodes.map((node) => (
                <li key={`accessible-${node.id}`}>
                  {labels.kinds[node.kind]} {node.label}. {node.description}{scoreLabel(node)}. {node.descriptionReason}
                </li>
              ))}
            </ul>
            <svg className="large-graph" viewBox="0 0 1400 720">
              <title>{labels.title}</title>
              <defs>
                <marker id="scope-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                  <path d="M 0 0 L 10 5 L 0 10 z" />
                </marker>
              </defs>
              <g className="large-graph-guides" aria-hidden="true">
                <line x1="280" y1="30" x2="280" y2="690" />
                <line x1="570" y1="30" x2="570" y2="690" />
                <line x1="1100" y1="30" x2="1100" y2="690" />
              </g>
              <g className="large-graph-edges" aria-hidden="true">
                {graph.edges.map((edge, index) => {
                  const source = positions.get(edge.source);
                  const target = positions.get(edge.target);
                  if (!source || !target) return null;
                  const emphasized = source.signal?.band === "high" || target.signal?.band === "high";
                  return (
                    <line
                      key={`${edge.source}-${edge.target}-${index}`}
                      className={`graph-edge-${edge.relation}${emphasized ? " edge-emphasis-high" : ""}`}
                      x1={source.x + 180}
                      y1={source.y + 25}
                      x2={target.x}
                      y2={target.y + 25}
                      markerEnd="url(#scope-arrow)"
                    />
                  );
                })}
              </g>
              {graph.nodes.map((node) => {
                const canNavigate = node.kind === "project"
                  && Boolean(node.projectId && node.environment)
                  && node.projectId !== scope.projectId;
                return (
                  <g
                    key={node.id}
                    className={`large-graph-node graph-${node.kind} emphasis-${node.signal?.band || "baseline"} ${node.environment ? `environment-${node.environment}` : ""}`}
                    transform={`translate(${node.x} ${node.y})`}
                    role={canNavigate ? "button" : "group"}
                    tabIndex={0}
                    aria-label={node.label + ": " + node.description + scoreLabel(node)}
                    onMouseEnter={() => setActiveNodeId(node.id)}
                    onMouseLeave={() => setActiveNodeId((current) => current === node.id ? null : current)}
                    onFocus={() => setActiveNodeId(node.id)}
                    onBlur={() => setActiveNodeId((current) => current === node.id ? null : current)}
                    onKeyDown={(event) => {
                      if ((event.key === "Enter" || event.key === " ") && canNavigate && node.projectId && node.environment) {
                        event.preventDefault();
                        onScopeChange({ environment: node.environment, projectId: node.projectId });
                      }
                    }}
                    onClick={() => {
                      setActiveNodeId(node.id);
                      if (canNavigate && node.projectId && node.environment) {
                        onScopeChange({ environment: node.environment, projectId: node.projectId });
                      }
                    }}
                  >
                    <title>{node.label + " — " + node.description + scoreLabel(node)}</title>
                    <rect width="180" height="50" rx="10" />
                    <circle cx="18" cy="17" r="4" />
                    <text x="30" y="20" className="graph-label">
                      {node.label.length > 22 ? `${node.label.slice(0, 21)}…` : node.label}
                    </text>
                    {node.signal && <text x="156" y="20" className="graph-score">{node.signal.influenceScore}</text>}
                    <text x="18" y="37" className="graph-sublabel">
                      {node.sublabel.length > 30 ? `${node.sublabel.slice(0, 29)}…` : node.sublabel}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        ) : <EmptyState text={copy.noProjectActivity} />}
      </section>
    </>
  );
}

export default function App() {
  const { snapshot, connection, error, refresh } = useSnapshot();
  const { page, navigate } = usePage();
  const [language, setLanguage] = useState<Language>(() =>
    window.localStorage.getItem("agent-observatory-language") === "en"
      ? "en"
      : "ko",
  );
  const [scope, setScope] = useState<ObservatoryScope>({
    environment: "all",
    projectId: null,
  });
  const [contextCollapsed, setContextCollapsed] = useState(() => {
    if (window.innerWidth < 900) return true;
    return window.localStorage.getItem("agent-observatory-context-collapsed") === "true";
  });
  const copy = ec(language);
  const financeLabel = language === "ko" ? "파이낸스" : "Finance";
  const currentPageLabel = page === "finance" ? financeLabel : copy.pages[page];

  useEffect(() => {
    window.localStorage.setItem("agent-observatory-language", language);
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    window.localStorage.setItem(
      "agent-observatory-context-collapsed",
      String(contextCollapsed),
    );
  }, [contextCollapsed]);

  useEffect(() => {
    if (
      scope.projectId &&
      !(snapshot.projects ?? []).some((project) => project.id === scope.projectId)
    ) {
      setScope((current) => ({ ...current, projectId: null }));
    }
  }, [snapshot.projects, scope.projectId]);

  const currentProject = (snapshot.projects ?? []).find(
    (project) => project.id === scope.projectId,
  );

  return (
    <div className={`app-shell ${contextCollapsed ? "context-collapsed" : ""}`}>
      <a className="skip-link" href="#main">
        {language === "ko" ? "본문으로 건너뛰기" : "Skip to content"}
      </a>
      <NavigationRail page={page} language={language} navigate={navigate} />
      <aside className="context-sidebar" aria-label={copy.currentScope}>
        <div className="context-sidebar-header">
          <Brand />
          <button
            type="button"
            onClick={() => setContextCollapsed(true)}
            aria-label={language === "ko" ? "사이드바 접기" : "Collapse sidebar"}
          >
            <PanelLeftClose size={16} />
          </button>
        </div>
        <ScopeBar
          snapshot={snapshot}
          scope={scope}
          language={language}
          connection={connection}
          onScopeChange={setScope}
          onLanguageChange={() =>
            setLanguage((current) => (current === "ko" ? "en" : "ko"))
          }
          onRefresh={refresh}
        />
        <div className="context-sidebar-note">
          <ShieldCheck size={14} />
          <span>{copy.liveMetadataOnly}</span>
        </div>
      </aside>

      <section className="workspace-frame">
        <header className="workspace-topbar">
          <div className="workspace-heading">
            <button
              className="context-toggle"
              type="button"
              onClick={() => setContextCollapsed((current) => !current)}
              aria-expanded={!contextCollapsed}
              aria-label={language === "ko" ? (contextCollapsed ? "사이드바 열기" : "사이드바 접기") : (contextCollapsed ? "Open sidebar" : "Collapse sidebar")}
            >
              {contextCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            </button>
            <span>Agent Observatory</span>
            <ChevronRight size={13} />
            <strong>{currentPageLabel}</strong>
          </div>
          <div className="workspace-actions">
            {currentProject && (
              <span className="top-project-label">
                <FolderGit2 size={14} />
                {disambiguatedProjectLabel(currentProject, snapshot.projects ?? [])}
              </span>
            )}
            <ConnectionBadge connection={connection} language={language} />
            <button
              className="icon-action"
              type="button"
              onClick={refresh}
              aria-label={t(language, "scan", "scanAgain")}
            >
              <RefreshCw size={15} className={connection === "loading" ? "is-spinning" : ""} />
            </button>
            <button
              className="language-toggle"
              type="button"
              onClick={() => setLanguage((current) => (current === "ko" ? "en" : "ko"))}
              aria-label={t(language, "language", "toggleLabel")}
            >
              <Languages size={15} />
              {language === "ko" ? "EN" : "KO"}
            </button>
          </div>
        </header>

        <main id="main" className="page-main" tabIndex={-1}>
          {connection === "fallback" && (
            <div className="fallback-banner" role="status">
              <CircleAlert size={18} />
              <div>
                <strong>{t(language, "scan", "fallbackActivated")}</strong>
                <span>{t(language, "scan", "fallbackReason")}{error ? ` · ${error}` : ""}</span>
              </div>
            </div>
          )}
          {page === "overview" && (
            <OverviewPage snapshot={snapshot} scope={scope} language={language} navigate={navigate} onScopeChange={setScope} />
          )}
          {page === "projects" && (
            <ProjectsPage snapshot={snapshot} scope={scope} language={language} navigate={navigate} onScopeChange={setScope} />
          )}
          {page === "agents" && (
            <AgentsPage snapshot={snapshot} scope={scope} language={language} />
          )}
          {page === "registry" && (
            <AgentRegistryPage snapshot={snapshot} scope={scope} language={language} onRefresh={refresh} />
          )}
          {page === "finance" && (
            <FinancePage language={language} />
          )}
          {(page === "skills" || page === "integrations") && (
            <AssetsPage page={page} snapshot={snapshot} scope={scope} language={language} />
          )}
          {page === "graph" && (
            <GraphPage snapshot={snapshot} scope={scope} language={language} onScopeChange={setScope} />
          )}
        </main>
        <footer className="app-footer">
          <span><ShieldCheck size={14} />{copy.liveMetadataOnly}</span>
          <span>Agent Observatory · local only</span>
        </footer>
      </section>
    </div>
  );
}