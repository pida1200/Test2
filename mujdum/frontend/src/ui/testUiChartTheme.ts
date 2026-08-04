import { chartsTooltipClasses } from "@mui/x-charts";

export const chartAxisColor = "rgba(218, 226, 253, 0.75)";
export const chartGridColor = "rgba(255, 255, 255, 0.1)";
export const chartTempColor = "#44e2cd";
export const chartPowerColor = "#b7c4ff";

export const rechartsTooltipStyle = {
  background: "rgba(23, 31, 51, 0.95)",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 8,
  color: chartAxisColor
};

/** Sdílené rozměry MUI LineChart/BarChart — produkce i Test UI (čárový). */
export const muiLineChartHeight = 200;
/** Výška číselného grafu v modalu dashboardu. */
export const muiLineChartModalHeight = 400;
export const muiLineChartMargin = { left: 48, right: 48, top: 12, bottom: 28 };

/** Vzhled štítku (tooltip) — tmavé pozadí jako zbytek UI. */
export const muiChartTooltipSx = {
  [`& .${chartsTooltipClasses.paper}`]: {
    backgroundColor: "rgba(23, 31, 51, 0.96)",
    border: "1px solid rgba(255, 255, 255, 0.18)",
    borderRadius: 8,
    color: chartAxisColor,
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.45)"
  },
  [`& .${chartsTooltipClasses.mark}`]: {
    borderColor: "rgba(255, 255, 255, 0.35)"
  }
};

/** Sloupcový graf (Test UI) — štítek u sloupce. */
export const muiChartItemTooltipSlotProps = {
  tooltip: {
    trigger: "item" as const,
    anchor: "node" as const,
    position: "top" as const,
    sx: muiChartTooltipSx
  }
};

/**
 * Čárový graf (produkce) — bez viditelných bodů je spolehlivější osa + kurzor
 * (štítek u myši u nejbližšího měření na čáře).
 */
export const muiChartLineTooltipSlotProps = {
  tooltip: {
    trigger: "axis" as const,
    anchor: "pointer" as const,
    position: "top" as const,
    sx: muiChartTooltipSx
  }
};

/** Zvýraznění právě najetého bodu / sloupce. */
export const muiChartItemHighlightScope = {
  highlight: "item" as const,
  fade: "global" as const
};

export const muiChartSx = {
  "& .MuiChartsAxis-line": { stroke: chartGridColor },
  "& .MuiChartsAxis-tick": { stroke: chartGridColor },
  "& .MuiChartsAxis-tickLabel": { fill: chartAxisColor }
};

export const chartJsBaseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: "index" as const, intersect: false },
  plugins: {
    legend: {
      labels: { color: chartAxisColor }
    }
  },
  scales: {
    x: {
      ticks: { color: chartAxisColor, maxTicksLimit: 8 },
      grid: { color: chartGridColor }
    },
    y: {
      position: "left" as const,
      ticks: { color: chartTempColor },
      grid: { color: chartGridColor }
    },
    y1: {
      position: "right" as const,
      ticks: { color: chartPowerColor },
      grid: { drawOnChartArea: false }
    }
  }
};
