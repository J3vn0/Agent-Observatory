# Dashboard design specification

This specification follows the design-first workflow: lock layout, hierarchy, and copy before changing visual variables.

## Goal

- Build a desktop-first web control plane for Agent Observatory.
- Serve developers, AI operators, and technical finance teams managing local agents, skills, and MCP servers.
- Make system health, disconnected integrations, overlap, and finance safety visible within ten seconds.

## Reference direction

The visual language is informed by the public ElevenLabs website as observed on 2026-07-23:

- generous white space and large, direct sans-serif headlines
- white and warm-gray surfaces with thin neutral borders
- black primary actions and restrained pill-shaped controls
- very limited use of colorful spherical imagery
- clear separation between marketing-level hierarchy and product-level detail

This project does not copy ElevenLabs branding, imagery, text, or page composition. The colorful orb is reinterpreted as Agent Observatory’s own graph-system motif.

## Format

- Primary canvas: desktop web at 1440×1000
- Secondary checks: 1280, 1024, 768, and 390 pixels
- Persistent global header and workspace sidebar on desktop
- Responsive adaptation below 780 pixels; mobile is supported but is not the primary composition
- Main content may expand to 1600 pixels

## Layout

- Global header: product identity, product-level navigation, scan action, profile
- Workspace sidebar: workspace switcher, observatory destinations, finance pack status
- Hero: system freshness, large statement, explanation, fixture label, primary action
- Metric strip: four metrics in one connected desktop row
- Main row: relationship graph at approximately 72% width and finance posture at 28%
- Lower row: wide integration table and review queue
- Hierarchy: system statement → posture → topology → evidence → actions

## Type system

- Primary typeface: Inter or a system sans-serif fallback
- Data and metadata: JetBrains Mono
- Hero heading: 42–64 pixels, medium weight, tight tracking
- Panel heading: 18–20 pixels
- Body: 14–17 pixels
- Metadata: no smaller than 10 pixels, with sufficient contrast
- Tabular figures for counts, percentages, and timestamps

## Color and material

- White and warm-gray surfaces
- Near-black typography and primary actions
- Neutral gray borders, without ornamental shadows
- One expressive accent family: coral, pink, and violet inside the product orb
- Semantic states remain green, amber, and red with text labels
- The colorful orb never replaces status text or evidence

## UI style

- Desktop SaaS operations console
- Flat surfaces, thin dividers, restrained rounding
- Large whitespace around the hero and connected metric strip
- Lucide SVG icons with one consistent stroke language
- Motion limited to 150–200 millisecond state transitions
- Reduced-motion mode removes nonessential transitions

## Initial copy

- Product: `Agent Observatory`
- Hero: `Your agent system, at a glance.`
- Support: `See every agent, skill, and MCP connection in one explainable control plane—before you install, remove, or trust it.`
- Primary action: `Run local scan`
- Freshness: `Local system · observed 42 seconds ago`
- Fixture label: `Demo fixture`
- Finance posture: `Protected by default`

## Constraints

- Font: Inter + JetBrains Mono
- Style: minimal editorial web console
- Mode: white/light
- Desktop web is the primary composition
- Do not use color as the only status signal
- Every chart must have a text summary or table equivalent
- Never expose credential values; display reference and scope only
- Never imply fixture data is live

## Negative prompt

- No dark default theme
- No mobile-app card proportions on the desktop canvas
- No ornamental glass panels
- No rainbow graph edges
- No unlabeled icon-only primary controls
- No auto-moving graph that prevents inspection
- No financial price-ticker aesthetics
- No ElevenLabs logo, product imagery, copy, or exact page layout

## Iteration order

1. Validate the 1440-pixel desktop hierarchy and reading order.
2. Validate graph/table density at 1280 and 1024 pixels.
3. Validate responsive stacking at 768 and 390 pixels.
4. Tune one variable at a time: spacing, typography, graph density, then accent intensity.

