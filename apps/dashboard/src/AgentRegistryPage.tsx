import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  CircleAlert,
  Crown,
  FilePlus2,
  FolderGit2,
  GitMerge,
  Globe2,
  Layers3,
  LoaderCircle,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  buildAgentRegistry,
  type AgentDefinition,
  type AgentSimilarity,
  type ObservatorySnapshot,
  type PromotionCandidate,
} from "@agent-observatory/core";
import { rc } from "./registry-copy";
import { executeAgentAction, planAgentAction, undoAgentAction, type AgentAction, type AgentActionPlan, type AgentActionResult } from "./agent-actions";
import { InfoHint } from "./InfoHint";
import { disambiguatedProjectLabel, type ObservatoryScope } from "./scope";
import type { Language } from "./i18n";

interface AgentRegistryPageProps {
  snapshot: ObservatorySnapshot;
  scope: ObservatoryScope;
  language: Language;
  onRefresh: () => void;
}

type CandidateFilter = "all" | "exact" | "review";

function confidenceLabel(candidate: PromotionCandidate, language: Language) {
  const copy = rc(language);
  if (candidate.confidence === "exact") return copy.exactConfidence;
  if (candidate.confidence === "high") return copy.highConfidence;
  return copy.reviewConfidence;
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof Bot; label: string; value: number }) {
  return (
    <div className="metric">
      <span className="metric-label"><Icon size={15} />{label}</span>
      <strong>{value.toLocaleString()}</strong>
    </div>
  );
}

function projectName(snapshot: ObservatorySnapshot, projectId: string) {
  const projects = snapshot.projects ?? [];
  const project = projects.find((candidate) => candidate.id === projectId);
  return project ? disambiguatedProjectLabel(project, projects) : projectId.slice(-8);
}

function AgentSourceCard({ agent, snapshot, language }: { agent: AgentDefinition; snapshot: ObservatorySnapshot; language: Language }) {
  const copy = rc(language);
  return (
    <article className="registry-source-card">
      <div className="registry-source-heading">
        <span className="registry-agent-icon"><Bot size={15} /></span>
        <div>
          <strong>{agent.label}</strong>
          <small>{agent.projectId ? projectName(snapshot, agent.projectId) : copy.globalAgents}</small>
        </div>
        <InfoHint label={copy.roleDescription} description={agent.description} meta={[agent.role, ...agent.skills]} />
      </div>
      <div className="registry-source-meta">
        <span>{agent.environment}</span>
        <span>{agent.role}</span>
        <span>{agent.usageCount} {copy.usages}</span>
      </div>
    </article>
  );
}

function CandidateCard({
  candidate,
  agents,
  snapshot,
  language,
  selected,
  onSelect,
}: {
  candidate: PromotionCandidate;
  agents: AgentDefinition[];
  snapshot: ObservatorySnapshot;
  language: Language;
  selected: boolean;
  onSelect: () => void;
}) {
  const copy = rc(language);
  const usageCount = agents.filter((agent) => candidate.agentIds.includes(agent.id)).reduce((sum, agent) => sum + agent.usageCount, 0);
  return (
    <button type="button" className={"promotion-candidate-card" + (selected ? " selected" : "")} onClick={onSelect}>
      <span className={"candidate-score score-" + candidate.confidence}>
        <strong>{candidate.averageScore}</strong>
        <small>%</small>
      </span>
      <span className="candidate-copy">
        <span className="candidate-kicker"><Sparkles size={12} />{confidenceLabel(candidate, language)}</span>
        <strong>{candidate.suggestedGlobalName}</strong>
        <span className="candidate-projects">
          {candidate.projectIds.slice(0, 3).map((projectId) => <span key={projectId}>{projectName(snapshot, projectId)}</span>)}
          {candidate.projectIds.length > 3 && <span>+{candidate.projectIds.length - 3}</span>}
        </span>
        <small>{candidate.projectIds.length} {copy.projects} · {usageCount} {copy.usages}</small>
      </span>
      <ArrowRight size={17} />
    </button>
  );
}

function EvidenceBars({ similarity, language }: { similarity?: AgentSimilarity; language: Language }) {
  const copy = rc(language);
  if (!similarity) return null;
  return (
    <div className="registry-evidence-list">
      {similarity.components.map((component) => (
        <div className="registry-evidence-row" key={component.feature}>
          <div>
            <span>{copy.features[component.feature]}</span>
            <strong>{component.score}%</strong>
          </div>
          <span className="evidence-track"><span style={{ width: component.score + "%" }} /></span>
          <small>
            {component.matched.length ? copy.matched + " " + component.matched.slice(0, 3).join(", ") : copy.different}
          </small>
        </div>
      ))}
    </div>
  );
}

export function AgentRegistryPage({ snapshot, scope, language, onRefresh }: AgentRegistryPageProps) {
  const copy = rc(language);
  const registry = useMemo(() => buildAgentRegistry(snapshot), [snapshot]);
  const [filter, setFilter] = useState<CandidateFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preparedId, setPreparedId] = useState<string | null>(null);
  const [actionPlan, setActionPlan] = useState<AgentActionPlan | null>(null);
  const [actionResult, setActionResult] = useState<AgentActionResult | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const environmentMatches = (environment: string) => scope.environment === "all" || environment === scope.environment;
  const projectAgents = registry.projectAgents.filter((agent) =>
    environmentMatches(agent.environment) && (!scope.projectId || agent.projectId === scope.projectId),
  );
  const globalAgents = registry.globalAgents.filter((agent) => environmentMatches(agent.environment));
  const scopedCandidates = registry.promotionCandidates.filter((candidate) =>
    (scope.environment === "all" || candidate.environments.includes(scope.environment)) &&
    (!scope.projectId || candidate.projectIds.includes(scope.projectId)),
  );
  const candidates = scopedCandidates.filter((candidate) =>
    filter === "all" || (filter === "exact" ? candidate.confidence === "exact" : candidate.confidence !== "exact"),
  );

  useEffect(() => {
    if (!candidates.some((candidate) => candidate.id === selectedId)) {
      setSelectedId(candidates[0]?.id ?? null);
      setPreparedId(null);
      setActionPlan(null);
      setActionResult(null);
      setActionMessage(null);
      setActionError(null);
    }
  }, [candidates, selectedId]);

  const selected = candidates.find((candidate) => candidate.id === selectedId);
  const selectedAgents = selected
    ? registry.projectAgents.filter((agent) => selected.agentIds.includes(agent.id))
    : [];
  const selectedSimilarity = selected
    ? registry.similarities.find((similarity) => selected.agentIds.includes(similarity.leftId) && selected.agentIds.includes(similarity.rightId))
    : undefined;
  const exactCount = scopedCandidates.filter((candidate) => candidate.confidence === "exact").length;

  const actionProfile = selected && selectedAgents.length ? {
    name: selected.suggestedGlobalName,
    description: selectedAgents.find((agent) => agent.description)?.description || "Reusable agent observed across projects.",
    role: selectedAgents[0].role,
    skills: [...new Set(selectedAgents.flatMap((agent) => agent.skills))].sort(),
    sourceEnvironment: selected.environments[0] || "claude",
    sourceProjectIds: selected.projectIds,
  } : null;

  async function prepareExecutablePlan(action: AgentAction) {
    if (!actionProfile) return;
    setActionBusy(true);
    setActionError(null);
    setActionMessage(null);
    setActionResult(null);
    try {
      setActionPlan(await planAgentAction(action, actionProfile));
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : copy.actionError);
    } finally {
      setActionBusy(false);
    }
  }

  async function executePreparedPlan() {
    if (!actionPlan || actionPlan.exists || !window.confirm(copy.confirmExecute)) return;
    setActionBusy(true);
    setActionError(null);
    try {
      const result = await executeAgentAction(actionPlan.planId);
      setActionResult(result);
      setActionMessage(copy.actionCreated + " " + result.targetLabel);
      onRefresh();
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : copy.actionError);
    } finally {
      setActionBusy(false);
    }
  }

  async function undoCreatedDefinition() {
    if (!actionResult || !window.confirm(copy.confirmUndo)) return;
    setActionBusy(true);
    setActionError(null);
    try {
      await undoAgentAction(actionResult.operationId, actionResult.undoToken);
      setActionMessage(copy.actionUndone);
      setActionResult(null);
      setActionPlan(null);
      onRefresh();
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : copy.actionError);
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <>
      <header className="page-header registry-page-header">
        <div className="page-title">
          <span className="page-icon registry-page-icon"><GitMerge size={19} /></span>
          <div>
            <p className="eyebrow">{copy.eyebrow}</p>
            <h1>{copy.title}</h1>
            <p>{copy.description}</p>
          </div>
        </div>
        <div className="registry-safety"><ShieldCheck size={15} />{copy.previewOnly}</div>
      </header>

      <section className="metric-strip registry-metrics">
        <MetricCard icon={Globe2} label={copy.globalAgents} value={globalAgents.length} />
        <MetricCard icon={Layers3} label={copy.projectDefinitions} value={projectAgents.length} />
        <MetricCard icon={Sparkles} label={copy.promotionCandidates} value={scopedCandidates.length} />
        <MetricCard icon={CheckCircle2} label={copy.exactDuplicates} value={exactCount} />
      </section>

      <section className="registry-workspace">
        <div className="promotion-queue-panel">
          <div className="registry-panel-heading">
            <div><p className="eyebrow">{copy.queueDescription}</p><h2>{copy.promotionQueue}</h2></div>
            <span>{scopedCandidates.length}</span>
          </div>
          <div className="registry-filter-row" role="group" aria-label={copy.promotionQueue}>
            {(["all", "exact", "review"] as CandidateFilter[]).map((value) => (
              <button type="button" key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>
                {copy[value]}
              </button>
            ))}
          </div>
          <div className="promotion-candidate-list">
            {candidates.length ? candidates.slice(0, 12).map((candidate) => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                agents={registry.projectAgents}
                snapshot={snapshot}
                language={language}
                selected={candidate.id === selectedId}
                onSelect={() => {
                  setSelectedId(candidate.id);
                  setPreparedId(null);
                  setActionPlan(null);
                  setActionResult(null);
                  setActionMessage(null);
                  setActionError(null);
                }}
              />
            )) : <div className="registry-empty"><GitMerge size={23} /><span>{copy.noCandidates}</span></div>}
          </div>
        </div>

        <div className="promotion-preview-panel">
          <div className="registry-panel-heading">
            <div><p className="eyebrow">{copy.previewDescription}</p><h2>{copy.preview}</h2></div>
            {selected && <span className="preview-score">{selected.averageScore}%</span>}
          </div>
          {selected ? (
            <>
              <div className="promotion-convergence">
                <div className="promotion-sources">
                  <span className="registry-section-label"><FolderGit2 size={13} />{copy.sourceDefinitions}</span>
                  {selectedAgents.slice(0, 4).map((agent) => <AgentSourceCard key={agent.id} agent={agent} snapshot={snapshot} language={language} />)}
                </div>
                <div className="promotion-rail" aria-hidden="true"><span /><GitMerge size={18} /><span /></div>
                <article className="global-target-card">
                  <span className="global-crown"><Crown size={18} /></span>
                  <small>{copy.globalTarget}</small>
                  <strong>{selected.suggestedGlobalName}</strong>
                  <span>{selected.environments.join(" · ")}</span>
                  <div className="global-target-stats">
                    <span><strong>{selected.projectIds.length}</strong>{copy.projects}</span>
                    <span><strong>{selected.averageScore}%</strong>{copy.similarity}</span>
                  </div>
                  {selected.blockers.includes("cross-environment") && <p><CircleAlert size={13} />{copy.crossEnvironment}</p>}
                </article>
              </div>
              <div className="registry-evidence-panel">
                <div className="registry-section-label"><Sparkles size={13} />{copy.evidence}</div>
                <EvidenceBars similarity={selectedSimilarity} language={language} />
              </div>
              <div className="promotion-action-row">
                <span><ShieldCheck size={14} />{copy.previewOnly}</span>
                <button type="button" className="registry-plan-button" onClick={() => setPreparedId(selected.id)}>
                  <GitMerge size={15} />{copy.preparePlan}
                </button>
              </div>
              {preparedId === selected.id && (
                <div className="executable-plan-panel">
                  <div className="plan-ready-banner" role="status"><CheckCircle2 size={16} />{copy.planPrepared}</div>
                  <div className="action-choice-grid">
                    <button type="button" onClick={() => void prepareExecutablePlan("promote-shared")} disabled={actionBusy}>
                      <FilePlus2 size={16} />
                      <span><strong>{copy.prepareShared}</strong><small>{copy.sharedExplanation}</small></span>
                    </button>
                    <button type="button" onClick={() => void prepareExecutablePlan("apply-codex")} disabled={actionBusy}>
                      <Bot size={16} />
                      <span><strong>{copy.prepareCodex}</strong><small>{copy.codexExplanation}</small></span>
                    </button>
                  </div>
                  {actionPlan && (
                    <div className="execution-plan-card">
                      <div><span>{copy.planTarget}</span><strong>{actionPlan.targetLabel}</strong><small>{actionPlan.preview.format} · {actionPlan.preview.role}</small></div>
                      {actionPlan.preview.skills.length > 0 && <div className="execution-plan-skills">{actionPlan.preview.skills.map((skill) => <span key={skill}>{skill}</span>)}</div>}
                      {actionPlan.exists ? (
                        <p className="action-error"><CircleAlert size={14} />{copy.planConflict}</p>
                      ) : (
                        <button type="button" className="execute-action-button" onClick={() => void executePreparedPlan()} disabled={actionBusy || Boolean(actionResult)}>
                          {actionBusy ? <LoaderCircle className="spin" size={15} /> : <ShieldCheck size={15} />}
                          {actionBusy ? copy.executing : copy.executePlan}
                        </button>
                      )}
                    </div>
                  )}
                  {actionMessage && <div className="action-success" role="status"><CheckCircle2 size={15} />{actionMessage}</div>}
                  {actionError && <div className="action-error" role="alert"><CircleAlert size={15} />{actionError}</div>}
                  {actionResult && (
                    <button type="button" className="undo-action-button" onClick={() => void undoCreatedDefinition()} disabled={actionBusy}>
                      <RotateCcw size={14} />{copy.undo}
                    </button>
                  )}
                </div>
              )}
            </>
          ) : <div className="registry-empty registry-preview-empty"><Bot size={25} /><span>{copy.selectCandidate}</span></div>}
        </div>
      </section>

      <section className="global-agent-panel">
        <div className="registry-panel-heading">
          <div><p className="eyebrow">{copy.globalInventory}</p><h2>{copy.globalAgents}</h2></div>
          <span>{globalAgents.length}</span>
        </div>
        {globalAgents.length ? (
          <div className="global-agent-grid">
            {globalAgents.slice(0, 8).map((agent) => (
              <article key={agent.id} className="global-agent-card">
                <span><Globe2 size={15} /></span>
                <div><strong>{agent.label}</strong><small>{agent.environment} · {agent.tags.slice(0, 3).join(" · ")}</small></div>
                <InfoHint label={copy.roleDescription} description={agent.description} meta={[agent.role, ...agent.skills]} />
              </article>
            ))}
          </div>
        ) : <div className="registry-empty compact"><Globe2 size={20} /><span>{copy.noGlobalAgents}</span></div>}
      </section>
    </>
  );
}
