export type Page = "dashboard" | "dictionaries" | "sport" | "log" | "settings" | "testUi";

export const PAGE_TITLES: Record<Page, string> = {
  dashboard: "Dashboard",
  dictionaries: "Číselníky",
  sport: "Sport",
  log: "Log",
  settings: "Nastavení",
  testUi: "Test UI"
};

export function parseNumberSetting(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return Number.NaN;
}

/** Handler pro async onClick bez void operátoru (Sonar S3735). */
export function runAsyncAction(fn: () => void | Promise<unknown>): () => void {
  return () => {
    Promise.resolve(fn()).catch(() => {});
  };
}

export function intervalSecondsFromMs(ms: unknown): string {
  const n = parseNumberSetting(ms);
  if (Number.isFinite(n) && n > 0) return String(Math.round(n / 1000));
  return "";
}

export function readDashIntervalSeconds(settings: {
  settings: Record<string, unknown>;
}): string {
  return intervalSecondsFromMs(settings.settings?.dashboard_sync_interval_ms);
}

export function readSportIntervalSeconds(settings: {
  settings: Record<string, unknown>;
}): string {
  const value = intervalSecondsFromMs(settings.settings?.sport_sync_interval_ms);
  return value || "180";
}
