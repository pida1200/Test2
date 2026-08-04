import type { Db } from "../src/db.js";
import type { SportPlayerRow, SportTeamRow } from "../src/sportDictionaries.js";
import type { SportUpcomingEventRow } from "../src/sports/sportsSync.js";

type RoomRow = { id: number; name: string; created_at: string };
type DashboardMetricRow = { key: string; value: unknown; updated_at: string };
type DashboardMetricHistoryRow = {
  key: string;
  created_at: string;
  value: unknown;
  numeric_value: number | null;
};

export type FakeDbState = {
  rooms: RoomRow[];
  sportTeams: SportTeamRow[];
  sportPlayers: SportPlayerRow[];
  sportUpcoming: SportUpcomingEventRow[];
  dashboardMetrics: DashboardMetricRow[];
  history: DashboardMetricHistoryRow[];
  settings: Array<{ key: string; value: unknown }>;
  nextRoomId: number;
  nextSportTeamId: number;
  nextSportPlayerId: number;
  nextSportUpcomingId: number;
};

export function createFakeDb(initial?: Partial<FakeDbState>): Db {
  const state: FakeDbState = {
    rooms: initial?.rooms ?? [],
    sportTeams: initial?.sportTeams ?? [],
    sportPlayers: initial?.sportPlayers ?? [],
    sportUpcoming: initial?.sportUpcoming ?? [],
    dashboardMetrics: initial?.dashboardMetrics ?? [],
    history: initial?.history ?? [],
    settings: initial?.settings ?? [],
    nextRoomId: initial?.nextRoomId ?? 1,
    nextSportTeamId: initial?.nextSportTeamId ?? 1,
    nextSportPlayerId: initial?.nextSportPlayerId ?? 1,
    nextSportUpcomingId: initial?.nextSportUpcomingId ?? 1
  };

  const nowIso = () => new Date().toISOString();

  const findSportTeam = (id: number) => state.sportTeams.find((t) => t.id === id);
  const findSportPlayer = (id: number) => state.sportPlayers.find((p) => p.id === id);

  return {
    query: async (sql: string, params?: unknown[]) => {
      const s = sql.replace(/\s+/g, " ").trim().toLowerCase();

      if (s.startsWith("select id, name, created_at from rooms order by id")) {
        return {
          rows: [...state.rooms].sort((a, b) => a.id - b.id)
        };
      }

      if (s.startsWith("select id, name, created_at from rooms order by name")) {
        return {
          rows: [...state.rooms].sort((a, b) => a.name.localeCompare(b.name))
        };
      }

      if (s.startsWith("select key, value, updated_at from dashboard_metrics")) {
        return {
          rows: [...state.dashboardMetrics].sort((a, b) => a.key.localeCompare(b.key))
        };
      }

      if (
        s.startsWith("select created_at, value, numeric_value from dashboard_metrics_history") ||
        s.startsWith("select created_at, numeric_value from dashboard_metrics_history")
      ) {
        const key = params?.[0] as string;
        let rows = state.history.filter((h) => h.key === key);
        if (s.includes("interval '36 hours'")) {
          const cutoff = Date.now() - 36 * 60 * 60 * 1000;
          rows = rows.filter((h) => Date.parse(h.created_at) >= cutoff);
        }
        if (params && params.length >= 3 && s.includes("created_at <")) {
          const fromMs = Date.parse(params[1] as string);
          const toMs = Date.parse(params[2] as string);
          if (Number.isFinite(fromMs) && Number.isFinite(toMs)) {
            rows = rows.filter((h) => {
              const t = Date.parse(h.created_at);
              return Number.isFinite(t) && t >= fromMs && t < toMs;
            });
          }
        }
        return {
          rows: rows
            .sort(
              (a, b) =>
                Date.parse(a.created_at) - Date.parse(b.created_at)
            )
            .map(({ created_at, value, numeric_value }) => ({
              created_at,
              value,
              numeric_value
            }))
        };
      }

      if (s.startsWith("select key, value from app_settings")) {
        return { rows: state.settings.map((x) => ({ key: x.key, value: x.value })) };
      }

      if (s.includes("insert into rooms")) {
        const name = params?.[0] as string;
        const existing = state.rooms.find((r) => r.name === name);
        const row: RoomRow =
          existing ??
          {
            id: state.nextRoomId++,
            name,
            created_at: nowIso()
          };
        if (!existing) {
          state.rooms.push(row);
        }
        return { rows: [row] };
      }

      if (s.includes("from sport_teams where active = true")) {
        return {
          rows: [...state.sportTeams]
            .filter((t) => t.active)
            .sort((a, b) => a.id - b.id)
        };
      }

      if (s.includes("from sport_players where active = true")) {
        return {
          rows: [...state.sportPlayers]
            .filter((p) => p.active)
            .sort((a, b) => a.id - b.id)
        };
      }

      if (s.includes("insert into sports_upcoming_events")) {
        const [
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
        ] = params as [
          string,
          string,
          string,
          string,
          string,
          string | null,
          string | null,
          string | null,
          number | null,
          number | null,
          string
        ];
        const existing = state.sportUpcoming.find(
          (e) => e.source === source && e.external_event_id === external_event_id
        );
        if (existing) {
          existing.title = title;
          existing.home_team = home_team;
          existing.away_team = away_team;
          existing.starts_at = starts_at;
          existing.league = league;
          existing.sport = sport;
          existing.sport_team_id = sport_team_id ?? existing.sport_team_id;
          existing.sport_player_id = sport_player_id ?? existing.sport_player_id;
          existing.synced_at = synced_at;
          return { rows: [] };
        }
        const row: SportUpcomingEventRow = {
          id: state.nextSportUpcomingId++,
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
        };
        state.sportUpcoming.push(row);
        return { rows: [] };
      }

      if (s.includes("delete from sports_upcoming_events where sport_team_id")) {
        const [sportTeamId, syncedBefore] = params as [number, string];
        state.sportUpcoming = state.sportUpcoming.filter(
          (e) =>
            !(
              e.sport_team_id === sportTeamId &&
              e.sport_player_id === null &&
              e.synced_at < syncedBefore
            )
        );
        return { rows: [] };
      }

      if (s.includes("delete from sports_upcoming_events where sport_player_id")) {
        const [sportPlayerId, syncedBefore] = params as [number, string];
        state.sportUpcoming = state.sportUpcoming.filter(
          (e) => !(e.sport_player_id === sportPlayerId && e.synced_at < syncedBefore)
        );
        return { rows: [] };
      }

      if (s.includes("delete from sports_upcoming_events where starts_at is not null")) {
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        state.sportUpcoming = state.sportUpcoming.filter((e) => {
          if (!e.starts_at) return true;
          return Date.parse(e.starts_at) >= cutoff;
        });
        return { rows: [] };
      }

      if (s.includes("from sports_upcoming_events e")) {
        const fromIso = params?.[0] as string;
        const fromMs = Date.parse(fromIso);
        let rows = state.sportUpcoming.filter((e) => {
          if (!e.starts_at) return true;
          return Date.parse(e.starts_at) >= fromMs;
        });
        let paramIdx = 1;
        if (s.includes("e.starts_at <=") && params && params.length > paramIdx) {
          const toMs = Date.parse(params[paramIdx] as string);
          paramIdx += 1;
          rows = rows.filter((e) => {
            if (!e.starts_at) return true;
            return Date.parse(e.starts_at) <= toMs;
          });
        }
        if (s.includes("e.sport_team_id =") && params && params.length > paramIdx) {
          const teamId = params[paramIdx] as number;
          paramIdx += 1;
          rows = rows.filter((e) => e.sport_team_id === teamId);
        }
        if (s.includes("e.sport_player_id =") && params && params.length > paramIdx) {
          const playerId = params[paramIdx] as number;
          rows = rows.filter((e) => e.sport_player_id === playerId);
        }
        const mapped = rows
          .sort((a, b) => {
            const ta = a.starts_at ? Date.parse(a.starts_at) : Number.MAX_SAFE_INTEGER;
            const tb = b.starts_at ? Date.parse(b.starts_at) : Number.MAX_SAFE_INTEGER;
            return ta - tb || a.title.localeCompare(b.title) || a.id - b.id;
          })
          .map((e) => ({
            ...e,
            team_name:
              e.sport_team_id != null
                ? state.sportTeams.find((t) => t.id === e.sport_team_id)?.name ?? null
                : null,
            player_name:
              e.sport_player_id != null
                ? state.sportPlayers.find((p) => p.id === e.sport_player_id)?.name ?? null
                : null
          }));
        return { rows: mapped };
      }

      if (s.includes("max(synced_at) as synced_at from sports_upcoming_events")) {
        const max = state.sportUpcoming.reduce<string | null>((acc, e) => {
          if (!acc || e.synced_at > acc) return e.synced_at;
          return acc;
        }, null);
        return { rows: [{ synced_at: max }] };
      }

      if (s.includes("from sports_upcoming_events where external_event_id")) {
        const extId = params?.[0] as string;
        const match = state.sportUpcoming.filter((e) => e.external_event_id === extId);
        if (s.includes("sport_player_id") || s.includes("sport_team_id")) {
          return {
            rows: match.map((e) => ({
              sport_team_id: e.sport_team_id,
              sport_player_id: e.sport_player_id,
              title: e.title
            }))
          };
        }
        return { rows: match.map((e) => ({ title: e.title })) };
      }

      if (s.includes("from sport_teams order by name")) {
        return {
          rows: [...state.sportTeams].sort((a, b) =>
            a.name.localeCompare(b.name) || a.id - b.id
          )
        };
      }

      if (s.includes("from sport_teams where id =")) {
        const id = params?.[0] as number;
        const row = findSportTeam(id);
        return { rows: row ? [row] : [] };
      }

      if (s.includes("insert into sport_teams")) {
        const [name, thesportsdb_team_id, sport, league_hint, active] = params as [
          string,
          string,
          string | null,
          string | null,
          boolean
        ];
        if (state.sportTeams.some((t) => t.thesportsdb_team_id === thesportsdb_team_id)) {
          const err = new Error("unique violation") as Error & { code: string };
          err.code = "23505";
          throw err;
        }
        const ts = nowIso();
        const row: SportTeamRow = {
          id: state.nextSportTeamId++,
          name,
          thesportsdb_team_id,
          sport,
          league_hint,
          active,
          created_at: ts,
          updated_at: ts
        };
        state.sportTeams.push(row);
        return { rows: [row] };
      }

      if (s.includes("update sport_teams")) {
        const [id, name, thesportsdb_team_id, sport, league_hint, active] = params as [
          number,
          string,
          string,
          string | null,
          string | null,
          boolean
        ];
        const row = findSportTeam(id);
        if (!row) return { rows: [] };
        if (
          state.sportTeams.some(
            (t) => t.id !== id && t.thesportsdb_team_id === thesportsdb_team_id
          )
        ) {
          const err = new Error("unique violation") as Error & { code: string };
          err.code = "23505";
          throw err;
        }
        row.name = name;
        row.thesportsdb_team_id = thesportsdb_team_id;
        row.sport = sport;
        row.league_hint = league_hint;
        row.active = active;
        row.updated_at = nowIso();
        return { rows: [row] };
      }

      if (s.includes("from sport_players order by name")) {
        return {
          rows: [...state.sportPlayers].sort((a, b) =>
            a.name.localeCompare(b.name) || a.id - b.id
          )
        };
      }

      if (s.includes("from sport_players where id =")) {
        const id = params?.[0] as number;
        const row = findSportPlayer(id);
        return { rows: row ? [row] : [] };
      }

      if (s.includes("insert into sport_players")) {
        const [name, thesportsdb_player_id, sport, active] = params as [
          string,
          string,
          string | null,
          boolean
        ];
        if (
          state.sportPlayers.some((p) => p.thesportsdb_player_id === thesportsdb_player_id)
        ) {
          const err = new Error("unique violation") as Error & { code: string };
          err.code = "23505";
          throw err;
        }
        const ts = nowIso();
        const row: SportPlayerRow = {
          id: state.nextSportPlayerId++,
          name,
          thesportsdb_player_id,
          sport,
          active,
          created_at: ts,
          updated_at: ts
        };
        state.sportPlayers.push(row);
        return { rows: [row] };
      }

      if (s.includes("update sport_players")) {
        const [id, name, thesportsdb_player_id, sport, active] = params as [
          number,
          string,
          string,
          string | null,
          boolean
        ];
        const row = findSportPlayer(id);
        if (!row) return { rows: [] };
        if (
          state.sportPlayers.some(
            (p) => p.id !== id && p.thesportsdb_player_id === thesportsdb_player_id
          )
        ) {
          const err = new Error("unique violation") as Error & { code: string };
          err.code = "23505";
          throw err;
        }
        row.name = name;
        row.thesportsdb_player_id = thesportsdb_player_id;
        row.sport = sport;
        row.active = active;
        row.updated_at = nowIso();
        return { rows: [row] };
      }

      if (s.includes("insert into dashboard_metrics")) {
        const key = params?.[0] as string;
        const value = JSON.parse(params?.[1] as string) as unknown;
        const updated_at = new Date().toISOString();
        const idx = state.dashboardMetrics.findIndex((m) => m.key === key);
        const row: DashboardMetricRow = { key, value, updated_at };
        if (idx >= 0) {
          state.dashboardMetrics[idx] = row;
        } else {
          state.dashboardMetrics.push(row);
        }
        return { rows: [] };
      }

      if (s.includes("insert into dashboard_metrics_history")) {
        const key = params?.[0] as string;
        const value = JSON.parse(params?.[1] as string) as unknown;
        const numeric = params?.[2] as number | null;
        state.history.push({
          key,
          created_at: new Date().toISOString(),
          value,
          numeric_value: numeric
        });
        return { rows: [] };
      }

      if (s.includes("insert into app_settings")) {
        const key = params?.[0] as string;
        const value = JSON.parse(params?.[1] as string) as unknown;
        const idx = state.settings.findIndex((x) => x.key === key);
        if (idx >= 0) {
          state.settings[idx] = { key, value };
        } else {
          state.settings.push({ key, value });
        }
        return { rows: [] };
      }

      if (s.includes("select value from app_settings")) {
        const key = params?.[0] as string;
        const row = state.settings.find((x) => x.key === key);
        return { rows: row ? [{ value: row.value }] : [] };
      }

      throw new Error(`fakeDb: unhandled query: ${sql}`);
    }
  };
}
