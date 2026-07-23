# Agent Observatory

Agent Observatory is a local-first desktop web control plane for understanding
AI coding environments, projects, agent sessions, subagents, skills, plugins,
hooks, and MCP servers.

The current release observes both **Codex** and **Claude** installations. It
maps their different local layouts into one safe environment → project →
session → subagent model without returning conversation content.

## Current capabilities

- Codex and Claude environment detection
- Global, environment, and project scope selection
- Local project history with session and subagent counts
- Codex parent/subagent mapping from safe session metadata
- Claude project and nested workflow/subagent mapping
- Dedicated full-width pages for Overview, Projects, Agents, Skills,
  Integrations, and Graph
- Environment-aware skill, plugin, hook, and MCP inventory
- Programming tags for frontend, backend, infrastructure, DevOps, cloud,
  database, testing, security, mobile, data/AI, API, Git, tooling,
  documentation, and design systems
- Korean and English interface and asset summaries
- Explicit live/fallback state
- Secret-safe output: prompts, messages, descriptions, commands, arguments,
  URLs, tokens, credentials, environment values, usernames, and full home paths
  are not returned

## Design

The dashboard is a white, desktop-first observatory inspired by the clarity and
spacing of the public [ElevenLabs](https://elevenlabs.io/) website without
copying its branding or composition. Each major information domain has its own
large page instead of competing inside one dense dashboard.

## Repository layout

```text
apps/
  dashboard/       React + Vite multi-page observatory
  daemon/          Loopback-only environment and asset scanner API
packages/
  core/            Graph, environment, project, session, and taxonomy contracts
  finance/         Future finance-domain guardrails
docs/              Architecture, product, design, and domain notes
obsidian/          Durable project memory and work log
```

## Run locally

See [SETUP.md](./SETUP.md) for path overrides, optional keys, and the privacy
boundary.

```bash
npm install
npm run dev:daemon
```

In another terminal:

```bash
npm run dev:dashboard
```

Open `http://127.0.0.1:4173`.

## Verify

```bash
npm run typecheck
npm test
npm run build
```

## Next expansion

Add adapters for more agent environments through the same contract, then layer
explainable similarity and finance-domain policy checks onto the environment
and project scopes.
