# Změna: Merge do main jen člověk (#74)

- **Pipeline:** #74
- **Datum:** 2026-08-05
- **Větev:** `feature/pipeline-74-merge-clovek`

## Cíl

Integrátor po A+V+T GO nesloučí do `main` — handoff `MERGE-PENDING`; sloučení rozhoduje a provádí člověk (bez zavedení PR).

## Dopad

### Aplikační

- Konec pipeline: commit + push feature větve + checklist pro člověka; `[PIPELINE]` zůstává OPEN s `gate/go`.

### Provozní

- Skill/rule/workflow/snippets/next-bot hinty; `repo-git.mdc` doplněno „merge do main = člověk“.
- Wiki UI sync až po pushi na `main` (zpoždění zrcadla je očekávané).

## Odkazy

- [#74](https://github.com/pida1200/Test2/issues/74) · [#75](https://github.com/pida1200/Test2/issues/75) · [#76](https://github.com/pida1200/Test2/issues/76)
- Wiki: [Home](Home) · [aplikacni-moduly](aplikacni-moduly)
