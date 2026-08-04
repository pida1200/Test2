import "dotenv/config";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

type Direction = "up" | "down";

const direction = (process.argv[2] ?? "up") as Direction;
if (direction !== "up" && direction !== "down") {
  console.error(`Unknown direction: ${direction}. Use "up" or "down".`);
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Missing DATABASE_URL (see mujdum/.env.example).");
  process.exit(1);
}

const migrationsDir = path.resolve("migrations/sql");

function isSqlMigrationFile(name: string) {
  return /^\d+_.*\.(up|down)\.sql$/.test(name);
}

function sortMigrationFiles(files: string[]) {
  return files.slice().sort((a, b) => a.localeCompare(b));
}

function baseKey(filename: string) {
  // 001_create_rooms.up.sql -> 001_create_rooms
  return filename.replace(/\.(up|down)\.sql$/, "");
}

async function ensureMigrationsTable(client: pg.Client) {
  await client.query(`
    create table if not exists schema_migrations (
      id text primary key,
      applied_at timestamptz not null default now()
    )
  `);
}

async function listMigrationPairs() {
  const files = (await readdir(migrationsDir)).filter(isSqlMigrationFile);
  const grouped = new Map<string, { up?: string; down?: string }>();
  for (const f of files) {
    const key = baseKey(f);
    const entry = grouped.get(key) ?? {};
    if (f.endsWith(".up.sql")) entry.up = f;
    if (f.endsWith(".down.sql")) entry.down = f;
    grouped.set(key, entry);
  }
  return sortMigrationFiles([...grouped.keys()]).map((key) => ({
    id: key,
    up: grouped.get(key)?.up,
    down: grouped.get(key)?.down
  }));
}

async function appliedIds(client: pg.Client): Promise<Set<string>> {
  const res = await client.query<{ id: string }>(
    "select id from schema_migrations order by id asc"
  );
  return new Set(res.rows.map((r) => r.id));
}

async function run() {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await ensureMigrationsTable(client);
    const pairs = await listMigrationPairs();

    if (direction === "up") {
      const applied = await appliedIds(client);
      for (const m of pairs) {
        if (applied.has(m.id)) continue;
        if (!m.up) {
          throw new Error(`Missing up migration for ${m.id}`);
        }
        const sql = await readFile(path.join(migrationsDir, m.up), "utf8");
        await client.query("begin");
        try {
          await client.query(sql);
          await client.query("insert into schema_migrations (id) values ($1)", [
            m.id
          ]);
          await client.query("commit");
        } catch (e) {
          await client.query("rollback");
          throw e;
        }
      }
      return;
    }

    // down: revert last applied migration (if it has a down script)
    const res = await client.query<{ id: string }>(
      "select id from schema_migrations order by id desc limit 1"
    );
    const last = res.rows[0]?.id;
    if (!last) return;

    const m = pairs.find((x) => x.id === last);
    if (!m?.down) {
      throw new Error(`Missing down migration for ${last}`);
    }

    const sql = await readFile(path.join(migrationsDir, m.down), "utf8");
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query("delete from schema_migrations where id = $1", [last]);
      await client.query("commit");
    } catch (e) {
      await client.query("rollback");
      throw e;
    }
  } finally {
    await client.end();
  }
}

try {
  await run();
} catch (e) {
  console.error(e);
  process.exit(1);
}

