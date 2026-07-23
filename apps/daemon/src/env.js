import fs from "node:fs/promises";
import path from "node:path";

const ENV_KEY = /^[A-Za-z_][A-Za-z0-9_]*$/;

export async function loadLocalEnv() {
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "..", "..", ".env"),
  ];

  for (const candidate of candidates) {
    let contents;
    try {
      contents = await fs.readFile(candidate, "utf8");
    } catch {
      continue;
    }

    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator < 1) continue;
      const key = trimmed.slice(0, separator).trim();
      if (!ENV_KEY.test(key) || process.env[key] !== undefined) continue;
      const raw = trimmed.slice(separator + 1).trim();
      process.env[key] = raw.replace(/^(['"])(.*)\1$/, "$2");
    }
    return candidate;
  }

  return null;
}
