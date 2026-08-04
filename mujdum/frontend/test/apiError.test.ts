import { describe, expect, it } from "vitest";
import { getApiErrorMessage } from "../src/apiError.js";

describe("getApiErrorMessage", () => {
  it("reads envelope message", () => {
    expect(
      getApiErrorMessage(
        { error: { code: "VALIDATION_ERROR", message: "name is required" } },
        "fallback"
      )
    ).toBe("name is required");
  });

  it("supports legacy string error", () => {
    expect(getApiErrorMessage({ error: "starý formát" }, "fallback")).toBe(
      "starý formát"
    );
  });

  it("returns fallback for unknown body", () => {
    expect(getApiErrorMessage(null, "fallback")).toBe("fallback");
  });

  it("returns fallback when error object has no message", () => {
    expect(getApiErrorMessage({ error: { code: "X", message: "  " } }, "fallback")).toBe(
      "fallback"
    );
  });

  it("returns fallback for non-object error envelope", () => {
    expect(getApiErrorMessage({ error: 42 }, "fallback")).toBe("fallback");
  });
});
