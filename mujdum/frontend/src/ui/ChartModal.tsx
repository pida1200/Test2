import { Suspense, lazy, useEffect, useRef } from "react";
import { runAsyncAction } from "./appUtils.js";
import {
  CHART_TIME_WINDOWS,
  type ChartState,
  type useMetricChart
} from "./useMetricChart.js";

const DashboardMetricChart = lazy(() => import("./DashboardMetricChart"));
const ElectricityCombinedChart = lazy(() => import("./ElectricityCombinedChart"));
const ElectricityEnergyBarChart = lazy(() => import("./ElectricityEnergyBarChart"));

type MetricChartApi = Pick<
  ReturnType<typeof useMetricChart>,
  | "closeChart"
  | "setChartWindow"
  | "setElectricityView"
  | "electricitySupportsBars"
  | "shiftChartPeriod"
  | "resetChartToCurrentPeriod"
  | "chartSupportsCalendarNav"
  | "chartCalendarPeriodKind"
  | "chartPeriodNavPrevLabel"
  | "chartPeriodNavNextLabel"
  | "formatChartPeriodLabel"
  | "isCurrentPeriod"
  | "isPeriodAnchorInFuture"
  | "isElectricityCombinedChart"
  | "currentPeriodAnchor"
>;

type Props = Readonly<{
  chart: ChartState;
  chartApi: MetricChartApi;
}>;

function ChartCalendarNav({
  chart,
  chartApi
}: Readonly<{
  chart: ChartState;
  chartApi: MetricChartApi;
}>) {
  if (!chartApi.chartSupportsCalendarNav(chart.minutes)) return null;

  const periodKind = chartApi.chartCalendarPeriodKind(chart.minutes);
  if (!periodKind) return null;

  const anchor = chart.periodAnchor ?? chartApi.currentPeriodAnchor(periodKind);

  return (
    <fieldset className="chartDayNav toolbarFieldset">
      <legend>Období grafu</legend>
      <button
        className="ghostButton chartDayNavButton"
        type="button"
        title={chartApi.chartPeriodNavPrevLabel(periodKind)}
        aria-label={chartApi.chartPeriodNavPrevLabel(periodKind)}
        disabled={chart.loading}
        onClick={runAsyncAction(() => chartApi.shiftChartPeriod(-1))}
      >
        -
      </button>
      <button
        className={`ghostButton chartDayNavButton chartDayNavButtonCenter ${
          chartApi.isCurrentPeriod(periodKind, anchor) ? "chartWindowButtonActive" : ""
        }`}
        type="button"
        disabled={chart.loading}
        {...(chartApi.isCurrentPeriod(periodKind, anchor)
          ? { "aria-current": "date" as const }
          : {})}
        onClick={runAsyncAction(() => chartApi.resetChartToCurrentPeriod())}
      >
        {chartApi.formatChartPeriodLabel(periodKind, anchor)}
      </button>
      <button
        className="ghostButton chartDayNavButton"
        type="button"
        title={chartApi.chartPeriodNavNextLabel(periodKind)}
        aria-label={chartApi.chartPeriodNavNextLabel(periodKind)}
        disabled={chart.loading || chartApi.isPeriodAnchorInFuture(periodKind, anchor)}
        onClick={runAsyncAction(() => chartApi.shiftChartPeriod(1))}
      >
        +
      </button>
    </fieldset>
  );
}

function ElectricityViewToggle({
  chart,
  chartApi
}: Readonly<{
  chart: ChartState;
  chartApi: MetricChartApi;
}>) {
  if (
    !chartApi.isElectricityCombinedChart(chart.key) ||
    !chartApi.electricitySupportsBars(chart.minutes)
  ) {
    return null;
  }

  return (
    <fieldset className="chartViewToggle toolbarFieldset">
      <legend>Typ grafu elektřiny</legend>
      <button
        type="button"
        className={`ghostButton chartWindowButton ${
          chart.electricityView === "bars" ? "chartWindowButtonActive" : ""
        }`}
        disabled={chart.loading}
        {...(chart.electricityView === "bars" ? { "aria-current": "true" as const } : {})}
        onClick={runAsyncAction(() => chartApi.setElectricityView("bars"))}
      >
        Sloupce
      </button>
      <button
        type="button"
        className={`ghostButton chartWindowButton ${
          chart.electricityView === "line" ? "chartWindowButtonActive" : ""
        }`}
        disabled={chart.loading}
        {...(chart.electricityView === "line" ? { "aria-current": "true" as const } : {})}
        onClick={runAsyncAction(() => chartApi.setElectricityView("line"))}
      >
        Čára
      </button>
    </fieldset>
  );
}

function ChartModalBody({
  chart,
  chartApi
}: Readonly<{
  chart: ChartState;
  chartApi: MetricChartApi;
}>) {
  if (chart.loading) {
    return <p className="muted chartModalStatus">Načítám…</p>;
  }

  if (chart.error) {
    return <div className="error chartModalStatus">{chart.error}</div>;
  }

  if (
    chartApi.isElectricityCombinedChart(chart.key) &&
    chart.electricityView === "bars" &&
    chart.electricityEnergy
  ) {
    return (
      <div className="chartBox chartModalChartBox">
        <Suspense fallback={<p className="muted">Načítám graf…</p>}>
          <ElectricityEnergyBarChart
            buckets={chart.electricityEnergy.buckets}
            bucketUnit={chart.electricityEnergy.bucketUnit}
            variant="modal"
          />
        </Suspense>
      </div>
    );
  }

  if (chartApi.isElectricityCombinedChart(chart.key) && chart.electricity) {
    return (
      <div className="chartBox chartModalChartBox">
        <Suspense fallback={<p className="muted">Načítám graf…</p>}>
          <ElectricityCombinedChart
            production={chart.electricity.production}
            consumption={chart.electricity.consumption}
            windowMinutes={chart.minutes}
            variant="modal"
          />
        </Suspense>
      </div>
    );
  }

  if (chart.points) {
    return (
      <div className="chartBox chartModalChartBox">
        <Suspense fallback={<p className="muted">Načítám graf…</p>}>
          <DashboardMetricChart
            metricKey={chart.key}
            points={chart.points}
            windowMinutes={chart.minutes}
            variant="modal"
          />
        </Suspense>
      </div>
    );
  }

  return <p className="muted chartModalStatus">—</p>;
}

export function ChartModal({ chart, chartApi }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="modalOverlay"
      aria-labelledby="chart-modal-title"
      onCancel={(event) => {
        event.preventDefault();
        chartApi.closeChart();
      }}
      onClose={chartApi.closeChart}
    >
      <button
        type="button"
        className="modalBackdrop"
        aria-label="Zavřít"
        onClick={chartApi.closeChart}
      />
      <div className="modalCard chartModalCard">
        <div className="modalHeader chartModalHeader">
          <div className="modalTitle" id="chart-modal-title">
            {chart.title}
          </div>
          <ChartCalendarNav chart={chart} chartApi={chartApi} />
          <fieldset className="chartModalWindowButtons toolbarFieldset">
            <legend>Časové okno grafu</legend>
            {CHART_TIME_WINDOWS.map((w) => (
              <button
                key={w.minutes}
                className={`ghostButton chartWindowButton ${
                  chart.minutes === w.minutes ? "chartWindowButtonActive" : ""
                }`}
                type="button"
                onClick={runAsyncAction(() => chartApi.setChartWindow(w.minutes))}
                disabled={chart.loading}
                {...(chart.minutes === w.minutes ? { "aria-current": "true" as const } : {})}
              >
                {w.label}
              </button>
            ))}
          </fieldset>
          <ElectricityViewToggle chart={chart} chartApi={chartApi} />
          <button className="ghostButton" type="button" onClick={chartApi.closeChart}>
            Zavřít
          </button>
        </div>
        <div className="modalBody chartModalBody">
          <ChartModalBody chart={chart} chartApi={chartApi} />
        </div>
      </div>
    </dialog>
  );
}
