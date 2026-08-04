import { useMemo } from "react";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { LineChart } from "@mui/x-charts/LineChart";
import {
  alignMetricHistories,
  ELECTRICITY_CONSUMPTION_KEY,
  ELECTRICITY_PRODUCTION_KEY,
  formatAxisTime,
  formatChartPowerW,
  hasNumericSeries,
  powerYAxisDomainLimit,
  type MetricHistoryPoint
} from "./dashboardMetricChartUtils.js";
import { muiAppDataGridTheme } from "./muiAppDataGridTheme.js";
import {
  chartPowerColor,
  chartTempColor,
  muiChartLineTooltipSlotProps,
  muiChartSx,
  muiLineChartHeight,
  muiLineChartModalHeight,
  muiLineChartMargin
} from "./testUiChartTheme.js";

type Props = Readonly<{
  production: MetricHistoryPoint[];
  consumption: MetricHistoryPoint[];
  windowMinutes: number;
  variant?: "default" | "modal";
}>;

export default function ElectricityCombinedChart({
  production,
  consumption,
  windowMinutes,
  variant = "modal"
}: Props) {
  const chartHeight = variant === "modal" ? muiLineChartModalHeight : muiLineChartHeight;

  const chartModel = useMemo(() => {
    if (!hasNumericSeries(production) && !hasNumericSeries(consumption)) return null;

    const aligned = alignMetricHistories([
      { key: ELECTRICITY_PRODUCTION_KEY, points: production },
      { key: ELECTRICITY_CONSUMPTION_KEY, points: consumption }
    ]);
    if (aligned.x.length < 2) return null;

    const allValues = aligned.series.flatMap((s) =>
      s.values.filter((v): v is number => typeof v === "number")
    );
    if (allValues.length < 2) return null;

    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const yDomain = powerYAxisDomainLimit(min, max);

    const productionValues =
      aligned.series.find((s) => s.key === ELECTRICITY_PRODUCTION_KEY)?.values ?? [];
    const consumptionValues =
      aligned.series.find((s) => s.key === ELECTRICITY_CONSUMPTION_KEY)?.values ?? [];

    return { aligned, yDomain, productionValues, consumptionValues };
  }, [production, consumption]);

  if (!chartModel) {
    return <p className="muted">Pro graf zatím není dostatek dat.</p>;
  }

  const { aligned, yDomain, productionValues, consumptionValues } = chartModel;

  return (
    <ThemeProvider theme={muiAppDataGridTheme}>
      <CssBaseline />
      <div
        className={
          variant === "modal"
            ? "dashboardMetricChart dashboardMetricChartModal"
            : "dashboardMetricChart"
        }
        role="img"
        aria-label="Graf výroby a spotřeby elektřiny"
      >
        <LineChart
          height={chartHeight}
          skipAnimation
          margin={muiLineChartMargin}
          xAxis={[
            {
              data: aligned.x,
              scaleType: "time",
              tickNumber: 6,
              valueFormatter: (value) => {
                const ms = value instanceof Date ? value.getTime() : Number(value);
                return formatAxisTime(ms, windowMinutes);
              }
            }
          ]}
          yAxis={[
            {
              label: "W",
              domainLimit: () => yDomain
            }
          ]}
          series={[
            {
              id: ELECTRICITY_PRODUCTION_KEY,
              label: "Výroba",
              data: productionValues,
              color: chartTempColor,
              showMark: false,
              connectNulls: true,
              valueFormatter: (v) => formatChartPowerW(v)
            },
            {
              id: ELECTRICITY_CONSUMPTION_KEY,
              label: "Spotřeba",
              data: consumptionValues,
              color: chartPowerColor,
              showMark: false,
              connectNulls: true,
              valueFormatter: (v) => formatChartPowerW(v)
            }
          ]}
          grid={{ horizontal: true }}
          slotProps={muiChartLineTooltipSlotProps}
          sx={muiChartSx}
        />
      </div>
    </ThemeProvider>
  );
}
