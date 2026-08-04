import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { LineChart } from "@mui/x-charts/LineChart";
import { muiAppDataGridTheme } from "./muiAppDataGridTheme.js";
import {
  collectNumericValues,
  formatAxisTime,
  formatChartTemperature,
  hasNumericSeries,
  isTemperatureMetric,
  metricChartColor,
  temperatureYAxisDomainLimit,
  type MetricHistoryPoint
} from "./dashboardMetricChartUtils.js";
import StateTimelineChart from "./StateTimelineChart.js";
import {
  muiChartLineTooltipSlotProps,
  muiChartSx,
  muiLineChartHeight,
  muiLineChartModalHeight,
  muiLineChartMargin
} from "./testUiChartTheme.js";

type Props = Readonly<{
  metricKey: string;
  points: MetricHistoryPoint[];
  windowMinutes: number;
  variant?: "default" | "modal";
}>;

function formatLineChartTooltipValue(
  metricKey: string,
  value: number | null | undefined
): string {
  if (value === null || value === undefined) {
    return isTemperatureMetric(metricKey) ? formatChartTemperature(null) : "";
  }
  if (isTemperatureMetric(metricKey)) {
    return formatChartTemperature(Number(value));
  }
  return String(value);
}

function NumericLineChart({
  metricKey,
  points,
  windowMinutes,
  chartHeight
}: Readonly<{
  metricKey: string;
  points: MetricHistoryPoint[];
  windowMinutes: number;
  chartHeight: number;
}>) {
  const x = points.map((p) => new Date(p.ts));
  const y = points.map((p) => p.numeric as number);
  const color = metricChartColor(metricKey);
  const nums = collectNumericValues(points);
  const yAxisConfig =
    isTemperatureMetric(metricKey) && nums.length > 0
      ? {
          label: "°C",
          domainLimit: () =>
            temperatureYAxisDomainLimit(Math.min(...nums), Math.max(...nums))
        }
      : {};

  return (
    <LineChart
      height={chartHeight}
      margin={muiLineChartMargin}
      xAxis={[
        {
          data: x,
          scaleType: "time",
          tickNumber: 6,
          valueFormatter: (value) => {
            const ms = value instanceof Date ? value.getTime() : Number(value);
            return formatAxisTime(ms, windowMinutes);
          }
        }
      ]}
      yAxis={[yAxisConfig]}
      series={[
        {
          id: metricKey,
          data: y,
          label: metricKey,
          color,
          showMark: false,
          valueFormatter: (value) => formatLineChartTooltipValue(metricKey, value)
        }
      ]}
      grid={{ horizontal: true }}
      slotProps={muiChartLineTooltipSlotProps}
      sx={muiChartSx}
    />
  );
}

export default function DashboardMetricChart({
  metricKey,
  points,
  windowMinutes,
  variant = "default"
}: Props) {
  const chartHeight = variant === "modal" ? muiLineChartModalHeight : muiLineChartHeight;
  const chartClass =
    variant === "modal" ? "dashboardMetricChart dashboardMetricChartModal" : "dashboardMetricChart";
  if (points.length === 0) {
    return <p className="muted">Pro tuto hodnotu zatím není graf.</p>;
  }

  if (!hasNumericSeries(points) && points.length < 2) {
    return <p className="muted">Pro tuto hodnotu zatím není graf.</p>;
  }

  if (!hasNumericSeries(points)) {
    return (
      <div className={chartClass} role="img" aria-label={`Graf metriky ${metricKey}`}>
        <StateTimelineChart points={points} windowMinutes={windowMinutes} variant={variant} />
      </div>
    );
  }

  return (
    <ThemeProvider theme={muiAppDataGridTheme}>
      <CssBaseline />
      <div className={chartClass} role="img" aria-label={`Graf metriky ${metricKey}`}>
        <NumericLineChart
          metricKey={metricKey}
          points={points}
          windowMinutes={windowMinutes}
          chartHeight={chartHeight}
        />
      </div>
    </ThemeProvider>
  );
}
