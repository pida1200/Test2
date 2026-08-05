# Změna: Orchestrace `/m #N` (#52)

- **Pipeline:** #52
- **Datum:** 2026-08-05
- **Větev:** `feature/pipeline-52-ma-auto`

## Cíl

Default `/m #N` = orchestrace fází v jednom chatu; `/m #N once` = jeden krok. CI stále nespouští Cursor.

## Dopad

### Aplikační

- Scénáře `/m`: orchestrace vs `once` ([uzivatelske-scenare](../aplikacni/uzivatelske-scenare)).

### Provozní

- Skill/rule/command/docs + next-bot dual prompt; konfigurace: Orchestrace vs CI.

## Odkazy

- [#52](https://github.com/pida1200/Test2/issues/52) · [#53](https://github.com/pida1200/Test2/issues/53) · [#54](https://github.com/pida1200/Test2/issues/54)
