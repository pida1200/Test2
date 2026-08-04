import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RoomsDictionaryGrid from "../src/ui/RoomsDictionaryGrid.js";

describe("RoomsDictionaryGrid", () => {
  it("renders room rows", async () => {
    render(
      <RoomsDictionaryGrid
        rows={[{ id: 1, name: "Ložnice", created_at: "2026-05-01T08:00:00.000Z" }]}
      />
    );

    expect(await screen.findByText("Ložnice")).toBeInTheDocument();
    expect(screen.getByRole("grid", { name: "Číselník místností" })).toBeInTheDocument();
  });
});
