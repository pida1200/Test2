import type {
  TheSportsDbPlayerSearchResult,
  TheSportsDbPlayerVerifyResult
} from "./theSportsDbSearchTypes.js";
import { normalizeSportParam, teamNameMatchesQuery } from "./theSportsDbTeamSearch.js";

export type CuratedPlayerSearchHint = TheSportsDbPlayerSearchResult & {
  keywords: string[];
};

/** Spolehlivé výsledky při demo klíči (search/lookup často vrací nesmysly). */
export const CURATED_PLAYER_SEARCH_HINTS: CuratedPlayerSearchHint[] = [
  {
    thesportsdb_player_id: "34154641",
    name: "Jaromir Jagr",
    sport: "Ice Hockey",
    team: "Rytíři Kladno",
    keywords: ["jagr", "jaromir", "jágr"]
  }
];

export function findCuratedPlayerSearchHints(
  query: string,
  sport?: string
): TheSportsDbPlayerSearchResult[] {
  const sportFilter = sport ? normalizeSportParam(sport).toLowerCase() : undefined;
  return CURATED_PLAYER_SEARCH_HINTS.filter((hint) => {
    if (sportFilter && (hint.sport ?? "").toLowerCase() !== sportFilter) return false;
    return teamNameMatchesQuery(hint.name, query, hint.keywords);
  }).map(({ keywords: _keywords, ...player }) => player);
}

export function findCuratedPlayerById(
  playerId: string
): TheSportsDbPlayerVerifyResult | null {
  const id = playerId.trim();
  const hint = CURATED_PLAYER_SEARCH_HINTS.find((h) => h.thesportsdb_player_id === id);
  if (!hint) return null;
  const { keywords: _keywords, ...player } = hint;
  return player;
}

export function getPlayerSearchPayloadError(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const player = (raw as { player?: unknown }).player;
  if (typeof player === "string" && player.trim()) return player.trim();
  return null;
}
