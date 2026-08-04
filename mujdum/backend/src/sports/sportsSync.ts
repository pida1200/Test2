import type { Db } from "../db.js";
import { parseOptionalNumber } from "../parseSettingValue.js";
import {
  DEFAULT_ELECTRICITY_TIMEZONE,
  startOfCalendarDayInTimeZone
} from "../electricityEnergy.js";
import type { SportPlayerRow, SportTeamRow } from "../sportDictionaries.js";
import {
  loadTheSportsDbConfig,
  TheSportsDbClient
} from "./theSportsDbClient.js";
import type { UpcomingSportEvent } from "./theSportsDbTypes.js";

export const SPORTS_SOURCE_THESPORTSDB = "thesportsdb";

export type SportUpcomingEventRow = {
  id: number;
  source: string;
  external_event_id: string;
  title: string;
  home_team: string;
  away_team: string;
  starts_at: string | null;
  league: string | null;
  sport: string | null;
  sport_team_id: number | null;
  sport_player_id: number | null;
  synced_at: string;
};

export type SportUpcomingListItem = SportUpcomingEventRow & {
  team_name: string | null;
  player_name: string | null;
};

export type SportSyncResult = {
  teamsProcessed: number;
  playersProcessed: number;
  eventsUpserted: number;
  errors: string[];
  syncedAt: string;
};

const TEAM_SELECT = `id, name, thesportsdb_team_id, sport, league_hint, active, created_at, updated_at`;
const PLAYER_SELECT = `id, name, thesportsdb_player_id, sport, active, created_at, updated_at`;

export async function loadActiveSportTeams(db: Db): Promise<SportTeamRow[]> {
  const result = await db.query<SportTeamRow>(
    `select ${TEAM_SELECT} from sport_teams where active = true order by id asc`
  );
  return result.rows;
}

export async function loadActiveSportPlayers(db: Db): Promise<SportPlayerRow[]> {
  const result = await db.query<SportPlayerRow>(
    `select ${PLAYER_SELECT} from sport_players where active = true order by id asc`
  );
  return result.rows;
}

export async function upsertUpcomingEvent(
  db: Db,
  event: UpcomingSportEvent,
  opts: {
    sportTeamId: number | null;
    sportPlayerId: number | null;
    syncedAt: string;
  }
): Promise<void> {
  await db.query(
    `
      insert into sports_upcoming_events (
        source,
        external_event_id,
        title,
        home_team,
        away_team,
        starts_at,
        league,
        sport,
        sport_team_id,
        sport_player_id,
        synced_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      on conflict (source, external_event_id) do update set
        title = excluded.title,
        home_team = excluded.home_team,
        away_team = excluded.away_team,
        starts_at = excluded.starts_at,
        league = excluded.league,
        sport = excluded.sport,
        sport_team_id = coalesce(excluded.sport_team_id, sports_upcoming_events.sport_team_id),
        sport_player_id = coalesce(excluded.sport_player_id, sports_upcoming_events.sport_player_id),
        synced_at = excluded.synced_at
    `,
    [
      SPORTS_SOURCE_THESPORTSDB,
      event.externalEventId,
      event.title,
      event.homeTeam,
      event.awayTeam,
      event.startsAtUtc,
      event.league,
      event.sport,
      opts.sportTeamId,
      opts.sportPlayerId,
      opts.syncedAt
    ]
  );
}

async function removeStaleTeamEvents(
  db: Db,
  sportTeamId: number,
  syncedBefore: string
): Promise<void> {
  await db.query(
    `
      delete from sports_upcoming_events
      where sport_team_id = $1
        and sport_player_id is null
        and synced_at < $2
    `,
    [sportTeamId, syncedBefore]
  );
}

async function removeStalePlayerEvents(
  db: Db,
  sportPlayerId: number,
  syncedBefore: string
): Promise<void> {
  await db.query(
    `
      delete from sports_upcoming_events
      where sport_player_id = $1
        and synced_at < $2
    `,
    [sportPlayerId, syncedBefore]
  );
}

function playerTeamExtId(profile: Record<string, unknown> | null): string | null {
  if (profile?.idTeam == null) return null;
  const raw = profile.idTeam;
  if (typeof raw === "string") {
    const id = raw.trim();
    return id || null;
  }
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return `${raw}`;
  }
  return null;
}

function formatSyncError(label: string, id: string, e: unknown): string {
  const message = e instanceof Error ? e.message : String(e);
  return `${label} (${id}): ${message}`;
}

async function syncActiveTeamEvents(
  db: Db,
  client: TheSportsDbClient,
  team: SportTeamRow
): Promise<number> {
  const batchSyncedAt = new Date().toISOString();
  const events = await client.getTeamUpcomingEvents(team.thesportsdb_team_id);
  for (const event of events) {
    await upsertUpcomingEvent(db, event, {
      sportTeamId: team.id,
      sportPlayerId: null,
      syncedAt: batchSyncedAt
    });
  }
  await removeStaleTeamEvents(db, team.id, batchSyncedAt);
  return events.length;
}

async function syncActivePlayerEvents(
  db: Db,
  client: TheSportsDbClient,
  player: SportPlayerRow
): Promise<{ upserted: number; skipReason?: string }> {
  const batchSyncedAt = new Date().toISOString();
  const profile = await client.lookupPlayer(player.thesportsdb_player_id);
  const teamExtId = playerTeamExtId(profile);
  if (!teamExtId) {
    return {
      upserted: 0,
      skipReason: `Sportovec ${player.name}: TheSportsDB nevrátil idTeam pro hráče ${player.thesportsdb_player_id}.`
    };
  }

  const events = await client.getTeamUpcomingEvents(teamExtId);
  for (const event of events) {
    await upsertUpcomingEvent(db, event, {
      sportTeamId: null,
      sportPlayerId: player.id,
      syncedAt: batchSyncedAt
    });
  }
  await removeStalePlayerEvents(db, player.id, batchSyncedAt);
  return { upserted: events.length };
}

export async function purgePastUpcomingEvents(db: Db): Promise<void> {
  await db.query(
    `
      delete from sports_upcoming_events
      where starts_at is not null and starts_at < now() - interval '1 day'
    `
  );
}

export async function syncSportUpcomingEvents(
  db: Db,
  client: TheSportsDbClient
): Promise<SportSyncResult> {
  const syncedAt = new Date().toISOString();
  const errors: string[] = [];
  let eventsUpserted = 0;

  const teams = await loadActiveSportTeams(db);
  for (const team of teams) {
    try {
      eventsUpserted += await syncActiveTeamEvents(db, client, team);
    } catch (e) {
      errors.push(formatSyncError(`Tým ${team.name}`, team.thesportsdb_team_id, e));
    }
  }

  const players = await loadActiveSportPlayers(db);
  for (const player of players) {
    try {
      const result = await syncActivePlayerEvents(db, client, player);
      if (result.skipReason) {
        errors.push(result.skipReason);
        continue;
      }
      eventsUpserted += result.upserted;
    } catch (e) {
      errors.push(formatSyncError(`Sportovec ${player.name}`, player.thesportsdb_player_id, e));
    }
  }

  await purgePastUpcomingEvents(db);

  return {
    teamsProcessed: teams.length,
    playersProcessed: players.length,
    eventsUpserted,
    errors,
    syncedAt
  };
}

export function createTheSportsDbClientFromEnv(
  env: NodeJS.ProcessEnv = process.env
): TheSportsDbClient | null {
  const cfg = loadTheSportsDbConfig(env);
  if (!cfg) return null;
  return new TheSportsDbClient(cfg);
}

export function requireTheSportsDbClient(
  env: NodeJS.ProcessEnv = process.env
): TheSportsDbClient {
  const cfg = loadTheSportsDbConfig(env);
  if (!cfg) {
    throw new Error("THESPORTSDB_API_KEY is not configured");
  }
  return new TheSportsDbClient(cfg);
}

export function parseUpcomingQuery(params: {
  from?: string;
  to?: string;
  teamId?: string;
  playerId?: string;
}):
  | {
      ok: true;
      from: Date;
      to: Date | null;
      teamId: number | null;
      playerId: number | null;
    }
  | { ok: false; message: string } {
  const fromRaw = params.from?.trim();
  const toRaw = params.to?.trim();
  const from = fromRaw
    ? new Date(fromRaw)
    : startOfCalendarDayInTimeZone(new Date(), DEFAULT_ELECTRICITY_TIMEZONE);
  if (!Number.isFinite(from.getTime())) {
    return { ok: false, message: "Neplatný parametr from." };
  }

  let to: Date | null = null;
  if (toRaw) {
    to = new Date(toRaw);
    if (!Number.isFinite(to.getTime())) {
      return { ok: false, message: "Neplatný parametr to." };
    }
  }

  let teamId: number | null = null;
  if (params.teamId?.trim()) {
    const n = Number(params.teamId);
    if (!Number.isInteger(n) || n <= 0) {
      return { ok: false, message: "Neplatný parametr teamId." };
    }
    teamId = n;
  }

  let playerId: number | null = null;
  if (params.playerId?.trim()) {
    const n = Number(params.playerId);
    if (!Number.isInteger(n) || n <= 0) {
      return { ok: false, message: "Neplatný parametr playerId." };
    }
    playerId = n;
  }

  return { ok: true, from, to, teamId, playerId };
}

export async function listUpcomingSportEvents(
  db: Db,
  query: {
    from: Date;
    to: Date | null;
    teamId: number | null;
    playerId: number | null;
  }
): Promise<{ items: SportUpcomingListItem[]; synced_at: string | null }> {
  const values: unknown[] = [query.from.toISOString()];
  const conditions = ["(e.starts_at is null or e.starts_at >= $1)"];

  if (query.to) {
    values.push(query.to.toISOString());
    conditions.push(`(e.starts_at is null or e.starts_at <= $${values.length})`);
  }
  if (query.teamId !== null) {
    values.push(query.teamId);
    conditions.push(`e.sport_team_id = $${values.length}`);
  }
  if (query.playerId !== null) {
    values.push(query.playerId);
    conditions.push(`e.sport_player_id = $${values.length}`);
  }

  const result = await db.query<SportUpcomingListItem>(
    `
      select
        e.id,
        e.source,
        e.external_event_id,
        e.title,
        e.home_team,
        e.away_team,
        e.starts_at,
        e.league,
        e.sport,
        e.sport_team_id,
        e.sport_player_id,
        e.synced_at,
        t.name as team_name,
        p.name as player_name
      from sports_upcoming_events e
      left join sport_teams t on t.id = e.sport_team_id
      left join sport_players p on p.id = e.sport_player_id
      where ${conditions.join(" and ")}
      order by e.starts_at asc nulls last, e.title asc, e.id asc
    `,
    values
  );

  const latest = await db.query<{ synced_at: string | null }>(
    `select max(synced_at) as synced_at from sports_upcoming_events`
  );

  return {
    items: result.rows,
    synced_at: latest.rows[0]?.synced_at ?? null
  };
}

/** Výchozí interval periodického sport syncu: 3 minuty */
export const SPORT_SYNC_INTERVAL_MS_DEFAULT = 180_000;

export const SPORT_SYNC_INTERVAL_MS_MIN = 5_000;
export const SPORT_SYNC_INTERVAL_MS_MAX = 600_000;

export function readSportSyncIntervalMsFromEnv(env: NodeJS.ProcessEnv): number {
  const raw = env.SPORT_SYNC_INTERVAL_MS?.trim();
  if (!raw) return SPORT_SYNC_INTERVAL_MS_DEFAULT;
  const n = Number(raw);
  if (
    !Number.isFinite(n) ||
    n < SPORT_SYNC_INTERVAL_MS_MIN ||
    n > SPORT_SYNC_INTERVAL_MS_MAX
  ) {
    return SPORT_SYNC_INTERVAL_MS_DEFAULT;
  }
  return Math.trunc(n);
}

export async function getSportSyncIntervalMs(
  db: Db,
  env: NodeJS.ProcessEnv = process.env
): Promise<number> {
  const fallback = readSportSyncIntervalMsFromEnv(env);
  try {
    const r = await db.query<{ value: unknown }>(
      "select value from app_settings where key = $1",
      ["sport_sync_interval_ms"]
    );
    const raw = r.rows[0]?.value;
    const n = parseOptionalNumber(raw);
    if (
      n &&
      Number.isFinite(n) &&
      n >= SPORT_SYNC_INTERVAL_MS_MIN &&
      n <= SPORT_SYNC_INTERVAL_MS_MAX
    ) {
      return Math.trunc(n);
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export type { TheSportsDbClientConfig } from "./theSportsDbClient.js";
