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

## Multi‑agent role 3+3 (I/O + gate + rework)

Detail šablon VSTUP/VÝSTUP/GATE: [`multi-agent-workflow.md`](multi-agent-workflow.md).  
Rule: `.cursor/rules/multi-agenti.mdc`.

```text
Cíl: <1 věta>
Scope: <složky/soubory>
Mimo scope: <…>

Pipeline + MODEL (viz docs/multi-agent-workflow.md → Modely):
1) Analytik [claude-opus-4-8-thinking-high] → Kontrolor analytika [claude-opus-4-8-thinking-high]
2) Vývojář [composer-2.5] → Kontrolor vývojáře [gpt-5.6-sol-high]
3) Tester [composer-2.5] → Kontrolor testera [gpt-5.5-high]
4) Integrátor [composer-2.5]: testy+lint, commit, docs/learning-log.md

Gate:
- NO-GO = STOP; předchozí produkční role musí vyřešit seznam vad
- po opravě znovu stejný kontrolor
- kontrolor neimplementuje
- uzavření jen při GO ze všech tří kontrolorů

Hotovo když:
- VERDIKT_A + VERDIKT_V + VERDIKT_T = GO
- ověření dle oblasti
- záznam v docs/learning-log.md
```

### Mini-template role (vlož do každého sub-agenta)

```text
ROLE: <Analytik|Kontrolor analytika|Vývojář|Kontrolor vývojáře|Tester|Kontrolor testera>
MODEL: <slug dle tabulky Modely>
VSTUP: <artefakty / cíl / seznam vad při reworku>
VÝSTUP: <ANALÝZA|VERDIKT_A|IMPLEMENTACE|VERDIKT_V|TESTY|VERDIKT_T>
GATE: <komu odevzdávám / kdy smím dál>
PŘI NO-GO: <kdo opravuje; znovu který kontrolor>
```

## Multi‑agent (rychlá 2er — implementace + review)

Když nestačí plná 3+3, aspoň vývojář + kontrolor:

```text
Cíl: <1 věta>
Scope: <složky/soubory>
Rozdělení:
- Vývojář (implementace): <scope>
- Kontrolor vývojáře: čte diff a vrací GO/NO-GO + připomínky, nic neimplementuje

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

Vývojář:
- Udělej změny pouze ve scope.
- Přidej/aktualizuj unit testy.
- Ověř: npm run check
- Vrať: shrnutí + soubory + jak ověřit.

Kontrolor vývojáře:
- Neimplementuj nic.
- Projdi diff: kontrakt, error envelope, edge cases, test coverage, bezpečnost.
- Vrať: GO/NO-GO + konkrétní připomínky + doporučené fixy.

Integrátor:
- Zapracuj připomínky (nebo zdůvodni proč ne).
- Ověř: npm run check
- Zapiš do docs/learning-log.md
```