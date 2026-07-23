import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { createDaemon } from "../src/index.js";
import { scanObservatory } from "../src/scanner.js";
import { inferProgrammingTags, PROGRAMMING_TAGS } from "../src/tags.js";

const SECRET_SENTINELS = [
  "ULTRA_PRIVATE_SENTINEL",
  "TOKEN_VALUE_SENTINEL",
  "COMMAND_VALUE_SENTINEL",
  "ARG_VALUE_SENTINEL",
  "ENV_VALUE_SENTINEL",
  "https://credentials.invalid/private",
  "0123456789abcdef0123456789abcdef",
];

let fixtureRoot;
let codexRoot;
let agentsRoot;
let claudeRoot;

before(async () => {
  fixtureRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), "agent-observatory-daemon-"),
  );
  codexRoot = path.join(fixtureRoot, "codex-home");
  agentsRoot = path.join(fixtureRoot, "agents-home");
  claudeRoot = path.join(fixtureRoot, "claude-home");

  await fs.mkdir(path.join(codexRoot, "skills", "frontend-testing"), {
    recursive: true,
  });
  await fs.mkdir(path.join(agentsRoot, "skills", "frontend-testing"), {
    recursive: true,
  });
  await fs.mkdir(path.join(agentsRoot, "agents"), { recursive: true });

  await fs.writeFile(
    path.join(codexRoot, "skills", "frontend-testing", "SKILL.md"),
    `---
name: frontend-testing
description: ${SECRET_SENTINELS[0]}
---

Never expose ${SECRET_SENTINELS[1]}.
`,
  );
  await fs.writeFile(
    path.join(agentsRoot, "skills", "frontend-testing", "SKILL.md"),
    `Duplicate skill containing ${SECRET_SENTINELS[2]}.`,
  );
  await fs.writeFile(
    path.join(codexRoot, "config.toml"),
    `[mcp_servers.local-files]
command = "${SECRET_SENTINELS[2]}"
args = ["${SECRET_SENTINELS[3]}"]
env = { ACCESS_TOKEN = "${SECRET_SENTINELS[4]}" }
enabled = true

[mcp_servers.remote-data]
url = "${SECRET_SENTINELS[5]}"
headers = { Authorization = "${SECRET_SENTINELS[1]}" }

[plugins.safe-plugin]
enabled = true
token = "${SECRET_SENTINELS[1]}"

[plugins.safe-plugin.hooks.pre-tool]
command = "${SECRET_SENTINELS[2]}"

[hooks.after-run]
command = "${SECRET_SENTINELS[2]}"
`,
  );
  await fs.writeFile(
    path.join(agentsRoot, "settings.json"),
    JSON.stringify({
      mcpServers: {
        "json-server": {
          command: SECRET_SENTINELS[2],
          args: [SECRET_SENTINELS[3]],
          env: { API_KEY: SECRET_SENTINELS[4] },
        },
      },
      plugins: {
        "json-plugin": {
          enabled: false,
          credentials: SECRET_SENTINELS[0],
          hooks: {
            onStart: {
              command: SECRET_SENTINELS[2],
            },
          },
        },
      },
      hooks: {
        onFinish: {
          command: SECRET_SENTINELS[2],
        },
      },
      privateHash: SECRET_SENTINELS[6],
    }),
  );
  await fs.writeFile(
    path.join(agentsRoot, "agents", "reviewer.toml"),
    `[agents.reviewer]
enabled = true
instructions = "${SECRET_SENTINELS[0]}"
`,
  );
});

after(async () => {
  await fs.rm(fixtureRoot, { recursive: true, force: true });
});

describe("local observatory scanner", () => {
  it("discovers and deduplicates display-safe local assets", async () => {
    const snapshot = await scanObservatory({ codexRoot, agentsRoot, claudeRoot });
    const skills = snapshot.nodes.filter((node) => node.kind === "skill");
    const mcps = snapshot.nodes.filter((node) => node.kind === "mcp-server");

    assert.equal(snapshot.mode, "live");
    assert.equal(skills.length, 1);
    assert.equal(skills[0].metadata.locationCount, 2);
    assert.deepEqual(skills[0].tags, ["frontend", "testing"]);
    assert.equal(
      mcps.find((node) => node.label === "local-files")?.metadata.transport,
      "stdio",
    );
    assert.equal(
      mcps.find((node) => node.label === "remote-data")?.metadata.transport,
      "http",
    );
    assert.ok(
      snapshot.nodes.some(
        (node) => node.kind === "plugin" && node.label === "json-plugin",
      ),
    );
    assert.ok(snapshot.nodes.some((node) => node.kind === "hook"));
    assert.ok(snapshot.nodes.some((node) => node.kind === "agent"));
    assert.ok(
      snapshot.source.scannedPaths.every(
        (item) =>
          item.startsWith("codex/") || item.startsWith("agents/"),
      ),
    );
  });

  it("never includes config values, commands, URLs, env values, hashes, or credentials", async () => {
    const serialized = JSON.stringify(
      await scanObservatory({ codexRoot, agentsRoot, claudeRoot }),
    );

    for (const sentinel of SECRET_SENTINELS) {
      assert.equal(
        serialized.includes(sentinel),
        false,
        `snapshot leaked sentinel: ${sentinel}`,
      );
    }
    assert.equal(serialized.includes(fixtureRoot), false);
  });

  it("uses the complete deterministic programming tag vocabulary", () => {
    assert.deepEqual(PROGRAMMING_TAGS, [
      "frontend",
      "backend",
      "infrastructure",
      "devops",
      "cloud",
      "database",
      "testing",
      "security",
      "mobile",
      "data-ai",
      "api",
      "git",
      "tooling",
      "documentation",
      "design-system",
    ]);
    assert.deepEqual(
      inferProgrammingTags(
        "React backend terraform deploy AWS postgres Playwright auth Android LLM OpenAPI GitHub CLI docs Figma",
      ),
      PROGRAMMING_TAGS,
    );
  });
});

describe("local HTTP daemon", () => {
  it("serves health and snapshot routes on loopback", async () => {
    const server = createDaemon({ codexRoot, agentsRoot, claudeRoot });
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });

    try {
      const address = server.address();
      assert.ok(address && typeof address === "object");
      assert.equal(address.address, "127.0.0.1");

      const healthResponse = await fetch(
        `http://127.0.0.1:${address.port}/health`,
      );
      assert.equal(healthResponse.status, 200);
      assert.deepEqual(await healthResponse.json(), { status: "ok" });

      const snapshotResponse = await fetch(
        `http://127.0.0.1:${address.port}/api/snapshot`,
      );
      assert.equal(snapshotResponse.status, 200);
      const serialized = await snapshotResponse.text();
      for (const sentinel of SECRET_SENTINELS) {
        assert.equal(serialized.includes(sentinel), false);
      }
    } finally {
      await new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
});
