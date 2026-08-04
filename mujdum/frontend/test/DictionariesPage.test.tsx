import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DictionariesPage } from "../src/ui/DictionariesPage.js";

vi.mock("../src/ui/RoomsDictionaryGrid", () => ({
  default: ({ rows }: { rows: { name: string }[] }) => (
    <div data-testid="rooms-grid">{rows.map((r) => r.name).join(",")}</div>
  )
}));

vi.mock("../src/ui/SportTeamsDictionaryGrid", () => ({
  default: () => <div data-testid="teams-grid">teams</div>
}));

vi.mock("../src/ui/SportPlayersDictionaryGrid", () => ({
  default: () => <div data-testid="players-grid">players</div>
}));

vi.mock("../src/ui/SportTeamAddForm", () => ({
  SportTeamAddForm: () => <div data-testid="team-add-form">team form</div>
}));

vi.mock("../src/ui/SportPlayerAddForm", () => ({
  SportPlayerAddForm: () => <div data-testid="player-add-form">player form</div>
}));

const baseProps = {
  rooms: [{ id: 1, name: "Obývák", created_at: "2026-01-01T00:00:00.000Z" }],
  sportTeams: [],
  sportPlayers: [],
  error: null,
  notice: null,
  syncingRooms: false,
  roomName: "",
  onRoomNameChange: vi.fn(),
  onAddSportTeam: vi.fn(async () => {}),
  onAddSportPlayer: vi.fn(async () => {}),
  onDictionaryError: vi.fn(),
  onRefresh: vi.fn(),
  onSyncRoomsFromHa: vi.fn(),
  onAddRoom: vi.fn(),
  onSportTeamActiveChange: vi.fn(),
  onSportPlayerActiveChange: vi.fn()
};

describe("DictionariesPage", () => {
  it("shows rooms tab by default", async () => {
    render(<DictionariesPage {...baseProps} />);
    expect(await screen.findByTestId("rooms-grid")).toHaveTextContent("Obývák");
  });

  it("switches to teams tab", async () => {
    const user = userEvent.setup();
    render(
      <DictionariesPage
        {...baseProps}
        sportTeams={[
          {
            id: 1,
            name: "Sparta",
            thesportsdb_team_id: "133602",
            sport: "Soccer",
            league_hint: null,
            active: true,
            created_at: "2026-01-01T00:00:00.000Z",
            updated_at: "2026-01-01T00:00:00.000Z"
          }
        ]}
      />
    );

    await user.click(screen.getByRole("tab", { name: "Týmy" }));
    expect(await screen.findByTestId("teams-grid")).toBeInTheDocument();
    expect(screen.getByTestId("team-add-form")).toBeInTheDocument();
  });

  it("switches to players tab", async () => {
    const user = userEvent.setup();
    render(
      <DictionariesPage
        {...baseProps}
        sportPlayers={[
          {
            id: 2,
            name: "Pastrňák",
            thesportsdb_player_id: "34145937",
            sport: "Ice Hockey",
            active: true,
            created_at: "2026-01-01T00:00:00.000Z",
            updated_at: "2026-01-01T00:00:00.000Z"
          }
        ]}
      />
    );

    await user.click(screen.getByRole("tab", { name: "Sportovci" }));
    expect(await screen.findByTestId("players-grid")).toBeInTheDocument();
    expect(screen.getByTestId("player-add-form")).toBeInTheDocument();
  });

  it("shows error and notice", () => {
    render(<DictionariesPage {...baseProps} error="Chyba číselníku" />);
    expect(screen.getByText("Chyba číselníku")).toBeInTheDocument();

    render(<DictionariesPage {...baseProps} notice="Uloženo" />);
    expect(screen.getByText("Uloženo")).toBeInTheDocument();
  });
});
