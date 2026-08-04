import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SportUpcomingList from "../src/ui/SportUpcomingList.js";
import { sampleSportEvent } from "./testUtils.js";

describe("SportUpcomingList", () => {
  it("renders event cards", () => {
    render(<SportUpcomingList events={[sampleSportEvent]} />);

    expect(screen.getByText("Sparta — Slavia")).toBeInTheDocument();
    expect(screen.getByRole("list")).toHaveClass("sportEventList");
  });

  it("renders empty list", () => {
    render(<SportUpcomingList events={[]} />);
    expect(screen.getByRole("list")).toBeEmptyDOMElement();
  });
});
