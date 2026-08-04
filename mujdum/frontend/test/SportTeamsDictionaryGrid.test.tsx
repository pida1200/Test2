import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SportTeamsDictionaryGrid from "../src/ui/SportTeamsDictionaryGrid.js";

const sampleTeam = {
  id: 1,
  name: "Sparta",
  thesportsdb_team_id: "133602",
  sport: "Soccer",
  league_hint: "Fortuna liga",
  active: true,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z"
};

describe("SportTeamsDictionaryGrid", () => {
  it("renders team row", async () => {
    render(<SportTeamsDictionaryGrid rows={[sampleTeam]} onToggleActive={vi.fn()} />);
    expect(await screen.findByText("Sparta")).toBeInTheDocument();
  });

  it("calls onToggleActive from active switch", async () => {
    const user = userEvent.setup();
    const onToggleActive = vi.fn();

    render(<SportTeamsDictionaryGrid rows={[sampleTeam]} onToggleActive={onToggleActive} />);

    const toggle = await screen.findByRole("button", { name: "Deaktivovat" });
    await user.click(toggle);
    expect(onToggleActive).toHaveBeenCalledWith(sampleTeam, false);
  });
});
