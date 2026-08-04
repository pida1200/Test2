import { describe, expect, it } from "vitest";
import {
  findCuratedTeamSearchHints,
  normalizeSportParam,
  teamNameMatchesQuery
} from "../src/sports/theSportsDbTeamSearch.js";

describe("theSportsDbTeamSearch", () => {
  it("normalizeSportParam maps Fotbal to Soccer", () => {
    expect(normalizeSportParam("Fotbal")).toBe("Soccer");
    expect(normalizeSportParam("Soccer")).toBe("Soccer");
  });

  it("findCuratedTeamSearchHints accepts Fotbal sport param", () => {
    const items = findCuratedTeamSearchHints("slavie", "Fotbal");
    expect(items[0]?.thesportsdb_team_id).toBe("136036");
  });

  it("teamNameMatchesQuery matches slavie to Slavia", () => {
    expect(teamNameMatchesQuery("Slavia Prague", "slavie")).toBe(true);
    expect(teamNameMatchesQuery("Slavia Prague", "slavia")).toBe(true);
    expect(teamNameMatchesQuery("Arsenal", "slavie")).toBe(false);
  });

  it("findCuratedTeamSearchHints returns Slavia for Soccer", () => {
    const items = findCuratedTeamSearchHints("slavie", "Soccer");
    expect(items).toHaveLength(1);
    expect(items[0]?.thesportsdb_team_id).toBe("136036");
    expect(items[0]?.name).toContain("Slavia");
  });
});
