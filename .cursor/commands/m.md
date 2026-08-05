---
description: Multi-agent pipeline — /m, /m #N, /m #N once, /m 2, /m #<bug>
---

Spusť multi-agent dle `.cursor/skills/m/SKILL.md`.

**Gramatika:**

| Vstup | Význam |
|-------|--------|
| `/m` | Kickoff + **orchestrace** celé pipeline |
| `/m #N` | **Orchestrace** od aktuální fáze do STOP |
| `/m #N once` | Jen **jeden** krok (aktuální fáze) |
| `/m 2` / `/m 2 #N` | Rychlá 2er (orchestrace; přidej `once` = jeden krok) |
| `/m #<bug>` | Issue s `multiagent/bug` — Vývojář |

Číslo issue **vždy s `#`**. Bez `#` je `2` režim, ne issue.

**CLI first:** role spouštěj přes `docs/scripts/ma-run-role.sh` (`cursor-agent`); chybí-li CLI (exit 3), fallback = Cursor Task s vytištěným promptem.

**STOP orchestrace:** NO-GO, `gate/blocked`, chybí `gh` write, `once`, `MERGE-PENDING` (ruční merge).

**Modely:** `docs/multi-agent-workflow.md` (sekce Modely).  
Detail: rule `.cursor/rules/multi-agenti.mdc`.
