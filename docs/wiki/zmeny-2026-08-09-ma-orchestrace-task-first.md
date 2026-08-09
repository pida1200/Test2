# Změna: obnovení orchestrace Task-first (řetězení fází)

- **Datum:** 2026-08-09
- **Důvod:** po #83 (CLI first) agent často skončil u exit 3 / CLI one-lineru a **nepokračoval** další rolí — dřív (#52) Task/subagent řetězil fáze v jednom chatu
- **Dotčené:** `.cursor/skills/m/SKILL.md`, `.cursor/commands/m.md`, `multi-agenti.mdc`, `multiagent-next-lib.cjs` (pořadí v komentáři), docs/wiki

## Shrnutí

1. Default `/m #N` znovu = **Task/subagent ihned** pro každou roli, mezi fázemi se neptat.
2. CLI jen když `cursor-agent` existuje; exit 3 → ihned Task (ne STOP).
3. Next-bot komentář: `/m #N` orchestrace **první**, CLI one-liner sekundárně.

CI stále Cursor nespouští — automatické řetězení = otevřený Cursor chat s `/m #N` (bez `once`).
