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
    <span className={`connection-badge connection-${connection}`}>
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
  kind: "environment" | "project" | "primary" | "subagent";
  x: number;
  y: number;
  environment?: EnvironmentKind;
  projectId?: string;
  description: string;
  skills: string[];
  executionCount?: number;
}

interface VisualEdge {
  source: string;
  target: string;
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
    const subagents = groupSubagentExecutions(sessions, { preserveParent: true }).slice(0, 20);
    const nodes: VisualNode[] = [{
      id: project.id,
      label: project.label,
      sublabel: project.environment,
      kind: "project",
      x: 80,
      y: 330,
      environment: project.environment,
      projectId: project.id,
      description: project.environment + " project with " + project.sessionCount + " observed sessions.",
      skills: [],
    }];
    primary.forEach((session, index) => nodes.push({
      id: session.id,
      label: session.label,
      sublabel: session.role,
      kind: "primary",
      x: 470,
      y: 70 + index * Math.min(54, 590 / Math.max(primary.length, 1)),
      environment: session.environment,
      projectId: session.projectId,
      description: session.localizedDescription?.[language] || session.description || "Primary execution session.",
      skills: session.skills ?? [],
      executionCount: 1,
    }));
    subagents.forEach((group, index) => nodes.push({
      id: group.id,
      label: group.label,
      sublabel: group.role + (group.executionCount > 1 ? " · " + group.executionCount + "×" : ""),
      kind: "subagent",
      x: 900 + (index % 2) * 250,
      y: 38 + Math.floor(index / 2) * 58,
      environment: group.environment,
      projectId: group.projectId,
      description: group.localizedDescription?.[language] || group.description,
      skills: group.skills,
      executionCount: group.executionCount,
    }));
    const primaryIds = new Set(primary.map((session) => session.id));
    const edges: VisualEdge[] = [
      ...primary.map((session) => ({ source: project.id, target: session.id })),
      ...subagents.map((group) => ({
        source:
          group.parentSessionId && primaryIds.has(group.parentSessionId)
            ? group.parentSessionId
            : project.id,
        target: group.id,
      })),
    ];
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
    skills: [],
  }));
  visibleProjects.forEach((project, index) => nodes.push({
    id: project.id,
    label: project.label,
    sublabel: `${project.sessionCount} sessions · ${project.subagentCount} subagents`,
    kind: "project",
    x: 420 + (index % 3) * 300,
    y: 45 + Math.floor(index / 3) * 64,
    environment: project.environment,
    projectId: project.id,
    description: project.sessionCount + " sessions and " + project.subagentCount + " subagent runs observed.",
    skills: [],
  }));
  const edges = visibleProjects.map((project) => ({
    source: `environment-${project.environment}`,
    target: project.id,
  }));
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
  const graph = useMemo(() => buildScopeGraph(snapshot, scope, language), [snapshot, scope, language]);
  const positions = new Map(graph.nodes.map((node) => [node.id, node]));
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const activeNode = graph.nodes.find((node) => node.id === activeNodeId);
  return (
    <>
      <PageHeader page="graph" language={language} />
      <section className="graph-page-panel">
        <div className="graph-page-toolbar">
          <div><p className="eyebrow">{copy.environmentGraph}</p><h2>{copy.agentHierarchy}</h2></div>
          <span><Network size={15} />{copy.graphHint}</span>
        </div>
        {graph.nodes.length ? (
          <div className="large-graph-shell">
            {activeNode && (
              <aside className="graph-role-inspector" role="status">
                <span>{activeNode.kind === "subagent" ? (language === "ko" ? "역할을 확인했습니다" : "Role identified") : kindLabel(activeNode.kind === "primary" ? "execution" : "project", language)}</span>
                <strong>{activeNode.label}</strong>
                <p>{activeNode.description}</p>
                <div>
                  {activeNode.executionCount && activeNode.executionCount > 1 && <small>{activeNode.executionCount}× {language === "ko" ? "반복 실행" : "repeated runs"}</small>}
                  {activeNode.skills.map((skill) => <small key={skill}>{skill}</small>)}
                </div>
              </aside>
            )}
            <svg className="large-graph" viewBox="0 0 1400 720" role="img" aria-label={copy.environmentGraph}>
              <defs>
                <marker id="scope-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                  <path d="M 0 0 L 10 5 L 0 10 z" />
                </marker>
              </defs>
              <g className="large-graph-guides">
                <line x1="280" y1="30" x2="280" y2="690" />
                <line x1="790" y1="30" x2="790" y2="690" />
              </g>
              <g className="large-graph-edges">
                {graph.edges.map((edge, index) => {
                  const source = positions.get(edge.source);
                  const target = positions.get(edge.target);
                  if (!source || !target) return null;
                  return <line key={`${edge.source}-${edge.target}-${index}`} x1={source.x + 180} y1={source.y + 25} x2={target.x} y2={target.y + 25} markerEnd="url(#scope-arrow)" />;
                })}
              </g>
              {graph.nodes.map((node) => (
                <g
                  key={node.id}
                  className={`large-graph-node graph-${node.kind} ${node.environment ? `environment-${node.environment}` : ""}`}
                  transform={`translate(${node.x} ${node.y})`}
                  role={node.projectId ? "button" : "group"}
                  tabIndex={0}
                  aria-label={node.label + ": " + node.description}
                  onMouseEnter={() => setActiveNodeId(node.id)}
                  onMouseLeave={() => setActiveNodeId((current) => current === node.id ? null : current)}
                  onFocus={() => setActiveNodeId(node.id)}
                  onBlur={() => setActiveNodeId((current) => current === node.id ? null : current)}
                  onKeyDown={(event) => {
                    if ((event.key === "Enter" || event.key === " ") && node.projectId && node.environment) {
                      event.preventDefault();
                      onScopeChange({ environment: node.environment, projectId: node.projectId });
                    }
                  }}
                  onClick={() => {
                    if (node.projectId && node.environment) {
                      onScopeChange({ environment: node.environment, projectId: node.projectId });
                    }
                  }}
                >
                  <title>{node.label + " — " + node.description}</title>
                  <rect width="180" height="50" rx="10" />
                  <circle cx="18" cy="17" r="4" />
                  <text x="30" y="20" className="graph-label">
                    {node.label.length > 22 ? `${node.label.slice(0, 21)}…` : node.label}
                  </text>
                  <text x="18" y="37" className="graph-sublabel">
                    {node.sublabel.length > 30 ? `${node.sublabel.slice(0, 29)}…` : node.sublabel}
                  </text>
                </g>
              ))}
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
  const copy = ec(language);
  const financeLabel = language === "ko" ? "파이낸스" : "Finance";
  const currentPageLabel = page === "finance" ? financeLabel : copy.pages[page];

  useEffect(() => {
    window.localStorage.setItem("agent-observatory-language", language);
    document.documentElement.lang = language;
  }, [language]);

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
    <div className="app-shell">
      <a className="skip-link" href="#main">
        {currentPageLabel}
      </a>
      <header className="topbar">
        <Brand />
        <nav className="page-tabs" aria-label="Agent Observatory">
          {PAGE_KEYS.map((key) => {
            const Icon = pageIcon(key);
            return (
              <a
                key={key}
                href={`#/${key}`}
                className={page === key ? "active" : ""}
                onClick={() => navigate(key)}
              >
                <Icon size={15} />
                {key === "finance" ? financeLabel : copy.pages[key]}
              </a>
            );
          })}
        </nav>
        {currentProject && (
          <span className="top-project-label">
            <FolderGit2 size={14} />
            {disambiguatedProjectLabel(currentProject, snapshot.projects ?? [])}
          </span>
        )}
      </header>
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

      <main id="main" className="page-main">
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
    </div>
  );
}
