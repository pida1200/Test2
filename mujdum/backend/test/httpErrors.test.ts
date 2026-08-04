import { describe, expect, it } from "vitest";
import { HttpError } from "../src/httpErrors.js";

describe("HttpError.toBody", () => {
  it("omits issues when none were provided", () => {
    const body = new HttpError(404, "NOT_FOUND", "Route not found").toBody();
    expect(body).toEqual({ error: { code: "NOT_FOUND", message: "Route not found" } });
    expect("issues" in body.error).toBe(false);
  });

  it("includes issues when provided", () => {
    const issues = [{ path: "name", message: "Povinné pole" }];
    const body = new HttpError(400, "VALIDATION_ERROR", "Invalid", { issues }).toBody();
    expect(body).toEqual({
      error: { code: "VALIDATION_ERROR", message: "Invalid", issues }
    });
  });
});
