# Změna: MA default modely → Cursor Models (Grok + Composer)

- **Datum:** 2026-08-09
- **Pipeline / důvod:** billing — Other Models (Anthropic/OpenAI) kvóta vyčerpána → on-demand; Cursor Models still included
- **Dotčené:** `docs/multi-agent-workflow.md`, `docs/scripts/multiagent-next-lib.cjs` (`MODELS`), snippets, tests, `.cursor/rules/multi-agenti.mdc`

## Shrnutí

Default přiřazení rolí v multi-agent pipeline používá jen **Cursor Models**:

| Role | Model |
|------|-------|
| Analytik / Kontrolor V | `cursor-grok-4.5-high` |
| Kontrolor A / Kontrolor T | `cursor-grok-4.5-high-fast` |
| Vývojář / Tester / Integrátor | `composer-2.5-fast` |

Kontrolor ≠ produkce zachováno (Grok high vs high-fast; Composer vs Grok). Anthropic/OpenAI jen na explicitní žádost.

## Důsledky

- Next-bot komentáře a `/m` orchestrátor berou slugs z `MODELS` v `multiagent-next-lib.cjs`.
- CLI `ma-run-role.sh` i nadále vyžaduje explicitní `--model` (Cursor UI Auto zatím není wireované).
