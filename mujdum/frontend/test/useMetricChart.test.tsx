import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useMetricChart } from "../src/ui/useMetricChart.js";

const samplePoints = [
  { ts: "2026-01-01T00:00:00.000Z", value: 20, numeric: 20 },
  { ts: "2026-01-01T01:00:00.000Z", value: 21, numeric: 21 }
];

describe("useMetricChart", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("openChart loads metric history", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ key: "temp_x", minutes: 360, points: samplePoints })
    } as Response);

    const { result } = renderHook(() => useMetricChart());
    await act(async () => {
      await result.current.openChart("temp_x", "Teplota");
    });

    await waitFor(() => expect(result.current.chart?.loading).toBe(false));
    expect(result.current.chart?.points).toHaveLength(2);
  });

  it("closeChart clears state", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ key: "temp_x", minutes: 360, points: samplePoints })
    } as Response);

    const { result } = renderHook(() => useMetricChart());
    await act(async () => {
      await result.current.openChart("temp_x", "Teplota");
    });
    await waitFor(() => expect(result.current.chart).not.toBeNull());

    act(() => {
      result.current.closeChart();
    });
    expect(result.current.chart).toBeNull();
  });

  it("openElectricityChart loads production and consumption", async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input);
      const key = url.includes("production") ? "production" : "consumption";
      return {
        ok: true,
        json: async () => ({
          key,
          minutes: 1440,
          points: samplePoints
        })
      } as Response;
    });

    const { result } = renderHook(() => useMetricChart());
    await act(async () => {
      await result.current.openElectricityChart();
    });

    await waitFor(() => expect(result.current.chart?.loading).toBe(false));
    expect(result.current.chart?.electricity?.production).toHaveLength(2);
    expect(result.current.chart?.electricity?.consumption).toHaveLength(2);
  });

  it("stores API error message when history fails", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: { code: "X", message: "Historie nedostupná" } })
    } as Response);

    const { result } = renderHook(() => useMetricChart());
    await act(async () => {
      await result.current.openChart("temp_x", "Teplota");
    });

    await waitFor(() => expect(result.current.chart?.error).toBe("Historie nedostupná"));
  });

  it("setChartWindow reloads open metric chart", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ key: "temp_x", minutes: 360, points: samplePoints })
    } as Response);

    const { result } = renderHook(() => useMetricChart());
    await act(async () => {
      await result.current.openChart("temp_x", "Teplota");
    });
    await waitFor(() => expect(result.current.chart?.loading).toBe(false));

    await act(async () => {
      await result.current.setChartWindow(24 * 60);
    });

    await waitFor(() => expect(result.current.chart?.minutes).toBe(24 * 60));
  });

  it("setElectricityView loads energy buckets for month window", async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/electricity/energy")) {
        return {
          ok: true,
          json: async () => ({
            period: "month",
            anchor: "2026-05",
            bucketUnit: "week",
            buckets: [{ key: "2026-05-05", from: "", to: "", producedKwh: 1, consumedKwh: 2 }]
          })
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({ key: "x", minutes: 30 * 24 * 60, points: samplePoints })
      } as Response;
    });

    const { result } = renderHook(() => useMetricChart());
    await act(async () => {
      await result.current.openElectricityChart();
    });
    await waitFor(() => expect(result.current.chart?.loading).toBe(false));

    await act(async () => {
      await result.current.setChartWindow(30 * 24 * 60);
    });
    await waitFor(() => expect(result.current.chart?.electricityView).toBe("bars"));

    await act(async () => {
      await result.current.setElectricityView("line");
    });
    await waitFor(() => expect(result.current.chart?.electricityView).toBe("line"));
  });

  it("shiftChartPeriod and resetChartToCurrentPeriod navigate calendar day", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ key: "temp_x", minutes: 24 * 60, points: samplePoints })
    } as Response);

    const { result } = renderHook(() => useMetricChart());
    await act(async () => {
      await result.current.openChart("temp_x", "Teplota");
    });
    await act(async () => {
      await result.current.setChartWindow(24 * 60);
    });
    await waitFor(() => expect(result.current.chart?.minutes).toBe(24 * 60));

    const anchorBefore = result.current.chart?.periodAnchor;
    await act(async () => {
      await result.current.shiftChartPeriod(-1);
    });
    await waitFor(() =>
      expect(result.current.chart?.periodAnchor).not.toBe(anchorBefore)
    );

    await act(async () => {
      await result.current.resetChartToCurrentPeriod();
    });
    await waitFor(() =>
      expect(result.current.chart?.periodAnchor).toBe(result.current.currentPeriodAnchor("day"))
    );
  });
});
