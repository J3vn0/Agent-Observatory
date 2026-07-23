# Agent Observatory product brief

## Product thesis

Agent Observatory is a local-first control plane that turns an opaque collection of agents, skills, MCP servers, permissions, and executions into an inspectable operating system.

The sharp claim is:

> Before an operator installs, runs, customizes, or removes an agent capability, Agent Observatory shows what it connects to, what it overlaps with, what it can access, whether it is healthy, and why the recommended action is safe.

The product is not another agent framework or marketplace. It is the observability and lifecycle layer across frameworks and local tools. Its defensible center is an evidence-backed graph assembled from the user's actual environment, with every score traceable to concrete configuration, metadata, and runtime observations.

Finance is the first domain pack because it makes the value of provenance, freshness, permission boundaries, and explainability immediately visible. The core product remains domain-neutral.

## Target users and jobs-to-be-done

### 1. Individual AI builder

**Context:** Uses Codex, Claude, Cursor, or similar tools and has accumulated agents, skills, and MCP servers across projects.

**Jobs:**

- When I start a project, show me which capabilities are already installed and usable so I do not recreate or reinstall them.
- When I consider a new skill, compare it with what I have and explain whether to install, customize, or skip it.
- When something fails, show the broken connection and the smallest corrective action.
- When I remove a capability, tell me which agents and workflows will be affected before I confirm.

### 2. Agent platform or developer-experience operator

**Context:** Maintains a shared agent toolchain for a team and needs a consistent inventory and safety posture.

**Jobs:**

- When configurations change, detect drift, stale integrations, and excessive permissions.
- When two agents appear redundant, show their shared and unique capabilities with evidence.
- When reviewing a workspace, export a human-readable posture summary without exposing credentials.
- When adopting a new MCP server, validate health, tool coverage, and downstream dependencies.

### 3. Technical finance researcher

**Context:** Uses agents to research ETFs, bonds, filings, and macroeconomic data.

**Jobs:**

- When an agent presents a financial fact, verify its source, observation time, and transformation path.
- When building a research workflow, select only tools with the required asset coverage and freshness.
- When a workflow crosses a safety boundary, distinguish read-only research from trading or personalized advice.
- When results conflict, identify which source, date, or derivation produced the difference.

### 4. Agent or skill author

**Context:** Publishes reusable capabilities and wants them to be discoverable and interoperable.

**Jobs:**

- When I package a capability, see missing metadata, ambiguous permissions, and likely duplicates.
- When users customize my package, preserve upstream lineage and make local differences visible.
- When I release an update, show whether local customizations can be carried forward safely.

## Product principles

1. **Evidence before score.** Health, similarity, risk, and recommendations always link to their inputs.
2. **Local by default.** Scan configuration and metadata locally; never display credential values.
3. **Read-only first.** Discovery and diagnosis are automatic. Install, edit, disable, and remove require a preview and explicit confirmation.
4. **Graph, then workflow.** The graph is the shared data model; users encounter it through task-focused views rather than a graph visualization alone.
5. **Progressive density.** A ten-second posture summary leads to details without hiding uncertainty.
6. **Domain packs, not forks.** Finance adds vocabulary, policies, checks, and workflows without fragmenting the core product.

## Non-goals

- Building a general-purpose agent runtime, orchestration framework, or model provider.
- Hosting a public marketplace in the MVP.
- Executing trades, moving money, or presenting personalized investment advice.
- Automatically deleting, disabling, or rewriting user capabilities.
- Reading or storing raw secrets; only credential references, provider, scope, and validation state are modeled.
- Claiming semantic equivalence from vector similarity alone.
- Supporting every agent ecosystem in version 0.1; the first slice uses fixtures and one local discovery adapter.
- Replacing source control, package managers, or upstream registries.
- Treating activity volume as agent quality.

## MVP vertical slice

The first complete journey is: **scan a local workspace, understand its posture, investigate one duplicate-risk finding, and make a safe lifecycle decision.**

1. The operator opens Agent Observatory and sees that data is a local fixture or local scan, including its observation timestamp.
2. The Overview summarizes agents, skills, MCP servers, unhealthy connections, capability gaps, and duplicate-risk findings.
3. The operator opens a duplicate-risk finding for two finance research skills.
4. Compare explains shared tags, tools, permissions, inputs/outputs, and unique capabilities; each contribution to the similarity score is expandable.
5. The operator chooses **Keep both**, **Customize**, or **Remove candidate**.
6. A dependency preview shows affected agents and workflows, plus the reversible or irreversible parts of the action.
7. In 0.1, mutation is simulated and recorded as a proposed change; later versions can apply it after confirmation.

The slice is successful when a first-time user can answer these questions without documentation:

- What is installed?
- What is unhealthy or risky?
- Why are these two capabilities considered similar?
- What will break if I remove one?
- Is this finance workflow using fresh, attributable, read-only data?

## Core views

All views follow the same design-first contract:

- **Format:** responsive web app at 375, 768, 1024, and 1440 pixels.
- **Grid:** 12 columns desktop, 8 tablet, 4 mobile; persistent left navigation above 1024 pixels.
- **Type:** Fira Code for headings and tabular data, Fira Sans for body and controls.
- **Mode:** dark operations surface by default, with electric blue as the single product accent. Green, amber, red, and violet are semantic signals and always paired with text or iconography.
- **Interaction:** labeled Lucide icons, visible keyboard focus, 150–250 ms state transitions, and a reduced-motion equivalent.
- **Trust:** every page shows scan freshness and whether data is fixture, observed, inferred, or user-authored.

### 1. Overview

**Single message:** “This is the current posture of your local agent system.”

**Hierarchy:** system status and freshness → six headline metrics → critical findings → capability coverage → recent observations.

**Primary action:** `Run local scan`

**Required states:**

- First run with a short explanation of what will and will not be scanned.
- Scan in progress with completed/remaining source count.
- Healthy, attention, and critical postures with textual summaries.
- Partial scan with unavailable adapters clearly identified.

**Success criteria:**

- A user identifies the most important issue and its affected object within 10 seconds.
- Every metric opens a filtered evidence view.
- No health state depends on color alone.
- At 375 pixels, status, top finding, and scan action appear before secondary metrics.

### 2. Integration Matrix

**Single message:** “See which agents can actually use which skills and MCP tools.”

**Hierarchy:** coverage summary → agent-by-capability matrix → filters → selected-cell evidence.

**Primary action:** select a missing, degraded, or over-privileged cell to inspect it.

**Required states:**

- Connected, missing, degraded, incompatible, and unobserved cells.
- Filters for project, agent, domain, runtime, health, and permission risk.
- Text/table alternative to the visual matrix.
- Sticky row and column labels at desktop density.

**Success criteria:**

- A user locates a named missing capability in three interactions or fewer.
- Selecting a cell explains the exact edge, configuration source, and last observation.
- The matrix remains navigable by keyboard and screen reader.
- A filtered URL can reproduce the current matrix state.

### 3. Graph Explorer

**Single message:** “Understand how this object is connected and what depends on it.”

**Hierarchy:** focused object → direct relationships → risk/health overlays → expandable neighborhood → evidence drawer.

**Primary action:** focus a node and inspect one relationship.

**Required states:**

- Node types: Agent, Skill, MCP Server, MCP Tool, Project, Provider, Credential Reference, Tag, Permission, Execution, Memory, and Workflow.
- Edge types: USES, REQUIRES, PROVIDES, OVERLAPS, CONFLICTS_WITH, INSTALLED_IN, INVOKED_BY, READS_FROM, and WRITES_TO.
- Fixed layout after load; no motion that prevents inspection.
- List and table equivalent for every visible neighborhood.

**Success criteria:**

- A user traces an agent-to-MCP-tool dependency in under 30 seconds.
- Every edge opens source evidence and observation time.
- Node count and depth controls prevent unreadable “hairball” graphs.
- Keyboard focus order matches the relationship list.

### 4. Skill Library

**Single message:** “Find the best-fit capability without creating unnecessary duplication.”

**Hierarchy:** search and intent → installed/recommended summary → filterable results → compatibility and lifecycle actions.

**Primary action:** compare or inspect a skill before installation.

**Required states:**

- Tags for domain, function, runtime, risk, source, status, and maintenance.
- Installed, available, customized, update-available, disabled, and deprecated states.
- Local, GitHub, registry, and user-authored provenance.
- Clear distinction between verified metadata and inferred tags.

**Success criteria:**

- A user filters to finance + filings + read-only in three interactions or fewer.
- Every result shows source, version or commit, compatibility, permission summary, and last validation.
- Duplicate-risk appears before the install action.
- Search results explain why each item matched the query.

### 5. Compare

**Single message:** “See what is genuinely shared, what is unique, and why the score exists.”

**Hierarchy:** recommendation and confidence → similarity breakdown → shared/unique capabilities → dependency and permission differences → lifecycle choices.

**Primary action:** choose `Keep both`, `Customize`, `Replace`, or `Review removal`.

**Required states:**

- Two-item comparison in 0.1; up to four items later.
- Side-by-side fields aligned by meaning, with missing metadata shown as unknown rather than zero.
- Score contributions, contradictory evidence, and confidence.
- Diff view for instructions, declared tools, tags, permissions, and source lineage.

**Success criteria:**

- A user can state the top three reasons for a similarity score after viewing the page.
- The recommendation changes predictably when a major input is removed in fixture tests.
- Shared and unique capabilities are readable without interpreting the numeric score.
- No destructive action is available without dependency preview.

### 6. Agent Builder

**Single message:** “Assemble a capable agent while seeing gaps, conflicts, and risk before saving.”

**Hierarchy:** goal and runtime → selected capabilities → coverage and conflicts → permissions → generated configuration preview.

**Primary action:** add or remove a capability and review the resulting configuration.

**Required states:**

- Start from goal, existing agent, or template.
- Capability search uses the same tags and evidence as Skill Library.
- Live detection of missing requirements, duplicated tools, conflicting instructions, and elevated permissions.
- Generated changes appear as a reviewable diff; no silent file write.

**Success criteria:**

- A user assembles a read-only finance research agent from a template in under five minutes.
- The builder blocks completion when a required capability is absent and explains how to resolve it.
- Permission changes are summarized in plain language.
- The final preview names every file and configuration field that would change.

## Explainable similarity UX

Similarity is a decision aid, not a verdict. The interface must separate **score**, **evidence**, **uncertainty**, and **recommended action**.

### Score model shown to users

Display a 0–100 similarity score with a confidence label and five independently expandable contributions:

| Contribution | Example evidence | UX treatment |
|---|---|---|
| Declared purpose | Similar descriptions and trigger conditions | Highlight matched phrases; link to source files |
| Capabilities | Shared tools, inputs, outputs, and workflow steps | Shared/unique capability chips |
| Dependencies | Same MCP servers, packages, or providers | Relationship list with health state |
| Permissions | Same files, network destinations, or write scope | Side-by-side permission diff |
| Structure | Similar instructions or repository lineage | Section-level diff and provenance |

The top summary uses exact language:

- `High overlap, high confidence` when multiple independent signals agree.
- `Possible overlap, review needed` when metadata is incomplete or signals conflict.
- `Related, not interchangeable` when purpose overlaps but capabilities or permissions differ materially.

### Required interaction

1. Start with a one-sentence recommendation.
2. Show the three strongest supporting facts and the strongest contradictory fact.
3. Let the user expand each contribution to inspect raw metadata and source location.
4. Allow “exclude this signal” as a temporary what-if control; recompute score and recommendation without changing stored data.
5. Show `Unknown` for unavailable evidence and reduce confidence rather than assuming dissimilarity.
6. Link any removal recommendation to a dependency impact preview.

### Similarity acceptance criteria

- Every score in the fixture can be reconstructed from visible contribution values.
- No recommendation is based solely on embeddings or prose similarity.
- Removing one contribution updates the displayed score and explanation in under 200 ms locally.
- Screen-reader text communicates the recommendation, confidence, and contribution order.

## Install, customize, and remove lifecycle

Lifecycle actions follow a shared five-stage flow:

`Discover → Inspect → Preview → Confirm → Verify`

### Install

1. **Discover:** locate a capability by intent and tags.
2. **Inspect:** show provenance, version/commit, declared tools, permissions, compatibility, maintenance state, and duplicate-risk.
3. **Preview:** list files, configuration entries, dependencies, and permission changes.
4. **Confirm:** require explicit approval; elevated permissions receive a separate acknowledgment.
5. **Verify:** rescan, run non-destructive health checks, and record observed state.

### Customize

1. Fork or copy into a user-owned namespace.
2. Preserve upstream repository, commit, and original package identity.
3. Present instructions and metadata as a structured diff.
4. Validate tags, dependencies, and permissions before saving.
5. On upstream updates, offer three-way review rather than automatic overwrite.

### Remove

1. Show direct and transitive dependents.
2. Distinguish uninstall, disable, detach from one agent, and delete user-authored files.
3. Offer the least destructive option first.
4. Require explicit confirmation naming the target and affected workflows.
5. Rescan after the action and present any unresolved references.

### Lifecycle safety criteria

- No mutation occurs from a list-row action alone.
- The preview and confirmation name the exact target, source, and scope.
- Credential values never appear in a diff, log, or event.
- In 0.1, all mutations stop at a proposed-change record.
- Later applied changes produce an auditable event with before/after references and verification result.

## Finance as a domain pack

Finance is a packaged extension of the observatory graph, not a separate product mode. It contributes:

- **Vocabulary:** ETF, bond, issuer, filing, economic series, observation date, publication date, effective date, asset class, jurisdiction, and derived metric.
- **Tags:** `finance/etf`, `finance/fixed-income`, `finance/filings`, `finance/macro`, `data/read-only`, `provenance/cited`, and `freshness/required`.
- **Policy checks:** missing citation, stale observation, unsupported jurisdiction, personalized-advice language, write/trading capability, and fact-versus-analysis ambiguity.
- **Workflow templates:** ETF comparison, bond research, filing review, and macro brief.
- **View overlays:** finance coverage in Integration Matrix, provenance paths in Graph Explorer, and finance guardrails in Agent Builder.

The pack must label:

- Source and canonical URL or identifier.
- Observation, retrieval, and publication timestamps where applicable.
- Raw fact, normalized value, derived analysis, or generated narrative.
- Currency, units, frequency, and timezone.
- Read-only research versus action-capable tools.

The pack does not rank investments, recommend trades, connect brokerage execution in the initial roadmap, or imply that freshness alone guarantees correctness.

## Milestones

### 0.1 — Inspectable fixture

**Promise:** Understand one representative local agent system without changing it.

- Versioned graph fixture covering agents, skills, MCP servers, tools, permissions, and finance tags.
- Overview, Integration Matrix, Graph Explorer, Skill Library, Compare, and Agent Builder as navigable views.
- Explainable two-item similarity with deterministic contribution values.
- Finance guardrails for citation, freshness, fact/analysis, and read-only posture.
- Proposed-change lifecycle previews with no applied mutation.
- Responsive and keyboard-accessible core journeys.

**Exit criteria:** all 0.1 acceptance criteria below pass against the committed fixture.

### 0.2 — Real local observation

**Promise:** Replace fixture assumptions with observed local state.

- One production-quality discovery adapter plus an adapter contract.
- Local daemon, SQLite-backed graph, incremental scans, and source freshness.
- MCP health probes with safe timeouts and no credential disclosure.
- Installed/customized/update-available states with upstream lineage.
- Applied install/customize/remove for one ecosystem, guarded by preview, confirmation, and verification.
- Exportable posture report and scan diagnostics.

**Exit criteria:** a clean installation can scan a supported local environment and complete one reversible lifecycle action end to end.

### 0.3 — Operational workspace

**Promise:** Manage multiple projects and improve decisions over time.

- Multi-project workspaces and saved filters.
- Scan history, drift detection, and change timeline.
- Similarity calibration from user feedback without hiding the deterministic evidence layer.
- Finance workflow templates with reusable provenance checks.
- Policy profiles for individual and team use.
- Optional terminal summary backed by the same local API.

**Exit criteria:** a user can detect a configuration drift, trace its impact, and safely resolve or defer it with an auditable record.

## Measurable acceptance criteria

### 0.1 product acceptance

1. A new user identifies the fixture's highest-severity finding within 10 seconds in 4 of 5 moderated tests.
2. A user traces an agent → skill → MCP tool relationship in under 30 seconds in 4 of 5 tests.
3. A user locates a finance, filings, read-only skill in three interactions or fewer.
4. A user names the top three evidence factors behind a similarity recommendation in 4 of 5 tests.
5. Every headline metric, graph edge, similarity contribution, and finance warning links to visible evidence and an observation/source label.
6. Every lifecycle action shows target, affected dependents, files/configuration fields, permission change, and verification plan before confirmation.
7. The 0.1 build performs no install, edit, disable, or removal on the host.
8. Core journeys complete at 375, 768, 1024, and 1440 pixels without horizontal page scrolling.
9. All interactive controls are keyboard reachable, have visible focus, and meet WCAG AA text contrast.
10. Reduced-motion mode removes graph drift and non-essential transitions.
11. Fixture-derived similarity scores are deterministic across runs and reconstructable from displayed inputs.
12. Finance fixture outputs display source, observation time, data classification, units where relevant, and read-only/action-capable status.
13. No rendered fixture, log, diff, or event contains a credential value.
14. A failed or partial scan state never presents missing evidence as healthy.
15. The six core views share stable navigation, filter vocabulary, object identity, and freshness semantics.

## UI delivery constraints

Use these as a compact constraints card for every generated or implemented view:

```text
GOAL        Make agent-system posture and evidence understandable before action
FORMAT      Responsive operations dashboard: 375 / 768 / 1024 / 1440
GRID        4 / 8 / 12 columns; dense but progressive
HIERARCHY   Posture → evidence → impact → action
TYPE        Fira Code headings/data; Fira Sans body/controls
STYLE       Calm technical operations console
MODE        Dark-first; light tokens reserved for later
ACCENT      Electric blue; semantic colors always paired with labels
MOTION      150–250 ms state transitions; reduced-motion equivalent
ICONS       Lucide SVG with text labels for primary actions
TRUST       Always show provenance, freshness, confidence, and data state
```

Do not use ornamental glass, rainbow graph edges, unlabeled primary controls, fake live data, credential values, financial ticker aesthetics, or automatic graph motion. Lock layout, hierarchy, exact copy, and states before varying accent intensity, card borders, graph density, or motion.
