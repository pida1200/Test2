/**
 * Ruční test syncu nadcházejících zápasů z TheSportsDB pro jeden tým (fáze 4).
 *
 *   cd mujdum/backend
 *   DOTENV_CONFIG_PATH=../.env npm run sports:sync-test -- 133602
 *
 * Vyžaduje THESPORTSDB_API_KEY v mujdum/.env (premium doporučeno; free klíč 123 má omezení).
 */
import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";
import {
  loadTheSportsDbConfig,
  TheSportsDbClient
} from "../src/sports/theSportsDbClient.js";

const dotenvPath = process.env.DOTENV_CONFIG_PATH ?? resolve(process.cwd(), "../.env");
loadDotenv({ path: dotenvPath });

async function main() {
  const cfg = loadTheSportsDbConfig(process.env);
  if (!cfg) {
    console.error(
      "[sports-sync-test] Chybí THESPORTSDB_API_KEY v mujdum/.env (viz .env.example)."
    );
    process.exit(1);
  }

  const teamId = process.argv[2]?.trim() || process.env.SPORTS_TEST_TEAM_ID?.trim();
  if (!teamId) {
    console.error(
      "[sports-sync-test] Zadej idTeam: npm run sports:sync-test -- <thesportsdb_team_id>"
    );
    console.error("  nebo SPORTS_TEST_TEAM_ID v .env");
    process.exit(1);
  }

  const client = new TheSportsDbClient(cfg);

  console.log(`[sports-sync-test] lookupteam id=${teamId}`);
  const team = await client.lookupTeam(teamId);
  if (team) {
    console.log(
      JSON.stringify(
        {
          idTeam: team.idTeam,
          strTeam: team.strTeam,
          strLeague: team.strLeague,
          strSport: team.strSport
        },
        null,
        2
      )
    );
  } else {
    console.warn("[sports-sync-test] Tým nenalezen (lookupteam).");
  }

  console.log(`[sports-sync-test] eventsnext id=${teamId}`);
  const events = await client.getTeamUpcomingEvents(teamId);
  console.log(`[sports-sync-test] Počet nadcházejících událostí: ${events.length}`);
  console.log(JSON.stringify(events, null, 2));
}

try {
  await main();
} catch (err) {
  console.error("[sports-sync-test] Chyba:", err);
  process.exit(1);
}
