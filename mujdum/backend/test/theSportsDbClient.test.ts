import { describe, expect, it } from "vitest";
import {
  normalizeUpcomingEvents,
  parseEventStartUtc,
  TheSportsDbClient,
  TheSportsDbError
} from "../src/sports/theSportsDbClient.js";

describe("parseEventStartUtc", () => {
  it("parses date and time as UTC when suffixed", () => {
    const iso = parseEventStartUtc("2026-05-20", "15:30:00");
    expect(iso).toBe("2026-05-20T15:30:00.000Z");
  });
});

describe("normalizeUpcomingEvents", () => {
  it("maps API payload to upcoming events", () => {
    const raw = {
      events: [
        {
          idEvent: "123",
          strHomeTeam: "Sparta",
          strAwayTeam: "Slavia",
          dateEvent: "2026-05-21",
          strTime: "18:00:00",
          strLeague: "Czech League",
          strSport: "Soccer"
        }
      ]
    };
    const events = normalizeUpcomingEvents(raw);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      externalEventId: "123",
      homeTeam: "Sparta",
      awayTeam: "Slavia",
      league: "Czech League",
      sport: "Soccer"
    });
    expect(events[0]!.title).toContain("Sparta");
  });
});

describe("TheSportsDbClient", () => {
  it("getTeamUpcomingEvents calls eventsnext", async () => {
    let url = "";
    const fetchFn = async (u: string | URL) => {
      url = String(u);
      return new Response(
        JSON.stringify({
          events: [
            {
              idEvent: "1",
              strEvent: "A vs B",
              strHomeTeam: "A",
              strAwayTeam: "B",
              dateEvent: "2026-06-01",
              strTime: "12:00:00"
            }
          ]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const client = new TheSportsDbClient({ apiKey: "test-key" }, fetchFn as typeof fetch);
    const events = await client.getTeamUpcomingEvents("133602");

    expect(url).toContain("/test-key/eventsnext.php?id=133602");
    expect(events).toHaveLength(1);
    expect(events[0]!.externalEventId).toBe("1");
  });

  it("retries on HTTP 429 then succeeds", async () => {
    let calls = 0;
    const fetchFn = async () => {
      calls += 1;
      if (calls === 1) {
        return new Response("rate limit", { status: 429 });
      }
      return new Response(
        JSON.stringify({
          events: [
            {
              idEvent: "1",
              strEvent: "A vs B",
              strHomeTeam: "A",
              strAwayTeam: "B",
              dateEvent: "2026-06-01",
              strTime: "12:00:00"
            }
          ]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const client = new TheSportsDbClient({ apiKey: "k" }, fetchFn as typeof fetch);
    const events = await client.getTeamUpcomingEvents("1");
    expect(calls).toBe(2);
    expect(events).toHaveLength(1);
  });

  it("throws TheSportsDbError on HTTP failure after retries", async () => {
    const fetchFn = async () => new Response("rate limit", { status: 429 });
    const client = new TheSportsDbClient({ apiKey: "k" }, fetchFn as typeof fetch);
    await expect(client.getTeamUpcomingEvents("1")).rejects.toBeInstanceOf(TheSportsDbError);
  });

  it("throws on string events payload (invalid team id)", async () => {
    const fetchFn = async () =>
      new Response(JSON.stringify({ events: "Invalid Team ID passed" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    const client = new TheSportsDbClient({ apiKey: "k" }, fetchFn as typeof fetch);
    await expect(client.getTeamUpcomingEvents("bad")).rejects.toMatchObject({
      message: expect.stringContaining("Invalid Team ID")
    });
  });
});
