## mujdum – dokumentace (aktuální verze)

**Návrat k projektu (agent):** kořen repa [`AGENTS.md`](../../AGENTS.md), Obsidian `projekty/mujdum/hub.md`, u sportu [`sport.md`](sport.md) — sekce „Kontext pro agenta“.

### Spuštění (Docker)

```bash
cd mujdum
docker compose up -d --build
docker compose ps
```

Všechny služby mají `restart: unless-stopped` — po restartu hosta naběhne stack sám (DB, ES, backend, frontend).

### URL

- **Frontend**: `http://localhost:3000`
- **Backend**: `http://localhost:3001` (např. `GET /health`)
- **Kibana**: `http://localhost:5601`
- **Elasticsearch**: `http://localhost:9200`
- **Postgres**: `localhost:5434` (host → kontejner `db:5432`)

### Konfigurace (.env)

Soubor `mujdum/.env` se čte při startu `docker compose` a hodnoty se předávají do backendu (`env_file` u služby `backend`). Šablona: `mujdum/.env.example`.

V **`docker-compose.yml`** má služba `backend` navíc nastavené **`ELASTICSEARCH_URL`** (log aktivit do Elasticsearch). Při vlastním spouštění backendu mimo tento compose ho nastav ručně, jinak záložka Log a indexace aktivit nebudou fungovat.

Povinné pro funkční sync z Home Assistant:

- `HOME_ASSISTANT_URL` – např. `http://192.168.1.119:8123`
- `HOME_ASSISTANT_TOKEN` – Long-Lived Access Token

Volitelné:

- `DASHBOARD_SYNC_INTERVAL_MS` – výchozí interval HA sync v ms, dokud uživatel v UI **Nastavení** neuloží hodnotu do databáze (implicitně 30000)

Nasazení na domácí server (`192.168.1.123`, SSH, rsync): **`../README.md`** v kořeni projektu `mujdum/` (sekce „Nasazení na vzdálený Docker“).

Sloučení Postgres dat lokál ↔ vzdálený host: **`db-merge-lokal-remote.md`**.

### Co aplikace umí teď

- **Dashboard**: horní navigace; panely ve 3 sloupcích (≥900px) — Teploty → Elektřina → Sekačka → Zavlažování; metriky z HA + denní kWh (spotřeba / výroba / nákup / prodej); refresh UI 15 s; klik na metriku → graf z `/api/dashboard/metrics/.../history` (časová osa `Europe/Prague`); každý HA sync zapisuje snapshot do `dashboard_metrics` i historii v Postgresu.
- **Číselníky**: místnosti, ruční přidání, sync z HA.
- **Log**: aktivita z Elasticsearch (`/api/logs/activities`), chyby zvlášť (`/api/logs/errors`).
- **Nastavení**: interval backend syncu dashboardu v sekundách (5–600 s), uloženo v DB jako ms.

### Další dokumenty

- Doplňkové poznámky a session mimo git: ve vaultu Obsidian viz **`projekty/mujdum/hub`** (hub projektu).
- `zadani.md` — požadavky sladěné s kódem
- `sport.md` — zadání modulu Sport: záložka nadcházejících akcí, číselníky týmů/sportovců, TheSportsDB, MCP `home-mcp`
- `grafy.md` — mapa souborů grafů, varianty vykreslení (MUI / SVG timeline)
- `home-assistant-mapovani.md` — tabulka entit / friendly names → klíče metrik dashboardu (včetně `areaName`, denní energie)
- `db-merge-lokal-remote.md` — sloučení Postgres dat lokál ↔ vzdálený Docker bez zastavení lokálního backendu
- `hydrowise-spotreba-vody.md` — průtok 915 l/h, přepočet minut → litry, měsíční spotřeba závlahy
- `architecture.md`
- `api.md`
- `observability.md`
