import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DashboardPage } from "../src/ui/DashboardPage.js";

describe("DashboardPage", () => {
  it("shows error banner", () => {
    render(
      <DashboardPage
        error="Dashboard nedostupný"
        dashboard={null}
        onOpenChart={vi.fn()}
        onOpenElectricityChart={vi.fn()}
      />
    );
    expect(screen.getByText("Dashboard nedostupný")).toBeInTheDocument();
  });

  it("renders temperature and electricity sections", () => {
    render(
      <DashboardPage
        error={null}
        dashboard={{
          metrics: {
            temp_jircany: 18.5,
            electricity_production_w: 1200
          },
          updated_at: "2026-05-30T12:00:00.000Z"
        }}
        onOpenChart={vi.fn()}
        onOpenElectricityChart={vi.fn()}
      />
    );

    expect(screen.getByText("Teploty")).toBeInTheDocument();
    expect(screen.getByText("18.5 °C")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Elektřina" })).toBeInTheDocument();
    expect(screen.getByText("1.20 kW")).toBeInTheDocument();
  });

  it("opens chart for metric click", async () => {
    const user = userEvent.setup();
    const onOpenChart = vi.fn();

    render(
      <DashboardPage
        error={null}
        dashboard={{ metrics: { temp_sklenik: 22 }, updated_at: null }}
        onOpenChart={onOpenChart}
        onOpenElectricityChart={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "22.0 °C" }));
    expect(onOpenChart).toHaveBeenCalledWith("temp_sklenik", "Teplota • Skleník");
  });

  it("opens electricity combined chart", async () => {
    const user = userEvent.setup();
    const onOpenElectricityChart = vi.fn();

    render(
      <DashboardPage
        error={null}
        dashboard={{ metrics: {}, updated_at: null }}
        onOpenChart={vi.fn()}
        onOpenElectricityChart={onOpenElectricityChart}
      />
    );

    await user.click(screen.getByRole("button", { name: "Elektřina" }));
    expect(onOpenElectricityChart).toHaveBeenCalledOnce();
  });
});
