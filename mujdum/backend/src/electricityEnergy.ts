/** Výpočet denní energie (kWh) z časové řady výkonu (W) — PV vs. spotřeba domu. */

import type { Db } from "./db.js";

export const DEFAULT_ELECTRICITY_TIMEZONE = "Europe/Prague";

export type PowerSample = { ts: string; watts: number };

export type ElectricityDailyEnergyKwh = {
  producedKwh: number;
  consumedKwh: number;
  purchasedKwh: number;
  soldKwh: number;
};

export const MS_PER_HOUR = 3_600_000;
export const W_PER_KWH = 1000;
/** Mezery delší než tento počet hodin mezi vzorky se přeskočí (restart syncu). */
export const MAX_GAP_HOURS = 6;

export function calendarDateKeyInTimeZone(
  isoOrDate: string | Date,
  timeZone: string = DEFAULT_ELECTRICITY_TIMEZONE
): string {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(d);
}

export function todayDateKeyInTimeZone(
  timeZone: string = DEFAULT_ELECTRICITY_TIMEZONE
): string {
  return calendarDateKeyInTimeZone(new Date(), timeZone);
}

/** Začátek kalendářního dne v dané TZ (UTC instant). */
export function startOfCalendarDayInTimeZone(
  ref: Date = new Date(),
  timeZone: string = DEFAULT_ELECTRICITY_TIMEZONE
): Date {
  const dateKey = calendarDateKeyInTimeZone(ref, timeZone);
  let t = ref.getTime();
  for (let i = 0; i < 30; i++) {
    t -= 3_600_000;
    if (calendarDateKeyInTimeZone(new Date(t), timeZone) !== dateKey) {
      return new Date(t + 3_600_000);
    }
  }
  return new Date(t);
}

export function filterSamplesForCalendarDay(
  samples: PowerSample[],
  dateKey: string,
  timeZone: string = DEFAULT_ELECTRICITY_TIMEZONE
): PowerSample[] {
  return samples
    .filter((s) => calendarDateKeyInTimeZone(s.ts, timeZone) === dateKey)
    .sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));
}

export type MergedPoint = { t: number; p: number; c: number };

export function mergePowerTimelines(
  production: PowerSample[],
  consumption: PowerSample[]
): MergedPoint[] {
  const byT = new Map<number, { p?: number; c?: number }>();

  for (const { ts, watts } of production) {
    const t = Date.parse(ts);
    if (!Number.isFinite(t) || !Number.isFinite(watts)) continue;
    const slot = byT.get(t) ?? {};
    slot.p = watts;
    byT.set(t, slot);
  }
  for (const { ts, watts } of consumption) {
    const t = Date.parse(ts);
    if (!Number.isFinite(t) || !Number.isFinite(watts)) continue;
    const slot = byT.get(t) ?? {};
    slot.c = watts;
    byT.set(t, slot);
  }

  const times = [...byT.keys()].sort((a, b) => a - b);
  let lastP = 0;
  let lastC = 0;

  return times.map((t) => {
    const slot = byT.get(t)!;
    if (typeof slot.p === "number") lastP = slot.p;
    if (typeof slot.c === "number") lastC = slot.c;
    return { t, p: lastP, c: lastC };
  });
}

/**
 * Vyrobeno = ∫ výkon výroby (FVE).
 * Spotřeba domu = ∫ výkon spotřeby.
 * Nakoupeno = ∫ max(spotřeba − výroba, 0) (import ze sítě).
 * Prodáno = ∫ max(výroba − spotřeba, 0) (export do sítě).
 */
export function computeElectricityEnergyKwh(
  production: PowerSample[],
  consumption: PowerSample[]
): ElectricityDailyEnergyKwh | null {
  const merged = mergePowerTimelines(production, consumption);
  if (merged.length < 2) return null;

  let producedKwh = 0;
  let consumedKwh = 0;
  let purchasedKwh = 0;
  let soldKwh = 0;

  for (let i = 1; i < merged.length; i++) {
    const dtHours = (merged[i].t - merged[i - 1].t) / MS_PER_HOUR;
    if (dtHours <= 0 || dtHours > MAX_GAP_HOURS) continue;

    const avgP = (merged[i].p + merged[i - 1].p) / 2;
    const avgC = (merged[i].c + merged[i - 1].c) / 2;

    producedKwh += (avgP * dtHours) / W_PER_KWH;
    consumedKwh += (avgC * dtHours) / W_PER_KWH;
    purchasedKwh += (Math.max(0, avgC - avgP) * dtHours) / W_PER_KWH;
    soldKwh += (Math.max(0, avgP - avgC) * dtHours) / W_PER_KWH;
  }

  if (!Number.isFinite(consumedKwh)) return null;

  return { producedKwh, consumedKwh, purchasedKwh, soldKwh };
}

export function roundEnergyKwh(n: number): number {
  return Math.round(n * 100) / 100;
}

export const ELECTRICITY_TODAY_KEYS = [
  "electricity_today_produced_kwh",
  "electricity_today_consumed_kwh",
  "electricity_today_purchased_kwh",
  "electricity_today_sold_kwh"
] as const;

export function electricityTodayMetricsFromEnergy(
  data: ElectricityDailyEnergyKwh
): Record<(typeof ELECTRICITY_TODAY_KEYS)[number], number> {
  return {
    electricity_today_produced_kwh: data.producedKwh,
    electricity_today_consumed_kwh: data.consumedKwh,
    electricity_today_purchased_kwh: data.purchasedKwh,
    electricity_today_sold_kwh: data.soldKwh
  };
}

export function hasElectricityTodayMetrics(metrics: Record<string, unknown>): boolean {
  return ELECTRICITY_TODAY_KEYS.every((k) => typeof metrics[k] === "number");
}

type TodayEnergyCache = {
  at: number;
  dateKey: string;
  data: ElectricityDailyEnergyKwh;
};

let todayEnergyCache: TodayEnergyCache | null = null;
const TODAY_ENERGY_CACHE_TTL_MS = 60_000;

export async function loadTodayElectricityEnergyFromDbCached(
  db: Db,
  options?: { dateKey?: string; timeZone?: string }
): Promise<ElectricityDailyEnergyKwh | null> {
  const timeZone = options?.timeZone ?? DEFAULT_ELECTRICITY_TIMEZONE;
  const dateKey = options?.dateKey ?? todayDateKeyInTimeZone(timeZone);
  const now = Date.now();
  if (
    todayEnergyCache?.dateKey === dateKey &&
    todayEnergyCache &&
    now - todayEnergyCache.at < TODAY_ENERGY_CACHE_TTL_MS
  ) {
    return todayEnergyCache.data;
  }
  const data = await loadTodayElectricityEnergyFromDb(db, options);
  if (data) todayEnergyCache = { at: now, dateKey, data };
  return data;
}

/** Uloží denní součty do dashboard_metrics (bez history — odvozené z výkonu). */
export async function persistTodayElectricityMetrics(db: Db): Promise<boolean> {
  const data = await loadTodayElectricityEnergyFromDb(db);
  if (!data) return false;

  const entries = electricityTodayMetricsFromEnergy(data);
  for (const [key, value] of Object.entries(entries)) {
    await db.query(
      `
        insert into dashboard_metrics (key, value, updated_at)
        values ($1, $2::jsonb, now())
        on conflict (key) do update set
          value = excluded.value,
          updated_at = excluded.updated_at
      `,
      [key, JSON.stringify(value)]
    );
  }

  todayEnergyCache = {
    at: Date.now(),
    dateKey: todayDateKeyInTimeZone(),
    data
  };
  return true;
}

/** Doplní dnešní kWh do metrics, pokud chybí (např. před prvním HA sync). */
export async function mergeTodayElectricityMetricsIfMissing(
  metrics: Record<string, unknown>,
  db: Db,
  onError?: (message: string, err?: unknown) => void
): Promise<void> {
  if (hasElectricityTodayMetrics(metrics)) return;
  try {
    const data = await loadTodayElectricityEnergyFromDbCached(db);
    if (!data) {
      onError?.("[dashboard] electricity today: insufficient history for integration");
      return;
    }
    Object.assign(metrics, electricityTodayMetricsFromEnergy(data));
  } catch (err) {
    onError?.("[dashboard] electricity today computation failed", err);
  }
}

export async function loadTodayElectricityEnergyFromDb(
  db: Db,
  options?: { dateKey?: string; timeZone?: string }
): Promise<ElectricityDailyEnergyKwh | null> {
  const timeZone = options?.timeZone ?? DEFAULT_ELECTRICITY_TIMEZONE;
  const dateKey = options?.dateKey ?? todayDateKeyInTimeZone(timeZone);

  async function loadDaySamples(key: string): Promise<PowerSample[]> {
    const r = await db.query<{ created_at: string; numeric_value: number | null }>(
      `
        select created_at, numeric_value
        from dashboard_metrics_history
        where key = $1
          and created_at >= now() - interval '36 hours'
        order by created_at asc
      `,
      [key]
    );
    const raw: PowerSample[] = [];
    for (const row of r.rows) {
      const watts = row.numeric_value;
      if (typeof watts !== "number" || !Number.isFinite(watts)) continue;
      raw.push({ ts: row.created_at, watts });
    }
    return filterSamplesForCalendarDay(raw, dateKey, timeZone);
  }

  const production = await loadDaySamples("electricity_production_w");
  const consumption = await loadDaySamples("electricity_consumption_w");
  const computed = computeElectricityEnergyKwh(production, consumption);
  if (!computed) return null;

  return {
    producedKwh: roundEnergyKwh(computed.producedKwh),
    consumedKwh: roundEnergyKwh(computed.consumedKwh),
    purchasedKwh: roundEnergyKwh(computed.purchasedKwh),
    soldKwh: roundEnergyKwh(computed.soldKwh)
  };
}
