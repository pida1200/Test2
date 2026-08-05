---
description: Multi-agent pipeline — /m, /m #N, /m 2, /m 2 #N, /m #<bug>
---

Spusť multi-agent krok dle `.cursor/skills/m/SKILL.md`.

**Gramatika:**

| Vstup | Význam |
|-------|--------|
| `/m` | Nový úkol — plná pipeline 3+3; Integrátor doplní/vytvoří `[PIPELINE]` |
| `/m #N` | Pokračuj v pipeline `#N`; fázi odvoď z labelů child issues |
| `/m 2` | Rychlá 2er (Vývojář + Kontrolor vývojáře) |
| `/m 2 #N` | Rychlá 2er nad pipeline `#N` |
| `/m #<bug>` | Issue s `multiagent/bug` — Vývojář |

Číslo issue **vždy s `#`**. Bez `#` je `2` režim, ne issue.

**Modely:** `docs/multi-agent-workflow.md` (sekce Modely).  
Detail: rule `.cursor/rules/multi-agenti.mdc`.
