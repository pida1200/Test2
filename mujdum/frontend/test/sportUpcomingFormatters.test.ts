import { describe, expect, it } from "vitest";
import {
  formatSportEventStartsAt,
  sportEventMatchLabel,
  sportEventMetaLine
} from "../src/ui/sportUpcomingFormatters.js";

describe("sportUpcomingFormatters", () => {
  it("formatSportEventStartsAt returns fallback without date", () => {
    expect(formatSportEventStartsAt(null)).toBe("Čas neuveden");
  });

  it("sportEventMatchLabel prefers title", () => {
    expect(
      sportEventMatchLabel({
        title: "Finále",
        home_team: "A",
        away_team: "B"
      })
    ).toBe("Finále");
  });

  it("sportEventMetaLine joins league and source", () => {
    expect(
      sportEventMetaLine({
        league: "Fortuna liga",
        sport: "Soccer",
        team_name: "Sparta",
        player_name: null
      })
    ).toContain("Sparta");
  });
});
