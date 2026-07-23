import { useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Bot,
  Boxes,
  Check,
  ChevronDown,
  CircleAlert,
  Command,
  GitCompare,
  LayoutDashboard,
  Library,
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

const navItems = [
  { label: "Overview", icon: LayoutDashboard, active: true },
  { label: "Graph explorer", icon: Network },
  { label: "Skill library", icon: Library },
  { label: "Compare", icon: GitCompare },
  { label: "Agent builder", icon: Bot },
];

const graphPositions: Record<string, [number, number]> = {
  "agent-research": [118, 82],
  "agent-builder": [126, 242],
  "agent-portfolio": [126, 398],
  "skill-filings": [364, 62],
  "skill-etf": [364, 178],
  "skill-ui": [364, 284],
  "skill-bonds": [364, 408],
  "mcp-sec": [620, 70],
  "mcp-market": [620, 264],
  "mcp-files": [620, 390],
};

const kindLabel: Record<GraphNode["kind"], string> = {
  agent: "Agent",
  skill: "Skill",
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

function StatusPill({
  status,
  label,
}: {
  status: HealthState;
  label?: string;
}) {
  return (
    <span className={`status-pill status-${status}`}>
      <span className="status-dot" aria-hidden="true" />
      {label ?? status}
    </span>
  );
}

function MetricCard({
  eyebrow,
  value,
  detail,
  tone,
}: {
  eyebrow: string;
  value: string;
  detail: string;
  tone: "blue" | "green" | "amber" | "violet";
}) {
  return (
    <article className={`metric-card metric-${tone}`}>
      <div className="metric-head">
        <span>{eyebrow}</span>
        <ArrowUpRight size={15} aria-hidden="true" />
      </div>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function RelationshipGraph() {
  const visibleNodes = fixture.nodes.filter((node) => graphPositions[node.id]);
  const visibleIds = new Set(visibleNodes.map((node) => node.id));
  const visibleEdges = fixture.edges.filter(
    (edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target),
  );

  return (
    <div className="graph-wrap">
      <svg
        className="relationship-graph"
        viewBox="0 0 740 470"
        role="img"
        aria-labelledby="graph-title graph-description"
      >
        <title id="graph-title">Observed agent relationship graph</title>
        <desc id="graph-description">
          Three agents connect to four skills and three MCP servers. The market
          data server and bond skill require attention.
        </desc>
        <defs>
          <linearGradient id="edgeFade" x1="0" x2="1">
            <stop offset="0" stopColor="#4488ff" stopOpacity=".52" />
            <stop offset="1" stopColor="#7b8ca8" stopOpacity=".18" />
          </linearGradient>
        </defs>
        {visibleEdges.map((edge) => {
          const [x1, y1] = graphPositions[edge.source];
          const [x2, y2] = graphPositions[edge.target];
          const isOverlap = edge.kind === "OVERLAPS";
          return (
            <path
              key={edge.id}
              d={`M ${x1 + 66} ${y1} C ${x1 + 142} ${y1}, ${x2 - 142} ${y2}, ${x2 - 66} ${y2}`}
              className={isOverlap ? "edge edge-overlap" : "edge"}
              stroke={isOverlap ? "#9f7aea" : "url(#edgeFade)"}
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
              <rect x="-66" y="-28" width="132" height="56" rx="12" />
              <circle cx="-47" cy="-9" r="4" />
              <text className="node-kind" x="-37" y="-5">
                {kindLabel[node.kind]}
              </text>
              <text className="node-label" x="-47" y="14">
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="graph-legend" aria-hidden="true">
        <span><i className="legend-agent" /> Agent</span>
        <span><i className="legend-skill" /> Skill</span>
        <span><i className="legend-mcp" /> MCP</span>
      </div>
    </div>
  );
}

function AppNav() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark"><Command size={18} /></span>
        <span>Agent<br />Observatory</span>
      </div>
      <button className="workspace-switcher" type="button">
        <span>
          <small>Workspace</small>
          Local system
        </span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      <nav aria-label="Primary navigation">
        {navItems.map(({ label, icon: Icon, active }) => (
          <button
            key={label}
            type="button"
            className={active ? "nav-item active" : "nav-item"}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={17} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-spacer" />
      <div className="finance-pack">
        <span className="pack-icon"><ShieldCheck size={17} /></span>
        <div>
          <strong>Finance pack</strong>
          <span>Guardrails active</span>
        </div>
        <Check size={15} aria-hidden="true" />
      </div>
      <button className="nav-item" type="button">
        <Settings size={17} aria-hidden="true" />
        <span>Settings</span>
      </button>
      <div className="profile">
        <span className="avatar">JL</span>
        <span><strong>J3vn0</strong><small>Local operator</small></span>
        <ChevronDown size={15} />
      </div>
    </aside>
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
      <AppNav />
      <main id="main-content">
        <header className="topbar">
          <div>
            <p className="breadcrumb">Observatory <span>/</span> Overview</p>
            <h1>System overview</h1>
          </div>
          <div className="topbar-actions">
            <label className="search-field">
              <Search size={16} aria-hidden="true" />
              <span className="sr-only">Search the observatory</span>
              <input type="search" placeholder="Search agents, skills, MCPs" />
              <kbd>⌘ K</kbd>
            </label>
            <button className="scan-button" type="button">
              <Play size={14} fill="currentColor" aria-hidden="true" />
              Run local scan
            </button>
          </div>
        </header>

        <section className="page-intro">
          <div>
            <p>Understand every agent, skill, and MCP connection from one local control plane.</p>
            <span className="observed">
              <Activity size={14} aria-hidden="true" />
              Observed 42 seconds ago
            </span>
          </div>
          <span className="fixture-badge">
            <Sparkles size={13} aria-hidden="true" />
            Demo fixture
          </span>
        </section>

        <section className="metrics-grid" aria-label="System metrics">
          <MetricCard
            eyebrow="Observed assets"
            value={String(metrics.totalAssets)}
            detail="3 agents · 5 skills · 3 MCPs"
            tone="blue"
          />
          <MetricCard
            eyebrow="System health"
            value={`${metrics.healthyPercent}%`}
            detail="7 healthy · 3 need attention"
            tone="green"
          />
          <MetricCard
            eyebrow="Disconnected"
            value={String(metrics.disconnectedCount)}
            detail="One unused skill detected"
            tone="amber"
          />
          <MetricCard
            eyebrow="Finance coverage"
            value={`${metrics.financeCoveragePercent}%`}
            detail="Provenance guardrails active"
            tone="violet"
          />
        </section>

        <section className="primary-grid">
          <article className="panel graph-panel">
            <div className="panel-header">
              <div>
                <span className="eyebrow">Live topology</span>
                <h2>Relationship graph</h2>
              </div>
              <div className="segmented" aria-label="Graph scope">
                <button type="button" className="active">Connections</button>
                <button type="button">Health</button>
              </div>
            </div>
            <RelationshipGraph />
          </article>

          <article className="panel coverage-panel">
            <div className="panel-header">
              <div>
                <span className="eyebrow">Domain posture</span>
                <h2>Finance guardrails</h2>
              </div>
              <ShieldCheck size={19} className="violet-icon" aria-hidden="true" />
            </div>
            <div className="guardrail-score">
              <div className="score-ring" aria-label="Three of three finance guardrails active">
                <span>3/3</span>
              </div>
              <div>
                <strong>Protected by default</strong>
                <p>Mutation tools are absent from the observed graph.</p>
              </div>
            </div>
            <ul className="guardrail-list">
              {defaultFinanceGuardrails.map((guardrail) => (
                <li key={guardrail.id}>
                  <span className="check-icon"><Check size={13} /></span>
                  <span>
                    <strong>{guardrail.label}</strong>
                    <small>{guardrail.detail}</small>
                  </span>
                </li>
              ))}
            </ul>
            <button className="text-button" type="button">
              Open finance pack <ArrowUpRight size={14} />
            </button>
          </article>
        </section>

        <section className="secondary-grid">
          <article className="panel integrations-panel">
            <div className="panel-header">
              <div>
                <span className="eyebrow">Inventory</span>
                <h2>Integration health</h2>
              </div>
              <div className="segmented" aria-label="Integration filters">
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
                  {integrations.slice(0, 6).map((node) => (
                    <tr key={node.id}>
                      <th scope="row">
                        <span className={`asset-icon asset-${node.kind}`}>
                          {node.kind === "agent" ? <Bot size={14} /> : <Boxes size={14} />}
                        </span>
                        <span><strong>{node.label}</strong><small>{node.version}</small></span>
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
            <div className="panel-header">
              <div>
                <span className="eyebrow">Explainable findings</span>
                <h2>Needs attention</h2>
              </div>
              <span className="finding-count">{fixture.findings.length}</span>
            </div>
            <div className="finding-list">
              {fixture.findings.map((finding) => (
                <button className="finding" type="button" key={finding.id}>
                  <span className={`finding-icon finding-${finding.severity}`}>
                    {finding.severity === "attention" ? (
                      <CircleAlert size={15} />
                    ) : (
                      <Sparkles size={15} />
                    )}
                  </span>
                  <span>
                    <strong>{finding.title}</strong>
                    <small>{finding.detail}</small>
                    <em>{finding.action} <ArrowUpRight size={12} /></em>
                  </span>
                </button>
              ))}
            </div>
            <div className="similarity-note">
              <span>Agent similarity</span>
              <strong>{similarity.score}%</strong>
              <p>{similarity.explanation}</p>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}

