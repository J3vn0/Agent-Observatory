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

- Primary experience: browser dashboard
- Runtime: local daemon and local data store
- Optional later surface: terminal/TUI
- Initial domain pack: finance
- Default safety posture: read-only discovery and explicit approval for mutations

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

| Branch | Worktree role | Ownership |
|---|---|---|
| `main` | Integration and dashboard implementation | Lead agent |
| `agent/product` | Product brief and milestones | Product subagent |
| `agent/architecture` | System architecture and contracts | Architecture subagent |
| `agent/finance` | Finance domain pack and safety model | Finance subagent |

## Current status

- [x] Product direction selected
- [x] Durable Obsidian memory created
- [ ] Git repository initialized
- [ ] Worktrees created
- [ ] Parallel design documents merged
- [ ] Dashboard vertical slice running

## Decisions

- 2026-07-23: Treat finance as a domain pack, not the entire product identity.
- 2026-07-23: Use graph relationships for explainable similarity and compatibility.
- 2026-07-23: Prefer local-first discovery so configuration and credentials remain on the user's machine.
- 2026-07-23: Persist UI design-system output in the repository.

## Working links

- [[Work Log/2026-07-23]]

## Next actions

1. Initialize Git and create the baseline commit.
2. Create role-specific worktrees.
3. Run product, architecture, and finance subagents in parallel.
4. Implement the dashboard fixture and main observability views.

