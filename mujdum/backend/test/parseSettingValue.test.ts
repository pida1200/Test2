import { describe, expect, it } from "vitest";
import { parseOptionalNumber, parseSettingNumber } from "../src/parseSettingValue.js";

describe("parseSettingValue", () => {
  it("parseOptionalNumber accepts numbers and numeric strings", () => {
    expect(parseOptionalNumber(42)).toBe(42);
    expect(parseOptionalNumber("12.5")).toBe(12.5);
    expect(parseOptionalNumber("n/a")).toBeNaN();
    expect(parseOptionalNumber(null)).toBeNull();
  });

  it("parseSettingNumber returns NaN for invalid values", () => {
    expect(parseSettingNumber(10)).toBe(10);
    expect(Number.isNaN(parseSettingNumber(undefined))).toBe(true);
  });
});
