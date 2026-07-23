import { useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Bot,
  Boxes,
  Check,
  ChevronDown,
  CircleAlert,
  CircleHelp,
  Command,
  GitCompare,
  Grid2X2,
  Library,
  Menu,
  Network,
  Play,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  deriveOverview,
  explainSimilarity,
  type GraphNode,
  type HealthState,
} from "@agent-observatory/core";
import { defaultFinanceGuardrails } from "@agent-observatory/finance";
import { fixture } from "./data/fixture";

const globalNav = ["Overview", "Registry", "Graph", "Compare", "Finance"];

const sideNavItems = [
  { label: "Overview", icon: Grid2X2, active: true },
  { label: "Graph explorer", icon: Network },
  { label: "Skill library", icon: Library },
  { label: "Agent compare", icon: GitCompare },
  { label: "Agent builder", icon: Bot },
];

const graphPositions: Record<string, [number, number]> = {
  "agent-research": [120, 96],
  "agent-builder": [120, 260],
  "agent-portfolio": [120, 424],
  "skill-filings": [420, 76],
  "skill-etf": [420, 198],
  "skill-ui": [420, 316],
  "skill-bonds": [420, 438],
  "mcp-sec": [742, 88],
  "mcp-market": [742, 260],
  "mcp-files": [742, 414],
};

const kindLabel: Record<GraphNode["kind"], string> = {
  agent: "Agent",
  skill: "Skill",
  plugin: "Plugin",
  hook: "Hook",
  "mcp-server": "MCP",
  "mcp-tool": "Tool",
  provider: "Provider",
  project: "Project",
  permission: "Permission",
  execution: "Execution",
  memory: "Memory",
  workflow: "Workflow",
  tag: "Tag",
};

function Brand() {
  return (
    <div className="brand" aria-label="Agent Observatory">
      <span className="brand-orb" aria-hidden="true" />
      <span>Agent Observatory</span>
    </div>
  );
}

function StatusPill({ status }: { status: HealthState }) {
  return (
    <span className={`status-pill status-${status}`}>
      <span className="status-dot" aria-hidden="true" />
      {status}
    </span>
  );
}

function GlobalHeader() {
  return (
    <header className="global-header">
      <button className="mobile-menu" type="button" aria-label="Open navigation">
        <Menu size={20} />
      </button>
      <Brand />
      <nav className="global-nav" aria-label="Product navigation">
        {globalNav.map((item, index) => (
          <button
            type="button"
            key={item}
            className={index === 0 ? "active" : ""}
            aria-current={index === 0 ? "page" : undefined}
          >
            {item}
          </button>
        ))}
      </nav>
      <div className="header-actions">
        <button className="icon-button" type="button" aria-label="Search">
          <Search size={18} />
        </button>
        <button className="help-button" type="button">
          <CircleHelp size={17} />
          Help
        </button>
        <button className="primary-button compact" type="button">
          <Play size={13} fill="currentColor" />
          Run scan
        </button>
        <button className="profile-button" type="button" aria-label="Open profile">
          J
        </button>
      </div>
    </header>
  );
}

function SideNavigation() {
  return (
    <aside className="side-navigation">
      <button className="workspace-switcher" type="button">
        <span className="workspace-mark"><Command size={16} /></span>
        <span>
          <small>Workspace</small>
          Local system
        </span>
        <ChevronDown size={16} />
      </button>

      <nav className="side-nav-list" aria-label="Workspace navigation">
        <span className="nav-label">Observe</span>
        {sideNavItems.map(({ label, icon: Icon, active }) => (
          <button
            type="button"
            key={label}
            className={active ? "side-nav-item active" : "side-nav-item"}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={18} strokeWidth={1.8} />
            {label}
          </button>
        ))}
      </nav>

      <div className="side-spacer" />

      <article className="finance-callout">
        <div className="mini-orb" aria-hidden="true" />
        <span className="callout-kicker">Domain pack</span>
        <strong>Finance controls are active.</strong>
        <p>Read-only tools, source freshness, and citations are enforced.</p>
        <button type="button">
          Review controls <ArrowRight size={14} />
        </button>
      </article>

      <button className="side-nav-item settings-link" type="button">
        <Settings size={18} strokeWidth={1.8} />
        Settings
      </button>
    </aside>
  );
}

function MetricStrip({
  metrics,
}: {
  metrics: ReturnType<typeof deriveOverview>;
}) {
  const items = [
    {
      label: "Observed assets",
      value: metrics.totalAssets,
      note: "3 agents 쨌 5 skills 쨌 3 MCPs",
      accent: "neutral",
    },
    {
      label: "Healthy",
      value: `${metrics.healthyPercent}%`,
      note: "7 passing health checks",
      accent: "green",
    },
    {
      label: "Disconnected",
      value: metrics.disconnectedCount,
      note: "1 unused skill to review",
      accent: "amber",
    },
    {
      label: "Finance coverage",
      value: `${metrics.financeCoveragePercent}%`,
      note: "Provenance rules enabled",
      accent: "pink",
    },
  ];

  return (
    <section className="metric-strip" aria-label="System metrics">
      {items.map((item) => (
        <article className={`metric-item metric-${item.accent}`} key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          <p>{item.note}</p>
        </article>
      ))}
    </section>
  );
}

function RelationshipGraph() {
  const visibleNodes = fixture.nodes.filter((node) => graphPositions[node.id]);
  const visibleIds = new Set(visibleNodes.map((node) => node.id));
  const visibleEdges = fixture.edges.filter(
    (edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target),
  );

  return (
    <div className="graph-canvas">
      <svg
        className="relationship-graph"
        viewBox="0 0 860 520"
        role="img"
        aria-labelledby="graph-title graph-description"
      >
        <title id="graph-title">Agent, skill, and MCP relationship graph</title>
        <desc id="graph-description">
          Three agents connect to four skills and three MCP servers. Amber markers
          identify items that need attention.
        </desc>
        <defs>
          <linearGradient id="agentOrb" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ff7a59" />
            <stop offset=".48" stopColor="#ec4899" />
            <stop offset="1" stopColor="#6d5dfc" />
          </linearGradient>
        </defs>
        {visibleEdges.map((edge) => {
          const [x1, y1] = graphPositions[edge.source];
          const [x2, y2] = graphPositions[edge.target];
          const overlap = edge.kind === "OVERLAPS";
          return (
            <path
              key={edge.id}
              d={`M ${x1 + 76} ${y1} C ${x1 + 180} ${y1}, ${x2 - 180} ${y2}, ${x2 - 76} ${y2}`}
              className={overlap ? "graph-edge graph-edge-overlap" : "graph-edge"}
            />
          );
        })}
        {visibleNodes.map((node) => {
          const [x, y] = graphPositions[node.id];
          return (
            <g
              key={node.id}
              className={`graph-node graph-${node.kind} graph-${node.health}`}
              transform={`translate(${x}, ${y})`}
              tabIndex={0}
              role="button"
              aria-label={`${node.label}, ${kindLabel[node.kind]}, ${node.health}`}
            >
              <rect x="-76" y="-34" width="152" height="68" rx="14" />
              <circle
                className="node-orb"
                cx="-54"
                cy="-12"
                r="7"
                fill={node.kind === "agent" ? "url(#agentOrb)" : undefined}
              />
              <text className="node-kind" x="-40" y="-8">
                {kindLabel[node.kind]}
              </text>
              <text className="node-label" x="-54" y="17">
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="graph-legend" aria-hidden="true">
        <span><i className="legend-agent" /> Agent</span>
        <span><i className="legend-skill" /> Skill</span>
        <span><i className="legend-mcp" /> MCP server</span>
        <span><i className="legend-attention" /> Needs attention</span>
      </div>
    </div>
  );
}

function FinancePosture() {
  return (
    <article className="panel posture-panel">
      <div className="panel-heading">
        <div>
          <span className="section-kicker">Finance pack</span>
          <h2>Protected by default</h2>
        </div>
        <div className="posture-orb" aria-hidden="true" />
      </div>

      <div className="posture-score">
        <strong>3 of 3</strong>
        <span>guardrails active</span>
      </div>

      <ul className="guardrail-list">
        {defaultFinanceGuardrails.map((guardrail) => (
          <li key={guardrail.id}>
            <span className="check-mark"><Check size={13} /></span>
            <span>
              <strong>{guardrail.label}</strong>
              <small>{guardrail.detail}</small>
            </span>
          </li>
        ))}
      </ul>

      <button className="secondary-button full-width" type="button">
        Open finance controls <ArrowUpRight size={15} />
      </button>
    </article>
  );
}

export function App() {
  const metrics = useMemo(() => deriveOverview(fixture), []);
  const similarity = useMemo(
    () => explainSimilarity(fixture, "agent-research", "agent-portfolio"),
    [],
  );
  const [scope, setScope] = useState<"all" | "finance">("all");
  const integrations = fixture.nodes.filter(
    (node) =>
      ["agent", "skill", "mcp-server"].includes(node.kind) &&
      (scope === "all" || node.tags.includes("finance")),
  );

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <GlobalHeader />
      <div className="workspace-frame">
        <SideNavigation />

        <main id="main-content">
          <section className="page-hero">
            <div className="hero-copy">
              <span className="eyebrow">
                <Activity size={15} />
                Local system 쨌 observed 42 seconds ago
              </span>
              <h1>Your agent system,<br />at a glance.</h1>
              <p>
                See every agent, skill, and MCP connection in one explainable
                control plane?봟efore you install, remove, or trust it.
              </p>
            </div>
            <div className="hero-actions">
              <span className="fixture-label">
                <Sparkles size={15} />
                Demo fixture
              </span>
              <button className="secondary-button" type="button">
                Import registry
              </button>
              <button className="primary-button" type="button">
                <Play size={14} fill="currentColor" />
                Run local scan
              </button>
            </div>
          </section>

          <MetricStrip metrics={metrics} />

          <section className="dashboard-grid">
            <article className="panel topology-panel">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">System map</span>
                  <h2>How everything connects</h2>
                </div>
                <div className="panel-controls">
                  <span className="connection-count">9 observed connections</span>
                  <div className="segmented" aria-label="Graph display">
                    <button className="active" type="button">Topology</button>
                    <button type="button">Health</button>
                  </div>
                </div>
              </div>
              <RelationshipGraph />
            </article>

            <FinancePosture />
          </section>

          <section className="lower-grid">
            <article className="panel inventory-panel">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">Registry</span>
                  <h2>Integration health</h2>
                </div>
                <div className="panel-controls">
                  <label className="table-search">
                    <Search size={16} />
                    <span className="sr-only">Search integrations</span>
                    <input type="search" placeholder="Search integrations" />
                  </label>
                  <div className="segmented" aria-label="Integration scope">
                    <button
                      type="button"
                      className={scope === "all" ? "active" : ""}
                      onClick={() => setScope("all")}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      className={scope === "finance" ? "active" : ""}
                      onClick={() => setScope("finance")}
                    >
                      Finance
                    </button>
                  </div>
                </div>
              </div>

              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Asset</th>
                      <th scope="col">Type</th>
                      <th scope="col">Source</th>
                      <th scope="col">Status</th>
                      <th scope="col">Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {integrations.slice(0, 7).map((node) => (
                      <tr key={node.id}>
                        <th scope="row">
                          <span className={`asset-icon asset-${node.kind}`}>
                            {node.kind === "agent" ? <Bot size={16} /> : <Boxes size={16} />}
                          </span>
                          <span>
                            <strong>{node.label}</strong>
                            <small>{node.version}</small>
                          </span>
                        </th>
                        <td>{kindLabel[node.kind]}</td>
                        <td>{node.source}</td>
                        <td><StatusPill status={node.health} /></td>
                        <td><span className={`risk risk-${node.risk}`}>{node.risk}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="panel findings-panel">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">Review queue</span>
                  <h2>Needs attention</h2>
                </div>
                <span className="finding-count">{fixture.findings.length}</span>
              </div>

              <div className="finding-list">
                {fixture.findings.map((finding) => (
                  <button className="finding" type="button" key={finding.id}>
                    <span className={`finding-icon finding-${finding.severity}`}>
                      {finding.severity === "attention" ? (
                        <CircleAlert size={17} />
                      ) : (
                        <Sparkles size={17} />
                      )}
                    </span>
                    <span>
                      <strong>{finding.title}</strong>
                      <small>{finding.detail}</small>
                      <em>{finding.action} <ArrowUpRight size={13} /></em>
                    </span>
                  </button>
                ))}
              </div>

              <div className="similarity-card">
                <span>Research agent similarity</span>
                <strong>{similarity.score}%</strong>
                <p>{similarity.explanation}</p>
              </div>
            </article>
          </section>
        </main>
      </div>
    </div>
  );
}



