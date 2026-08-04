import type { TheSportsDbTeamSearchResult } from "./theSportsDbSearchTypes.js";

/** České / běžné názvy → kanonický název sportu v TheSportsDB */
export const SPORT_QUERY_ALIASES: Record<string, string> = {
  fotbal: "Soccer",
  fotbalovy: "Soccer",
  football: "Soccer",
  hokej: "Ice Hockey",
  "ledni hokej": "Ice Hockey",
  "ledni-hokej": "Ice Hockey"
};

/** Kanonický název sportu pro API (Soccer, ne Fotbal). */
export function normalizeSportParam(sport: string): string {
  const trimmed = sport.trim();
  if (!trimmed) return trimmed;
  const alias = SPORT_QUERY_ALIASES[trimmed.toLowerCase()];
  return alias ?? trimmed;
}

/** Odstraní diakritiku pro tolerantní shodu (slavie ↔ Slavia). */
export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

/**
 * Shoda názvu týmu s dotazem — prefix/stem pro české tvary (slavie → slavi).
 */
export function teamNameMatchesQuery(
  teamName: string,
  query: string,
  extraKeywords: string[] = []
): boolean {
  const q = normalizeSearchText(query);
  if (q.length < 2) return false;

  const texts = [teamName, ...extraKeywords].map(normalizeSearchText);
  for (const text of texts) {
    if (!text) continue;
    if (text.includes(q) || q.includes(text)) return true;
    const stem = q.length >= 4 ? q.slice(0, -1) : q;
    if (stem.length >= 3 && text.includes(stem)) return true;
  }
  return false;
}

export type CuratedTeamSearchHint = TheSportsDbTeamSearchResult & {
  keywords: string[];
};

/** Spolehlivé výsledky při demo klíči (search/lookup vrací nesmysly). */
export const CURATED_TEAM_SEARCH_HINTS: CuratedTeamSearchHint[] = [
  {
    thesportsdb_team_id: "134007",
    name: "Sparta Praha",
    sport: "Soccer",
    league: "Czech First League",
    country: "Czech Republic",
    keywords: ["sparta", "ac sparta"]
  },
  {
    thesportsdb_team_id: "136036",
    name: "Slavia Prague",
    sport: "Soccer",
    league: "Czech First League",
    country: "Czech Republic",
    keywords: ["slavia", "slavie", "sk slavia", "slavia praha"]
  }
];

export function findCuratedTeamSearchHints(
  query: string,
  sport?: string
): TheSportsDbTeamSearchResult[] {
  const sportFilter = sport ? normalizeSportParam(sport).toLowerCase() : undefined;
  return CURATED_TEAM_SEARCH_HINTS.filter((hint) => {
    if (sportFilter && (hint.sport ?? "").toLowerCase() !== sportFilter) return false;
    return teamNameMatchesQuery(hint.name, query, hint.keywords);
  }).map(({ keywords: _keywords, ...team }) => team);
}

export function findCuratedTeamById(
  teamId: string
): TheSportsDbTeamSearchResult | null {
  const id = teamId.trim();
  const hint = CURATED_TEAM_SEARCH_HINTS.find((h) => h.thesportsdb_team_id === id);
  if (!hint) return null;
  const { keywords: _keywords, ...team } = hint;
  return team;
}
