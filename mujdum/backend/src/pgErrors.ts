export function isPgUniqueViolation(e: unknown): boolean {
  if (typeof e !== "object" || e === null) return false;
  const code = Object.getOwnPropertyDescriptor(e, "code")?.value;
  return code === "23505";
}

export function defaultActiveFlag(value: unknown): boolean {
  return value !== false;
}

export function firstQueryRow<T>(rows: T[], message: string): T {
  const row = rows[0];
  if (!row) throw new Error(message);
  return row;
}
