import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import StateTimelineChart from "../src/ui/StateTimelineChart.js";

describe("StateTimelineChart", () => {
  it("renders timeline with legend for discrete states", () => {
    render(
      <StateTimelineChart
        windowMinutes={360}
        points={[
          { ts: "2026-01-01T00:00:00.000Z", value: "on", numeric: null },
          { ts: "2026-01-01T01:00:00.000Z", value: "off", numeric: null }
        ]}
      />
    );

    expect(screen.getByLabelText("Timeline stavů")).toBeInTheDocument();
    expect(screen.getByText("on")).toBeInTheDocument();
    expect(screen.getByText("off")).toBeInTheDocument();
  });

  it("supports modal variant height", () => {
    const { container } = render(
      <StateTimelineChart
        variant="modal"
        windowMinutes={1440}
        points={[
          { ts: "2026-01-01T00:00:00.000Z", value: true, numeric: null },
          { ts: "2026-01-01T12:00:00.000Z", value: false, numeric: null }
        ]}
      />
    );
    expect(container.querySelector("svg")?.getAttribute("height")).toBe("120");
  });
});
