import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDashboard } from "../src/ui/useDashboard.js";

describe("useDashboard", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("loads dashboard on mount", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ metrics: { temp: 20 }, updated_at: "2026-01-01T00:00:00.000Z" })
    } as Response);

    const { result } = renderHook(() => useDashboard({}));
    await waitFor(() => expect(result.current.dashboard?.metrics.temp).toBe(20));
  });

  it("calls onLoadError when fetch fails", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("network"));
    const onLoadError = vi.fn();

    renderHook(() => useDashboard({ onLoadError }));
    await waitFor(() =>
      expect(onLoadError).toHaveBeenCalledWith("Nepodařilo se načíst dashboard.")
    );
  });

  it("loadDashboard refreshes data", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ metrics: { a: 1 }, updated_at: null })
    } as Response);

    const { result } = renderHook(() => useDashboard({}));
    await waitFor(() => expect(result.current.dashboard).not.toBeNull());

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ metrics: { a: 2 }, updated_at: null })
    } as Response);

    await act(async () => {
      await result.current.loadDashboard();
    });
    expect(result.current.dashboard?.metrics.a).toBe(2);
  });
});
