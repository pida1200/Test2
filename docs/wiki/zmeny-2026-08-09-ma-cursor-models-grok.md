# Změna: MA default modely → Cursor Auto (+ pin Grok/Composer)

- **Datum:** 2026-08-09
- **Pipeline / důvod:** billing — Other Models kvóta → on-demand; prefer Auto / Cursor Models
- **Dotčené:** `docs/multi-agent-workflow.md`, `multiagent-next-lib.cjs` (`MODELS`/`MODELS_PINNED`), `ma-run-role.sh`, snippets, tests, rules

## Shrnutí

1. **Default = `auto`** u všech MA rolí (next-bot + `ma-run-role.sh`).
2. CLI při `auto` **nepředává** `--model` → Cursor CLI Auto routing.
3. **Pin** (volitelně) v `MODELS_PINNED`: Grok high / high-fast + Composer — když chceš kontrolor ≠ produkce.

## Důsledky

- Trade-off: Auto negarantuje oddělené oči kontrolora.
- Task fallback: `inherit` při `MODEL: auto`.
- Anthropic/OpenAI jen na explicitní žádost.
