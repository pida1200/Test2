import { describe, expect, it } from "vitest";
import {
  resolveEffectiveSport,
  resolveSportFromQuery
} from "../src/ui/sportTheSportsDbFormUtils.js";

const sports = [{ name: "Soccer" }, { name: "Ice Hockey" }];

describe("sportTheSportsDbFormUtils", () => {
  it("resolveSportFromQuery maps Czech aliases", () => {
    expect(resolveSportFromQuery("fotbal", sports)).toBe("Soccer");
    expect(resolveSportFromQuery("hokej", sports)).toBe("Ice Hockey");
  });

  it("resolveSportFromQuery matches exact sport names", () => {
    expect(resolveSportFromQuery("soccer", sports)).toBe("Soccer");
    expect(resolveSportFromQuery("unknown", sports)).toBeNull();
  });

  it("resolveEffectiveSport prefers selected sport", () => {
    expect(resolveEffectiveSport("", "Soccer", sports)).toBe("Soccer");
    expect(resolveEffectiveSport("fotbal", null, sports)).toBe("Soccer");
  });
});
