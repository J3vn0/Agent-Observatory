import { useCallback, useEffect, useState } from "react";
import type { ObservatorySnapshot } from "@agent-observatory/core";
import { fixture } from "./data/fixture";

export type SnapshotConnection = "loading" | "live" | "fallback";

const configuredBase = (import.meta.env.VITE_OBSERVATORY_API ?? "").replace(
  /\/$/,
  "",
);

export function useSnapshot() {
  const [snapshot, setSnapshot] = useState<ObservatorySnapshot>(fixture);
  const [connection, setConnection] =
    useState<SnapshotConnection>("loading");
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setConnection("loading");
      setError(null);

      try {
        const response = await fetch(`${configuredBase}/api/snapshot`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          throw new Error(`Local daemon returned HTTP ${response.status}.`);
        }

        const next = (await response.json()) as ObservatorySnapshot;
        if (!Array.isArray(next.nodes) || !Array.isArray(next.edges)) {
          throw new Error("Local daemon returned an invalid snapshot.");
        }

        setSnapshot(next);
        setConnection("live");
      } catch (reason) {
        if (controller.signal.aborted) return;
        setSnapshot(fixture);
        setConnection("fallback");
        setError(reason instanceof Error ? reason.message : "Local daemon unavailable.");
      }
    }

    void load();
    return () => controller.abort();
  }, [refreshKey]);

  return { snapshot, connection, error, refresh };
}
