import { describe, expect, it } from "vitest";
import {
  normalizeTeamSearchRecord,
  TheSportsDbClient
} from "../src/sports/theSportsDbClient.js";

describe("TheSportsDb search", () => {
  it("normalizeTeamSearchRecord maps API row", () => {
    const row = normalizeTeamSearchRecord({
      idTeam: "134007",
      strTeam: "Sparta Praha",
      strSport: "Soccer",
      strLeague: "Czech First League",
      strCountry: "Czech Republic"
    });
    expect(row).toMatchObject({
      thesportsdb_team_id: "134007",
      name: "Sparta Praha",
      sport: "Soccer",
      league: "Czech First League"
    });
  });

  it("searchTeams on demo key returns curated Slavia for slavie", async () => {
    const fetchFn = async () => {
      throw new Error("demo key must not call searchteams");
    };
    const client = new TheSportsDbClient({ apiKey: "123" }, fetchFn as typeof fetch);
    const items = await client.searchTeams("slavie", "Soccer");
    expect(items).toHaveLength(1);
    expect(items[0]?.thesportsdb_team_id).toBe("136036");
  });

  it("searchTeams filters unrelated API rows by query", async () => {
    const fetchFn = async () =>
      new Response(
        JSON.stringify({
          teams: [
            {
              idTeam: "133604",
              strTeam: "Arsenal",
              strSport: "Soccer",
              strLeague: "English Premier League"
            },
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

    const client = new TheSportsDbClient({ apiKey: "test-key" }, fetchFn as typeof fetch);
    const items = await client.searchTeams("Sparta", "Soccer");
    expect(items).toHaveLength(1);
    expect(items[0]?.thesportsdb_team_id).toBe("134007");
  });

  it("searchTeams filters by sport", async () => {
    const fetchFn = async (url: string | URL) => {
      expect(String(url)).toContain("searchteams.php?t=Sparta");
      return new Response(
        JSON.stringify({
          teams: [
            {
              idTeam: "134007",
              strTeam: "Sparta Praha",
              strSport: "Soccer",
              strLeague: "Czech First League"
            },
            {
              idTeam: "999",
              strTeam: "Other",
              strSport: "Ice Hockey",
              strLeague: "ELH"
            }
          ]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const client = new TheSportsDbClient({ apiKey: "test-key" }, fetchFn as typeof fetch);
    const items = await client.searchTeams("Sparta", "Soccer");
    expect(items).toHaveLength(1);
    expect(items[0]?.thesportsdb_team_id).toBe("134007");
  });

  it("listSports merges curated list when API returns few", async () => {
    const fetchFn = async () =>
      new Response(
        JSON.stringify({
          sports: [{ idSport: "102", strSport: "Soccer" }]
        }),
        { status: 200 }
      );

    const client = new TheSportsDbClient({ apiKey: "123" }, fetchFn as typeof fetch);
    const sports = await client.listSports();
    expect(sports.some((s) => s.name === "Soccer")).toBe(true);
    expect(sports.some((s) => s.name === "Ice Hockey")).toBe(true);
  });

  it("verifyTeamForDictionary uses curated data on demo key", async () => {
    const fetchFn = async () => {
      throw new Error("demo verify must not call lookupteam");
    };
    const client = new TheSportsDbClient({ apiKey: "123" }, fetchFn as typeof fetch);
    const verified = await client.verifyTeamForDictionary("136036", "Soccer");
    expect(verified?.name).toContain("Slavia");
    expect(verified?.thesportsdb_team_id).toBe("136036");
  });

  it("verifyTeamForDictionary rejects mismatched id on real key", async () => {
    const fetchFn = async () =>
      new Response(
        JSON.stringify({
          teams: [{ idTeam: "999", strTeam: "Wrong", strSport: "Soccer" }]
        }),
        { status: 200 }
      );

    const client = new TheSportsDbClient({ apiKey: "real-key" }, fetchFn as typeof fetch);
    const verified = await client.verifyTeamForDictionary("134007", "Soccer");
    expect(verified).toBeNull();
  });
});
