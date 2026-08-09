---
description: Multi-agent pipeline — /m, /m #N, /m #N once, /m 2, /m #<bug>
---

Spusť multi-agent dle `.cursor/skills/m/SKILL.md` (kanonická gramatika + STOP).

**Orchestrace (default `/m #N`):** v jednom chatu řetěz role → role přes **Task/subagent**; mezi fázemi se **neptat**. CLI (`ma-run-role.sh`) jen když je `cursor-agent` v PATH; exit 3 → ihned Task, ne STOP.

**Routing:** scoped / jasný DoD → `/m 2 #N`; plná 3+3 jen při nejasném API/DoD, bezpečnosti nebo žádosti uživatele.

**Modely:** default `auto` — `docs/multi-agent-workflow.md` (sekce Modely).  
Rule: `.cursor/rules/multi-agenti.mdc`.
