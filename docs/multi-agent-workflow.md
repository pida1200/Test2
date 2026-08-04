# Multi‑agent workflow (Cursor) – role 3+3

Cíl: větší úkoly řešit jako **pipeline s bránami** — každá produkční role má **kontrolora**, který schválí výstup dřív, než se jde dál. **1 integrátor** drží celek, testy/lint a uzavření (**commit / merge / push bez PR**).

## Role (6 + integrátor)

| Role | Co dělá | Co **nedělá** |
|------|---------|----------------|
| **Analytik** | Cíl, scope, API kontrakt, kritéria hotovo, edge cases, rizika | Nekóduje, nespouští git push |
| **Kontrolor analytika** | Kontrola úplnosti a konzistence analýzy | Neimplementuje, nepřepisuje zadání „za analytika“ bez výhrad |
| **Vývojář** | Implementace ve scope dle schválené analýzy + unit testy happy path | Nemění kontrakt bez eskalace; neřeší git push |
| **Kontrolor vývojáře** | Code review diffu (kontrakt, chyby, konvence, bezpečnost) | Neimplementuje |
| **Tester** | Test plán, edge/regresní testy, ověření příkazů | Nerozšiřuje feature mimo testy / minimální testovatelnost |
| **Kontrolor testera** | Kontrola pokrytí, chybějících scénářů, flaky rizik | Neimplementuje produkční kód |
| **Integrátor** | Orchestruje pipeline, konflikty, finální testy/lint, commit, learning-log | — |

## Pipeline (povinné brány)

```text
[1] Analytik
      ↓
[1✓] Kontrolor analytika  →  GO / změny analýzy
      ↓
[2] Vývojář
      ↓
[2✓] Kontrolor vývojáře   →  GO / fixy
      ↓
[3] Tester
      ↓
[3✓] Kontrolor testera    →  GO / doplnění testů
      ↓
[I] Integrátor            →  testy+lint, commit, learning-log
```

**Pravidlo brány:** další fáze startuje až po **GO** (nebo po zapracování připomínek a druhém GO). Připomínky bez zdůvodnění se nesmí přeskočit.

## Kdy použít

- Úkol má **aspoň 2 vrstvy** (analýza → kód → ověření) nebo větší změnu API/UI.
- Explicitní žádost uživatele o multi‑agent / role 3+3.

**Nepoužívat** na drobný bugfix / jeden soubor — stačí 1 agent + mini checklist v `repo-kvalita.mdc`.

Zkrácená varianta (když uživatel chce méně agentů): Analytik+Vývojář sloučit do jednoho chatu, ale **kontrolor vývojáře** a **tester** (nebo aspoň review + testy) nechat.

## Výstup každé role (kontrakt)

### Analytik → dokument analýzy

- Cíl (1 věta), kontext, scope / mimo scope
- API / UI kontrakt (request/response, stavy, chyby)
- Kritéria hotovo (3–5 bodů), edge cases, rizika
- Návrh ověření (jaké testy/lint)

### Kontrolor analytika → verdikt

- GO / NO-GO + 3–8 konkrétních připomínek
- Kontrola: chybějící edge case, nejasný kontrakt, scope creep, chybějící DoD

### Vývojář → diff + shrnutí

- Seznam změněných souborů
- Co ověřil (příkazy)
- Odchylky od analýzy (pokud nutně)

### Kontrolor vývojáře → verdikt

- GO / NO-GO + připomínky
- Checklist: API kontrakt, error envelope + HTTP statusy, edge cases v kódu, testy, bezpečnost (žádné secrety/citlivé logy)

### Tester → test plán / testy

- Scénáře (happy + edge + error)
- Implementované nebo navržené unit testy
- Příkazy a výsledek

### Kontrolor testera → verdikt

- GO / NO-GO + připomínky
- Kontrola: pokrytí DoD a edge cases z analýzy, asserty dávají smysl, žádné flaky / overmock

### Integrátor → uzavření

- Připomínky zapracované nebo zdůvodněné
- Relevantní testy + lint
- Sebehodnocení (`repo-kvalita.mdc`)
- Zápis do `docs/learning-log.md` (**povinně** u multi‑agent běhu)

## Šablony zadání (kopíruj)

### Kickoff pro Integrátora

```text
Cíl: <1 věta>
Kontext: <kde v repu + proč>
Pipeline: Analytik → K. analytika → Vývojář → K. vývojáře → Tester → K. testera → Integrátor
Kritéria hotovo: <3–5 bodů>
Ověření: <testy/lint/docker dle oblasti>
Pravidla: .cursor/rules/ + repo-git (bez PR) + po běhu docs/learning-log.md
```

### Analytik

```text
Jsi analytik. Nekóduj.
Scope úkolu: <složky / oblast>.
Dodrž .cursor/rules/ a AGENTS.md (návrat jen pokud je nový kontext).
Výstup:
1) cíl + scope / mimo scope
2) API nebo UI kontrakt (request/response, chyby, stavy)
3) kritéria hotovo + edge cases + rizika
4) návrh ověření
Nepřecházej do implementace.
```

### Kontrolor analytika

```text
Jsi kontrolor analytika. Neimplementuj.
Přečti výstup analytika a zhodnoť úplnost a konzistenci.
Zaměř se na: nejasný kontrakt, chybějící edge cases, scope creep, slabá DoD, chybějící ověření.
Výstup: GO nebo NO-GO + 3–8 konkrétních připomínek (co doplnit/opravit).
```

### Vývojář

```text
Jsi vývojář. Scope: <složky/soubory>.
Implementuj jen dle schválené analýzy (po GO kontrolora analytika).
Dodrž .cursor/rules/ (mujdum / ciselniky / examples dle cesty).
Přidej unit testy: hlavní tok + aspoň 1 edge case.
Výstup: shrnutí + soubory + jak ověřit.
Neřeš git push. Neměň kontrakt bez eskalace integrátorovi.
```

### Kontrolor vývojáře

```text
Jsi kontrolor vývojáře (code review). Neimplementuj.
Přečti diff oproti schválené analýze.
Zhodnoť: shoda s kontraktem, error envelope + statusy, testy, čitelnost, bezpečnost/logy.
Výstup: GO nebo NO-GO + konkrétní připomínky + doporučené fixy.
```

### Tester

```text
Jsi tester. Scope: testy a ověření chování dle analýzy + DoD.
Dodrž .cursor/rules/repo-kvalita.mdc.
Doplň/spusť testy: edge cases, chybové stavy, regrese.
Výstup: checklist scénářů + co jsi přidal/spustil + nalezené problémy.
Nerozšiřuj feature mimo testy (výjimka: minimální úprava pro testovatelnost — nahlásit).
```

### Kontrolor testera

```text
Jsi kontrolor testera. Neimplementuj produkční kód.
Přečti test plán / diff testů oproti kritériím hotovo a edge cases z analýzy.
Zhodnoť: chybějící scénáře, slabé asserty, flaky rizika, false confidence.
Výstup: GO nebo NO-GO + konkrétní připomínky.
```

## Scope (povinné v každém zadání)

- scope (složky/soubory)
- co je mimo scope
- expected output (shrnutí + soubory/dokument + verdikt GO/NO-GO u kontrolorů)

## Mapování na starší role A–D

| Dříve | Teď |
|-------|-----|
| Agent A Backend / B Frontend | **Vývojář** (případně 2 vývojáři se stejným schváleným kontraktem) |
| Agent C Test/QA | **Tester** |
| Agent D Code review | **Kontrolor vývojáře** (+ nově kontroloři analýzy a testů) |
| (chybělo) | **Analytik** + **Kontrolor analytika** |
