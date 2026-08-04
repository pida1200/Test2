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

## Modely (doporučené přiřazení — ověř dostupnost)

V Cursoru zvol model u každého chatu / sub-agenta podle tabulky. Slug = hodnota pro výběr modelu (Task / agent).  
**Ověř dostupnost slugů v Cursor Task a uveď skutečný slug v `MODEL:`.**  
Uživatel může přepsat; Integrátor v kickoffu uvede `MODEL:` u každé role.

| Role | Doporučený model | Alternativa | Proč |
|------|------------------|-------------|------|
| **Analytik** | `claude-opus-5-thinking-high` | `claude-4.5-opus-high-thinking` | silný reasoning nad kontraktem a DoD |
| **Kontrolor analytika** | `claude-opus-5-thinking-high` | `claude-4.5-opus-high-thinking` | hledá mezery a rozpory (ideálně jiný „pohled“ než Analytik) |
| **Vývojář** | `composer-2.5-fast` | `claude-sonnet-5-thinking-high` | implementace ve scope + základní testy |
| **Kontrolor vývojáře** | `gpt-5.6-sol-medium` | `claude-opus-5-thinking-high` | code review oddělený od implementačního modelu |
| **Tester** | `composer-2.5-fast` | `claude-sonnet-5-thinking-high` | psaní/spouštění testů, edge cases |
| **Kontrolor testera** | `claude-sonnet-5-thinking-high` | `gpt-5.6-terra-medium` | kontrola pokrytí |
| **Integrátor** | `composer-2.5-fast` | `claude-sonnet-5-thinking-high` | orchestrace, konflikty, lint/commit |

> **Poznámka:** Původní slugy (`claude-opus-4-8-thinking-high`, `composer-2.5`, `gpt-5.6-sol-high`, `gpt-5.5-high`) nejsou v Cursor Task dostupné. Tabulka výše používá ověřené náhrady.

### Pravidla výběru modelu

1. **Kontrolor ≠ stejný model jako produkce**, pokud to jde (snižuje „self-review bias“) — aspoň u Vývojář vs Kontrolor vývojáře.
2. **`*-fast` je legitimní**, když ne-fast alternativa neexistuje (dnes Vývojář/Tester/Integrátor). U ostatních rolí preferuj ne-fast alternativu ze sloupce Alternativa.
3. Extra těžký reasoning jen u NO-GO smyčky na analýze nebo u riskantního review.
4. V zadání každé role uveď řádek: `MODEL: <slug>`.
5. **Fallback:** pokud doporučený slug není dostupný, použij alternativu ze sloupce Alternativa. Uveď skutečný slug v `MODEL:`.

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
5. Max. doporučené kol **reworku na bránu: 3**; potom label `gate/blocked` na pipeline + eskalace na Integrátora / uživatele.
6. **Verdikt = nové issue každé kolo:** Kontrolor vytvoří **nové** `[VERDIKT-*]` issue; existující NO-GO verdikt se needituje na GO (body `Verdikt: NO-GO` zůstává audit trail). Sync workflow počítá NO-GO z body všech verdikt child issues (`state: all`).
7. Přeskočení NO-GO bez zdůvodnění Integrátora je zakázané.

## GitHub Issues = vstupy a výstupy

Každý **vstup i výstup** role je **GitHub Issue** (ne chat-only artefakt). Chat slouží jen k práci; pravda o pipeline je v Issues.

Šablony: `.github/ISSUE_TEMPLATE/`. Labely viz níže.

### Mapa issues v jedné pipeline

| Issue (titulek) | Label | Kdo zapisuje | Je vstupem pro | Je výstupem od |
|-----------------|-------|--------------|----------------|----------------|
| `[PIPELINE] <feature>` | `multiagent/pipeline` | Integrátor (kickoff) | Analytik, Integrátor | Integrátor (uzavře na konci) |
| `[ANALÝZA] <feature>` | `multiagent/analyza` | Analytik | Kontrolor analytika, Vývojář, Tester | Analytik |
| `[VERDIKT-A] <feature>` | `multiagent/verdikt` + `gate/go` \| `gate/no-go` | Kontrolor analytika | Vývojář (jen při GO), Analytik (při NO-GO) | Kontrolor analytika |
| `[IMPLEMENTACE] <feature>` | `multiagent/implementace` | Vývojář | Kontrolor vývojáře, Tester | Vývojář |
| `[VERDIKT-V] <feature>` | `multiagent/verdikt` + `gate/go` \| `gate/no-go` | Kontrolor vývojáře | Tester (GO) / Vývojář (NO-GO) | Kontrolor vývojáře |
| `[TESTY] <feature>` | `multiagent/testy` | Tester | Kontrolor testera | Tester |
| `[VERDIKT-T] <feature>` | `multiagent/verdikt` + `gate/go` \| `gate/no-go` | Kontrolor testera | Integrátor (GO) / Tester nebo Vývojář (NO-GO) | Kontrolor testera |

Všechny issues jedné feature mají label `multiagent` a v body **anchored** odkaz na samostatném řádku: `Pipeline: #<PIPELINE>`.

## Jeden pohled na pipeline (varianta C — hybrid)

Požadavek „vše v jednom issue“ (#13) byl znovu posouzen: **7-issue datový model zůstává** (gate labely, CI validace verdiktů, historie reworků, bez lost-update mezi rolemi). **Jeden pohled ke čtení** = issue `[PIPELINE]`:

- Bot (`multiagent-pipeline-sync.yml`) udržuje sekci mezi `<!-- multiagent:prehled:start -->` a `<!-- multiagent:prehled:end -->`.
- Tabulka 6 fází (issue, gate, open/closed), historie verdiktů včetně NO-GO kol, další krok + `/m #N`.
- Bot mění **jen** obsah mezi markery; ruční text Integrátora mimo markery zůstává.
- Chybí-li markery, workflow je připojí na konec body (nikdy celé body nepřepisuje).
- Lokální náhled bez Actions: `bash docs/scripts/ma-pipeline-view.sh #N` (prefix `ma-` v názvu skriptu ≠ label `ma/*`).

Single-issue model (varianta B) byl odmítnut — viz ANALÝZA #8, PR #3; varianta C nesouvisí s labely `ma/*`.

### Labely

Labely jsou v repu (`gh label list --repo <owner/repo> | rg 'multiagent|gate/'`). Integrátor je **nevytváří znovu** — jen je přiřazuje issues.

| Label | Účel |
|-------|------|
| `multiagent` | společný filtr |
| `multiagent/pipeline` | epic |
| `multiagent/analyza` | výstup analytika |
| `multiagent/implementace` | výstup vývojáře |
| `multiagent/testy` | výstup testera |
| `multiagent/verdikt` | výstup kontrolora |
| `gate/pending` | čeká na review / rework |
| `gate/go` | brána otevřená |
| `gate/no-go` | brána zavřená — předchozí role musí opravit |
| `gate/blocked` | eskalace po ~3 rework kolech |

### Gate přes Issues (závazné)

```text
GO:     verdikt issue má label gate/go; body začíná „Verdikt: GO“
        → smí vzniknout / pokračovat další produkční issue
NO-GO:  verdikt issue má label gate/no-go; body = seznam vad + odkaz na produkční issue
        → produkční issue: label gate/no-go + gate/pending, otevřený
        → předchozí role opraví body produkčního issue (verze v2…)
        → **nové** verdikt issue po opravě (staré NO-GO issue neměnit — audit trail)
```

1. Další produkční issue **nevytvářej**, dokud předchozí verdikt není `gate/go`.
2. Kontrolor **nevytváří** produkční issue a **needituje** body produkce „za“ roli — jen verdikt issue (+ labely na produkčním issue).
3. Integrátor uzavře `[PIPELINE]` až když VERDIKT-A/V/T mají všechny `gate/go`.
4. V chatovém zadání role vždy uveď: `VSTUP_ISSUE: #…` a `VÝSTUP_ISSUE: #…` (nebo „vytvoř nový dle šablony“`).

### Příkazy (Integrátor / role s právy)

```bash
# kickoff epic
gh issue create --title "[PIPELINE] <feature>" --label "multiagent,multiagent/pipeline,gate/pending" --body-file …

# produkční artefakt
gh issue create --title "[ANALÝZA] <feature>" --label "multiagent,multiagent/analyza,gate/pending" --body "Pipeline: #N\n…"

# verdikt
gh issue create --title "[VERDIKT-A] <feature> — NO-GO" --label "multiagent,multiagent/verdikt,gate/no-go" --body "Verdikt: NO-GO\nVstup: #A\n…"
```

Pokud `gh` write není dostupný v prostředí agenta, Integrátor / uživatel vytvoří issues ručně ze šablon v GitHub UI; agent do nich doplní body přes odkaz.

---

## Šablony I/O (kopíruj do zadání agenta)

Každá role používá:

```text
ROLE: <název>
MODEL: <slug>
VSTUP_ISSUE: #…   # GitHub issue = vstup
VÝSTUP_ISSUE: #…  # GitHub issue = výstup (nebo „vytvoř nový“)
GATE: …
PŘI NO-GO: …
```

Obsah artefaktu piš **do body issue** (ne jen do chatu). V chatu vrať shrnutí + odkazy na issues.

---

### 1) Analytik

```text
ROLE: Analytik
MODEL: claude-opus-5-thinking-high
VSTUP_ISSUE: #<PIPELINE>  (+ případně komentář/NO-GO z #<VERDIKT-A> při reworku)
VÝSTUP_ISSUE: #<ANALÝZA>  (vytvoř pokud neexistuje; label multiagent/analyza, gate/pending)

Do body VÝSTUP_ISSUE zapiš:
1. Cíl (1 věta)
2. Scope / mimo scope
3. API nebo UI kontrakt (request/response, stavy, chyby/HTTP)
4. Kritéria hotovo (3–5 bodů)
5. Edge cases + rizika
6. Návrh ověření (testy/lint/docker)
7. Pipeline: #<PIPELINE>

GATE: po uložení body → Kontrolor analytika čte #<ANALÝZA>
PŘI NO-GO: oprav body #<ANALÝZA> dle vad z #<VERDIKT-A>; verze (v2…); label gate/pending
NESMÍŠ: implementovat; uzavírat verdikt; git push
```

---

### 1✓) Kontrolor analytika

```text
ROLE: Kontrolor analytika
MODEL: claude-opus-5-thinking-high
VSTUP_ISSUE: #<ANALÝZA>
VÝSTUP_ISSUE: #<VERDIKT-A>  (vždy **vytvoř nové** issue pro každé kolo; label multiagent/verdikt)

Do body VÝSTUP_ISSUE:
- Verdikt: GO | NO-GO
- Vstup: #<ANALÝZA>
- Pipeline: #<PIPELINE>
- při NO-GO: číslovaný seznam vad
- při GO: krátké „proč OK“ (2–4 body)

Labely: na #<VERDIKT-A> nastav gate/go nebo gate/no-go;
na #<ANALÝZA> stejný gate label (+ gate/pending při NO-GO).

GATE:
- GO → Integrátor smí vytvořit/spustit #<IMPLEMENTACE>
- NO-GO → STOP; Analytik musí opravit #<ANALÝZA> → nový/aktualizovaný verdikt

NESMÍŠ: editovat body #<ANALÝZA> „za analytika“; kódovat; vytvořit #<IMPLEMENTACE> při NO-GO
```

---

### 2) Vývojář

```text
ROLE: Vývojář
MODEL: composer-2.5-fast
VSTUP_ISSUE: #<ANALÝZA> (musí mít gate/go + schválený #<VERDIKT-A>) + #<PIPELINE>
VÝSTUP_ISSUE: #<IMPLEMENTACE> (label multiagent/implementace, gate/pending)

Do body VÝSTUP_ISSUE:
1. Shrnutí změn
2. Seznam souborů
3. Odchylky od ANALÝZY (jen po eskalaci)
4. Ověření (příkazy + výsledek)
5. Odkazy: Pipeline #<PIPELINE>, Analýza #<ANALÝZA>
6. Unit testy: happy path + ≥1 edge case

GATE: → Kontrolor vývojáře na #<IMPLEMENTACE>
PŘI NO-GO: oprav kód + body #<IMPLEMENTACE> dle #<VERDIKT-V>
NESMÍŠ: měnit kontrakt bez eskalace; git push; start Testera bez gate/go na VERDIKT-V
```

---

### 2✓) Kontrolor vývojáře

```text
ROLE: Kontrolor vývojáře
MODEL: gpt-5.6-sol-medium
VSTUP_ISSUE: #<IMPLEMENTACE> + #<ANALÝZA>
VÝSTUP_ISSUE: #<VERDIKT-V>

Body: Verdikt GO|NO-GO, vady/OK, odkazy na vstupní issues.
Labely gate/go|gate/no-go na verdikt + implementace.

GATE: GO → Tester; NO-GO → Vývojář opraví #<IMPLEMENTACE>
NESMÍŠ: implementovat fixy; posunout dál při NO-GO
```

---

### 3) Tester

```text
ROLE: Tester
MODEL: composer-2.5-fast
VSTUP_ISSUE: #<ANALÝZA> + #<IMPLEMENTACE> (oboje po gate/go) + #<VERDIKT-V>
VÝSTUP_ISSUE: #<TESTY> (label multiagent/testy, gate/pending)

Do body:
1. Checklist scénářů mapovaný na DoD z #<ANALÝZA>
2. Soubory testů
3. Příkazy + výsledky
4. Nalezené problémy (vada produktu → ESKALACE_VÝVOJÁŘ + odkaz na #<IMPLEMENTACE>)

GATE: → Kontrolor testera
PŘI NO-GO (testy): oprav #<TESTY>
PŘI ESKALACI: Integrátor vrátí na Vývojáře (#<IMPLEMENTACE>) → znovu 2✓ → Tester
NESMÍŠ: rozšiřovat feature mimo testy
```

---

### 3✓) Kontrolor testera

```text
ROLE: Kontrolor testera
MODEL: claude-sonnet-5-thinking-high
VSTUP_ISSUE: #<TESTY> + #<ANALÝZA>
VÝSTUP_ISSUE: #<VERDIKT-T>

Body: Verdikt GO|NO-GO; případně ESKALACE_VÝVOJÁŘ.
Labely gate/go|gate/no-go.

GATE: GO → Integrátor smí uzavřít #<PIPELINE>; NO-GO → Tester nebo Vývojář dle typu vady
NESMÍŠ: psát produkční kód; uzavírat pipeline při NO-GO
```

---

### I) Integrátor

```text
ROLE: Integrátor
MODEL: composer-2.5-fast
VSTUP_ISSUE: #<PIPELINE> + #<VERDIKT-A> + #<VERDIKT-V> + #<VERDIKT-T> (vše gate/go)
VÝSTUP_ISSUE: #<PIPELINE> (update checklistu, pak close)

Postup:
1. Kickoff: pokud uživatel už má pipeline issue (např. bez `[PIPELINE]` titulku) → **doplní** titulek + labely; nové `[PIPELINE]` vytvoř **jen když žádné neexistuje**; odkaž v chatu
2. Orchestruj vytvoření produkčních/verdikt issues dle pipeline
3. Spoj kód, konflikty, finální testy/lint (Docker dle rules)
4. Commit (+ push); bez PR (repo-git.mdc)
5. Do #<PIPELINE> zapiš odkazy na commity + learning-log; zavři issue
6. docs/learning-log.md (povinně)

GATE: uzavři #<PIPELINE> jen při gate/go na A+V+T
PŘI BLOKACI (>3 reworky): komentář do #<PIPELINE> + eskalace uživateli
```

---

## Slash gramatika (spustitelné)

Skill: `.cursor/skills/m/SKILL.md` · Command: `.cursor/commands/m.md`

| Vstup | Význam |
|-------|--------|
| **`/m`** | Plná pipeline 3+3; Integrátor doplní/vytvoří `[PIPELINE]` |
| **`/m #N`** | Pokračuj v pipeline `#N`; fázi odvoď z labelů child issues |
| **`/m 2`** | Rychlá 2er: Vývojář + Kontrolor vývojáře |
| **`/m 2 #N`** | Rychlá 2er nad pipeline `#N` |

Číslo issue **vždy s `#`**. Bez `#` je `2` režim, ne issue.  
Labely `ma/*` **nezavádět** — používej `multiagent/*` + `gate/*`.

Copy-paste šablony: `docs/prompt-snippets.md`.

## Automatizace

| Co | Kde | Co dělá |
|----|-----|---------|
| Slash `/m` | `.cursor/skills/m/SKILL.md` | routing fáze → role → model; zápis do issue přes `gh` |
| Next-step bot | `.github/workflows/multiagent-next.yml` | při `opened`/`labeled` komentuje další roli + `/m #N`; marker `multiagent-next` + update |
| Pipeline sync | `.github/workflows/multiagent-pipeline-sync.yml` | auto-přehled fází v `[PIPELINE]` mezi markery `multiagent:prehled` |
| Gate check | `.github/workflows/multiagent-gate-check.yml` | validace verdiktů (formát body, labely, odkazy); komentář při chybě |
| Lokální přehled | `docs/scripts/ma-pipeline-view.sh` | stejný přehled přes `gh` když Actions nejsou dostupné |
| Labely | `docs/scripts/create-multiagent-labels.sh` | idempotentní vytvoření `multiagent/*` + `gate/*` |

**Co zůstává ruční:** spuštění agenta v Cursoru, vytvoření child issues (pokud `gh` write není), finální commit/push (Integrátor). Auto-spuštění agentů z CI vyžaduje Cursor API key → follow-up.

## Předávání kódu mezi rolemi

V oddělených agent sessions se změny Vývojáře **ztratí**, pokud nejsou v gitu. Konvence:

1. **Feature větev** pro celou pipeline.
2. Vývojář dělá **WIP commit(y)** na feature větvi (Integrátor squashne po GO).
3. **NE push** bez domluvy (Integrátor pushne po uzavření).
4. Alternativa: stejný working tree pro Vývojář → Kontrolor → Tester.

## PR #3 (uzavřít bez merge)

PR #3 navrhoval zjednodušený model `ma/*` (1 issue). **Nemergovat** — merge-base = initial commit, merge by vrátil audit `/m`, `/m 2` z `e8d6b01`. Adoptované části (skill, command, next.yml) cherry-picknuty s přemapováním na `multiagent/*` + `gate/*`. Integrátor PR #3 zavře s odkazem na ANALÝZA #8.

## Kickoff (Integrátor spouští pipeline)

Uživatel často vytvoří issue **bez** prefixu `[PIPELINE]` v titulku a **bez** labelů `multiagent/*`. Integrátor při kickoffu:

1. **Existuje už pipeline issue?** (uživatel ho vytvořil, např. #2) → **doplní** titulek `[PIPELINE] …`, labely `multiagent`, `multiagent/pipeline`, `gate/pending`.
2. **Neexistuje** → vytvoří nové `[PIPELINE]` ze šablony.
3. V obou případech vytvoří / propojí child issues dle tabulky výše.

```text
Cíl: <1 věta>
Kontext: <kde v repu + proč>
I/O: GitHub Issues (šablony .github/ISSUE_TEMPLATE/)
1) Doplň existující nebo vytvoř nové [PIPELINE] issue (titulek + labely)
2) Analytik → [ANALÝZA] → Kontrolor → [VERDIKT-A]
3) Vývojář → [IMPLEMENTACE] → Kontrolor → [VERDIKT-V]
4) Tester → [TESTY] → Kontrolor → [VERDIKT-T]
5) Integrátor uzavře [PIPELINE] jen při gate/go na všech verdiktech
Modely (default — ověř dostupnost):
- Analytik / K. analytika: claude-opus-5-thinking-high
- Vývojář / Tester / Integrátor: composer-2.5-fast
- Kontrolor vývojáře: gpt-5.6-sol-medium
- Kontrolor testera: claude-sonnet-5-thinking-high
Pravidlo: NO-GO = STOP; předchozí role opraví produkční issue; nový/aktualizovaný verdikt
Ověření: <testy/lint/docker>
Pravidla: .cursor/rules/ + repo-git (bez PR) + docs/learning-log.md
```

## Kdy použít

- Úkol má **aspoň 2 vrstvy** (analýza → kód → ověření) nebo větší změnu API/UI.
- Explicitní žádost o multi‑agent / role 3+3.

**Nepoužívat** na drobný bugfix — 1 agent + `repo-kvalita.mdc`.

Zkrácená varianta: sloučit Analytik+Vývojář, ale nechat aspoň Kontrolora vývojáře + Testera; issues ANALÝZA+IMPLEMENTACE stále odděleně pokud jde.

## Scope (povinné v každém zadání)

- scope (složky/soubory)
- mimo scope
- `VSTUP_ISSUE` / `VÝSTUP_ISSUE` (čísla nebo „vytvoř ze šablony“)
- expected output = aktualizované GitHub issue + u kontrolora verdikt GO|NO-GO

## Mapování na starší role A–D

| Dříve | Teď |
|-------|-----|
| Agent A/B Backend/Frontend | **Vývojář** → issue `[IMPLEMENTACE]` |
| Agent C Test/QA | **Tester** → issue `[TESTY]` |
| Agent D Code review | **Kontrolor vývojáře** → issue `[VERDIKT-V]` |
| (chybělo) | **Analytik** / kontroloři / **GitHub Issues jako I/O** |
