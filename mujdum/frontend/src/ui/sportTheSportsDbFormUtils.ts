export type SportOption = { name: string };

export const SPORT_QUERY_ALIASES: Record<string, string> = {
  fotbal: "Soccer",
  fotbalovy: "Soccer",
  football: "Soccer",
  hokej: "Ice Hockey",
  "ledni hokej": "Ice Hockey",
  "ledni-hokej": "Ice Hockey"
};

export function resolveSportFromQuery(query: string, sports: SportOption[]): string | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const alias = SPORT_QUERY_ALIASES[trimmed.toLowerCase()];
  if (alias) return alias;

  const exact = sports.find((s) => s.name.toLowerCase() === trimmed.toLowerCase());
  return exact?.name ?? null;
}

export function resolveEffectiveSport(
  sportQuery: string,
  selectedSport: string | null,
  sports: SportOption[]
): string | null {
  if (selectedSport) {
    return resolveSportFromQuery(selectedSport, sports) ?? selectedSport;
  }
  return resolveSportFromQuery(sportQuery, sports);
}
