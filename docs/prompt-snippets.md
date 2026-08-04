# Prompt snippets (Cursor)

Používej jako “copy‑paste” šablony pro zadávání úkolů tak, aby Cursor pracoval rychle, ve scope a s konzistentní kvalitou.

## Návrat k projektu (po restartu Cursoru)

Detailní checklist: [`navrat-k-projektu.md`](navrat-k-projektu.md). Agent čte [`AGENTS.md`](../AGENTS.md).

```text
Navazuji na práci v repu cursor.

Přečti AGENTS.md (sekce Návrat), git status + git log -5, docs/learning-log.md (konec),
Obsidian projekty/mujdum/hub.md + nejnovější session-*.md.

Větev: <…>
Úkol teď: <jedna věta>
Pravidla: .cursor/rules/ — vzdálený deploy mujdum jen na žádost.
```

## Základní šablona (vždy)

```text
Cíl:
Scope:
Mimo scope:
Hotovo když:
Ověření:
Pravidla: drž se `.cursor/rules/` + na konci sebehodnocení + zápis do `docs/learning-log.md`.
```

## Backend: nový endpoint + testy

```text
Cíl: přidat endpoint <METHOD> <PATH> do <projekt>.
Scope: <složky/soubory>
Mimo scope: UI, refaktory mimo endpoint, nové dependency (pokud není nutné)

Hotovo když:
- je definovaný kontrakt request/response
- validace vstupu (Zod) + konzistentní error envelope
- unit testy: happy path + 1–2 edge cases

Ověření:
- npm run check
```

## Bugfix (reprodukce → oprava → prevence regrese)

```text
Cíl: opravit bug <popis>.
Scope: <složky>
Hotovo když:
- mám minimální reprodukci (test nebo kroky)
- fix je malý a cílený
- přidaný test proti regresi
Ověření: npm run check
```

## Refactor (bez změny chování)

```text
Cíl: refaktor <část> bez změny veřejného chování.
Scope: <složky>
Mimo scope: změna API kontraktu, nové feature
Hotovo když:
- kód je čitelnější / méně duplicity
- testy stále prochází, coverage nepadá
Ověření: npm run check
```

## Test‑only (zvýšení pokrytí / edge cases)

```text
Cíl: doplnit unit testy pro <část>.
Scope: testy + minimální změny produkčního kódu (jen pro testovatelnost)
Hotovo když:
- přidané testy na edge cases
- jasné názvy testů a stabilní assertions
Ověření: npm run check
```

## Docs‑only (rychlý PR)

```text
Cíl: upravit dokumentaci <kde>.
Scope: docs/*, .cursor/rules/*
Hotovo když:
- změny jsou stručné, praktické, příklady fungují
Ověření: N/A
```

## Multi‑agent (implementace + code review)

```text
Cíl: <1 věta>
Scope: <složky/soubory>
Rozdělení:
- Agent A (implementace): <scope>
- Agent B (code review): čte diff a vrací připomínky, nic neimplementuje

Hotovo když:
- připomínky z review jsou zapracované (nebo zdůvodněné)
- npm run check
- záznam v docs/learning-log.md
```

## Scope‑first + 2 agenti (rychlá verze)

```text
Cíl: <1 věta>

Scope: <přesně vyjmenuj složky/soubory, např. examples/backend/src/*>
Mimo scope: <např. docs/*, .cursor/rules/*, změna dependency>

Agent A (implementace):
- Udělej změny pouze ve scope.
- Přidej/aktualizuj unit testy.
- Ověř: npm run check
- Vrať: shrnutí + soubory + jak ověřit.

Agent B (code review):
- Neimplementuj nic.
- Projdi diff: kontrakt, error envelope, edge cases, test coverage, bezpečnost.
- Vrať: konkrétní připomínky + doporučené fixy.

Integrátor:
- Zapracuj připomínky (nebo zdůvodni proč ne).
- Ověř: npm run check
- Zapiš do docs/learning-log.md
```
