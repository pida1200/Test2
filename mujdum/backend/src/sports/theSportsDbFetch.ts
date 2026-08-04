import { TheSportsDbError } from "./theSportsDbErrors.js";

type FetchFn = typeof fetch;

const RETRYABLE_HTTP_STATUSES = new Set([429, 502, 503, 504]);

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isRetryableFetchError(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  const msg = e.message.toLowerCase();
  return (
    e.name === "AbortError" ||
    msg.includes("fetch failed") ||
    msg.includes("network") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout")
  );
}

export function parseJsonBody<T>(body: string, path: string, httpStatus: number): T {
  try {
    return JSON.parse(body) as T;
  } catch {
    throw new TheSportsDbError(
      `TheSportsDB ${path} returned invalid JSON`,
      httpStatus,
      body.slice(0, 200)
    );
  }
}

export type FetchAttemptResult<T> =
  | { kind: "success"; data: T }
  | { kind: "retry"; error: TheSportsDbError }
  | { kind: "fatal"; error: unknown };

export async function attemptJsonFetch<T>(
  fetchFn: FetchFn,
  url: string,
  path: string
): Promise<FetchAttemptResult<T>> {
  try {
    const res = await fetchFn(url, {
      method: "GET",
      headers: { Accept: "application/json" }
    });
    const body = await res.text();
    if (!res.ok) {
      const err = new TheSportsDbError(
        `TheSportsDB ${path} failed (HTTP ${res.status})`,
        res.status,
        body
      );
      if (RETRYABLE_HTTP_STATUSES.has(res.status)) {
        return { kind: "retry", error: err };
      }
      return { kind: "fatal", error: err };
    }
    return { kind: "success", data: parseJsonBody<T>(body, path, res.status) };
  } catch (e) {
    if (e instanceof TheSportsDbError) {
      return { kind: "fatal", error: e };
    }
    if (isRetryableFetchError(e)) {
      return {
        kind: "retry",
        error: new TheSportsDbError(
          `TheSportsDB ${path} failed: ${e instanceof Error ? e.message : String(e)}`,
          0,
          ""
        )
      };
    }
    return { kind: "fatal", error: e };
  }
}
