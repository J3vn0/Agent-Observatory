import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { scanEnvironments } from "../src/environment-scanner.js";

const SECRET = "secret-sentinel-must-never-leak";
let fixtureRoot;
let codexRoot;
let claudeRoot;

before(async () => {
  fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), "observatory-env-"));
  codexRoot = path.join(fixtureRoot, "codex-home");
  claudeRoot = path.join(fixtureRoot, "claude-home");
  const codexSessions = path.join(codexRoot, "sessions", "2026", "07", "23");
  const claudeProject = path.join(claudeRoot, "projects", "D--sample-project");
  const claudeSubagents = path.join(
    claudeProject,
    "claude-parent",
    "subagents",
    "workflows",
    "wf-safe",
  );
  await fs.mkdir(codexSessions, { recursive: true });
  await fs.mkdir(claudeSubagents, { recursive: true });
  await fs.mkdir(path.join(claudeRoot, "projects", "C--Users-example"), { recursive: true });

  await fs.writeFile(
    path.join(codexSessions, "primary.jsonl"),
    `${JSON.stringify({
      timestamp: "2026-07-23T01:00:00.000Z",
      type: "session_meta",
      payload: {
        session_id: "codex-parent",
        cwd: path.join(fixtureRoot, "sample-project"),
        source: "vscode",
        base_instructions: SECRET,
      },
    })}\n`,
  );
  await fs.writeFile(
    path.join(codexSessions, "child.jsonl"),
    `${JSON.stringify({
      timestamp: "2026-07-23T02:00:00.000Z",
      type: "session_meta",
      payload: {
        session_id: "codex-child",
        cwd: path.join(fixtureRoot, "sample-project"),
        source: {
          subagent: {
            thread_spawn: {
              parent_thread_id: "codex-parent",
              agent_nickname: "Verifier",
              agent_role: "reviewer",
              prompt: SECRET,
            },
          },
        },
      },
    })}\n`,
  );
  await fs.writeFile(
    path.join(claudeProject, "claude-parent.jsonl"),
    `${JSON.stringify({
      type: "user",
      sessionId: "claude-parent",
      cwd: path.join(fixtureRoot, "sample-project"),
      timestamp: "2026-07-23T03:00:00.000Z",
      message: SECRET,
    })}\n`,
  );
  await fs.writeFile(
    path.join(claudeSubagents, "agent-child.jsonl"),
    `${JSON.stringify({
      type: "user",
      sessionId: "claude-parent",
      agentId: "child",
      slug: "researcher",
      cwd: path.join(fixtureRoot, "sample-project"),
      timestamp: "2026-07-23T04:00:00.000Z",
      message: SECRET,
    })}\n`,
  );
  await fs.writeFile(
    path.join(claudeSubagents, "agent-child.meta.json"),
    JSON.stringify({
      agentType: "researcher",
      description: SECRET,
      toolUseId: SECRET,
    }),
  );
});

after(async () => {
  await fs.rm(fixtureRoot, { recursive: true, force: true });
});

describe("environment scanner", () => {
  it("maps Codex and Claude projects, sessions, and subagents", async () => {
    const result = await scanEnvironments({ codexRoot, claudeRoot });
    assert.deepEqual(
      result.environments.map((environment) => environment.id),
      ["codex", "claude"],
    );
    assert.equal(result.projects.length, 3);
    assert.equal(result.sessions.length, 4);
    assert.equal(
      result.sessions.filter((session) => session.kind === "subagent").length,
      2,
    );
    assert.ok(
      result.sessions
        .filter((session) => session.kind === "subagent")
        .every((session) => session.parentSessionId),
    );
    const claudeSubagent = result.sessions.find((session) => session.environment === "claude" && session.kind === "subagent");
    assert.equal(claudeSubagent.label, "Researcher");
    assert.equal(claudeSubagent.role, "researcher");
    assert.ok(claudeSubagent.localizedDescription.ko);
  });

  it("returns display-safe metadata only", async () => {
    const serialized = JSON.stringify(
      await scanEnvironments({ codexRoot, claudeRoot }),
    );
    assert.equal(serialized.includes(SECRET), false);
    assert.equal(serialized.includes(fixtureRoot), false);
    assert.equal(serialized.includes("message"), false);
    assert.equal(serialized.includes("prompt"), false);
    assert.equal(serialized.includes("localizedDescription"), true);
    assert.equal(serialized.includes("Users-example"), false);
  });
});
