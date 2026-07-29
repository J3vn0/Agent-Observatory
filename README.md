<div align="center">

# Agent Observatory

### See what your agents use. Understand where they overlap. Share what should be global.

A local-first control plane for Codex and Claude projects, sessions, subagents,
skills, plugins, hooks, MCP servers, and governed automation.

[한국어](./README.ko.md) · **English** · [Setup](./SETUP.md) · [Architecture](./docs/architecture/ARCHITECTURE.md)

![Local First](https://img.shields.io/badge/local--first-yes-13765a?style=flat-square)
![Package](https://img.shields.io/badge/package-0.4.0-201f1b?style=flat-square)
![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A520-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-149ECA?style=flat-square&logo=react&logoColor=white)
![Codex + Claude](https://img.shields.io/badge/environments-Codex%20%2B%20Claude-e17a45?style=flat-square)

</div>

---

## The problem

AI coding environments become fragmented quickly. Global agents live beside
project-only agents. Skills and plugins accumulate across tools. The same role
appears under different names, and it becomes hard to tell what is connected,
duplicated, useful, or safe to promote.

Agent Observatory turns that local sprawl into an explainable system.

~~~mermaid
flowchart LR
  D["Discover"] --> N["Normalize"]
  N --> C["Compare"]
  C --> P["Preview"]
  P --> A["Approve & apply"]
  A --> U["Undo when safe"]
~~~

## Product at a glance

| Area | What it does | Status |
|---|---|---|
| **Environment inventory** | Reads display-safe Codex, Claude, and shared-agent metadata | Available |
| **Project scopes** | Switches between global, environment, and individual project views | Available |
| **Agent hierarchy** | Connects primary sessions, subagents, roles, skills, and parent relationships | Available |
| **Registry** | Explains similarity and identifies cross-project promotion candidates | Available |
| **Promotion actions** | Previews target files and conflicts before creating shared Markdown or Codex TOML definitions | Available |
| **Capability catalog** | Searches skills, plugins, hooks, and MCP servers with tags and source information | Available |
| **Relationship graph** | Groups repeated roles and visualizes environment-to-agent relationships | Available |
| **Finance Lab** | Composes a local research mandate, capabilities, schedule, cost estimate, and guardrails | Demo |

## Workspace

The dashboard uses a desktop-first workspace shell:

- an icon-only navigation rail with accessible labels and tooltips
- a collapsible environment and project context sidebar
- large task canvases for overview, projects, registry, graph, and Finance
- Korean and English interface copy
- responsive layouts with 44 px navigation targets

## Core workflows

### 1. Observe by scope

Start globally, narrow to Codex or Claude, then select one local project. Counts,
activity, relationships, and registries follow the active scope.

### 2. Explain agents and capabilities

Hover or focus an agent, skill, plugin, hook, or MCP entry to see a concise
description based only on allowlisted metadata.

### 3. Find overlap

The registry compares names, roles, tags, capabilities, skills, MCP servers,
and permissions. Similarity results expose their evidence instead of returning
an unexplained score.

### 4. Promote deliberately

When the same project agent appears useful across projects, Agent Observatory
can preview a global shared definition or Codex definition. The action shows
the target, format, observed skills, and conflicts before approval.

Created definitions can be undone only while their content hash still matches,
preventing accidental deletion after a later edit. Undo metadata is held in
memory and remains available only during the current daemon session.

## Architecture

~~~mermaid
flowchart LR
  C["Codex<br/>~/.codex"] --> D["Loopback daemon<br/>127.0.0.1:4317"]
  L["Claude<br/>~/.claude"] --> D
  A["Shared agents<br/>~/.agents"] --> D
  D --> R["Redaction & normalization"]
  R --> S["Safe snapshot API"]
  S --> W["React dashboard<br/>127.0.0.1:4173"]
  W --> Q["Global / environment / project scope"]
~~~

The loopback daemon maps environment-specific layouts into a shared model:

~~~text
Environment
  +-- Project
      +-- Primary session
          +-- Subagent session
~~~

Codex parent links come from safe `session_meta` fields. Claude parent links
come from project-session and nested `subagents` directory structure.

## Privacy boundary

Discovery and snapshot collection are read-only by default and require no cloud
account, telemetry service, or model API. Approved Registry actions are an explicit
write exception: they create new definitions only and never overwrite existing files.

| Returned to the dashboard | Never returned |
|---|---|
| Environment identifier | Conversation messages or prompts |
| Sanitized project label | Agent instructions or arbitrary file contents |
| Opaque session identifier | Commands, arguments, tool inputs, or outputs |
| Parent-session relationship | URLs, headers, tokens, or credentials |
| Explicit role and skill metadata | Environment values or trust hashes |
| Observation timestamp | Usernames or absolute home paths |
| Installed asset name and state | Credential-bearing configuration values |

Automated tests include seeded-secret, username, and absolute-path sentinels.

## Quick start

### Requirements

- Node.js 20 or later
- npm 10 or later
- Optional local data in `~/.codex`, `~/.claude`, or `~/.agents`

### Install

~~~bash
git clone https://github.com/J3vn0/Agent-Observatory.git
cd Agent-Observatory
npm install
~~~

> [!IMPORTANT]
> Run every npm command from the repository root, the folder that contains
> `package.json`. If npm reports `Could not read package.json`, check your
> current folder before retrying.

### Run

Terminal 1:

~~~bash
npm run dev:daemon
~~~

Terminal 2:

~~~bash
npm run dev:dashboard
~~~

Open **http://127.0.0.1:4173**. The header shows **Live** when the local daemon
is connected. If it is unavailable, the UI explicitly labels fallback sample data.

### Verify your location on PowerShell

~~~powershell
Get-Location
Test-Path .\package.json
~~~

`Test-Path` must return `True`.

See [SETUP.md](./SETUP.md) for path overrides, health checks, and privacy notes.

## Optional path overrides

Defaults work without an `.env` file:

~~~dotenv
AGENT_OBSERVATORY_CODEX_HOME=
AGENT_OBSERVATORY_CLAUDE_HOME=
AGENT_OBSERVATORY_AGENTS_HOME=
AGENT_OBSERVATORY_PORT=4317
VITE_OBSERVATORY_API=
~~~

## Validation

~~~bash
npm run typecheck
npm test
npm run build
~~~

The default test suite runs without an external MCP server, finance provider,
or model API.

## Repository layout

~~~text
apps/
  dashboard/       React + Vite workspace
  daemon/          Loopback-only scanner, action planner, and snapshot API
packages/
  core/            Graph, registry, similarity, scope, and taxonomy contracts
  finance/         Finance-domain policy and guardrails
docs/              Architecture, product, design, and finance plans
obsidian/          Durable project memory and work logs
~~~

## Current status

**Current `main` — package v0.4.0 plus unreleased Finance Lab and workspace updates**

- [x] Codex and Claude environment adapters
- [x] Global, environment, and project scopes
- [x] Primary-session and subagent relationships
- [x] Tagged skill and integration registries
- [x] Explainable project-agent similarity and promotion candidates
- [x] Preview, execute, and hash-protected undo for agent definitions
- [x] Icon-rail workspace with responsive Korean and English UI
- [x] Finance personalization and capability-composition demo
- [ ] Explainable skill and plugin similarity
- [ ] Guided skill installation, customization, and lifecycle management
- [ ] Capability adoption per agent with visible token budgets
- [ ] Additional environment adapters
- [ ] Approved data-source connectors for read-only finance research

## Design principles

1. **Observe before changing.** Discovery and comparison come before install,
   disable, remove, or promote operations.
2. **Explain every score.** Similarity, health, cost, and recommendations expose
   their evidence.
3. **Keep actions reversible.** Preview targets and conflicts, require approval,
   and refuse unsafe undo.
4. **Keep the daemon local.** The browser never receives unrestricted paths or
   credential values.
5. **Treat finance as evidence-sensitive.** Market and filing workflows must
   expose provenance, observation time, freshness, and cost.

> [!CAUTION]
> Agent Observatory does not provide investment advice or execute trades.
> Finance Lab is a disconnected product demo, not a live data or brokerage integration.

## Contributing

Issues and focused pull requests are welcome. Keep environment adapters
read-only, preserve the privacy boundary, and run the validation commands
before submitting changes.

Built by [J3vn0](https://github.com/J3vn0).
