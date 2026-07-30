# Deployment Strategy: Native Local First, Containers by Need

## Decision

Agent Observatory will run as a native local application for the MVP. The dashboard connects to a Node.js daemon bound to `127.0.0.1`, and the daemon reads approved Codex, Claude, Git worktree, skill, plugin, and MCP metadata directly from the host.

Docker is an optional deployment mode, not a local prerequisite.

## Why the local product stays native

The primary product value depends on observing the user's real development environment:

- local Codex and Claude configuration directories;
- project and global agents;
- Git repositories and worktrees;
- MCP stdio processes and local ports;
- filesystem change events;
- operating-system credentials and permission boundaries.

Putting the default daemon in a container would require broad host mounts, Windows path translation, extra credential forwarding, and special handling for stdio child processes. That adds setup cost while making discovery less reliable. A native daemon provides the clearest security and onboarding model: explicit scan roots, loopback-only networking, read-only discovery, and approval-gated mutations.

## Supported deployment modes

### 1. Local ADE mode — current default

- Native Node.js daemon on the user's machine
- Web dashboard on loopback
- SQLite or local files for persistence
- Direct access only to user-approved scan roots
- No cloud account, container runtime, or remote telemetry required

This mode covers the current agent, skill, plugin, MCP, worktree, session, similarity, and promotion-management features.

### 2. Isolated worker mode — optional later

Containers may be useful for bounded workloads that do not need broad desktop access:

- scheduled finance-news and public-data collectors;
- reproducible MCP compatibility probes;
- sandboxed evaluation of untrusted third-party integrations;
- CPU- or dependency-heavy embedding and similarity jobs.

These workers should receive narrow inputs and return normalized observations. They should not become the default local scanner, and host mounts should be read-only and explicitly selected.

### 3. Hosted team mode — future

A hosted or multi-user edition may containerize the dashboard, API, queues, and workers while keeping a small native collector on each observed machine. That collector sends redacted metadata to the team service under an explicit policy.

Likely hosted components:

- API and dashboard service;
- PostgreSQL;
- queue and scheduled workers;
- organization policy and audit log;
- authenticated remote collectors.

## Docker adoption gates

Add production Docker assets only when at least one of these needs is implemented:

1. a hosted multi-user deployment;
2. remote machine monitoring;
3. isolated third-party MCP execution;
4. scheduled finance collectors with conflicting native dependencies;
5. reproducible CI or end-to-end environments that cannot be achieved with the npm workspace alone.

Until then, a Dockerfile or Compose stack would be maintenance without product benefit.

## Finance boundary

Finance collectors can become isolated workers, but portfolio recommendations and trade execution are outside the current MVP. Every collected item must retain source, observation time, freshness, and transformation provenance. Automated actions remain approval-gated.

## Packaging direction

The next packaging milestone should be a native desktop launcher around the existing daemon and dashboard, using Tauri, Electron, or a small platform-specific launcher after the browser workflow stabilizes. Packaging must preserve the same typed daemon API so local, desktop, and future hosted modes share contracts.
