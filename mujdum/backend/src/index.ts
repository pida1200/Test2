import "dotenv/config";
import { createDbPool } from "./db.js";
import { createApp } from "./app.js";
import { loadEnv } from "./env.js";
import {
  haComputeDashboardMetrics,
  haGetWeatherTemperatureFromState,
  haListAreaNames,
  type DashboardHaMetricConfig
} from "./homeAssistant.js";
import { createActivityLogger } from "./activityLog.js";
import { persistTodayElectricityMetrics } from "./electricityEnergy.js";
import {
  createTheSportsDbClientFromEnv,
  getSportSyncIntervalMs,
  syncSportUpcomingEvents
} from "./sports/sportsSync.js";
import { parseOptionalNumber } from "./parseSettingValue.js";

const env = loadEnv(process.env);
const db = createDbPool(env.DATABASE_URL);
const activity = createActivityLogger(process.env.ELASTICSEARCH_URL);

const app = createApp(db, activity);

app.listen(env.PORT, () => {
  console.log(`[backend] listening on http://localhost:${env.PORT}`);
});

// Inicializační sync číselníku místností (jen pokud je DB prázdná).
async function bootstrapRoomsIfEmpty() {
  const url = env.HOME_ASSISTANT_URL;
  const token = env.HOME_ASSISTANT_TOKEN;
  if (!url || !token) return;

  const countRes = await db.query<{ count: number }>(
    "select count(*)::int as count from rooms"
  );
  if ((countRes.rows[0]?.count ?? 0) > 0) return;

  const names = await haListAreaNames({ url, token });
  for (const name of names) {
    await db.query(
      `
        insert into rooms (name)
        values ($1)
        on conflict (name) do update set name = excluded.name
      `,
      [name]
    );
  }
}

async function upsertDashboardMetrics(metrics: Record<string, unknown>) {
  const entries = Object.entries(metrics);
  for (const [key, value] of entries) {
    if (value === null || value === undefined) continue;

    await db.query(
      `
        insert into dashboard_metrics (key, value, updated_at)
        values ($1, $2::jsonb, now())
        on conflict (key) do update set
          value = excluded.value,
          updated_at = excluded.updated_at
      `,
      [key, JSON.stringify(value)]
    );

    const numericValue = parseOptionalNumber(value);
    await db.query(
      `
        insert into dashboard_metrics_history (key, value, numeric_value, created_at)
        values ($1, $2::jsonb, $3, now())
      `,
      [
        key,
        JSON.stringify(value),
        numericValue !== null && Number.isFinite(numericValue) ? numericValue : null
      ]
    );
  }
}

async function syncDashboardFromHomeAssistant() {
  const url = env.HOME_ASSISTANT_URL;
  const token = env.HOME_ASSISTANT_TOKEN;
  if (!url || !token) {
    await activity.log({
      level: "warn",
      event: "dashboard.ha_sync",
      message: "Dashboard HA sync skipped (missing HA config)",
      data: {
        hasUrl: Boolean(url),
        hasToken: Boolean(token)
      }
    });
    return;
  }

  // Friendly-name based defaults (works with typical HA naming)
  const mapping: Record<string, DashboardHaMetricConfig> = {
    temp_tata_obyvak: {
      friendlyName: "_TZ3000_m8a8apt5 TS0201 Teplota",
      areaName: "Tata obývák",
      valueFrom: "state"
    },
    temp_loznice: {
      friendlyName: "_TZ3000_m8a8apt5 TS0201 Teplota",
      areaName: "Ložnice",
      valueFrom: "state"
    },
    temp_obyvak: { friendlyName: "_TZ3000_j5fbnjeh TS0201 Teplota", valueFrom: "state" },
    temp_sklenik: { friendlyName: "Teplomer sklenik Teplota", valueFrom: "state" },
    mower_schedule_paused: { friendlyName: "Mower_6656 Pause schedule", valueFrom: "state" },
    mower_status: { entityId: "sensor.mower_6656_mower_status", valueFrom: "state" },
    mower_progress_pct: { entityId: "sensor.mower_6656_progress", valueFrom: "state" },
    mower_rain_sensor: { entityId: "sensor.mower_6656_rain_sensor", valueFrom: "state" },
    mower_rain_sensor_delay_min: {
      friendlyName: "Mower_6656 Rain sensor delay",
      fallbackEntityIds: ["sensor.mower_6656_rain_sensor_countdown"],
      valueFrom: "state"
    },
    irrigation_rain_sensor: { entityId: "binary_sensor.zavlaha_destovy_senzor", valueFrom: "state" },
    electricity_production_w: {
      entityId: "sensor.inverter_93648emu197w0029",
      fallbackEntityIds: ["sensor.homekit_homekit_pv"],
      valueFrom: "state"
    },
    electricity_consumption_w: {
      entityId: "sensor.house_consumption",
      fallbackEntityIds: ["sensor.homekit_homekit_grid"],
      valueFrom: "state"
    }
  };

  const haCfg = { url, token };
  const { metrics, resolution } = await haComputeDashboardMetrics(haCfg, mapping);

  // Jirčany temperature from HA weather entity attributes.temperature
  const jirTemp = await haGetWeatherTemperatureFromState(
    { url, token },
    "weather.forecast_home"
  ).catch(() => null);
  if (jirTemp !== null) {
    metrics.temp_jircany = jirTemp;
  }

  await upsertDashboardMetrics(metrics);

  persistTodayElectricityMetrics(db).catch((e) => {
    console.error("[backend] persistTodayElectricityMetrics failed", e);
  });

  // Do Elasticsearch neposíláme plné `resolution` s hodnotami — může to u řady synců
  // zahltit index nebo selhat indexace; v UI pak chybí záznam „synced from HA“.
  const resolutionForLog = resolution.map((r) => ({
    key: r.key,
    picked: r.picked,
    unavailable: r.unavailable
  }));
  await activity.log({
    event: "dashboard.ha_sync",
    message: "Dashboard metrics synced from Home Assistant",
    data: {
      keys: Object.keys(metrics),
      resolution: resolutionForLog
    }
  });
}

async function getDashboardSyncIntervalMs(): Promise<number> {
  const fallback = env.DASHBOARD_SYNC_INTERVAL_MS ?? 30_000;
  try {
    const r = await db.query<{ value: unknown }>(
      "select value from app_settings where key = $1",
      ["dashboard_sync_interval_ms"]
    );
    const raw = r.rows[0]?.value;
    const n = parseOptionalNumber(raw);
    if (n !== null && Number.isFinite(n) && n >= 5_000 && n <= 10 * 60_000) {
      return Math.trunc(n);
    }
    return fallback;
  } catch {
    return fallback;
  }
}

async function dashboardSyncLoop() {
  try {
    await syncDashboardFromHomeAssistant();
  } catch (e) {
    await activity.log({
      level: "error",
      event: "error",
      message: "Dashboard HA sync failed",
      data: {
        error: e instanceof Error ? e.message : String(e),
        stack: e instanceof Error ? e.stack : undefined
      }
    });
  } finally {
    const intervalMs = await getDashboardSyncIntervalMs();
    await activity.log({
      level: "info",
      event: "dashboard.ha_sync",
      message: "Dashboard HA sync loop scheduled next run",
      data: { intervalMs }
    });
    setTimeout(() => {
      dashboardSyncLoop().catch((e) => {
        console.error("[backend] dashboardSyncLoop failed", e);
      });
    }, intervalMs);
  }
}

async function sportSyncLoop() {
  const intervalMs = await getSportSyncIntervalMs(db, process.env);
  const client = createTheSportsDbClientFromEnv(process.env);
  if (!client) {
    setTimeout(() => {
      sportSyncLoop().catch((e) => {
        console.error("[backend] sportSyncLoop failed", e);
      });
    }, intervalMs);
    return;
  }

  try {
    const result = await syncSportUpcomingEvents(db, client);
    if (result.errors.length > 0) {
      await activity.log({
        level: "warn",
        event: "sport.sync",
        message: "Sport sync completed with errors",
        data: { errors: result.errors.slice(0, 10), errorCount: result.errors.length }
      });
    }
  } catch (e) {
    await activity.log({
      level: "error",
      event: "error",
      message: "Sport sync failed",
      data: {
        error: e instanceof Error ? e.message : String(e),
        stack: e instanceof Error ? e.stack : undefined
      }
    });
  } finally {
    setTimeout(() => {
      sportSyncLoop().catch((e) => {
        console.error("[backend] sportSyncLoop failed", e);
      });
    }, intervalMs);
  }
}

try {
  await bootstrapRoomsIfEmpty();
} catch (e) {
  console.error("[backend] bootstrapRoomsIfEmpty failed", e);
}

await Promise.all([dashboardSyncLoop(), sportSyncLoop()]);

