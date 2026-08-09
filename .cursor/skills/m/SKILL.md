---
name: m
description: "Multi-agent pipeline — /m, /m #N, /m #N once, /m 2, /m #<bug> (orchestrace + gate/*)"
disable-model-invocation: true
---

# Multiagent `/m`

Uživatel spustil slash `/m` s volitelnými argumenty.

## Parsování argumentů

Kanonická gramatika: tato tabulka. Rule / command / snippets **jen odkazují** sem.

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

**Routing (spotřeba):** scoped / drobná změna / jasný DoD → preferuj **`/m 2 #N`**. Plná 3+3 (`/m` / `/m #N`) jen při nejasném API/DoD, bezpečnosti, novém workflow nebo žádosti uživatele.

## Orchestrace vs once

**Default (`/m #N`):** v **jednom chatu** proveď po sobě fáze pipeline (Integrátor řídí smyčku), dokud nenastane STOP.

**CLI first, Task = fallback:** pro každou roli nejdřív zkus `bash docs/scripts/ma-run-role.sh --role <role> --pipeline #N` (default `--model auto`; detekuje `cursor-agent` v PATH). Exit `3` = CLI chybí → skript vytiskne hotový prompt, vlož ho do Cursor Task **beze změny**; při `MODEL: auto` použij Task `model: "inherit"`. Pin slug jen když next-bot / uživatel výslovně žádá. Role card: `docs/ma-role-cards/<role>.md` — **ne** celý workflow do kontextu.

**Mini-plán (1–3 věty) jen Analytik a Vývojář** — do body `[ANALÝZA]` / na začátek `[IMPLEMENTACE]`. Kontrolor, Tester, Integrátor plán nepíšou.

**Tenký Integrátor:** routing (`gh`), sync `gate/*`, STOP/MERGE-PENDING, commit + push feature větve. **Ne** duplicitní full `npm run check`, pokud Tester už doložil zelené v `[TESTY]` (výjimka: konflikt / merge / pochybnost).

**STOP orchestrace:**

1. Verdikt `Verdikt: NO-GO` / label `gate/no-go`
2. `gate/blocked` na pipeline
3. Chybí `gh` write → degradace + STOP (text k ručnímu vložení)
4. Uživatel zadal `once`
5. Integrátor předal handoff `MERGE-PENDING` (marker + `**Větev:**`/`**HEAD:**`) na `[PIPELINE]`, A+V+T GO — merge do `main` spustí **člověk** přidáním labelu `merge/approved` (workflow `multiagent-merge.yml`), ne agent v Cursoru

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
| `multiagent/analyza` | `gate/go` **+ `risk/low`** na `[PIPELINE]` | Vývojář (Kontrolor A přeskočen — self-check GO komentář, viz „Verdikt-as-comment“) | viz workflow §Modely |
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
2. Proveď roli dle **role card** `docs/ma-role-cards/<role>.md` (+ skill STOP). Celý `docs/multi-agent-workflow.md` jen při potřebě (Modely, MERGE-PENDING marker).
3. Zápis: `gh issue edit --body-file` (**ne** inline `--body`).
4. Verdikt: řádek `Verdikt: GO|NO-GO` (line-anchored).
5. Sync `gate/*` na verdikt **i** produkční issue.
6. Kontrolor **neimplementuje**.
7. **NO-GO → STOP** orchestrace.
8. Vývojář: WIP commit na feature větvi OK; **NE push** bez Integrátora. Integrátor pushuje **feature větev**, ne `main`.
9. Wiki: `docs/wiki/` + `zmeny/`; `Wiki: <cesta>`.
10. Chat: shrnutí + issue + fáze.
11. Tester: ve scope → `ESKALACE_VÝVOJÁŘ`; mimo scope → `[BUG]`.

## risk/low + Verdikt-as-comment (#102)

Label `risk/low` na `[PIPELINE]` přeskočí Kontrolora A — self-check (checklist
`docs/ma-role-cards/kontrolor-a.md`) a GO **komentář s markerem** na `[ANALÝZA]` (ne nové
`[VERDIKT-A]`). GO-jako-komentář smí nahradit `[VERDIKT-*]` u kterékoli fáze A/V/T; **NO-GO
má vždy vlastní issue** (audit trail). Tvar markeru + fail-closed pravidla:
`docs/multi-agent-workflow.md` (sekce „Verdikt-as-comment“); jediný parser
`docs/scripts/ma-verdict-lib.cjs`.

## Rework

Max ~3 reworky. Po 3. NO-GO → `gate/blocked`.  
**Nové** `[VERDIKT-*]` každé kolo — nepřepisuj NO-GO na GO. (Výjimka: risk/low self-check
GO na ANALÝZE je komentář, ne issue — viz výše.)

Nežádej dlouhé ROLE/VSTUP prompty — stačí `/m #N` nebo `/m #N once`.

## Token budget rolí

Kanonická tabulka (mini-plán, co role čte, co nesmí): `docs/multi-agent-workflow.md` (sekce „Token budget rolí“). Skript `docs/scripts/ma-run-role.sh --help` shrnuje kontrakt CLI/fallback.
