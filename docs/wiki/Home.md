# Wiki — rozcestník

Zdroj pravdy v gitu (`docs/wiki/`). GitHub Wiki UI = publikační mirror.

## Oblasti

| Oblast | Stránka | Účel |
|--------|---------|------|
| **Aplikační** | [aplikacni-prehled](aplikacni-prehled) | co MA proces dělá (role, gate, `/m`) |
| **Provozní** | [provozni-prehled](provozni-prehled) | labely, Actions, skripty, Wiki sync |
| **Změny** | [zmeny-index](zmeny-index) | chronologie pipeline |

## Multi-agent (rychle)

- Stav: GitHub Issues (`[PIPELINE]` + child + `gate/*`)
- Merge: `[MERGE] … Ano / Ne?` → `merge/approved` / `merge/rejected`
- Orchestrace: Cursor `/m #N` (Task řetězí fáze; CI Cursor nespouští)
- Modely: default `auto` (Cursor Auto)
- KB: tato Wiki (seed)
- Spec v gitu: [multiagent-zadani.md](https://github.com/pida1200/Test2/blob/main/docs/multiagent-zadani.md) · [multi-agent-workflow.md](https://github.com/pida1200/Test2/blob/main/docs/multi-agent-workflow.md)

## Rychlé odkazy

- Aplikace: [moduly (role)](aplikacni-moduly) · [scénáře `/m`](aplikacni-uzivatelske-scenare)
- Provoz: [deploy / sync](provozni-deploy) · [konfigurace](provozni-konfigurace) · [monitoring](provozni-monitoring)
- Nejnovější změny: [merge Ano/Ne](zmeny-2026-08-09-ma-merge-ano-ne) · [Task-first](zmeny-2026-08-09-ma-orchestrace-task-first) · [Auto modely](zmeny-2026-08-09-ma-cursor-models-grok)
- Šablona změny: [zmeny-sablona](zmeny-sablona)
