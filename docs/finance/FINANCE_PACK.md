# Finance Domain Pack

Status: MVP specification  
Owner: Finance domain and risk  
Scope: ETF, bonds, regulatory filings, and macro research

## 1. Purpose

The Finance Domain Pack adds finance-aware capability discovery, safety signals, and evaluation rules to Agent Observatory. It is a read-only research pack: it helps users find, inspect, compare, and validate finance-capable agents, skills, MCP tools, data sources, and workflows without placing trades or producing personalized investment advice.

Every finance result must make five things inspectable:

1. What claim is being made?
2. Is it a sourced fact or derived analysis?
3. Which source and source record support it?
4. When was the source observed, and what period does the data describe?
5. What limitation, stale-data condition, or permission boundary applies?

## 2. Supported user workflows

### 2.1 ETF research

- Compare fund objectives, index methodology, expense ratios, holdings, concentration, liquidity indicators, distributions, and tracking characteristics.
- Identify whether two ETF research agents or skills cover the same capabilities.
- Trace each fund fact to an issuer page, prospectus, filing, exchange record, or licensed market-data source.
- Flag mismatched as-of dates when comparing holdings, prices, assets, or performance.

### 2.2 Bond research

- Inspect issuer, coupon, maturity, seniority, currency, call features, credit rating, and offering terms.
- Compare reported yield measures only when the yield convention and observation time are explicit.
- Link corporate and municipal bond facts to offering documents, issuer disclosures, regulatory records, or licensed reference data.
- Flag stale quotes, evaluated prices, missing accrued-interest conventions, and incomparable yield bases.

### 2.3 Regulatory filing research

- Find filings by issuer, regulator, form type, accession or filing identifier, and filing date.
- Extract and cite passages, tables, reported metrics, risk factors, and management statements.
- Distinguish the filing's reporting period, filing timestamp, amendment status, and local observation time.
- Preserve document identity and locator information so a user can reproduce the result.

### 2.4 Macro research

- Retrieve economic series, release calendars, policy statements, and revisions.
- Compare releases across countries, agencies, frequencies, and seasonal-adjustment conventions.
- Separate the reference period, release time, revision/vintage, and retrieval time.
- Flag preliminary, revised, discontinued, delayed, or methodologically changed series.

### 2.5 Observatory management

- Filter agents, skills, MCP servers, and tools by finance capability and risk tags.
- Display capability coverage, source coverage, freshness, health, and credential requirements.
- Explain overlap or similarity using shared capability tags and shared source/tool dependencies.
- Detect missing citations, stale observations, excessive permissions, credential leakage, and unsupported claims.

## 3. Capability tag model

Tags use lowercase, slash-delimited namespaces. Assets may have multiple tags.

| Namespace | Examples | Meaning |
|---|---|---|
| `domain/` | `domain/finance`, `domain/finance/etf`, `domain/finance/bonds`, `domain/finance/filings`, `domain/finance/macro` | Research domain |
| `capability/` | `capability/search`, `capability/extract`, `capability/compare`, `capability/summarize`, `capability/cite`, `capability/freshness-check` | User-visible operation |
| `instrument/` | `instrument/etf`, `instrument/corporate-bond`, `instrument/municipal-bond`, `instrument/sovereign-bond` | Instrument coverage |
| `source/` | `source/issuer`, `source/regulator`, `source/central-bank`, `source/statistical-agency`, `source/licensed-market-data` | Source class |
| `data/` | `data/reference`, `data/holdings`, `data/price-delayed`, `data/filing`, `data/macro-series`, `data/release-calendar` | Data type |
| `freshness/` | `freshness/realtime`, `freshness/delayed`, `freshness/daily`, `freshness/periodic`, `freshness/event-driven` | Expected update pattern |
| `permission/` | `permission/read-public`, `permission/read-licensed`, `permission/local-file-read`, `permission/network-read` | Required access |
| `risk/` | `risk/stale-data`, `risk/citation-gap`, `risk/derived-analysis`, `risk/credential-required`, `risk/licensing` | Material risk |
| `status/` | `status/healthy`, `status/degraded`, `status/stale`, `status/unavailable`, `status/blocked` | Current operational state |

Tags describe capability, not quality. A capability is considered verified only when its required evaluation fixtures pass and its source, permission, and freshness metadata are complete.

## 4. Provenance and time model

### 4.1 Required source provenance

Each externally sourced fact must carry:

- `sourceId`: stable Observatory identifier for the source.
- `sourceType`: issuer, regulator, exchange, central bank, statistical agency, licensed provider, or user-supplied document.
- `publisher`: legal or commonly recognized publishing entity.
- `title`: document, dataset, endpoint, or page title.
- `canonicalUrl` or `documentId`: reproducible source locator.
- `recordId`: filing accession, series ID, security identifier, document checksum, or provider record key when available.
- `retrievedAt`: UTC timestamp at which the system retrieved the material.
- `licenseClass`: public, user-licensed, restricted, or unknown.
- `contentHash`: recommended for downloaded documents and required for local or user-supplied files.

Aggregators may be used for discovery, but material claims should prefer primary sources. When only an aggregator is available, the result must show `sourceQuality: secondary` and a limitation.

### 4.2 Required time fields

Finance data has multiple non-interchangeable times:

- `observedAt`: when Agent Observatory or its connector observed the value.
- `sourcePublishedAt`: when the publisher released the source.
- `effectiveAt`: when a rule, rate, constituent list, or instrument term became effective.
- `periodStart` and `periodEnd`: period described by the value.
- `asOf`: point-in-time represented by holdings, AUM, price, yield, rating, or similar data.
- `vintageAt`: dataset revision vintage, especially for macro data.

`observedAt` is mandatory for every result. Other fields are mandatory when semantically applicable. A UI must never substitute retrieval time for a data `asOf` date.

### 4.3 Fact versus derived analysis

Every assertion is labeled:

- `fact`: directly supported by a cited source without material transformation.
- `normalized_fact`: a sourced fact converted in units, currency display, date format, or naming, with the transformation recorded.
- `derived_analysis`: calculated, inferred, classified, compared, or summarized from one or more inputs.
- `opinion`: qualitative judgment not mechanically entailed by the sources; excluded from MVP automated outputs.

Derived analysis must include:

- input assertion IDs;
- method name and version;
- formula or concise method description;
- assumptions;
- uncertainty or limitations;
- calculation time.

A summary sentence containing both facts and interpretation must be split into separate assertions or labeled `derived_analysis`.

## 5. Freshness policy

Freshness is evaluated against the data type, not against a single global threshold.

| Data class | Expected freshness | Stale trigger |
|---|---|---|
| Filing metadata and documents | Event-driven | Known newer filing/amendment exists or source check fails beyond 24 hours |
| ETF holdings and AUM | Issuer cadence, commonly daily or periodic | Older than declared issuer cadence plus one business day |
| ETF prospectus and fees | Event-driven | New prospectus/supplement known or last verification exceeds 30 days |
| Bond terms and reference data | Event-driven | Conflicting newer disclosure or last verification exceeds 30 days |
| Bond price or yield observations | Provider-defined | Observation exceeds provider delay window or comparison request tolerance |
| Macro release value | Release-calendar driven | Latest scheduled release is missing after a configurable grace period |
| Macro historical series | Vintage-aware | New vintage exists but result does not identify or retrieve it |

Each source adapter declares `freshnessPolicyId`, expected cadence, grace period, market calendar if relevant, and whether manual verification is permitted. Results expose `freshnessStatus` as `fresh`, `aging`, `stale`, `unknown`, or `not_applicable`.

Unknown freshness is not treated as fresh. Comparisons with mismatched dates remain allowed only when the mismatch is prominent and the workflow does not imply like-for-like equivalence.

## 6. Permissions and credential boundaries

### 6.1 Read-only default

The Finance Pack permits:

- public internet reads;
- authenticated reads from user-authorized data providers;
- reads of explicitly selected local files;
- local indexing, caching, transformation, and evaluation;
- export of research artifacts to a user-selected local destination.

The Finance Pack does not request or exercise:

- brokerage trading or order-management permissions;
- money movement, transfer, or withdrawal permissions;
- portfolio modification permissions;
- account administration or beneficiary changes;
- unrestricted filesystem access;
- credential enumeration or secret-value reads.

Any connector exposing both read and write tools must register individual tool permissions. Write-capable tools are excluded or blocked, rather than trusting an agent not to invoke them.

### 6.2 Credential boundaries

- Credentials remain in the operating system keychain, provider SDK store, environment injection layer, or approved secret manager.
- The graph stores only a `credentialRef`, provider, scope summary, expiry metadata, and last validation status; it never stores the secret value.
- Logs, prompts, traces, fixtures, citations, and exported reports must redact tokens, account identifiers where unnecessary, and provider secrets.
- Agents receive the narrowest provider scope required for the current read operation.
- A credential may not be shared between agents merely because they use the same MCP server.
- Missing, expired, or insufficient credentials produce `blocked`, not a silent fallback to a different data source.
- Licensed data must not be persisted, reproduced, or exported beyond the user's provider rights.

## 7. Citation requirements

Every material factual claim in a user-visible finance result requires at least one citation. A citation contains:

- source title and publisher;
- canonical URL or document identifier;
- source record identifier when available;
- publication and observation timestamps;
- locator: page, section, table, paragraph, filing item, dataset series, or response field;
- quoted excerpt only when licensing permits and only to the minimum necessary extent;
- assertion IDs supported by the citation.

Derived analysis cites all material input facts. A document-level URL without a locator is insufficient when a stable page, section, table, or filing item exists. If a citation cannot be produced, the assertion is labeled `unsupported` and must not appear as an unqualified fact.

## 8. Risk taxonomy

| Risk | Description | Required control |
|---|---|---|
| Data freshness | Value is outdated, delayed, or from the wrong vintage | Type-specific freshness policy and visible timestamps |
| Provenance gap | Source identity or lineage is incomplete | Block fact classification; show unsupported state |
| Temporal mismatch | Compared values describe different dates or periods | Alignment check and prominent mismatch disclosure |
| Semantic mismatch | Yield, return, currency, adjustment, or accounting basis differs | Normalize only with recorded method; otherwise warn |
| Identifier ambiguity | Ticker, issuer, share class, CUSIP/ISIN, or series resolves incorrectly | Require stable identifier and market/provider context |
| Derivation risk | Calculation, inference, or summary obscures assumptions | Derived label, inputs, method, and limitations |
| Hallucination | Claim is not entailed by retrieved evidence | Citation entailment evaluation and unsupported state |
| Permission excess | Connector exposes unnecessary write or account privileges | Tool-level allowlist and read-only policy enforcement |
| Credential exposure | Secret or sensitive account data enters logs or outputs | Reference-only credential model and redaction tests |
| Licensing | Data use, caching, or export exceeds provider rights | License metadata and policy-aware storage/export |
| Availability | Source, network, parser, or provider is unavailable | Explicit degraded state and no fabricated fallback |
| Regulatory interpretation | Output is mistaken for legal, tax, or compliance advice | Scope disclosure and referral to qualified professionals |
| Suitability/advice | General research is presented as personalized recommendation | Prohibit suitability scoring and personalized calls to action |

Risk severity is `info`, `low`, `medium`, `high`, or `critical`. Permission excess, credential exposure, write-capable finance access, and fabricated citations are `critical` for the MVP.

## 9. Operational and degraded states

| State | Meaning | User-visible behavior |
|---|---|---|
| `healthy` | Required source, citation, freshness, and permission checks pass | Normal result |
| `degraded` | Partial sources or non-critical metadata are missing | Result shown with limitations and reduced confidence |
| `stale` | Data exceeds its policy threshold | Timestamp and stale warning; no “current” language |
| `unavailable` | Source or parser cannot return a result | No claim emitted; retry and source status shown |
| `blocked` | Permission, credential, license, or safety policy prevents execution | Explain boundary; do not attempt hidden bypass |
| `conflicted` | Authoritative sources disagree or identifiers resolve ambiguously | Present competing evidence; require user resolution |
| `unsupported` | Claim lacks adequate evidence or citation | Exclude from factual summary or visibly mark unsupported |

No degraded mode may invent values, citations, timestamps, or source success. Cached data may be shown only with its original `observedAt`, current cache age, and source status.

## 10. MVP data contract

The canonical MVP payload is a versioned JSON object. Optional finance-specific fields may extend it, but required fields cannot be removed.

```ts
type FinancePackResult = {
  schemaVersion: "finance-pack/0.1";
  resultId: string;
  workflow: "etf_research" | "bond_research" | "filing_research" | "macro_research";
  subject: {
    kind: "etf" | "bond" | "issuer" | "filing" | "macro_series";
    name: string;
    identifiers: Array<{
      scheme: "ticker" | "isin" | "cusip" | "lei" | "cik" | "accession" | "series_id" | "provider";
      value: string;
      context?: string;
    }>;
  };
  capabilityTags: string[];
  status: "healthy" | "degraded" | "stale" | "unavailable" | "blocked" | "conflicted";
  observedAt: string; // ISO 8601 UTC
  freshness: {
    policyId: string;
    status: "fresh" | "aging" | "stale" | "unknown" | "not_applicable";
    asOf?: string;
    sourcePublishedAt?: string;
    effectiveAt?: string;
    periodStart?: string;
    periodEnd?: string;
    vintageAt?: string;
    reason?: string;
  };
  sources: Array<{
    sourceId: string;
    sourceType: "issuer" | "regulator" | "exchange" | "central_bank" |
      "statistical_agency" | "licensed_provider" | "user_document";
    publisher: string;
    title: string;
    canonicalUrl?: string;
    documentId?: string;
    recordId?: string;
    retrievedAt: string;
    sourceQuality: "primary" | "secondary";
    licenseClass: "public" | "user_licensed" | "restricted" | "unknown";
    contentHash?: string;
  }>;
  assertions: Array<{
    assertionId: string;
    label: "fact" | "normalized_fact" | "derived_analysis";
    text: string;
    value?: string | number | boolean;
    unit?: string;
    inputAssertionIds?: string[];
    method?: { name: string; version: string; description: string };
    assumptions?: string[];
    limitations?: string[];
    citationIds: string[];
  }>;
  citations: Array<{
    citationId: string;
    sourceId: string;
    locator: string;
    excerpt?: string;
    assertionIds: string[];
  }>;
  permissions: {
    mode: "read_only";
    required: string[];
    denied: string[];
    credentialRefs: Array<{
      id: string;
      provider: string;
      scopes: string[];
      status: "valid" | "expired" | "missing" | "insufficient" | "unknown";
    }>;
  };
  risks: Array<{
    code: string;
    severity: "info" | "low" | "medium" | "high" | "critical";
    message: string;
    assertionIds?: string[];
    mitigation?: string;
  }>;
};
```

Contract validation rules:

1. `observedAt`, `permissions.mode`, source lineage, and freshness status are always present.
2. Every `fact` and `normalized_fact` has at least one valid citation.
3. Every `derived_analysis` references its material input assertions and a method.
4. Every citation references an existing source and assertion.
5. A missing or invalid credential produces `blocked` and no provider-derived assertions.
6. Any enabled write permission is a contract violation.
7. `healthy` is invalid when freshness is `stale` or `unknown`, citations are incomplete, or critical risks exist.

## 11. Evaluation fixtures

The MVP fixture suite is deterministic, license-safe, and contains no live secrets.

| Fixture | Contents | Evaluates |
|---|---|---|
| `etf-primary-sources` | Synthetic issuer facts, prospectus excerpt, two holdings snapshots with different dates | Identifier resolution, provenance, holdings freshness, temporal mismatch |
| `bond-yield-conventions` | Synthetic bond terms and observations using YTM, current yield, clean and dirty price | Semantic mismatch, units, derived calculations |
| `filing-amendment` | Public or synthetic base filing plus amendment with stable locators | Amendment precedence, citation locator, document identity |
| `macro-vintages` | Synthetic initial and revised releases with calendar metadata | Vintage handling, revision labeling, period versus release time |
| `credential-and-permission` | Fake credential references and a mixed read/write MCP manifest | Secret redaction, insufficient scope, write-tool blocking |
| `source-outage-cache` | Cached valid payload plus simulated provider timeout | Degraded state, cache age disclosure, no fabricated freshness |
| `citation-entailment` | Supported, partially supported, and unsupported assertions | Fact labeling and citation completeness |

Fixtures must be pinned by checksum and evaluated offline. Live-source smoke tests are optional, separately labeled, and cannot determine deterministic CI success.

## 12. Acceptance scenarios

### Scenario 1: ETF comparison with mismatched holdings dates

Given two ETF holdings snapshots with different `asOf` dates, when the user compares concentration, the result cites both issuer sources, displays both dates, labels calculated concentration as `derived_analysis`, and emits a temporal-mismatch risk. It does not present the values as a same-day comparison.

### Scenario 2: Bond yield with an explicit method

Given bond terms and a delayed clean-price observation, when the system calculates yield to maturity, the result records the price observation time, accrued-interest convention, formula or method version, input assertions, and limitations. A current-yield value cannot be labeled or displayed as yield to maturity.

### Scenario 3: Filing amended after an earlier retrieval

Given an original filing and a later amendment, when a filing workflow answers a question affected by the amendment, it uses or presents the amendment, preserves both document identities, cites a stable section or table locator, and marks the earlier claim superseded rather than silently overwriting provenance.

### Scenario 4: Revised macro release

Given initial and revised macro values, when the user asks for the latest value and change, the result identifies the latest vintage, separates reference period from release and observation times, cites the statistical agency series, and labels the change calculation as derived analysis.

### Scenario 5: Provider credential lacks scope and exposes write tools

Given an MCP server with licensed finance reads, trading tools, and an insufficient credential scope, when a research workflow starts, Agent Observatory blocks the provider operation, excludes all write tools, stores no secret value, emits credential and permission risks, and returns no invented or silently substituted provider facts.

## 13. Explicit non-goals

The MVP does not:

- provide personalized buy, sell, hold, allocation, suitability, tax, legal, or compliance advice;
- rank investments for an individual's goals, risk tolerance, holdings, income, age, jurisdiction, or time horizon;
- connect to brokerage order entry, execute or simulate trades, rebalance accounts, or move money;
- monitor a user's portfolio for automated action;
- guarantee accuracy, completeness, market timeliness, investment outcomes, or regulatory compliance;
- redistribute licensed data beyond provider terms;
- replace primary documents, regulated disclosures, or qualified financial, legal, tax, or compliance professionals;
- infer that an agent is safe merely because it carries finance tags or passes structural validation.

Future advisory or execution capabilities, if ever considered, require a separate product boundary, legal and regulatory review, explicit user authorization, stronger identity and audit controls, and a permission model that is not part of this pack.
