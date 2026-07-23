export const financeCapabilityTags = [
  "finance",
  "etf",
  "fixed-income",
  "regulatory-filings",
  "macro",
  "citation-required",
  "observation-time-required",
  "read-only",
] as const;

export interface FinanceEvidence {
  sourceUrl: string;
  publisher: string;
  observedAt: string;
  publishedAt?: string;
  classification: "fact" | "derived-analysis";
  citationLabel: string;
}

export interface FinanceGuardrail {
  id: string;
  label: string;
  status: "active" | "warning" | "blocked";
  detail: string;
}

export const defaultFinanceGuardrails: FinanceGuardrail[] = [
  {
    id: "read-only",
    label: "Read-only tools",
    status: "active",
    detail: "No order entry or portfolio mutation capability is connected.",
  },
  {
    id: "freshness",
    label: "Freshness required",
    status: "active",
    detail: "Every market-sensitive fact must include an observation time.",
  },
  {
    id: "citations",
    label: "Citations required",
    status: "active",
    detail: "Facts and derived analysis must preserve source provenance.",
  },
];

