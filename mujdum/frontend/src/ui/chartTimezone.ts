/** Kalendář grafů — stejná zóna jako denní energie na backendu (`Europe/Prague`). */

export const APP_TIMEZONE = "Europe/Prague";

export function calendarDateKey(
  isoOrDate: string | Date = new Date(),
  timeZone: string = APP_TIMEZONE
): string {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(d);
}

function zonedHourMinute(date: Date, timeZone: string): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return { hour, minute };
}

/** UTC timestamp of 00:00 on dateKey in timeZone. */
export function zonedStartOfDayUtc(
  dateKey: string,
  timeZone: string = APP_TIMEZONE
): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  const start = Date.UTC(y, m - 1, d - 1, 20, 0, 0);
  const end = Date.UTC(y, m - 1, d + 1, 4, 0, 0);
  for (let t = start; t <= end; t += 60_000) {
    if (calendarDateKey(new Date(t), timeZone) !== dateKey) continue;
    const { hour, minute } = zonedHourMinute(new Date(t), timeZone);
    if (hour === 0 && minute === 0) return t;
  }
  return Date.UTC(y, m - 1, d, 0, 0, 0);
}

export function addDaysToDateKey(
  dateKey: string,
  delta: number,
  timeZone: string = APP_TIMEZONE
): string {
  const startMs = zonedStartOfDayUtc(dateKey, timeZone);
  return calendarDateKey(new Date(startMs + delta * 86_400_000), timeZone);
}

function mondayIndexInZone(dateKey: string, timeZone: string): number {
  const ms = zonedStartOfDayUtc(dateKey, timeZone) + 12 * 3_600_000;
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short"
  }).format(new Date(ms));
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

export function weekStartDateKey(
  d: Date = new Date(),
  timeZone: string = APP_TIMEZONE
): string {
  const key = calendarDateKey(d, timeZone);
  const dow = mondayIndexInZone(key, timeZone);
  return addDaysToDateKey(key, -dow, timeZone);
}

export function monthDateKey(d: Date = new Date(), timeZone: string = APP_TIMEZONE): string {
  return calendarDateKey(d, timeZone).slice(0, 7);
}

export function yearDateKey(d: Date = new Date(), timeZone: string = APP_TIMEZONE): string {
  return calendarDateKey(d, timeZone).slice(0, 4);
}

export function dayBoundsIso(
  dateKey: string,
  timeZone: string = APP_TIMEZONE
): { from: string; to: string } {
  const from = new Date(zonedStartOfDayUtc(dateKey, timeZone)).toISOString();
  const nextKey = addDaysToDateKey(dateKey, 1, timeZone);
  const to = new Date(zonedStartOfDayUtc(nextKey, timeZone)).toISOString();
  return { from, to };
}
