import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SportPlayersDictionaryGrid from "../src/ui/SportPlayersDictionaryGrid.js";

const samplePlayer = {
  id: 2,
  name: "David Pastrňák",
  thesportsdb_player_id: "34145937",
  sport: "Ice Hockey",
  active: false,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z"
};

describe("SportPlayersDictionaryGrid", () => {
  it("renders player row", async () => {
    render(<SportPlayersDictionaryGrid rows={[samplePlayer]} onToggleActive={vi.fn()} />);
    expect(await screen.findByText("David Pastrňák")).toBeInTheDocument();
  });

  it("calls onToggleActive when activating player", async () => {
    const user = userEvent.setup();
    const onToggleActive = vi.fn();

    render(<SportPlayersDictionaryGrid rows={[samplePlayer]} onToggleActive={onToggleActive} />);

    const toggle = await screen.findByRole("button", { name: "Aktivovat" });
    await user.click(toggle);
    expect(onToggleActive).toHaveBeenCalledWith(samplePlayer, true);
  });
});
