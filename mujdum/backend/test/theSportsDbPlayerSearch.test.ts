import { describe, expect, it } from "vitest";
import {
  findCuratedPlayerSearchHints,
  findCuratedPlayerById
} from "../src/sports/theSportsDbPlayerSearch.js";
import {
  normalizePlayerSearchRecord,
  TheSportsDbClient
} from "../src/sports/theSportsDbClient.js";

describe("theSportsDbPlayerSearch", () => {
  it("findCuratedPlayerSearchHints finds Jagr for hokej", () => {
    const items = findCuratedPlayerSearchHints("jagr", "Hokej");
    expect(items[0]?.thesportsdb_player_id).toBe("34154641");
    expect(items[0]?.name).toContain("Jagr");
  });

  it("findCuratedPlayerById returns Jagr", () => {
    const player = findCuratedPlayerById("34154641");
    expect(player?.name).toContain("Jagr");
  });

  it("normalizePlayerSearchRecord maps API row", () => {
    const row = normalizePlayerSearchRecord({
      idPlayer: "34154641",
      strPlayer: "Jaromir Jagr",
      strSport: "Ice Hockey",
      strTeam: "Rytíři Kladno"
    });
    expect(row).toMatchObject({
      thesportsdb_player_id: "34154641",
      name: "Jaromir Jagr",
      sport: "Ice Hockey"
    });
  });

  it("searchPlayers on demo key returns curated Jagr", async () => {
    const client = new TheSportsDbClient({ apiKey: "123" });
    const items = await client.searchPlayers("jagr", "Ice Hockey");
    expect(items).toHaveLength(1);
    expect(items[0]?.thesportsdb_player_id).toBe("34154641");
  });

  it("verifyPlayerForDictionary uses curated on demo key", async () => {
    const client = new TheSportsDbClient({ apiKey: "123" });
    const verified = await client.verifyPlayerForDictionary("34154641", "Ice Hockey");
    expect(verified?.name).toContain("Jagr");
  });
});
