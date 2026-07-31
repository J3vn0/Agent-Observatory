import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "..");
const dashboardRoot = path.join(root, "apps", "dashboard");
const outputRoot = path.join(root, "docs", "assets", "readme");
const snapshot = JSON.parse(
  await fs.readFile(path.join(outputRoot, "demo-snapshot.json"), "utf8"),
);

const apiPort = 4318;
const dashboardPort = 4192;
const dashboardOrigin = `http://127.0.0.1:${dashboardPort}`;

const api = http.createServer((request, response) => {
  response.setHeader("Access-Control-Allow-Origin", dashboardOrigin);
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  if (request.url === "/health") {
    response.end(JSON.stringify({ status: "ok" }));
    return;
  }
  if (request.url === "/api/snapshot") {
    response.end(JSON.stringify(snapshot));
    return;
  }
  response.statusCode = 404;
  response.end(JSON.stringify({ error: "Not found" }));
});

const waitFor = async (url, timeoutMs = 30_000) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The dev server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${url}`);
};

const run = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? root,
      env: options.env ?? process.env,
      stdio: options.stdio ?? "inherit",
      windowsHide: true,
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });

const chromePath =
  process.env.CHROME_PATH ??
  (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : "google-chrome");

const viteBin = path.join(
  root,
  "node_modules",
  "vite",
  "bin",
  "vite.js",
);

const pages = [
  ["overview", "overview"],
  ["registry", "registry"],
  ["graph", "graph"],
  ["integrations", "integrations"],
  ["finance", "finance"],
];

await fs.mkdir(outputRoot, { recursive: true });
await new Promise((resolve, reject) => {
  api.once("error", reject);
  api.listen(apiPort, "127.0.0.1", resolve);
});

const vite = spawn(
  process.execPath,
  [
    viteBin,
    "--host",
    "127.0.0.1",
    "--port",
    String(dashboardPort),
    "--strictPort",
  ],
  {
    cwd: dashboardRoot,
    env: {
      ...process.env,
      VITE_OBSERVATORY_API: `http://127.0.0.1:${apiPort}`,
    },
    stdio: "inherit",
    windowsHide: true,
  },
);

try {
  await waitFor(`${dashboardOrigin}/`);
  for (const [name, route] of pages) {
    const output = path.join(
      outputRoot,
      `agent-observatory-${name}.png`,
    );
    const profile = path.join(
      process.env.TEMP ?? process.env.TMP ?? outputRoot,
      `agent-observatory-readme-${name}`,
    );
    await run(
      chromePath,
      [
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        "--no-first-run",
        "--no-default-browser-check",
        "--run-all-compositor-stages-before-draw",
        "--virtual-time-budget=8000",
        "--window-size=1440,1000",
        `--user-data-dir=${profile}`,
        `--screenshot=${output}`,
        `${dashboardOrigin}/#/${route}`,
      ],
      { cwd: root },
    );
    const stats = await fs.stat(output);
    console.log(`Captured ${name}: ${Math.round(stats.size / 1024)} KiB`);
  }
} finally {
  vite.kill();
  await new Promise((resolve) => api.close(resolve));
}
