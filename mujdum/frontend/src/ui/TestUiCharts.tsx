import { useMemo, useState, type ReactNode } from "react";
import { ThemeProvider } from "@mui/material/styles";
import { BarChart } from "@mui/x-charts/BarChart";
import { LineChart } from "@mui/x-charts/LineChart";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip
} from "chart.js";
import { Bar as ChartJsBar, Line as ChartJsLine } from "react-chartjs-2";
import {
  Bar,
  BarChart as RechartsBarChart,
  Brush,
  CartesianGrid,
  Legend as RechartsLegend,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis
} from "recharts";
import { muiAppDataGridTheme } from "./muiAppDataGridTheme.js";
import { DEMO_CHART_POINTS } from "./testUiChartData.js";
import {
  chartAxisColor,
  chartGridColor,
  chartJsBaseOptions,
  chartPowerColor,
  chartTempColor,
  muiChartItemHighlightScope,
  muiChartItemTooltipSlotProps,
  muiChartSx,
  muiLineChartHeight,
  muiLineChartMargin,
  rechartsTooltipStyle
} from "./testUiChartTheme.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler
);

function buildChartJsData(points: typeof DEMO_CHART_POINTS) {
  return {
    labels: points.map((p) => p.label),
    datasets: [
      {
        label: "Teplota °C",
        data: points.map((p) => p.tempC),
        borderColor: chartTempColor,
        backgroundColor: "rgba(68, 226, 205, 0.35)",
        yAxisID: "y"
      },
      {
        label: "Výkon W",
        data: points.map((p) => p.powerW),
        borderColor: chartPowerColor,
        backgroundColor: "rgba(183, 196, 255, 0.35)",
        yAxisID: "y1"
      }
    ]
  };
}

function SubchartBlock({
  title,
  hint,
  controls,
  footer,
  plotClassName = "",
  children
}: Readonly<{
  title: string;
  hint: string;
  controls?: ReactNode;
  footer?: ReactNode;
  plotClassName?: string;
  children: ReactNode;
}>) {
  return (
    <div className="testUiSubchart">
      <h3 className="testUiSubchartTitle">{title}</h3>
      <p className="testUiSubchartHint">{hint}</p>
      {controls}
      <div className={`testUiChartPlot ${plotClassName}`.trim()}>{children}</div>
      {footer}
    </div>
  );
}

function RechartsAxes() {
  return (
    <>
      <CartesianGrid stroke={chartGridColor} strokeDasharray="3 3" />
      <XAxis
        dataKey="label"
        tick={{ fill: chartAxisColor, fontSize: 11 }}
        interval="preserveStartEnd"
      />
      <YAxis
        yAxisId="temp"
        tick={{ fill: chartTempColor, fontSize: 11 }}
        width={36}
      />
      <YAxis
        yAxisId="power"
        orientation="right"
        tick={{ fill: chartPowerColor, fontSize: 11 }}
        width={44}
      />
      <RechartsTooltip contentStyle={rechartsTooltipStyle} />
      <RechartsLegend wrapperStyle={{ color: chartAxisColor, fontSize: 12 }} />
    </>
  );
}

function RechartsSection() {
  const [brushRange, setBrushRange] = useState<{ startIndex?: number; endIndex?: number }>(
    {}
  );

  const brushedData = useMemo(() => {
    const { startIndex, endIndex } = brushRange;
    if (startIndex === undefined || endIndex === undefined) {
      return DEMO_CHART_POINTS;
    }
    return DEMO_CHART_POINTS.slice(startIndex, endIndex + 1);
  }, [brushRange]);

  return (
    <article className="tile testUiChartCard">
      <div className="tileTitle">1. Recharts</div>
      <p className="tileHint">Deklarativní JSX, MIT — tři typy grafu se stejnými daty.</p>

      <div className="testUiSubcharts">
        <SubchartBlock title="Čárový" hint="Dvě série, dvě osy Y.">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart data={DEMO_CHART_POINTS} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <RechartsAxes />
              <Line
                yAxisId="temp"
                type="monotone"
                dataKey="tempC"
                name="Teplota °C"
                stroke={chartTempColor}
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="power"
                type="monotone"
                dataKey="powerW"
                name="Výkon W"
                stroke={chartPowerColor}
                strokeWidth={2}
                dot={false}
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        </SubchartBlock>

        <SubchartBlock title="Sloupcový" hint="Skupinové sloupce (teplota + výkon).">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={DEMO_CHART_POINTS} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <RechartsAxes />
              <Bar yAxisId="temp" dataKey="tempC" name="Teplota °C" fill={chartTempColor} radius={[3, 3, 0, 0]} />
              <Bar yAxisId="power" dataKey="powerW" name="Výkon W" fill={chartPowerColor} radius={[3, 3, 0, 0]} />
            </RechartsBarChart>
          </ResponsiveContainer>
        </SubchartBlock>

        <SubchartBlock
          title="Interaktivní"
          hint="Tažení Brush pod grafem zužuje zobrazené okno; tooltip při najetí."
          plotClassName="testUiChartPlotTall"
          footer={
            <p className="testUiBrushNote">
              Vybráno bodů: <strong>{brushedData.length}</strong> /{" "}
              {DEMO_CHART_POINTS.length}
            </p>
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart data={DEMO_CHART_POINTS} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <RechartsAxes />
              <Line
                yAxisId="temp"
                type="monotone"
                dataKey="tempC"
                name="Teplota °C"
                stroke={chartTempColor}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5 }}
              />
              <Line
                yAxisId="power"
                type="monotone"
                dataKey="powerW"
                name="Výkon W"
                stroke={chartPowerColor}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5 }}
              />
              <Brush
                dataKey="label"
                height={22}
                stroke={chartTempColor}
                fill="rgba(68, 226, 205, 0.15)"
                travellerWidth={10}
                onChange={(range) => setBrushRange(range)}
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        </SubchartBlock>
      </div>

      <p className="testUiLibMeta">
        Balíček: <code>recharts</code>
      </p>
    </article>
  );
}

function ChartJsSection() {
  const [visibleHours, setVisibleHours] = useState(12);
  const sliced = useMemo(
    () => DEMO_CHART_POINTS.slice(-visibleHours),
    [visibleHours]
  );
  const lineData = useMemo(() => buildChartJsData(DEMO_CHART_POINTS), []);
  const barData = useMemo(() => buildChartJsData(DEMO_CHART_POINTS), []);
  const interactiveData = useMemo(() => buildChartJsData(sliced), [sliced]);

  return (
    <article className="tile testUiChartCard">
      <div className="tileTitle">2. Chart.js + react-chartjs-2</div>
      <p className="tileHint">Canvas, MIT — stejné tři typy přes tenkou React obálku.</p>

      <div className="testUiSubcharts">
        <SubchartBlock title="Čárový" hint="Vyplněná plocha u teploty, legenda přepíná série.">
          <ChartJsLine
            data={{
              ...lineData,
              datasets: lineData.datasets.map((d, i) => ({
                ...d,
                fill: i === 0,
                tension: 0.35
              }))
            }}
            options={chartJsBaseOptions}
          />
        </SubchartBlock>

        <SubchartBlock title="Sloupcový" hint="Grouped bar — dvě metriky vedle sebe.">
          <ChartJsBar data={barData} options={chartJsBaseOptions} />
        </SubchartBlock>

        <SubchartBlock
          title="Interaktivní"
          hint="Posuvník mění počet zobrazených hodin; legenda skrývá dataset."
          controls={
            <label className="testUiRangeLabel">
              Okno (hodiny): {visibleHours}
              <input
                className="testUiRange"
                type="range"
                min={4}
                max={24}
                step={1}
                value={visibleHours}
                onChange={(e) => setVisibleHours(Number(e.target.value))}
              />
            </label>
          }
        >
          <ChartJsLine data={interactiveData} options={chartJsBaseOptions} />
        </SubchartBlock>
      </div>

      <p className="testUiLibMeta">
        Balíčky: <code>chart.js</code>, <code>react-chartjs-2</code>
      </p>
    </article>
  );
}

function MuiDualSeriesLine() {
  const x = DEMO_CHART_POINTS.map((p) => p.ts);
  return (
    <LineChart
      height={muiLineChartHeight}
      margin={muiLineChartMargin}
      xAxis={[{ data: x, scaleType: "time", tickNumber: 6 }]}
      yAxis={[
        { id: "temp", label: "°C" },
        { id: "power", position: "right", label: "W" }
      ]}
      series={[
        {
          id: "temp",
          label: "Teplota °C",
          data: DEMO_CHART_POINTS.map((p) => p.tempC),
          color: chartTempColor,
          yAxisId: "temp",
          showMark: false
        },
        {
          id: "power",
          label: "Výkon W",
          data: DEMO_CHART_POINTS.map((p) => p.powerW),
          color: chartPowerColor,
          yAxisId: "power",
          showMark: false
        }
      ]}
      grid={{ horizontal: true }}
      sx={muiChartSx}
    />
  );
}

function MuiSection() {
  const x = DEMO_CHART_POINTS.map((p) => p.label);
  const [metric, setMetric] = useState<"temp" | "power">("temp");

  return (
    <article className="tile testUiChartCard">
      <div className="tileTitle">3. MUI X Charts</div>
      <p className="tileHint">Navazuje na MUI v projektu — čára, sloupce, výběr metriky.</p>

      <div className="testUiSubcharts">
        <SubchartBlock title="Čárový" hint="Časová osa, dvě série na jednom grafu.">
          <div className="testUiChartPlotMui">
            <MuiDualSeriesLine />
          </div>
        </SubchartBlock>

        <SubchartBlock title="Sloupcový" hint="Sloupce podle času (jedna metrika na sloupec).">
          <div className="testUiChartPlotMui">
            <BarChart
              height={muiLineChartHeight}
              margin={muiLineChartMargin}
              xAxis={[{ data: x, scaleType: "band", tickNumber: 8 }]}
              series={[
                {
                  data: DEMO_CHART_POINTS.map((p) => p.tempC),
                  label: "Teplota °C",
                  color: chartTempColor,
                  highlightScope: muiChartItemHighlightScope
                },
                {
                  data: DEMO_CHART_POINTS.map((p) => p.powerW),
                  label: "Výkon W",
                  color: chartPowerColor,
                  highlightScope: muiChartItemHighlightScope
                }
              ]}
              grid={{ horizontal: true }}
              slotProps={muiChartItemTooltipSlotProps}
              sx={muiChartSx}
            />
          </div>
        </SubchartBlock>

        <SubchartBlock
          title="Interaktivní"
          hint="Přepínač metriky + zvýraznění série při najetí (axis highlight)."
        >
          <fieldset className="testUiMetricToggle toolbarFieldset">
            <legend>Metrika grafu</legend>
            <button
              type="button"
              className={`ghostButton ${metric === "temp" ? "testUiMetricActive" : ""}`}
              onClick={() => setMetric("temp")}
            >
              Teplota
            </button>
            <button
              type="button"
              className={`ghostButton ${metric === "power" ? "testUiMetricActive" : ""}`}
              onClick={() => setMetric("power")}
            >
              Výkon
            </button>
          </fieldset>
          <div className="testUiChartPlotMui">
            <LineChart
              height={muiLineChartHeight}
              margin={muiLineChartMargin}
              xAxis={[
                {
                  data: DEMO_CHART_POINTS.map((p) => p.ts),
                  scaleType: "time",
                  tickNumber: 6
                }
              ]}
              yAxis={[{ label: metric === "temp" ? "°C" : "W" }]}
              series={[
                {
                  id: metric,
                  label: metric === "temp" ? "Teplota °C" : "Výkon W",
                  data: DEMO_CHART_POINTS.map((p) =>
                    metric === "temp" ? p.tempC : p.powerW
                  ),
                  color: metric === "temp" ? chartTempColor : chartPowerColor,
                  showMark: true,
                  highlightScope: { highlight: "item", fade: "series" }
                }
              ]}
              grid={{ horizontal: true }}
              axisHighlight={{ x: "line", y: "line" }}
              sx={muiChartSx}
            />
          </div>
        </SubchartBlock>
      </div>

      <p className="testUiLibMeta">
        Balíček: <code>@mui/x-charts</code>
      </p>
    </article>
  );
}

export default function TestUiCharts() {
  return (
    <ThemeProvider theme={muiAppDataGridTheme}>
      <section className="testUiIntro">
        <h2 className="h2">Srovnání knihoven grafů</h2>
        <p className="muted">
          U každé knihovny tři podvarianty: čárový, sloupcový a interaktivní (brush,
          posuvník okna, přepínač metriky). Stejná demo data — 24 h teploty a výkonu.
        </p>
      </section>

      <section className="testUiGrid">
        <RechartsSection />
        <ChartJsSection />
        <MuiSection />
      </section>
    </ThemeProvider>
  );
}
