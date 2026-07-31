# AI environment compatibility

Last reviewed: 2026-08-01 · [한국어](./COMPATIBILITY.ko.md)

Agent Observatory is an observability and governance layer for local AI coding
environments. Compatibility is based on inspectable configuration and session
formats, not on the model provider. A client powered by GPT, Claude, Gemini, or
another model can become observable when a dedicated adapter can safely map its
local metadata into the normalized snapshot.

## Status legend

- **Native adapter**: projects, sessions, and subagents have a dedicated parser.
- **Shared manifest**: reusable definitions are indexed, but no runtime history is implied.
- **Adapter candidate**: the upstream client exposes useful structured metadata, but Agent Observatory does not scan it today.

## Current support

| Environment | Discovery root or source | Projects / sessions / subagents | Skills / plugins / hooks / MCP | Safe write action | Status |
|---|---|---:|---:|---|---|
| OpenAI Codex | `~/.codex` | Yes | Indexed when present in approved local files | Preview, approve, and create `~/.codex/agents/<name>.toml`; undo only if the generated file is unchanged | Native |
| Anthropic Claude Code | `~/.claude` | Yes | Indexed when present in approved local files | Normalize an observed profile for shared Markdown or Codex TOML promotion | Native |
| Shared agent definitions | `~/.agents` | Definitions only | Indexed when present | Preview, approve, and create `~/.agents/agents/<name>.md`; undo only if unchanged | Shared manifest |

The daemon reads allowlisted metadata and redacts credential-like fields. It
does not read prompt bodies for display, invoke MCP tools during inventory, or
silently overwrite an existing promotion target.

## Adapter candidates

| Environment | Structured capability available upstream | What a future adapter can add | Current boundary |
|---|---|---|---|
| [Cursor](https://docs.cursor.com/context/model-context-protocol) | MCP servers using stdio, SSE, or Streamable HTTP | MCP inventory, project rules, and project-scoped capability relationships | No Cursor project, rule, or session scanner |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli/blob/main/docs/tools/mcp-server.md) | User/project `settings.json`, MCP server discovery, status, tools, prompts, and resources | MCP configuration and health inventory plus project/session attribution | `~/.gemini` and project `.gemini` are not scan roots |
| [GitHub Copilot](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/about-custom-agents) | Markdown custom-agent profiles with tools and optional MCP servers; CLI also supports skills | Repository agent, skill, and MCP inventory with profile precedence | No `.github/agents` or Copilot CLI adapter |
| [Windsurf](https://docs.windsurf.com/windsurf/cascade/mcp) | Cascade MCP configuration and stdio, HTTP, and SSE transports | MCP inventory and environment-level connection state | No Windsurf configuration or session adapter |
| [OpenCode](https://opencode.ai/docs/agents) | JSON/Markdown primary agents and subagents with permissions; [MCP configuration](https://opencode.ai/v2/docs/mcp-servers) | Agent hierarchy, permissions, cost limits, and MCP relationships | No OpenCode configuration or session adapter |
| [Cline](https://docs.cline.bot/cli/cli-reference) | Global/project agents, skills, hooks, plugins, MCP configuration, and session storage | A broad adapter covering capabilities, schedules, sessions, and project/global overlap | No Cline configuration or SQLite session adapter |

These rows are **integration candidates**, not claims of current automatic
support. Their native MCP support does not make Agent Observatory a plug-and-play
MCP server; it only provides a stable protocol surface that a future adapter or
optional control-plane server can use.

## What every dedicated adapter should provide

1. Detect global and project configuration without reading secrets.
2. Normalize projects, sessions, parent/child agents, roles, and capabilities.
3. Attribute skills, plugins, hooks, and MCP servers only when evidence exists.
4. Preserve source paths and timestamps for explainability.
5. Separate observed use from installed availability.
6. Preview format translation before any write and reject existing targets.
7. Keep tool execution and model invocation outside read-only discovery.

## Proposed adapter order

1. **GitHub Copilot** — repository agent profiles are versionable and align well with the shared Markdown model.
2. **Gemini CLI** — explicit user/project settings and MCP status provide a clear discovery boundary.
3. **Cursor** — valuable project-rule and MCP coverage, followed by session attribution when a stable source is available.
4. **OpenCode** — rich agent, permission, and step-limit metadata supports governance and cost views.
5. **Cline** — broad configuration and session coverage, with extra care required for SQLite history and schedules.
6. **Windsurf** — start with MCP configuration inventory, then expand only when stable session metadata is documented.

## Model and client boundary

- **Models** such as GPT, Claude, and Gemini generate responses.
- **Clients/environments** such as Codex, Claude Code, Cursor, Gemini CLI, and OpenCode store the metadata Agent Observatory can inspect.
- ChatGPT, Claude.ai, and Gemini web conversations are not local coding-environment adapters and are outside the current discovery boundary.

This distinction keeps the compatibility table testable: a native status requires
a parser, fixtures, and tests in this repository—not merely upstream MCP support.
