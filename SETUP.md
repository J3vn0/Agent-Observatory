# Agent Observatory setup

The MVP reads local Codex configuration through a loopback-only daemon. Local
discovery does not require an API key.

## 1. Install

Requirements:

- Node.js 20 or later
- npm 10 or later
- Codex data in the default `~/.codex` and `~/.agents` folders, or explicit
  path overrides

```bash
npm install
```

Copy `.env.example` to `.env` only when you need to override a default.

## 2. Local paths

The daemon uses these defaults:

```text
AGENT_OBSERVATORY_CODEX_HOME=~/.codex
AGENT_OBSERVATORY_AGENTS_HOME=~/.agents
AGENT_OBSERVATORY_PORT=4317
```

The host is fixed to `127.0.0.1`. The MVP is designed for local observation and
does not include remote authentication.

## 3. Run

Use two terminals:

```bash
npm run dev:daemon
```

```bash
npm run dev:dashboard
```

Open `http://127.0.0.1:4173`.

The dashboard shows `Live local scan` when the daemon is connected. If the
daemon is unavailable it shows `Demo fallback` and never presents fixture data
as a live observation.

## 4. Optional API keys

Fill these only when the corresponding future integration is implemented:

```text
GITHUB_TOKEN=
OPENAI_API_KEY=
SEC_USER_AGENT=
```

- `GITHUB_TOKEN`: repository metadata and remote skill catalog synchronization
- `OPENAI_API_KEY`: optional semantic similarity or translation workflows
- `SEC_USER_AGENT`: finance expansion for SEC requests

Do not commit `.env`. The local scanner reports configuration names and safe
metadata only. It must not return values for environment variables, commands,
arguments, URLs, access tokens, API keys, or hook trust hashes.

## 5. Verify

```bash
npm run typecheck
npm test
npm run build
```

Daemon-only checks:

```bash
npm run test --workspace @agent-observatory/daemon
```

Health endpoint:

```text
http://127.0.0.1:4317/health
```

Snapshot endpoint:

```text
http://127.0.0.1:4317/api/snapshot
```
