import { trimTrailingSlashes } from "./trimTrailingSlashes.js";

export type ActivityEvent =
  | "dictionary.rooms.sync_from_ha"
  | "dictionary.rooms.sync_manual"
  | "dashboard.snapshot_ingest"
  | "dashboard.ha_sync"
  | "sport.sync"
  | "settings.update"
  | "error";

export type Activity = {
  level?: "info" | "warn" | "error";
  event: ActivityEvent;
  message: string;
  data?: Record<string, unknown>;
};

function makeIndexName(now = new Date()) {
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `mujdum-activities-${yyyy}-${mm}`;
}

export function createActivityLogger(elasticsearchUrl?: string) {
  const url = elasticsearchUrl?.trim();
  const base = url ? trimTrailingSlashes(url) : null;

  async function log(activity: Activity) {
    const doc = {
      "@timestamp": new Date().toISOString(),
      level: activity.level ?? "info",
      ...activity
    };

    // Always log to stdout (for docker logs)
    console.log(JSON.stringify(doc));

    if (!base) return;
    try {
      const index = makeIndexName();
      const res = await fetch(`${base}/${index}/_doc`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(doc)
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error(
          `[activityLog] elastic index failed ${res.status}`,
          text.slice(0, 500)
        );
      }
    } catch (e) {
      console.error("[activityLog] elastic index failed", e);
    }
  }

  return { log };
}

