import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppMainContent } from "../src/ui/AppMainContent.js";
import { createAppMainContentProps } from "./testUtils.js";

vi.mock("../src/ui/TestUiCharts", () => ({
  default: () => <div data-testid="test-ui-charts">Test UI</div>
}));

describe("AppMainContent", () => {
  it("renders dashboard page", () => {
    render(
      <AppMainContent
        {...createAppMainContentProps({
          page: "dashboard",
          dashboard: { metrics: {}, updated_at: null }
        })}
      />
    );
    expect(screen.getByText("Teploty")).toBeInTheDocument();
  });

  it("renders log page", () => {
    render(<AppMainContent {...createAppMainContentProps({ page: "log", activities: null })} />);
    expect(screen.getByRole("heading", { name: "Aktivitní log" })).toBeInTheDocument();
  });

  it("renders settings page", () => {
    render(<AppMainContent {...createAppMainContentProps({ page: "settings" })} />);
    expect(screen.getByText("Home Assistant")).toBeInTheDocument();
  });

  it("renders sport page", () => {
    render(<AppMainContent {...createAppMainContentProps({ page: "sport" })} />);
    expect(screen.getByRole("heading", { name: "Nadcházející akce" })).toBeInTheDocument();
  });

  it("renders dictionaries page", () => {
    render(<AppMainContent {...createAppMainContentProps({ page: "dictionaries" })} />);
    expect(screen.getByRole("tab", { name: "Místnosti" })).toBeInTheDocument();
  });

  it("renders test UI page", async () => {
    render(<AppMainContent {...createAppMainContentProps({ page: "testUi" })} />);
    expect(await screen.findByTestId("test-ui-charts")).toBeInTheDocument();
  });
});
