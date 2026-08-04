import { describe, expect, it, vi } from "vitest";
import { TheSportsDbError } from "../src/sports/theSportsDbErrors.js";
import {
  attemptJsonFetch,
  isRetryableFetchError,
  parseJsonBody,
  sleep
} from "../src/sports/theSportsDbFetch.js";

describe("theSportsDbFetch", () => {
  it("isRetryableFetchError detects network failures", () => {
    expect(isRetryableFetchError(new Error("fetch failed"))).toBe(true);
    expect(isRetryableFetchError(Object.assign(new Error("x"), { name: "AbortError" }))).toBe(
      true
    );
    expect(isRetryableFetchError(new Error("validation"))).toBe(false);
  });

  it("parseJsonBody parses valid JSON", () => {
    expect(parseJsonBody("{ \"ok\": true }", "path", 200)).toEqual({ ok: true });
  });

  it("parseJsonBody throws TheSportsDbError on invalid JSON", () => {
    expect(() => parseJsonBody("{", "path", 200)).toThrow(TheSportsDbError);
  });

  it("attemptJsonFetch returns success", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );
    const result = await attemptJsonFetch<{ ok: boolean }>(fetchFn, "http://x", "path");
    expect(result).toEqual({ kind: "success", data: { ok: true } });
  });

  it("attemptJsonFetch retries on 429", async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response("rate limit", { status: 429 }));
    const result = await attemptJsonFetch(fetchFn, "http://x", "path");
    expect(result.kind).toBe("retry");
  });

  it("attemptJsonFetch fatals on 404", async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response("missing", { status: 404 }));
    const result = await attemptJsonFetch(fetchFn, "http://x", "path");
    expect(result.kind).toBe("fatal");
  });

  it("sleep resolves after delay", async () => {
    vi.useFakeTimers();
    const p = sleep(50);
    vi.advanceTimersByTime(50);
    await expect(p).resolves.toBeUndefined();
    vi.useRealTimers();
  });

  it("attemptJsonFetch retries on network errors", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("fetch failed"));
    const result = await attemptJsonFetch(fetchFn, "http://x", "path");
    expect(result.kind).toBe("retry");
  });

  it("attemptJsonFetch retries on 502/503/504", async () => {
    for (const status of [502, 503, 504]) {
      const fetchFn = vi.fn().mockResolvedValue(new Response("upstream", { status }));
      const result = await attemptJsonFetch(fetchFn, "http://x", "path");
      expect(result.kind).toBe("retry");
    }
  });

  it("attemptJsonFetch fatals on non-retryable errors", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("validation failed"));
    const result = await attemptJsonFetch(fetchFn, "http://x", "path");
    expect(result.kind).toBe("fatal");
  });

  it("isRetryableFetchError detects network keywords", () => {
    expect(isRetryableFetchError(new Error("network timeout"))).toBe(true);
    expect(isRetryableFetchError(new Error("ECONNRESET"))).toBe(true);
    expect(isRetryableFetchError("x")).toBe(false);
  });
});
