import { useCallback, useState } from "react";
import { getApiErrorMessage } from "../apiError.js";
import {
  CHART_DAY_WINDOW_MINUTES,
  chartCalendarPeriodKind,
  chartPeriodNavNextLabel,
  chartPeriodNavPrevLabel,
  chartSupportsCalendarNav,
  currentPeriodAnchor,
  defaultElectricityViewForWindow,
  ELECTRICITY_COMBINED_CHART_KEY,
  ELECTRICITY_CONSUMPTION_KEY,
  ELECTRICITY_PRODUCTION_KEY,
  electricitySupportsBars,
  formatChartPeriodLabel,
  isCurrentPeriod,
  isElectricityCombinedChart,
  isPeriodAnchorInFuture,
  periodBoundsIso,
  shiftPeriodAnchor,
  type ElectricityChartView,
  type ElectricityEnergyBuckets,
  type MetricHistoryPoint
} from "./dashboardMetricChartUtils.js";

export const CHART_TIME_WINDOWS = [
  { label: "6h", minutes: 6 * 60 },
  { label: "12h", minutes: 12 * 60 },
  { label: "24h", minutes: 24 * 60 },
  { label: "týden", minutes: 7 * 24 * 60 },
  { label: "měsíc", minutes: 30 * 24 * 60 },
  { label: "rok", minutes: 365 * 24 * 60 }
] as const;

type MetricHistoryResponse = {
  key: string;
  minutes: number;
  from?: string;
  to?: string;
  points: MetricHistoryPoint[];
};

type MetricHistoryQuery =
  | { kind: "minutes"; minutes: number }
  | { kind: "range"; from: string; to: string };

export type ChartState = {
  key: string;
  title: string;
  minutes: number;
  periodAnchor: string | null;
  loading: boolean;
  points: MetricHistoryPoint[] | null;
  electricity: {
    production: MetricHistoryPoint[];
    consumption: MetricHistoryPoint[];
  } | null;
  electricityView: ElectricityChartView;
  electricityEnergy: ElectricityEnergyBuckets | null;
  error: string | null;
};

export function useMetricChart() {
  const [chart, setChart] = useState<ChartState | null>(null);

  const closeChart = useCallback(() => setChart(null), []);

  const fetchMetricHistory = useCallback(
    async (key: string, query: MetricHistoryQuery): Promise<MetricHistoryPoint[]> => {
      const qs =
        query.kind === "minutes"
          ? `minutes=${query.minutes}`
          : `from=${encodeURIComponent(query.from)}&to=${encodeURIComponent(query.to)}`;
      const res = await fetch(
        `/api/dashboard/metrics/${encodeURIComponent(key)}/history?${qs}`
      );
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(getApiErrorMessage(json, "Nepodařilo se načíst historii."));
      }
      const json = (await res.json()) as MetricHistoryResponse;
      return json.points;
    },
    []
  );

  const fetchElectricityEnergy = useCallback(
    async (period: "month" | "year", anchor: string): Promise<ElectricityEnergyBuckets> => {
      const res = await fetch(
        `/api/dashboard/electricity/energy?period=${period}&anchor=${encodeURIComponent(anchor)}`
      );
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(getApiErrorMessage(json, "Nepodařilo se načíst energii."));
      }
      return (await res.json()) as ElectricityEnergyBuckets;
    },
    []
  );

  const buildHistoryQuery = useCallback(
    (minutes: number, periodAnchor: string | null): MetricHistoryQuery => {
      const kind = chartCalendarPeriodKind(minutes);
      if (kind && periodAnchor) {
        const { from, to } = periodBoundsIso(kind, periodAnchor);
        return { kind: "range", from, to };
      }
      return { kind: "minutes", minutes };
    },
    []
  );

  const loadChart = useCallback(
    async (
      key: string,
      title: string,
      opts: Readonly<{ minutes: number; periodAnchor: string | null }>
    ) => {
      const query = buildHistoryQuery(opts.minutes, opts.periodAnchor);
      setChart({
        key,
        title,
        minutes: opts.minutes,
        periodAnchor: opts.periodAnchor,
        loading: true,
        points: null,
        electricity: null,
        electricityView: "line",
        electricityEnergy: null,
        error: null
      });
      try {
        const points = await fetchMetricHistory(key, query);
        setChart((c) =>
          c
            ? {
                ...c,
                loading: false,
                points,
                minutes: opts.minutes,
                periodAnchor: opts.periodAnchor
              }
            : c
        );
      } catch (e) {
        setChart((c) =>
          c
            ? {
                ...c,
                loading: false,
                error:
                  e instanceof Error ? e.message : "Nepodařilo se načíst historii."
              }
            : c
        );
      }
    },
    [buildHistoryQuery, fetchMetricHistory]
  );

  const loadElectricityChart = useCallback(
    async (
      title: string,
      opts: Readonly<{ minutes: number; periodAnchor: string | null; view: ElectricityChartView }>
    ) => {
      const kind = chartCalendarPeriodKind(opts.minutes);
      const useBars =
        opts.view === "bars" &&
        (kind === "month" || kind === "year") &&
        opts.periodAnchor !== null;
      setChart({
        key: ELECTRICITY_COMBINED_CHART_KEY,
        title,
        minutes: opts.minutes,
        periodAnchor: opts.periodAnchor,
        loading: true,
        points: null,
        electricity: null,
        electricityView: useBars ? "bars" : "line",
        electricityEnergy: null,
        error: null
      });
      try {
        if (useBars && opts.periodAnchor) {
          const period: "month" | "year" = kind === "year" ? "year" : "month";
          const energy = await fetchElectricityEnergy(period, opts.periodAnchor);
          setChart((c) =>
            c
              ? {
                  ...c,
                  loading: false,
                  minutes: opts.minutes,
                  periodAnchor: opts.periodAnchor,
                  electricityView: "bars",
                  electricityEnergy: energy
                }
              : c
          );
          return;
        }
        const query = buildHistoryQuery(opts.minutes, opts.periodAnchor);
        const [production, consumption] = await Promise.all([
          fetchMetricHistory(ELECTRICITY_PRODUCTION_KEY, query),
          fetchMetricHistory(ELECTRICITY_CONSUMPTION_KEY, query)
        ]);
        setChart((c) =>
          c
            ? {
                ...c,
                loading: false,
                minutes: opts.minutes,
                periodAnchor: opts.periodAnchor,
                electricityView: "line",
                electricity: { production, consumption }
              }
            : c
        );
      } catch (e) {
        setChart((c) =>
          c
            ? {
                ...c,
                loading: false,
                error:
                  e instanceof Error ? e.message : "Nepodařilo se načíst historii."
              }
            : c
        );
      }
    },
    [buildHistoryQuery, fetchElectricityEnergy, fetchMetricHistory]
  );

  const openChart = useCallback(
    async (key: string, title: string) => {
      await loadChart(key, title, { minutes: 6 * 60, periodAnchor: null });
    },
    [loadChart]
  );

  const defaultPeriodAnchorForWindow = useCallback((minutes: number): string | null => {
    const kind = chartCalendarPeriodKind(minutes);
    return kind ? currentPeriodAnchor(kind) : null;
  }, []);

  const openElectricityChart = useCallback(async () => {
    await loadElectricityChart("Elektřina • Výroba a spotřeba", {
      minutes: CHART_DAY_WINDOW_MINUTES,
      periodAnchor: currentPeriodAnchor("day"),
      view: "line"
    });
  }, [loadElectricityChart]);

  const setChartWindow = useCallback(
    async (minutes: number) => {
      if (!chart) return;
      const periodAnchor = defaultPeriodAnchorForWindow(minutes);
      if (isElectricityCombinedChart(chart.key)) {
        await loadElectricityChart(chart.title, {
          minutes,
          periodAnchor,
          view: defaultElectricityViewForWindow(minutes)
        });
        return;
      }
      await loadChart(chart.key, chart.title, { minutes, periodAnchor });
    },
    [chart, defaultPeriodAnchorForWindow, loadChart, loadElectricityChart]
  );

  const setElectricityView = useCallback(
    async (view: ElectricityChartView) => {
      const c = chart;
      if (!c || !isElectricityCombinedChart(c.key)) return;
      await loadElectricityChart(c.title, {
        minutes: c.minutes,
        periodAnchor: c.periodAnchor,
        view
      });
    },
    [chart, loadElectricityChart]
  );

  const reloadOpenChart = useCallback(
    async (opts: Readonly<{ minutes: number; periodAnchor: string | null }>) => {
      const c = chart;
      if (!c) return;
      if (isElectricityCombinedChart(c.key)) {
        await loadElectricityChart(c.title, { ...opts, view: c.electricityView });
        return;
      }
      await loadChart(c.key, c.title, opts);
    },
    [chart, loadChart, loadElectricityChart]
  );

  const setChartPeriodAnchor = useCallback(
    async (anchor: string) => {
      const c = chart;
      if (!c) return;
      await reloadOpenChart({ minutes: c.minutes, periodAnchor: anchor });
    },
    [chart, reloadOpenChart]
  );

  const resetChartToCurrentPeriod = useCallback(async () => {
    const c = chart;
    if (!c) return;
    const kind = chartCalendarPeriodKind(c.minutes);
    if (!kind) return;
    await reloadOpenChart({
      minutes: c.minutes,
      periodAnchor: currentPeriodAnchor(kind)
    });
  }, [chart, reloadOpenChart]);

  const shiftChartPeriod = useCallback(
    async (delta: number) => {
      const c = chart;
      if (!c) return;
      const kind = chartCalendarPeriodKind(c.minutes);
      if (!kind) return;
      const base = c.periodAnchor ?? currentPeriodAnchor(kind);
      const next = shiftPeriodAnchor(kind, base, delta);
      if (isPeriodAnchorInFuture(kind, next)) return;
      await setChartPeriodAnchor(next);
    },
    [chart, setChartPeriodAnchor]
  );

  return {
    chart,
    closeChart,
    openChart,
    openElectricityChart,
    setChartWindow,
    setElectricityView,
    electricitySupportsBars,
    shiftChartPeriod,
    resetChartToCurrentPeriod,
    chartSupportsCalendarNav,
    chartCalendarPeriodKind,
    chartPeriodNavPrevLabel,
    chartPeriodNavNextLabel,
    formatChartPeriodLabel,
    isCurrentPeriod,
    isPeriodAnchorInFuture,
    isElectricityCombinedChart,
    currentPeriodAnchor,
    CHART_TIME_WINDOWS
  };
}
