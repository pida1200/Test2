---
description: Multi-agent pipeline — /m, /m #N, /m #N once, /m 2, /m #<bug>
---

Spusť multi-agent dle `.cursor/skills/m/SKILL.md` (kanonická gramatika + STOP + CLI first).

**Routing:** scoped / jasný DoD → `/m 2 #N`; plná 3+3 jen při nejasném API/DoD, bezpečnosti nebo žádosti uživatele.

**CLI first:** `docs/scripts/ma-run-role.sh` (+ role cards `docs/ma-role-cards/`); exit 3 → Task fallback.

**Modely:** `docs/multi-agent-workflow.md` (sekce Modely).  
Rule: `.cursor/rules/multi-agenti.mdc`.
