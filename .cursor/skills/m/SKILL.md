---
name: m
description: "Multi-agent pipeline — /m, /m #N, /m #N once, /m 2, /m #<bug> (orchestrace + gate/*)"
disable-model-invocation: true
---

# Multiagent `/m`

Uživatel spustil slash `/m` s volitelnými argumenty.

## Parsování argumentů

| Vstup | Režim | Chování |
|-------|-------|---------|
| `/m` | plná 3+3 | kickoff + **orchestrace** (po child issues) |
| `/m #N` | plná 3+3 | **orchestrace** od aktuální fáze do STOP |
| `/m #N once` / `/m once #N` | plná 3+3 | **jeden krok** (jen aktuální fáze) |
| `/m 2` | rychlá 2er | orchestrace Vývojář→Kontrolor V (zeptá se na pipeline) |
| `/m 2 #N` | rychlá 2er | orchestrace 2er nad `#N` |
| `/m 2 #N once` | rychlá 2er | jeden krok 2er |
| `/m #<bug>` | bug cesta | issue s `multiagent/bug` — Vývojář; viz workflow |

- `#N` = číslo GitHub issue **vždy s `#`**.
- **`2` bez `#` = režim**, ne issue.
- Token **`once`** (libovolné pořadí s `#N`) = single-step; jinak **orchestrace**.
- Chybí pipeline u `/m 2` → zeptej: „Které pipeline? Použij `/m 2 #N`.“

## Orchestrace vs once

**Default (`/m #N`):** v **jednom chatu** proveď po sobě fáze pipeline (Integrátor řídí smyčku), dokud nenastane STOP.

**Preferuj Cursor Task/subagent** pro každou roli s `MODEL:` z `docs/multi-agent-workflow.md` (sekce Modely). Kontrolor ideálně **jiný** model než produkce. Issues = zdroj pravdy (ne spoléhej jen na chat historii).

**STOP orchestrace:**

1. Verdikt `Verdikt: NO-GO` / label `gate/no-go`
2. `gate/blocked` na pipeline
3. Chybí `gh` write → degradace + STOP (text k ručnímu vložení)
4. Uživatel zadal `once`
5. Integrátor předal k ručnímu merge (`MERGE-PENDING` na `[PIPELINE]`, A+V+T GO)

**Nesmíš:** přeskočit Kontrolora; sloučit GO bez nového verdikt issue; pokračovat po NO-GO.

Po každé fázi: krátké shrnutí v chatu + odkaz na issue; pak ihned další fáze (orchestrace) nebo STOP (`once` / NO-GO).

## Kde je celkový obraz

**Čtení:** `[PIPELINE]` — markery `<!-- multiagent:prehled:start -->` … `end` (bot sync).

**Zápis:** child issue přes `gh issue edit --body-file`. **Neupravuj** obsah uvnitř markerů.

**Vazba:** samostatný řádek `Pipeline: #N` (anchored regex).

## Před akcí: `gh` write

```bash
gh auth status
```

Bez write → degradace; v orchestraci **STOP**.

## Určení fáze (7-issue model)

1. Načti pipeline `#N`
2. Čti auto-přehled v `[PIPELINE]`
3. Child issues s `Pipeline: #N`
4. Aktuální fáze = `multiagent/*` + `gate/*`:

| Label artefaktu | Gate | Role | Model (default) |
|-----------------|------|------|-----------------|
| `multiagent/pipeline` | `gate/pending` | Integrátor kickoff → Analytik | viz workflow §Modely |
| `multiagent/analyza` | `gate/pending` | Analytik | viz workflow §Modely |
| `multiagent/analyza` | `gate/no-go` | Analytik (rework) | viz workflow §Modely |
| `multiagent/verdikt` (VERDIKT-A) | `gate/pending` | Kontrolor analytika | viz workflow §Modely |
| `multiagent/implementace` | `gate/pending` | Vývojář | viz workflow §Modely |
| `multiagent/implementace` | `gate/no-go` | Vývojář (rework) | viz workflow §Modely |
| `multiagent/verdikt` (VERDIKT-V) | `gate/pending` | Kontrolor vývojáře | viz workflow §Modely |
| `multiagent/testy` | `gate/pending` | Tester | viz workflow §Modely |
| `multiagent/verdikt` (VERDIKT-T) | `gate/pending` | Kontrolor testera | viz workflow §Modely |
| `multiagent/bug` | (bez gate) | Vývojář | viz workflow §Modely |
| všechny verdikty A+V+T | `gate/go` | Integrátor → handoff `MERGE-PENDING` (ne merge do `main`) | viz workflow §Modely |

Po dokončení fáze (orchestrace): znovu načti labely / přehled → další řádek tabulky, dokud STOP.

### Režim `/m 2`

Jen Vývojář → Kontrolor V. Orchestrace default; `once` = jeden krok.

## Postup jedné role

1. Načti VSTUP: `gh issue view <num> --json body,labels,title`
2. Proveď roli dle `docs/multi-agent-workflow.md` (I/O šablony).
3. Zápis: `gh issue edit --body-file` (**ne** inline `--body`).
4. Verdikt: řádek `Verdikt: GO|NO-GO` (line-anchored).
5. Sync `gate/*` na verdikt **i** produkční issue.
6. Kontrolor **neimplementuje**.
7. **NO-GO → STOP** orchestrace.
8. Vývojář: WIP commit na feature větvi OK; **NE push** bez Integrátora. Integrátor pushuje **feature větev**, ne `main`.
9. Wiki: `docs/wiki/` + `zmeny/`; `Wiki: <cesta>`.
10. Chat: shrnutí + issue + fáze.
11. Tester: ve scope → `ESKALACE_VÝVOJÁŘ`; mimo scope → `[BUG]`.

## Rework

Max ~3 reworky. Po 3. NO-GO → `gate/blocked`.  
**Nové** `[VERDIKT-*]` každé kolo — nepřepisuj NO-GO na GO.

Nežádej dlouhé ROLE/VSTUP prompty — stačí `/m #N` nebo `/m #N once`.
