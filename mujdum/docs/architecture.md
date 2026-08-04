## Architektura

### Komponenty

- **Frontend** (`frontend/`)
  - build: Vite → statický bundle
  - runtime: Nginx (kontejner `frontend`)
  - `/api/*` je reverse-proxy do backendu (viz `frontend/nginx.conf`)

- **Backend** (`backend/`)
  - Node.js + Express (kontejner `backend`)
  - **`src/app.ts`** — definice HTTP API (`createApp`), včetně globálního error handleru logujícího do Elasticsearch
  - **`src/index.ts`** — naslouchání na portu, inicializační sync místností z HA (jen prázdná `rooms`), periodická smyčka **`syncDashboardFromHomeAssistant`** (objekt `mapping` metrik, zápis do DB, log `dashboard.ha_sync`)
  - **`src/homeAssistant.ts`** — volání HA REST API a výpočet mapovaných metrik
  - DB migrace se spouští při startu kontejneru: `node dist/scripts/migrate.js && node dist/src/index.js` (viz `docker-compose.yml`)

- **Databáze** (`db`)
  - PostgreSQL (kontejner `db`)
  - tabulky: `rooms`, `dashboard_metrics`, `dashboard_metrics_history`, `app_settings`, `schema_migrations`

- **Observability**
  - Elasticsearch (`elasticsearch`) + Kibana (`kibana`)
  - backend loguje aktivity do indexů `mujdum-activities-YYYY-MM`

### Tok dat (zjednodušeně)

1) **Dashboard metriky**

- Backend ve smyčce volá Home Assistant, dopočítá mapované metriky (včetně počasí pro Jirčany a odvozených polí jako zavlažování „auto“) a upsertuje `dashboard_metrics`; paralelně appenduje řádky do `dashboard_metrics_history`.
- Interval příštího běhu: hodnota z `app_settings.dashboard_sync_interval_ms` (uložená z UI), jinak `DASHBOARD_SYNC_INTERVAL_MS` z env, jinak 30 s (`getDashboardSyncIntervalMs` v `backend/src/index.ts`).
- Frontend každých **15 sekund** volá `GET /api/dashboard` a vykresluje dlaždice; klik na hodnotu načte `GET /api/dashboard/metrics/:key/history?minutes=…` (výchozí okno 6 h při otevření z UI).
- Konkrétní entity a friendly names v HA: viz **`home-assistant-mapovani.md`**.

1) **Číselník místností**

- `POST /api/dictionaries/rooms/sync-from-home-assistant` stáhne oblasti z HA a upsertne `rooms`.
- `POST /api/dictionaries/rooms/sync` upsertne předaný seznam názvů (např. externí nástroje).
- Frontend v záložce Číselníky používá `GET /api/dictionaries/rooms`; přidání řádku jde přes `POST /api/rooms`.
- Pro úplný výpis podle id existuje také `GET /api/rooms` (řazení podle id).

1) **Snapshot / automatizace**

- `POST /api/dashboard/snapshot` zapíše předaný objekt metrik do `dashboard_metrics` a zároveň do `dashboard_metrics_history` (stejný princip jako HA sync).

1) **Nastavení**

- `GET /api/settings` vrátí mapu klíčů z `app_settings`.
- `PUT /api/settings/dashboard-sync-interval-ms` uloží interval HA sync (5000–600000 ms).

1) **Log**

- Backend loguje aktivity (info/warn/error) do Elasticsearch.
- Frontend načítá `GET /api/logs/activities`; filtrovné chyby: `GET /api/logs/errors`.
