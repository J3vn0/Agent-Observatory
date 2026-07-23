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
  dashboard/       React + Vite web control plane
packages/
  core/            Graph model, metrics, and similarity contracts
  finance/         Finance domain tags, evidence, and guardrails
docs/
  architecture/    Local-first system design
  design/          Dashboard specification
  finance/         Finance domain-pack specification
  product/         Product brief and milestones
obsidian/          Durable project memory and work log
design-system/     Persisted UI design decisions
```

## Implemented vertical slice

The current fixture-based dashboard:

1. Loads a typed snapshot describing agents, skills, MCP servers, and connections.
2. Shows system health, capability coverage, and disconnected assets.
3. Presents a relationship graph and integration-health table.
4. Explains agent similarity using shared tags and dependencies.
5. Applies finance-specific provenance, freshness, citation, and read-only guardrails.

The UI is deliberately labeled `Demo fixture`; it does not yet inspect real local configuration.

## Local development

Requirements: Node.js 20 or later.

```bash
npm install
npm run dev
```

The dashboard runs at `http://127.0.0.1:4173`.

## Verification

```bash
npm run typecheck
npm test
npm run build
```

## Next milestone

Implement the local daemon adapter contract and first Codex scanner, then replace the fixture with a real `ObservatorySnapshot` endpoint.

