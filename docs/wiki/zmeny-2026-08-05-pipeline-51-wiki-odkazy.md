# Změna: Oprava rozbitých wiki odkazů (#51)

- **Pipeline:** #51
- **Datum:** 2026-08-05
- **Větev:** `feature/pipeline-51-wiki-links`

## Cíl

GitHub Wiki slug = basename souboru. Seed zploštěn na unikátní názvy; sidebar a relativní odkazy bez `/`, `../`, `.md`.

## Dopad

### Aplikační

- Navigace a interní odkazy: `aplikacni-prehled`, `provozni-prehled`, `zmeny-index`, …

### Provozní

- `check-wiki-seed.sh`: BROKEN LINK / DUPLICATE PAGE / BAD LINK FORM / ORPHAN / NESTED PAGE
- Konvence v `provozni-deploy`; sync maže staré nested stránky

## Mapování starých URL → nových

| Staré (nefunkční / kolizní) | Nové |
|-----------------------------|------|
| `/wiki/aplikacni/prehled` | `/wiki/aplikacni-prehled` |
| `/wiki/prehled` (kolize) | `/wiki/aplikacni-prehled` + `/wiki/provozni-prehled` |
| `/wiki/zmeny/index` | `/wiki/zmeny-index` |

## Odkazy

- Issues: [#51](https://github.com/pida1200/Test2/issues/51) · [#60](https://github.com/pida1200/Test2/issues/60) · [#61](https://github.com/pida1200/Test2/issues/61)
- Wiki: [Home](Home) · [zmeny-index](zmeny-index)
