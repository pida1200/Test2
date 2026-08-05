# Aplikační přehled — multi-agent vývoj

Účel této wiki oblasti: **co multi-agent (MA) proces dělá** z pohledu řešení požadavku — ne I/O šablony pro agenty (ty jsou v gitu).

## Účel

Jeden požadavek = jedno `[PIPELINE]` issue. Role (Analytik → Kontrolor → …) produkují **child issues** se stavem `gate/*`. Delší dokumentace žije ve **wiki seedu** (`docs/wiki/` = zdroj pravdy) a zrcadlí se do GitHub Wiki UI.

## Hlavní entity

| Entita | Význam |
|--------|--------|
| `[PIPELINE]` | požadavek + dashboard (auto-přehled mezi markery) |
| Child issues | `[ANALÝZA]`, `[VERDIKT-*]`, `[IMPLEMENTACE]`, `[TESTY]`, `[BUG]` |
| `gate/*` | `pending` → `go` / `no-go` / `blocked` |
| Wiki seed | `docs/wiki/{aplikacni,provozni,zmeny}/` |
| Slash `/m` | ruční orchestrace jedné fáze v Cursoru |

## Hranice systému

- **Dělá:** řízení vývoje přes Issues + KB ve Wiki; boty (next/sync/gate-check) asistují.
- **Nedělá:** nespouští Cursor agenty z CI; nenahrazuje unit testy / lint; není produktová dokumentace mujdum/ciselniky (jen odkazy).

## Kde je detail pro agenty

- Postup rolí a šablony: [`docs/multi-agent-workflow.md`](https://github.com/pida1200/Test2/blob/main/docs/multi-agent-workflow.md)
- Architektura / DoD: [`docs/multiagent-zadani.md`](https://github.com/pida1200/Test2/blob/main/docs/multiagent-zadani.md)
- Skill: `.cursor/skills/m/SKILL.md`
