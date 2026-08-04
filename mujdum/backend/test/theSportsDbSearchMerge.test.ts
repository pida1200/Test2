import { describe, expect, it } from "vitest";
import { mergeCuratedAndApiSearch } from "../src/sports/theSportsDbSearchMerge.js";

type Item = { id: string; sport: string | null; name: string };

describe("mergeCuratedAndApiSearch", () => {
  it("merges curated hints and api rows without duplicates", () => {
    const curated: Item[] = [{ id: "1", sport: "Soccer", name: "A" }];
    const apiRows = [{ idTeam: "2", strTeam: "B", strSport: "Soccer" }];

    const results = mergeCuratedAndApiSearch({
      curated,
      sportFilter: "soccer",
      maxResults: 5,
      getId: (item) => item.id,
      apiRows,
      normalizeRow: (row) => {
        const id = String(row.idTeam ?? "");
        const name = String(row.strTeam ?? "");
        if (!id || !name) return null;
        return { id, name, sport: String(row.strSport ?? "") };
      }
    });

    expect(results.map((r) => r.id)).toEqual(["1", "2"]);
  });

  it("respects maxResults and sport filter", () => {
    const results = mergeCuratedAndApiSearch({
      curated: [
        { id: "1", sport: "Soccer", name: "A" },
        { id: "2", sport: "Tennis", name: "B" }
      ],
      sportFilter: "soccer",
      maxResults: 1,
      getId: (item) => item.id,
      apiRows: [],
      normalizeRow: () => null
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe("1");
  });
});
