## API (backend)

### Chyby (error envelope)

Většina chybových odpovědí má tvar:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Popis pro uživatele / klienta",
    "issues": [{ "path": "name", "message": "Povinné pole" }]
  }
}
```

- `code` — `UPPER_SNAKE_CASE`, stabilní (např. `VALIDATION_ERROR`, `CONFIGURATION_ERROR`, `INTERNAL_SERVER_ERROR`, `ELASTICSEARCH_ERROR`, `HOME_ASSISTANT_ERROR`).
- `issues` — volitelné; u validace 400 typicky přítomné.

Základní URL v Dockeru:

- přes frontend proxy: `http://localhost:3000/api/...`
- přímo backend: `http://localhost:3001/api/...`

### Health

- `GET /health` → `{ ok: true }`

### Dashboard

- `GET /api/dashboard`
  - vrací `{ metrics: Record<string,unknown>, updated_at: string|null }`
  - `metrics` jsou agregované hodnoty z tabulky `dashboard_metrics` (klíč → JSON hodnota)

- `POST /api/dashboard/snapshot`
  - payload: `{ metrics: Record<string,unknown> }`
  - upsert do `dashboard_metrics` a zápis do `dashboard_metrics_history` pro každý klíč
  - určeno pro automatizaci / ingest (ne pro běžné obnovení UI)

- `GET /api/dashboard/metrics/:key/history`
  - query: `minutes` (volitelné, integer) — délka okna zpět od „teď“, výchozí **360** (6 h), maximum cca jeden rok
  - alternativně rozsah: `from` + `to` (ISO 8601) — má přednost před `minutes`
  - vrací `{ key, minutes, points: [{ ts, value, numeric }] }`
  - `numeric` je vyplněné jen pokud šlo hodnotu interpretovat jako číslo

- `GET /api/dashboard/electricity/energy`
  - sloupcový graf energie (kWh) integrací výkonu (`electricity_production_w`, `electricity_consumption_w`) z historie
  - query:
    - `period` — `month` | `year` (povinné)
    - `anchor` — `YYYY-MM` pro `month`, `YYYY` pro `year` (povinné)
  - `period=month` → týdenní sloupce (kalendářní týden po–ne protínající měsíc; sloupec = celý týden)
  - `period=year` → měsíční sloupce (leden–prosinec; u aktuálního roku jen do aktuálního měsíce)
  - vrací `{ period, anchor, bucketUnit: "week"|"month", buckets: [{ key, from, to, producedKwh, consumedKwh }] }`
  - `key` = `weekStart` (`YYYY-MM-DD`, pondělí) u týdnů, resp. `YYYY-MM` u měsíců
  - chyby: `400 VALIDATION_ERROR` (neplatné `period`/`anchor`)

### Rooms / Číselníky

- `GET /api/rooms`
  - vrací `{ items: Room[] }` seřazeno podle `id`

- `GET /api/dictionaries/rooms`
  - vrací `{ items: Room[] }` seřazeno podle `name`

- `POST /api/rooms`
  - payload: `{ name: string }`
  - upsert podle unikátního názvu, odpověď jeden `Room` (201)

- `POST /api/dictionaries/rooms/sync`
  - payload: `{ names: string[] }`
  - upsert seznamu názvů

- `POST /api/dictionaries/rooms/sync-from-home-assistant`
  - načte oblasti z Home Assistant a upsertne je do `rooms`

### Sport — číselníky (fáze 5)

- `GET /api/dictionaries/sport-teams`
  - vrací `{ items: SportTeam[] }` seřazeno podle `name`

- `POST /api/dictionaries/sport-teams`
  - payload: `{ name, thesportsdb_team_id, sport?, league_hint?, active? }`
  - při nastaveném `THESPORTSDB_API_KEY` ověří ID přes TheSportsDB `lookupteam`
  - odpověď jeden `SportTeam` (201); duplicitní externí ID → 409

- `PATCH /api/dictionaries/sport-teams/:id`
  - částečná úprava: `name`, `thesportsdb_team_id`, `sport`, `league_hint`, `active`
  - odpověď aktualizovaný `SportTeam`; 404 pokud neexistuje

- `GET /api/dictionaries/sport-players`
  - vrací `{ items: SportPlayer[] }` seřazeno podle `name`

- `POST /api/dictionaries/sport-players`
  - payload: `{ name, thesportsdb_player_id, sport?, active? }`
  - při nastaveném `THESPORTSDB_API_KEY` ověří ID přes `lookupplayer`
  - odpověď jeden `SportPlayer` (201)

- `PATCH /api/dictionaries/sport-players/:id`
  - částečná úprava polí jako u týmů (bez `league_hint`)

### Sport — nadcházející akce (fáze 6)

- `GET /api/sport/upcoming`
  - query: `from` (ISO, výchozí teď), `to` (ISO, volitelné), `teamId`, `playerId` (interní ID z číselníků)
  - vrací `{ items: SportUpcomingEvent[], synced_at: string|null }`
  - položka obsahuje `team_name` / `player_name` z joinů

- `POST /api/sport/sync`
  - stáhne události z TheSportsDB pro všechny **aktivní** týmy (`eventsnext`) a sportovce (přes `lookupplayer` → `idTeam` → `eventsnext`)
  - upsert do `sports_upcoming_events`, deduplikace `(source, external_event_id)`
  - vyžaduje `THESPORTSDB_API_KEY`
  - odpověď: `{ ok, synced_at, teams_processed, players_processed, events_upserted, errors[] }`

Periodický sync běží na backendu dle `app_settings.sport_sync_interval_ms` (z UI **Nastavení**, výchozí **180 s**), s fallbackem na env `SPORT_SYNC_INTERVAL_MS`.

- `PUT /api/settings/sport-sync-interval-ms`
  - payload: `{ value: number }` — interval v ms, rozsah **5000–600000** (5–600 s)
  - vrací `{ ok: true, value }`

### Nastavení

- `GET /api/settings`
  - vrací `{ settings: Record<string, unknown> }` (klíče z `app_settings`)

- `PUT /api/settings/dashboard-sync-interval-ms`
  - payload: `{ value: number }` — interval v ms, povolený rozsah **5000–600000**
  - vrací `{ ok: true, value }`

### Logy

- `GET /api/logs/activities`
  - poslední aktivity z Elasticsearch (index `mujdum-activities-*`)

- `GET /api/logs/errors`
  - podobně, filtrované na `level: error` nebo `event: error`
