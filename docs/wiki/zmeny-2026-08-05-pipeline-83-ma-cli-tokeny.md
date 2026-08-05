# Změna: MA CLI + token budget (#83)

- **Pipeline:** #83
- **Datum:** 2026-08-05
- **Větev:** `feature/pipeline-83-ma-cli-tokeny`

## Cíl

Zrychlit `/m` a snížit tokeny: role se spouští **CLI first** přes `docs/scripts/ma-run-role.sh` (Cursor Agent CLI), **Task = fallback** při chybějícím CLI. Integrátor v parent chatu zůstává **tenký** (routing + `gh` + STOP/MERGE-PENDING, ne duplicitní full check). Mini-plán (1–3 věty) píší **jen** Analytik a Vývojář.

## Dopad

### Aplikační

- Nový skript `docs/scripts/ma-run-role.sh` — validace vstupu, sestavení příkazu `cursor-agent -p --output-format text --model <slug> [--force] "<prompt>"`, exit kódy `0`/`2`/`3`/`4`. `--dry-run` a `--print-prompt` fungují bez instalované binárky.
- Offline testy `docs/scripts/test-ma-run-role.sh` zapojené do `npm run check:ma`.

### Provozní

- `.cursor/skills/m/SKILL.md`, `.cursor/rules/multi-agenti.mdc`, `.cursor/commands/m.md`: CLI first / Task fallback, tenký Integrátor, mini-plán jen Analytik + Vývojář.
- `docs/multi-agent-workflow.md`: nová sekce „Token budget rolí“ (co role čte, co nesmí) + popis spuštění role skriptem.
- `docs/prompt-snippets.md`: STOP list a šablony sladěné s `MERGE-PENDING` (#74); mini-plán doplněn do snippetů Analytika/Vývojáře.
- `docs/wiki/provozni-konfigurace.md`: „preferuj Task“ nahrazeno CLI first + fallback; nový řádek v sekci Degradace pro chybějící CLI.
- Beze změny: 7-issue model, gate labely, `MERGE-PENDING` handoff (#74), `multiagent-next-lib.cjs`.

## Odkazy

- [#83](https://github.com/pida1200/Test2/issues/83) · [#85](https://github.com/pida1200/Test2/issues/85) · [#86](https://github.com/pida1200/Test2/issues/86)
- Wiki: [Home](Home) · [provozni-konfigurace](provozni-konfigurace)
