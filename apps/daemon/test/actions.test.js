import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { ActionError, createActionManager, isAllowedLocalOrigin } from "../src/actions.js";
import { createDaemon } from "../src/index.js";

let fixtureRoot;
let codexRoot;
let agentsRoot;

const profile = {
  name: "Deep Research",
  description: "Investigates multiple sources and synthesizes evidence.",
  role: "deep-research",
  skills: ["deep-research"],
  sourceEnvironment: "claude",
  sourceProjectIds: ["project-alpha", "project-beta"],
};

beforeEach(async () => {
  fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), "observatory-actions-"));
  codexRoot = path.join(fixtureRoot, "codex");
  agentsRoot = path.join(fixtureRoot, "agents");
});

afterEach(async () => {
  await fs.rm(fixtureRoot, { recursive: true, force: true });
});

describe("safe local action manager", () => {
  it("plans, creates, and undoes a Codex agent without overwriting", async () => {
    const manager = createActionManager({ codexRoot, agentsRoot });
    const plan = await manager.plan("apply-codex", profile);
    assert.equal(plan.targetLabel, "~/.codex/agents/deep-research.toml");
    assert.equal(plan.exists, false);
    const executed = await manager.execute(plan.planId, "APPLY");
    const target = path.join(codexRoot, "agents", "deep-research.toml");
    const content = await fs.readFile(target, "utf8");
    assert.match(content, /name = "Deep Research"/);
    assert.match(content, /developer_instructions/);
    const conflictPlan = await manager.plan("apply-codex", profile);
    assert.equal(conflictPlan.exists, true);
    await assert.rejects(
      () => manager.execute(conflictPlan.planId, "APPLY"),
      (error) => error instanceof ActionError && error.statusCode === 409 && error.code === "target_exists",
    );
    const undone = await manager.undo(executed.operationId, executed.undoToken);
    assert.equal(undone.status, "undone");
    await assert.rejects(() => fs.access(target));
  });

  it("refuses undo after the created file changes", async () => {
    const manager = createActionManager({ codexRoot, agentsRoot });
    const plan = await manager.plan("promote-shared", profile);
    const executed = await manager.execute(plan.planId, "APPLY");
    const target = path.join(agentsRoot, "agents", "deep-research.md");
    await fs.appendFile(target, "user edit\n");
    await assert.rejects(
      () => manager.undo(executed.operationId, executed.undoToken),
      (error) => error instanceof ActionError && error.statusCode === 409 && error.code === "target_changed",
    );
    assert.equal(await fs.readFile(target, "utf8").then((value) => value.includes("user edit")), true);
  });

  it("accepts only loopback browser origins", () => {
    assert.equal(isAllowedLocalOrigin("http://127.0.0.1:4173"), true);
    assert.equal(isAllowedLocalOrigin("http://localhost:4173"), true);
    assert.equal(isAllowedLocalOrigin("https://example.com"), false);
  });
});

describe("local action HTTP API", () => {
  it("requires the approval header before executing a plan", async () => {
    const server = createDaemon({ codexRoot, agentsRoot, claudeRoot: path.join(fixtureRoot, "claude") });
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    try {
      const address = server.address();
      const base = "http://127.0.0.1:" + address.port;
      const planned = await fetch(base + "/api/actions/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "http://127.0.0.1:4173" },
        body: JSON.stringify({ action: "apply-codex", profile }),
      });
      assert.equal(planned.status, 200);
      const plan = await planned.json();
      const denied = await fetch(base + "/api/actions/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "http://127.0.0.1:4173" },
        body: JSON.stringify({ planId: plan.planId, confirmation: "APPLY" }),
      });
      assert.equal(denied.status, 403);
      const executed = await fetch(base + "/api/actions/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "http://127.0.0.1:4173", "X-Agent-Observatory-Action": "approved" },
        body: JSON.stringify({ planId: plan.planId, confirmation: "APPLY" }),
      });
      assert.equal(executed.status, 200);
    } finally {
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });
});
