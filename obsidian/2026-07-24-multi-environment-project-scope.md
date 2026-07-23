---
project: Agent Observatory
milestone: multi-environment-project-scope
date: 2026-07-24
status: complete
tags:
  - agent-observatory
  - codex
  - claude
  - projects
  - subagents
---

# Multi-environment and project scope

## Goal

Support Codex and Claude local layouts, let the user switch between global,
environment, and project scopes, and give each information domain a large
dedicated page.

## Privacy decision

Only session and project metadata is read. Conversation messages, prompts,
descriptions, tool values, commands, URLs, credentials, usernames, and full
home paths are excluded from the response contract.

## Implemented model

```text
Environment
  +-- Project
      +-- Primary session
          +-- Subagent session
```

- Codex parent links use `session_meta` source metadata.
- Claude parent links use the project session and nested `subagents` folder
  structure.
- Project labels are sanitized basenames with opaque suffixes when duplicates
  exist.
- Skills and integrations remain environment-wide assets; project scope is
  applied to project and session history.

## Pages

- Overview
- Projects
- Agents
- Skills
- Integrations
- Graph

## Verification checklist

- [x] Codex and Claude installations detected
- [x] Global and environment scopes implemented
- [x] Project selector implemented
- [x] Project-specific subagents displayed
- [x] Dedicated page tabs implemented
- [x] Secret and absolute-path tests added
- [x] Desktop and mobile visual verification complete
- [x] Full typecheck, tests, and production build pass
- [x] GitHub main updated
