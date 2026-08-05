# Změna: Hybrid MA + Wiki KB (pipeline #34)

- **Pipeline:** #34
- **Datum:** 2026-08-05
- **Commit / větev:** `feature/multiagent-zadani-hybrid`

## Cíl

Uzavřít mezery kolem Wiki KB pro hybridní multi-agent model (varianta C): ASCII seed `docs/wiki/`, závazná pravidla rolí, strojové ověření struktury, záznam změny.

## Dopad

### Aplikační

- Issues = stav/gate; delší artefakty → Wiki (`aplikacni/`, `provozni/`).
- Volitelný řádek `Wiki:` v child issue body (nepovinný, neblokuje gate).

### Provozní

- Nový skript `docs/scripts/check-wiki-seed.sh` + `npm run check:wiki` v `npm run check`.
- `check:docs` lintuje `docs/multiagent-zadani.md` a `docs/wiki/**/*.md`.
- GitHub Wiki UI zatím neexistuje — zdroj pravdy zůstává v gitu; první stránka ručně (follow-up sync).

## Odkazy

- Issues: [#34 PIPELINE](https://github.com/pida1200/Test2/issues/34), [#36 ANALÝZA](https://github.com/pida1200/Test2/issues/36), [#37 VERDIKT-A](https://github.com/pida1200/Test2/issues/37), [#38 IMPLEMENTACE](https://github.com/pida1200/Test2/issues/38)
- Wiki: [Home](../Home.md), [aplikacni/prehled](../aplikacni/prehled.md), [provozni/prehled](../provozni/prehled.md)
- Spec: [docs/multiagent-zadani.md](../../multiagent-zadani.md)
