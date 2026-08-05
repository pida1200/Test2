# Zadání: Multi-agent workflow (varianta C — hybrid)

> **Účel:** jedno místo pro požadavek, artefakty rolí odděleně, řízení stavem pipeline.  
> **Pro agenta:** vlož jako `[PIPELINE]` issue nebo použij jako zdroj pravdy při `/m #N`.  
> **Detailní postup:** `docs/multi-agent-workflow.md` · skill `/m` · rule `.cursor/rules/multi-agenti.mdc`

---

## 1. Cíl (1 věta)

Multi-agent vývoj má mít **jedno issue jako požadavek** (`[PIPELINE]`), zatímco **výstupy rolí** žijí v **child issues**; stav pipeline se řídí **`gate/*` labely**, ne ručním sledováním 7 ticketů.

---

## 2. Kontext / problém

| Problém | Důvod |
|---------|--------|
| 7 issues bez přehledu | uživatel neví, kde je pipeline |
| 1 issue + vše v body (`ma/*`) | lost-update, slabý audit NO-GO, bez CI gate |
| Cloud agent bez Issues write | degradace — text k ručnímu vložení |

**Rozhodnutí (varianta C):** datový model **7 child issues** zůstává; **jeden pohled** = `[PIPELINE]` + bot sync.

---

## 3. Architektura (závazná)

```text
[PIPELINE] #N          ← požadavek + dashboard (čteš hlavně tohle)
    │
    ├── [ANALÝZA]      ← artefakt Analytika
    ├── [VERDIKT-A]    ← gate (GO/NO-GO), nové issue každé kolo
    ├── [IMPLEMENTACE] ← artefakt Vývojáře (+ kód v gitu)
    ├── [VERDIKT-V]
    ├── [TESTY]
    ├── [VERDIKT-T]
    └── [BUG]…         ← volitelně, mimo běžící fázi (multiagent/bug)
```

### Kde co patří

| Obsah | Kde |
|-------|-----|
| Cíl, kontext, DoD návrh, přehled fází | `[PIPELINE]` |
| Analýza, implementace shrnutí, test plán | příslušné **child issue** (body) |
| Verdikt GO/NO-GO | **nové** `[VERDIKT-*]` issue (NO-GO se needituje) |
| Kód, unit testy | **git** (větev + commit) |
| Nález mimo scope / odložený | `[BUG]` (`bug` + `multiagent/bug`) |

### Vazba child → pipeline

V body každého child issue **samostatný řádek**:

```text
Pipeline: #N
```

---

## 4. Řízení stavu (gate)

| Stav | Label | Význam |
|------|-------|--------|
| Čeká / rework | `gate/pending` | produkční artefakt se doplňuje |
| Schváleno | `gate/go` | další fáze smí začít |
| Zamítnuto | `gate/no-go` | STOP → předchozí role opraví → **nový** verdikt |
| Eskalace | `gate/blocked` | >3 reworky na bráně |

**Pravidla:**

1. Další produkční child issue **až po** `gate/go` na předchozím verdiktu.
2. Kontrolor **neimplementuje** a needituje produkční body „za“ roli.
3. Integrátor uzavře `[PIPELINE]` až když VERDIKT-A + V + T = `gate/go`.
4. NO-GO verdikt issue **neměnit** — audit trail.

---

## 5. Jeden pohled v PIPELINE (bot)

Workflow `multiagent-pipeline-sync.yml` udržuje sekci:

```html
<!-- multiagent:prehled:start -->
… tabulka 6 fází, gate, odkazy, historie verdiktů, další krok: /m #N …
<!-- multiagent:prehled:end -->
```

- Bot mění **jen** obsah mezi markery.
- Lokálně: `bash docs/scripts/ma-pipeline-view.sh #N`

---

## 6. Spuštění (UX)

| Příkaz | Režim |
|--------|--------|
| `/m` | kickoff — Integrátor vytvoří/doplní `[PIPELINE]` |
| `/m #N` | plná pipeline 3+3 na issue `#N` |
| `/m 2` | rychlá 2er (Vývojář + Kontrolor) — bez `#` = režim |
| `/m 2 #N` | rychlá 2er nad pipeline `#N` |

Po změně labelů komentuje `multiagent-next.yml` další `/m #N`.

---

## 7. Role a modely (default — ověř slug v Cursor)

| Fáze | Role | Model |
|------|------|--------|
| ANALÝZA | Analytik | `claude-opus-5-thinking-high` |
| VERDIKT-A | Kontrolor A | `claude-opus-5-thinking-high` |
| IMPLEMENTACE | Vývojář | `composer-2.5-fast` |
| VERDIKT-V | Kontrolor V | `gpt-5.6-sol-medium` |
| TESTY | Tester | `composer-2.5-fast` |
| VERDIKT-T | Kontrolor T | `claude-sonnet-5-thinking-high` |
| uzavření | Integrátor | `composer-2.5-fast` |

---

## 8. Kritéria hotovo (pro tuto feature / revizi)

- [ ] Nový požadavek jde založit šablonou **Multi-agent PIPELINE**
- [ ] `/m #N` projde fázemi bez ručního vymýšlení role
- [ ] V `[PIPELINE]` je auto-přehled (markery + sync workflow)
- [ ] Child issues mají `Pipeline: #N` a správné `multiagent/*` + `gate/*`
- [ ] NO-GO vytvoří nový verdikt; produkční issue jde do reworku
- [ ] Tester může eskalovat ve scope bez `[BUG]`; mimo scope → `[BUG]`
- [ ] Integrátor uzavře pipeline jen při GO na A+V+T
- [ ] Záznam v `docs/learning-log.md` po větším běhu

---

## 9. Mimo scope

- Změna runtime aplikace (mujdum/ciselniky) — jen pokud pipeline to explicitně vyžaduje
- Náhrada modelu `ma/*` (varianta B) — **ne**
- Vzdálený deploy bez explicitní žádosti uživatele

---

## 10. Ověření

```bash
gh label list | rg 'multiagent|gate/'
bash docs/scripts/ma-pipeline-view.sh #<PIPELINE>
# v Cursoru: /m #<PIPELINE>
```

---

## 11. Šablona pro nové `[PIPELINE]` issue (copy-paste)

```markdown
### Feature (1 věta)

<co se má udělat>

### Kontext

<cesty v repu, docs, proč>

### Kritéria hotovo (návrh)

- [ ] …
- [ ] …

### Ověření

- npm test / lint / …

<!-- multiagent:prehled:start -->
_(generuje multiagent-pipeline-sync.yml)_
<!-- multiagent:prehled:end -->
```

Po vytvoření issue spusť v Cursoru: **`/m #<číslo>`**.
