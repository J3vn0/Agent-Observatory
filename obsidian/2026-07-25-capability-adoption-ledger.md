# Capability adoption ledger

Date: 2026-07-25
Branch: `agent/capability-adoption`
Worktree: `work/agent-observatory-worktrees/capability-adoption`

## Product decision

Agent Observatory now treats capability management as a separate control-plane page rather than mixing it into the session-history table.

The page distinguishes:

- **Installed**: present in the local environment.
- **Adopted**: connected to one subagent by an explicit local manifest.
- **Active**: allowed to load or run under a policy.
- **Observed**: supported by attribution metadata or an explicit runtime event.
- **Available**: installed but not connected to the selected subagent.

Conversation and prompt text are never used as evidence of capability usage.

## Token-safety contract

- Default activation is on demand.
- Skill/plugin/MCP instructions are lazy-loaded.
- Hook activation defaults to once per session.
- Scheduled execution requires an explicit interval and server validation.
- Per-call, hourly, daily-call, and daily-token ceilings are written into the adoption manifest.
- Duplicate selections are suppressed.
- Existing manifests are never overwritten.
- Execution requires an approval header and typed confirmation.
- Undo is allowed only while the created manifest hash is unchanged.

The displayed token figures are local safety ceilings, not provider billing estimates.

## Implementation trace

| Contributor | Type | Scope |
|---|---|---|
| `frontend-design` | Skill | Capability Ledger layout, keyboard states, cost envelope |
| `careful` | Skill | Approval boundaries and reversible filesystem actions |
| Singer | Subagent | Core adoption, similarity, and token-budget policy |
| Hilbert | Subagent | Daemon plan, execute, list, and undo layer |
| Epicurus | Subagent | Read-only UX and accessibility audit |

## Visual direction

## Verification

- Core policy tests: 33 passed, including 16 capability-adoption cases.
- Dashboard tests: 9 passed, including 4 adoption-client cases.
- Daemon manager tests: 11 passed.
- Daemon HTTP adoption tests: plan, approval denial, execute, safe list, undo, and origin rejection passed.
- Desktop Chrome viewport: 1440 × 1000, no horizontal overflow.
- Mobile Chrome viewport: 390 × 844, no horizontal overflow and 44 px adoption button.
- Console errors: 0.
- HTTP 4xx/5xx responses during UI verification: 0.
- Private home paths shown in UI: 0.
- Scheduled 30-minute activation: blocked by the 60-minute minimum.

Browser verification stopped at plan preview; it did not execute an adoption against the real user home.

The existing white ElevenLabs-inspired interface remains intact. The signature element is a dark **cost envelope** receipt that shows the hard daily ceiling before any capability is adopted.
