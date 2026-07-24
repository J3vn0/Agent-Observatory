import { useEffect, useMemo, useState } from "react";
import {
  AlarmClock,
  Bot,
  Braces,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Gauge,
  History,
  LoaderCircle,
  PackageCheck,
  PlugZap,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Webhook,
  Workflow,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  groupSubagentExecutions,
  type GraphNode,
  type NodeKind,
  type ObservatorySnapshot,
} from "@agent-observatory/core";
import {
  executeCapabilityAdoption,
  listCapabilityAdoptions,
  planCapabilityAdoption,
  undoCapabilityAdoption,
  type ActivationMode,
  type AdoptableCapabilityKind,
  type CapabilityAdoptionPlan,
  type CapabilityAdoptionProfile,
  type CapabilityAdoptionRecord,
  type CapabilityAdoptionResult,
  type CapabilityBudget,
} from "./adoption-actions";
import {
  compareCapabilities,
  type CapabilityDescriptor,
} from "@agent-observatory/core";
import { InfoHint } from "./InfoHint";
import { getLocalizedNodeText, type Language } from "./i18n";
import { sessionsInScope, type ObservatoryScope } from "./scope";

interface CapabilitiesPageProps {
  snapshot: ObservatorySnapshot;
  scope: ObservatoryScope;
  language: Language;
  onRefresh: () => void;
}

type CapabilityFilter = "all" | AdoptableCapabilityKind;

const ADOPTABLE_KINDS = new Set<NodeKind>([
  "skill",
  "plugin",
  "hook",
  "mcp-server",
]);

const IMPLEMENTATION_TRACE = [
  {
    name: "frontend-design",
    type: "skill",
    owner: "Codex",
    detail: "Capability ledger layout, keyboard states, and cost-envelope interaction.",
  },
  {
    name: "careful",
    type: "skill",
    owner: "Codex",
    detail: "Approval boundaries, no-overwrite behavior, and reversible operations.",
  },
  {
    name: "Singer",
    type: "subagent",
    owner: "Core model",
    detail: "Adoption relationships, similarity, and deterministic budget policy.",
  },
  {
    name: "Hilbert",
    type: "subagent",
    owner: "Local daemon",
    detail: "Safe plan, execute, manifest, and hash-protected undo.",
  },
  {
    name: "Epicurus",
    type: "subagent",
    owner: "UX review",
    detail: "Token-aware adoption flow and accessibility review.",
  },
] as const;

const copy = {
  en: {
    eyebrow: "Capability control plane",
    title: "Agent capabilities",
    description:
      "See what each subagent has observed or adopted, then add capabilities behind a hard token envelope.",
    definitions: "Subagent definitions",
    adopted: "Adopted",
    observed: "Observed",
    dailyCeiling: "Daily token ceiling",
    agentRail: "Choose a subagent",
    searchAgents: "Search agents or roles",
    noAgents: "No subagent definitions were found in this scope.",
    capabilityLedger: "Capability ledger",
    installedAssets: "Installed assets",
    searchAssets: "Search skills, plugins, hooks, or MCP",
    all: "All",
    skill: "Skills",
    plugin: "Plugins",
    hook: "Hooks",
    mcp: "MCP",
    match: "match",
    used: "Observed use",
    adoptedState: "Adopted",
    available: "Available",
    adopt: "Adopt",
    review: "Review plan",
    remove: "Undo",
    budgetEnvelope: "Cost envelope",
    context: "Context load",
    perCall: "Per call",
    callsHour: "Calls / hour",
    callsDay: "Calls / day",
    projected: "Projected daily maximum",
    activation: "Activation",
    onDemand: "On demand",
    session: "Once per session",
    scheduled: "Scheduled",
    scheduleInterval: "Schedule interval",
    minutes: "minutes",
    lazy: "Lazy-load instructions",
    dedupe: "Suppress duplicate calls",
    approval: "Approve and adopt",
    executing: "Adopting",
    target: "Manifest target",
    blockers: "Blocked by policy",
    warnings: "Review notes",
    noPlan:
      "Select Adopt to create a server-validated plan. No local file changes before approval.",
    created: "Capability manifest created.",
    undone: "Capability adoption was undone.",
    error: "Capability action could not be completed.",
    conflict: "A manifest for this capability already exists.",
    trace: "Implementation trace",
    traceDescription:
      "Skills and subagents used to build this release, shown for review.",
    realUsage:
      "Observed means attribution metadata or an explicit local manifest—not an inference from conversation text.",
    budgetNote:
      "These are local safety ceilings, not a provider billing estimate.",
    noAssets: "No matching installed assets were found.",
  },
  ko: {
    eyebrow: "기능 관제 계층",
    title: "에이전트 기능 관리",
    description:
      "서브에이전트가 관찰하거나 채택한 기능을 확인하고, 강제 토큰 한도 안에서 새 기능을 추가합니다.",
    definitions: "서브에이전트 정의",
    adopted: "채택",
    observed: "관찰",
    dailyCeiling: "일일 토큰 상한",
    agentRail: "서브에이전트 선택",
    searchAgents: "에이전트 또는 역할 검색",
    noAgents: "현재 범위에서 서브에이전트 정의를 찾지 못했습니다.",
    capabilityLedger: "기능 원장",
    installedAssets: "설치된 자산",
    searchAssets: "스킬·플러그인·훅·MCP 검색",
    all: "전체",
    skill: "스킬",
    plugin: "플러그인",
    hook: "훅",
    mcp: "MCP",
    match: "일치",
    used: "사용 관찰",
    adoptedState: "채택됨",
    available: "사용 가능",
    adopt: "채택",
    review: "계획 검토",
    remove: "되돌리기",
    budgetEnvelope: "비용 봉투",
    context: "컨텍스트 적재",
    perCall: "호출당",
    callsHour: "시간당 호출",
    callsDay: "일일 호출",
    projected: "예상 일일 최대값",
    activation: "활성화 방식",
    onDemand: "필요할 때만",
    session: "세션당 한 번",
    scheduled: "예약 실행",
    scheduleInterval: "예약 간격",
    minutes: "분",
    lazy: "지침 지연 로딩",
    dedupe: "중복 호출 억제",
    approval: "승인하고 채택",
    executing: "채택 중",
    target: "매니페스트 대상",
    blockers: "정책 차단",
    warnings: "검토 사항",
    noPlan:
      "채택을 누르면 서버가 검증한 계획을 만듭니다. 승인 전에는 로컬 파일이 변경되지 않습니다.",
    created: "기능 매니페스트를 생성했습니다.",
    undone: "기능 채택을 되돌렸습니다.",
    error: "기능 작업을 완료하지 못했습니다.",
    conflict: "이 기능의 매니페스트가 이미 존재합니다.",
    trace: "구현 사용 내역",
    traceDescription:
      "이번 릴리스를 구현할 때 사용한 스킬과 서브에이전트를 검토용으로 표시합니다.",
    realUsage:
      "관찰은 귀속 메타데이터 또는 명시적 로컬 매니페스트를 뜻하며 대화문에서 추측하지 않습니다.",
    budgetNote:
      "표시 값은 로컬 안전 상한이며 공급자 청구 예상액이 아닙니다.",
    noAssets: "조건에 맞는 설치 자산을 찾지 못했습니다.",
  },
} as const;

function normalize(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

function capabilityIcon(kind: AdoptableCapabilityKind): LucideIcon {
  return {
    skill: Braces,
    plugin: PlugZap,
    hook: Webhook,
    "mcp-server": Workflow,
  }[kind];
}

function budgetFor(kind: AdoptableCapabilityKind): CapabilityBudget {
  const defaults: Record<AdoptableCapabilityKind, CapabilityBudget> = {
    skill: {
      contextTokens: 800,
      maxTokensPerCall: 6_000,
      maxCallsPerHour: 4,
      maxCallsPerDay: 14,
      dailyTokenCeiling: 96_000,
    },
    plugin: {
      contextTokens: 500,
      maxTokensPerCall: 5_000,
      maxCallsPerHour: 3,
      maxCallsPerDay: 10,
      dailyTokenCeiling: 60_000,
    },
    hook: {
      contextTokens: 180,
      maxTokensPerCall: 2_000,
      maxCallsPerHour: 4,
      maxCallsPerDay: 22,
      dailyTokenCeiling: 48_000,
    },
    "mcp-server": {
      contextTokens: 320,
      maxTokensPerCall: 4_000,
      maxCallsPerHour: 4,
      maxCallsPerDay: 14,
      dailyTokenCeiling: 64_000,
    },
  };
  return { ...defaults[kind] };
}

function matchScore(
  agent: { role: string; label: string; skills: string[] },
  node: GraphNode,
) {
  const observed = new Set(agent.skills.map(normalize));
  if (
    observed.has(normalize(node.label)) ||
    node.tags.some((tag) => observed.has(normalize(tag)))
  ) {
    return 100;
  }
  const kind =
    node.kind === "mcp-server" ? "mcp" : node.kind;
  const candidate: CapabilityDescriptor = {
    id: node.id,
    kind: kind as CapabilityDescriptor["kind"],
    label: node.label,
    description: node.summary,
    tags: node.tags,
  };
  const agentCapabilities = (
    agent.skills.length ? agent.skills : [agent.role, agent.label]
  ).map(
    (label): CapabilityDescriptor => ({
      id: normalize(label),
      kind: candidate.kind,
      label,
      description: `${agent.role} ${agent.label}`,
      tags: normalize(`${label} ${agent.role}`)
        .split("-")
        .filter(Boolean),
    }),
  );
  return Math.max(
    0,
    ...agentCapabilities.map(
      (agentCapability) =>
        compareCapabilities(candidate, agentCapability).score,
    ),
  );
}

function formatTokens(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return value.toLocaleString();
}

function minimumScheduleInterval(maxCallsPerDay: number) {
  return Math.max(60, Math.ceil(1_440 / Math.max(maxCallsPerDay, 1)));
}

function FieldNumber({
  label,
  value,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="budget-number-field">
      <span>{label}</span>
      <span>
        <input
          type="number"
          min={1}
          value={value}
          onChange={(event) =>
            onChange(Math.max(1, Number.parseInt(event.target.value || "1", 10)))
          }
        />
        {suffix && <small>{suffix}</small>}
      </span>
    </label>
  );
}

export function CapabilitiesPage({
  snapshot,
  scope,
  language,
  onRefresh,
}: CapabilitiesPageProps) {
  const c = copy[language];
  const [agentSearch, setAgentSearch] = useState("");
  const [assetSearch, setAssetSearch] = useState("");
  const [kind, setKind] = useState<CapabilityFilter>("all");
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [activationMode, setActivationMode] =
    useState<ActivationMode>("on-demand");
  const [budget, setBudget] = useState<CapabilityBudget>(budgetFor("skill"));
  const [plan, setPlan] = useState<CapabilityAdoptionPlan | null>(null);
  const [result, setResult] = useState<CapabilityAdoptionResult | null>(null);
  const [records, setRecords] = useState<CapabilityAdoptionRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const groups = useMemo(
    () =>
      groupSubagentExecutions(sessionsInScope(snapshot, scope), {
        preserveParent: false,
      }),
    [snapshot, scope],
  );
  const visibleAgents = groups.filter((agent) =>
    normalize(`${agent.label} ${agent.role}`).includes(normalize(agentSearch)),
  );
  const selectedAgent =
    groups.find((agent) => agent.id === selectedAgentId) ?? groups[0];

  useEffect(() => {
    if (selectedAgent && selectedAgent.id !== selectedAgentId) {
      setSelectedAgentId(selectedAgent.id);
    }
  }, [selectedAgent, selectedAgentId]);

  useEffect(() => {
    let active = true;
    void listCapabilityAdoptions()
      .then(({ records: next }) => {
        if (active) setRecords(next);
      })
      .catch(() => {
        if (active) setRecords([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const assets = snapshot.nodes
    .filter(
      (node): node is GraphNode & { kind: AdoptableCapabilityKind } =>
        ADOPTABLE_KINDS.has(node.kind),
    )
    .filter((node) => kind === "all" || node.kind === kind)
    .filter((node) => {
      const text = getLocalizedNodeText(node, language);
      return normalize(`${text.label} ${text.summary} ${node.tags.join(" ")}`).includes(
        normalize(assetSearch),
      );
    })
    .map((node) => ({
      node,
      score: selectedAgent ? matchScore(selectedAgent, node) : 0,
    }))
    .sort((left, right) => right.score - left.score);

  const agentRecords = selectedAgent
    ? records.filter((record) => record.profile.agent.id === selectedAgent.id)
    : [];
  const adoptedIds = new Set(
    agentRecords.map((record) => record.profile.capability.id),
  );
  const observedSkills = new Set(
    (selectedAgent?.skills ?? []).map(normalize),
  );
  const totalDailyCeiling = Math.max(
    0,
    ...agentRecords.map((record) => record.profile.budget.dailyTokenCeiling),
  );

  const resetAction = () => {
    setPlan(null);
    setResult(null);
    setError("");
  };

  const preparePlan = async (
    node: GraphNode & { kind: AdoptableCapabilityKind },
  ) => {
    if (!selectedAgent) return;
    const nextBudget = budgetFor(node.kind);
    const nextActivation: ActivationMode =
      node.kind === "hook" ? "session" : "on-demand";
    setBudget(nextBudget);
    setActivationMode(nextActivation);
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const next = await planCapabilityAdoption({
        agent: {
          id: selectedAgent.id,
          label: selectedAgent.label,
          role: selectedAgent.role,
          environment: selectedAgent.environment,
          projectId: selectedAgent.projectId,
        },
        capability: {
          id: node.id,
          label: node.label,
          kind: node.kind,
          summary: node.summary,
          tags: node.tags,
        },
        activationMode: nextActivation,
        budget: nextBudget,
      });
      setPlan(next);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : c.error);
    } finally {
      setBusy(false);
    }
  };

  const revalidatePlan = async () => {
    if (!plan) return;
    setBusy(true);
    setError("");
    try {
      const profile: CapabilityAdoptionProfile = {
        agent: plan.preview.agent,
        capability: plan.preview.capability,
        activationMode,
        budget: {
          ...budget,
          ...(activationMode === "scheduled"
            ? { scheduleIntervalMinutes: budget.scheduleIntervalMinutes ?? minimumScheduleInterval(budget.maxCallsPerDay) }
            : {}),
        },
      };
      setPlan(await planCapabilityAdoption(profile));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : c.error);
    } finally {
      setBusy(false);
    }
  };

  const executePlan = async () => {
    if (!plan || !plan.allowed || plan.exists) return;
    if (
      !window.confirm(
        language === "ko"
          ? "이 토큰 상한으로 기능 매니페스트를 생성할까요?"
          : "Create this capability manifest with the displayed token ceilings?",
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const next = await executeCapabilityAdoption(plan.planId);
      setResult(next);
      setRecords((current) => [
        ...current,
        {
          id: next.operationId,
          targetLabel: next.targetLabel,
          adoptedAt: new Date().toISOString(),
          profile: next.adoption,
        },
      ]);
      onRefresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : c.error);
    } finally {
      setBusy(false);
    }
  };

  const undoResult = async () => {
    if (!result) return;
    if (
      !window.confirm(
        language === "ko"
          ? "방금 생성한 기능 매니페스트를 제거할까요?"
          : "Remove the capability manifest that was just created?",
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      await undoCapabilityAdoption(result.operationId, result.undoToken);
      setRecords((current) =>
        current.filter((record) => record.id !== result.operationId),
      );
      setResult(null);
      setPlan(null);
      onRefresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : c.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <header className="page-header capability-page-header">
        <div className="page-title">
          <span className="page-icon">
            <PackageCheck size={19} />
          </span>
          <div>
            <p className="eyebrow">{c.eyebrow}</p>
            <h1>{c.title}</h1>
            <p>{c.description}</p>
          </div>
        </div>
        <div className="capability-policy-badge">
          <ShieldCheck size={16} />
          <span>
            <strong>{c.budgetEnvelope}</strong>
            <small>{c.budgetNote}</small>
          </span>
        </div>
      </header>

      <section className="metric-strip compact-metrics capability-metrics">
        <div className="metric">
          <div className="metric-label">
            <Bot size={16} />
            <span>{c.definitions}</span>
          </div>
          <strong>{groups.length}</strong>
        </div>
        <div className="metric">
          <div className="metric-label">
            <PackageCheck size={16} />
            <span>{c.adopted}</span>
          </div>
          <strong>{agentRecords.length}</strong>
        </div>
        <div className="metric">
          <div className="metric-label">
            <History size={16} />
            <span>{c.observed}</span>
          </div>
          <strong>{selectedAgent?.skills.length ?? 0}</strong>
        </div>
        <div className="metric">
          <div className="metric-label">
            <Gauge size={16} />
            <span>{c.dailyCeiling}</span>
          </div>
          <strong>{formatTokens(totalDailyCeiling)}</strong>
        </div>
      </section>

      <section className="capability-workbench">
        <aside className="agent-capability-rail">
          <div className="capability-section-title">
            <div>
              <p className="eyebrow">{c.agentRail}</p>
              <h2>{groups.length}</h2>
            </div>
          </div>
          <label className="capability-search">
            <Search size={14} />
            <input
              type="search"
              value={agentSearch}
              onChange={(event) => setAgentSearch(event.target.value)}
              placeholder={c.searchAgents}
            />
          </label>
          <div className="agent-capability-list">
            {visibleAgents.length ? (
              visibleAgents.map((agent) => {
                const recordCount = records.filter(
                  (record) => record.profile.agent.id === agent.id,
                ).length;
                return (
                  <button
                    type="button"
                    key={agent.id}
                    className={agent.id === selectedAgent?.id ? "active" : ""}
                    onClick={() => {
                      setSelectedAgentId(agent.id);
                      resetAction();
                    }}
                  >
                    <span className="agent-capability-avatar">
                      {agent.label.slice(0, 2).toUpperCase()}
                    </span>
                    <span>
                      <strong>{agent.label}</strong>
                      <small>
                        {agent.role} · {agent.executionCount}×
                      </small>
                    </span>
                    {recordCount > 0 && <em>{recordCount}</em>}
                    <ChevronRight size={15} />
                  </button>
                );
              })
            ) : (
              <p className="capability-empty">{c.noAgents}</p>
            )}
          </div>
        </aside>

        <div className="capability-ledger">
          <div className="capability-ledger-head">
            <div>
              <p className="eyebrow">{c.capabilityLedger}</p>
              <h2>{selectedAgent?.label ?? c.noAgents}</h2>
              {selectedAgent && (
                <p>
                  {selectedAgent.description} · {selectedAgent.environment}
                </p>
              )}
            </div>
            {selectedAgent && (
              <div className="observed-skill-row">
                {(selectedAgent.skills.length
                  ? selectedAgent.skills
                  : ["no-attribution-metadata"]
                ).map((skill) => (
                  <span key={skill}>
                    <Sparkles size={11} />
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="observed-truth-note">
            <ShieldCheck size={15} />
            <span>{c.realUsage}</span>
          </div>

          <div className="asset-catalog-controls">
            <label className="capability-search">
              <Search size={14} />
              <input
                type="search"
                value={assetSearch}
                onChange={(event) => setAssetSearch(event.target.value)}
                placeholder={c.searchAssets}
              />
            </label>
            <div className="capability-kind-tabs" role="group">
              {(
                [
                  ["all", c.all],
                  ["skill", c.skill],
                  ["plugin", c.plugin],
                  ["hook", c.hook],
                  ["mcp-server", c.mcp],
                ] as const
              ).map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  className={kind === value ? "active" : ""}
                  onClick={() => setKind(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="capability-asset-list">
            {assets.length ? (
              assets.slice(0, 80).map(({ node, score }) => {
                const text = getLocalizedNodeText(node, language);
                const Icon = capabilityIcon(node.kind);
                const observed =
                  observedSkills.has(normalize(node.label)) ||
                  node.tags.some((tag) => observedSkills.has(normalize(tag)));
                const adopted = adoptedIds.has(node.id);
                return (
                  <article className="capability-asset-row" key={node.id}>
                    <span className={`capability-kind-icon kind-${node.kind}`}>
                      <Icon size={16} />
                    </span>
                    <div className="capability-asset-copy">
                      <div>
                        <strong>{text.label}</strong>
                        <InfoHint
                          label={text.label}
                          description={text.summary}
                          meta={[node.kind, ...node.tags.slice(0, 3)]}
                        />
                      </div>
                      <p>{text.summary}</p>
                      <span className="capability-tags">
                        {node.tags.slice(0, 4).map((tag) => (
                          <small key={tag}>{tag}</small>
                        ))}
                      </span>
                    </div>
                    <div className="capability-match">
                      <strong>{score}%</strong>
                      <span>{c.match}</span>
                    </div>
                    <div className="capability-state-stack">
                      {observed && (
                        <span className="capability-state observed">
                          <History size={12} />
                          {c.used}
                        </span>
                      )}
                      {adopted && (
                        <span className="capability-state adopted">
                          <CheckCircle2 size={12} />
                          {c.adoptedState}
                        </span>
                      )}
                      {!observed && !adopted && (
                        <span className="capability-state">{c.available}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="capability-adopt-button"
                      disabled={!selectedAgent || adopted || busy}
                      onClick={() => void preparePlan(node)}
                    >
                      {busy && plan?.preview.capability.id === node.id ? (
                        <LoaderCircle className="spin" size={13} />
                      ) : adopted ? (
                        <Check size={13} />
                      ) : (
                        <Zap size={13} />
                      )}
                      {adopted ? c.adoptedState : c.adopt}
                    </button>
                  </article>
                );
              })
            ) : (
              <p className="capability-empty">{c.noAssets}</p>
            )}
          </div>
        </div>

        <aside className="cost-envelope">
          <div className="cost-envelope-head">
            <span>
              <Gauge size={16} />
            </span>
            <div>
              <p className="eyebrow">{c.budgetEnvelope}</p>
              <h2>{plan?.preview.capability.label ?? c.review}</h2>
            </div>
            {plan && (
              <button
                type="button"
                aria-label="Close plan"
                onClick={resetAction}
              >
                <X size={15} />
              </button>
            )}
          </div>

          {plan ? (
            <>
              <div className="token-envelope-rail">
                <div>
                  <span>{c.projected}</span>
                  <strong>
                    {formatTokens(plan.preview.projectedDailyTokens)}
                  </strong>
                </div>
                <div className="token-meter">
                  <span
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          (plan.preview.projectedDailyTokens /
                            Math.max(budget.dailyTokenCeiling, 1)) *
                            100,
                        ),
                      )}%`,
                    }}
                  />
                </div>
                <small>{c.budgetNote}</small>
              </div>

              <div className="activation-mode">
                <span>{c.activation}</span>
                {(
                  [
                    ["on-demand", c.onDemand, Zap],
                    ["session", c.session, History],
                    ["scheduled", c.scheduled, AlarmClock],
                  ] as const
                ).map(([value, label, Icon]) => (
                  <button
                    type="button"
                    key={value}
                    className={activationMode === value ? "active" : ""}
                    onClick={() => {
                      setActivationMode(value);
                      if (value === "scheduled") {
                        setBudget((current) => ({
                          ...current,
                          scheduleIntervalMinutes:
                            current.scheduleIntervalMinutes ?? minimumScheduleInterval(current.maxCallsPerDay),
                        }));
                      }
                    }}
                  >
                    <Icon size={13} />
                    {label}
                  </button>
                ))}
              </div>

              <div className="budget-field-grid">
                <FieldNumber
                  label={c.context}
                  value={budget.contextTokens}
                  suffix="tokens"
                  onChange={(value) =>
                    setBudget((current) => ({
                      ...current,
                      contextTokens: value,
                    }))
                  }
                />
                <FieldNumber
                  label={c.perCall}
                  value={budget.maxTokensPerCall}
                  suffix="tokens"
                  onChange={(value) =>
                    setBudget((current) => ({
                      ...current,
                      maxTokensPerCall: value,
                    }))
                  }
                />
                <FieldNumber
                  label={c.callsHour}
                  value={budget.maxCallsPerHour}
                  onChange={(value) =>
                    setBudget((current) => ({
                      ...current,
                      maxCallsPerHour: value,
                    }))
                  }
                />
                <FieldNumber
                  label={c.callsDay}
                  value={budget.maxCallsPerDay}
                  onChange={(value) =>
                    setBudget((current) => ({
                      ...current,
                      maxCallsPerDay: value,
                    }))
                  }
                />
                {activationMode === "scheduled" && (
                  <FieldNumber
                    label={c.scheduleInterval}
                    value={budget.scheduleIntervalMinutes ?? minimumScheduleInterval(budget.maxCallsPerDay)}
                    suffix={c.minutes}
                    onChange={(value) =>
                      setBudget((current) => ({
                        ...current,
                        scheduleIntervalMinutes: value,
                      }))
                    }
                  />
                )}
              </div>

              <div className="policy-check-list">
                <span>
                  <CheckCircle2 size={13} />
                  {c.lazy}
                </span>
                <span>
                  <CheckCircle2 size={13} />
                  {c.dedupe}
                </span>
                <span>
                  <Clock3 size={13} />
                  {plan.expiresInSeconds}s
                </span>
              </div>

              {plan.blockers.length > 0 && (
                <div className="cost-policy-message blocked">
                  <span role="alert" className="sr-only">{c.blockers}</span>
                  <CircleAlert size={15} />
                  <div>
                    <strong>{c.blockers}</strong>
                    {plan.blockers.map((item) => (
                      <span key={item}>{item}</span>
                    ))}
                  </div>
                </div>
              )}
              {plan.warnings.length > 0 && (
                <div className="cost-policy-message warning">
                  <CircleAlert size={15} />
                  <div>
                    <strong>{c.warnings}</strong>
                    {plan.warnings.map((item) => (
                      <span key={item}>{item}</span>
                    ))}
                  </div>
                </div>
              )}
              {plan.exists && (
                <div className="cost-policy-message blocked">
                  <CircleAlert size={15} />
                  <span>{c.conflict}</span>
                </div>
              )}
              {error && (
                <div className="cost-policy-message blocked">
                  <span role="alert" className="sr-only">{error}</span>
                  <CircleAlert size={15} />
                  <span>{error}</span>
                </div>
              )}

              <div className="manifest-target">
                <span>{c.target}</span>
                <strong>{plan.targetLabel}</strong>
              </div>

              {result ? (
                <div className="adoption-result" aria-live="polite">
                  <span>
                    <CheckCircle2 size={15} />
                    {c.created}
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void undoResult()}
                  >
                    <RotateCcw size={13} />
                    {c.remove}
                  </button>
                </div>
              ) : (
                <div className="adoption-actions">
                  <button
                    type="button"
                    onClick={() => void revalidatePlan()}
                    disabled={busy}
                  >
                    {c.review}
                  </button>
                  <button
                    type="button"
                    className="primary"
                    onClick={() => void executePlan()}
                    disabled={
                      busy || !plan.allowed || plan.exists || Boolean(error)
                    }
                  >
                    {busy ? (
                      <LoaderCircle className="spin" size={14} />
                    ) : (
                      <PackageCheck size={14} />
                    )}
                    {busy ? c.executing : c.approval}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="empty-cost-envelope">
              <Gauge size={26} />
              <p>{c.noPlan}</p>
            </div>
          )}
        </aside>
      </section>

      <section className="implementation-trace-panel">
        <div className="table-title">
          <div>
            <p className="eyebrow">{c.trace}</p>
            <h2>{c.traceDescription}</h2>
          </div>
          <span>{IMPLEMENTATION_TRACE.length}</span>
        </div>
        <div className="implementation-trace-grid">
          {IMPLEMENTATION_TRACE.map((item) => (
            <article key={item.name}>
              <span>
                {item.type === "skill" ? (
                  <Braces size={15} />
                ) : (
                  <Bot size={15} />
                )}
              </span>
              <div>
                <strong>{item.name}</strong>
                <small>
                  {item.type} · {item.owner}
                </small>
                <p>{item.detail}</p>
              </div>
              <CheckCircle2 size={15} />
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
