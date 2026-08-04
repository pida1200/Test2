import { APP_TIMEZONE, calendarDateKey } from "../src/ui/chartTimezone.js";
import { describe, expect, it } from "vitest";
import {
  addDaysToDateKey,
  alignMetricHistories,
  chartCalendarPeriodKind,
  CHART_DAY_WINDOW_MINUTES,
  CHART_MONTH_WINDOW_MINUTES,
  CHART_WEEK_WINDOW_MINUTES,
  CHART_YEAR_WINDOW_MINUTES,
  dayBoundsIso,
  defaultElectricityViewForWindow,
  electricitySupportsBars,
  formatChartEnergyKwh,
  formatChartPeriodLabel,
  formatEnergyBucketLabel,
  formatChartPowerW,
  formatChartTemperature,
  hasEnergyBucketData,
  hasNumericSeries,
  isCurrentPeriod,
  isTemperatureMetric,
  localDateKey,
  localMonthKey,
  localWeekStartKey,
  metricChartColor,
  numericYAxisDomainLimit,
  periodBoundsIso,
  powerYAxisDomainLimit,
  shiftPeriodAnchor,
  stateColorForLabel,
  temperatureYAxisDomainLimit,
  toStateLabel,
  compareDateKeys,
  chartPeriodNavNextLabel,
  chartPeriodNavPrevLabel,
  formatAxisTime
} from "../src/ui/dashboardMetricChartUtils.js";

describe("dashboardMetricChartUtils", () => {
  it("toStateLabel normalizes booleans", () => {
    expect(toStateLabel(true)).toBe("on");
    expect(toStateLabel(false)).toBe("off");
  });

  it("hasNumericSeries requires at least two numeric points", () => {
    expect(
      hasNumericSeries([
        { ts: "2026-01-01T00:00:00Z", value: 1, numeric: 1 },
        { ts: "2026-01-01T01:00:00Z", value: 2, numeric: 2 }
      ])
    ).toBe(true);
    expect(
      hasNumericSeries([
        { ts: "2026-01-01T00:00:00Z", value: "on", numeric: null }
      ])
    ).toBe(false);
  });

  it("metricChartColor picks palette by key prefix", () => {
    expect(metricChartColor("temp_jircany")).toBe("#44e2cd");
    expect(metricChartColor("electricity_production_w")).toBe("#b7c4ff");
  });

  it("isTemperatureMetric detects temp keys", () => {
    expect(isTemperatureMetric("temp_jircany")).toBe(true);
    expect(isTemperatureMetric("electricity_production_w")).toBe(false);
  });

  it("temperatureYAxisDomainLimit pads max and uses 0 as min when data are positive", () => {
    const { min, max } = temperatureYAxisDomainLimit(20, 22);
    expect(min).toBe(0);
    expect(max).toBeGreaterThan(22);
  });

  it("temperatureYAxisDomainLimit keeps negative min below zero", () => {
    const { min, max } = temperatureYAxisDomainLimit(-2, 5);
    expect(min).toBeLessThan(0);
    expect(max).toBeGreaterThan(5);
  });

  it("numericYAxisDomainLimit handles flat series", () => {
    const { min, max } = numericYAxisDomainLimit(100, 100, { minPadding: 10 });
    expect(min).toBe(90);
    expect(max).toBe(110);
  });

  it("dayBoundsIso covers local calendar day", () => {
    const key = "2026-05-16";
    const { from, to } = dayBoundsIso(key);
    expect(Date.parse(to) - Date.parse(from)).toBe(24 * 60 * 60 * 1000);
  });

  it("addDaysToDateKey shifts calendar days", () => {
    expect(addDaysToDateKey("2026-05-16", -1)).toBe("2026-05-15");
    expect(addDaysToDateKey("2026-05-16", 1)).toBe("2026-05-17");
  });

  it("chartCalendarPeriodKind maps window buttons", () => {
    expect(chartCalendarPeriodKind(CHART_DAY_WINDOW_MINUTES)).toBe("day");
    expect(chartCalendarPeriodKind(CHART_WEEK_WINDOW_MINUTES)).toBe("week");
    expect(chartCalendarPeriodKind(CHART_MONTH_WINDOW_MINUTES)).toBe("month");
    expect(chartCalendarPeriodKind(CHART_YEAR_WINDOW_MINUTES)).toBe("year");
    expect(chartCalendarPeriodKind(6 * 60)).toBeNull();
  });

  it("periodBoundsIso covers calendar month", () => {
    const { from, to } = periodBoundsIso("month", "2026-05");
    const spanDays = (Date.parse(to) - Date.parse(from)) / (24 * 60 * 60 * 1000);
    expect(spanDays).toBe(31);
    expect(calendarDateKey(new Date(from), APP_TIMEZONE)).toBe("2026-05-01");
    expect(calendarDateKey(new Date(to), APP_TIMEZONE)).toBe("2026-06-01");
  });

  it("shiftPeriodAnchor shifts months and weeks", () => {
    expect(shiftPeriodAnchor("month", "2026-05", -1)).toBe("2026-04");
    expect(shiftPeriodAnchor("week", "2026-05-12", 1)).toBe("2026-05-19");
  });

  it("formatChartPeriodLabel shows current period labels", () => {
    expect(formatChartPeriodLabel("day", localDateKey())).toBe("Dnes");
    expect(formatChartPeriodLabel("week", localWeekStartKey())).toBe("Tento týden");
    expect(formatChartPeriodLabel("month", localMonthKey())).toBe("Tento měsíc");
    expect(isCurrentPeriod("day", localDateKey())).toBe(true);
  });

  it("defaultElectricityViewForWindow → bars jen pro měsíc/rok", () => {
    expect(defaultElectricityViewForWindow(CHART_DAY_WINDOW_MINUTES)).toBe("line");
    expect(defaultElectricityViewForWindow(CHART_WEEK_WINDOW_MINUTES)).toBe("line");
    expect(defaultElectricityViewForWindow(CHART_MONTH_WINDOW_MINUTES)).toBe("bars");
    expect(defaultElectricityViewForWindow(CHART_YEAR_WINDOW_MINUTES)).toBe("bars");
  });

  it("electricitySupportsBars jen pro měsíc/rok", () => {
    expect(electricitySupportsBars(CHART_DAY_WINDOW_MINUTES)).toBe(false);
    expect(electricitySupportsBars(CHART_MONTH_WINDOW_MINUTES)).toBe(true);
    expect(electricitySupportsBars(CHART_YEAR_WINDOW_MINUTES)).toBe(true);
  });

  it("formatEnergyBucketLabel formátuje týden a měsíc", () => {
    expect(formatEnergyBucketLabel("week", "2025-05-12")).toBe("12.–18.5.");
    expect(formatEnergyBucketLabel("month", "2025-01")).toMatch(/led/i);
  });

  it("formatChartEnergyKwh a hasEnergyBucketData", () => {
    expect(formatChartEnergyKwh(12.345)).toBe("12.35 kWh");
    expect(formatChartEnergyKwh(null)).toBe("");
    expect(
      hasEnergyBucketData([
        { key: "a", from: "", to: "", producedKwh: 0, consumedKwh: 0 }
      ])
    ).toBe(false);
    expect(
      hasEnergyBucketData([
        { key: "a", from: "", to: "", producedKwh: 1, consumedKwh: 0 }
      ])
    ).toBe(true);
  });

  it("alignMetricHistories merges by timestamp", () => {
    const aligned = alignMetricHistories([
      {
        key: "a",
        points: [
          { ts: "2026-01-01T10:00:00Z", value: 1, numeric: 1 },
          { ts: "2026-01-01T11:00:00Z", value: 3, numeric: 3 }
        ]
      },
      {
        key: "b",
        points: [
          { ts: "2026-01-01T10:30:00Z", value: 2, numeric: 2 },
          { ts: "2026-01-01T11:00:00Z", value: 4, numeric: 4 }
        ]
      }
    ]);
    expect(aligned.x).toHaveLength(3);
    expect(aligned.series[0]?.values).toEqual([1, null, 3]);
    expect(aligned.series[1]?.values).toEqual([null, 2, 4]);
  });

  it("formatChartTemperature and formatChartPowerW format values", () => {
    expect(formatChartTemperature(20.12)).toBe("20.1 °C");
    expect(formatChartTemperature(null)).toBe("");
    expect(formatChartPowerW(500)).toBe("500 W");
    expect(formatChartPowerW(null)).toBe("");
  });

  it("powerYAxisDomainLimit pads power axis", () => {
    const { min, max } = powerYAxisDomainLimit(100, 200);
    expect(min).toBeLessThan(100);
    expect(max).toBeGreaterThan(200);
  });

  it("toStateLabel handles objects via JSON", () => {
    expect(toStateLabel({ mode: "auto" })).toContain("mode");
  });

  it("formatAxisTime adapts label to window size", () => {
    const ts = Date.parse("2026-05-16T14:30:00.000Z");
    expect(formatAxisTime(ts, 360)).toMatch(/\d/);
    expect(formatAxisTime(ts, 7 * 24 * 60)).toMatch(/\d/);
    expect(formatAxisTime(ts, 30 * 24 * 60)).toMatch(/\d/);
    expect(formatAxisTime(ts, 365 * 24 * 60)).toMatch(/\d/);
  });

  it("stateColorForLabel and metricChartColor return stable colors", () => {
    expect(stateColorForLabel("on")).toMatch(/^hsl\(/);
    expect(metricChartColor("humidity_pct")).toBe("#b7c4ff");
  });

  it("periodBoundsIso covers week and year", () => {
    const week = periodBoundsIso("week", "2026-05-12");
    expect(Date.parse(week.to) - Date.parse(week.from)).toBe(7 * 24 * 60 * 60 * 1000);

    const year = periodBoundsIso("year", "2026");
    expect(calendarDateKey(new Date(year.from), APP_TIMEZONE)).toBe("2026-01-01");
    expect(calendarDateKey(new Date(year.to), APP_TIMEZONE)).toBe("2027-01-01");
  });

  it("formatChartPowerW uses kW for large values", () => {
    expect(formatChartPowerW(2500)).toBe("2.50 kW");
  });

  it("compareDateKeys and chart nav labels", () => {
    expect(compareDateKeys("2026-01-01", "2026-02-01")).toBeLessThan(0);
    expect(chartPeriodNavPrevLabel("month")).toBe("Předchozí měsíc");
    expect(chartPeriodNavNextLabel("year")).toBe("Následující rok");
  });
});
