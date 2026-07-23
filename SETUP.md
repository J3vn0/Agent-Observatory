# Agent Observatory setup

Agent Observatory reads local Codex and Claude metadata through a loopback-only
daemon. Local discovery does not require an API key.

## 1. Install

Requirements:

- Node.js 20 or later
- npm 10 or later
- Codex data in `~/.codex`
- Claude data in `~/.claude`
- Optional shared skills in `~/.agents`

```bash
npm install
```

Copy `.env.example` to `.env` only when a local folder uses a non-default path.

## 2. Local path overrides

Defaults:

```text
AGENT_OBSERVATORY_CODEX_HOME=~/.codex
AGENT_OBSERVATORY_CLAUDE_HOME=~/.claude
AGENT_OBSERVATORY_AGENTS_HOME=~/.agents
AGENT_OBSERVATORY_PORT=4317
```

The host is fixed to `127.0.0.1`. Remote access and remote authentication are
outside this local MVP.

## 3. Run

Use two terminals:

```bash
npm run dev:daemon
```

```bash
npm run dev:dashboard
```

Open `http://127.0.0.1:4173`.

The header shows `Live` when the daemon is connected. If the daemon is
unavailable, the dashboard clearly labels safe sample data as a fallback.

## 4. Privacy boundary

The environment adapter reads only display-safe metadata:

- environment identifier
- sanitized project label
- opaque session identifier
- parent session relationship
- agent nickname or role when explicitly stored as metadata
- observation timestamp
- installed asset names and enabled state

It does not return:

- conversation messages or prompts
- agent descriptions or instructions
- commands, arguments, tool inputs, or tool outputs
- URLs, headers, tokens, credentials, environment values, or trust hashes
- usernames or absolute home paths

The daemon test suite includes secret sentinel and temporary path assertions.

## 5. Optional future API keys

These are not required for local observation:

```text
GITHUB_TOKEN=
OPENAI_API_KEY=
SEC_USER_AGENT=
```

- `GITHUB_TOKEN`: future remote skill catalog synchronization
- `OPENAI_API_KEY`: optional semantic similarity workflows
- `SEC_USER_AGENT`: future finance expansion for SEC requests

Do not commit `.env`.

## 6. Verify

```bash
npm run typecheck
npm test
npm run build
```

Health endpoint:

```text
http://127.0.0.1:4317/health
```

Snapshot endpoint:

```text
http://127.0.0.1:4317/api/snapshot
```
