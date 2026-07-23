# Agent Observatory

Agent Observatory is a local-first desktop web control plane for understanding
Codex agents, skills, plugins, hooks, and MCP servers.

The MVP scans the user's local Codex installation, removes sensitive values,
classifies programming skills, and presents the result in Korean or English.
Finance is the planned first domain expansion after the programming registry.

## MVP capabilities

- Loopback-only local daemon for `~/.codex` and `~/.agents`
- Skill, agent, plugin, hook, and MCP inventory
- Programming tags for frontend, backend, infrastructure, DevOps, cloud,
  database, testing, security, mobile, data/AI, API, Git, tooling,
  documentation, and design systems
- Search and filters across Korean and English labels, summaries, kinds, and
  tags
- Relationship graph, health counts, findings, and scan provenance
- Explicit live/fallback state so demo data is never mistaken for local data
- Secret-safe response contract: values, commands, arguments, URLs, tokens,
  hashes, and environment contents are not returned

## Design

The dashboard is a white, desktop-first observatory inspired by the clarity and
spacing of the public [ElevenLabs](https://elevenlabs.io/) website without
copying its branding, copy, or composition. A single relationship map is the
visual signature; the surrounding interface remains quiet and operational.

## Repository layout

```text
apps/
  dashboard/       React + Vite observatory
  daemon/          Loopback-only local scanner API
packages/
  core/            Graph, metrics, similarity, and taxonomy contracts
  finance/         Future finance domain guardrails
docs/              Architecture, product, design, and domain notes
obsidian/          Durable project memory and work log
```

## Run locally

See [SETUP.md](./SETUP.md) for paths, optional keys, security boundaries, and
verification.

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

## Project memory

Architecture decisions and work history are kept as Obsidian-compatible
Markdown in `obsidian/`.
