import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SettingsPage } from "../src/ui/SettingsPage.js";

describe("SettingsPage", () => {
  it("shows dashboard and sport interval inputs", () => {
    render(
      <SettingsPage
        error={null}
        settings={{ settings: { dashboard_sync_interval_ms: 30_000 } }}
        dashIntervalSeconds="30"
        sportIntervalSeconds="180"
        savingSettings={false}
        savingSportSettings={false}
        onDashIntervalChange={vi.fn()}
        onSportIntervalChange={vi.fn()}
        onSaveDashboardInterval={vi.fn()}
        onSaveSportInterval={vi.fn()}
      />
    );

    expect(screen.getByText("Home Assistant")).toBeInTheDocument();
    expect(screen.getByText("Sport (TheSportsDB)")).toBeInTheDocument();
    expect(screen.getByDisplayValue("30")).toBeInTheDocument();
    expect(screen.getByDisplayValue("180")).toBeInTheDocument();
    expect(screen.getByText("Aktuálně: 30 s")).toBeInTheDocument();
  });

  it("calls save handlers", async () => {
    const user = userEvent.setup();
    const onSaveDashboardInterval = vi.fn();
    const onSaveSportInterval = vi.fn();

    render(
      <SettingsPage
        error={null}
        settings={null}
        dashIntervalSeconds="45"
        sportIntervalSeconds="120"
        savingSettings={false}
        savingSportSettings={false}
        onDashIntervalChange={vi.fn()}
        onSportIntervalChange={vi.fn()}
        onSaveDashboardInterval={onSaveDashboardInterval}
        onSaveSportInterval={onSaveSportInterval}
      />
    );

    const saveButtons = screen.getAllByRole("button", { name: "Uložit" });
    await user.click(saveButtons[0]!);
    await user.click(saveButtons[1]!);

    expect(onSaveDashboardInterval).toHaveBeenCalledOnce();
    expect(onSaveSportInterval).toHaveBeenCalledOnce();
  });

  it("shows saving state", () => {
    render(
      <SettingsPage
        error="Chyba ukládání"
        settings={null}
        dashIntervalSeconds=""
        sportIntervalSeconds=""
        savingSettings
        savingSportSettings
        onDashIntervalChange={vi.fn()}
        onSportIntervalChange={vi.fn()}
        onSaveDashboardInterval={vi.fn()}
        onSaveSportInterval={vi.fn()}
      />
    );

    expect(screen.getByText("Chyba ukládání")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Ukládám…" })).toHaveLength(2);
  });
});
