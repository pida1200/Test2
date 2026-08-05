# Multi‑agent workflow (Cursor) – role 3+3

> **Zadání / architektura (varianta C hybrid):** [`multiagent-zadani.md`](multiagent-zadani.md)  
> **Wiki seed:** [`wiki/Home.md`](wiki/Home.md) — Issues = stav, Wiki = KB (ploché slugy `aplikacni-*` / `provozni-*` / `zmeny-*`)

Cíl: větší úkoly řešit jako **pipeline s bránami** — každá produkční role má **kontrolora**.  
**NO-GO = krok se neposune**: předchozí role musí problém vyřešit a znovu odevzdat; kontrolor znovu rozhodne.  
**1 integrátor** drží celek, testy/lint, commit + push **feature větve** a handoff `MERGE-PENDING` (**merge do `main` = člověk**; bez PR).

## Issues vs Wiki

| Obsah | Kde |
|-------|-----|
| Požadavek, stav, gate, krátký kontrakt / verdikt | **GitHub Issues** (child artefakty) |
| Delší analýza, rozhodnutí, popis řešení, changelog | **Wiki seed** [`docs/wiki/`](wiki/Home.md) |
| Technická spec, kód | **git** (`docs/`, `examples/`, větev) |
| Session / „proč“ | **Obsidian** |

**Pravidlo:** delší text → `docs/wiki/`; v issue jen shrnutí + volitelný řádek `Wiki: <cesta-bez-.md>`.  
U změny chování **povinný** záznam `zmeny-YYYY-MM-DD-…` (+ řádek v `zmeny-index.md`). Detail: [`multiagent-zadani.md`](multiagent-zadani.md) §3–§5.

---

| Role | Co dělá | Co **nedělá** |
|------|---------|----------------|
| **Analytik** | Cíl, scope, API kontrakt, kritéria hotovo, edge cases, rizika | Nekóduje, nespouští git push |
| **Kontrolor analytika** | Kontrola úplnosti a konzistence analýzy | Neimplementuje; neopravuje analýzu „za analytika“ |
| **Vývojář** | Implementace ve scope dle schválené analýzy + unit testy happy path | Nemění kontrakt bez eskalace; neřeší git push |
| **Kontrolor vývojáře** | Code review diffu | Neimplementuje |
| **Tester** | Test plán, edge/regresní testy, ověření | Nerozšiřuje feature mimo testy |
| **Kontrolor testera** | Kontrola pokrytí a kvality testů | Neimplementuje produkční kód |
| **Integrátor** | Orchestruje pipeline, konflikty, commit + push feature větve, MERGE-PENDING (tenký — bez duplicitního full check) | — |

## Modely (doporučené přiřazení — ověř dostupnost)

V Cursoru zvol model u každého chatu / sub-agenta podle tabulky. Slug = hodnota pro výběr modelu (Task / agent).  
**Ověř dostupnost slugů v Cursor Task a uveď skutečný slug v `MODEL:`.**  
Uživatel může přepsat; Integrátor v kickoffu uvede `MODEL:` u každé role.

| Role | Doporučený model | Alternativa | Proč |
|------|------------------|-------------|------|
| **Analytik** | `claude-opus-5-thinking-high` | `claude-4.5-opus-high-thinking` | silný reasoning nad kontraktem a DoD |
| **Kontrolor analytika** | `gpt-5.6-terra-medium` | `claude-4.5-opus-high-thinking` | jiná rodina než Analytik (méně self-review bias + levnější default) |
| **Vývojář** | `composer-2.5-fast` | `claude-sonnet-5-thinking-high` | implementace ve scope + základní testy |
| **Kontrolor vývojáře** | `gpt-5.6-sol-medium` | `claude-opus-5-thinking-high` | code review oddělený od implementačního modelu |
| **Tester** | `composer-2.5-fast` | `claude-sonnet-5-thinking-high` | psaní/spouštění testů, edge cases |
| **Kontrolor testera** | `claude-sonnet-5-thinking-high` | `gpt-5.6-terra-medium` | kontrola pokrytí |
| **Integrátor** | `composer-2.5-fast` | `claude-sonnet-5-thinking-high` | orchestrace, konflikty, lint/commit |

> **Poznámka:** Původní slugy (`claude-opus-4-8-thinking-high`, `composer-2.5`, `gpt-5.6-sol-high`, `gpt-5.5-high`) nejsou v Cursor Task dostupné. Tabulka výše používá ověřené náhrady.

### Pravidla výběru modelu

1. **Kontrolor ≠ stejný model jako produkce**, pokud to jde (snižuje „self-review bias“) — Analytik (Opus) vs Kontrolor A (`gpt-5.6-terra-medium`); Vývojář vs Kontrolor V.
2. **`*-fast` je legitimní**, když ne-fast alternativa neexistuje (dnes Vývojář/Tester/Integrátor). U ostatních rolí preferuj ne-fast alternativu ze sloupce Alternativa.
3. Extra těžký reasoning jen u NO-GO smyčky na analýze nebo u riskantního review.
4. V zadání každé role uveď řádek: `MODEL: <slug>`.
5. **Fallback:** pokud doporučený slug není dostupný, použij alternativu ze sloupce Alternativa. Uveď skutečný slug v `MODEL:`.

> **Kanonická tabulka modelů** = tato sekce. Rule / skill / snippets / zadání jen odkazují sem — nekopíruj slugy jinam.

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
[I] Integrátor → testy+lint → commit + push feature větve → MERGE-PENDING (člověk → main)
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
| `[BUG] <projev vady>` | `bug` + `multiagent` + `multiagent/bug` (bez `gate/*`) | Tester / Integrátor | Vývojář (mimo pipeline) / Integrátor (uzavření) | Tester / Integrátor |

Všechny issues jedné feature mají label `multiagent` a v body **anchored** odkaz na samostatném řádku: `Pipeline: #<PIPELINE>` (u `[BUG]` volitelné — jen když nález vznikl v pipeline).

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
| `multiagent/bug` | nález mimo pipeline nebo odložená vada (bez `gate/*`) |
| `gate/pending` | čeká na review / rework |
| `gate/go` | brána otevřená |
| `gate/no-go` | brána zavřená — předchozí role musí opravit |
| `gate/blocked` | eskalace po ~3 rework kolech |
| `risk/low` | na `[PIPELINE]`: nízké riziko → self-check ANALÝZY přeskočí Kontrolora A (#102, sekce „Verdikt-as-comment“) |

### Gate přes Issues (závazné)

```text
GO:     verdikt issue má label gate/go; body začíná „Verdikt: GO“
        → smí vzniknout / pokračovat další produkční issue
NO-GO:  verdikt issue má label gate/no-go; body = seznam vad + odkaz na produkční issue
        → produkční issue: label gate/no-go + gate/pending, otevřený
        → předchozí role opraví body produkčního issue (verze v2…)
        → **nové** verdikt issue po opravě (staré NO-GO issue neměnit — audit trail)
```

**Alternativa GO (#102):** místo nového `[VERDIKT-*]` issue smí být GO **komentář s
markerem** přímo na produkčním issue (`kontrola="self"` jen s `risk/low`, jinak
`kontrola="kontrolor"`) — viz sekce „Verdikt-as-comment“ níže. **NO-GO tudy nikdy** —
vždy nové `[VERDIKT-*]` issue (marker `verdikt="NO-GO"` je zakázán, fail-closed).

1. Další produkční issue **nevytvářej**, dokud předchozí verdikt není `gate/go`.
2. Kontrolor **nevytváří** produkční issue a **needituje** body produkce „za“ roli — jen verdikt issue (+ labely na produkčním issue).
3. Integrátor uzavře `[PIPELINE]` až po ručním merge (nebo explicitním pokynu); předtím A+V+T = `gate/go` + `MERGE-PENDING`.
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

## Nálezy Testera → bug issues

Princip: **ve scope a blokující = rework přes existující smyčku (žádné nové issue); mimo scope nebo odložené = `[BUG]` issue.**

| Typ nálezu Testera | `ESKALACE_VÝVOJÁŘ` v `[TESTY]` | `[VERDIKT-T]` | Nové `[BUG]` issue | Kdo opravuje |
|---|---|---|---|---|
| Vada testu / chybějící scénář (produkt je OK) | ne | NO-GO | **ne** | Tester — rework `[TESTY]` |
| Vada produktu **ve scope** pipeline (porušuje DoD z `[ANALÝZA]`) | **ano** | NO-GO + `ESKALACE_VÝVOJÁŘ` | **ne** | Vývojář — rework `[IMPLEMENTACE]` → nový `[VERDIKT-V]` → znovu Tester |
| Vada **mimo scope** (nesouvisející část, starší chyba, produkční nález) | ne | může být GO | **ano** | mimo tuto pipeline (samostatný úkol nebo nová pipeline) |
| Vada ve scope, kterou uživatel/Integrátor **vědomě odkládá** | ano | GO se zdůvodněním v `[PIPELINE]` | **ano** (known issue) | Integrátor naplánuje |

**Kdo zakládá:** Tester (má reprodukci) — odkaz do `[TESTY]` pole „Založené bug issues“. Kontrolor testera bug **nezakládá** — chybějící bug reklamuje v `[VERDIKT-T]` NO-GO. Integrátor zakládá bug u nálezů mimo pipeline a rozhoduje o odložení vady ve scope.

**Labely `[BUG]`:** titulek `[BUG] <stručný projev>`, labely `bug` + `multiagent` + `multiagent/bug`, **žádný `gate/*`**. Bug není fáze pipeline — `multiagent-pipeline-sync.yml` ho do 6fázové tabulky nezařadí.

**Uzavření:** Integrátor po ověření opravy (`Fixes #<bug>` nebo potvrzení Testera). Otevřený `[BUG]` se `Závažnost: blocker` + `Rozsah: ve scope` **brání** uzavření `[PIPELINE]`; ostatní ne — Integrátor je vypíše jako known issues mimo markery `multiagent:prehled`.

**Mimo běžící pipeline:** `[BUG]` je backlog — drobný bugfix jedním agentem dle `repo-kvalita.mdc`, nebo `/m #<bug>` (Integrátor bug povýší na `[PIPELINE]` a odebere `multiagent/bug`).

Šablona: `.github/ISSUE_TEMPLATE/multiagent-bug.yml`. Filtrování: `gh issue list --label bug --label multiagent/bug`.

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
8. Wiki: <volitelně slug v docs/wiki/ bez .md, např. aplikacni-prehled nebo zmeny-YYYY-MM-DD-slug>

GATE: po uložení body → Kontrolor analytika čte #<ANALÝZA>
PŘI NO-GO: oprav body #<ANALÝZA> dle vad z #<VERDIKT-A>; verze (v2…); label gate/pending
NESMÍŠ: implementovat; uzavírat verdikt; git push
```

---

### 1✓) Kontrolor analytika

```text
ROLE: Kontrolor analytika
MODEL: gpt-5.6-terra-medium
VSTUP_ISSUE: #<ANALÝZA>
VÝSTUP_ISSUE: #<VERDIKT-A>  (vždy **vytvoř nové** issue pro každé kolo; label multiagent/verdikt)

Do body VÝSTUP_ISSUE:
- Verdikt: GO | NO-GO
- Vstup: #<ANALÝZA>
- Pipeline: #<PIPELINE>
- Checklist (pevný, max 7 — viz `docs/ma-role-cards/kontrolor-a.md`):
  1. Scope + DoD ověřitelné
  2. Edge / fail-closed pojmenované
  3. Auth/bezpečnost má guard + test (pokud relevantní)
  4. Bootstrap/provoz checklist (nový workflow)
  5. Wiki slug + MERGE-PENDING / bez PR konzistence
  6. Labely + `Pipeline: #N`
  7. Mini-plán v ANALÝZE 1–3 věty
- při NO-GO: číslovaný seznam vad (vázané na checklist)
- při GO: krátké „proč OK“ (2–4 body)

Labely: na #<VERDIKT-A> nastav gate/go nebo gate/no-go;
na #<ANALÝZA> stejný gate label (+ gate/pending při NO-GO).

GATE:
- GO → Integrátor smí vytvořit/spustit #<IMPLEMENTACE>
- NO-GO → STOP; Analytik musí opravit #<ANALÝZA> → **nové** [VERDIKT-A] issue (nepřepisovat staré)

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
6. Wiki: <volitelně slug v docs/wiki/ bez .md>; po změně chování aktualizuj docs/wiki/ + zmeny-*
7. Unit testy: happy path + ≥1 edge case

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
VÝSTUP_ISSUE: #<VERDIKT-V>  (vždy **vytvoř nové** issue pro každé kolo; label multiagent/verdikt)

Body: Verdikt GO|NO-GO, vady/OK, odkazy na vstupní issues.
Labely gate/go|gate/no-go na verdikt + implementace.

GATE: GO → Tester; NO-GO → Vývojář opraví #<IMPLEMENTACE> → **nové** [VERDIKT-V] issue
NESMÍŠ: implementovat fixy; posunout dál při NO-GO; přepisovat existující NO-GO verdikt
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
4. Nalezené problémy — vada produktu **ve scope** → `ESKALACE_VÝVOJÁŘ` + odkaz na #<IMPLEMENTACE>; **mimo scope** nebo odložená vada → založ `[BUG]` issue (šablona multiagent-bug) a uveď # do pole „Založené bug issues“
5. Založené bug issues (#N nebo „Žádné“)

GATE: → Kontrolor testera
PŘI NO-GO (testy): oprav #<TESTY>
PŘI ESKALACI: Integrátor vrátí na Vývojáře (#<IMPLEMENTACE>) → znovu 2✓ → Tester
NESMÍŠ: rozšiřovat feature mimo testy; zakládat bug pro každý drobný nález ve scope (rework místo issue)
```

---

### 3✓) Kontrolor testera

```text
ROLE: Kontrolor testera
MODEL: claude-sonnet-5-thinking-high
VSTUP_ISSUE: #<TESTY> + #<ANALÝZA>
VÝSTUP_ISSUE: #<VERDIKT-T>  (vždy **vytvoř nové** issue pro každé kolo; label multiagent/verdikt)

Body: Verdikt GO|NO-GO; případně ESKALACE_VÝVOJÁŘ (odkaz na #<IMPLEMENTACE>) nebo odkaz na odložený `[BUG]`.
Labely gate/go|gate/no-go.

GATE: GO → Integrátor smí handoff `MERGE-PENDING` (ne auto-close); NO-GO → Tester nebo Vývojář dle typu vady → **nové** [VERDIKT-T] issue
NESMÍŠ: psát produkční kód; uzavírat pipeline při NO-GO; přepisovat existující NO-GO verdikt; **zakládat [BUG] issue** (reklamuj chybějící bug v NO-GO)
```

---

### I) Integrátor

```text
ROLE: Integrátor
MODEL: composer-2.5-fast
VSTUP_ISSUE: #<PIPELINE> + #<VERDIKT-A> + #<VERDIKT-V> + #<VERDIKT-T> (vše gate/go)
VÝSTUP_ISSUE: #<PIPELINE> (handoff MERGE-PENDING; issue zůstává OPEN)

Postup:
1. Kickoff: pokud uživatel už má pipeline issue (např. bez `[PIPELINE]` titulku) → **doplní** titulek + labely; nové `[PIPELINE]` vytvoř **jen když žádné neexistuje**; odkaž v chatu
2. Orchestruj vytvoření produkčních/verdikt issues dle pipeline (CLI first / Task)
3. Spoj kód / konflikty na feature větvi — **ne** duplicitní full `npm run check`, pokud Tester doložil zelené v `[TESTY]` (výjimka: konflikt / pochybnost); full check = merge workflow G6
4. **Ověř Wiki:** `bash docs/scripts/check-wiki-seed.sh`; u změny chování existuje záznam `docs/wiki/zmeny-…` + řádek v `zmeny-index.md`
5. Commit (+ push **feature větve**); bez PR; **nesloučuj do `main`** (repo-git.mdc)
6. docs/learning-log.md (povinně; „čeká na label `merge/approved`“)
7. Do #<PIPELINE> komentář `MERGE-PENDING` (větev, SHA, checklist pro člověka) **+ machine marker** (viz níže); label `gate/go`; **neuzavírej** issue
8. **Bug issues:** zavírá Integrátor po ověření opravy. Otevřený `[BUG]` blocker ve scope brání handoff; ostatní bugy vypiš jako known issues mimo markery `multiagent:prehled`

GATE: handoff jen při gate/go na A+V+T a bez otevřeného blocker-bugu ve scope
VÝJIMKA merge do main: jen explicitní „mergni a pushni“ v aktuální session
PŘI BLOKACI (>3 reworky): komentář do #<PIPELINE> + eskalace uživateli
```

#### MERGE-PENDING marker + merge = label v GitHubu (#81)

Merge do `main` **spouští člověk labelem `merge/approved`** na `[PIPELINE]` (workflow
`.github/workflows/multiagent-merge.yml`), ne příkazem v Cursoru. MERGE-PENDING komentář
Integrátora proto **musí** obsahovat, kromě lidsky čitelného textu, samostatný řádek
s machine markerem (parser vezme **poslední** takový komentář dle `created_at` — rework
generuje víc handoffů):

```text
<!-- multiagent-merge-pending pipeline="81" branch="feature/pipeline-81-merge-git-ukol" sha="abc1234" -->
```

Bez markeru běží tolerantní fallback na starší tvar `**Větev:** \`…\`` / `**HEAD:** \`…\``
(#74, #83) — nový handoff ale marker vždy přidává. Chybí-li obojí, guard workflow selže
(„chybí handoff“) a `main` zůstává beze změny.

Po přidání `merge/approved`: guardy G0–G6 (actor ≥ write, gate/go, G2 = VERDIKT-A/V/T GO
vyhodnoceno **jednotně** přes `verdictLib.resolveVerdictSignal()` — legacy `[VERDIKT-*]`
issue i GO komentář (#102), žádný otevřený blocker bug ve scope, HEAD větve == sha
z markeru, bezkonfliktní merge, G6 = zelený **`npm run check:merge`** — lehčí varianta
`npm run check` pro post-merge ověření, viz níže) + autorizace G7 (`authorizeRun()` —
jediná společná pro `issues.labeled` i `workflow_dispatch`, default **deny**). Po úspěchu
workflow sám: pushne do `main`,
zrcadlí wiki (`wiki-sync: ok|failed|skipped` — vždy v komentáři), odebere `merge/approved`,
přidá `merge/done`, a **uzavře** `[PIPELINE]`. Guard fail → `main` beze změny, `merge/failed`,
issue zůstává OPEN. Detail kontraktu: `docs/scripts/ma-merge-lib.cjs` + ANALÝZA #93.

#### Bootstrap checklist B0–B5 (jen jednou, při zavedení této pipeline #81)

Workflow reagující na `issues` se čte z verze na `main` a `merge/*` labely ještě
neexistují, dokud nejsou vytvořené — proto **#81 se labelem sloučit nemůže** (E14):

| # | Krok | Kdo |
|---|------|-----|
| B0 | `#81` merguje **člověk** dnešním ručním postupem (`git merge --no-ff` + push) | člověk |
| B1 | `bash docs/scripts/create-multiagent-labels.sh` | člověk / Integrátor |
| B2 | Ověřit `gh label list --search merge/` → 4 labely (`merge/approved`, `merge/done`, `merge/failed`, `wiki/sync-failed`) | člověk |
| B3 | Dry-run nad **uzavřenou** historickou pipeline (`workflow_dispatch`, `pipeline: 83`, `dry_run: true`) — běh zelený, `git log origin/main -1` beze změny | člověk |
| B4 | Zápis výsledku B0–B3 do `[PIPELINE] #81` (komentář, odkaz na běh B3) | člověk / Integrátor |
| B5 | Teprve **další** pipeline smí použít `merge/approved` ostře | — |

Detail: `docs/wiki/provozni-konfigurace.md` (sekce „Bootstrap merge labelu“) a
`docs/wiki/zmeny-2026-08-05-pipeline-81-merge-git-ukol.md`.

---

## Verdikt-as-comment + risk/low (#102)

**Cíl:** u nízkorizikových pipeline (`risk/low` na `[PIPELINE]`) přeskočit Kontrolora A a
u kterékoli fáze (A/V/T) umožnit GO bez nového `[VERDIKT-*]` issue — GO jako **komentář**
na produkčním issue. **NO-GO tudy nikdy nejde** — vždy nové `[VERDIKT-*]` issue (audit
trail zachován). Jediná implementace (parser, precedence, trust): `docs/scripts/ma-verdict-lib.cjs`
(`npm run check:ma` → `test-ma-verdict-lib.sh`, případy P1–P5 + N1–N13).

### Marker + tvar komentáře

```text
<!-- multiagent-verdikt v="1" kind="A" pipeline="100" vstup="102" verdikt="GO" kontrola="kontrolor" -->
### VERDIKT-A — GO

Pipeline: #100
Vstup: #102
Verdikt: GO

## Checklist
1. …
```

- `kind` ∈ `A`\|`V`\|`T` — musí odpovídat labelu hostitele (`multiagent/analyza` \|
  `multiagent/implementace` \| `multiagent/testy`).
- `pipeline` = číslo vyhodnocované `[PIPELINE]`; `vstup` = číslo hostitelského issue
  (komentář nejde zkopírovat na jiné issue ani „přehrát“ z jiné pipeline).
- `verdikt="GO"` — `verdikt="NO-GO"` je **vždy zakázán** (marker jen pro GO).
- `kontrola` ∈ `kontrolor`\|`self` — `self` platí **jen** s `risk/low` na `[PIPELINE]`.
- Anchored `Pipeline: #N` / `Vstup: #M` / `Verdikt: GO` v textu musí souhlasit s markerem;
  komentář nesmí obsahovat i `Verdikt: NO-GO` (dvojí verdikt = neplatné).

### Precedence + invalidace (rework)

Jedna časová osa na fázi = staré `[VERDIKT-<kind>]` issues + validní GO komentáře.
Autoritativní je **poslední** záznam (dle `created_at`); při shodném čase vítězí NO-GO.
Poslední NO-GO přebíjí libovolný starší GO. GO je **stale** (a G2/next/sync ho neuznají),
pokud na hostitelském issue existuje **novější** `labeled` event `gate/no-go` nebo
`gate/pending` — rework vždy vrací gate na `pending`, takže je to deterministický signál.

### Fail-closed trust

| Guard | Pravidlo |
|-------|----------|
| Autor | permission ≥ `write`/`admin`; chybějící/neověřitelné → deny |
| Umístění | komentář musí ležet na issue `vstup` (ne kopie) |
| Pipeline | `pipeline` v markeru musí odpovídat vyhodnocované `[PIPELINE]` (ne replay) |
| Artefakt | `kind` musí odpovídat labelu hostitele |
| Self-check | `kontrola="self"` jen s `risk/low` na `[PIPELINE]` |

Cokoli neúplné/neznámé/neověřitelné → `resolveVerdictSignal()` vrací `none`/`stale`,
**nikdy** `GO`. G2 (merge), gate-check i pipeline-sync akceptují výhradně `status === 'GO'`.

### Kdo píše self-check GO (risk/low)

U `[ANALÝZA]` s `risk/low` na `[PIPELINE]`: Integrátor/Analytik provede checklist
`docs/ma-role-cards/kontrolor-a.md` (body 1–7) sám a napíše GO komentář s
`kontrola="self"`. Bot (`multiagent-gate-check.yml`, job `validate-verdict-comment`)
ověří formát + trust a po úspěchu sám nastaví `gate/go` na `[ANALÝZA]` — next/sync pak
routují rovnou na Vývojáře (`docs/scripts/multiagent-next-lib.cjs` — `routeNextStep({ riskLow })`).

---

## Slash gramatika (spustitelné)

Skill: `.cursor/skills/m/SKILL.md` · Command: `.cursor/commands/m.md`

| Vstup | Význam |
|-------|--------|
| **`/m`** | Kickoff + **orchestrace** celé pipeline 3+3 |
| **`/m #N`** | **Orchestrace** od aktuální fáze do STOP |
| **`/m #N once`** | Jen **jeden** krok (aktuální fáze) |
| **`/m 2`** / **`/m 2 #N`** | Rychlá 2er (orchestrace; `once` = jeden krok) |
| **`/m #<bug>`** | Issue s `multiagent/bug` — Vývojář |

Číslo issue **vždy s `#`**. Bez `#` je `2` režim, ne issue.  
Labely `ma/*` **nezavádět** — používej `multiagent/*` + `gate/*`.

**Orchestrace:** jeden chat / jeden kick; **CLI first** (`docs/scripts/ma-run-role.sh` + role cards), **Task = fallback** při exitu 3. **STOP:** NO-GO, `gate/blocked`, chybí `gh` write, `once`, `MERGE-PENDING`. Kanonická gramatika: `.cursor/skills/m/SKILL.md` (tato tabulka je zrcadlo).

Copy-paste šablony: `docs/prompt-snippets.md`.

## Token budget rolí

Cíl: méně tokenů v parent chatu — role se spouští **CLI first** (`docs/scripts/ma-run-role.sh`), Task jen jako fallback (exit `3`, CLI chybí). Prompt odkazuje na **role card** (`docs/ma-role-cards/<role>.md`), ne na celý tento dokument. Mini-plán píší **jen** Analytik a Vývojář. Integrátor je **tenký** — routing + `gh` + STOP/MERGE-PENDING, ne duplicitní full check.

**Routing:** scoped / jasný DoD → `/m 2 #N`; plná 3+3 jen při nejasném API/DoD/bezpečnosti.

| Role | Mini-plán | Čte (max) | Nesmí |
|------|-----------|-----------|-------|
| Analytik | **ano** (1–3 věty v `[ANALÝZA]`) | `[PIPELINE]` + soubory ve scope + relevantní pravidla | historii `git log`, celý repo sweep |
| Kontrolor analytika | ne | `[ANALÝZA]` + `[PIPELINE]` | reimplementace, znovu-analýza scope |
| Vývojář | **ano** (1–3 věty na začátku `[IMPLEMENTACE]`) | `[ANALÝZA]` + `[VERDIKT-A]` + soubory ve scope | opakovat analýzu, číst mimo scope |
| Kontrolor vývojáře | ne | `[IMPLEMENTACE]` + `[ANALÝZA]` + `git diff` scope | spouštět full `npm run check`, opravovat kód |
| Tester | ne | DoD z `[ANALÝZA]` + `[IMPLEMENTACE]` + cílené příkazy | psát feature kód |
| Kontrolor testera | ne | `[TESTY]` + DoD | produkční kód |
| Integrátor | ne | labely + `gh issue view --json` vybraná pole | full `npm run check`, když Tester doložil zelené (výjimka: konflikt / merge) |

### Spuštění role přes skript

```bash
bash docs/scripts/ma-run-role.sh --role <role> --pipeline <N> \
     [--issue <N>] --model <slug-z-teto-sekce-Modely> [--write] [--dry-run] [--print-prompt]
```

- Detekce CLI jen přes `command -v cursor-agent` (env `CURSOR_AGENT_BIN` pro přepis binárky).
- Exit `0` OK/`--dry-run`/`--help`/`--print-prompt` · `2` usage · `3` CLI chybí → **vytiskne hotový prompt**, vlož do Cursor Task beze změny · `4` CLI selhalo (např. model nedostupný → použij Alternativu ze sloupce výše).
- `--dry-run` funguje **i bez** instalovaného `cursor-agent` (offline, testováno v `check:ma`).
- Role, které nesmí zapisovat (Analytik, kontroloři), běží bez `--write` (skript nepředá `--force`).
- **Dlouhý/visící běh CLI (E10):** skript **nemá** vlastní timeout — čeká na `cursor-agent` na popředí. Přerušení (Ctrl-C / kill procesu) řeší volající (Integrátor / terminál), ne skript.
- Detail kontraktu: `bash docs/scripts/ma-run-role.sh --help`.

## Automatizace

| Co | Kde | Co dělá |
|----|-----|---------|
| Slash `/m` | `.cursor/skills/m/SKILL.md` | orchestrace fází (default) nebo `once`; routing + zápis Issues |
| Next-step bot | `.github/workflows/multiagent-next.yml` + `docs/scripts/multiagent-next-lib.cjs` | komentář role + `/m #N` i `/m #N once` |
| Pipeline sync | `.github/workflows/multiagent-pipeline-sync.yml` | auto-přehled fází v `[PIPELINE]` mezi markery `multiagent:prehled` (modely z next-lib) |
| Gate check | `.github/workflows/multiagent-gate-check.yml` | validace verdiktů (anchored `Verdikt:`/`Pipeline:`/`Vstup:`); komentář při chybě |
| Wiki sync | `.github/workflows/wiki-sync.yml` | push `docs/wiki/**` na `main` → `sync-wiki-to-github.sh` |
| Lokální přehled | `docs/scripts/ma-pipeline-view.sh` | stejný přehled přes `gh` když Actions nejsou dostupné |
| Spuštění role | `docs/scripts/ma-run-role.sh` | CLI first (`cursor-agent`) / Task fallback (exit 3); token budget výše |
| Labely | `docs/scripts/create-multiagent-labels.sh` | idempotentní vytvoření `multiagent/*` + `gate/*` + `merge/*` + `risk/low` + `wiki/sync-failed` |
| MA check | `npm run check:ma` | pipeline-sync + regex + wiki-seed + next-lib + dry-run + ma-run-role + ma-merge-lib + **ma-verdict-lib** (offline) |
| Post-merge check | `npm run check:merge` | lehčí subset (examples-backend + wiki) pro G6 v merge workflow; plný `npm run check` zůstává pro lokální/CI ověření |
| Merge do main | `.github/workflows/multiagent-merge.yml` + `docs/scripts/ma-merge-lib.cjs` + `docs/scripts/ma-verdict-lib.cjs` | label `merge/approved` → guardy G0–G6 (G2 = jednotný verdikt signál issue/komentář) + autorizace G7 → merge `--no-ff` → push → wiki mirror → komentář + `merge/done` + close (#81; bootstrap B0–B5 do prvního ostrého použití) |

**Co zůstává ruční:** první kick `/m` / `/m #N` v Cursoru (CI agenta nespouští). Child issues pokud chybí `gh` write. **Merge do `main` spouští člověk labelem `merge/approved`** na `[PIPELINE]` (Integrátor jen feature větev + `MERGE-PENDING` handoff s markerem) — do bootstrapu B0–B5 (#81) i nadále ručně. Wiki UI sync po merge dělá workflow sám (`wiki-sync: ok|failed|skipped` v komentáři); mimo tuto cestu (dry-run, offline) po pushi na `main`. **Plně unattended z Actions** (Cursor API) = follow-up mimo scope.

## Předávání kódu mezi rolemi

V oddělených agent sessions se změny Vývojáře **ztratí**, pokud nejsou v gitu. Konvence:

1. **Feature větev** pro celou pipeline.
2. Vývojář dělá **WIP commit(y)** na feature větvi (Integrátor squashne po GO).
3. Integrátor pushne **feature větev** + handoff; **merge do `main` = člověk**.
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
5) Integrátor: handoff MERGE-PENDING (merge do main = člověk); [PIPELINE] zůstává OPEN
Modely (default — ověř dostupnost):
- Analytik: claude-opus-5-thinking-high
- Kontrolor analytika: gpt-5.6-terra-medium
- Vývojář / Tester / Integrátor: composer-2.5-fast
- Kontrolor vývojáře: gpt-5.6-sol-medium
- Kontrolor testera: claude-sonnet-5-thinking-high
Pravidlo: NO-GO = STOP; předchozí role opraví produkční issue; vždy nové VERDIKT issue každé kolo
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
