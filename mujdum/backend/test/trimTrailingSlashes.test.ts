import { describe, expect, it } from "vitest";
import { trimTrailingSlashes } from "../src/trimTrailingSlashes.js";

describe("trimTrailingSlashes", () => {
  it("removes trailing slashes", () => {
    expect(trimTrailingSlashes("http://example.com/")).toBe("http://example.com");
    expect(trimTrailingSlashes("http://example.com///")).toBe("http://example.com");
  });

  it("leaves url without trailing slash unchanged", () => {
    expect(trimTrailingSlashes("http://example.com")).toBe("http://example.com");
  });

  it("preserves slashes in path and scheme", () => {
    expect(trimTrailingSlashes("http://example.com/api/v1/")).toBe(
      "http://example.com/api/v1"
    );
    expect(trimTrailingSlashes("http://example.com/a/b")).toBe("http://example.com/a/b");
  });

  it("handles empty and slash-only strings", () => {
    expect(trimTrailingSlashes("")).toBe("");
    expect(trimTrailingSlashes("/")).toBe("");
    expect(trimTrailingSlashes("///")).toBe("");
  });
});
