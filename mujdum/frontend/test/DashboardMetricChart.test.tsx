import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DashboardMetricChart from "../src/ui/DashboardMetricChart.js";

describe("DashboardMetricChart", () => {
  it("shows empty message without points", () => {
    render(<DashboardMetricChart metricKey="temp_x" points={[]} windowMinutes={360} />);
    expect(screen.getByText(/Pro tuto hodnotu zatím není graf/)).toBeInTheDocument();
  });

  it("renders numeric line chart for temperature metric", async () => {
    render(
      <DashboardMetricChart
        metricKey="temp_jircany"
        windowMinutes={360}
        points={[
          { ts: "2026-01-01T00:00:00.000Z", value: 20, numeric: 20 },
          { ts: "2026-01-01T01:00:00.000Z", value: 21, numeric: 21 }
        ]}
      />
    );
    expect(await screen.findByLabelText("Graf metriky temp_jircany")).toBeInTheDocument();
  });

  it("renders state timeline for discrete values", () => {
    render(
      <DashboardMetricChart
        metricKey="relay_state"
        windowMinutes={360}
        points={[
          { ts: "2026-01-01T00:00:00.000Z", value: "on", numeric: null },
          { ts: "2026-01-01T01:00:00.000Z", value: "off", numeric: null }
        ]}
      />
    );
    expect(screen.getByLabelText("Timeline stavů")).toBeInTheDocument();
  });
});
