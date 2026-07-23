---
aliases:
  - Agent Observatory Project Memory
tags:
  - project/agent-observatory
  - domain/agent-ops
  - domain/finance
  - status/active
created: 2026-07-23
updated: 2026-07-23
---

# Agent Observatory

> [!abstract] Project memory
> This note is the durable source of context for the project. Update it after meaningful implementation, architecture, or product decisions.

## North star

Build a local-first observatory that makes agents, skills, MCP servers, permissions, memory, and executions understandable as one connected system.

The product should answer:

- What is installed and where?
- What is healthy, stale, disconnected, or over-privileged?
- Which agents and skills overlap, and why?
- Which capabilities are missing for a goal?
- What should be installed, customized, disabled, or removed?
- Can a finance workflow prove its data source, timestamp, and safety boundary?

## Product decision

- Primary experience: desktop-first browser dashboard
- Responsive support: tablet and mobile, without using mobile proportions as the desktop baseline
- Runtime: local daemon and local data store
- Optional later surface: terminal/TUI
- Initial domain pack: finance
- Default safety posture: read-only discovery and explicit approval for mutations

## Visual direction

- Mode: white/light
- Style: minimal editorial SaaS operations console
- Reference principles: public ElevenLabs site, observed 2026-07-23
- Reused principles: white space, large sans-serif type, black primary actions, thin neutral borders, restrained pill controls
- Original product motif: a coral/pink/violet system orb representing connected agent capabilities
- Explicit boundary: do not copy ElevenLabs branding, imagery, copy, or exact composition

## Core graph

### Nodes

Agent, Skill, MCP Server, MCP Tool, Project, Provider, Credential Reference, Tag, Permission, Execution, Memory, Workflow.

### Edges

USES, REQUIRES, PROVIDES, OVERLAPS, CONFLICTS_WITH, INSTALLED_IN, INVOKED_BY, READS_FROM, WRITES_TO.

## MVP views

1. Overview
2. Integration Matrix
3. Graph Explorer
4. Skill Library
5. Compare
6. Agent Builder

## Finance expansion

The finance pack starts with ETF, bond, filing, and macro-research workflows. It must preserve citations and observation timestamps, distinguish facts from derived analysis, and avoid presenting output as personalized investment advice.

## Worktree model

| Branch | Worktree role | Ownership | Result |
|---|---|---|---|
| `main` | Integration and dashboard implementation | Lead agent | Active |
| `agent/product` | Product brief and milestones | Product subagent | `f13ff40`, merged |
| `agent/architecture` | System architecture and contracts | Architecture subagent | `dacabb9`, merged |
| `agent/finance` | Finance domain pack and safety model | Finance subagent | `c5a080b`, merged |

## Implemented vertical slice

- npm workspace with `apps/dashboard`, `packages/core`, and `packages/finance`
- React + Vite desktop web dashboard
- Global product header and persistent workspace sidebar
- 1440px primary desktop canvas with a 244px workspace sidebar
- Typed graph node, edge, finding, and snapshot contracts
- Deterministic and explainable tag/dependency similarity
- Fixture inventory for agents, skills, and MCP servers
- Relationship graph with health states
- Finance guardrail posture for read-only tools, freshness, and citations
- Integration filtering for all assets or finance assets
- Responsive support at 1024px and 390px

## Validation

- `npm run typecheck`: passed
- `npm test`: 2 tests passed
- `npm run build`: passed
- Desktop 1440×1000: passed
- Desktop/tablet 1024×900: passed
- Mobile 390×844: passed
- Browser console errors/warnings: none
- Browser network 4xx/5xx: none
- Desktop document horizontal overflow: false
- Desktop computed layout: 244px sidebar, approximately 1181px main canvas, four metric columns
- Reduced-motion CSS: included
- Current data mode: explicit `Demo fixture`

## Current status

- [x] Product direction selected
- [x] Durable Obsidian memory created
- [x] Git repository initialized
- [x] Worktrees created
- [x] Parallel design documents merged
- [x] Dashboard vertical slice running
- [x] White desktop-first UI redesign verified
- [ ] Local daemon scanner reads real Codex/Claude/Cursor configuration
- [ ] SQLite graph persistence
- [ ] Real MCP health probes

## Decisions

- 2026-07-23: Treat finance as a domain pack, not the entire product identity.
- 2026-07-23: Use graph relationships for explainable similarity and compatibility.
- 2026-07-23: Prefer local-first discovery so configuration and credentials remain on the user's machine.
- 2026-07-23: Persist UI design-system output in the repository.
- 2026-07-23: Start with deterministic similarity based on shared tags and dependencies before optional embeddings.
- 2026-07-23: Label fixtures explicitly so simulated observation data cannot be mistaken for live state.
- 2026-07-23: Make desktop web the primary dashboard canvas.
- 2026-07-23: Replace the initial dark operations style with a white editorial interface.

## Working links

- [[Work Log/2026-07-23]]
- Product brief: `docs/product/PRODUCT_BRIEF.md`
- Architecture: `docs/architecture/ARCHITECTURE.md`
- Finance pack: `docs/finance/FINANCE_PACK.md`
- Dashboard specification: `docs/design/DASHBOARD_SPEC.md`
- Design system: `design-system/agent-observatory/MASTER.md`

## Next actions

1. Implement the daemon adapter contract and Codex scanner.
2. Persist normalized observations in SQLite.
3. Replace the fixture with the daemon snapshot endpoint.
4. Add MCP stdio/HTTP health probes without exposing credential values.
5. Implement the Skill Library and evidence-first Compare views.

