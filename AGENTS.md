# Průvodce pro AI agenty (cursor repo)

Tento soubor je **trvalá paměť projektu** — načti ho po restartu Cursoru, v novém chatu nebo když uživatel píše „navazuj“.  
**Kompletní kontext v hlavě agenta neexistuje**; pravda je v gitu, rules, Obsidianu a posledním commitu.

## Struktura repozitáře

| Cesta | Účel |
|-------|------|
| `mujdum/` | Produkt: React FE, Node BE, PostgreSQL, Docker |
| `mujdum/docs/` | Technická spec (API, HA mapování, sport, …) |
| `ciselniky/` | Projekt číselníků — **fáze 6+** (design + runtime UI, v0.0.44) |
| `ciselniky/docs/` | Zadání, architektura, API, implementation-plan |
| `examples/backend` | Učící ukázka — `npm run check` z kořene |
| `infra/` | Docker služby (Hydrawise MCP, home-mcp, …) |
| `.cursor/rules/` | Závazná pravidla pro agenta |
| `docs/` | Návody, learning-log, šablony promptů |
| Obsidian `projekty/mujdum/` | Session, proč, follow-up (MCP) |

## Pravidla (vždy respektovat)

- `repo-git.mdc` — bez PR, feature větve, malé commity
- `repo-kvalita.mdc` — testy, lint, DoD, learning-log / Obsidian
- `repo-navrat.mdc` — návrat k projektu (tento checklist)
- `multi-agenti.mdc` — role 3+3 (analytik/vývojář/tester + kontroloři), I/O = GitHub Issues, jen na žádost; detail `docs/multi-agent-workflow.md`
- `mujdum-docker.mdc` — **lokální** Docker po změně běhu; **vzdálený** `192.168.1.123` jen na explicitní žádost
- `mujdum.mdc` + `mujdum-obsidian-workflow.mdc` — při práci v `mujdum/**`
- `ciselniky.mdc` + `ciselniky-docker.mdc` — při práci v `ciselniky/**`
- `obsidian-prace-programovani.mdc` — trezor doplňuje git, ne nahrazuje

## Návrat k projektu (povinný checklist)

Proveď **před implementací**, pokud je nový chat, shrnutí konverzace, nebo uživatel žádá navázání:

1. **Git:** `git status`, `git branch -vv`, `git log -5 --oneline` — větev, WIP, poslední commity.
2. **Tento soubor** — orientace (už čteš).
3. **Learning log:** `docs/learning-log.md` — poslední 1–2 záznamy (rules, infra, incidenty).
4. **mujdum (pokud relevantní):**
   - Obsidian: `projekty/mujdum/hub.md` → nejnovější `session-YYYY-MM-DD.md`
   - Spec podle úkolu: např. `mujdum/docs/sport.md` (stav fází), `api.md`, `home-assistant-mapovani.md`
5. **číselníky (pokud relevantní):**
   - `ciselniky/AGENTS.md` → `ciselniky/docs/README.md`
   - Obsidian: `projekty/ciselniky/hub.md` → nejnovější `session-*.md`
   - Spec dle tabulky v `ciselniky/AGENTS.md` — ne celé `zadani.md`
6. **Uživatelův cíl** — jedna věta v odpovědi: co z výše ovlivnilo postup.

Šablona promptu pro uživatele: `docs/navrat-k-projektu.md`.

## Kde co zapisovat (aby to přežilo restart)

| Co | Kam |
|----|-----|
| Kód, API, migrace | git commit |
| Jak agent má pracovat | `.cursor/rules/` |
| Proč, session, follow-up [ ] | Obsidian `projekty/mujdum/session-*.md` nebo `projekty/ciselniky/session-*.md` |
| Změna rules / multi-agent / incident | `docs/learning-log.md` |
| Stav větší feature (fáze ✅/⬜) | `mujdum/docs/*.md` nebo `ciselniky/docs/README.md` + `implementation-plan.md` |

Šablona session (git): `docs/session-template.md` — stejná struktura jako v Obsidianu `projekty/mujdum/session-template.md`.

## mujdum — rychlé fakty

- **Stack:** frontend `:3000`, backend `:3001`, DB `:5434`, ES `:9200`
- **Ověření:** `cd mujdum/backend && npm test && npm run lint`; totéž `frontend/`
- **Docker lokálně:** `cd mujdum && docker compose up -d --build frontend backend`
- **Deploy vzdáleně:** jen na žádost — `mujdum/scripts/deploy-remote.sh` → typicky `zkorinek@192.168.1.123`
- **Sport:** číselníky týmů/hráčů → sync TheSportsDB → záložka Sport; `THESPORTSDB_API_KEY` v `mujdum/.env`; upcoming filtr od **začátku dne Europe/Prague**

## číselníky — rychlé fakty

- **Stack:** frontend `:3020`, backend `:3011`, DB `:5435`, ES `:9201`
- **Vstup pro agenta:** `ciselniky/AGENTS.md` (mapa souborů, co číst)
- **Ověření:** `cd ciselniky && npm test`; po změně běhu `npm run deploy && npm run check`
- **Design vs runtime:** editace dat jen v Design Studiu; Runtime UI = read-only náhled
- **Workflow:** major/minor stavy (`draft` → schváleno → nasazeno); `?version=major.minor` v runtime URL
- **Další fáze:** 7b enterprise promote, 8 migrace mujdum `rooms` → runtime klient

## Po dokončení úkolu

1. Testy + lint (relevantní část repa).
2. Lokální Docker u změn běhu v mujdum (`mujdum-docker.mdc`) nebo ciselniky (`ciselniky-docker.mdc`).
3. Zápis: Obsidian session (mujdum / ciselniky feature) a/nebo `docs/learning-log.md` (rules/infra).
4. Aktualizuj **stav fází** v příslušném doc, pokud se feature posunula.
5. V odpovědi: sebehodnocení (co, riziko, další krok) + odkaz na session / commit.

## Užitečné příkazy

```bash
git status && git log -3 --oneline
cd mujdum/backend && npm test && npm run lint
cd mujdum/frontend && npm test && npm run lint
cd mujdum && docker compose up -d --build frontend backend
curl -s http://127.0.0.1:3001/health
curl -s http://127.0.0.1:3001/api/sport/upcoming | head -c 400
cd ciselniky && npm test && npm run check
curl -s http://127.0.0.1:3011/health
```

## Cursor Memories (volitelné u uživatele)

Krátké trvalé věty v Cursor Settings → Memories, např.:

- Vzdálený deploy mujdum jen na explicitní žádost.
- Domácí server `192.168.1.123`, SSH `zkorinek`.
- Po větší session: Obsidian session + commit.

Memories **nenahrazují** tento soubor ani Obsidian.
