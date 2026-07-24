# Agent role explanations and safe actions

Date: 2026-07-25

## Goal

Make local agents and assets understandable before the user promotes or reuses them across Codex and Claude.

## Implemented

- Added hover and keyboard-focus explanations for agents, skills, plugins, hooks, and MCP servers.
- Read only allowlisted display metadata such as frontmatter `name` and `description`.
- Inferred Claude subagent roles from attribution metadata without reading conversation messages.
- Grouped repeated same-role executions into one definition with an execution count.
- Added a graph role inspector with description, observed skills, and repeated-run count.
- Added approval-gated promotion planning for shared Markdown definitions.
- Added Claude-to-Codex TOML planning and execution.
- Refused overwrites when the target already exists.
- Added hash-protected undo for newly created definitions.
- Parallelized display-metadata reads; a 1,366-node / 404-session local scan completes in about 11 seconds on the development machine.

## Verified

- Claude `Deep Research` was inferred for 326 observed runs.
- VoxFader graph collapsed 106 runs into one `Deep Research` node.
- The project-scoped Agents page showed one definition with a `106×` badge.
- Codex plan preview targeted `~/.codex/agents/deep-research.toml`.
- Desktop and 390 px mobile layouts had no horizontal overflow.
- No username or absolute home path appeared in browser output.
- Execute and undo behavior passed temporary-directory HTTP and filesystem tests.

## Safety boundary

The dashboard never uses prompt or message content for labels or descriptions. Real-home browser verification stops at the plan preview; write and undo behavior is tested against temporary roots.
