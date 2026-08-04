import type { Express } from "express";
import type { Db } from "./db.js";
import type { createActivityLogger } from "./activityLog.js";
import { sendError } from "./httpErrors.js";
import {
  createTheSportsDbClientFromEnv,
  listUpcomingSportEvents,
  parseUpcomingQuery,
  syncSportUpcomingEvents
} from "./sports/sportsSync.js";

export { requireTheSportsDbClient, syncSportUpcomingEvents } from "./sports/sportsSync.js";

type ActivityLogger = ReturnType<typeof createActivityLogger>;

export function registerSportUpcomingRoutes(app: Express, db: Db, activity?: ActivityLogger) {
  app.get("/api/sport/upcoming", async (req, res, next) => {
    try {
      const parsed = parseUpcomingQuery({
        from: typeof req.query.from === "string" ? req.query.from : undefined,
        to: typeof req.query.to === "string" ? req.query.to : undefined,
        teamId: typeof req.query.teamId === "string" ? req.query.teamId : undefined,
        playerId: typeof req.query.playerId === "string" ? req.query.playerId : undefined
      });
      if (!parsed.ok) {
        sendError(res, 400, "VALIDATION_ERROR", parsed.message);
        return;
      }

      const data = await listUpcomingSportEvents(db, parsed);
      res.json(data);
    } catch (e) {
      next(e);
    }
  });

  app.post("/api/sport/sync", async (_req, res, next) => {
    try {
      const client = createTheSportsDbClientFromEnv();
      if (!client) {
        sendError(
          res,
          400,
          "CONFIGURATION_ERROR",
          "Chybí THESPORTSDB_API_KEY v backend env (viz mujdum/.env.example)."
        );
        return;
      }

      const result = await syncSportUpcomingEvents(db, client);

      await activity?.log({
        event: "sport.sync",
        message: "Sport upcoming events synced from TheSportsDB",
        data: {
          teamsProcessed: result.teamsProcessed,
          playersProcessed: result.playersProcessed,
          eventsUpserted: result.eventsUpserted,
          errorCount: result.errors.length
        }
      });

      res.json({
        ok: true,
        synced_at: result.syncedAt,
        teams_processed: result.teamsProcessed,
        players_processed: result.playersProcessed,
        events_upserted: result.eventsUpserted,
        errors: result.errors
      });
    } catch (e) {
      next(e);
    }
  });
}
