import { describe, expect, it } from "vitest";
import {
  calendarDateKeyInTimeZone,
  computeElectricityEnergyKwh,
  electricityTodayMetricsFromEnergy,
  filterSamplesForCalendarDay,
  hasElectricityTodayMetrics,
  roundEnergyKwh
} from "../src/electricityEnergy.js";

describe("electricityEnergy", () => {
  it("integrates consumption and split import/export", () => {
    const base = Date.parse("2026-05-16T08:00:00.000Z");
    const production = [
      { ts: new Date(base).toISOString(), watts: 2000 },
      { ts: new Date(base + 3_600_000).toISOString(), watts: 2000 }
    ];
    const consumption = [
      { ts: new Date(base).toISOString(), watts: 1000 },
      { ts: new Date(base + 3_600_000).toISOString(), watts: 1000 }
    ];
    const r = computeElectricityEnergyKwh(production, consumption);
    expect(r).not.toBeNull();
    expect(r!.producedKwh).toBeCloseTo(2, 2);
    expect(r!.consumedKwh).toBeCloseTo(1, 2);
    expect(r!.soldKwh).toBeCloseTo(1, 2);
    expect(r!.purchasedKwh).toBeCloseTo(0, 2);
  });

  it("counts import when consumption exceeds production", () => {
    const base = Date.parse("2026-05-16T20:00:00.000Z");
    const production = [
      { ts: new Date(base).toISOString(), watts: 0 },
      { ts: new Date(base + 3_600_000).toISOString(), watts: 0 }
    ];
    const consumption = [
      { ts: new Date(base).toISOString(), watts: 3000 },
      { ts: new Date(base + 3_600_000).toISOString(), watts: 3000 }
    ];
    const r = computeElectricityEnergyKwh(production, consumption);
    expect(r!.producedKwh).toBeCloseTo(0, 2);
    expect(r!.consumedKwh).toBeCloseTo(3, 2);
    expect(r!.purchasedKwh).toBeCloseTo(3, 2);
    expect(r!.soldKwh).toBeCloseTo(0, 2);
  });

  it("returns null with insufficient points", () => {
    expect(
      computeElectricityEnergyKwh([{ ts: "2026-05-16T10:00:00Z", watts: 100 }], [])
    ).toBeNull();
  });

  it("filters samples by calendar day in timezone", () => {
    const samples = [
      { ts: "2026-05-15T22:00:00.000Z", watts: 1 },
      { ts: "2026-05-16T10:00:00.000Z", watts: 2 }
    ];
    const pragueKey = calendarDateKeyInTimeZone("2026-05-16T10:00:00.000Z", "Europe/Prague");
    const day = filterSamplesForCalendarDay(samples, pragueKey, "Europe/Prague");
    expect(day.length).toBeGreaterThanOrEqual(1);
  });

  it("roundEnergyKwh rounds to 2 decimals", () => {
    expect(roundEnergyKwh(1.234)).toBe(1.23);
  });

  it("hasElectricityTodayMetrics detects complete set", () => {
    expect(hasElectricityTodayMetrics({})).toBe(false);
    expect(
      hasElectricityTodayMetrics(
        electricityTodayMetricsFromEnergy({
          producedKwh: 1,
          consumedKwh: 1,
          purchasedKwh: 0,
          soldKwh: 0
        })
      )
    ).toBe(true);
  });
});
