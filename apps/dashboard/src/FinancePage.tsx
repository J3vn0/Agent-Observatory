import { useEffect, useMemo, useState } from "react";
import {
  BellRing,
  BookOpenCheck,
  Bot,
  CalendarClock,
  Check,
  ChevronRight,
  CircleDollarSign,
  Database,
  FileSearch,
  Gauge,
  LockKeyhole,
  PlugZap,
  Radio,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { defaultFinanceGuardrails } from "@agent-observatory/finance";
import type { Language } from "./i18n";
import "./FinancePage.css";

type Horizon = "short" | "medium" | "long";
type Goal = "market" | "income" | "preservation";
type Cadence = "event" | "daily" | "weekly";

interface Capability {
  id: string;
  icon: typeof Bot;
  kind: "skill" | "plugin" | "hook" | "schedule";
  title: string;
  description: string;
  reason: string;
  tokens: number;
  selected: boolean;
}

const copy = {
  ko: {
    eyebrow: "PERSONAL RESEARCH OPERATING SYSTEM",
    title: "Finance Lab",
    description:
      "투자 목표를 리서치 원칙으로 바꾸고, 필요한 스킬·플러그인·훅·예약 작업을 비용 한도 안에서 구성합니다.",
    demo: "인터랙티브 데모 · 실제 X 연결 없음",
    boundary: "종목을 추천하지 않습니다",
    boundaryDetail:
      "이 기능은 투자 대상을 고르는 대신 조사 소스, 검증 수준, 보고 주기와 기능 구성을 개인화합니다.",
    profile: "01 · Research mandate",
    profileTitle: "어떤 방식으로 조사할까요?",
    horizon: "관찰 기간",
    short: "3개월 이내",
    medium: "3–12개월",
    long: "1년 이상",
    goal: "리서치 목표",
    market: "시장 변화 추적",
    income: "인컴·채권 이해",
    preservation: "리스크 보존",
    depth: "리포트 깊이",
    concise: "핵심 요약",
    deep: "근거까지 깊게",
    mandate: "현재 리서치 원칙",
    source: "02 · Signal desk",
    sourceTitle: "감시 소스와 검증 규칙",
    sourceDemo: "Demo source",
    sourceStatus: "연결 전",
    sourceDescription:
      "AI·반도체 공급망 관련 공개 포스트를 리서치 단서로 수집합니다. 사실로 채택하기 전 1차 출처 확인이 필요합니다.",
    xPolicy: "공식 X API 승인 후 활성화",
    corroborate: "1차 출처 교차검증",
    capability: "03 · Capability recipe",
    capabilityTitle: "추천 기능 구성",
    recommended: "프로필 기반 추천",
    why: "추천 이유",
    selected: "채택됨",
    add: "채택",
    tokenBudget: "예상 월 토큰",
    budgetLow: "절약",
    budgetHealthy: "예산 내",
    budgetHigh: "검토 필요",
    cadence: "실행 주기",
    event: "중요 이벤트",
    daily: "매일",
    weekly: "매주",
    scheduleTitle: "예약 실행 초안",
    nextRun: "다음 실행",
    quietHours: "방해 금지 22:00–07:00",
    save: "초안 저장",
    saved: "초안이 로컬에 저장됨",
    review: "구성 미리보기",
    guardrails: "활성 안전 장치",
    localOnly: "프로필은 로컬 보관",
  },
  en: {
    eyebrow: "PERSONAL RESEARCH OPERATING SYSTEM",
    title: "Finance Lab",
    description:
      "Turn investing goals into a research mandate, then compose skills, plugins, hooks, and schedules within a clear cost ceiling.",
    demo: "Interactive demo · no live X connection",
    boundary: "No security recommendations",
    boundaryDetail:
      "This experience personalizes sources, verification depth, cadence, and capabilities—not what to buy or sell.",
    profile: "01 · Research mandate",
    profileTitle: "How should the system research?",
    horizon: "Observation horizon",
    short: "Under 3 months",
    medium: "3–12 months",
    long: "Over 1 year",
    goal: "Research goal",
    market: "Track market shifts",
    income: "Understand income & bonds",
    preservation: "Preserve downside context",
    depth: "Report depth",
    concise: "Concise brief",
    deep: "Deep evidence",
    mandate: "Current research mandate",
    source: "02 · Signal desk",
    sourceTitle: "Sources and verification",
    sourceDemo: "Demo source",
    sourceStatus: "Not connected",
    sourceDescription:
      "Collect public AI and semiconductor supply-chain posts as research leads. Primary-source corroboration is required before treating a claim as fact.",
    xPolicy: "Enable only after official X API approval",
    corroborate: "Primary-source corroboration",
    capability: "03 · Capability recipe",
    capabilityTitle: "Recommended capability stack",
    recommended: "Profile-based recommendation",
    why: "Why it fits",
    selected: "Adopted",
    add: "Adopt",
    tokenBudget: "Estimated monthly tokens",
    budgetLow: "Lean",
    budgetHealthy: "Within budget",
    budgetHigh: "Review needed",
    cadence: "Run cadence",
    event: "Key events",
    daily: "Daily",
    weekly: "Weekly",
    scheduleTitle: "Scheduled run draft",
    nextRun: "Next run",
    quietHours: "Quiet hours 22:00–07:00",
    save: "Save draft",
    saved: "Draft saved locally",
    review: "Preview configuration",
    guardrails: "Active guardrails",
    localOnly: "Profile stored locally",
  },
} as const;

function initialCapabilities(language: Language): Capability[] {
  const ko = language === "ko";
  return [
    {
      id: "source-triage",
      icon: FileSearch,
      kind: "skill",
      title: ko ? "출처 분류 스킬" : "Source triage skill",
      description: ko
        ? "소셜 포스트를 단서·사실·파생 분석으로 구분합니다."
        : "Classifies social posts as leads, facts, or derived analysis.",
      reason: ko ? "소셜 신호를 사실처럼 사용하지 않기 위해" : "Prevents social signals from being treated as facts.",
      tokens: 48_000,
      selected: true,
    },
    {
      id: "filing-reader",
      icon: Database,
      kind: "plugin",
      title: ko ? "공시 원문 리더" : "Filing source reader",
      description: ko
        ? "공식 공시와 기업 발표에서 원문 근거를 찾습니다."
        : "Retrieves primary evidence from official filings and releases.",
      reason: ko ? "주장의 1차 출처를 교차검증하기 위해" : "Corroborates claims against primary sources.",
      tokens: 86_000,
      selected: true,
    },
    {
      id: "signal-hook",
      icon: Radio,
      kind: "hook",
      title: ko ? "Serenity 신호 훅" : "Serenity signal hook",
      description: ko
        ? "승인된 API에서 새 포스트 ID가 발견될 때만 파이프라인을 시작합니다."
        : "Starts the pipeline only when an approved API returns a new post ID.",
      reason: ko ? "중복 수집과 불필요한 실행을 줄이기 위해" : "Reduces duplicate collection and unnecessary runs.",
      tokens: 22_000,
      selected: true,
    },
    {
      id: "weekly-digest",
      icon: CalendarClock,
      kind: "schedule",
      title: ko ? "증거 중심 다이제스트" : "Evidence-first digest",
      description: ko
        ? "검증된 변화만 묶어 조용한 시간 이후 전달합니다."
        : "Bundles only corroborated changes and delivers outside quiet hours.",
      reason: ko ? "알림 과부하와 토큰 낭비를 줄이기 위해" : "Controls alert fatigue and token spend.",
      tokens: 64_000,
      selected: true,
    },
  ];
}

export function FinancePage({ language }: { language: Language }) {
  const c = copy[language];
  const [horizon, setHorizon] = useState<Horizon>("long");
  const [goal, setGoal] = useState<Goal>("market");
  const [deepResearch, setDeepResearch] = useState(true);
  const [cadence, setCadence] = useState<Cadence>("event");
  const [capabilities, setCapabilities] = useState(() =>
    initialCapabilities(language),
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setCapabilities((current) =>
      initialCapabilities(language).map((localized) => ({
        ...localized,
        selected:
          current.find((item) => item.id === localized.id)?.selected ??
          localized.selected,
      })),
    );
  }, [language]);

  const selected = capabilities.filter((item) => item.selected);
  const cadenceMultiplier = cadence === "daily" ? 1.8 : cadence === "weekly" ? 0.7 : 1;
  const depthMultiplier = deepResearch ? 1 : 0.62;
  const tokenEstimate = Math.round(
    selected.reduce((sum, item) => sum + item.tokens, 0) *
      cadenceMultiplier *
      depthMultiplier,
  );
  const budgetState =
    tokenEstimate > 360_000
      ? { label: c.budgetHigh, className: "high" }
      : tokenEstimate < 180_000
        ? { label: c.budgetLow, className: "low" }
        : { label: c.budgetHealthy, className: "healthy" };

  const mandate = useMemo(() => {
    const horizonLabel = c[horizon];
    const goalLabel = c[goal];
    const depthLabel = deepResearch ? c.deep : c.concise;
    return `${goalLabel} · ${horizonLabel} · ${depthLabel}`;
  }, [c, deepResearch, goal, horizon]);

  const toggleCapability = (id: string) => {
    setSaved(false);
    setCapabilities((current) =>
      current.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item,
      ),
    );
  };

  return (
    <div className="finance-page">
      <header className="finance-hero">
        <div>
          <p className="finance-kicker">{c.eyebrow}</p>
          <h1>{c.title}</h1>
          <p className="finance-lede">{c.description}</p>
        </div>
        <div className="finance-demo-stamp">
          <Sparkles size={15} />
          {c.demo}
        </div>
      </header>

      <section className="finance-boundary">
        <ShieldCheck size={22} />
        <div>
          <strong>{c.boundary}</strong>
          <span>{c.boundaryDetail}</span>
        </div>
        <span className="finance-local-pill">
          <LockKeyhole size={13} />
          {c.localOnly}
        </span>
      </section>

      <div className="finance-layout">
        <div className="finance-primary">
          <section className="finance-section">
            <div className="finance-section-heading">
              <div>
                <p>{c.profile}</p>
                <h2>{c.profileTitle}</h2>
              </div>
              <BookOpenCheck size={20} />
            </div>
            <div className="finance-question-grid">
              <fieldset>
                <legend>{c.horizon}</legend>
                {(["short", "medium", "long"] as Horizon[]).map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={horizon === value ? "active" : ""}
                    onClick={() => {
                      setHorizon(value);
                      setSaved(false);
                    }}
                  >
                    {c[value]}
                  </button>
                ))}
              </fieldset>
              <fieldset>
                <legend>{c.goal}</legend>
                {(["market", "income", "preservation"] as Goal[]).map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={goal === value ? "active" : ""}
                    onClick={() => {
                      setGoal(value);
                      setSaved(false);
                    }}
                  >
                    {c[value]}
                  </button>
                ))}
              </fieldset>
              <fieldset>
                <legend>{c.depth}</legend>
                <button
                  type="button"
                  className={!deepResearch ? "active" : ""}
                  onClick={() => setDeepResearch(false)}
                >
                  {c.concise}
                </button>
                <button
                  type="button"
                  className={deepResearch ? "active" : ""}
                  onClick={() => setDeepResearch(true)}
                >
                  {c.deep}
                </button>
              </fieldset>
            </div>
            <div className="finance-mandate">
              <span>{c.mandate}</span>
              <strong>{mandate}</strong>
            </div>
          </section>

          <section className="finance-section">
            <div className="finance-section-heading">
              <div>
                <p>{c.source}</p>
                <h2>{c.sourceTitle}</h2>
              </div>
              <Radio size={20} />
            </div>
            <article className="finance-source-card">
              <div className="finance-source-avatar">S</div>
              <div className="finance-source-copy">
                <div>
                  <strong>Serenity</strong>
                  <span>@aleabitoreddit</span>
                </div>
                <p>{c.sourceDescription}</p>
                <div className="finance-source-rules">
                  <span><ShieldCheck size={13} />{c.corroborate}</span>
                  <span><PlugZap size={13} />{c.xPolicy}</span>
                </div>
              </div>
              <div className="finance-source-state">
                <span>{c.sourceDemo}</span>
                <strong>{c.sourceStatus}</strong>
              </div>
            </article>
          </section>

          <section className="finance-section">
            <div className="finance-section-heading">
              <div>
                <p>{c.capability}</p>
                <h2>{c.capabilityTitle}</h2>
              </div>
              <Bot size={20} />
            </div>
            <div className="finance-recommendation-note">
              <Sparkles size={15} />
              <span>{c.recommended}</span>
              <strong>{mandate}</strong>
            </div>
            <div className="finance-capability-list">
              {capabilities.map((item) => {
                const Icon = item.icon;
                return (
                  <article
                    className={`finance-capability ${item.selected ? "selected" : ""}`}
                    key={item.id}
                  >
                    <span className="finance-capability-icon"><Icon size={18} /></span>
                    <div>
                      <span className="finance-capability-kind">{item.kind}</span>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                      <small><strong>{c.why}</strong> · {item.reason}</small>
                    </div>
                    <button type="button" onClick={() => toggleCapability(item.id)}>
                      {item.selected ? <Check size={15} /> : <ChevronRight size={15} />}
                      {item.selected ? c.selected : c.add}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="finance-sidebar">
          <section className="finance-budget-card">
            <div className="finance-card-label">
              <Gauge size={16} />
              {c.tokenBudget}
            </div>
            <strong>{tokenEstimate.toLocaleString()}</strong>
            <span className={`finance-budget-state ${budgetState.className}`}>
              {budgetState.label}
            </span>
            <div className="finance-budget-track">
              <span style={{ width: `${Math.min(100, (tokenEstimate / 450_000) * 100)}%` }} />
            </div>
            <p>
              {selected.length} capabilities · {cadence === "event" ? c.event : cadence === "daily" ? c.daily : c.weekly}
            </p>
          </section>

          <section className="finance-schedule-card">
            <div className="finance-card-label">
              <CalendarClock size={16} />
              {c.scheduleTitle}
            </div>
            <span className="finance-field-label">{c.cadence}</span>
            <div className="finance-cadence">
              {(["event", "daily", "weekly"] as Cadence[]).map((value) => (
                <button
                  type="button"
                  key={value}
                  className={cadence === value ? "active" : ""}
                  onClick={() => {
                    setCadence(value);
                    setSaved(false);
                  }}
                >
                  {c[value]}
                </button>
              ))}
            </div>
            <div className="finance-next-run">
              <BellRing size={16} />
              <div><span>{c.nextRun}</span><strong>{cadence === "weekly" ? "MON 08:00" : "EVENT GATE"}</strong></div>
            </div>
            <div className="finance-quiet-hours">
              <LockKeyhole size={14} />
              {c.quietHours}
            </div>
            <button
              className="finance-save"
              type="button"
              onClick={() => {
                window.localStorage.setItem(
                  "agent-observatory-finance-demo",
                  JSON.stringify({ horizon, goal, deepResearch, cadence, selected: selected.map((item) => item.id) }),
                );
                setSaved(true);
              }}
            >
              {saved ? <Check size={16} /> : <CircleDollarSign size={16} />}
              {saved ? c.saved : c.save}
            </button>
          </section>

          <section className="finance-guardrail-card">
            <div className="finance-card-label">
              <ShieldCheck size={16} />
              {c.guardrails}
            </div>
            {defaultFinanceGuardrails.map((guardrail) => (
              <div key={guardrail.id}>
                <span />
                <strong>{guardrail.label}</strong>
              </div>
            ))}
          </section>
        </aside>
      </div>
    </div>
  );
}
