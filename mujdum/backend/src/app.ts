import express from "express";
import type { Db } from "./db.js";
import { haListAreaNames } from "./homeAssistant.js";
import type { createActivityLogger } from "./activityLog.js";
import { HttpError, sendError } from "./httpErrors.js";
import { parseSettingNumber } from "./parseSettingValue.js";
import { mergeTodayElectricityMetricsIfMissing } from "./electricityEnergy.js";
import {
  ElectricityEnergyBucketsError,
  loadElectricityEnergyBuckets
} from "./electricityEnergyBuckets.js";
import { registerSportDictionaryRoutes } from "./sportDictionaries.js";
import { registerSportTheSportsDbRoutes } from "./sportTheSportsDbRoutes.js";
import { registerSportUpcomingRoutes } from "./sportUpcomingRoutes.js";
import { trimTrailingSlashes } from "./trimTrailingSlashes.js";

type RoomRow = { id: number; name: string; created_at: string };
type DashboardMetricRow = { key: string; value: unknown; updated_at: string };
type DashboardMetricHistoryRow = {
  created_at: string;
  value: unknown;
  numeric_value: number | null;
};

function jsonValueToNullableNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

async function upsertRooms(db: Db, names: string[]) {
  const inserted: RoomRow[] = [];
  for (const name of names) {
    const r = await db.query<RoomRow>(
      `
        insert into rooms (name)
        values ($1)
        on conflict (name) do update set name = excluded.name
        returning id, name, created_at
      `,
      [name]
    );
    const row = r.rows[0];
    if (!row) throw new Error("upsert rooms returning failed");
    inserted.push(row);
  }
  return inserted;
}

type ActivityLogger = ReturnType<typeof createActivityLogger>;

export function createApp(db: Db, activity?: ActivityLogger) {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/api/rooms", async (_req, res, next) => {
    try {
      const result = await db.query<RoomRow>(
        "select id, name, created_at from rooms order by id asc"
      );
      res.json({ items: result.rows });
    } catch (e) {
      next(e);
    }
  });

  app.post("/api/rooms", async (req, res, next) => {
    try {
      const name =
        typeof req.body?.name === "string" ? req.body.name.trim() : "";
      if (!name) {
        sendError(res, 400, "VALIDATION_ERROR", "name is required", {
          issues: [{ path: "name", message: "Povinné pole" }]
        });
        return;
      }

      const result = await db.query<RoomRow>(
        `
          insert into rooms (name)
          values ($1)
          on conflict (name) do update set name = excluded.name
          returning id, name, created_at
        `,
        [name]
      );
      const row = result.rows[0];
      if (!row) throw new Error("insert room returning failed");
      res.status(201).json(row);
    } catch (e) {
      next(e);
    }
  });

  // Číselníky
  app.get("/api/dictionaries/rooms", async (_req, res, next) => {
    try {
      const result = await db.query<RoomRow>(
        "select id, name, created_at from rooms order by name asc"
      );
      res.json({ items: result.rows });
    } catch (e) {
      next(e);
    }
  });

  // Sync “číselníku místností” – client sem pošle názvy (např. z Home Assistant MCP).
  app.post("/api/dictionaries/rooms/sync", async (req, res, next) => {
    try {
      const namesRaw: unknown[] = Array.isArray(req.body?.names) ? req.body.names : [];
      const names = Array.from(
        new Set(
          namesRaw
            .filter((x): x is string => typeof x === "string")
            .map((x) => x.trim())
            .filter(Boolean)
        )
      );

      if (names.length === 0) {
        sendError(res, 400, "VALIDATION_ERROR", "names is required", {
          issues: [{ path: "names", message: "Povinné neprázdné pole" }]
        });
        return;
      }

      const inserted = await upsertRooms(db, names);

      await activity?.log({
        event: "dictionary.rooms.sync_manual",
        message: "Rooms dictionary synced via API",
        data: { count: inserted.length }
      });

      res.json({ upserted: inserted.length, items: inserted });
    } catch (e) {
      next(e);
    }
  });

  registerSportDictionaryRoutes(app, db);
  registerSportTheSportsDbRoutes(app);
  registerSportUpcomingRoutes(app, db, activity);

  app.post("/api/dictionaries/rooms/sync-from-home-assistant", async (_req, res, next) => {
    try {
      const url = process.env.HOME_ASSISTANT_URL;
      const token = process.env.HOME_ASSISTANT_TOKEN;
      if (!url || !token) {
        sendError(
          res,
          400,
          "CONFIGURATION_ERROR",
          "Chybí HOME_ASSISTANT_URL / HOME_ASSISTANT_TOKEN v backend env (viz mujdum/.env.example)."
        );
        return;
      }
      if (!/^https?:\/\//.test(url)) {
        sendError(
          res,
          400,
          "VALIDATION_ERROR",
          "HOME_ASSISTANT_URL musí začínat http:// nebo https://",
          {
            issues: [
              {
                path: "HOME_ASSISTANT_URL",
                message: "Musí začínat http:// nebo https://"
              }
            ]
          }
        );
        return;
      }

      const names = await haListAreaNames({ url, token });
      if (names.length === 0) {
        sendError(
          res,
          502,
          "HOME_ASSISTANT_ERROR",
          "Home Assistant nevrátil žádné oblasti."
        );
        return;
      }

      const inserted = await upsertRooms(db, names);
      await activity?.log({
        event: "dictionary.rooms.sync_from_ha",
        message: "Rooms dictionary synced from Home Assistant",
        data: { count: inserted.length }
      });
      res.json({ upserted: inserted.length, items: inserted });
    } catch (e) {
      next(e);
    }
  });

  // Dashboard metrics
  app.get("/api/dashboard", async (_req, res, next) => {
    try {
      const result = await db.query<DashboardMetricRow>(
        "select key, value, updated_at from dashboard_metrics order by key asc"
      );
      const metrics: Record<string, unknown> = {};
      for (const row of result.rows) metrics[row.key] = row.value;

      await mergeTodayElectricityMetricsIfMissing(metrics, db, (message, err) => {
        console.error(message, err ?? "");
      });

      res.json({
        metrics,
        updated_at: result.rows.reduce<string | null>((acc, r) => {
          if (!acc) return r.updated_at;
          return Math.max(Date.parse(acc), Date.parse(r.updated_at)) ===
            Date.parse(r.updated_at)
            ? r.updated_at
            : acc;
        }, null)
      });
    } catch (e) {
      next(e);
    }
  });

  // Snapshot ingest (used by Cursor MCP automation / integrations).
  app.post("/api/dashboard/snapshot", async (req, res, next) => {
    try {
      const body = req.body;
      const metrics =
        body && typeof body === "object" && !Array.isArray(body) && "metrics" in body
          ? body.metrics
          : null;

      if (!metrics || typeof metrics !== "object" || Array.isArray(metrics)) {
        sendError(res, 400, "VALIDATION_ERROR", "metrics object is required", {
          issues: [{ path: "metrics", message: "Očekáván objekt metrics" }]
        });
        return;
      }

      const entries = Object.entries(metrics).filter(
        ([k]) => typeof k === "string" && k.length > 0
      );

      if (entries.length === 0) {
        sendError(res, 400, "VALIDATION_ERROR", "metrics must not be empty", {
          issues: [{ path: "metrics", message: "Alespoň jeden klíč" }]
        });
        return;
      }

      for (const [key, value] of entries) {
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

        const numericValue = jsonValueToNullableNumber(value);
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

      await activity?.log({
        event: "dashboard.snapshot_ingest",
        message: "Dashboard snapshot ingested",
        data: { keys: entries.map(([k]) => k) }
      });

      res.json({ upserted: entries.length });
    } catch (e) {
      next(e);
    }
  });

  // Timeseries (for UI charts)
  app.get("/api/dashboard/metrics/:key/history", async (req, res, next) => {
    try {
      const key = typeof req.params.key === "string" ? req.params.key.trim() : "";
      if (!key) {
        sendError(res, 400, "VALIDATION_ERROR", "key is required", {
          issues: [{ path: "key", message: "Povinný parametr v URL" }]
        });
        return;
      }

      const minutesRaw = req.query.minutes;
      const minutes =
        typeof minutesRaw === "string" ? Number(minutesRaw) : Number.NaN;
      const windowMinutes =
        Number.isFinite(minutes) && minutes > 0 && minutes <= 365 * 24 * 60
          ? Math.trunc(minutes)
          : 6 * 60;

      const fromRaw = req.query.from;
      const toRaw = req.query.to;
      const fromMs =
        typeof fromRaw === "string" ? Date.parse(fromRaw) : Number.NaN;
      const toMs = typeof toRaw === "string" ? Date.parse(toRaw) : Number.NaN;
      const useRange =
        Number.isFinite(fromMs) && Number.isFinite(toMs) && toMs > fromMs;

      const r = useRange
        ? await db.query<DashboardMetricHistoryRow>(
            `
              select created_at, value, numeric_value
              from dashboard_metrics_history
              where key = $1
                and created_at >= $2::timestamptz
                and created_at < $3::timestamptz
              order by created_at asc
            `,
            [key, new Date(fromMs).toISOString(), new Date(toMs).toISOString()]
          )
        : await db.query<DashboardMetricHistoryRow>(
            `
              select created_at, value, numeric_value
              from dashboard_metrics_history
              where key = $1 and created_at >= now() - ($2::int * interval '1 minute')
              order by created_at asc
            `,
            [key, windowMinutes]
          );

      res.json({
        key,
        minutes: windowMinutes,
        ...(useRange
          ? {
              from: new Date(fromMs).toISOString(),
              to: new Date(toMs).toISOString()
            }
          : {}),
        points: r.rows.map((x) => ({
          ts: x.created_at,
          value: x.value,
          numeric: x.numeric_value
        }))
      });
    } catch (e) {
      next(e);
    }
  });

  // Sloupcový graf energie: měsíc → týdenní sloupce, rok → měsíční sloupce (kWh).
  app.get("/api/dashboard/electricity/energy", async (req, res, next) => {
    try {
      const periodRaw = req.query.period;
      const anchorRaw = req.query.anchor;
      const period = periodRaw === "month" || periodRaw === "year" ? periodRaw : null;
      if (!period) {
        sendError(res, 400, "VALIDATION_ERROR", "period must be 'month' or 'year'", {
          issues: [{ path: "period", message: "Povolené hodnoty: month, year" }]
        });
        return;
      }
      const anchor = typeof anchorRaw === "string" ? anchorRaw.trim() : "";
      if (!anchor) {
        sendError(res, 400, "VALIDATION_ERROR", "anchor is required", {
          issues: [{ path: "anchor", message: "Povinný parametr (YYYY-MM nebo YYYY)" }]
        });
        return;
      }

      const result = await loadElectricityEnergyBuckets(db, { period, anchor });
      res.json(result);
    } catch (e) {
      if (e instanceof ElectricityEnergyBucketsError) {
        sendError(res, 400, "VALIDATION_ERROR", e.message, {
          issues: [{ path: "anchor", message: e.message }]
        });
        return;
      }
      next(e);
    }
  });

  app.get("/api/logs/errors", async (_req, res, next) => {
    try {
      const base = process.env.ELASTICSEARCH_URL?.trim()
        ? trimTrailingSlashes(process.env.ELASTICSEARCH_URL.trim())
        : undefined;
      if (!base) {
        sendError(
          res,
          400,
          "CONFIGURATION_ERROR",
          "ELASTICSEARCH_URL is not configured"
        );
        return;
      }

      const esRes = await fetch(`${base}/mujdum-activities-*/_search`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          size: 50,
          sort: [{ "@timestamp": { order: "desc" } }],
          query: {
            bool: {
              should: [
                { term: { level: "error" } },
                { term: { event: "error" } }
              ],
              minimum_should_match: 1
            }
          }
        })
      });

      if (!esRes.ok) {
        const text = await esRes.text().catch(() => "");
        sendError(
          res,
          502,
          "ELASTICSEARCH_ERROR",
          `Elasticsearch error: ${esRes.status} ${text}`
        );
        return;
      }

      const json = (await esRes.json()) as {
        hits?: { hits?: Array<{ _id?: string; _index?: string; _source?: unknown }> };
      };

      const hits = json.hits?.hits ?? [];
      const items = hits.map((h) => ({
        id: h._id,
        index: h._index,
        ...(typeof h._source === "object" && h._source ? h._source : {})
      }));
      res.json({ items });
    } catch (e) {
      next(e);
    }
  });

  app.get("/api/logs/activities", async (_req, res, next) => {
    try {
      const base = process.env.ELASTICSEARCH_URL?.trim()
        ? trimTrailingSlashes(process.env.ELASTICSEARCH_URL.trim())
        : undefined;
      if (!base) {
        sendError(
          res,
          400,
          "CONFIGURATION_ERROR",
          "ELASTICSEARCH_URL is not configured"
        );
        return;
      }

      const esRes = await fetch(`${base}/mujdum-activities-*/_search`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          size: 200,
          sort: [{ "@timestamp": { order: "desc" } }]
        })
      });

      if (!esRes.ok) {
        const text = await esRes.text().catch(() => "");
        sendError(
          res,
          502,
          "ELASTICSEARCH_ERROR",
          `Elasticsearch error: ${esRes.status} ${text}`
        );
        return;
      }

      const json = (await esRes.json()) as {
        hits?: { hits?: Array<{ _id?: string; _index?: string; _source?: unknown }> };
      };

      const hits = json.hits?.hits ?? [];
      const items = hits.map((h) => ({
        id: h._id,
        index: h._index,
        ...(typeof h._source === "object" && h._source ? h._source : {})
      }));

      res.json({ items });
    } catch (e) {
      next(e);
    }
  });

  // Settings (stored in DB)
  app.get("/api/settings", async (_req, res, next) => {
    try {
      const r = await db.query<{ key: string; value: unknown }>(
        "select key, value from app_settings order by key asc"
      );
      const settings: Record<string, unknown> = {};
      for (const row of r.rows) settings[row.key] = row.value;
      res.json({ settings });
    } catch (e) {
      next(e);
    }
  });

  app.put("/api/settings/dashboard-sync-interval-ms", async (req, res, next) => {
    try {
      const v = req.body?.value;
      const n = parseSettingNumber(v);

      if (!Number.isFinite(n) || n < 5_000 || n > 10 * 60_000) {
        sendError(
          res,
          400,
          "VALIDATION_ERROR",
          "value musí být číslo v milisekundách v rozsahu 5000 až 600000",
          {
            issues: [
              {
                path: "value",
                message: "Povolený rozsah 5000–600000 ms"
              }
            ]
          }
        );
        return;
      }

      await db.query(
        `
          insert into app_settings (key, value, updated_at)
          values ($1, $2::jsonb, now())
          on conflict (key) do update set
            value = excluded.value,
            updated_at = excluded.updated_at
        `,
        ["dashboard_sync_interval_ms", JSON.stringify(Math.trunc(n))]
      );

      await activity?.log({
        event: "settings.update",
        message: "Settings updated",
        data: { key: "dashboard_sync_interval_ms", value: Math.trunc(n) }
      });

      res.json({ ok: true, value: Math.trunc(n) });
    } catch (e) {
      next(e);
    }
  });

  app.put("/api/settings/sport-sync-interval-ms", async (req, res, next) => {
    try {
      const v = req.body?.value;
      const n = parseSettingNumber(v);

      if (!Number.isFinite(n) || n < 5_000 || n > 600_000) {
        sendError(
          res,
          400,
          "VALIDATION_ERROR",
          "value musí být číslo v milisekundách v rozsahu 5000 až 600000",
          {
            issues: [
              {
                path: "value",
                message: "Povolený rozsah 5000–600000 ms (5–600 s)"
              }
            ]
          }
        );
        return;
      }

      await db.query(
        `
          insert into app_settings (key, value, updated_at)
          values ($1, $2::jsonb, now())
          on conflict (key) do update set
            value = excluded.value,
            updated_at = excluded.updated_at
        `,
        ["sport_sync_interval_ms", JSON.stringify(Math.trunc(n))]
      );

      await activity?.log({
        event: "settings.update",
        message: "Settings updated",
        data: { key: "sport_sync_interval_ms", value: Math.trunc(n) }
      });

      res.json({ ok: true, value: Math.trunc(n) });
    } catch (e) {
      next(e);
    }
  });

  app.use(
    (
      err: unknown,
      req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      if (err instanceof HttpError) {
        if (err.status >= 500) {
          logUnhandledError(activity, err, req);
        }
        res.status(err.status).json(err.toBody());
        return;
      }

      logUnhandledError(
        activity,
        err instanceof Error ? err : new Error(String(err)),
        req
      );

      res
        .status(500)
        .json(
          new HttpError(500, "INTERNAL_SERVER_ERROR", "Unexpected error").toBody()
        );
    }
  );

  return app;
}

function logUnhandledError(
  activity: ActivityLogger | undefined,
  err: Error,
  req: express.Request
) {
  activity
    ?.log({
      level: "error",
      event: "error",
      message: err.message,
      data: {
        stack: err.stack,
        method: req.method,
        path: req.path
      }
    })
    .catch(() => {});
}
