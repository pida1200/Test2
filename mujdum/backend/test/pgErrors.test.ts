import { describe, expect, it } from "vitest";
import { defaultActiveFlag, firstQueryRow, isPgUniqueViolation } from "../src/pgErrors.js";

describe("pgErrors", () => {
  it("isPgUniqueViolation detects postgres unique code", () => {
    expect(isPgUniqueViolation({ code: "23505" })).toBe(true);
    expect(isPgUniqueViolation({ code: "23503" })).toBe(false);
    expect(isPgUniqueViolation(null)).toBe(false);
    expect(isPgUniqueViolation("x")).toBe(false);
  });

  it("defaultActiveFlag treats only explicit false as inactive", () => {
    expect(defaultActiveFlag(undefined)).toBe(true);
    expect(defaultActiveFlag(true)).toBe(true);
    expect(defaultActiveFlag(false)).toBe(false);
  });

  it("firstQueryRow returns first row or throws", () => {
    expect(firstQueryRow([{ id: 1 }], "missing")).toEqual({ id: 1 });
    expect(() => firstQueryRow([], "missing")).toThrow("missing");
  });
});
