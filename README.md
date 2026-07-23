# Agent Observatory

Agent Observatory is a local-first control plane for understanding, comparing, and operating AI agents, skills, and MCP servers.

The first domain expansion is **Finance**, with explicit provenance, freshness, permissions, and read-only safety boundaries.

## Product shape

- A browser-based dashboard for graph exploration, health, overlap, and capability coverage
- A local daemon that discovers agent, skill, and MCP configuration
- An explainable similarity engine for agents and skills
- Domain packs, starting with finance
- Obsidian-compatible project memory in `obsidian/`

## Repository layout

```text
apps/
  dashboard/       Web control plane
  daemon/          Local discovery and health service
packages/
  core/            Graph model and shared contracts
  finance/         Finance domain pack
docs/              Product and architecture documents
obsidian/          Durable project memory and work log
design-system/     Persisted UI design decisions
```

## Initial milestone

The first vertical slice will:

1. Load a local fixture describing agents, skills, MCP servers, and connections.
2. Show system health, capability coverage, and duplicate-risk summaries.
3. Present an integration matrix and relationship graph.
4. Apply finance-specific tags and safety signals.

## Local development

Development commands will be added as the dashboard and daemon packages land.

