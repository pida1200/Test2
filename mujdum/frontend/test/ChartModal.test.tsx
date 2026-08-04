import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChartModal } from "../src/ui/ChartModal.js";
import type { ChartState } from "../src/ui/useMetricChart.js";

vi.mock("../src/ui/DashboardMetricChart", () => ({
  default: () => <div data-testid="metric-chart">chart</div>
}));

vi.mock("../src/ui/ElectricityCombinedChart", () => ({
  default: () => <div data-testid="electricity-chart">electricity</div>
}));

vi.mock("../src/ui/ElectricityEnergyBarChart", () => ({
  default: () => <div data-testid="energy-bars">bars</div>
}));

const chart: ChartState = {
  key: "temp_jircany",
  title: "Teplota • Jirčany",
  minutes: 6 * 60,
  periodAnchor: null,
  loading: false,
  points: [{ ts: "2026-05-30T10:00:00.000Z", value: 19, numeric: 19 }],
  electricity: null,
  electricityView: "line",
  electricityEnergy: null,
  error: null
};

function createChartApi(overrides: Partial<ReturnType<typeof createChartApi>> = {}) {
  return {
    closeChart: vi.fn(),
    setChartWindow: vi.fn(),
    setElectricityView: vi.fn(),
    electricitySupportsBars: vi.fn(() => false),
    shiftChartPeriod: vi.fn(),
    resetChartToCurrentPeriod: vi.fn(),
    chartSupportsCalendarNav: vi.fn(() => false),
    chartCalendarPeriodKind: vi.fn(() => null),
    chartPeriodNavPrevLabel: vi.fn(() => "Předchozí"),
    chartPeriodNavNextLabel: vi.fn(() => "Další"),
    formatChartPeriodLabel: vi.fn(() => "Dnes"),
    isCurrentPeriod: vi.fn(() => true),
    isPeriodAnchorInFuture: vi.fn(() => false),
    isElectricityCombinedChart: vi.fn(() => false),
    currentPeriodAnchor: vi.fn(() => "2026-05-30"),
    ...overrides
  };
}

describe("ChartModal", () => {
  it("renders title and chart body", async () => {
    render(<ChartModal chart={chart} chartApi={createChartApi()} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Teplota • Jirčany")).toBeInTheDocument();
    expect(await screen.findByTestId("metric-chart")).toBeInTheDocument();
  });

  it("closes via backdrop button", async () => {
    const user = userEvent.setup();
    const chartApi = createChartApi();

    const { container } = render(<ChartModal chart={chart} chartApi={chartApi} />);
    const backdrop = container.querySelector(".modalBackdrop");
    expect(backdrop).not.toBeNull();
    await user.click(backdrop!);

    expect(chartApi.closeChart).toHaveBeenCalled();
  });

  it("shows loading and error states", () => {
    render(
      <ChartModal
        chart={{ ...chart, loading: true, points: null }}
        chartApi={createChartApi()}
      />
    );
    expect(screen.getByText("Načítám…")).toBeInTheDocument();

    render(
      <ChartModal
        chart={{ ...chart, loading: false, error: "Chyba grafu", points: null }}
        chartApi={createChartApi()}
      />
    );
    expect(screen.getByText("Chyba grafu")).toBeInTheDocument();
  });

  it("renders calendar navigation and window buttons", async () => {
    const user = userEvent.setup();
    const chartApi = createChartApi({
      chartSupportsCalendarNav: vi.fn(() => true),
      chartCalendarPeriodKind: vi.fn(() => "day" as const)
    });

    render(
      <ChartModal
        chart={{ ...chart, minutes: 24 * 60, periodAnchor: "2026-05-29" }}
        chartApi={chartApi}
      />
    );

    expect(screen.getByText("Období grafu")).toBeInTheDocument();
    expect(screen.getByText("Dnes")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Předchozí" }));
    expect(chartApi.shiftChartPeriod).toHaveBeenCalledWith(-1);

    await user.click(screen.getByRole("button", { name: "týden" }));
    expect(chartApi.setChartWindow).toHaveBeenCalledWith(7 * 24 * 60);
  });

  it("renders electricity view toggle and energy bar chart", async () => {
    const user = userEvent.setup();
    const chartApi = createChartApi({
      isElectricityCombinedChart: vi.fn(() => true),
      electricitySupportsBars: vi.fn(() => true)
    });

    render(
      <ChartModal
        chart={{
          key: "electricity_combined",
          title: "Elektřina",
          minutes: 30 * 24 * 60,
          periodAnchor: "2026-05",
          loading: false,
          points: null,
          electricity: null,
          electricityView: "bars",
          electricityEnergy: {
            period: "month",
            anchor: "2026-05",
            bucketUnit: "week",
            buckets: [{ key: "2026-05-05", from: "", to: "", producedKwh: 1, consumedKwh: 2 }]
          },
          error: null
        }}
        chartApi={chartApi}
      />
    );

    expect(screen.getByText("Typ grafu elektřiny")).toBeInTheDocument();
    expect(await screen.findByTestId("energy-bars")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Čára" }));
    expect(chartApi.setElectricityView).toHaveBeenCalledWith("line");
  });

  it("renders combined electricity line chart", async () => {
    const chartApi = createChartApi({ isElectricityCombinedChart: vi.fn(() => true) });

    render(
      <ChartModal
        chart={{
          key: "electricity_combined",
          title: "Elektřina",
          minutes: 24 * 60,
          periodAnchor: "2026-05-30",
          loading: false,
          points: null,
          electricity: {
            production: [{ ts: "2026-01-01T00:00:00.000Z", value: 100, numeric: 100 }],
            consumption: [{ ts: "2026-01-01T00:00:00.000Z", value: 50, numeric: 50 }]
          },
          electricityView: "line",
          electricityEnergy: null,
          error: null
        }}
        chartApi={chartApi}
      />
    );

    expect(await screen.findByTestId("electricity-chart")).toBeInTheDocument();
  });
});
