# Změna: Šablona repo jen multi-agent (#66)

- **Pipeline:** #66
- **Datum:** 2026-08-05
- **Větev:** `feature/pipeline-66-sablona-ma`

## Cíl

Vyčistit Test2 od produktů (produktových stromů, odkazy na číselníky) → znovupoužitelná MA šablona.

## Dopad

### Aplikační

- Wiki bez produktových portů / deploy bloků; `AGENTS.md` / `README` popisují jen MA + `examples/backend`.

### Provozní

- Smazány produktové rules a `sonarcloud.yml`.
- Historické zmínky zůstávají v `docs/learning-log.md` (audit).
- Blobs produktů zůstávají v git historii (BFG mimo scope); „Use this template“ dá konzumentovi čistý start.

## Odkazy

- [#66](https://github.com/pida1200/Test2/issues/66) · [#67](https://github.com/pida1200/Test2/issues/67) · [#68](https://github.com/pida1200/Test2/issues/68)
- Wiki: [Home](Home) · [zmeny-index](zmeny-index)
