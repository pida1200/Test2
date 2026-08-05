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

Skill: `.cursor/skills/m/SKILL.md` · Command: `.cursor/commands/m.md`

| Vstup | Kdy použít |
|-------|------------|
| **`/m`** | Kickoff + orchestrace celé pipeline 3+3 |
| **`/m #N`** | Orchestrace od aktuální fáze do STOP |
| **`/m #N once`** | Jen jeden krok (aktuální fáze) |
| **`/m 2`** / **`/m 2 #N`** | Rychlá 2er (orchestrace; `once` = jeden krok) |
| **`/m #<bug>`** | Issue s `multiagent/bug` — Vývojář |

Číslo issue **vždy s `#`**. Labely `ma/*` nezavádět.

**Modely:** kanonická tabulka v [`multi-agent-workflow.md`](multi-agent-workflow.md) (sekce Modely) — sem nekopíruj.

**STOP orchestrace:** NO-GO, `gate/blocked`, chybí `gh` write, `once`, close PIPELINE.

I/O vždy přes GitHub Issues (`VSTUP_ISSUE` / `VÝSTUP_ISSUE`). Integrátor při kickoffu: existující pipeline issue **doplní** (`[PIPELINE]` titulek + labely); nové vytvoří jen když žádné neexistuje.

GH Action `multiagent-next.yml` komentuje `/m #N` (orchestrace) i `/m #N once` (jeden krok).
Přehled celé pipeline: `[PIPELINE]` issue — sekce mezi markery `multiagent:prehled` (bot) nebo `bash docs/scripts/ma-pipeline-view.sh #N` lokálně.

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
4) Integrátor uzavře [PIPELINE] jen při gate/go na A+V+T

Gate:
- NO-GO = STOP; oprav produkční issue dle verdikt issue; znovu verdikt
- další issue až po label gate/go
- kontrolor neimplementuje
- uzavření [PIPELINE] jen při gate/go na A+V+T

Hotovo když:
- VERDIKT-A/V/T mají gate/go
- ověření dle oblasti
- záznam v docs/learning-log.md + zavřený [PIPELINE]
```

### Snippet ANALÝZA (Analytik → body issue)

```text
ROLE: Analytik
MODEL: claude-opus-5-thinking-high
VSTUP_ISSUE: #<PIPELINE>
VÝSTUP_ISSUE: #<ANALÝZA>

Do body VÝSTUP_ISSUE:
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

### Snippet Integrátor — před uzavřením pipeline

```text
ROLE: Integrátor
MODEL: composer-2.5-fast
VSTUP_ISSUE: #<PIPELINE> + #<VERDIKT-A> + #<VERDIKT-V> + #<VERDIKT-T> (vše gate/go)

Před close [PIPELINE]:
1. Otevři #<PIPELINE> — zkontroluj auto-přehled mezi markery multiagent:prehled
   (nebo lokálně: bash docs/scripts/ma-pipeline-view.sh #<PIPELINE>)
2. Tabulka: všech 6 fází má issue + správný gate; historie verdiktů sedí s reworky
3. Ruční checklist child issues doplň pokud bot ještě nesynchronizoval
4. Wiki: bash docs/scripts/check-wiki-seed.sh; u změny chování záznam docs/wiki/zmeny-… + řádek v zmeny-index.md
5. Commit/merge/push + docs/learning-log.md
6. Zavři #<PIPELINE> jen při gate/go na A+V+T
```

## Multi‑agent rychlá 2er — `/m 2` (Vývojář + Kontrolor vývojáře)

Když nestačí plná 3+3, aspoň vývojář + kontrolor. I/O přes Issues (`[IMPLEMENTACE]` → `[VERDIKT-V]`).

```text
Cíl: <1 věta>
Scope: <složky/soubory>
Mimo scope: <…>

I/O: GitHub Issues
- Vývojář → [IMPLEMENTACE] (label multiagent/implementace, gate/pending)
- Kontrolor vývojáře → [VERDIKT-V] (label multiagent/verdikt + gate/go|no-go)

Vývojář:
ROLE: Vývojář
MODEL: composer-2.5-fast   # alt: claude-sonnet-5-thinking-high; *-fast OK když ne-fast není dostupná
VSTUP_ISSUE: #<PIPELINE nebo zadání>
VÝSTUP_ISSUE: #<IMPLEMENTACE>
GATE: → Kontrolor vývojáře; WIP commit(y) na feature větvi OK, NE push
PŘI NO-GO: oprav dle #<VERDIKT-V>, bump verze v body, znovu review

Kontrolor vývojáře:
ROLE: Kontrolor vývojáře
MODEL: gpt-5.6-sol-medium   # alt: claude-opus-5-thinking-high
VSTUP_ISSUE: #<IMPLEMENTACE>
VÝSTUP_ISSUE: #<VERDIKT-V>
GATE: GO → Integrátor může commitnout; NO-GO → Vývojář opraví
PŘI NO-GO: seznam vad v body verdiktu; neimplementuj fixy

Hotovo když:
- [VERDIKT-V] má label gate/go
- ověření dle oblasti
- záznam v docs/learning-log.md (Integrátor)
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
