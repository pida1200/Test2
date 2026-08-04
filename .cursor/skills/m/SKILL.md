---
name: m
description: "Multi-agent pipeline — spusť /m 2 nebo /m #2 (číslo GitHub issue)"
disable-model-invocation: true
---

# Multiagent `/m`

Uživatel spustil `/m` s číslem GitHub issue (např. `/m 2` nebo `/m #2`).

## Úkol

1. Z argumentu vezmi číslo issue `N` (odstraní `#` pokud je).
2. Pokud číslo chybí, zeptej se: „Které issue? Použij `/m 2`.“
3. Proveď přesně stejný postup jako u promptu `Multiagent #N` dle `docs/multi-agent-workflow.md` a `.cursor/rules/multi-agenti.mdc`:
   - načti GitHub issue `#N` (body + labely `ma/*`)
   - podle aktuálního `ma/*` zvol roli a model
   - proveď **jen aktuální fázi**
   - zapiš výstup do body/komentáře issue
   - u review: komentář `Verdikt: GO` nebo `Verdikt: NO-GO` + vady
   - posuň label `ma/*` na další fázi (NO-GO = zpět na produkční)
   - kontrolor **neimplementuje**
   - na `ma/done`: testy/lint, commit, learning-log, zavři issue
4. V odpovědi: krátké shrnutí + odkaz na issue + jaká fáze je teď.

## Fáze → model

| Label | Role | Model |
|-------|------|--------|
| `ma/analyza` | Analytik | `claude-opus-4-8-thinking-high` |
| `ma/review-a` | Kontrolor A | `claude-opus-4-8-thinking-high` |
| `ma/vyvoj` | Vývojář | `composer-2.5` |
| `ma/review-v` | Kontrolor V | `gpt-5.6-sol-high` |
| `ma/testy` | Tester | `composer-2.5` |
| `ma/review-t` | Kontrolor T | `gpt-5.5-high` |
| `ma/done` | Integrátor | `composer-2.5` |

Nežádej dlouhé ROLE/VSTUP_ISSUE prompty — stačí `/m N`.
