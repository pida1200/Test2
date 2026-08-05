# Změny — MA quality + token P0–P1

- **Datum:** 2026-08-05
- **Pipeline:** (direct feature / follow-up revize) — větev `feature/ma-quality-token-p0-p1`
- **Wiki:** `zmeny-2026-08-05-ma-quality-token-p0-p1`

## Shrnutí

Opravy kvality a spotřeby po revizi MA (#74/#81/#83): sjednocený „Další krok“ na `merge/approved`, tenký Integrátor, Kontrolor A na jiné rodině modelu, role cards, next-bot CLI one-liner, přísnější merge SHA/`pipeline=`, gate-check maže stale komentář.

## P0

- Pipeline-sync: po A+V+T GO → `merge/approved` (ne „uzavři issue“)
- Integrátor I/O bez duplicitního full check
- Kontrolor A default: `gpt-5.6-terra-medium` (≠ Analytik Opus)
- Gate-check: při 0 errors delete stale comment
- Merge: `shaMatches` (min. 7 znaků) + G4b `markerPipelineMatches`

## P1

- `docs/ma-role-cards/*` + tenký prompt v `ma-run-role.sh`
- Next-bot: one-liner `bash docs/scripts/ma-run-role.sh …`
- Routing: scoped → `/m 2`; gramatika kanonicky ve skillu
- Checklist Kontrolor A (max 7); legacy Scope-first snippet odstraněn

## P2 (follow-up pipeline)

Odděleno: [#100](https://github.com/pida1200/Test2/issues/100) — `risk/low` skip Kontrolor A; verdikt-as-comment; `check:merge`.
