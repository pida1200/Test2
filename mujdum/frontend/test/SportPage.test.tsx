import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SportPage } from "../src/ui/SportPage.js";
import { sampleSportEvent } from "./testUtils.js";

vi.mock("../src/ui/SportUpcomingList", () => ({
  default: ({ events }: { events: { length: number } }) => (
    <div data-testid="sport-upcoming-list">{events.length} událostí</div>
  )
}));

describe("SportPage", () => {
  it("shows loading when events are null", () => {
    render(
      <SportPage
        error={null}
        sportSyncNotice={null}
        sportSyncedAt={null}
        sportEvents={null}
        syncingSport={false}
      />
    );
    expect(screen.getByText("Načítám…")).toBeInTheDocument();
  });

  it("shows syncing state", () => {
    render(
      <SportPage
        error={null}
        sportSyncNotice={null}
        sportSyncedAt={null}
        sportEvents={[]}
        syncingSport
      />
    );
    expect(screen.getByText("Synchronizuji…")).toBeInTheDocument();
  });

  it("shows empty message without prior sync", () => {
    render(
      <SportPage
        error={null}
        sportSyncNotice={null}
        sportSyncedAt={null}
        sportEvents={[]}
        syncingSport={false}
      />
    );
    expect(screen.getByText(/THESPORTSDB_API_KEY/)).toBeInTheDocument();
  });

  it("shows empty message after sync", () => {
    render(
      <SportPage
        error={null}
        sportSyncNotice={null}
        sportSyncedAt="2026-05-30T10:00:00.000Z"
        sportEvents={[]}
        syncingSport={false}
      />
    );
    expect(screen.getByText(/Žádná utkání od začátku dnešního dne/)).toBeInTheDocument();
  });

  it("renders event list", async () => {
    render(
      <SportPage
        error={null}
        sportSyncNotice={null}
        sportSyncedAt={null}
        sportEvents={[sampleSportEvent]}
        syncingSport={false}
      />
    );
    expect(await screen.findByTestId("sport-upcoming-list")).toHaveTextContent("1 událostí");
  });

  it("shows error and sync notice", () => {
    render(
      <SportPage
        error="Sync selhal"
        sportSyncNotice="Obnoveno z cache"
        sportSyncedAt={null}
        sportEvents={null}
        syncingSport={false}
      />
    );
    expect(screen.getByText("Sync selhal")).toBeInTheDocument();
    expect(screen.getByText("Obnoveno z cache")).toBeInTheDocument();
  });
});
