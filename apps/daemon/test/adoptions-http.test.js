import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createDaemon } from "../src/index.js";

let fixtureRoot;
let server;

const request = {
  agent: {
    id: "agent.review",
    projectId: "project-alpha",
    name: "Review Agent",
    description: "Reviews a selected local project.",
    role: "review",
    sourceEnvironment: "codex",
  },
  policy: {
    tokenBudget: { perRun: 2_000, daily: 8_000 },
    minScheduleIntervalMinutes: 60,
  },
  assets: [
    {
      kind: "skill",
      id: "focused-review",
      name: "Focused Review",
      description: "Reviews evidence on demand.",
      loadMode: "lazy",
      activation: { mode: "on-demand" },
      usageLimits: {
        contextTokens: 500,
        maxOutputTokens: 1_000,
        maxCallsPerHour: 2,
        maxCallsPerDay: 4,
      },
      permissions: ["read"],
    },
  ],
};

const jsonHeaders = {
  "Content-Type": "application/json",
  Origin: "http://127.0.0.1:4173",
};

beforeEach(async () => {
  fixtureRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), "observatory-adoptions-http-"),
  );
  server = createDaemon({
    adoptionRoot: fixtureRoot,
    codexRoot: path.join(fixtureRoot, "codex"),
    agentsRoot: path.join(fixtureRoot, "agents"),
    claudeRoot: path.join(fixtureRoot, "claude"),
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
});

afterEach(async () => {
  if (server?.listening) {
    await new Promise((resolve, reject) =>
      server.close((error) => error ? reject(error) : resolve()),
    );
  }
  await fs.rm(fixtureRoot, { recursive: true, force: true });
});

describe("capability adoption HTTP API", () => {
  it("plans, requires approval, lists a display-safe record, and undoes", async () => {
    const address = server.address();
    const base = "http://127.0.0.1:" + address.port;
    const plannedResponse = await fetch(base + "/api/adoptions/plan", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(request),
    });
    assert.equal(plannedResponse.status, 200);
    const planned = await plannedResponse.json();
    assert.equal(planned.exists, false);
    assert.equal(path.isAbsolute(planned.targetLabel), false);

    const denied = await fetch(base + "/api/adoptions/execute", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ planId: planned.planId, confirmation: "APPLY" }),
    });
    assert.equal(denied.status, 403);

    const executedResponse = await fetch(base + "/api/adoptions/execute", {
      method: "POST",
      headers: {
        ...jsonHeaders,
        "X-Agent-Observatory-Action": "approved",
      },
      body: JSON.stringify({ planId: planned.planId, confirmation: "APPLY" }),
    });
    assert.equal(executedResponse.status, 200);
    const executed = await executedResponse.json();

    const listedResponse = await fetch(base + "/api/adoptions");
    assert.equal(listedResponse.status, 200);
    const listed = await listedResponse.json();
    assert.equal(listed.records.length, 1);
    assert.equal(listed.records[0].projectedDailyTokens, 6_000);
    assert.equal(JSON.stringify(listed).includes(fixtureRoot), false);

    const undone = await fetch(base + "/api/adoptions/undo", {
      method: "POST",
      headers: {
        ...jsonHeaders,
        "X-Agent-Observatory-Action": "approved",
      },
      body: JSON.stringify({
        operationId: executed.operationId,
        undoToken: executed.undoToken,
      }),
    });
    assert.equal(undone.status, 200);
    assert.deepEqual((await undone.json()).status, "undone");
  });

  it("rejects non-loopback browser origins", async () => {
    const address = server.address();
    const response = await fetch(
      "http://127.0.0.1:" + address.port + "/api/adoptions/plan",
      {
        method: "POST",
        headers: { ...jsonHeaders, Origin: "https://example.com" },
        body: JSON.stringify(request),
      },
    );
    assert.equal(response.status, 403);
  });
});
