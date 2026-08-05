# Průvodce pro AI agenty (multi-agent template)

Tento soubor je **trvalá paměť projektu** — načti ho po restartu Cursoru, v novém chatu nebo když uživatel píše „navazuj“.  
**Kompletní kontext v hlavě agenta neexistuje**; pravda je v gitu, rules, Obsidianu (volitelně) a posledním commitu.

Tento repozitář je **šablona multi-agentního vývoje** (GitHub Issues + `/m` + Wiki KB). Neobsahuje produktovou aplikaci.

## Struktura repozitáře

| Cesta | Účel |
|-------|------|
| `examples/backend` | Učící ukázka třívrstvé architektury — `npm run check` z kořene |
| `.cursor/rules/` | Závazná pravidla pro agenta |
| `.cursor/skills/m/` · `.cursor/commands/m.md` | Slash `/m` — orchestrace MA pipeline |
| `docs/` | Návody, learning-log, šablony promptů, MA workflow |
| `docs/multiagent-zadani.md` | Zadání MA — hybrid (1× PIPELINE + child artefakty) |
| `docs/wiki/` | Seed GitHub Wiki — ploché unikátní stránky (`aplikacni-*`, `provozni-*`, `zmeny-*`) |
| `.github/ISSUE_TEMPLATE/` · workflows | Šablony issues + MA boty (next, sync, gate-check, wiki-sync) |

## Pravidla (vždy respektovat)

- `repo-git.mdc` — bez PR, feature větve, malé commity
- `repo-kvalita.mdc` — testy, lint, DoD, learning-log / Obsidian
- `repo-navrat.mdc` — návrat k projektu (tento checklist)
- `multi-agenti.mdc` — role 3+3, I/O = Issues; skill `.cursor/skills/m/SKILL.md` (gramatika); scoped → `/m 2`, plná 3+3 jen při nejasném DoD/API
- Role cards: `docs/ma-role-cards/` (tenké prompty); detail `docs/multi-agent-workflow.md`
- `obsidian-prace-programovani.mdc` — trezor doplňuje git (volitelné)
- `examples-architektura.mdc` — konvence pro `examples/`

## Návrat k projektu (povinný checklist)

Proveď **před implementací**, pokud je nový chat, shrnutí konverzace, nebo uživatel žádá navázání:

1. **Git:** `git status`, `git branch -vv`, `git log -5 --oneline`
2. **Tento soubor** — orientace
3. **Learning log:** `docs/learning-log.md` — poslední 1–2 záznamy
4. **MA / Wiki (pokud relevantní):** otevřené `[PIPELINE]`; wiki seed `docs/wiki/`
5. **Obsidian (pokud používáš):** `projekty/<projekt>/hub.md` + nejnovější `session-*.md`
6. **Uživatelův cíl** — jedna věta v odpovědi: co z výše ovlivnilo postup

Šablona promptu: `docs/navrat-k-projektu.md`.

## Kde co zapisovat

| Co | Kam |
|----|-----|
| Kód, API, migrace | git commit |
| Jak agent má pracovat | `.cursor/rules/` |
| Proč, session, follow-up | Obsidian `projekty/<projekt>/session-*.md` (volitelné) |
| Změna rules / multi-agent / incident | `docs/learning-log.md` |
| Delší MA KB / changelog pipeline | `docs/wiki/` (+ sync: `bash docs/scripts/sync-wiki-to-github.sh`) |

## Po dokončení úkolu

1. Testy + lint (`npm run check` nebo relevantní subset).
2. Zápis: learning-log a/nebo Obsidian session dle DoD.
3. U MA: aktualizuj wiki `zmeny-*` + index, pokud se chování změnilo.
4. V odpovědi: sebehodnocení + odkaz na commit / issue.

## Užitečné příkazy

```bash
git status && git log -3 --oneline
npm run check
bash docs/scripts/ma-pipeline-view.sh #<PIPELINE>
bash docs/scripts/sync-wiki-to-github.sh
```

## Cursor Memories (volitelné)

Krátké trvalé věty v Cursor Settings → Memories. Memories **nenahrazují** tento soubor ani Obsidian.
