import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ElectricityCombinedChart from "../src/ui/ElectricityCombinedChart.js";

const points = [
  { ts: "2026-01-01T00:00:00.000Z", value: 100, numeric: 100 },
  { ts: "2026-01-01T01:00:00.000Z", value: 200, numeric: 200 }
];

describe("ElectricityCombinedChart", () => {
  it("renders combined chart when both series have data", async () => {
    render(
      <ElectricityCombinedChart
        production={points}
        consumption={points}
        windowMinutes={360}
      />
    );
    expect(await screen.findByText("Výroba")).toBeInTheDocument();
    expect(screen.getByText("Spotřeba")).toBeInTheDocument();
  });

  it("shows fallback when series lack numeric data", () => {
    render(
      <ElectricityCombinedChart
        production={[{ ts: "2026-01-01T00:00:00.000Z", value: "x", numeric: null }]}
        consumption={[]}
        windowMinutes={360}
      />
    );
    expect(screen.getByText(/Pro graf zatím není dostatek dat/)).toBeInTheDocument();
  });
});
