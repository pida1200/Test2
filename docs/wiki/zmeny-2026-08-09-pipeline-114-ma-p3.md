# Změna: MA P3 — cursor-agent, branch protection, live smoke

- **Datum:** 2026-08-09
- **Pipeline:** #114 (náhrada za #103 — agent nemohl editovat labely)
- **Větev:** `feature/pipeline-114-ma-p3`

## Cíl

Provozní follow-up po P0–P2:

1. `cursor-agent` / `agent` v PATH + ověření flagů vůči `ma-run-role.sh`
2. Dokumentace branch protection na `main`
3. Checklist live smoke ostrého `merge/approved`

## Dopad

- Nový `docs/scripts/check-ma-env.sh` (+ offline test)
- Wiki: [provozni-cursor-agent](provozni-cursor-agent), [provozni-branch-protection](provozni-branch-protection), [provozni-merge-smoke](provozni-merge-smoke)
- Ostrý smoke merge = **ruční** krok člověka (Actions + label Ano)

## Omezení

Cloud agent často nemá Issues write (403) — labely na issues doplňuje člověk.
