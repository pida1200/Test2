import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { MujdumClient } from "./clients/mujdumClient.js";

const emptyInput = z.object({});

const metricHistoryInput = z
  .object({
    key: z.string().min(1).describe("Klíč metriky, např. temp_jircany"),
    minutes: z
      .number()
      .int()
      .positive()
      .max(365 * 24 * 60)
      .optional()
      .describe("Okno v minutách zpět (výchozí na backendu 360 = 6 h)"),
    from: z.string().optional().describe("ISO začátek rozsahu (spolu s to)"),
    to: z.string().optional().describe("ISO konec rozsahu (spolu s from)")
  })
  .refine((v) => Boolean(v.from) === Boolean(v.to), {
    message: "Parametry from a to je nutné zadat oba nebo žádný"
  });

const sportUpcomingInput = z
  .object({
    from: z.string().optional().describe("ISO začátek rozsahu (výchozí: teď)"),
    to: z.string().optional().describe("ISO konec rozsahu (volitelné)"),
    teamId: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Interní ID týmu z číselníku (sport_teams.id)"),
    playerId: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Interní ID sportovce z číselníku (sport_players.id)")
  })
  .refine((v) => Boolean(v.from) === Boolean(v.to), {
    message: "Parametry from a to je nutné zadat oba nebo žádný"
  });

export function createMcpServer(mujdum: MujdumClient): McpServer {
  const server = new McpServer(
    {
      name: "home-mcp",
      version: "0.3.0"
    },
    {
      instructions:
        "Domácí MCP pro mujdum (read-only). Dashboard: mujdum_health, mujdum_dashboard_metrics, mujdum_metric_history. Číselníky: mujdum_rooms_list, mujdum_sport_teams_list, mujdum_sport_players_list. Sport: mujdum_sport_upcoming (cache z TheSportsDB, sync běží na backendu)."
    }
  );

  server.registerTool(
    "mujdum_health",
    {
      description: "Stav mujdum backendu (GET /health)",
      inputSchema: emptyInput
    },
    async () => {
      const data = await mujdum.health();
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
      };
    }
  );

  server.registerTool(
    "mujdum_dashboard_metrics",
    {
      description: "Aktuální metriky dashboardu (GET /api/dashboard)",
      inputSchema: emptyInput
    },
    async () => {
      const data = await mujdum.getDashboard();
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
      };
    }
  );

  server.registerTool(
    "mujdum_metric_history",
    {
      description:
        "Historie metriky pro graf (GET /api/dashboard/metrics/:key/history). Buď minutes, nebo from+to (ISO).",
      inputSchema: metricHistoryInput
    },
    async ({ key, minutes, from, to }) => {
      const data = await mujdum.getMetricHistory({ key, minutes, from, to });
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
      };
    }
  );

  server.registerTool(
    "mujdum_rooms_list",
    {
      description: "Číselník místností (GET /api/dictionaries/rooms)",
      inputSchema: emptyInput
    },
    async () => {
      const data = await mujdum.listRooms();
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
      };
    }
  );

  server.registerTool(
    "mujdum_sport_teams_list",
    {
      description:
        "Číselník sportovních týmů sledovaných v mujdum (GET /api/dictionaries/sport-teams)",
      inputSchema: emptyInput
    },
    async () => {
      const data = await mujdum.listSportTeams();
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
      };
    }
  );

  server.registerTool(
    "mujdum_sport_players_list",
    {
      description:
        "Číselník sportovců sledovaných v mujdum (GET /api/dictionaries/sport-players)",
      inputSchema: emptyInput
    },
    async () => {
      const data = await mujdum.listSportPlayers();
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
      };
    }
  );

  server.registerTool(
    "mujdum_sport_upcoming",
    {
      description:
        "Nadcházející sportovní akce z cache backendu (GET /api/sport/upcoming). Volitelně from/to (ISO) nebo teamId/playerId (interní ID z číselníků).",
      inputSchema: sportUpcomingInput
    },
    async ({ from, to, teamId, playerId }) => {
      const data = await mujdum.getSportUpcoming({ from, to, teamId, playerId });
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
      };
    }
  );

  return server;
}
