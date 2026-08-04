import type { Express, NextFunction, Response } from "express";
import type { Db } from "./db.js";
import { HttpError, sendError } from "./httpErrors.js";
import { defaultActiveFlag, firstQueryRow, isPgUniqueViolation } from "./pgErrors.js";
import {
  externalIdFromLookupRecord,
  loadTheSportsDbConfig,
  THESPORTSDB_DEMO_API_KEYS,
  TheSportsDbClient
} from "./sports/theSportsDbClient.js";

export type SportTeamRow = {
  id: number;
  name: string;
  thesportsdb_team_id: string;
  sport: string | null;
  league_hint: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type SportPlayerRow = {
  id: number;
  name: string;
  thesportsdb_player_id: string;
  sport: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

const TEAM_SELECT = `
  id, name, thesportsdb_team_id, sport, league_hint, active, created_at, updated_at
`;
const PLAYER_SELECT = `
  id, name, thesportsdb_player_id, sport, active, created_at, updated_at
`;

function trimString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function optionalTrim(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const t = trimString(v);
  return t || null;
}

function parseIdParam(raw: string): number | null {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

function readBodyField(body: unknown, key: string): { present: boolean; value: unknown } {
  if (typeof body !== "object" || body === null) {
    return { present: false, value: undefined };
  }
  if (!(key in body)) {
    return { present: false, value: undefined };
  }
  return { present: true, value: Object.getOwnPropertyDescriptor(body, key)?.value };
}

function patchTrimmed(body: unknown, key: string, current: string): string {
  const field = readBodyField(body, key);
  if (!field.present) return current;
  return trimString(field.value);
}

function patchOptionalField(body: unknown, key: string, current: string | null): string | null {
  const field = readBodyField(body, key);
  if (!field.present) return current;
  return optionalTrim(field.value);
}

async function verifyTeamExternalId(
  teamId: string,
  expectedSport?: string | null
): Promise<void> {
  const cfg = loadTheSportsDbConfig();
  if (cfg && !THESPORTSDB_DEMO_API_KEYS.has(cfg.apiKey)) {
    const client = new TheSportsDbClient(cfg);
    const verified = await client.verifyTeamForDictionary(teamId, expectedSport ?? undefined);
    if (!verified) {
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        "TheSportsDB tým s tímto ID nebyl nalezen nebo neodpovídá sportu.",
        { issues: [{ path: "thesportsdb_team_id", message: "Neplatný tým pro TheSportsDB" }] }
      );
    }
  }
}

async function verifyPlayerExternalId(playerId: string): Promise<void> {
  const cfg = loadTheSportsDbConfig();
  if (cfg && !THESPORTSDB_DEMO_API_KEYS.has(cfg.apiKey)) {
    const client = new TheSportsDbClient(cfg);
    const player = await client.lookupPlayer(playerId);
    if (!player) {
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        "TheSportsDB sportovec s tímto ID nebyl nalezen.",
        {
          issues: [{ path: "thesportsdb_player_id", message: "Neplatné ID sportovce" }]
        }
      );
    }

    const returnedId = externalIdFromLookupRecord(player, "idPlayer");
    if (returnedId !== playerId.trim()) {
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        "TheSportsDB vrátil jiného sportovce než odpovídá zadanému ID.",
        {
          issues: [{ path: "thesportsdb_player_id", message: "ID neodpovídá odpovědi API" }]
        }
      );
    }
  }
}

function handleDbError(e: unknown, res: Response, next: NextFunction) {
  if (e instanceof HttpError) {
    res.status(e.status).json(e.toBody());
    return;
  }
  if (isPgUniqueViolation(e)) {
    sendError(res, 409, "VALIDATION_ERROR", "Záznam s tímto externím ID už existuje.");
    return;
  }
  next(e);
}

export function registerSportDictionaryRoutes(app: Express, db: Db) {
  app.get("/api/dictionaries/sport-teams", async (_req, res, next) => {
    try {
      const result = await db.query<SportTeamRow>(
        `select ${TEAM_SELECT} from sport_teams order by name asc, id asc`
      );
      res.json({ items: result.rows });
    } catch (e) {
      next(e);
    }
  });

  app.post("/api/dictionaries/sport-teams", async (req, res, next) => {
    try {
      const name = trimString(req.body?.name);
      const thesportsdb_team_id = trimString(req.body?.thesportsdb_team_id);
      const issues: Array<{ path: string; message: string }> = [];
      if (!name) issues.push({ path: "name", message: "Povinné pole" });
      if (!thesportsdb_team_id) {
        issues.push({ path: "thesportsdb_team_id", message: "Povinné pole" });
      }
      if (issues.length > 0) {
        sendError(res, 400, "VALIDATION_ERROR", "Neplatná data.", { issues });
        return;
      }

      await verifyTeamExternalId(thesportsdb_team_id, optionalTrim(req.body?.sport));

      const result = await db.query<SportTeamRow>(
        `
          insert into sport_teams (name, thesportsdb_team_id, sport, league_hint, active)
          values ($1, $2, $3, $4, $5)
          returning ${TEAM_SELECT}
        `,
        [
          name,
          thesportsdb_team_id,
          optionalTrim(req.body?.sport),
          optionalTrim(req.body?.league_hint),
          defaultActiveFlag(req.body?.active)
        ]
      );
      res.status(201).json(firstQueryRow(result.rows, "insert sport team returned no row"));
    } catch (e) {
      handleDbError(e, res, next);
    }
  });

  app.patch("/api/dictionaries/sport-teams/:id", async (req, res, next) => {
    try {
      const id = parseIdParam(req.params.id);
      if (!id) {
        sendError(res, 400, "VALIDATION_ERROR", "Neplatné id.");
        return;
      }

      const existing = await db.query<SportTeamRow>(
        `select ${TEAM_SELECT} from sport_teams where id = $1`,
        [id]
      );
      if (existing.rows.length === 0) {
        sendError(res, 404, "NOT_FOUND", "Tým nenalezen.");
        return;
      }

      const row = firstQueryRow(existing.rows, "sport team row missing");
      const name = patchTrimmed(req.body, "name", row.name);
      const thesportsdb_team_id = patchTrimmed(req.body, "thesportsdb_team_id", row.thesportsdb_team_id);
      const sport = patchOptionalField(req.body, "sport", row.sport);
      const league_hint = patchOptionalField(req.body, "league_hint", row.league_hint);
      const active =
        typeof req.body?.active === "boolean" ? req.body.active : row.active;

      const issues: Array<{ path: string; message: string }> = [];
      if (!name) issues.push({ path: "name", message: "Povinné pole" });
      if (!thesportsdb_team_id) {
        issues.push({ path: "thesportsdb_team_id", message: "Povinné pole" });
      }
      if (issues.length > 0) {
        sendError(res, 400, "VALIDATION_ERROR", "Neplatná data.", { issues });
        return;
      }

      if (thesportsdb_team_id !== row.thesportsdb_team_id) {
        await verifyTeamExternalId(thesportsdb_team_id, sport);
      }

      const result = await db.query<SportTeamRow>(
        `
          update sport_teams
          set
            name = $2,
            thesportsdb_team_id = $3,
            sport = $4,
            league_hint = $5,
            active = $6,
            updated_at = now()
          where id = $1
          returning ${TEAM_SELECT}
        `,
        [id, name, thesportsdb_team_id, sport, league_hint, active]
      );
      res.json(firstQueryRow(result.rows, "update sport team returned no row"));
    } catch (e) {
      handleDbError(e, res, next);
    }
  });

  app.get("/api/dictionaries/sport-players", async (_req, res, next) => {
    try {
      const result = await db.query<SportPlayerRow>(
        `select ${PLAYER_SELECT} from sport_players order by name asc, id asc`
      );
      res.json({ items: result.rows });
    } catch (e) {
      next(e);
    }
  });

  app.post("/api/dictionaries/sport-players", async (req, res, next) => {
    try {
      const name = trimString(req.body?.name);
      const thesportsdb_player_id = trimString(req.body?.thesportsdb_player_id);
      const issues: Array<{ path: string; message: string }> = [];
      if (!name) issues.push({ path: "name", message: "Povinné pole" });
      if (!thesportsdb_player_id) {
        issues.push({ path: "thesportsdb_player_id", message: "Povinné pole" });
      }
      if (issues.length > 0) {
        sendError(res, 400, "VALIDATION_ERROR", "Neplatná data.", { issues });
        return;
      }

      await verifyPlayerExternalId(thesportsdb_player_id);

      const result = await db.query<SportPlayerRow>(
        `
          insert into sport_players (name, thesportsdb_player_id, sport, active)
          values ($1, $2, $3, $4)
          returning ${PLAYER_SELECT}
        `,
        [
          name,
          thesportsdb_player_id,
          optionalTrim(req.body?.sport),
          defaultActiveFlag(req.body?.active)
        ]
      );
      res.status(201).json(firstQueryRow(result.rows, "insert sport player returned no row"));
    } catch (e) {
      handleDbError(e, res, next);
    }
  });

  app.patch("/api/dictionaries/sport-players/:id", async (req, res, next) => {
    try {
      const id = parseIdParam(req.params.id);
      if (!id) {
        sendError(res, 400, "VALIDATION_ERROR", "Neplatné id.");
        return;
      }

      const existing = await db.query<SportPlayerRow>(
        `select ${PLAYER_SELECT} from sport_players where id = $1`,
        [id]
      );
      if (existing.rows.length === 0) {
        sendError(res, 404, "NOT_FOUND", "Sportovec nenalezen.");
        return;
      }

      const row = firstQueryRow(existing.rows, "sport player row missing");
      const name = patchTrimmed(req.body, "name", row.name);
      const thesportsdb_player_id = patchTrimmed(
        req.body,
        "thesportsdb_player_id",
        row.thesportsdb_player_id
      );
      const sport = patchOptionalField(req.body, "sport", row.sport);
      const active =
        typeof req.body?.active === "boolean" ? req.body.active : row.active;

      const issues: Array<{ path: string; message: string }> = [];
      if (!name) issues.push({ path: "name", message: "Povinné pole" });
      if (!thesportsdb_player_id) {
        issues.push({ path: "thesportsdb_player_id", message: "Povinné pole" });
      }
      if (issues.length > 0) {
        sendError(res, 400, "VALIDATION_ERROR", "Neplatná data.", { issues });
        return;
      }

      if (thesportsdb_player_id !== row.thesportsdb_player_id) {
        await verifyPlayerExternalId(thesportsdb_player_id);
      }

      const result = await db.query<SportPlayerRow>(
        `
          update sport_players
          set
            name = $2,
            thesportsdb_player_id = $3,
            sport = $4,
            active = $5,
            updated_at = now()
          where id = $1
          returning ${PLAYER_SELECT}
        `,
        [id, name, thesportsdb_player_id, sport, active]
      );
      res.json(firstQueryRow(result.rows, "update sport player returned no row"));
    } catch (e) {
      handleDbError(e, res, next);
    }
  });
}
