import { describe, expect, it } from "vitest";
import {
  formatEnergyKwh,
  formatIrrigationRainSensor,
  formatMinutesLeft,
  formatMowerSchedulePaused,
  formatOnOff,
  formatPercent,
  formatPower,
  formatRainSensor,
  formatTemp
} from "../src/ui/dashboardFormatters.js";

describe("dashboardFormatters", () => {
  it("formatTemp formats numbers and strings", () => {
    expect(formatTemp(21.256)).toBe("21.3 °C");
    expect(formatTemp("18")).toBe("18 °C");
    expect(formatTemp(null)).toBe("—");
  });

  it("formatOnOff handles booleans and HA states", () => {
    expect(formatOnOff(true)).toBe("Zapnuto");
    expect(formatOnOff("off")).toBe("Vypnuto");
  });

  it("formatMinutesLeft formats duration", () => {
    expect(formatMinutesLeft(45)).toBe("45 min");
    expect(formatMinutesLeft(90)).toBe("1:30 h");
  });

  it("formatRainSensor maps HA rain states", () => {
    expect(formatRainSensor("dry")).toBe("Sucho");
    expect(formatRainSensor("wet")).toBe("Déšť");
  });

  it("formatIrrigationRainSensor maps binary sensor", () => {
    expect(formatIrrigationRainSensor(false)).toBe("Sucho");
    expect(formatIrrigationRainSensor("on")).toBe("Déšť");
  });

  it("formatPercent clamps to 0–100", () => {
    expect(formatPercent(105)).toBe("100 %");
    expect(formatPercent("-5")).toBe("0 %");
  });

  it("formatPower switches to kW for high values", () => {
    expect(formatPower(850)).toBe("850 W");
    expect(formatPower(2500)).toBe("2.50 kW");
  });

  it("formatEnergyKwh picks precision by magnitude", () => {
    expect(formatEnergyKwh(3.456)).toBe("3.46 kWh");
    expect(formatEnergyKwh(42.789)).toBe("42.8 kWh");
  });

  it("formatMowerSchedulePaused describes schedule state", () => {
    expect(formatMowerSchedulePaused(true)).toBe("Plán pozastaven");
    expect(formatMowerSchedulePaused("off")).toBe("Plán aktivní");
  });
});
