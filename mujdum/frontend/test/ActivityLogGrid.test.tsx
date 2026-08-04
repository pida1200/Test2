import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ActivityLogGrid from "../src/ui/ActivityLogGrid.js";
import { sampleActivity } from "./testUtils.js";

describe("ActivityLogGrid", () => {
  it("renders log rows", async () => {
    render(<ActivityLogGrid rows={[sampleActivity]} />);

    expect(await screen.findByText("Sync OK")).toBeInTheDocument();
    expect(screen.getByText("dashboard.ha_sync")).toBeInTheDocument();
  });
});
