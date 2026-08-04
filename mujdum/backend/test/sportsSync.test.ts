import { describe, expect, it } from "vitest";
import { calendarDateKeyInTimeZone, DEFAULT_ELECTRICITY_TIMEZONE } from "../src/electricityEnergy.js";
import { TheSportsDbClient } from "../src/sports/theSportsDbClient.js";
import {
  SPORT_SYNC_INTERVAL_MS_DEFAULT,
  getSportSyncIntervalMs,
  listUpcomingSportEvents,
  parseUpcomingQuery,
  readSportSyncIntervalMsFromEnv,
  syncSportUpcomingEvents,
  upsertUpcomingEvent
} from "../src/sports/sportsSync.js";
import { createFakeDb } from "./fakeDb.js";

describe("sport sync interval", () => {
  it("defaults to 3 minutes from env when unset", () => {
    expect(readSportSyncIntervalMsFromEnv({})).toBe(SPORT_SYNC_INTERVAL_MS_DEFAULT);
    expect(SPORT_SYNC_INTERVAL_MS_DEFAULT).toBe(180_000);
  });

  it("reads interval from app_settings", async () => {
    const db = createFakeDb({
      settings: [{ key: "sport_sync_interval_ms", value: 120_000 }]
    });
    const ms = await getSportSyncIntervalMs(db, {});
    expect(ms).toBe(120_000);
  });
});

describe("parseUpcomingQuery", () => {
  it("defaults from to start of today in Europe/Prague when omitted", () => {
    const r = parseUpcomingQuery({});
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const today = calendarDateKeyInTimeZone(new Date(), DEFAULT_ELECTRICITY_TIMEZONE);
    expect(calendarDateKeyInTimeZone(r.from, DEFAULT_ELECTRICITY_TIMEZONE)).toBe(today);
    expect(r.from.getTime()).toBeLessThanOrEqual(Date.now());
    expect(r.teamId).toBeNull();
  });

  it("rejects invalid teamId", () => {
    const r = parseUpcomingQuery({ teamId: "x" });
    expect(r.ok).toBe(false);
  });
});

describe("syncSportUpcomingEvents", () => {
  it("upserts team events and lists them", async () => {
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

    const fetchFn = async (u: string | URL) => {
      const url = String(u);
      if (url.includes("eventsnext.php")) {
        return new Response(
          JSON.stringify({
            events: [
              {
                idEvent: "99",
                strHomeTeam: "A",
                strAwayTeam: "Sparta",
                dateEvent: "2099-06-01",
                strTime: "18:00:00",
                strLeague: "Test League",
                strSport: "Soccer"
              }
            ]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ teams: [] }), { status: 200 });
    };

    const client = new TheSportsDbClient({ apiKey: "k" }, fetchFn as typeof fetch);
    const result = await syncSportUpcomingEvents(db, client);
    expect(result.teamsProcessed).toBe(1);
    expect(result.eventsUpserted).toBe(1);
    expect(result.errors).toHaveLength(0);

    const listed = await db.query<{ title: string }>(
      `select title from sports_upcoming_events where external_event_id = $1`,
      ["99"]
    );
    expect(listed.rows[0]?.title).toContain("A");
  });

  it("syncs player via team from lookup", async () => {
    const db = createFakeDb({
      sportPlayers: [
        {
          id: 2,
          name: "Hráč",
          thesportsdb_player_id: "111",
          sport: null,
          active: true,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z"
        }
      ]
    });

    const fetchFn = async (u: string | URL) => {
      const url = String(u);
      if (url.includes("lookupplayer.php")) {
        return new Response(
          JSON.stringify({ players: [{ idTeam: "134007" }] }),
          { status: 200 }
        );
      }
      if (url.includes("eventsnext.php")) {
        return new Response(
          JSON.stringify({
            events: [
              {
                idEvent: "88",
                strHomeTeam: "X",
                strAwayTeam: "Y",
                dateEvent: "2099-07-01",
                strTime: "12:00:00"
              }
            ]
          }),
          { status: 200 }
        );
      }
      return new Response("{}", { status: 200 });
    };

    const client = new TheSportsDbClient({ apiKey: "k" }, fetchFn as typeof fetch);
    const result = await syncSportUpcomingEvents(db, client);
    expect(result.playersProcessed).toBe(1);
    expect(result.eventsUpserted).toBe(1);

    const listed = await listUpcomingSportEvents(db, {
      from: new Date("2020-01-01"),
      to: null,
      teamId: null,
      playerId: null
    });
    expect(listed.items).toHaveLength(1);
    expect(listed.items[0]?.sport_player_id).toBe(2);
    expect(listed.items[0]?.player_name).toBe("Hráč");
  });
});

describe("upsertUpcomingEvent", () => {
  it("merges team and player ids on conflict", async () => {
    const db = createFakeDb();
    const event = {
      externalEventId: "1",
      title: "A vs B",
      homeTeam: "A",
      awayTeam: "B",
      startsAtUtc: "2099-01-01T12:00:00.000Z",
      league: "L",
      sport: "Soccer"
    };
    await upsertUpcomingEvent(db, event, {
      sportTeamId: 1,
      sportPlayerId: null,
      syncedAt: "2026-01-01T00:00:00.000Z"
    });
    await upsertUpcomingEvent(db, event, {
      sportTeamId: null,
      sportPlayerId: 2,
      syncedAt: "2026-01-02T00:00:00.000Z"
    });
    const row = await db.query<{ sport_team_id: number | null; sport_player_id: number | null }>(
      `select sport_team_id, sport_player_id from sports_upcoming_events where external_event_id = $1`,
      ["1"]
    );
    expect(row.rows[0]?.sport_team_id).toBe(1);
    expect(row.rows[0]?.sport_player_id).toBe(2);
  });
});
