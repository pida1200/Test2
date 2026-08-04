import { describe, expect, it } from "vitest";
import {
  addDaysToDateKey,
  APP_TIMEZONE,
  calendarDateKey,
  dayBoundsIso,
  weekStartDateKey
} from "../src/ui/chartTimezone.js";

describe("chartTimezone", () => {
  it("uses Europe/Prague for calendarDateKey", () => {
    expect(APP_TIMEZONE).toBe("Europe/Prague");
    const key = calendarDateKey(new Date("2026-05-16T12:00:00Z"));
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("dayBoundsIso spans 24 hours in Prague", () => {
    const { from, to } = dayBoundsIso("2026-05-16");
    expect(Date.parse(to) - Date.parse(from)).toBe(24 * 60 * 60 * 1000);
  });

  it("addDaysToDateKey shifts in Prague calendar", () => {
    expect(addDaysToDateKey("2026-05-16", 1)).toBe("2026-05-17");
  });

  it("weekStartDateKey anchors week containing date in Prague", () => {
    const d = new Date("2026-05-16T10:00:00Z");
    const mon = weekStartDateKey(d);
    const key = calendarDateKey(d);
    expect(mon <= key).toBe(true);
    expect(addDaysToDateKey(mon, 6) >= key).toBe(true);
  });
});
