/**
 * Agregace energie (kWh) do období pro sloupcový graf:
 * - period "month": týdenní sloupce (kalendářní týden po–ne) přes daný měsíc,
 * - period "year": měsíční sloupce (leden–prosinec) přes daný rok.
 *
 * Sloupec = ∫ výkon (W) → energie (kWh) za výroba i spotřebu, integrace
 * lichoběžníkovou metodou ze vzorků v `dashboard_metrics_history`.
 */

import type { Db } from "./db.js";
import {
  calendarDateKeyInTimeZone,
  DEFAULT_ELECTRICITY_TIMEZONE,
  MAX_GAP_HOURS,
  mergePowerTimelines,
  MS_PER_HOUR,
  roundEnergyKwh,
  startOfCalendarDayInTimeZone,
  todayDateKeyInTimeZone,
  W_PER_KWH,
  type PowerSample
} from "./electricityEnergy.js";

export const ELECTRICITY_PRODUCTION_KEY = "electricity_production_w";
export const ELECTRICITY_CONSUMPTION_KEY = "electricity_consumption_w";

export type EnergyBucketPeriod = "month" | "year";

export type EnergyBucket = {
  key: string;
  from: string;
  to: string;
  producedKwh: number;
  consumedKwh: number;
};

export type ElectricityEnergyBucketsResult = {
  period: EnergyBucketPeriod;
  anchor: string;
  bucketUnit: "week" | "month";
  buckets: EnergyBucket[];
};

type BucketBounds = { key: string; fromMs: number; toMs: number };

function addDaysToDateKey(
  dateKey: string,
  delta: number,
  timeZone: string
): string {
  const startMs = startOfCalendarDayInTimeZone(
    new Date(`${dateKey}T12:00:00.000Z`),
    timeZone
  ).getTime();
  return calendarDateKeyInTimeZone(new Date(startMs + delta * 86_400_000), timeZone);
}

function startOfDayMs(dateKey: string, timeZone: string): number {
  return startOfCalendarDayInTimeZone(
    new Date(`${dateKey}T12:00:00.000Z`),
    timeZone
  ).getTime();
}

function mondayIndex(dateKey: string, timeZone: string): number {
  const noonMs = startOfDayMs(dateKey, timeZone) + 12 * MS_PER_HOUR;
  const wd = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(
    new Date(noonMs)
  );
  const map: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6
  };
  return map[wd] ?? 0;
}

function weekStartKey(dateKey: string, timeZone: string): string {
  return addDaysToDateKey(dateKey, -mondayIndex(dateKey, timeZone), timeZone);
}

function lastDayOfMonthKey(anchor: string): string {
  const [y, m] = anchor.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${anchor}-${String(last).padStart(2, "0")}`;
}

function isValidMonthAnchor(anchor: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(anchor)) return false;
  const m = Number(anchor.slice(5, 7));
  return m >= 1 && m <= 12;
}

function isValidYearAnchor(anchor: string): boolean {
  return /^\d{4}$/.test(anchor);
}

/** Hranice týdenních sloupců (po–ne) protínajících daný měsíc; sloupce = celé týdny. */
export function monthWeekBuckets(
  anchor: string,
  timeZone: string = DEFAULT_ELECTRICITY_TIMEZONE
): BucketBounds[] {
  const firstKey = `${anchor}-01`;
  const lastKey = lastDayOfMonthKey(anchor);
  const startWeek = weekStartKey(firstKey, timeZone);
  const endWeek = weekStartKey(lastKey, timeZone);

  const buckets: BucketBounds[] = [];
  let cursor = startWeek;
  for (let guard = 0; guard < 8; guard++) {
    const nextWeek = addDaysToDateKey(cursor, 7, timeZone);
    buckets.push({
      key: cursor,
      fromMs: startOfDayMs(cursor, timeZone),
      toMs: startOfDayMs(nextWeek, timeZone)
    });
    if (cursor === endWeek) break;
    cursor = nextWeek;
  }
  return buckets;
}

/** Hranice měsíčních sloupců daného roku (leden–prosinec; u aktuálního roku jen do tohoto měsíce). */
export function yearMonthBuckets(
  anchor: string,
  timeZone: string = DEFAULT_ELECTRICITY_TIMEZONE
): BucketBounds[] {
  const currentMonthKey = todayDateKeyInTimeZone(timeZone).slice(0, 7);
  const buckets: BucketBounds[] = [];
  for (let m = 1; m <= 12; m++) {
    const key = `${anchor}-${String(m).padStart(2, "0")}`;
    if (key > currentMonthKey) break;
    const fromKey = `${key}-01`;
    const nextMonthKey =
      m === 12 ? `${Number(anchor) + 1}-01-01` : `${anchor}-${String(m + 1).padStart(2, "0")}-01`;
    buckets.push({
      key,
      fromMs: startOfDayMs(fromKey, timeZone),
      toMs: startOfDayMs(nextMonthKey, timeZone)
    });
  }
  return buckets;
}

function bucketBoundsFor(
  period: EnergyBucketPeriod,
  anchor: string,
  timeZone: string
): BucketBounds[] {
  return period === "month"
    ? monthWeekBuckets(anchor, timeZone)
    : yearMonthBuckets(anchor, timeZone);
}

/** Integruje výkon do energie a rozdělí do předaných bucketů (přiřazení podle levého vzorku intervalu). */
export function integratePowerIntoBuckets(
  production: PowerSample[],
  consumption: PowerSample[],
  bounds: BucketBounds[]
): EnergyBucket[] {
  const produced = new Array(bounds.length).fill(0);
  const consumed = new Array(bounds.length).fill(0);

  const findBucket = (tMs: number): number => {
    for (let i = 0; i < bounds.length; i++) {
      if (tMs >= bounds[i].fromMs && tMs < bounds[i].toMs) return i;
    }
    return -1;
  };

  const merged = mergePowerTimelines(production, consumption);
  for (let i = 1; i < merged.length; i++) {
    const dtHours = (merged[i].t - merged[i - 1].t) / MS_PER_HOUR;
    if (dtHours <= 0 || dtHours > MAX_GAP_HOURS) continue;

    const idx = findBucket(merged[i - 1].t);
    if (idx === -1) continue;

    const avgP = (merged[i].p + merged[i - 1].p) / 2;
    const avgC = (merged[i].c + merged[i - 1].c) / 2;
    produced[idx] += (avgP * dtHours) / W_PER_KWH;
    consumed[idx] += (avgC * dtHours) / W_PER_KWH;
  }

  return bounds.map((b, i) => ({
    key: b.key,
    from: new Date(b.fromMs).toISOString(),
    to: new Date(b.toMs).toISOString(),
    producedKwh: roundEnergyKwh(produced[i]),
    consumedKwh: roundEnergyKwh(consumed[i])
  }));
}

/** Čistá funkce: z časových řad výkonu sestaví sloupce energie pro období. */
export function buildElectricityEnergyBuckets(
  period: EnergyBucketPeriod,
  anchor: string,
  production: PowerSample[],
  consumption: PowerSample[],
  timeZone: string = DEFAULT_ELECTRICITY_TIMEZONE
): ElectricityEnergyBucketsResult {
  const bounds = bucketBoundsFor(period, anchor, timeZone);
  return {
    period,
    anchor,
    bucketUnit: period === "month" ? "week" : "month",
    buckets: integratePowerIntoBuckets(production, consumption, bounds)
  };
}

export class ElectricityEnergyBucketsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ElectricityEnergyBucketsError";
  }
}

async function loadRangeSamples(
  db: Db,
  key: string,
  fromIso: string,
  toIso: string
): Promise<PowerSample[]> {
  const r = await db.query<{ created_at: string; numeric_value: number | null }>(
    `
      select created_at, numeric_value
      from dashboard_metrics_history
      where key = $1
        and created_at >= $2::timestamptz
        and created_at < $3::timestamptz
      order by created_at asc
    `,
    [key, fromIso, toIso]
  );
  const out: PowerSample[] = [];
  for (const row of r.rows) {
    const watts = row.numeric_value;
    if (typeof watts !== "number" || !Number.isFinite(watts)) continue;
    out.push({ ts: row.created_at, watts });
  }
  return out;
}

/** Načte vzorky z DB pro období a vrátí sloupce energie (kWh). */
export async function loadElectricityEnergyBuckets(
  db: Db,
  options: { period: EnergyBucketPeriod; anchor: string; timeZone?: string }
): Promise<ElectricityEnergyBucketsResult> {
  const { period, anchor } = options;
  const timeZone = options.timeZone ?? DEFAULT_ELECTRICITY_TIMEZONE;

  if (period === "month" && !isValidMonthAnchor(anchor)) {
    throw new ElectricityEnergyBucketsError("anchor must be YYYY-MM for period=month");
  }
  if (period === "year" && !isValidYearAnchor(anchor)) {
    throw new ElectricityEnergyBucketsError("anchor must be YYYY for period=year");
  }

  const bounds = bucketBoundsFor(period, anchor, timeZone);
  if (bounds.length === 0) {
    return { period, anchor, bucketUnit: period === "month" ? "week" : "month", buckets: [] };
  }

  const fromIso = new Date(bounds[0].fromMs).toISOString();
  const toIso = new Date(bounds.at(-1)!.toMs).toISOString();

  const [production, consumption] = await Promise.all([
    loadRangeSamples(db, ELECTRICITY_PRODUCTION_KEY, fromIso, toIso),
    loadRangeSamples(db, ELECTRICITY_CONSUMPTION_KEY, fromIso, toIso)
  ]);

  return {
    period,
    anchor,
    bucketUnit: period === "month" ? "week" : "month",
    buckets: integratePowerIntoBuckets(production, consumption, bounds)
  };
}
