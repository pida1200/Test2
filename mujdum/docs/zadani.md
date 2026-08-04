## Zadání aplikace mujdum (sladěno se stavem kódu)

**Poslední revize:** 2026-05-16 — srovnáno s `backend/src/*`, `frontend/src/ui/App.tsx`, `docker-compose.yml` a `docs/*`.

**Backend — kde je co:** HTTP API a globální error handler jsou v `backend/src/app.ts`; start serveru, smyčka HA syncu, objekt `mapping` metrik a bootstrap místností jsou v `backend/src/index.ts`; výpočet metrik z HA (`haComputeDashboardMetrics`, odvozené hodnoty jako `irrigation_auto_any`) je v `backend/src/homeAssistant.ts`.

### Scope (co aplikace aktuálně řeší)

- **Dockerized stack**: `docker compose up -d --build` spustí FE+BE+DB+Elasticsearch+Kibana (backend: po migraci `migrate.js` startuje `dist/src/index.js` — viz `docker-compose.yml`). Logy kontejnerů: rotace `json-file` (max 10 MB × 3 soubory).
- **Lokální vývoj**: `npm run docker:watch` v `mujdum/` (Compose Watch — rebuild FE/BE při změně souborů; viz `mujdum/README.md`).
- **Cílový server (deploy/runtime)**: `http://192.168.1.123` (konvence nasazení v síti; lokálně `localhost`). Postup nasazení: **`mujdum/README.md`** (skript `scripts/deploy-remote.sh`, `.deploy.env`, SSH uživatel `zkorinek`).
- **Dashboard**
  - Ukazatele v UI: **Jirčany**, **Táta obývák**, **Obývák**, **Skleník**, blok **Sekačka** (plán, status, progress, déšť, odpočet), **Zavlažování** (sekce auto = klíč `irrigation_auto_any`, dešťový senzor), blok **Elektřina** (aktuální výroba a spotřeba ve wattech).
  - Backend periodicky synchronizuje metriky z Home Assistant REST API (interval nastavitelný — viz **Nastavení**).
  - Každý úspěšný zápis metrik do `dashboard_metrics` zároveň přidá řádek do **`dashboard_metrics_history`** (podklad pro grafy).
  - Frontend každých **15 s** dotahuje `GET /api/dashboard`; klik na metriku otevře **graf v čase** (`GET /api/dashboard/metrics/:key/history`, komponenta `DashboardMetricChart.tsx`). Výchozí okno při otevření: **6 h**; v modalu lze přepnout na 6 h / 12 h / 24 h / týden / měsíc / rok. Číselné řady = **MUI X Charts** (stejné parametry jako Test UI → MUI čárový, viz `docs/grafy.md`); diskrétní stavy (on/off, text) = **SVG timeline** (`StateTimelineChart.tsx`). Detail: **`docs/grafy.md`**.
  - Tlačítko **Obnovit** v horní liště na Dashboardu, Logu a Nastavení znovu načte data dané stránky (na Číselnících je vlastní „Obnovit číselníky“).
- **Číselníky**
  - Číselník místností: tabulka (MUI Data Grid), seznam + ruční přidání přes formulář (`POST /api/rooms`).
  - Sync z Home Assistant na vyžádání (`POST /api/dictionaries/rooms/sync-from-home-assistant`).
  - Sync seznamu názvů z API (`POST /api/dictionaries/rooms/sync` — payload `{ names: string[] }`, např. automatizace / MCP).
  - Inicializační sync při startu backendu **jen pokud je tabulka `rooms` prázdná** (a jsou nastavené HA proměnné).
- **Log**
  - Záložka Log: poslední záznamy z Elasticsearch (`GET /api/logs/activities`, tabulka MUI Data Grid). Filtr chyb: `GET /api/logs/errors`.
  - Bez platného `ELASTICSEARCH_URL` backend aktivitu loguje jen na stdout (`docker compose logs backend`), endpointy logů vrátí chybu konfigurace — ve stacku z `docker-compose.yml` je ES URL předána automaticky.
  - Chybové záznamy z HTTP handleru obsahují v `data` mimo jiné stack, HTTP method a path (globální error handler v `app.ts`).
  - Selhání periodického HA syncu se loguje jako `level: error` / `event: error` s textem a stackem (stále i na stdout).
  - Po každém běhu sync smyčky navíc informační záznam `dashboard.ha_sync` s `intervalMs` (plánování dalšího běhu).
  - U události `dashboard.ha_sync` po úspěšném syncu se do Elasticsearch ukládá jen **zhuštěné** `resolution` (klíč metriky, způsob výběru entity, příznak nedostupnosti), ne plné hodnoty stavů.
- **Nastavení**
  - Záložka **Nastavení**: interval HA sync pro dashboard v **sekundách** (UI); backend ukládá ms do **`app_settings`** (klíč `dashboard_sync_interval_ms`), s fallbackem na env `DASHBOARD_SYNC_INTERVAL_MS` / default 30 s.
  - Povolený rozsah: **5–600 s** (5 000–600 000 ms) — validace ve frontendu i v `PUT /api/settings/dashboard-sync-interval-ms`.
- **API pro automatizace**
  - `POST /api/dashboard/snapshot` — hromadný zápis metrik (např. MCP/automatizace); stejně jako HA sync zapisuje i historii.
- **Dokumentace**
  - Přehled a odkazy: **`docs/README.md`**; toto zadání; **`docs/architecture.md`**, **`docs/api.md`**, **`docs/observability.md`**.
  - Mapování entit HA → klíče dashboardu: **`docs/home-assistant-mapovani.md`** (ověřovat proti `index.ts` + `homeAssistant.ts`).
- Hydrawise / odhad spotřeby vody (konstanty, měsíční tabulka): **`docs/hydrowise-spotreba-vody.md`** — referenční podklad, **bez integrace v aplikaci**.
- **Sport** (plánované): záložka Sport, číselníky týmů a sportovců, sync TheSportsDB, MCP `home-mcp` — **`docs/sport.md`**.
- Doplňkové poznámky mimo git: vault Obsidian **`projekty/mujdum/hub`** (viz `docs/README.md`).

### Out of scope (záměrně neřešeno)

- Uživatelské účty, role, přihlášení.
- Alerting, push notifikace, dlouhodobá redukce/archivace historie (tabulka historie roste; retention není řešena).
- CRUD dalších číselníků kromě místností.
- Integrace Hydrawise API a UI „Porovnání spotřeby“ (jen dokumentace v `hydrowise-spotreba-vody.md`).
- Modul **Sport** (záložka, číselníky týmů/sportovců, TheSportsDB) a `home-mcp` — dokud není dokončena příslušná fáze v **`docs/sport.md`** (viz M6).
- Záložka **Test UI** — srovnání knihoven grafů (Recharts, Chart.js, MUI X Charts); není součást produktového dashboardu.
- Produkční nasazení v širším smyslu (Kubernetes, TLS, CI/CD, centrální secrets management).
- Přímé ovládání zařízení v Home Assistant z této aplikace.

### Milestones (mapování na realitu)

- **M1 — Spuštění a infrastruktura**: Compose, porty, FE proxy `/api/*`, log rotation.
- **M2 — Home Assistant**: rooms + dashboard metriky z HA; konfigurace URL/token; sync smyčka s nastavitelným intervalem (DB + env); odvozená metrika `irrigation_auto_any`.
- **M3 — UI**: Dashboard (včetně grafů a elektřiny), Číselníky, Log, Nastavení; Obnovit dle stránky.
- **M4 — Observability**: zápisy do `mujdum-activities-*`, UI Log.
- **M5 — Stabilizace**: unit testy hlavních API (`backend/test/app.test.ts`), `httpErrors`, frontend `apiError`; lint; dokumentace odpovídá kódu.
- **M6 — Sport (plánováno)**: záložka **Sport** (nadcházející akce), číselníky **týmy** a **sportovci**, sync TheSportsDB na backendu, `home-mcp` na `192.168.1.123:8766` — postup **`docs/sport.md`** (fáze 0–9).

### Test plan (akceptační kontroly)

- **Spuštění**: `docker compose up -d --build` → `docker compose ps` vše `Up`.
- **Dashboard**: `GET http://localhost:3000/api/dashboard` vrací `metrics` a `updated_at`; po běžícím HA sync se mění v čase; klik na teplotu otevře graf s body z `/api/dashboard/metrics/temp_jircany/history`; přepnutí okna (např. 24 h) změní `minutes` v odpovědi.
- **Číselníky**: načtení seznamu; „Aktualizace z Home Assistant“ provede sync; ruční přidání místnosti.
- **Nastavení**: uložení intervalu např. **30–120 s** a ověření v `GET /api/settings` nebo v logu události `settings.update` (rozsah API je 5–600 s).
- **Log**: viditelné aktivity včetně `dashboard.ha_sync`; `GET /api/logs/errors` vrací filtrované chyby; syntetická chyba na API vytvoří záznam `error` se stackem a method/path.
- **Kibana**: Data View `mujdum-activities-*`, Discover.
- **Automatické testy**: `cd mujdum/backend && npm test && npm run lint`; `cd mujdum/frontend && npm test && npm run lint`.
