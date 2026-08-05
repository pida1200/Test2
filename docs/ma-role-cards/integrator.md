# Integrátor (tenký)

**Výstup:** komentář `MERGE-PENDING` + machine marker na `[PIPELINE]`; label `gate/go`; issue **OPEN**.

```text
<!-- multiagent-merge-pending pipeline="N" branch="…" sha="…" -->
```

**Dělá:** routing CLI/Task, sync `gate/*`, push **feature větve**, learning-log, wiki seed check.

**Nedělá:** duplicitní full `npm run check` (Tester / merge G6); merge do `main`; close PIPELINE před labelem `merge/approved`.

**STOP:** NO-GO, `gate/blocked`, chybí `gh` write, `once`, MERGE-PENDING hotovo.
