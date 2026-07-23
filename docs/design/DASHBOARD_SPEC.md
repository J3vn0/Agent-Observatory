# Dashboard design specification

This specification follows the design-first workflow: lock layout, hierarchy, and copy before changing style variables.

## Goal

- Build the primary operations dashboard for Agent Observatory.
- Serve developers, AI operators, and technical finance teams managing local agents, skills, and MCP servers.
- Make system health, disconnected integrations, overlap, and finance safety visible within ten seconds.

## Format

- Responsive web application
- Reference widths: 375, 768, 1024, and 1440 pixels
- Desktop-first operations density with a mobile-safe reading order
- Persistent left navigation above 1024 pixels; compact top navigation below it

## Layout

- Grid: 12 columns on desktop, 8 on tablet, 4 on mobile
- Sidebar: product identity, workspace selector, primary destinations
- Header: page context, scan freshness, global search, scan action
- First row: four system metrics
- Main row: relationship graph and capability coverage
- Lower row: integration health table and recent findings
- Hierarchy: page title → system posture → evidence → actions

## Type system

- Heading and data labels: Fira Code, 500–700
- Body and controls: Fira Sans, 400–600
- Tabular figures for counts, percentages, and timestamps
- Body size: 16 pixels minimum; metadata: 12–13 pixels only when contrast remains accessible

## Color and material

- Dark operations surface as the primary mode
- Deep navy-charcoal background, not pure black
- One product accent: electric blue
- Semantic states: green healthy, amber attention, red critical, violet finance
- Thin borders and restrained ambient glow; blur only where it clarifies layer separation

## UI style

- Dense, technical, and calm
- Graph edges are visually subordinate to node labels
- Use Lucide SVG icons with a consistent stroke
- Animation is limited to state transitions and graph focus, 150–250 milliseconds
- Reduced-motion mode removes graph drift and decorative transitions

## Initial copy

- Product: `Agent Observatory`
- Page title: `System overview`
- Support line: `Understand every agent, skill, and MCP connection from one local control plane.`
- Primary action: `Run local scan`
- Freshness label: `Observed 42 seconds ago`
- Finance pack label: `Finance guardrails active`

## Constraints

- Font: Fira Code + Fira Sans
- Style: modern dark operations console
- Mode: dark-first, accessible light theme later
- Do not use color as the only status signal
- Every chart must have a text summary or table equivalent
- Never expose credential values; display reference and scope only

## Negative prompt

- No ornamental glass panels
- No rainbow graph edges
- No unlabeled icon-only primary controls
- No auto-moving graph that prevents inspection
- No financial price ticker aesthetics
- No fake live data without an explicit fixture label

## Iteration order

1. Validate layout, reading order, and exact copy.
2. Validate information density at 1440 and 1024 pixels.
3. Validate mobile stacking and navigation.
4. Tune one variable at a time: graph density, accent intensity, card borders, then motion.

