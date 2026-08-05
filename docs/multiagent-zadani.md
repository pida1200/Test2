# Zadání: Multi-agent workflow (varianta C — hybrid)

> **Účel:** jedno místo pro požadavek, artefakty rolí odděleně, řízení stavem pipeline; delší dokumentace mimo kód.  
> **Pro agenta:** vlož jako `[PIPELINE]` issue nebo použij jako zdroj pravdy při `/m #N`.  
> **Detailní postup:** `docs/multi-agent-workflow.md` · skill `/m` · rule `.cursor/rules/multi-agenti.mdc`  
> **Wiki seed (struktura):** `docs/wiki/`

---

## 1. Cíl (1 věta)

Multi-agent vývoj má mít **jedno issue jako požadavek** (`[PIPELINE]`), zatímco **výstupy rolí** žijí v **child issues** (stav) a **delší / trvalá dokumentace** ve **wiki seedu** (`docs/wiki/` = SoT; GitHub Wiki UI = publikační mirror); stav pipeline se řídí **`gate/*` labely**.

---

## 2. Kontext / problém

| Problém | Důvod |
|---------|--------|
| 7 issues bez přehledu | uživatel neví, kde je pipeline |
| 1 issue + vše v body (`ma/*`) | lost-update, slabý audit NO-GO, bez CI gate |
| Dlouhé artefakty v issue body | zahlcují požadavek, nepřispívají k KB řešení |
| Cloud agent bez Issues write | degradace — text k ručnímu vložení |

**Rozhodnutí (varianta C):** datový model **7 child issues** zůstává; **jeden pohled** = `[PIPELINE]` + bot sync.

**Rozhodnutí (dokumentace):**

- **Issues** = požadavek + stav + krátký kontrakt / verdikt + odkazy  
- **Wiki seed (`docs/wiki/`)** = delší artefakty a rostoucí KB (SoT v gitu)  
- **GitHub Wiki UI** = publikační mirror seedu (sync skriptem, viz §4.6)  
- **git (`docs/` + kód)** = technická spec + implementace (bez PR — přímý commit)  
- **Obsidian** = session / „proč“ (mujdum) — beze změny

Varianta B (`ma/*`) zůstává odmítnutá.

---

## 3. Architektura (závazná)

```text
[PIPELINE] #N          ← požadavek + dashboard (čteš hlavně tohle)
    │
    ├── [ANALÝZA]      ← krátký kontrakt + odkaz na Wiki / docs
    ├── [VERDIKT-A]    ← gate (GO/NO-GO), nové issue každé kolo
    ├── [IMPLEMENTACE] ← shrnutí + odkaz na commit + Wiki změna
    ├── [VERDIKT-V]
    ├── [TESTY]
    ├── [VERDIKT-T]
    ├── [BUG]…         ← volitelně (multiagent/bug)
    │
    └── Wiki (docs/wiki/ → GitHub Wiki)
            ├── aplikacni-*.md   ← co systém dělá
            ├── provozni-*.md    ← jak běží / deploy / provisioning
            └── zmeny-*.md       ← changelog podle pipeline / data
```

### Kde co patří

| Obsah | Kde |
|-------|-----|
| Cíl, kontext, DoD návrh, přehled fází | `[PIPELINE]` |
| Krátký kontrakt, verdikt, odkaz na Wiki stránku | **child issue** |
| Delší analýza, rozhodnutí, popis řešení | **Wiki** (`aplikacni-*` / `provozni-*` / `zmeny-*`) |
| Verdikt GO/NO-GO | **nové** `[VERDIKT-*]` issue |
| Kód, unit testy | **git** (větev + commit) |
| Technická API/spec v PR | **`docs/` / `mujdum/docs/`** (git) |
| Session / follow-up | **Obsidian** |
| Nález mimo scope / odložený | `[BUG]` |

### Vazba child → pipeline

V body každého child issue **samostatný řádek**:

```text
Pipeline: #N
```

Odkaz na Wiki (pokud artefakt není jen v issue):

```text
Wiki: <slug stránky, např. zmeny-2026-08-05-pipeline-34>
```

### Vazba Wiki ↔ git seed

- **Zdroj pravdy** = `docs/wiki/` v gitu (reviewovatelné v PR, strojově ověřitelné).
- **GitHub Wiki** = publikační pohled se stejnou hierarchií; sync skriptem (viz §4.6).
- **Při uzavření pipeline:** Vývojář/Integrátor aktualizuje seed v gitu (`docs/wiki/`, včetně `zmeny-*`); sync do Wiki UI (`bash docs/scripts/sync-wiki-to-github.sh`) je doporučený, ale **ne povinný** DoD běžné pipeline.
- Wiki **nenahrazuje** `gate/*` ani CI.

---

## 4. Požadavek: základní struktura Wiki

Součást DoD této pipeline (a trvalé konvence): **existuje jasná wiki struktura** se třemi oblastmi.

### 4.1 Kořen

| Stránka | Účel |
|---------|------|
| `Home` | rozcestník — odkaz na aplikační / provozní / změny |
| `_Sidebar` | navigace ve Wiki UI (REQUIRED v `check-wiki-seed.sh`) |

### 4.2 Aplikační dokumentace (`aplikacni-*`)

Popis **co produkt dělá** (pro uživatele i vývojáře):

| Stránka (návrh) | Obsah |
|-----------------|--------|
| `aplikacni-prehled` | účel produktu, hlavní entity, hranice systému |
| `aplikacni-moduly` | FE / BE / DB / integrace (stručně) |
| `aplikacni-uzivatelske-scenare` | klíčové use-cases |

### 4.3 Provozní / provisioning dokumentace (`provozni-*`)

Popis **jak to běží a nasazuje se**:

| Stránka (návrh) | Obsah |
|-----------------|--------|
| `provozni-prehled` | prostředí (lokál / Docker / server), porty |
| `provozni-deploy` | lokální compose, vzdálený deploy **jen na žádost** |
| `provozni-konfigurace` | env proměnné (bez secretů), závislosti |
| `provozni-monitoring` | health endpointy, logy, typické incidenty |

### 4.4 Jednotlivé změny (`zmeny-*`)

Chronologický / podle pipeline záznam **co se změnilo**:

| Stránka (návrh) | Obsah |
|-----------------|--------|
| `zmeny-index` | seznam změn (odkaz na stránky + `#PIPELINE`) |
| `zmeny-YYYY-MM-DD-<slug>` | jedna změna: cíl, dopad, odkaz na `#PIPELINE`, commit, rizika |

Šablona stránky změny:

```markdown
# Změna: <název>

- **Pipeline:** #<N>
- **Datum:** YYYY-MM-DD
- **Commit / větev:** …

## Cíl
…

## Dopad (aplikační / provozní)
…

## Odkazy
- ANALÝZA / IMPLEMENTACE issues
- relevantní Wiki stránky (aktualizované)
```

### 4.5 Seed v repu

Požadovaná výchozí struktura (soubory):

```text
docs/wiki/
  Home.md
  _Sidebar.md
  aplikacni-prehled.md
  aplikacni-moduly.md
  aplikacni-uzivatelske-scenare.md
  provozni-prehled.md
  provozni-deploy.md
  provozni-konfigurace.md
  provozni-monitoring.md
  zmeny-index.md
  zmeny-sablona.md
  zmeny-YYYY-MM-DD-….md
```

> GitHub Wiki odvozuje slug z **basename** — seed musí být **plochý** (žádné podadresáře), unikátní názvy, interní odkazy bez `/` a `.md`.
Agent (Integrátor / Analytik) **nesmí** nechat strukturu prázdnou bez `Home` a indexů — minimálně stub s 2–3 větami + „TODO“.

### 4.6 Inicializace a sync GitHub Wiki

- **Zdroj pravdy** = `docs/wiki/` v gitu (reviewovatelné v PR, strojově ověřitelné).
- **Bootstrap (jednou):** GitHub Wiki git (`<repo>.wiki.git`) vznikne až po založení první stránky ve Wiki UI (`/wiki` → Create the first page → Save, název `Home`). Push do neexistujícího `.wiki.git` selže.
- **Sync seed → Wiki UI** (po bootstrapu, vyžaduje `gh auth`):

```bash
bash docs/scripts/sync-wiki-to-github.sh
# DRY_RUN=1 bash docs/scripts/sync-wiki-to-github.sh   # commit bez push
```

- Skript ověří seed (`check-wiki-seed.sh`), naklonuje `.wiki.git`, nahradí obsah `docs/wiki/` a pushne.
- Publikační URL: `https://github.com/pida1200/Test2/wiki`
- Odkazy ve seedu jsou **bez přípony `.md`** (GitHub Wiki slug); české popisky zůstávají v textu stránek.
- `_Sidebar.md` v seedu = navigace v Wiki UI.

---

## 5. Řízení stavu (gate)

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
5. Delší text → Wiki / `docs/wiki/`; v issue jen shrnutí + `Wiki: …`.

---

## 6. Jeden pohled v PIPELINE (bot)

Workflow `multiagent-pipeline-sync.yml` udržuje sekci:

```html
<!-- multiagent:prehled:start -->
… tabulka 6 fází, gate, odkazy, historie verdiktů, další krok: /m #N …
<!-- multiagent:prehled:end -->
```

- Bot mění **jen** obsah mezi markery.
- Lokálně: `bash docs/scripts/ma-pipeline-view.sh #N`

---

## 7. Spuštění (UX)

| Příkaz | Režim |
|--------|--------|
| `/m` | kickoff + **orchestrace** celé pipeline |
| `/m #N` | **orchestrace** od aktuální fáze do STOP |
| `/m #N once` | jen **jeden** krok |
| `/m 2` / `/m 2 #N` | rychlá 2er (orchestrace; `once` = jeden krok) |
| `/m #<bug>` | issue s `multiagent/bug` — Vývojář |

Bot `multiagent-next.yml` komentuje `/m #N` i `/m #N once`. CI **nespouští** Cursor.

---

## 8. Role a modely

**Modely (kanonická tabulka):** [`docs/multi-agent-workflow.md`](multi-agent-workflow.md) — sekce Modely. Sem nekopíruj slugy.

**Wiki při rolích:**

| Role | Wiki povinnost |
|------|----------------|
| Analytik | odkaz na cílovou Wiki stránku / návrh aktualizace `aplikacni-*` nebo `provozni-*` |
| Vývojář | po změně chování aktualizovat `docs/wiki/` (+ `zmeny-…`) |
| Integrátor | ověřit seed strukturu; doplnit `zmeny-index`; sync poznámka do PIPELINE |

---

## 9. Kritéria hotovo

- [ ] Nový požadavek jde založit šablonou **Multi-agent PIPELINE**
- [ ] `/m #N` projde fázemi bez ručního vymýšlení role
- [ ] V `[PIPELINE]` je auto-přehled (markery + sync workflow)
- [ ] Child issues mají `Pipeline: #N` a správné `multiagent/*` + `gate/*`
- [ ] NO-GO vytvoří nový verdikt; produkční issue jde do reworku
- [ ] Tester může eskalovat ve scope bez `[BUG]`; mimo scope → `[BUG]`
- [ ] Integrátor uzavře pipeline jen při GO na A+V+T
- [ ] **Existuje `docs/wiki/` se strukturou Home + ploché `aplikacni-*` / `provozni-*` / `zmeny-*`**
- [ ] **Každá uzavřená větší změna má záznam `zmeny-*` + odkaz z PIPELINE**
- [ ] Záznam v `docs/learning-log.md` po větším běhu

---

## 10. Mimo scope

- Změna runtime aplikace (mujdum/ciselniky) — jen pokud pipeline to explicitně vyžaduje
- Náhrada modelu `ma/*` (varianta B) — **ne**
- Wiki jako náhrada Issues / `gate/*` — **ne**
- Vzdálený deploy bez explicitní žádosti uživatele
- Secrets / hesla ve Wiki nebo issue body

---

## 11. Ověření

```bash
gh label list | rg 'multiagent|gate/'
bash docs/scripts/ma-pipeline-view.sh #<PIPELINE>
ls docs/wiki/Home.md docs/wiki/aplikacni-prehled.md docs/wiki/provozni-prehled.md docs/wiki/zmeny-index.md
bash docs/scripts/check-wiki-seed.sh
bash docs/scripts/sync-wiki-to-github.sh   # po bootstrapu Wiki UI
# v Cursoru: /m #<PIPELINE>
```

---

## 12. Šablona pro nové `[PIPELINE]` issue (copy-paste)

```markdown
### Feature (1 věta)

<co se má udělat>

### Kontext

<cesty v repu, docs, proč>
Wiki / docs: dle docs/multiagent-zadani.md (Issues = stav, Wiki = KB)

### Kritéria hotovo (návrh)

- [ ] …
- [ ] docs/wiki struktura + záznam `zmeny-*` (pokud mění chování)

### Ověření

- npm test / lint / …
- ls docs/wiki/…

<!-- multiagent:prehled:start -->
_(generuje multiagent-pipeline-sync.yml)_
<!-- multiagent:prehled:end -->
```

Po vytvoření issue spusť v Cursoru: **`/m #<číslo>`**.
