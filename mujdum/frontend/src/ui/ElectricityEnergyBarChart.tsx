import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { BarChart } from "@mui/x-charts/BarChart";
import {
  ELECTRICITY_CONSUMPTION_KEY,
  ELECTRICITY_PRODUCTION_KEY,
  formatChartEnergyKwh,
  formatEnergyBucketLabel,
  hasEnergyBucketData,
  type ElectricityEnergyBucket,
  type EnergyBucketUnit
} from "./dashboardMetricChartUtils.js";
import { muiAppDataGridTheme } from "./muiAppDataGridTheme.js";
import {
  chartPowerColor,
  chartTempColor,
  muiChartItemHighlightScope,
  muiChartItemTooltipSlotProps,
  muiChartSx,
  muiLineChartHeight,
  muiLineChartMargin,
  muiLineChartModalHeight
} from "./testUiChartTheme.js";

type Props = Readonly<{
  buckets: ElectricityEnergyBucket[];
  bucketUnit: EnergyBucketUnit;
  variant?: "default" | "modal";
}>;

export default function ElectricityEnergyBarChart({
  buckets,
  bucketUnit,
  variant = "modal"
}: Props) {
  const chartHeight = variant === "modal" ? muiLineChartModalHeight : muiLineChartHeight;

  if (buckets.length === 0 || !hasEnergyBucketData(buckets)) {
    return <p className="muted">Pro graf zatím není dostatek dat.</p>;
  }

  const labels = buckets.map((b) => formatEnergyBucketLabel(bucketUnit, b.key));

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
        aria-label="Sloupcový graf výroby a spotřeby elektřiny (kWh)"
      >
        <BarChart
          height={chartHeight}
          skipAnimation
          margin={muiLineChartMargin}
          xAxis={[{ data: labels, scaleType: "band" }]}
          yAxis={[{ label: "kWh" }]}
          series={[
            {
              id: ELECTRICITY_PRODUCTION_KEY,
              label: "Výroba",
              data: buckets.map((b) => b.producedKwh),
              color: chartTempColor,
              highlightScope: muiChartItemHighlightScope,
              valueFormatter: (v) => formatChartEnergyKwh(v)
            },
            {
              id: ELECTRICITY_CONSUMPTION_KEY,
              label: "Spotřeba",
              data: buckets.map((b) => b.consumedKwh),
              color: chartPowerColor,
              highlightScope: muiChartItemHighlightScope,
              valueFormatter: (v) => formatChartEnergyKwh(v)
            }
          ]}
          grid={{ horizontal: true }}
          slotProps={muiChartItemTooltipSlotProps}
          sx={muiChartSx}
        />
      </div>
    </ThemeProvider>
  );
}
