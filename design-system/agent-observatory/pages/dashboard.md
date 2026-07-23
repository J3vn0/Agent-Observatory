# Dashboard page overrides

> **Project:** Agent Observatory  
> **Page:** Desktop overview dashboard  
> **Updated:** 2026-07-23

These rules override `design-system/agent-observatory/MASTER.md` for the dashboard.

## Layout

- Primary viewport: 1440×1000 desktop web
- Maximum main-content width: 1600px
- Global header: 72px
- Workspace sidebar: 244px
- Main canvas: remaining width with 46px desktop gutters
- Hero followed by one connected four-column metric strip
- Topology and finance posture use an approximately 72/28 split
- Integration table and review queue use an approximately 69/31 split
- Below 1280px, content panels may stack while the desktop sidebar remains
- Below 780px, switch to the responsive mobile adaptation

## Typography

- Headings: Inter, system sans-serif fallback
- Body: Inter, system sans-serif fallback
- Metadata and graph labels: JetBrains Mono
- Hero: 42–64px, weight 500, tight tracking
- Body: 14–17px
- Do not use Calistoga on the dashboard

## Color

- Page background: `#F7F7F5`
- Surface: `#FFFFFF`
- Primary foreground/action: `#111111`
- Border: `#DFDFDA`
- Accent: `#E84F93`
- Semantic health: green, amber, red with text labels
- Do not use dark mode by default

## Components

- Primary action: black pill with white label
- Secondary action: white pill with neutral border
- Panels: white, thin neutral border, 22px maximum radius, no ornamental shadow
- Metrics: one connected strip with divider lines, not separate mobile-style cards
- Graph: warm-white grid canvas with neutral edges and a pink dotted overlap edge
- Product motif: one coral/pink/violet orb family, used sparingly

## Interaction

- Hover and focus transitions: 150–200ms
- No layout-shifting hover transforms
- Visible keyboard focus ring
- Respect `prefers-reduced-motion`
- Run-scan loading state is required when the action becomes connected to the daemon

## Prohibited

- Dark default theme
- 800px centered single-column desktop layout
- Mobile-app card proportions at 1440px
- Pink-filled primary buttons
- Decorative shadows or glassmorphism
- ElevenLabs logo, product imagery, copy, or exact page composition

