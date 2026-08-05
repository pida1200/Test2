# Konfigurace multi-agent

## Labely (povinné)

| Skupina | Hodnoty |
|---------|---------|
| Základ | `multiagent` |
| Artefakt | `multiagent/pipeline`, `…/analyza`, `…/implementace`, `…/testy`, `…/verdikt`, `…/bug` |
| Gate | `gate/pending`, `gate/go`, `gate/no-go`, `gate/blocked` |

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
| `multiagent-next.yml` | komentář další role + `/m #N` (`multiagent-next-lib.cjs`) |
| `multiagent-pipeline-sync.yml` | auto-přehled v `[PIPELINE]` |
| `multiagent-gate-check.yml` | soft validace verdiktů (komentář, job nepadá) |
| `wiki-sync.yml` | mirror `docs/wiki/` → `.wiki.git` |

## Cursor

- Skill `/m`: `.cursor/skills/m/SKILL.md` (`disable-model-invocation` — jen na slash)
- **Orchestrace (default):** `/m #N` projede fáze v jednom chatu do STOP
- **Jeden krok:** `/m #N once`
- Rule: `.cursor/rules/multi-agenti.mdc` (requestable)
- Modely: jedna tabulka v `docs/multi-agent-workflow.md` (sekce Modely)

## Orchestrace vs CI

| Vrstva | Co dělá |
|--------|---------|
| Cursor `/m #N` | spouští role (preferuj Task) |
| `multiagent-next.yml` | jen komentář s `/m #N` a `/m #N once` |
| Actions | **nespouští** Cursor agenty (API = follow-up) |

## Degradace

Bez `gh` write scope: agent vypíše body/labely k ručnímu vložení — nefailuje napůl.
