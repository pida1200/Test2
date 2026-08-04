---
description: Multi-agent pipeline — /m, /m #N, /m 2, /m 2 #N
---

Spusť multi-agent krok dle `.cursor/skills/m/SKILL.md`.

**Gramatika:**

| Vstup | Význam |
|-------|--------|
| `/m` | Nový úkol — plná pipeline 3+3; Integrátor doplní/vytvoří `[PIPELINE]` |
| `/m #N` | Pokračuj v pipeline `#N`; fázi odvoď z labelů child issues |
| `/m 2` | Rychlá 2er (Vývojář + Kontrolor vývojáře) |
| `/m 2 #N` | Rychlá 2er nad pipeline `#N` |

Číslo issue **vždy s `#`**. Bez `#` je `2` režim, ne issue.

Detail: `docs/multi-agent-workflow.md`, rule `.cursor/rules/multi-agenti.mdc`.
