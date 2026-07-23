---
project: Agent Observatory
milestone: programming-registry-mvp
date: 2026-07-23
status: complete
tags:
  - agent-observatory
  - codex
  - mcp
  - skills
  - programming
---

# Programming registry MVP

## Goal

Observe the user's real local Codex assets and make skills, agents, plugins,
hooks, and MCP configuration easy to inspect, search, and compare in Korean and
English.

## Decisions

- Use a desktop web dashboard with a loopback-only Node daemon.
- Bind the daemon to `127.0.0.1`; remote access and authentication are outside
  this MVP.
- Never expose config values, commands, arguments, URLs, environment contents,
  tokens, API keys, or hook trust hashes.
- Show a visibly distinct fixture fallback when the daemon cannot be reached.
- Start taxonomy with programming: frontend, backend, infrastructure, DevOps,
  cloud, database, testing, security, mobile, data/AI, API, Git, tooling,
  documentation, and design systems.
- Keep finance as the first extension after the programming registry.
- Preserve work by role in Git worktrees and integrate reviewed commits into
  `main`.

## Verified local observation

The 2026-07-23 live scan found:

- 873 deduplicated skills
- 146 agent records
- 43 plugins
- 7 hooks
- 24 MCP servers
- 283 programming-related assets
- 1,095 graph relationships
- 2,853 sanitized scanned paths

No configuration values were printed or written to project memory.

## MVP completion checks

- [x] Local scanner returns real asset counts
- [x] Secret sentinel test passes
- [x] Search works across names, summaries, and tags
- [x] Programming kind/tag filters work
- [x] Korean/English toggle updates interface and asset descriptions
- [x] Live/fallback state is explicit
- [x] Desktop and mobile browser screenshots reviewed
- [x] Console has no errors, warnings, or accessibility issues
- [x] Typecheck, 13 tests, and production build pass
- [x] `SETUP.md` documents paths, keys, and security boundary
- [ ] Main branch pushed to GitHub

## Worktree roles

- `agent/scanner-mvp`: scanner daemon and redaction tests
- `agent/taxonomy-mvp`: shared programming taxonomy
- `agent/i18n-mvp`: dashboard localization dictionary
- `main`: dashboard integration, setup, browser verification, release

## Next milestone

Add explainable similarity scoring at registry scale, then introduce the finance
domain pack with provenance, freshness, and read-only policy checks.
