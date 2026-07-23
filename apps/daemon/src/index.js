import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scanObservatory } from "./scanner.js";

const HOST = "127.0.0.1";
const DEFAULT_PORT = 4317;

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

  return http.createServer(async (request, response) => {
    const pathname = requestPath(request);

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
        const snapshot = await scanner({
          codexRoot: options.codexRoot,
          agentsRoot: options.agentsRoot,
        });
        json(response, 200, snapshot);
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
  const server = await startDaemon();
  const address = server.address();
  const port =
    address && typeof address === "object" ? address.port : configuredPort();
  console.log(`Agent Observatory daemon listening on ${HOST} port ${port}`);
}
