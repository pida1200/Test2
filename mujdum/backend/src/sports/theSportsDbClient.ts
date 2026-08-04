import type { TheSportsDbRawEvent, UpcomingSportEvent } from "./theSportsDbTypes.js";
import type {
  TheSportsDbPlayerSearchResult,
  TheSportsDbPlayerVerifyResult,
  TheSportsDbSportOption,
  TheSportsDbTeamSearchResult,
  TheSportsDbTeamVerifyResult
} from "./theSportsDbSearchTypes.js";
import {
  findCuratedPlayerById,
  findCuratedPlayerSearchHints,
  getPlayerSearchPayloadError
} from "./theSportsDbPlayerSearch.js";
import {
  findCuratedTeamById,
  findCuratedTeamSearchHints,
  normalizeSportParam,
  teamNameMatchesQuery
} from "./theSportsDbTeamSearch.js";
import { attemptJsonFetch, sleep } from "./theSportsDbFetch.js";
import { mergeCuratedAndApiSearch } from "./theSportsDbSearchMerge.js";
import { TheSportsDbError } from "./theSportsDbErrors.js";

export type FetchFn = typeof fetch;
export { TheSportsDbError };

export type TheSportsDbClientConfig = {
  apiKey: string;
  baseUrl?: string;
};

const DEFAULT_BASE = "https://www.thesportsdb.com/api/v1/json";

/** Veřejné demo klíče — lookup/search mají silná omezení */
export const THESPORTSDB_DEMO_API_KEYS = new Set(["1", "123"]);

/** Doplnění k all_sports.php (free klíč vrací jen ukázku) */
export const CURATED_SPORTS = [
  "Soccer",
  "Ice Hockey",
  "Basketball",
  "Tennis",
  "Volleyball",
  "Handball",
  "American Football",
  "Baseball",
  "Motorsport",
  "Fighting",
  "Cricket",
  "Rugby",
  "Golf"
] as const;

const MIN_TEAM_SEARCH_LEN = 2;
const MAX_TEAM_SEARCH_RESULTS = 25;
const MAX_FETCH_ATTEMPTS = 3;

function sportMatchesExpected(
  actualSport: string | null,
  expectedSport: string | undefined,
  normalizeExpected = false
): boolean {
  const expected = expectedSport?.trim();
  if (!expected) return true;
  if (!actualSport) return false;
  const normalizedExpected = normalizeExpected ? normalizeSportParam(expected) : expected;
  return actualSport.toLowerCase() === normalizedExpected.toLowerCase();
}

function unknownToDisplayString(v: unknown): string | null {
  if (typeof v === "string") {
    const s = v.trim();
    return s || null;
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    return `${v}`;
  }
  return null;
}

export function externalIdFromLookupRecord(
  record: Record<string, unknown>,
  field: "idTeam" | "idPlayer"
): string | null {
  return unknownToDisplayString(record[field]);
}

export function loadTheSportsDbConfig(
  env: NodeJS.ProcessEnv = process.env
): TheSportsDbClientConfig | null {
  const apiKey = env.THESPORTSDB_API_KEY?.trim();
  if (!apiKey) return null;
  return { apiKey };
}

export function parseEventStartUtc(dateEvent?: string, strTime?: string): string | null {
  if (!dateEvent?.trim()) return null;
  const date = dateEvent.trim();
  const timeRaw = strTime?.trim();
  const time =
    timeRaw && timeRaw !== "00:00:00" && timeRaw !== "00:00" ? timeRaw : "12:00:00";

  const asUtc = Date.parse(`${date}T${time}Z`);
  if (Number.isFinite(asUtc)) return new Date(asUtc).toISOString();

  const asLocal = Date.parse(`${date}T${time}`);
  if (Number.isFinite(asLocal)) return new Date(asLocal).toISOString();

  return null;
}

/** ISO řetězec z API (strTimestamp), případně doplnění Z pro UTC. */
export function parseEventTimestampIso(strTimestamp?: string): string | null {
  const raw = strTimestamp?.trim();
  if (!raw) return null;
  const normalized = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(raw) ? `${raw}Z` : raw;
  const ms = Date.parse(normalized);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

function trimOptionalString(v: unknown): string | null {
  return unknownToDisplayString(v);
}

export function normalizeTeamSearchRecord(
  raw: Record<string, unknown>
): TheSportsDbTeamSearchResult | null {
  const thesportsdb_team_id = externalIdFromLookupRecord(raw, "idTeam");
  const name = trimOptionalString(raw.strTeam);
  if (!thesportsdb_team_id || !name) return null;

  return {
    thesportsdb_team_id,
    name,
    sport: trimOptionalString(raw.strSport),
    league: trimOptionalString(raw.strLeague),
    country: trimOptionalString(raw.strCountry)
  };
}

export function normalizeTeamVerifyResult(
  raw: Record<string, unknown>
): TheSportsDbTeamVerifyResult | null {
  const base = normalizeTeamSearchRecord(raw);
  if (!base) return null;
  return {
    thesportsdb_team_id: base.thesportsdb_team_id,
    name: base.name,
    sport: base.sport,
    league: base.league
  };
}

export function normalizePlayerSearchRecord(
  raw: Record<string, unknown>
): TheSportsDbPlayerSearchResult | null {
  const thesportsdb_player_id = externalIdFromLookupRecord(raw, "idPlayer");
  const name = trimOptionalString(raw.strPlayer);
  if (!thesportsdb_player_id || !name) return null;

  return {
    thesportsdb_player_id,
    name,
    sport: trimOptionalString(raw.strSport),
    team: trimOptionalString(raw.strTeam)
  };
}

export function normalizePlayerVerifyResult(
  raw: Record<string, unknown>
): TheSportsDbPlayerVerifyResult | null {
  const base = normalizePlayerSearchRecord(raw);
  if (!base) return null;
  return {
    thesportsdb_player_id: base.thesportsdb_player_id,
    name: base.name,
    sport: base.sport,
    team: base.team
  };
}

export function assertUpcomingEventsPayload(raw: unknown, context: string): void {
  if (!raw || typeof raw !== "object") return;
  const events = (raw as { events?: unknown }).events;
  if (typeof events === "string" && events.trim()) {
    throw new TheSportsDbError(`TheSportsDB ${context}: ${events.trim()}`, 200, events);
  }
}

export function normalizeUpcomingEvents(raw: unknown): UpcomingSportEvent[] {
  if (!raw || typeof raw !== "object") return [];
  const events = (raw as { events?: TheSportsDbRawEvent[] | string }).events;
  if (!Array.isArray(events)) return [];

  return events
    .filter((e) => e && typeof e === "object")
    .map((e) => {
      const home = String(e.strHomeTeam ?? "").trim();
      const away = String(e.strAwayTeam ?? "").trim();
      const title =
        String(e.strEvent ?? "").trim() ||
        (home && away ? `${home} vs ${away}` : home || away || "Unknown event");

      return {
        externalEventId: String(e.idEvent ?? "").trim() || title,
        title,
        homeTeam: home,
        awayTeam: away,
        startsAtUtc:
          parseEventStartUtc(e.dateEvent, e.strTime) ??
          parseEventTimestampIso(
            typeof e.strTimestamp === "string" ? e.strTimestamp : undefined
          ),
        league: e.strLeague?.trim() || null,
        sport: e.strSport?.trim() || null
      };
    });
}

export class TheSportsDbClient {
  private readonly baseUrl: string;

  constructor(
    private readonly config: TheSportsDbClientConfig,
    private readonly fetchFn: FetchFn = fetch
  ) {
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE).replace(/\/$/, "");
  }

  private async getJson<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}/${encodeURIComponent(this.config.apiKey)}/${path}`;
    let lastError: TheSportsDbError | null = null;

    for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt += 1) {
      const result = await attemptJsonFetch<T>(this.fetchFn, url, path);
      if (result.kind === "success") return result.data;
      if (result.kind === "fatal") throw result.error;
      lastError = result.error;
      if (attempt < MAX_FETCH_ATTEMPTS) {
        await sleep(400 * attempt);
      }
    }

    throw lastError ?? new TheSportsDbError(`TheSportsDB ${path} failed`, 0, "");
  }

  /** v1: eventsnext.php?id={teamId} */
  async getTeamUpcomingEvents(teamId: string): Promise<UpcomingSportEvent[]> {
    const id = teamId.trim();
    if (!id) throw new Error("teamId is required");
    const path = `eventsnext.php?id=${encodeURIComponent(id)}`;
    const raw = await this.getJson<unknown>(path);
    assertUpcomingEventsPayload(raw, path);
    return normalizeUpcomingEvents(raw);
  }

  /** v1: lookupteam.php?id={teamId} — ověření ID před uložením do číselníku (fáze 5) */
  async lookupTeam(teamId: string): Promise<Record<string, unknown> | null> {
    const id = teamId.trim();
    if (!id) return null;
    const raw = await this.getJson<{ teams?: Record<string, unknown>[] }>(
      `lookupteam.php?id=${encodeURIComponent(id)}`
    );
    const team = raw.teams?.[0];
    return team && typeof team === "object" ? team : null;
  }

  isDemoApiKey(): boolean {
    return THESPORTSDB_DEMO_API_KEYS.has(this.config.apiKey);
  }

  /** v1: all_sports.php + kurátorovaný seznam */
  async listSports(): Promise<TheSportsDbSportOption[]> {
    const names = new Set<string>(CURATED_SPORTS);

    try {
      const raw = await this.getJson<{ sports?: Array<Record<string, unknown>> }>(
        "all_sports.php"
      );
      for (const row of raw.sports ?? []) {
        const name = trimOptionalString(row.strSport);
        if (name) names.add(name);
      }
    } catch {
      // pouze kurátorovaný seznam
    }

    return Array.from(names)
      .sort((a, b) => a.localeCompare(b, "cs"))
      .map((name) => ({ name }));
  }

  /** v1: searchteams.php?t={query}, volitelně filtr strSport */
  async searchTeams(query: string, sport?: string): Promise<TheSportsDbTeamSearchResult[]> {
    const q = query.trim();
    if (q.length < MIN_TEAM_SEARCH_LEN) return [];

    const sportFilter = sport ? normalizeSportParam(sport).toLowerCase() : undefined;
    const curated = findCuratedTeamSearchHints(q, sport);

    if (this.isDemoApiKey()) {
      return curated.slice(0, MAX_TEAM_SEARCH_RESULTS);
    }

    const raw = await this.getJson<{ teams?: Array<Record<string, unknown>> | null }>(
      `searchteams.php?t=${encodeURIComponent(q)}`
    );

    return mergeCuratedAndApiSearch({
      curated,
      sportFilter,
      maxResults: MAX_TEAM_SEARCH_RESULTS,
      getId: (item) => item.thesportsdb_team_id,
      apiRows: Array.isArray(raw.teams) ? raw.teams : [],
      normalizeRow: normalizeTeamSearchRecord,
      acceptApiRow: (row, item) => {
        const alternate = trimOptionalString(row.strTeamAlternate);
        return (
          teamNameMatchesQuery(item.name, q) ||
          (alternate !== null && teamNameMatchesQuery(alternate, q))
        );
      }
    });
  }

  /**
   * Ověří tým podle ID (lookupteam). U placeného klíče kontroluje shodu ID a volitelně sportu.
   */
  async verifyTeamForDictionary(
    teamId: string,
    expectedSport?: string
  ): Promise<TheSportsDbTeamVerifyResult | null> {
    const id = teamId.trim();
    if (!id) return null;

    if (this.isDemoApiKey()) {
      const curated = findCuratedTeamById(id);
      if (!curated) return null;
      if (!sportMatchesExpected(curated.sport, expectedSport)) return null;
      return {
        thesportsdb_team_id: curated.thesportsdb_team_id,
        name: curated.name,
        sport: curated.sport,
        league: curated.league
      };
    }

    const raw = await this.lookupTeam(id);
    if (!raw) return null;

    const returnedId = externalIdFromLookupRecord(raw, "idTeam");
    if (returnedId !== id) return null;

    if (!sportMatchesExpected(trimOptionalString(raw.strSport), expectedSport)) return null;

    return normalizeTeamVerifyResult(raw);
  }

  /** v1: searchplayers.php?p={query} */
  async searchPlayers(query: string, sport?: string): Promise<TheSportsDbPlayerSearchResult[]> {
    const q = query.trim();
    if (q.length < MIN_TEAM_SEARCH_LEN) return [];

    const sportFilter = sport ? normalizeSportParam(sport).toLowerCase() : undefined;
    const curated = findCuratedPlayerSearchHints(q, sport);

    if (this.isDemoApiKey()) {
      return curated.slice(0, MAX_TEAM_SEARCH_RESULTS);
    }

    const raw = await this.getJson<{ player?: Array<Record<string, unknown>> | string | null }>(
      `searchplayers.php?p=${encodeURIComponent(q)}`
    );
    const payloadError = getPlayerSearchPayloadError(raw);
    if (payloadError) {
      throw new TheSportsDbError(`TheSportsDB searchplayers.php: ${payloadError}`, 200, payloadError);
    }

    const rows = Array.isArray(raw.player) ? raw.player : [];

    return mergeCuratedAndApiSearch({
      curated,
      sportFilter,
      maxResults: MAX_TEAM_SEARCH_RESULTS,
      getId: (item) => item.thesportsdb_player_id,
      apiRows: rows,
      normalizeRow: normalizePlayerSearchRecord,
      acceptApiRow: (_row, item) => teamNameMatchesQuery(item.name, q)
    });
  }

  async verifyPlayerForDictionary(
    playerId: string,
    expectedSport?: string
  ): Promise<TheSportsDbPlayerVerifyResult | null> {
    const id = playerId.trim();
    if (!id) return null;

    if (this.isDemoApiKey()) {
      const curated = findCuratedPlayerById(id);
      if (!curated) return null;
      if (!sportMatchesExpected(curated.sport, expectedSport, true)) return null;
      return curated;
    }

    const raw = await this.lookupPlayer(id);
    if (!raw) return null;

    const returnedId = externalIdFromLookupRecord(raw, "idPlayer");
    if (returnedId !== id) return null;

    if (!sportMatchesExpected(trimOptionalString(raw.strSport), expectedSport, true)) return null;

    return normalizePlayerVerifyResult(raw);
  }

  /** v1: lookupplayer.php?id={playerId} */
  async lookupPlayer(playerId: string): Promise<Record<string, unknown> | null> {
    const id = playerId.trim();
    if (!id) return null;
    const raw = await this.getJson<{ players?: Record<string, unknown>[] }>(
      `lookupplayer.php?id=${encodeURIComponent(id)}`
    );
    const player = raw.players?.[0];
    return player && typeof player === "object" ? player : null;
  }
}
