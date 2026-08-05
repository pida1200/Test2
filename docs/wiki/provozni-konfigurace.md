# Konfigurace multi-agent

## Labely (povinné)

| Skupina | Hodnoty |
|---------|---------|
| Základ | `multiagent` |
| Artefakt | `multiagent/pipeline`, `…/analyza`, `…/implementace`, `…/testy`, `…/verdikt`, `…/bug` |
| Gate | `gate/pending`, `gate/go`, `gate/no-go`, `gate/blocked` |
| Merge (#81) | `merge/approved` (spouštěč `multiagent-merge.yml`), `merge/done`, `merge/failed` |
| Wiki mirror (#81) | `wiki/sync-failed` (viz sekce Degradace níže) |

Bug: `bug` + `multiagent` + `multiagent/bug` — **bez** `gate/*`.

## CI kontrakt v body issue

Samostatné řádky (anchored regex):

```text
Pipeline: #44
Verdikt: GO          # jen verdikt issues
Vstup: #45           # verdikt → produkční issue
```

Issue formuláře mají textarea „CI kontrakt“ s těmito řádky předvyplněnými.

## GitHub Actions

| Workflow | Účel |
|----------|------|
| `multiagent-next.yml` | komentář další role + CLI one-liner (`ma-run-role.sh`) + `/m #N` (`multiagent-next-lib.cjs`) |
| `multiagent-pipeline-sync.yml` | auto-přehled v `[PIPELINE]`; po A+V+T GO → hint `merge/approved` (ne „uzavři issue“) |
| `multiagent-gate-check.yml` | soft validace verdiktů; při pass **smaže** starý `<!-- multiagent-gate-check -->` komentář |
| `multiagent-merge.yml` | **(#81)** merge feature větve do `main` — spouštěč: label `merge/approved` na `[PIPELINE]` (`issues.labeled`) nebo `workflow_dispatch` (fail-closed, `dry_run` default `true`); guardy G0–G6 + G4b (`pipeline=` == issue) + SHA ≥7 + autorizace G7 v `docs/scripts/ma-merge-lib.cjs`; po úspěchu: push, wiki mirror, komentář, `merge/done`, close issue |
| `wiki-sync.yml` | mirror `docs/wiki/` → `.wiki.git` (push na `main` mimo `multiagent-merge.yml`, který si mirror volá sám ve stejném jobu — E11) |

### `multiagent-merge.yml` — vstupy a autorizace (§3.1, G7)

| Cesta | Kdy zapisuje do `main` |
|---|---|
| `issues.labeled` s `merge/approved` na `[PIPELINE]` | ano, projdou-li guardy G0–G6 |
| `workflow_dispatch`, `dry_run: true` (default) | **nikdy** — jen report (větev, SHA, výsledek guardů, commity) do job summary; žádný push ani změna labelů |
| `workflow_dispatch`, `dry_run: false` | ano, **jen** má-li `[PIPELINE]` aktuálně `merge/approved`, jehož poslední `labeled` event přidal uživatel s ≥ write; jinak deny (fail-closed) |

`workflow_dispatch` tedy **není** paralelní cesta k zápisu do `main` — ostrý běh vyžaduje stejný ověřený signál jako label (oprava vady VERDIKT-A NO-GO #94).

### Bootstrap merge labelu (§3.6, jen jednou — #81)

Workflow reagující na `issues` se čte z verze na `main`; dokud tam `multiagent-merge.yml`
a labely `merge/*` nejsou, nelze je použít. Pořadí je závazné:

| # | Krok | Kdo | Ověření |
|---|------|-----|---------|
| B0 | `#81` merguje **člověk** ručně (`git merge --no-ff` + push) | člověk | `git log origin/main -1` obsahuje merge commit #81 |
| B1 | `bash docs/scripts/create-multiagent-labels.sh` | člověk / Integrátor | příkaz doběhne bez chyby |
| B2 | `gh label list --search merge/` → 4 labely (`merge/approved`, `merge/done`, `merge/failed`, `wiki/sync-failed`) | člověk | výpis obsahuje všechny čtyři |
| B3 | Dry-run nad uzavřenou historickou pipeline: `workflow_dispatch`, `pipeline: 83`, `dry_run: true` | člověk | běh zelený, `git log origin/main -1` beze změny |
| B4 | Zápis výsledku B0–B3 do `[PIPELINE] #81` (komentář, odkaz na běh B3) | člověk / Integrátor | komentář existuje |
| B5 | Teprve nyní smí **další** pipeline použít `merge/approved` ostře | — | — |

Detail: `docs/wiki/zmeny-2026-08-05-pipeline-81-merge-git-ukol.md`.

## Cursor

- Skill `/m`: `.cursor/skills/m/SKILL.md` (`disable-model-invocation` — jen na slash)
- **Orchestrace (default):** `/m #N` projede fáze v jednom chatu do STOP
- **Jeden krok:** `/m #N once`
- Rule: `.cursor/rules/multi-agenti.mdc` (requestable)
- Modely: jedna tabulka v `docs/multi-agent-workflow.md` (sekce Modely)

## Orchestrace vs CI

| Vrstva | Co dělá |
|--------|---------|
| Cursor `/m #N` | spouští role — **CLI first** (`docs/scripts/ma-run-role.sh`), Task = fallback |
| `multiagent-next.yml` | jen komentář s `/m #N` a `/m #N once` |
| Actions | **nespouští** Cursor agenty (API = follow-up) |

## Degradace

Bez `gh` write scope: agent vypíše body/labely k ručnímu vložení — nefailuje napůl.

Chybí-li `cursor-agent` v PATH: `docs/scripts/ma-run-role.sh` skončí exitem `3` a vytiskne hotový prompt — vlož ho do Cursor Task beze změny (fallback, ne STOP). `--dry-run` funguje i bez binárky.

Dlouhý/visící běh CLI: `ma-run-role.sh` nemá vlastní timeout — přerušení (Ctrl-C / kill) je na volajícím, ne na skriptu.

**Actions nedostupné (E13, #81):** pravidlo „merge do `main` = člověk **nebo** jím schválený Git úkol“ platí dál — bez `multiagent-merge.yml` člověk provede dnešní ruční checklist z MERGE-PENDING komentáře (`git merge --no-ff` + `npm run check` + push) přímo v terminálu. `merge/approved` bez běhu workflow je jen neúčinný label, nic nepushne sám.

**Selhání wiki mirroru po merge (`wiki-sync: failed`, §3.7, D7):** merge do `main` **zůstává platný** — workflow přidá `wiki/sync-failed`, uloží `wiki-sync.log` jako artefakt běhu a založí (nebo přikomentuje existující) `[BUG] wiki mirror nesynchronizován (pipeline #N)`. Ruční náprava: `bash docs/scripts/sync-wiki-to-github.sh`; po úspěchu label `wiki/sync-failed` sundej a follow-up issue zavři.
