import { describe, expect, it } from "vitest";
import {
  externalIdFromLookupRecord,
  THESPORTSDB_DEMO_API_KEYS
} from "../src/sports/theSportsDbClient.js";

describe("TheSportsDB lookup helpers", () => {
  it("demo keys skip strict lookup", () => {
    expect(THESPORTSDB_DEMO_API_KEYS.has("123")).toBe(true);
    expect(THESPORTSDB_DEMO_API_KEYS.has("1")).toBe(true);
  });

  it("externalIdFromLookupRecord reads idTeam", () => {
    expect(externalIdFromLookupRecord({ idTeam: "134007" }, "idTeam")).toBe("134007");
  });
});
