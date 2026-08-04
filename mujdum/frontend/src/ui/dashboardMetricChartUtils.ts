import {
  addDaysToDateKey,
  APP_TIMEZONE,
  calendarDateKey,
  dayBoundsIso as zonedDayBoundsIso,
  monthDateKey,
  weekStartDateKey,
  yearDateKey,
  zonedStartOfDayUtc
} from "./chartTimezone.js";

export type MetricHistoryPoint = {
  ts: string;
  value: unknown;
  numeric: number | null;
};

export { APP_TIMEZONE };

export function toStateLabel(v: unknown): string {
  if (typeof v === "string") return v.trim() || "—";
  if (typeof v === "boolean") return v ? "on" : "off";
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (v === null || v === undefined) return "—";
  try {
    return JSON.stringify(v);
  } catch {
    return "—";
  }
}

export function hasNumericSeries(points: MetricHistoryPoint[]): boolean {
  const nums = points
    .map((p) => p.numeric)
    .filter((x): x is number => typeof x === "number");
  return nums.length >= 2;
}

export function formatAxisTime(tsMs: number, windowMinutes: number): string {
  const d = new Date(tsMs);
  if (windowMinutes <= 24 * 60) {
    return d.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
  }
  if (windowMinutes <= 7 * 24 * 60) {
    return d.toLocaleString("cs-CZ", {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  }
  if (windowMinutes <= 90 * 24 * 60) {
    return d.toLocaleDateString("cs-CZ", { month: "short", day: "2-digit" });
  }
  return d.toLocaleDateString("cs-CZ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
}

export function stateColorForLabel(s: string): string {
  let hsh = 0;
  for (let i = 0; i < s.length; i++) hsh = (hsh * 31 + (s.codePointAt(i) ?? 0)) >>> 0;
  const hue = hsh % 360;
  return `hsl(${hue} 70% 60% / 0.9)`;
}

export function metricChartColor(metricKey: string): string {
  if (metricKey.startsWith("electricity_")) return "#b7c4ff";
  if (metricKey.endsWith("_pct")) return "#b7c4ff";
  if (metricKey.startsWith("temp_")) return "#44e2cd";
  return "#44e2cd";
}

export const ELECTRICITY_PRODUCTION_KEY = "electricity_production_w";
export const ELECTRICITY_CONSUMPTION_KEY = "electricity_consumption_w";
export const ELECTRICITY_COMBINED_CHART_KEY = "electricity_combined";

export const CHART_DAY_WINDOW_MINUTES = 24 * 60;
export const CHART_WEEK_WINDOW_MINUTES = 7 * 24 * 60;
export const CHART_MONTH_WINDOW_MINUTES = 30 * 24 * 60;
export const CHART_YEAR_WINDOW_MINUTES = 365 * 24 * 60;

export type ChartCalendarPeriodKind = "day" | "week" | "month" | "year";

export function chartCalendarPeriodKind(
  windowMinutes: number
): ChartCalendarPeriodKind | null {
  if (windowMinutes === CHART_DAY_WINDOW_MINUTES) return "day";
  if (windowMinutes === CHART_WEEK_WINDOW_MINUTES) return "week";
  if (windowMinutes === CHART_MONTH_WINDOW_MINUTES) return "month";
  if (windowMinutes === CHART_YEAR_WINDOW_MINUTES) return "year";
  return null;
}

export function chartSupportsCalendarNav(windowMinutes: number): boolean {
  return chartCalendarPeriodKind(windowMinutes) !== null;
}

/** Kalendářní den v `APP_TIMEZONE` (Europe/Prague). */
export function localDateKey(d = new Date()): string {
  return calendarDateKey(d);
}

export { addDaysToDateKey };

/** [from, to) pro kalendářní den v APP_TIMEZONE. */
export function dayBoundsIso(dateKey: string): { from: string; to: string } {
  return zonedDayBoundsIso(dateKey);
}

export function formatChartDayLabel(dateKey: string): string {
  const today = localDateKey();
  if (dateKey === today) return "Dnes";
  const sameYear = dateKey.slice(0, 4) === today.slice(0, 4);
  const dt = new Date(zonedStartOfDayUtc(dateKey));
  return dt.toLocaleDateString("cs-CZ", {
    timeZone: APP_TIMEZONE,
    day: "numeric",
    month: "numeric",
    ...(sameYear ? {} : { year: "numeric" })
  });
}

export function compareDateKeys(a: string, b: string): number {
  return a.localeCompare(b);
}

export function localWeekStartKey(d = new Date()): string {
  return weekStartDateKey(d);
}

export function localMonthKey(d = new Date()): string {
  return monthDateKey(d);
}

export function localYearKey(d = new Date()): string {
  return yearDateKey(d);
}

export function currentPeriodAnchor(
  kind: ChartCalendarPeriodKind,
  d = new Date()
): string {
  switch (kind) {
    case "day":
      return localDateKey(d);
    case "week":
      return localWeekStartKey(d);
    case "month":
      return localMonthKey(d);
    case "year":
      return localYearKey(d);
  }
}

export function periodBoundsIso(
  kind: ChartCalendarPeriodKind,
  anchor: string
): { from: string; to: string } {
  switch (kind) {
    case "day":
      return dayBoundsIso(anchor);
    case "week": {
      const { from } = dayBoundsIso(anchor);
      const to = new Date(zonedStartOfDayUtc(addDaysToDateKey(anchor, 7))).toISOString();
      return { from, to };
    }
    case "month": {
      const from = new Date(zonedStartOfDayUtc(`${anchor}-01`)).toISOString();
      const [y, m] = anchor.split("-").map(Number);
      const nextAnchor =
        m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
      const to = new Date(zonedStartOfDayUtc(`${nextAnchor}-01`)).toISOString();
      return { from, to };
    }
    case "year": {
      const from = new Date(zonedStartOfDayUtc(`${anchor}-01-01`)).toISOString();
      const to = new Date(
        zonedStartOfDayUtc(`${Number(anchor) + 1}-01-01`)
      ).toISOString();
      return { from, to };
    }
  }
}

export function shiftPeriodAnchor(
  kind: ChartCalendarPeriodKind,
  anchor: string,
  delta: number
): string {
  switch (kind) {
    case "day":
      return addDaysToDateKey(anchor, delta);
    case "week":
      return addDaysToDateKey(anchor, delta * 7);
    case "month": {
      const [y, m] = anchor.split("-").map(Number);
      const shifted = new Date(Date.UTC(y, m - 1 + delta, 1));
      return monthDateKey(shifted);
    }
    case "year":
      return String(Number(anchor) + delta);
  }
}

export function comparePeriodAnchors(
  kind: ChartCalendarPeriodKind,
  a: string,
  b: string
): number {
  if (kind === "year") return Number(a) - Number(b);
  return a.localeCompare(b);
}

export function isCurrentPeriod(
  kind: ChartCalendarPeriodKind,
  anchor: string
): boolean {
  return anchor === currentPeriodAnchor(kind);
}

export function isPeriodAnchorInFuture(
  kind: ChartCalendarPeriodKind,
  anchor: string
): boolean {
  return comparePeriodAnchors(kind, anchor, currentPeriodAnchor(kind)) > 0;
}

export function chartPeriodNavPrevLabel(kind: ChartCalendarPeriodKind): string {
  const map: Record<ChartCalendarPeriodKind, string> = {
    day: "Předchozí den",
    week: "Předchozí týden",
    month: "Předchozí měsíc",
    year: "Předchozí rok"
  };
  return map[kind];
}

export function chartPeriodNavNextLabel(kind: ChartCalendarPeriodKind): string {
  const map: Record<ChartCalendarPeriodKind, string> = {
    day: "Následující den",
    week: "Následující týden",
    month: "Následující měsíc",
    year: "Následující rok"
  };
  return map[kind];
}

export function formatChartPeriodLabel(
  kind: ChartCalendarPeriodKind,
  anchor: string
): string {
  if (isCurrentPeriod(kind, anchor)) {
    const map: Record<ChartCalendarPeriodKind, string> = {
      day: "Dnes",
      week: "Tento týden",
      month: "Tento měsíc",
      year: "Tento rok"
    };
    return map[kind];
  }
  switch (kind) {
    case "day":
      return formatChartDayLabel(anchor);
    case "week": {
      const endKey = addDaysToDateKey(anchor, 6);
      const [y1, m1, d1] = anchor.split("-").map(Number);
      const [y2, m2, d2] = endKey.split("-").map(Number);
      const start = new Date(y1, m1 - 1, d1);
      const end = new Date(y2, m2 - 1, d2);
      const sameMonth = m1 === m2 && y1 === y2;
      const sameYear = y1 === y2;
      if (sameMonth) {
        return `${d1}.–${d2}. ${start.toLocaleDateString("cs-CZ", { month: "short" })}`;
      }
      if (sameYear) {
        return `${start.toLocaleDateString("cs-CZ", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("cs-CZ", { day: "numeric", month: "short" })}`;
      }
      return `${start.toLocaleDateString("cs-CZ", { day: "numeric", month: "short", year: "numeric" })} – ${end.toLocaleDateString("cs-CZ", { day: "numeric", month: "short", year: "numeric" })}`;
    }
    case "month": {
      const [y, m] = anchor.split("-").map(Number);
      return new Date(y, m - 1, 1).toLocaleDateString("cs-CZ", {
        month: "long",
        year: "numeric"
      });
    }
    case "year":
      return anchor;
  }
}

export function isTemperatureMetric(metricKey: string): boolean {
  return metricKey.startsWith("temp_");
}

export function isElectricityCombinedChart(key: string): boolean {
  return key === ELECTRICITY_COMBINED_CHART_KEY;
}

export function collectNumericValues(points: MetricHistoryPoint[]): number[] {
  return points
    .map((p) => p.numeric)
    .filter((n): n is number => typeof n === "number" && Number.isFinite(n));
}

/** Y osa od min do max zobrazených hodnot (+ malá rezerva). */
export function numericYAxisDomainLimit(
  min: number,
  max: number,
  options?: { minPadding?: number; ratio?: number }
): { min: number; max: number } {
  const ratio = options?.ratio ?? 0.06;
  const minPadding = options?.minPadding ?? 0.5;
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { min: 0, max: 1 };
  }
  const span = max - min;
  const pad = span === 0 ? minPadding : Math.max(span * ratio, minPadding);
  return { min: min - pad, max: max + pad };
}

export function temperatureYAxisDomainLimit(min: number, max: number) {
  const domain = numericYAxisDomainLimit(min, max, { minPadding: 0.3, ratio: 0.05 });
  return {
    min: Math.min(0, domain.min),
    max: domain.max
  };
}

export function powerYAxisDomainLimit(min: number, max: number) {
  return numericYAxisDomainLimit(min, max, { minPadding: 50, ratio: 0.08 });
}

export type AlignedMetricSeries = {
  x: Date[];
  series: Array<{ key: string; values: (number | null)[] }>;
};

/**
 * Sloučí časové řady podle timestampu (společná osa X).
 * U chybějících hodnot v řadě je `null` — u LineChart nastav `connectNulls: true`,
 * jinak se čára přeruší (výroba a spotřeba mají často různé časy měření).
 */
export function alignMetricHistories(
  entries: Array<{ key: string; points: MetricHistoryPoint[] }>
): AlignedMetricSeries {
  const byTs = new Map<number, Map<string, number>>();

  for (const { key, points } of entries) {
    for (const p of points) {
      const t = Date.parse(p.ts);
      if (!Number.isFinite(t)) continue;
      if (typeof p.numeric !== "number" || !Number.isFinite(p.numeric)) continue;
      if (!byTs.has(t)) byTs.set(t, new Map());
      byTs.get(t)!.set(key, p.numeric);
    }
  }

  const times = [...byTs.keys()].sort((a, b) => a - b);
  const keys = entries.map((e) => e.key);

  return {
    x: times.map((t) => new Date(t)),
    series: keys.map((key) => ({
      key,
      values: times.map((t) => byTs.get(t)?.get(key) ?? null)
    }))
  };
}

export function formatChartTemperature(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "";
  return `${value.toFixed(1)} °C`;
}

export function formatChartPowerW(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "";
  const w = Math.round(value);
  const abs = Math.abs(w);
  if (abs >= 1000) return `${(w / 1000).toFixed(2)} kW`;
  return `${w} W`;
}

export type EnergyBucketUnit = "week" | "month";

export type ElectricityEnergyBucket = {
  key: string;
  from: string;
  to: string;
  producedKwh: number;
  consumedKwh: number;
};

export type ElectricityEnergyBuckets = {
  period: "month" | "year";
  anchor: string;
  bucketUnit: EnergyBucketUnit;
  buckets: ElectricityEnergyBucket[];
};

export type ElectricityChartView = "line" | "bars";

/** Výchozí pohled pro časové okno: měsíc/rok → sloupce (kWh), jinak čára (W). */
export function defaultElectricityViewForWindow(
  windowMinutes: number
): ElectricityChartView {
  const kind = chartCalendarPeriodKind(windowMinutes);
  return kind === "month" || kind === "year" ? "bars" : "line";
}

/** Podporuje dané okno přepínač čára/sloupce? (jen měsíc a rok) */
export function electricitySupportsBars(windowMinutes: number): boolean {
  const kind = chartCalendarPeriodKind(windowMinutes);
  return kind === "month" || kind === "year";
}

/** Popisek sloupce: týden „12.–18.5.“, měsíc „kvě“. */
export function formatEnergyBucketLabel(unit: EnergyBucketUnit, key: string): string {
  if (unit === "week") {
    const endKey = addDaysToDateKey(key, 6);
    const [, m1, d1] = key.split("-").map(Number);
    const [, , d2] = endKey.split("-").map(Number);
    return `${d1}.–${d2}.${m1}.`;
  }
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("cs-CZ", { month: "short" });
}

export function formatChartEnergyKwh(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "";
  return `${value.toFixed(2)} kWh`;
}

export function hasEnergyBucketData(buckets: ElectricityEnergyBucket[]): boolean {
  return buckets.some((b) => b.producedKwh > 0 || b.consumedKwh > 0);
}
