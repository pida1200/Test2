import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LogPage } from "../src/ui/LogPage.js";
import { sampleActivity } from "./testUtils.js";

vi.mock("../src/ui/ActivityLogGrid", () => ({
  default: ({ rows }: { rows: unknown[] }) => (
    <div data-testid="activity-log-grid">{rows.length} záznamů</div>
  )
}));

describe("LogPage", () => {
  it("shows loading state", () => {
    render(<LogPage error={null} activities={null} />);
    expect(screen.getByText("Načítám…")).toBeInTheDocument();
  });

  it("shows error message", () => {
    render(<LogPage error="Chyba logu" activities={null} />);
    expect(screen.getByText("Chyba logu")).toBeInTheDocument();
  });

  it("shows empty message", () => {
    render(<LogPage error={null} activities={[]} />);
    expect(screen.getByText("Žádné záznamy.")).toBeInTheDocument();
  });

  it("renders activity grid for data", async () => {
    render(<LogPage error={null} activities={[sampleActivity]} />);
    expect(await screen.findByTestId("activity-log-grid")).toHaveTextContent("1 záznamů");
  });

  it("has accessible section heading", () => {
    render(<LogPage error={null} activities={null} />);
    expect(screen.getByRole("heading", { name: "Aktivitní log" })).toBeInTheDocument();
  });
});
