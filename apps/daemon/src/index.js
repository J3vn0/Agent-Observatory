import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scanObservatory } from "./scanner.js";
import { loadLocalEnv } from "./env.js";
import { ActionError, createActionManager, isAllowedLocalOrigin, readJsonBody } from "./actions.js";
import {
  ADOPTION_APPROVAL_HEADER,
  AdoptionError,
  createAdoptionManager,
} from "./adoptions.js";

const HOST = "127.0.0.1";
const DEFAULT_PORT = 4317;
const SNAPSHOT_CACHE_MS = 2_000;

const json = (response, statusCode, body) => {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(body));
};

const requestPath = (request) => {
  try {
    return new URL(request.url || "/", "http://127.0.0.1").pathname;
  } catch {
    return "/";
  }
};

export function createDaemon(options = {}) {
  const scanner = options.scanner || scanObservatory;
  let cachedSnapshot = null;
  let cachedAt = 0;
  let pendingSnapshot = null;
  const actionManager = createActionManager({
    codexRoot: options.codexRoot,
    agentsRoot: options.agentsRoot,
  });
  const adoptionManager = createAdoptionManager({
    projectRoot: options.adoptionRoot || os.homedir(),
  });

  const observe = async () => {
    const now = Date.now();
    if (cachedSnapshot && now - cachedAt < SNAPSHOT_CACHE_MS) {
      return cachedSnapshot;
    }
    if (!pendingSnapshot) {
      pendingSnapshot = scanner({
        codexRoot: options.codexRoot,
        agentsRoot: options.agentsRoot,
        claudeRoot: options.claudeRoot,
      })
        .then((snapshot) => {
          cachedSnapshot = snapshot;
          cachedAt = Date.now();
          return snapshot;
        })
        .finally(() => {
          pendingSnapshot = null;
        });
    }
    return pendingSnapshot;
  };

  return http.createServer(async (request, response) => {
    const pathname = requestPath(request);

    if (pathname === "/api/adoptions" && request.method === "GET") {
      try {
        json(response, 200, { records: await adoptionManager.list() });
      } catch {
        json(response, 500, {
          error: "Capability adoptions are unavailable",
          code: "adoption_list_failed",
        });
      }
      return;
    }

    if (pathname.startsWith("/api/adoptions/")) {
      if (request.method !== "POST") {
        json(response, 405, { error: "Method not allowed" });
        return;
      }
      if (!isAllowedLocalOrigin(request.headers.origin)) {
        json(response, 403, { error: "Local origin required", code: "origin_forbidden" });
        return;
      }
      try {
        const body = await readJsonBody(request);
        let result;
        if (pathname === "/api/adoptions/plan") {
          result = await adoptionManager.plan(body);
        } else {
          const approval = request.headers["x-agent-observatory-action"];
          if (pathname === "/api/adoptions/execute") {
            result = await adoptionManager.execute(
              body.planId,
              body.confirmation,
              approval,
            );
          } else if (pathname === "/api/adoptions/undo") {
            result = await adoptionManager.undo(
              body.operationId,
              body.undoToken,
              approval,
            );
          } else {
            throw new AdoptionError(404, "Adoption route not found.", "not_found");
          }
          cachedSnapshot = null;
          cachedAt = 0;
        }
        json(response, 200, result);
      } catch (error) {
        if (error instanceof AdoptionError) {
          json(response, error.statusCode, { error: error.message, code: error.code });
        } else {
          json(response, 500, {
            error: "Local capability adoption failed",
            code: "adoption_failed",
          });
        }
      }
      return;
    }

    if (pathname.startsWith("/api/actions/")) {
      if (request.method !== "POST") {
        json(response, 405, { error: "Method not allowed" });
        return;
      }
      if (!isAllowedLocalOrigin(request.headers.origin)) {
        json(response, 403, { error: "Local origin required", code: "origin_forbidden" });
        return;
      }
      try {
        const body = await readJsonBody(request);
        let result;
        if (pathname === "/api/actions/plan") {
          result = await actionManager.plan(body.action, body.profile);
        } else {
          if (request.headers["x-agent-observatory-action"] !== ADOPTION_APPROVAL_HEADER) {
            throw new ActionError(403, "Explicit action approval header is required.", "approval_required");
          }
          if (pathname === "/api/actions/execute") {
            result = await actionManager.execute(body.planId, body.confirmation);
          } else if (pathname === "/api/actions/undo") {
            result = await actionManager.undo(body.operationId, body.undoToken);
          } else {
            throw new ActionError(404, "Action route not found.", "not_found");
          }
          cachedSnapshot = null;
          cachedAt = 0;
        }
        json(response, 200, result);
      } catch (error) {
        if (error instanceof ActionError) {
          json(response, error.statusCode, { error: error.message, code: error.code });
        } else {
          json(response, 500, { error: "Local action failed", code: "action_failed" });
        }
      }
      return;
    }

    if (request.method !== "GET") {
      json(response, 405, { error: "Method not allowed" });
      return;
    }
    if (pathname === "/health") {
      json(response, 200, { status: "ok" });
      return;
    }
    if (pathname === "/api/snapshot") {
      try {
        json(response, 200, await observe());
      } catch {
        json(response, 500, { error: "Snapshot unavailable" });
      }
      return;
    }
    json(response, 404, { error: "Not found" });
  });
}

const configuredPort = () => {
  const parsed = Number.parseInt(
    process.env.AGENT_OBSERVATORY_PORT || "",
    10,
  );
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 65_535
    ? parsed
    : DEFAULT_PORT;
};

export function startDaemon(options = {}) {
  const server = createDaemon(options);
  const port = options.port ?? configuredPort();
  const host = options.host ?? HOST;

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve(server);
    });
  });
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  await loadLocalEnv();
  const server = await startDaemon();
  const address = server.address();
  const port =
    address && typeof address === "object" ? address.port : configuredPort();
  console.log(`Agent Observatory daemon listening on ${HOST} port ${port}`);
}
