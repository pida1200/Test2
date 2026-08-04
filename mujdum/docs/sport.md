# Zadání: Sport (mujdum + home-mcp)

**Stav:** produkt **fáze 4–7 hotovo**; **fáze 8 hotovo** (MCP sport); **fáze 9** volitelné rozšíření  
**Poslední revize:** 2026-05-17  
**API (implementováno):** [`api.md`](api.md) — sekce Sport a Nastavení  
**Související:** [`zadani.md`](zadani.md), [`README.md`](README.md), provoz MCP [`../../infra/home-mcp/README.md`](../../infra/home-mcp/README.md), vzor deploy [`../../infra/hunter-hydrowise-mcp/README.md`](../../infra/hunter-hydrowise-mcp/README.md)

## Stav fází (rychlý přehled)

| Fáze                                              | Stav                           |
| ------------------------------------------------- | ------------------------------ |
| 0 Zadání                                          | hotovo                         |
| 1–2 `home-mcp` (4 tools)                          | **hotovo** — `infra/home-mcp/` |
| 3 Deploy MCP na 123                               | **hotovo**                     |
| 4 TheSportsDB klient + `npm run sports:sync-test` | **hotovo**                     |
| 5 Číselníky týmů + sportovci (DB, API, FE)        | **hotovo**                     |
| 6 Sync + `GET/POST /api/sport/*`                  | **hotovo**                     |
| 7 Záložka **Sport** ve FE                         | **hotovo**                     |
| 8 MCP sport (`mujdum_sport_*`)                    | **hotovo** — `infra/home-mcp/` |
| 9 Rozšíření (filtry UI, snapshot, …)              | volitelně                      |

## Kontext pro agenta (po restartu / nový chat)

1. Kořen repa: [`AGENTS.md`](../../AGENTS.md), [`docs/navrat-k-projektu.md`](../../docs/navrat-k-projektu.md).
2. Git: větev, `git log -5` — sport modul je na feature větvích (např. `cursor/optional-issues-f4e46`).
3. Obsidian: `projekty/mujdum/hub.md` → nejnovější `session-*.md`.
4. API a chování: [`api.md`](api.md) — sekce Sport; kód `mujdum/backend/src/sports/`, FE `Sport*`, `DictionariesPage`.
5. **Provoz:** `THESPORTSDB_API_KEY` v `mujdum/.env`; sync `POST /api/sport/sync`; seznam `GET /api/sport/upcoming` — výchozí `from` = **začátek dne Europe/Prague** (dnešní zápasy i po výkopu).
6. **Deploy:** lokální Docker standardně; vzdálený `192.168.1.123` jen na explicitní žádost (`mujdum-docker.mdc`).

**Poslední známé commity (sport):** modul + číselníky (`b754fca`); fix upcoming filtru (`386d10b`).

## Obsah

1. [Proč to děláme](#1-proč-to-děláme) — motivace, záložka Sport, číselníky  
2. [Cíl produktu](#2-cíl-produktu-mujdum) — UI, týmy/sportovci, backend, sync  
3. [Cíl infrastruktury `home-mcp`](#3-cíl-infrastruktury--home-mcp)  
4. [Zdroje dat](#4-kontext--zdroje-dat) — Livesport vs TheSportsDB  
5. [Architektura `home-mcp`](#5-architektura--home-mcp)  
6. [Bezpečnost](#6-bezpečnost)  
7. [MCP tools](#7-mcp-nástroje-tools)  
8. [API mujdum (návrh)](#8-api-mujdum-návrh--doplnit-do-apimd-při-implementaci)  
9. [Implementační fáze](#9-implementační-fáze-postupujeme-v-tomto-pořadí)  
10.–15. Konfigurace, MCP ekosystém, rozhodnutí, test plan, odkazy  

**Provoz MCP (příkazy, Cursor, deploy):** nejdřív [`infra/home-mcp/README.md`](../../infra/home-mcp/README.md).

---

## 1. Proč to děláme

**mujdum** je domácí přehled (teploty, energie, zahrada, …) na jednom místě. Sportovní program rodiny je dnes rozptýlený v mobilní aplikaci (Livesport / Flashscore) nebo na webech — **není součástí mujdum** a nejde do něj legálně „napojit Livesport“.

Chceme:

- mít **vlastní záložku Sport** v mujdum s **jedním seznamem nadcházejících akcí** (zápasy, utkání) pro **vybrané týmy a sportovce**, které si sami nadefinujeme;
- spravovat výběr přes **číselníky** (stejný princip jako místnosti u dashboardu) — týmy a sportovci slouží jako vstup pro vyhledání akcí u externího zdroje;
- data brát z **dokumentovaného API** (TheSportsDB), cache na backendu a zobrazovat v responzivním UI (mobil + desktop);
- **`home-mcp`** na vzdáleném Dockeru jako pomocná brána pro vývoj a provoz (Cursor, diagnostika, testování API) — **není to hlavní produkt pro koncového uživatele**.

**Pro uživatele:** „Otevřu mujdum → Sport → vidím, co nás čeká tento týden.“  
**Není cílem:** kopie Livesport (live minuta po minutě, kurzy, všechny ligy světa).

---

## 2. Cíl produktu (mujdum)

### 2.1 Nová záložka **Sport**

- V horní navigaci aplikace (vedle Dashboard, Číselníky, Log, Nastavení) položka **Sport**.
- Hlavní obsah stránky: **seznam nadcházejících akcí** seřazený časem (nejbližší nahoře).
- Každá položka typicky: datum/čas, sport, soutěž, domácí — hosté (nebo popis utkání u individuálních sportů), případně logo týmu z API.
- Tlačítko **Obnovit** (stejný vzor jako u ostatních záložek) — dotáhne cache z backendu / vynutí sync.

**Mimo první verzi záložky:** live skóre, push notifikace, sázkové kurzy, komentáře.

### 2.2 Číselníky — týmy a sportovci

Rozšíření záložky **Číselníky** (nebo podsekce v ní) o dva nové seznamy:

| Číselník      | Účel                                               | Pole (návrh)                                                              |
| ------------- | -------------------------------------------------- | ------------------------------------------------------------------------- |
| **Týmy**      | Kluby / reprezentace pro rozpis zápasů             | `name`, `thesportsdb_team_id`, volitelně `sport`, `league_hint`, `active` |
| **Sportovci** | Hráči / jednotlivci (tenis, F1, … dle pokrytí API) | `name`, `thesportsdb_player_id`, volitelně `sport`, `active`              |

- **Ruční přidání / úprava / deaktivace** (jako u místností).
- Při uložení backend ověří, že ID u TheSportsDB existuje (lookup), nebo uloží s varováním v UI — rozhodnutí ve fázi implementace.
- Pouze **aktivní** záznamy se berou do syncu nadcházejících akcí.

Tyto číselníky jsou **jediný konfigurační vstup** pro to, „koho sledujeme“ — ne hardcoded seznam v `.env`.

### 2.3 Backend — business logika

- Integrace **TheSportsDB** pouze na **backendu** (klíč v `mujdum/.env`, nikdy ve frontendu).
- Periodický **sync** v `backend/src/index.ts` (`sportSyncLoop`): interval z **`app_settings.sport_sync_interval_ms`** (UI **Nastavení → Sport**, výchozí **180 s / 3 min**), fallback `SPORT_SYNC_INTERVAL_MS` v `.env`, rozsah 5–600 s.
- Pro každý **aktivní tým** → `eventsnext`; pro každého **aktivního sportovce** → `lookupplayer` → `idTeam` → `eventsnext`.
- Tabulka **`sports_upcoming_events`** (migrace `007`), deduplikace `(source, external_event_id)`, vazby `sport_team_id` / `sport_player_id`.
- Ruční sync: **`POST /api/sport/sync`**. Záložka **Sport** čte **`GET /api/sport/upcoming`** (Obnovit = sync + načtení).

### 2.4 Vizuální návrh (hrubě)

- Responzivní seznam / karty (mobil: jeden sloupec).
- Konzistence s existujícím UI (MUI, stejné hlavičky jako Dashboard).
- Volitelně filtr podle sportu nebo „jen dnes“ — **až po MVP**.

---

## 3. Cíl infrastruktury — `home-mcp`

**Domácí MCP server** ve vzdáleném Dockeru na **`192.168.1.123`**, aby Cursor (Mac v LAN) mohl bezpečně číst mujdum API a testovat sportovní data během vývoje.

- Podporuje implementaci modulu Sport (ladění syncu, kontrola číselníků).
- Koncový uživatel aplikace **nepotřebuje** Cursor ani MCP.

---

## 4. Kontext — zdroje dat

### 4.1 Livesport / Flashscore

- Uzavřený produkt pro fanoušky, **bez veřejného developer API**.
- Pro „stejná data jako v appce“ jen obchodní licence u poskytovatelů (Opta, Sportradar, …) nebo neoficiální scraping (nedoporučeno).

### 4.2 TheSportsDB (primární sportovní zdroj pro tento projekt)

- Dokumentace: [thesportsdb.com/documentation](https://www.thesportsdb.com/documentation)
- **Free:** API v1, klíč `123` v URL, **30 req/min**, silná omezení (demo vyhledávání, málo `eventsday`, **bez live skóre**).
- **Premium (~9 USD/měs.):** vlastní klíč, vyšší limity, **live skóre cca každé 2 min** (soccer, NFL, NBA, MLB, NHL), odkazy na highlighty, **API v2** (budoucí vývoj jen v2).

| Potřeba                          | TheSportsDB                                 |
| -------------------------------- | ------------------------------------------- |
| Rozpis / výsledky / loga týmů    | Ano (v1/v2 dle tieru)                       |
| Live jako Livesport              | Ne — zpoždění ~2 min (premium)              |
| České nižší ligy                 | Komunitní DB — ověřit pokrytí před závazkem |
| Legální integrace do vlastní app | Ano (dodržet Terms of Use + limity)         |

**Rozhodnutí pro fázi 4:** premium klíč až po odsouhlasení; do té doby MCP modul sport vypnutý nebo jen s pevnými ID z dokumentace (free tier test).

---

## 5. Architektura — `home-mcp`

### 5.1 Umístění v repu

```text
infra/home-mcp/               # viz README v této složce
  Dockerfile
  docker-compose.yml
  deploy-remote.sh
  .env.example
  src/
    index.ts                  # HTTP + Bearer + POST /mcp
    config.ts
    auth.ts
    server.ts                 # registrace MCP tools
    clients/
      mujdumClient.ts         # hotovo (fáze 1–2)
      sportsDbClient.ts       # fáze 4
  test/
```

**Odděleně od** `mujdum/docker-compose.yml` — jiný životní cyklus, port a deploy.

### 5.2 Diagram (celkový)

```mermaid
flowchart TB
  subgraph ui [mujdum frontend]
    TabSport[Záložka Sport]
    TabDict[Číselníky týmy / sportovci]
  end
  subgraph be [mujdum backend]
    API[/api/sport /api/dictionaries/...]
    Sync[TheSportsDB sync]
    DB[(Postgres)]
  end
  subgraph ext [externí]
    TSDB[TheSportsDB API]
  end
  subgraph dev [vývoj]
    MCP[home-mcp :8766]
    Cursor[Cursor]
  end
  TabSport --> API
  TabDict --> API
  API --> DB
  Sync --> TSDB
  Sync --> DB
  Cursor --> MCP
  MCP --> API
```

### 5.3 Síť a porty na hostu 123

| Služba          | Port     |
| --------------- | -------- |
| mujdum frontend | 3000     |
| mujdum backend  | 3001     |
| hydrowise-mcp   | 8765     |
| **home-mcp**    | **8766** |

- **`network_mode: host`** (stejně jako Hydrawise MCP) — bind na LAN IP kvůli kontrole `Host` / jednoduchému volání `http://127.0.0.1:3001`.
- **`restart: unless-stopped`**
- Logy: `json-file`, `max-size: 10m`, `max-file: 3`

### 5.4 Transport a klient

- **Streamable HTTP:** `POST http://192.168.1.123:8766/mcp`
- **Autentizace:** hlavička `Authorization: Bearer <HOME_MCP_AUTH_TOKEN>`
- Token: `openssl rand -hex 32`, pouze v `.env` na serveru a v lokálním `~/.cursor/mcp.json` (**mimo git**)

Příklad Cursor (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "home": {
      "url": "http://192.168.1.123:8766/mcp",
      "headers": {
        "Authorization": "Bearer <HOME_MCP_AUTH_TOKEN>"
      }
    }
  }
}
```

Ověření po deploy: `curl -i http://192.168.1.123:8766/mcp` → očekávaně **405** (endpoint je POST-only), stejně jako u Hydrawise na 8765.

### 5.5 Technologie

| Vrstva     | Volba                                                |
| ---------- | ---------------------------------------------------- |
| Runtime    | Node 22                                              |
| SDK        | `@modelcontextprotocol/sdk`                          |
| HTTP       | Express nebo `node:http` + Streamable HTTP transport |
| Testy      | vitest (mock `fetch` u klientů)                      |
| Rate limit | např. 60 req/min na IP (express-rate-limit)          |

---

## 6. Bezpečnost

| Opatření          | Požadavek                                                           |
| ----------------- | ------------------------------------------------------------------- |
| Dosah             | Pouze LAN; firewall na Pi — port 8766 ne do internetu               |
| Bind              | `HOME_MCP_HOST=192.168.1.123` (ne otevřený `0.0.0.0` bez firewallu) |
| Auth              | Bearer na každý request; bez tokenu 401                             |
| Secrets           | `.env` gitignored; v repu jen `.env.example`                        |
| Zápis do mujdum   | Výchozí **zakázán** (`HOME_MCP_ALLOW_WRITES=0`)                     |
| Data v odpovědích | Žádné tokeny z `.env`, HA, TheSportsDB v logu/odpovědi              |
| Postgres / shell  | **Nepřístupné** z MCP                                               |

---

## 7. MCP nástroje (tools)

### 7.1 Modul mujdum (read-only)

| Tool                        | Stav             | HTTP                                                                          |
| --------------------------- | ---------------- | ----------------------------------------------------------------------------- |
| `mujdum_health`             | fáze 1           | `GET /health`                                                                 |
| `mujdum_dashboard_metrics`  | fáze 1           | `GET /api/dashboard`                                                          |
| `mujdum_metric_history`     | fáze 2           | `GET /api/dashboard/metrics/:key/history` — `key`; `minutes` nebo `from`+`to` |
| `mujdum_rooms_list`         | fáze 2           | `GET /api/dictionaries/rooms`                                                 |
| `mujdum_sport_teams_list`   | **hotovo** (fáze 8) | `GET /api/dictionaries/sport-teams` (API z fáze 5)                            |
| `mujdum_sport_players_list` | **hotovo** (fáze 8) | `GET /api/dictionaries/sport-players` (API z fáze 5)                          |
| `mujdum_sport_upcoming`     | **hotovo** (fáze 8) | `GET /api/sport/upcoming` (API z fáze 6)                                      |
| `mujdum_dashboard_snapshot` | volitelně fáze 9 | `POST /api/dashboard/snapshot` — jen `HOME_MCP_ALLOW_WRITES=1`                |

Env: `MUJDUM_API_URL=http://127.0.0.1:3001` (na Pi backend z host network).

### 7.2 Modul sport / TheSportsDB (fáze 4+, volitelné)

| Tool                        | Popis                                            |
| --------------------------- | ------------------------------------------------ |
| `sports_events_day`         | zápasy v den (`d`, volitelně `idLeague` / sport) |
| `sports_team_schedule_next` | nadcházející zápasy týmu (`idTeam`)              |
| `sports_team_schedule_last` | poslední zápasy týmu                             |
| `sports_league_table`       | tabulka ligy (`idLeague`, sezóna)                |
| `sports_livescore_soccer`   | live skóre — **vyžaduje premium + v2**           |

Env: `THESPORTSDB_API_KEY`, `THESPORTSDB_API_VERSION=v1|v2` (v2 jen s premium).

Pro **fázi 4** (ladění před číselníky v DB) lze dočasně použít pevná ID v `.env` MCP; v produktu platí **číselníky týmů/sportovců** (§2.2), ne seznam v env.

### 7.3 Modul infra (volitelné)

- `docker_compose_ps` — jen whitelist kontejnerů (`mujdum-*`, `home-mcp`, `hydrowise-mcp`), read-only.
- Mimo scope, pokud není explicitně schváleno.

---

## 8. API mujdum (návrh — doplnit do `api.md` při implementaci)

### Číselníky

| Metoda  | Cesta                                 | Popis               |
| ------- | ------------------------------------- | ------------------- |
| `GET`   | `/api/dictionaries/sport-teams`       | seznam týmů         |
| `POST`  | `/api/dictionaries/sport-teams`       | přidat tým          |
| `PATCH` | `/api/dictionaries/sport-teams/:id`   | úprava / deaktivace |
| `GET`   | `/api/dictionaries/sport-players`     | seznam sportovců    |
| `POST`  | `/api/dictionaries/sport-players`     | přidat sportovce    |
| `PATCH` | `/api/dictionaries/sport-players/:id` | úprava / deaktivace |

### Sport — nadcházející akce

| Metoda | Cesta                 | Popis                                                                      |
| ------ | --------------------- | -------------------------------------------------------------------------- |
| `GET`  | `/api/sport/upcoming` | sloučený seznam akcí (query: `from`, `to`, volitelně `teamId`, `playerId`) |
| `POST` | `/api/sport/sync`     | ruční spuštění sync z TheSportsDB (tlačítko Obnovit)                       |

### Nastavení (interval jobu)

| Metoda | Cesta                                  | Popis                                                                       |
| ------ | -------------------------------------- | --------------------------------------------------------------------------- |
| `PUT`  | `/api/settings/sport-sync-interval-ms` | interval periodického sport sync (ms, 5–600 s); ukládá se do `app_settings` |

UI: záložka **Nastavení** → sekce **Sport (TheSportsDB)** (vedle intervalu HA dashboardu).

### Env backendu (`mujdum/.env`)

```bash
THESPORTSDB_API_KEY=
THESPORTSDB_API_VERSION=v1
SPORT_SYNC_INTERVAL_MS=180000
# Interval jobu lze měnit v UI Nastavení → app_settings.sport_sync_interval_ms (výchozí 3 min)
```

---

## 9. Implementační fáze (postupujeme v tomto pořadí)

| Fáze  | Obsah                                                                                      | Výstup / akceptace                                                                         |
| ----- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| **0** | Schválení zadání (proč §1, produkt §2)                                                     | Tento dokument                                                                             |
| **1** | `infra/home-mcp`: skeleton, Bearer, `mujdum_health`, `mujdum_dashboard_metrics`            | **hotovo**                                                                                 |
| **2** | MCP: `mujdum_metric_history`, `mujdum_rooms_list`; vitest                                  | **hotovo**                                                                                 |
| **3** | MCP deploy na 123 (`./deploy-remote.sh`)                                                   | **hotovo** — kontejner `home-mcp`, LAN `:8766`                                             |
| **4** | Backend: klient TheSportsDB (premium doporučeno); ruční test sync pro 1 tým                | **hotovo** — `theSportsDbClient.ts`, `npm run sports:sync-test -- <idTeam>`                |
| **5** | DB migrace + API číselníky **týmy** a **sportovci**; FE v Číselnících                      | **hotovo** — migrace `006`, `sportDictionaries.ts`, FE sekce v Číselnících                 |
| **6** | Backend sync → `sports_upcoming_events`, `GET /api/sport/upcoming`, `POST /api/sport/sync` | **hotovo** — `sportsSync.ts`, migrace `007`, `sportSyncLoop`, interval v Nastavení (3 min) |
| **7** | FE záložka **Sport** — seznam nadcházejících akcí, Obnovit, mobil                          | **hotovo** — `SportUpcomingList`, navigace Sport                                           |
| **8** | MCP tools pro sport číselníky a `upcoming`; doplnit `api.md`                               | **hotovo** — `mujdum_sport_teams_list`, `mujdum_sport_players_list`, `mujdum_sport_upcoming` v `infra/home-mcp` |
| **9** | (Volitelně) rozšíření MCP / filtry UI                                                      | Dle potřeby                                                                                |

**Pořadí:** MCP (1–3) → ověření TheSportsDB (4) → číselníky (5) → sync + API (6) → **záložka Sport** (7).

Po každé fázi: commit na feature větvi, testy dle `repo-kvalita.mdc`.

---

## 10. Konfigurace (`.env.example` pro `infra/home-mcp`)

```bash
# Síť
HOME_MCP_HOST=192.168.1.123
HOME_MCP_PORT=8766
HOME_MCP_AUTH_TOKEN=

# mujdum backend (host network na Pi)
MUJDUM_API_URL=http://127.0.0.1:3001
HOME_MCP_ALLOW_WRITES=0

# TheSportsDB (fáze 4)
THESPORTSDB_API_KEY=
THESPORTSDB_API_VERSION=v1

# Produkt používá číselníky v DB; níže jen pro ruční test MCP bez mujdum API:
# SPORTS_FAVORITE_TEAM_IDS=133602
```

---

## 11. Vztah k ostatním MCP (neslučovat)

| MCP            | Kde běží | Role                   |
| -------------- | -------- | ---------------------- |
| Home Assistant | HA host  | entity, termostaty     |
| Hydrawise      | 123:8765 | závlaha                |
| Obsidian       | vault    | session, poznámky      |
| **home-mcp**   | 123:8766 | **mujdum API + sport** |

---

## 12. Rozhodnutí (výchozí — lze změnit před fází 0)

| Otázka                | Výchozí                                               |
| --------------------- | ----------------------------------------------------- |
| Název služby MCP      | `home-mcp`                                            |
| Port MCP              | 8766                                                  |
| UI                    | samostatná záložka **Sport** (ne panel na Dashboardu) |
| Číselníky             | **Týmy** + **Sportovci** s ID TheSportsDB             |
| TheSportsDB           | premium doporučeno od fáze 4                          |
| Zápis z MCP do mujdum | vypnuto (kromě budoucího admin sync trigger)          |

---

## 13. Dokumentace a Obsidian

| Událost                            | Kam                                                          |
| ---------------------------------- | ------------------------------------------------------------ |
| Provoz MCP (lokál, Cursor, deploy) | [`infra/home-mcp/README.md`](../../infra/home-mcp/README.md) |
| Zadání, fáze, API návrh produktu   | tento soubor                                                 |
| Session / proč / follow-up         | Obsidian `projekty/mujdum/session-YYYY-MM-DD.md`             |
| Změna `.cursor/rules`              | `docs/learning-log.md`                                       |

Po dokončení fáze 3 append do Obsidian session: URL MCP, port, že home-mcp běží vedle mujdum.

---

## 14. Test plan (shrnutí)

**MCP (fáze 1–3, 8):**

- `cd infra/home-mcp && npm test && docker compose up -d --build`
- `./deploy-remote.sh` → z Cursoru: `mujdum_health`, `mujdum_sport_teams_list`, `mujdum_sport_upcoming`
- Request bez Bearer → 401

**Produkt Sport (fáze 5–7):**

- `cd mujdum/backend && npm run db:migrate` (migrace `006`, `007`).
- `THESPORTSDB_API_KEY` v `mujdum/.env`; test klienta: `npm run sports:sync-test -- 134007`.
- Přidat tým „Sparta“ (`thesportsdb_team_id` **134007**) v Číselnících → `POST /api/sport/sync` → `GET /api/sport/upcoming` vrátí utkání (záložka Sport ve fázi 7).
- Interval jobu: Nastavení → Sport, výchozí 180 s.
- Přidat sportovce s platným ID → v seznamu akcí přibydou relevantní položky (nebo prázdný stav s vysvětlením v UI).
- `cd mujdum/backend && npm test && npm run lint`; `cd mujdum/frontend && npm test && npm run lint`.
- Mobilní šířka: seznam čitelný bez horizontálního scrollu.

---

## 15. Odkazy

- TheSportsDB dokumentace: <https://www.thesportsdb.com/documentation>
- TheSportsDB pricing: <https://www.thesportsdb.com/pricing>
- OpenAPI v2: <https://thesportsdb.com/api/spec/v2/openapi.yaml>
- **home-mcp README:** [`infra/home-mcp/README.md`](../../infra/home-mcp/README.md)  
- Hydrawise MCP vzor: `infra/hunter-hydrowise-mcp/`  
- mujdum API: `docs/api.md`, snapshot v `zadani.md`
