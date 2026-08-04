import { useCallback, useEffect, useState } from "react";

export type DashboardResponse = {
  metrics: Record<string, unknown>;
  updated_at: string | null;
};

export function useDashboard(options: Readonly<{
  onLoadError?: (message: string) => void;
  refreshIntervalMs?: number;
}>) {
  const { onLoadError, refreshIntervalMs = 15_000 } = options;
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);

  const loadDashboard = useCallback(async () => {
    const res = await fetch("/api/dashboard");
    const json = (await res.json()) as DashboardResponse;
    setDashboard(json);
  }, []);

  useEffect(() => {
    loadDashboard().catch(() => onLoadError?.("Nepodařilo se načíst dashboard."));

    const tDash = globalThis.setInterval(() => {
      loadDashboard().catch(() => {});
    }, refreshIntervalMs);
    return () => {
      globalThis.clearInterval(tDash);
    };
  }, [loadDashboard, onLoadError, refreshIntervalMs]);

  return { dashboard, loadDashboard };
}
