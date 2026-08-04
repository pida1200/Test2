import { afterEach, describe, expect, it, vi } from "vitest";
import type { Server } from "node:http";
import { createApp } from "../src/app.js";
import { todayDateKeyInTimeZone } from "../src/electricityEnergy.js";
import { createFakeDb } from "./fakeDb.js";

async function withServer(
  fn: (baseUrl: string) => Promise<void>,
  db = createFakeDb()
) {
  const app = createApp(db);
  const server: Server = app.listen(0);
  const addr = server.address();
  if (!addr || typeof addr === "string") {
    server.close();
    throw new Error("Expected server to listen on a TCP port.");
  }
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  try {
    await fn(baseUrl);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

describe("app", () => {
  const prevEsUrl = process.env.ELASTICSEARCH_URL;

  afterEach(() => {
    if (prevEsUrl === undefined) {
      delete process.env.ELASTICSEARCH_URL;
    } else {
      process.env.ELASTICSEARCH_URL = prevEsUrl;
    }
  });

  it("exposes /health", async () => {
    await withServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/health`);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
    });
  });

  it("GET /api/dashboard returns empty metrics", async () => {
    await withServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/dashboard`);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ metrics: {}, updated_at: null });
    });
  });

  it("GET /api/dashboard includes today electricity energy totals", async () => {
    const day = todayDateKeyInTimeZone("Europe/Prague");
    const t0 = new Date(`${day}T08:00:00+02:00`).toISOString();
    const t1 = new Date(`${day}T09:00:00+02:00`).toISOString();
    const db = createFakeDb({
      history: [
        {
          key: "electricity_production_w",
          created_at: t0,
          value: 2000,
          numeric_value: 2000
        },
        {
          key: "electricity_production_w",
          created_at: t1,
          value: 2000,
          numeric_value: 2000
        },
        {
          key: "electricity_consumption_w",
          created_at: t0,
          value: 1000,
          numeric_value: 1000
        },
        {
          key: "electricity_consumption_w",
          created_at: t1,
          value: 1000,
          numeric_value: 1000
        }
      ]
    });
    await withServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/dashboard`);
      expect(res.status).toBe(200);
      const json = (await res.json()) as { metrics: Record<string, number> };
      expect(json.metrics.electricity_today_produced_kwh).toBeCloseTo(2, 1);
      expect(json.metrics.electricity_today_consumed_kwh).toBeCloseTo(1, 1);
      expect(json.metrics.electricity_today_sold_kwh).toBeCloseTo(1, 1);
      expect(json.metrics.electricity_today_purchased_kwh).toBeCloseTo(0, 1);
    }, db);
  });

  it("GET /api/dashboard returns stored metrics", async () => {
    const db = createFakeDb({
      dashboardMetrics: [
        {
          key: "temp_jircany",
          value: 12.5,
          updated_at: "2026-05-16T10:00:00.000Z"
        }
      ]
    });
    await withServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/dashboard`);
      expect(res.status).toBe(200);
      const json = (await res.json()) as {
        metrics: Record<string, unknown>;
        updated_at: string;
      };
      expect(json.metrics.temp_jircany).toBe(12.5);
      expect(json.updated_at).toBe("2026-05-16T10:00:00.000Z");
    }, db);
  });

  it("POST /api/dashboard/snapshot validates metrics", async () => {
    await withServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/dashboard/snapshot`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({})
      });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe("VALIDATION_ERROR");
      expect(json.error.issues).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: "metrics" })])
      );
    });
  });

  it("POST /api/dashboard/snapshot upserts metrics and history", async () => {
    const db = createFakeDb();
    await withServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/dashboard/snapshot`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ metrics: { temp_jircany: 20 } })
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ upserted: 1 });

      const dash = await fetch(`${baseUrl}/api/dashboard`);
      const dashJson = (await dash.json()) as { metrics: Record<string, number> };
      expect(dashJson.metrics.temp_jircany).toBe(20);
    }, db);
  });

  it("GET /api/dashboard/metrics/:key/history returns points", async () => {
    const db = createFakeDb({
      history: [
        {
          key: "temp_jircany",
          created_at: "2026-05-16T09:00:00.000Z",
          value: 10,
          numeric_value: 10
        }
      ]
    });
    await withServer(async (baseUrl) => {
      const res = await fetch(
        `${baseUrl}/api/dashboard/metrics/temp_jircany/history?minutes=60`
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as {
        key: string;
        minutes: number;
        points: unknown[];
      };
      expect(json.key).toBe("temp_jircany");
      expect(json.minutes).toBe(60);
      expect(json.points).toHaveLength(1);
    }, db);
  });

  it("GET /api/dashboard/metrics/:key/history filters by from/to range", async () => {
    const db = createFakeDb({
      history: [
        {
          key: "electricity_production_w",
          created_at: "2026-05-15T22:00:00.000Z",
          value: 1,
          numeric_value: 1
        },
        {
          key: "electricity_production_w",
          created_at: "2026-05-16T10:00:00.000Z",
          value: 100,
          numeric_value: 100
        },
        {
          key: "electricity_production_w",
          created_at: "2026-05-17T10:00:00.000Z",
          value: 200,
          numeric_value: 200
        }
      ]
    });
    await withServer(async (baseUrl) => {
      const res = await fetch(
        `${baseUrl}/api/dashboard/metrics/electricity_production_w/history?from=2026-05-16T00:00:00.000Z&to=2026-05-17T00:00:00.000Z`
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as {
        from?: string;
        to?: string;
        points: Array<{ numeric: number }>;
      };
      expect(json.from).toBeDefined();
      expect(json.points).toHaveLength(1);
      expect(json.points[0]?.numeric).toBe(100);
    }, db);
  });

  it("GET /api/dashboard/electricity/energy returns weekly buckets for a month", async () => {
    const samples: Array<{ key: string; created_at: string; value: number; numeric_value: number }> =
      [];
    for (let h = 6; h <= 18; h++) {
      const ts = `2025-05-13T${String(h).padStart(2, "0")}:00:00.000Z`;
      samples.push({ key: "electricity_production_w", created_at: ts, value: 1000, numeric_value: 1000 });
      samples.push({ key: "electricity_consumption_w", created_at: ts, value: 500, numeric_value: 500 });
    }
    const db = createFakeDb({ history: samples });
    await withServer(async (baseUrl) => {
      const res = await fetch(
        `${baseUrl}/api/dashboard/electricity/energy?period=month&anchor=2025-05`
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as {
        period: string;
        bucketUnit: string;
        buckets: Array<{ key: string; producedKwh: number; consumedKwh: number }>;
      };
      expect(json.period).toBe("month");
      expect(json.bucketUnit).toBe("week");
      const week = json.buckets.find((b) => b.key === "2025-05-12");
      expect(week?.producedKwh).toBeCloseTo(12, 1);
      expect(week?.consumedKwh).toBeCloseTo(6, 1);
    }, db);
  });

  it("GET /api/dashboard/electricity/energy validates params", async () => {
    await withServer(async (baseUrl) => {
      const badPeriod = await fetch(
        `${baseUrl}/api/dashboard/electricity/energy?period=week&anchor=2025-05`
      );
      expect(badPeriod.status).toBe(400);
      const badAnchor = await fetch(
        `${baseUrl}/api/dashboard/electricity/energy?period=month&anchor=2025`
      );
      expect(badAnchor.status).toBe(400);
      const json = (await badAnchor.json()) as { error: { code: string } };
      expect(json.error.code).toBe("VALIDATION_ERROR");
    });
  });

  it("GET /api/rooms and dictionaries/rooms", async () => {
    const db = createFakeDb({
      rooms: [{ id: 2, name: "B", created_at: "2026-01-01T00:00:00.000Z" }]
    });
    await withServer(async (baseUrl) => {
      const byId = await fetch(`${baseUrl}/api/rooms`);
      expect((await byId.json()).items[0].name).toBe("B");

      const byName = await fetch(`${baseUrl}/api/dictionaries/rooms`);
      expect((await byName.json()).items[0].name).toBe("B");
    }, db);
  });

  it("POST /api/rooms validates name", async () => {
    await withServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/rooms`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "  " })
      });
      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
    });
  });

  it("POST /api/rooms creates room", async () => {
    const db = createFakeDb();
    await withServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/rooms`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Obývák" })
      });
      expect(res.status).toBe(201);
      expect((await res.json()).name).toBe("Obývák");
    }, db);
  });

  it("POST /api/dictionaries/rooms/sync requires names", async () => {
    await withServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/dictionaries/rooms/sync`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ names: [] })
      });
      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
    });
  });

  it("POST /api/dictionaries/rooms/sync upserts names", async () => {
    const db = createFakeDb();
    await withServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/dictionaries/rooms/sync`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ names: ["Kuchyně", "Ložnice"] })
      });
      expect(res.status).toBe(200);
      const json = (await res.json()) as { upserted: number };
      expect(json.upserted).toBe(2);
    }, db);
  });

  it("GET /api/settings returns settings map", async () => {
    const db = createFakeDb({
      settings: [{ key: "dashboard_sync_interval_ms", value: 45_000 }]
    });
    await withServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/settings`);
      expect(res.status).toBe(200);
      expect((await res.json()).settings.dashboard_sync_interval_ms).toBe(45_000);
    }, db);
  });

  it("PUT /api/settings/dashboard-sync-interval-ms validates range", async () => {
    await withServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/settings/dashboard-sync-interval-ms`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ value: 1000 })
      });
      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
    });
  });

  it("PUT /api/settings/sport-sync-interval-ms stores value", async () => {
    const db = createFakeDb();
    await withServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/settings/sport-sync-interval-ms`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ value: 180_000 })
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true, value: 180_000 });

      const settings = await fetch(`${baseUrl}/api/settings`);
      expect((await settings.json()).settings.sport_sync_interval_ms).toBe(180_000);
    }, db);
  });

  it("PUT /api/settings/dashboard-sync-interval-ms stores value", async () => {
    const db = createFakeDb();
    await withServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/settings/dashboard-sync-interval-ms`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ value: 60_000 })
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true, value: 60_000 });

      const settings = await fetch(`${baseUrl}/api/settings`);
      expect((await settings.json()).settings.dashboard_sync_interval_ms).toBe(
        60_000
      );
    }, db);
  });

  it("GET /api/logs/activities without ES returns CONFIGURATION_ERROR", async () => {
    delete process.env.ELASTICSEARCH_URL;
    await withServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/logs/activities`);
      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe("CONFIGURATION_ERROR");
    });
  });

  it("GET /api/logs/activities strips trailing slashes from Elasticsearch URL", async () => {
    const prev = process.env.ELASTICSEARCH_URL;
    process.env.ELASTICSEARCH_URL = "http://elastic.local:9200///";
    const esUrls: string[] = [];
    const originalFetch = globalThis.fetch;
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes("elastic.local")) {
        esUrls.push(url);
        return new Response(JSON.stringify({ hits: { hits: [] } }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      return originalFetch(input, init);
    });

    try {
      await withServer(async (baseUrl) => {
        const res = await fetch(`${baseUrl}/api/logs/activities`);
        expect(res.status).toBe(200);
        expect(esUrls).toEqual([
          "http://elastic.local:9200/mujdum-activities-*/_search"
        ]);
      });
    } finally {
      fetchSpy.mockRestore();
      if (prev === undefined) delete process.env.ELASTICSEARCH_URL;
      else process.env.ELASTICSEARCH_URL = prev;
    }
  });

  it("GET /api/logs/errors strips trailing slashes from Elasticsearch URL", async () => {
    const prev = process.env.ELASTICSEARCH_URL;
    process.env.ELASTICSEARCH_URL = "http://elastic.local:9200/";
    const esUrls: string[] = [];
    const originalFetch = globalThis.fetch;
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes("elastic.local")) {
        esUrls.push(url);
        return new Response(JSON.stringify({ hits: { hits: [] } }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      return originalFetch(input, init);
    });

    try {
      await withServer(async (baseUrl) => {
        const res = await fetch(`${baseUrl}/api/logs/errors`);
        expect(res.status).toBe(200);
        expect(esUrls).toEqual([
          "http://elastic.local:9200/mujdum-activities-*/_search"
        ]);
      });
    } finally {
      fetchSpy.mockRestore();
      if (prev === undefined) delete process.env.ELASTICSEARCH_URL;
      else process.env.ELASTICSEARCH_URL = prev;
    }
  });

  it("GET /api/dictionaries/sport-teams returns items", async () => {
    const db = createFakeDb({
      sportTeams: [
        {
          id: 1,
          name: "Sparta",
          thesportsdb_team_id: "134007",
          sport: "Soccer",
          league_hint: null,
          active: true,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z"
        }
      ]
    });
    await withServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/dictionaries/sport-teams`);
      expect(res.status).toBe(200);
      const json = (await res.json()) as { items: Array<{ name: string }> };
      expect(json.items[0]?.name).toBe("Sparta");
    }, db);
  });

  it("POST /api/dictionaries/sport-teams validates payload", async () => {
    await withServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/dictionaries/sport-teams`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "  " })
      });
      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
    });
  });

  it("POST /api/dictionaries/sport-teams creates team", async () => {
    const db = createFakeDb();
    await withServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/dictionaries/sport-teams`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Sparta Praha",
          thesportsdb_team_id: "134007",
          sport: "Soccer"
        })
      });
      expect(res.status).toBe(201);
      const json = (await res.json()) as { name: string; active: boolean };
      expect(json.name).toBe("Sparta Praha");
      expect(json.active).toBe(true);
    }, db);
  });

  it("PATCH /api/dictionaries/sport-teams/:id deactivates team", async () => {
    const db = createFakeDb({
      sportTeams: [
        {
          id: 3,
          name: "Slavia",
          thesportsdb_team_id: "133999",
          sport: null,
          league_hint: null,
          active: true,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z"
        }
      ],
      nextSportTeamId: 4
    });
    await withServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/dictionaries/sport-teams/3`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ active: false })
      });
      expect(res.status).toBe(200);
      expect((await res.json()).active).toBe(false);
    }, db);
  });

  it("POST /api/dictionaries/sport-players creates player", async () => {
    const db = createFakeDb();
    await withServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/dictionaries/sport-players`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Novák",
          thesportsdb_player_id: "34145937"
        })
      });
      expect(res.status).toBe(201);
      expect((await res.json()).name).toBe("Novák");
    }, db);
  });

  it("GET /api/sport/upcoming returns stored events", async () => {
    const db = createFakeDb({
      sportUpcoming: [
        {
          id: 1,
          source: "thesportsdb",
          external_event_id: "1",
          title: "A vs B",
          home_team: "A",
          away_team: "B",
          starts_at: "2099-01-01T12:00:00.000Z",
          league: "L",
          sport: "Soccer",
          sport_team_id: 1,
          sport_player_id: null,
          synced_at: "2026-01-01T00:00:00.000Z"
        }
      ],
      sportTeams: [
        {
          id: 1,
          name: "Sparta",
          thesportsdb_team_id: "134007",
          sport: null,
          league_hint: null,
          active: true,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z"
        }
      ]
    });
    await withServer(async (baseUrl) => {
      const res = await fetch(
        `${baseUrl}/api/sport/upcoming?from=2026-01-01T00:00:00.000Z`
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as { items: Array<{ title: string; team_name: string }> };
      expect(json.items).toHaveLength(1);
      expect(json.items[0]?.title).toBe("A vs B");
      expect(json.items[0]?.team_name).toBe("Sparta");
    }, db);
  });

  it("GET /api/sport/thesportsdb/sports requires API key", async () => {
    const prev = process.env.THESPORTSDB_API_KEY;
    delete process.env.THESPORTSDB_API_KEY;
    try {
      await withServer(async (baseUrl) => {
        const res = await fetch(`${baseUrl}/api/sport/thesportsdb/sports`);
        expect(res.status).toBe(503);
        expect((await res.json()).error.code).toBe("CONFIGURATION_ERROR");
      });
    } finally {
      if (prev !== undefined) process.env.THESPORTSDB_API_KEY = prev;
    }
  });

  it("GET /api/sport/thesportsdb/teams/search proxies TheSportsDB", async () => {
    const prev = process.env.THESPORTSDB_API_KEY;
    process.env.THESPORTSDB_API_KEY = "test-key";
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input) => {
      const url = String(input);
      if (url.includes("searchteams.php")) {
        return new Response(
          JSON.stringify({
            teams: [
              {
                idTeam: "134007",
                strTeam: "Sparta Praha",
                strSport: "Soccer",
                strLeague: "Czech First League"
              }
            ]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return originalFetch(input);
    };

    try {
      await withServer(async (baseUrl) => {
        const res = await fetch(
          `${baseUrl}/api/sport/thesportsdb/teams/search?sport=Soccer&q=Sparta`
        );
        expect(res.status).toBe(200);
        const json = (await res.json()) as {
          items: Array<{ thesportsdb_team_id: string; name: string }>;
        };
        expect(json.items[0]?.thesportsdb_team_id).toBe("134007");
      });
    } finally {
      globalThis.fetch = originalFetch;
      if (prev !== undefined) process.env.THESPORTSDB_API_KEY = prev;
      else delete process.env.THESPORTSDB_API_KEY;
    }
  });

  it("GET /api/sport/thesportsdb/players/search proxies TheSportsDB", async () => {
    const prev = process.env.THESPORTSDB_API_KEY;
    process.env.THESPORTSDB_API_KEY = "test-key";
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input) => {
      const url = String(input);
      if (url.includes("searchplayers.php")) {
        return new Response(
          JSON.stringify({
            player: [
              {
                idPlayer: "34154641",
                strPlayer: "Jaromir Jagr",
                strSport: "Ice Hockey",
                strTeam: "Rytíři Kladno"
              }
            ]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return originalFetch(input);
    };

    try {
      await withServer(async (baseUrl) => {
        const res = await fetch(
          `${baseUrl}/api/sport/thesportsdb/players/search?sport=Ice%20Hockey&q=Jagr`
        );
        expect(res.status).toBe(200);
        const json = (await res.json()) as {
          items: Array<{ thesportsdb_player_id: string; name: string }>;
        };
        expect(json.items[0]?.thesportsdb_player_id).toBe("34154641");
      });
    } finally {
      globalThis.fetch = originalFetch;
      if (prev !== undefined) process.env.THESPORTSDB_API_KEY = prev;
      else delete process.env.THESPORTSDB_API_KEY;
    }
  });

  it("POST /api/sport/sync requires TheSportsDB key", async () => {
    const prev = process.env.THESPORTSDB_API_KEY;
    delete process.env.THESPORTSDB_API_KEY;
    try {
      await withServer(async (baseUrl) => {
        const res = await fetch(`${baseUrl}/api/sport/sync`, { method: "POST" });
        expect(res.status).toBe(400);
        expect((await res.json()).error.code).toBe("CONFIGURATION_ERROR");
      });
    } finally {
      if (prev !== undefined) process.env.THESPORTSDB_API_KEY = prev;
    }
  });

  it("POST /api/sport/sync upserts events", async () => {
    const prev = process.env.THESPORTSDB_API_KEY;
    process.env.THESPORTSDB_API_KEY = "test-key";
    const db = createFakeDb({
      sportTeams: [
        {
          id: 1,
          name: "Sparta",
          thesportsdb_team_id: "134007",
          sport: null,
          league_hint: null,
          active: true,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z"
        }
      ]
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      if (url.includes("thesportsdb.com") && url.includes("eventsnext.php")) {
        return new Response(
          JSON.stringify({
            events: [
              {
                idEvent: "77",
                strHomeTeam: "Liberec",
                strAwayTeam: "Sparta",
                dateEvent: "2099-05-17",
                strTime: "15:00:00"
              }
            ]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return originalFetch(input, init);
    };

    try {
      await withServer(async (baseUrl) => {
        const res = await fetch(`${baseUrl}/api/sport/sync`, { method: "POST" });
        expect(res.status).toBe(200);
        const json = (await res.json()) as { events_upserted: number; ok: boolean };
        expect(json.ok).toBe(true);
        expect(json.events_upserted).toBe(1);

        const list = await fetch(
          `${baseUrl}/api/sport/upcoming?from=2026-01-01T00:00:00.000Z`
        );
        const upcoming = (await list.json()) as { items: unknown[] };
        expect(upcoming.items.length).toBeGreaterThanOrEqual(1);
      }, db);
    } finally {
      globalThis.fetch = originalFetch;
      if (prev !== undefined) process.env.THESPORTSDB_API_KEY = prev;
      else delete process.env.THESPORTSDB_API_KEY;
    }
  });

  it("GET /api/dictionaries/sport-players returns items", async () => {
    const db = createFakeDb({
      sportPlayers: [
        {
          id: 1,
          name: "Novák",
          thesportsdb_player_id: "34145937",
          sport: "Soccer",
          active: true,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z"
        }
      ]
    });
    await withServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/dictionaries/sport-players`);
      expect(res.status).toBe(200);
      expect((await res.json()).items[0]?.name).toBe("Novák");
    }, db);
  });

  it("POST /api/dictionaries/sport-teams returns 409 on duplicate external id", async () => {
    const teamRow = {
      id: 3,
      name: "Slavia",
      thesportsdb_team_id: "133999",
      sport: "Soccer" as string | null,
      league_hint: null as string | null,
      active: true,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z"
    };
    const db = createFakeDb({
      sportTeams: [teamRow],
      nextSportTeamId: 4
    });
    await withServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/dictionaries/sport-teams`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Duplicitní",
          thesportsdb_team_id: "133999",
          sport: "Soccer"
        })
      });
      expect(res.status).toBe(409);
    }, db);
  });

  it("PATCH /api/dictionaries/sport-teams/:id returns 404 when missing", async () => {
    await withServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/dictionaries/sport-teams/999`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ active: false })
      });
      expect(res.status).toBe(404);
    });
  });

  it("PATCH /api/dictionaries/sport-teams/:id updates name", async () => {
    const teamRow = {
      id: 3,
      name: "Slavia",
      thesportsdb_team_id: "133999",
      sport: "Soccer" as string | null,
      league_hint: null as string | null,
      active: true,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z"
    };
    const db = createFakeDb({ sportTeams: [teamRow], nextSportTeamId: 4 });
    await withServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/dictionaries/sport-teams/3`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Slavia Praha" })
      });
      expect(res.status).toBe(200);
      expect((await res.json()).name).toBe("Slavia Praha");
    }, db);
  });

  it("PATCH /api/dictionaries/sport-teams/:id rejects invalid id", async () => {
    await withServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/dictionaries/sport-teams/0`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ active: false })
      });
      expect(res.status).toBe(400);
    });
  });

  it("POST /api/dictionaries/sport-players validates payload", async () => {
    await withServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/dictionaries/sport-players`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Bez ID" })
      });
      expect(res.status).toBe(400);
    });
  });

  it("PATCH /api/dictionaries/sport-players/:id deactivates player", async () => {
    const db = createFakeDb({
      sportPlayers: [
        {
          id: 2,
          name: "Hráč",
          thesportsdb_player_id: "999",
          sport: null,
          active: true,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z"
        }
      ],
      nextSportPlayerId: 3
    });
    await withServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/dictionaries/sport-players/2`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ active: false })
      });
      expect(res.status).toBe(200);
      expect((await res.json()).active).toBe(false);
    }, db);
  });

  it("PATCH /api/dictionaries/sport-players/:id returns 404 when missing", async () => {
    await withServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/dictionaries/sport-players/999`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ active: false })
      });
      expect(res.status).toBe(404);
    });
  });

  it("POST /api/dictionaries/sport-players returns 409 on duplicate external id", async () => {
    const playerRow = {
      id: 2,
      name: "Player",
      thesportsdb_player_id: "999",
      sport: "Soccer" as string | null,
      active: true,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z"
    };
    const db = createFakeDb({
      sportPlayers: [playerRow],
      nextSportPlayerId: 3
    });
    await withServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/dictionaries/sport-players`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Other",
          thesportsdb_player_id: "999"
        })
      });
      expect(res.status).toBe(409);
    }, db);
  });
});
