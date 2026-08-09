# Prompt snippets (Cursor)

Používej jako “copy‑paste” šablony pro zadávání úkolů tak, aby Cursor pracoval rychle, ve scope a s konzistentní kvalitou.

## Návrat k projektu (po restartu Cursoru)

Detailní checklist: [`navrat-k-projektu.md`](navrat-k-projektu.md). Agent čte [`AGENTS.md`](../AGENTS.md).

```text
Navazuji na práci v multi-agent template repu.

Přečti AGENTS.md (sekce Návrat), git status + git log -5, docs/learning-log.md (konec).
Volitelně Obsidian projekty/<projekt>/hub.md + nejnovější session-*.md.

Větev: <…>
Úkol teď: <jedna věta>
Pravidla: .cursor/rules/ — bez PR; MA přes /m.
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

## Docs‑only (rychlá úprava)

```text
Cíl: upravit dokumentaci <kde>.
Scope: docs/*, .cursor/rules/*
Hotovo když:
- změny jsou stručné, praktické, příklady fungují
Ověření: N/A
```

## Multi‑agent: slash gramatika

Kanonicky: [`.cursor/skills/m/SKILL.md`](../.cursor/skills/m/SKILL.md) (gramatika + STOP).  
Role cards: [`docs/ma-role-cards/`](ma-role-cards/README.md).  
**Routing:** scoped → `/m 2 #N`; plná 3+3 jen při nejasném DoD/API/bezpečnosti.

**Modely:** [`multi-agent-workflow.md`](multi-agent-workflow.md) (sekce Modely).

**CLI first:** `docs/scripts/ma-run-role.sh` (exit 3 → Task). Next-bot vypisuje one-liner.

I/O vždy přes GitHub Issues. Integrátor při kickoffu: existující pipeline **doplní**; nové jen když žádné neexistuje.

Přehled: `[PIPELINE]` markery `multiagent:prehled` nebo `bash docs/scripts/ma-pipeline-view.sh #N`.

### Snippet — nález testera → `[BUG]`

Použij **jen** když nález je mimo scope pipeline nebo Integrátor vědomě odkládá vadu ve scope. Ve scope a blokující → `ESKALACE_VÝVOJÁŘ` v `[TESTY]`, ne nové issue.

```text
ROLE: Tester
MODEL: composer-2.5-fast
VSTUP_ISSUE: #<TESTY> + #<ANALÝZA> (scope)

Nález mimo scope / odložený → vytvoř [BUG]:
gh issue create --title "[BUG] <stručný projev>" \
  --label "bug,multiagent,multiagent/bug" \
  --body-file /tmp/bug-body.md

Do /tmp/bug-body.md (v1):
Pipeline: #<PIPELINE>     # volitelně — jen když nález vznikl v pipeline
Zdroj: #<TESTY>
Závažnost: blocker | major | minor
Rozsah: mimo scope pipeline | ve scope – odloženo
Reprodukce: <kroky>       # žádné secrety z .env
Očekávané / skutečné: …
Návrh dalšího kroku: samostatný úkol | /m #<bug>
Verze: v1

Do [TESTY] doplň #<BUG> do pole „Založené bug issues“.
Kontrolor testera bug nezakládá — chybějící bug reklamuje v VERDIKT-T NO-GO.
```

## Multi‑agent role 3+3 — `/m` (I/O + gate + rework)

Detail šablon VSTUP/VÝSTUP/GATE: [`multi-agent-workflow.md`](multi-agent-workflow.md).  
Rule: `.cursor/rules/multi-agenti.mdc`.

```text
Cíl: <1 věta>
Scope: <složky/soubory>
Mimo scope: <…>

I/O: GitHub Issues (`.github/ISSUE_TEMPLATE/`)
Pipeline + MODEL: viz `docs/multi-agent-workflow.md` (sekce Modely) — uveď `MODEL:` u role
1) [PIPELINE] → Analytik → [ANALÝZA] → K.A → [VERDIKT-A]
2) Vývojář → [IMPLEMENTACE] → K.V → [VERDIKT-V]
3) Tester → [TESTY] → K.T → [VERDIKT-T]
4) Integrátor: MERGE-PENDING (feature větev); merge do main = člověk

Gate:
- NO-GO = STOP; oprav produkční issue dle verdikt issue; znovu verdikt
- další issue až po label gate/go
- kontrolor neimplementuje
- close [PIPELINE] až po ručním merge (nebo explicitním pokynu)

Hotovo když:
- VERDIKT-A/V/T mají gate/go
- ověření dle oblasti
- záznam v docs/learning-log.md + MERGE-PENDING na [PIPELINE] (merge do main = člověk)
```

### Snippet ANALÝZA (Analytik → body issue)

```text
ROLE: Analytik
MODEL: cursor-grok-4.5-high
VSTUP_ISSUE: #<PIPELINE>
VÝSTUP_ISSUE: #<ANALÝZA>

Do body VÝSTUP_ISSUE:
0. Mini-plán (1–3 věty) — cíl, dotčené soubory/scope, jak ověříš
1. Cíl (1 věta)
2. Scope / mimo scope
3. API nebo UI kontrakt
4. Kritéria hotovo (3–5)
5. Edge cases + rizika
6. Návrh ověření
7. Doporučené implementační kroky (pořadí commitů)
8. Pipeline: #<PIPELINE>
9. Wiki: <volitelně cesta v docs/wiki/ bez .md>

GATE: → Kontrolor analytika
PŘI NO-GO: oprav body dle #<VERDIKT-A>
```

### Mini-template role (vlož do každého sub-agenta)

```text
ROLE: <Analytik|Kontrolor analytika|Vývojář|Kontrolor vývojáře|Tester|Kontrolor testera>
MODEL: <slug dle tabulky Modely>
VSTUP_ISSUE: #<…>
VÝSTUP_ISSUE: #<…>   # nebo „vytvoř ze šablony“
GATE: <komu odevzdávám / kdy smím dál>
PŘI NO-GO: <kdo opravuje produkční issue; znovu který verdikt>
```

### Snippet Integrátor — handoff MERGE-PENDING

```text
ROLE: Integrátor
MODEL: composer-2.5-fast
VSTUP_ISSUE: #<PIPELINE> + #<VERDIKT-A> + #<VERDIKT-V> + #<VERDIKT-T> (vše gate/go)

Před handoffem:
1. Otevři #<PIPELINE> — zkontroluj auto-přehled mezi markery multiagent:prehled
   (nebo lokálně: bash docs/scripts/ma-pipeline-view.sh #<PIPELINE>)
2. Tabulka: všech 6 fází má issue + správný gate; historie verdiktů sedí s reworky
3. Ruční checklist child issues doplň pokud bot ještě nesynchronizoval
4. Wiki: bash docs/scripts/check-wiki-seed.sh; u změny chování záznam docs/wiki/zmeny-… + řádek v zmeny-index.md
5. Commit + push **feature větve** + docs/learning-log.md (ne merge do main)
6. Komentář MERGE-PENDING do #<PIPELINE> — lidský text **+ machine marker** na samostatném řádku:
   <!-- multiagent-merge-pending pipeline="<PIPELINE>" branch="<větev>" sha="<HEAD>" -->
   Issue nech OPEN s gate/go.
7. Merge do main spustí ČLOVĚK přidáním labelu `merge/approved` (workflow multiagent-merge.yml
   — guardy G0–G6 + autorizace G7, docs/scripts/ma-merge-lib.cjs). Ty do main nemerguj.

Bootstrap (jen dokud neproběhlo B0–B5 z #81 — jinak tento blok vynech):
   B0 člověk zmerguje #81 ručně → B1 create-multiagent-labels.sh → B2 ověř 4× merge/*+wiki/sync-failed
   → B3 dry-run (workflow_dispatch, dry_run:true) nad uzavřenou pipeline, main beze změny
   → B4 zapiš výsledek do #81 → B5 teprve další pipeline smí použít merge/approved ostře.
```

## Multi‑agent rychlá 2er — `/m 2` (Vývojář + Kontrolor vývojáře)

Preferovaná cesta pro scoped / jasný DoD. Legacy „Scope-first + 2 agenti“ (bez Issues) odstraněn.  
I/O přes Issues (`[IMPLEMENTACE]` → `[VERDIKT-V]`).

```text
Cíl: <1 věta>
Scope: <složky/soubory>
Mimo scope: <…>

I/O: GitHub Issues
- Vývojář → [IMPLEMENTACE] (label multiagent/implementace, gate/pending)
- Kontrolor vývojáře → [VERDIKT-V] (label multiagent/verdikt + gate/go|no-go)

Vývojář:
ROLE: Vývojář
MODEL: composer-2.5-fast   # alt: composer-2.5; Cursor Models only
VSTUP_ISSUE: #<PIPELINE nebo zadání>
VÝSTUP_ISSUE: #<IMPLEMENTACE>
Na začátek body: mini-plán (1–3 věty) — cíl, dotčené soubory, jak ověříš
GATE: → Kontrolor vývojáře; WIP commit(y) na feature větvi OK, NE push
PŘI NO-GO: oprav dle #<VERDIKT-V>, bump verze v body, znovu review

Kontrolor vývojáře:
ROLE: Kontrolor vývojáře
MODEL: cursor-grok-4.5-high   # alt: cursor-grok-4.5-high-fast; Cursor Models only
VSTUP_ISSUE: #<IMPLEMENTACE>
VÝSTUP_ISSUE: #<VERDIKT-V>
GATE: GO → Integrátor commitne feature větev + MERGE-PENDING; NO-GO → Vývojář opraví
PŘI NO-GO: seznam vad v body verdiktu; neimplementuj fixy

Hotovo když:
- [VERDIKT-V] má label gate/go
- ověření dle oblasti
- záznam v docs/learning-log.md (Integrátor)
```
