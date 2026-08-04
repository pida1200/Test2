export function parseOptionalNumber(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return null;
}

export function parseSettingNumber(value: unknown): number {
  const n = parseOptionalNumber(value);
  return n ?? Number.NaN;
}
