# Multi‑agent workflow (Cursor) – role 3+3

Cíl: větší úkoly řešit jako **pipeline s bránami** — každá produkční role má **kontrolora**.  
**NO-GO = krok se neposune**: předchozí role musí problém vyřešit a znovu odevzdat; kontrolor znovu rozhodne.  
**1 integrátor** drží celek, testy/lint a uzavření (**commit / merge / push bez PR**).

## Role (6 + integrátor)

| Role | Co dělá | Co **nedělá** |
|------|---------|----------------|
| **Analytik** | Cíl, scope, API kontrakt, kritéria hotovo, edge cases, rizika | Nekóduje, nespouští git push |
| **Kontrolor analytika** | Kontrola úplnosti a konzistence analýzy | Neimplementuje; neopravuje analýzu „za analytika“ |
| **Vývojář** | Implementace ve scope dle schválené analýzy + unit testy happy path | Nemění kontrakt bez eskalace; neřeší git push |
| **Kontrolor vývojáře** | Code review diffu | Neimplementuje |
| **Tester** | Test plán, edge/regresní testy, ověření | Nerozšiřuje feature mimo testy |
| **Kontrolor testera** | Kontrola pokrytí a kvality testů | Neimplementuje produkční kód |
| **Integrátor** | Orchestruje pipeline, konflikty, finální testy/lint, commit, learning-log | — |

## Modely (doporučené přiřazení)

V Cursoru zvol model u každého chatu / sub-agenta podle tabulky. Slug = hodnota pro výběr modelu (Task / agent).  
Uživatel může přepsat; Integrátor v kickoffu uvede `MODEL:` u každé role.

| Role | Doporučený model | Alternativa (rychlejší / levnější) | Proč |
|------|------------------|-------------------------------------|------|
| **Analytik** | `claude-opus-4-8-thinking-high` | `gpt-5.6-sol-high` | silný reasoning nad kontraktem a DoD |
| **Kontrolor analytika** | `claude-opus-4-8-thinking-high` | `gpt-5.6-sol-xhigh` | hledá mezery a rozpory (ideálně jiný „pohled“ než Analytik, pokud jde) |
| **Vývojář** | `composer-2.5` | `claude-4.6-sonnet-high-thinking` | implementace ve scope + základní testy |
| **Kontrolor vývojáře** | `gpt-5.6-sol-high` | `claude-opus-4-8-thinking-high` | code review oddělený od implementačního modelu |
| **Tester** | `composer-2.5` | `claude-4.6-sonnet-high-thinking` | psaní/spouštění testů, edge cases |
| **Kontrolor testera** | `gpt-5.5-high` | `claude-4.6-sonnet-high-thinking` | kontrola pokrytí; stačí střední/high reasoning |
| **Integrátor** | `composer-2.5` | `composer-2.5-fast` | orchestrace, konflikty, lint/commit |

### Pravidla výběru modelu

1. **Kontrolor ≠ stejný model jako produkce**, pokud to jde (snižuje „self-review bias“) — aspoň u Vývojář vs Kontrolor vývojáře.
2. Fast varianty (`*-fast`) jen u rutinního reworku / drobných oprav po jasném seznamu vad.
3. Extra těžký reasoning (`*-xhigh`) jen u NO-GO smyčky na analýze nebo u riskantního review.
4. V zadání každé role uveď řádek: `MODEL: <slug>`.

## Pipeline + rework smyčka

```text
[1] Analytik ──artefakt──► [1✓] Kontrolor analytika
                              │
                    GO ───────┼─────── NO-GO (seznam vad)
                    │         │              │
                    ▼         │              └──► Analytik opraví → znovu [1✓]
[2] Vývojář ──artefakt──► [2✓] Kontrolor vývojáře
                    │         │
                    GO        NO-GO ──► Vývojář opraví → znovu [2✓]
                    ▼
[3] Tester ──artefakt──► [3✓] Kontrolor testera
                    │         │
                    GO        NO-GO ──► Tester opraví → znovu [3✓]
                    ▼                   (vadný produkt → eskalace na Vývojáře)
[I] Integrátor → testy+lint → commit → learning-log
```

### Pravidla brány (závazné)

1. Další fáze startuje **jen po GO**.
2. **NO-GO** → pipeline stojí; **předchozí produkční role** dostane seznam vad a musí je vyřešit.
3. Kontrolor **neimplementuje** a **nesmí** „opravit za“ produkční roli — jen verdikt + připomínky.
4. Po opravě jde artefakt **znovu ke stejnému kontrolorovi** (nové GO/NO-GO).
5. Max. doporučené kol **reworku na bránu: 3**; potom eskalace na Integrátora / uživatele.
6. Přeskočení NO-GO bez zdůvodnění Integrátora je zakázané.

---

## Šablony I/O (kopíruj do zadání agenta)

Každá produkční role a každý kontrolor používá stejnou kostru:

```text
ROLE: <název>
VSTUP: …
VÝSTUP (artefakt): …
GATE: …
PŘI NO-GO: …
```

---

### 1) Analytik

```text
ROLE: Analytik
MODEL: claude-opus-4-8-thinking-high
VSTUP:
- cíl od uživatele / Integrátora (1 věta)
- kontext (cesty v repu, relevantní docs/rules)
- případně seznam vad z Kontrolora analytika (při reworku)

VÝSTUP (artefakt ANALÝZA):
1. Cíl (1 věta)
2. Scope / mimo scope
3. API nebo UI kontrakt (request/response, stavy, chyby/HTTP)
4. Kritéria hotovo (3–5 bodů)
5. Edge cases + rizika
6. Návrh ověření (testy/lint/docker)
Formát: strukturovaný markdown; nekóduj.

GATE: odevzdáš ANALÝZU → Kontrolor analytika
PŘI NO-GO: oprav jen body ze seznamu vad; vrať aktualizovanou ANALÝZU (verzuj: v2, v3…)
NESMÍŠ: implementovat, spouštět další fázi, git push
```

---

### 1✓) Kontrolor analytika

```text
ROLE: Kontrolor analytika
MODEL: claude-opus-4-8-thinking-high
VSTUP:
- artefakt ANALÝZA (aktuální verze)
- původní cíl uživatele (pro shodu)

VÝSTUP (artefakt VERDIKT_A):
- verdikt: GO | NO-GO
- pokud NO-GO: číslovaný seznam vad (co chybí / je rozporuplné / mimo scope)
- pokud GO: krátké „proč OK“ (2–4 body) + volitelné drobné doporučení (nezávazné)

Kontroluj:
- úplný a jednoznačný kontrakt
- DoD měřitelné
- edge cases pokryté v analýze
- žádný scope creep
- návrh ověření existuje

GATE:
- GO → Integrátor spustí Vývojáře (vstup = schválená ANALÝZA)
- NO-GO → pipeline STOP; Analytik musí vyřešit vady → znovu tento kontrolor

NESMÍŠ: přepsat analýzu, kódovat, posunout na Vývojáře při NO-GO
```

---

### 2) Vývojář

```text
ROLE: Vývojář
MODEL: composer-2.5
VSTUP:
- schválená ANALÝZA (po GO Kontrolora analytika) — povinné
- scope souborů/složek
- případně seznam vad z Kontrolora vývojáře (při reworku)
- .cursor/rules/ dle cesty (mujdum / ciselniky / examples)

VÝSTUP (artefakt IMPLEMENTACE):
1. Shrnutí změn (co / proč)
2. Seznam změněných souborů
3. Odchylky od ANALÝZY (jen s eskalací Integrátorovi; jinak žádné)
4. Co ověřil (příkazy + výsledek)
5. Unit testy: happy path + ≥1 edge case

GATE: odevzdáš IMPLEMENTACI → Kontrolor vývojáře
PŘI NO-GO: oprav vady ve scope; vrať aktualizovanou IMPLEMENTACI (diff v2…)
NESMÍŠ: měnit kontrakt bez eskalace; git push; spustit Testera bez GO
```

---

### 2✓) Kontrolor vývojáře

```text
ROLE: Kontrolor vývojáře
MODEL: gpt-5.6-sol-high
VSTUP:
- schválená ANALÝZA
- artefakt IMPLEMENTACE (diff + shrnutí + výsledky ověření)

VÝSTUP (artefakt VERDIKT_V):
- verdikt: GO | NO-GO
- NO-GO: číslované vady (soubor/oblast + co opravit + doporučený fix)
- GO: krátké „proč OK“

Kontroluj:
- shoda s kontraktem ANALÝZY
- error envelope + HTTP statusy
- edge cases v kódu/testech
- konvence / čitelnost
- bezpečnost (žádné secrety, citlivé údaje v response/logu)

GATE:
- GO → Integrátor spustí Testera
- NO-GO → STOP; Vývojář musí vyřešit vady → znovu tento kontrolor

NESMÍŠ: implementovat fixy sám; posunout dál při NO-GO
```

---

### 3) Tester

```text
ROLE: Tester
MODEL: composer-2.5
VSTUP:
- schválená ANALÝZA (DoD + edge cases)
- IMPLEMENTACE po GO Kontrolora vývojáře
- případně seznam vad z Kontrolora testera (při reworku)
- repo-kvalita.mdc

VÝSTUP (artefakt TESTY):
1. Checklist scénářů (happy / edge / error) mapovaný na DoD
2. Co jsi přidal nebo upravil (soubory testů)
3. Příkazy + výsledky
4. Nalezené problémy (bug v produktu → nahlásit Integrátorovi; ne „tiše“ měnit feature)

GATE: odevzdáš TESTY → Kontrolor testera
PŘI NO-GO:
- vady v testech → Tester opraví → znovu Kontrolor testera
- vada v produktu (chybí chování z DoD) → eskalace: Vývojář (rework fáze 2) → znovu 2✓ → znovu Tester

NESMÍŠ: rozšiřovat feature mimo testy (výjimka: minimální testovatelnost — nahlásit)
```

---

### 3✓) Kontrolor testera

```text
ROLE: Kontrolor testera
MODEL: gpt-5.5-high
VSTUP:
- schválená ANALÝZA (DoD + edge cases)
- artefakt TESTY (plán + diff testů + výsledky)

VÝSTUP (artefakt VERDIKT_T):
- verdikt: GO | NO-GO
- NO-GO: vady (chybějící scénář, slabý assert, flaky, false confidence)
- GO: krátké „proč OK“
- pokud podezření na vadu produktu: označ „ESKALACE_VÝVOJÁŘ“ + důvod

GATE:
- GO → Integrátor smí uzavřít
- NO-GO (testy) → STOP; Tester opraví → znovu tento kontrolor
- NO-GO / ESKALACE_VÝVOJÁŘ → STOP; Vývojář → 2✓ → Tester → znovu 3✓

NESMÍŠ: psát produkční kód; posunout na Integrátora při NO-GO
```

---

### I) Integrátor

```text
ROLE: Integrátor
MODEL: composer-2.5
VSTUP:
- cíl uživatele
- všechny artefakty s finálními GO (ANALÝZA, IMPLEMENTACE, TESTY + VERDIKT_*)
- případné otevřené eskalace

VÝSTUP:
1. Spojení změn / řešení konfliktů
2. Finální ověření (testy + lint dle oblasti; Docker u mujdum/ciselniky dle rules)
3. Commit (+ push dle domluvy); bez PR (repo-git.mdc)
4. Záznam v docs/learning-log.md (povinně u multi-agent)
5. Sebehodnocení (co / riziko / další krok)

GATE (uzavření):
- smíš uzavřít jen když VERDIKT_A + VERDIKT_V + VERDIKT_T = GO
- jakýkoli NO-GO → vrať na příslušnou produkční roli (neuzavírej)

PŘI BLOKACI (>3 reworky na bráně): eskaluj uživateli s výpisem vad
```

---

## Kickoff (Integrátor spouští pipeline)

```text
Cíl: <1 věta>
Kontext: <kde v repu + proč>
Pipeline: 1→1✓→2→2✓→3→3✓→I
Modely (default):
- Analytik / K. analytika: claude-opus-4-8-thinking-high
- Vývojář / Tester / Integrátor: composer-2.5
- Kontrolor vývojáře: gpt-5.6-sol-high
- Kontrolor testera: gpt-5.5-high
Pravidlo: NO-GO = STOP; předchozí role opraví; kontrolor znovu rozhodne
Kritéria hotovo (návrh): <…>
Ověření: <testy/lint/docker>
Pravidla: .cursor/rules/ + repo-git (bez PR) + docs/learning-log.md
```

## Kdy použít

- Úkol má **aspoň 2 vrstvy** (analýza → kód → ověření) nebo větší změnu API/UI.
- Explicitní žádost o multi‑agent / role 3+3.

**Nepoužívat** na drobný bugfix — 1 agent + `repo-kvalita.mdc`.

Zkrácená varianta: sloučit Analytik+Vývojář, ale nechat aspoň Kontrolora vývojáře + Testera.

## Scope (povinné v každém zadání)

- scope (složky/soubory)
- mimo scope
- expected output = artefakt výše + u kontrolora verdikt GO|NO-GO

## Mapování na starší role A–D

| Dříve | Teď |
|-------|-----|
| Agent A/B Backend/Frontend | **Vývojář** |
| Agent C Test/QA | **Tester** |
| Agent D Code review | **Kontrolor vývojáře** (+ kontroloři analýzy a testů) |
| (chybělo) | **Analytik** + **Kontrolor analytika** + rework smyčky |
