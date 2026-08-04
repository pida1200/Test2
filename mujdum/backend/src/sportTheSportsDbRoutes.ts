import type { Express, Response } from "express";
import { sendError } from "./httpErrors.js";
import {
  loadTheSportsDbConfig,
  TheSportsDbError,
  THESPORTSDB_DEMO_API_KEYS,
  type TheSportsDbClient
} from "./sports/theSportsDbClient.js";
import { createTheSportsDbClientFromEnv } from "./sports/sportsSync.js";
import { normalizeSportParam } from "./sports/theSportsDbTeamSearch.js";

function requireSearchClient(res: Response): TheSportsDbClient | null {
  const client = createTheSportsDbClientFromEnv();
  if (!client) {
    sendError(
      res,
      503,
      "CONFIGURATION_ERROR",
      "Chybí THESPORTSDB_API_KEY v backend env (viz mujdum/.env.example)."
    );
    return null;
  }
  return client;
}

export function registerSportTheSportsDbRoutes(app: Express) {
  app.get("/api/sport/thesportsdb/meta", (_req, res) => {
    const cfg = loadTheSportsDbConfig();
    res.json({
      configured: Boolean(cfg),
      demo_key: cfg ? THESPORTSDB_DEMO_API_KEYS.has(cfg.apiKey) : false
    });
  });

  app.get("/api/sport/thesportsdb/sports", async (_req, res, next) => {
    try {
      const client = requireSearchClient(res);
      if (!client) return;

      const items = await client.listSports();
      res.json({ items, demo_key: client.isDemoApiKey() });
    } catch (e) {
      next(e);
    }
  });

  app.get("/api/sport/thesportsdb/teams/search", async (req, res, next) => {
    try {
      const client = requireSearchClient(res);
      if (!client) return;

      const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
      const sportRaw = typeof req.query.sport === "string" ? req.query.sport.trim() : "";

      if (!sportRaw) {
        sendError(res, 400, "VALIDATION_ERROR", "Parametr sport je povinný.");
        return;
      }
      const sport = normalizeSportParam(sportRaw);
      if (q.length < 2) {
        res.json({ items: [], demo_key: client.isDemoApiKey() });
        return;
      }

      const items = await client.searchTeams(q, sport);
      res.json({ items, demo_key: client.isDemoApiKey() });
    } catch (e) {
      if (e instanceof TheSportsDbError) {
        sendError(res, 502, "UPSTREAM_ERROR", "TheSportsDB vyhledávání selhalo.");
        return;
      }
      next(e);
    }
  });

  app.get("/api/sport/thesportsdb/teams/:teamId/verify", async (req, res, next) => {
    try {
      const client = requireSearchClient(res);
      if (!client) return;

      const teamId = req.params.teamId?.trim();
      if (!teamId) {
        sendError(res, 400, "VALIDATION_ERROR", "Chybí ID týmu.");
        return;
      }

      const sportRaw =
        typeof req.query.sport === "string" ? req.query.sport.trim() : undefined;
      const sport = sportRaw ? normalizeSportParam(sportRaw) : undefined;
      const team = await client.verifyTeamForDictionary(teamId, sport);
      if (!team) {
        sendError(
          res,
          400,
          "VALIDATION_ERROR",
          "Tým v TheSportsDB nebyl nalezen nebo neodpovídá zvolenému sportu."
        );
        return;
      }

      res.json({ ok: true, team, demo_key: client.isDemoApiKey() });
    } catch (e) {
      if (e instanceof TheSportsDbError) {
        sendError(res, 502, "UPSTREAM_ERROR", "TheSportsDB ověření selhalo.");
        return;
      }
      next(e);
    }
  });

  app.get("/api/sport/thesportsdb/players/search", async (req, res, next) => {
    try {
      const client = requireSearchClient(res);
      if (!client) return;

      const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
      const sportRaw = typeof req.query.sport === "string" ? req.query.sport.trim() : "";

      if (!sportRaw) {
        sendError(res, 400, "VALIDATION_ERROR", "Parametr sport je povinný.");
        return;
      }
      const sport = normalizeSportParam(sportRaw);
      if (q.length < 2) {
        res.json({ items: [], demo_key: client.isDemoApiKey() });
        return;
      }

      const items = await client.searchPlayers(q, sport);
      res.json({ items, demo_key: client.isDemoApiKey() });
    } catch (e) {
      if (e instanceof TheSportsDbError) {
        sendError(res, 502, "UPSTREAM_ERROR", "TheSportsDB vyhledávání sportovců selhalo.");
        return;
      }
      next(e);
    }
  });

  app.get("/api/sport/thesportsdb/players/:playerId/verify", async (req, res, next) => {
    try {
      const client = requireSearchClient(res);
      if (!client) return;

      const playerId = req.params.playerId?.trim();
      if (!playerId) {
        sendError(res, 400, "VALIDATION_ERROR", "Chybí ID sportovce.");
        return;
      }

      const sportRaw =
        typeof req.query.sport === "string" ? req.query.sport.trim() : undefined;
      const sport = sportRaw ? normalizeSportParam(sportRaw) : undefined;
      const player = await client.verifyPlayerForDictionary(playerId, sport);
      if (!player) {
        sendError(
          res,
          400,
          "VALIDATION_ERROR",
          "Sportovec v TheSportsDB nebyl nalezen nebo neodpovídá zvolenému sportu."
        );
        return;
      }

      res.json({ ok: true, player, demo_key: client.isDemoApiKey() });
    } catch (e) {
      if (e instanceof TheSportsDbError) {
        sendError(res, 502, "UPSTREAM_ERROR", "TheSportsDB ověření sportovce selhalo.");
        return;
      }
      next(e);
    }
  });
}
