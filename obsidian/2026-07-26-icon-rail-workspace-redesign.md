---
tags:
  - project/agent-observatory
  - design/navigation
  - design/dashboard
  - workflow/worktree
date: 2026-07-26
---

# Icon rail workspace redesign

## Goal

Move the horizontal page navigation into a Notion-like left icon rail and give every page a wider, task-focused canvas.

## Reference interpretation

- The Twenty workflow reference informed the graph page: a large dotted canvas, compact nodes, and an inspector-like side region.
- The Twenty dashboard reference informed the overview and Finance pages: dense metric bands, bordered analysis cards, and restrained charts.
- The StackAI project reference informed the projects page: icon rail, contextual scope sidebar, search controls, and a project-card library.
- Only the spatial hierarchy and information density were reused. Product-specific branding and visual assets were not copied.

## Decisions

- Keep a persistent 58 px icon rail with localized tooltips and `aria-label` text.
- Keep environment and project scope in a collapsible 264 px contextual sidebar.
- Use a 58 px workspace header for breadcrumbs, connection state, refresh, and language controls.
- Preserve the existing hash routes and page behavior.
- Collapse the contextual sidebar by default below 900 px while keeping the icon rail on the left.
- Use a warm white canvas, thin neutral borders, and 44 px minimum navigation targets.

## Implementation

- Branch: `agent/icon-rail-redesign`
- Worktree: `work/agent-observatory-worktrees/icon-rail-redesign`
- Updated `apps/dashboard/src/App.tsx` with the navigation rail and workspace shell.
- Added `apps/dashboard/src/ShellRedesign.css` as a focused shell and page-density layer.
- Imported the layer after the existing dashboard stylesheet so legacy page behavior remains intact.

## Skills and agents used

- `frontend-design`
- `clean-minimal-beige-light-mode`
- `frontend-visual-verification`
- One structure/accessibility review subagent
- One UI composition review subagent

## Verification

- TypeScript typecheck passed.
- Vitest: 5 tests passed.
- Production Vite build passed.
- Chrome verification at desktop and narrow viewport sizes found no horizontal overflow.
- Icon navigation targets measure 44 × 44 px.
- Context sidebar open/close behavior and labels were verified.
- No console errors or warnings were present.
