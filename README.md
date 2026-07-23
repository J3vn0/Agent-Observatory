<div align="center">

# Agent Observatory

### A local-first control plane for your AI agent environments

Observe Codex and Claude projects, sessions, subagents, skills, plugins, hooks,
and MCP servers from one privacy-conscious dashboard.

[한국어](./README.ko.md) · **English** · [Setup](./SETUP.md) · [Architecture](./docs/architecture/ARCHITECTURE.md)

![Local First](https://img.shields.io/badge/local--first-yes-13765a?style=flat-square)
![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A520-171714?style=flat-square&logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-149ECA?style=flat-square&logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite&logoColor=white)
![Codex + Claude](https://img.shields.io/badge/environments-Codex%20%2B%20Claude-e17a45?style=flat-square)

</div>

---

## Why Agent Observatory?

AI coding environments accumulate projects, agents, skills, plugins, and MCP
servers quickly. Agent Observatory turns that scattered local state into a
single, understandable map.

| | Capability | What it gives you |
|---|---|---|
| ◎ | **Unified inventory** | One view across Codex, Claude, and shared agent assets |
| ◫ | **Project scope** | Switch between global, environment, and individual project history |
| ⑂ | **Agent hierarchy** | Follow primary sessions and the subagents created beneath them |
| ◇ | **Safe observation** | Display-safe metadata only, with no conversation or credential values |

## What you can inspect

| Page | Purpose |
|---|---|
| **Overview** | Environment health, project totals, sessions, subagents, skills, and plugins |
| **Projects** | Local project history with per-project session and subagent counts |
| **Agents** | Primary-session and subagent hierarchy, roles, parents, and observation times |
| **Skills** | Searchable skill registry with frontend, backend, cloud, security, data/AI, and other tags |
| **Integrations** | Plugin, hook, and MCP server inventory with health and source information |
| **Graph** | Large relationship canvas from environment to project, session, and subagent |

The interface supports Korean and English and uses a white, desktop-first design
with responsive layouts for smaller screens.

## How it works

~~~mermaid
flowchart LR
  C["Codex<br/>~/.codex"] --> D["Local daemon<br/>127.0.0.1"]
  L["Claude<br/>~/.claude"] --> D
  A["Shared agents<br/>~/.agents"] --> D
  D --> R["Redaction & normalization"]
  R --> S["Safe snapshot API"]
  S --> W["Observatory dashboard"]
  W --> P["Global / Environment / Project scope"]
~~~

The loopback-only daemon understands each environment's local layout and maps
it into a shared model:

~~~text
Environment
  +-- Project
      +-- Primary session
          +-- Subagent session
~~~

Codex parent links come from safe <code>session_meta</code> fields. Claude parent
links come from project-session and nested <code>subagents</code> directory structure.

## Privacy boundary

Agent Observatory is read-only by default. Core discovery does not require a
cloud account, telemetry service, or model API.

| Returned to the dashboard | Never returned |
|---|---|
| Environment identifier | Conversation messages or prompts |
| Sanitized project label | Agent instructions or descriptions |
| Opaque session identifier | Commands, arguments, tool inputs, or outputs |
| Parent-session relationship | URLs, headers, tokens, or credentials |
| Explicit role metadata | Environment variable values or trust hashes |
| Observation timestamp | Usernames or absolute home paths |
| Installed asset name and state | Arbitrary local file contents |

The automated test suite includes seeded-secret, username, and absolute-path
sentinels.

## Quick start

### Requirements

- Node.js 20 or later
- npm 10 or later
- Optional local data in <code>~/.codex</code>, <code>~/.claude</code>, or <code>~/.agents</code>

### Install and run

~~~bash
git clone https://github.com/J3vn0/Agent-Observatory.git
cd Agent-Observatory
npm install
~~~

Start the local daemon:

~~~bash
npm run dev:daemon
~~~

Start the dashboard in a second terminal:

~~~bash
npm run dev:dashboard
~~~

Open **http://127.0.0.1:4173**.

The dashboard shows **Live** when connected to the daemon and clearly labels
sample data as a fallback when the daemon is unavailable.

## Optional path overrides

Defaults work without an <code>.env</code> file. Use these only when your local folders
live elsewhere:

~~~dotenv
AGENT_OBSERVATORY_CODEX_HOME=
AGENT_OBSERVATORY_CLAUDE_HOME=
AGENT_OBSERVATORY_AGENTS_HOME=
AGENT_OBSERVATORY_PORT=4317
VITE_OBSERVATORY_API=
~~~

See [SETUP.md](./SETUP.md) for the complete configuration and privacy notes.

## Validate

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
  dashboard/       React + Vite observatory
  daemon/          Loopback-only scanner and snapshot API
packages/
  core/            Graph, environment, project, session, and taxonomy contracts
  finance/         Finance-domain guardrails for future expansion
docs/              Architecture, product, design, and finance notes
obsidian/          Durable project memory and work logs
~~~

## Current status

**v0.3.0 — Multi-environment project observability**

- [x] Codex and Claude environment adapters
- [x] Global, environment, and project scopes
- [x] Primary-session and subagent relationships
- [x] Tagged skill and integration registries
- [x] Responsive Korean and English dashboard
- [x] Secret-safe local snapshot contract
- [ ] Explainable agent and skill similarity
- [ ] Guided skill customization and lifecycle management
- [ ] Additional environment adapters
- [ ] Read-only finance observability pack

## Roadmap principles

1. **Observe before changing.** Discovery and comparison come before install,
   disable, or remove operations.
2. **Explain every score.** Similarity and health should always include visible
   evidence.
3. **Keep the daemon local.** The browser never receives unrestricted paths or
   credential values.
4. **Treat finance as evidence-sensitive.** Future market and filing features
   must expose provenance, observation time, and freshness.

> Agent Observatory does not provide investment advice or execute trades.
> Finance features remain a future, read-only expansion.

## Contributing

Issues and focused pull requests are welcome. Please keep adapters read-only,
preserve the privacy boundary, and run the validation commands before
submitting changes.
