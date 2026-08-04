---
name: m
description: "Multi-agent pipeline — /m, /m #N, /m 2, /m 2 #N (7 issues + gate/*)"
disable-model-invocation: true
---

# Multiagent `/m`

Uživatel spustil slash `/m` s volitelnými argumenty.

## Parsování argumentů

| Vstup | Režim | Pipeline / cíl |
|-------|-------|----------------|
| `/m` | plná 3+3 | Integrátor kickoff — vytvoř/doplň `[PIPELINE]` |
| `/m #N` | plná 3+3 | pipeline issue `#N` |
| `/m 2` | rychlá 2er | bez pipeline — zeptej se nebo vezmi z kontextu |
| `/m 2 #N` | rychlá 2er | pipeline `#N` |

- `#N` = číslo GitHub issue **vždy s `#`** (např. `/m #9`, `/m 2 #9`).
- **`2` bez `#` = režim**, ne issue.
- Chybí pipeline u `/m 2` → zeptej: „Které pipeline? Použij `/m 2 #N`.“

## Kde je celkový obraz

**Čtení celé pipeline:** issue `[PIPELINE]` — sekce mezi markery `<!-- multiagent:prehled:start -->` … `<!-- multiagent:prehled:end -->` (udržuje `multiagent-pipeline-sync.yml`).

**Zápis:** každá role edituje **své** artefakt issue (`[ANALÝZA]`, `[IMPLEMENTACE]`, …) přes `gh issue edit --body-file`. **Neupravuj** obsah uvnitř markerů v `[PIPELINE]` — bot ho přepíše.

**Vazba na pipeline:** v body child issue musí být na **samostatném řádku** `Pipeline: #N` (CI čte anchored regex `^\s*Pipeline(?:\s+issue)?:\s*#?(\d+)\s*$`).

## Před akcí: `gh` write

```bash
gh auth status
```

Bez write scope → **degradace**: vypíš body/komentář/labely k ručnímu vložení; nefailuj v polovině.

## Určení fáze (7-issue model)

1. Načti pipeline `#N`: `gh issue view N --json body,labels,title,number`
2. **Celkový obraz** čti v `[PIPELINE]` (#N) — auto-přehled mezi markery `multiagent:prehled`.
3. Najdi child issues (body obsahuje anchored řádek `Pipeline: #N`) — nebo je uživatel na konkrétním artefaktu.
4. Fáze = label `multiagent/*` + `gate/*` na **aktuálním** artefaktu:

| Label artefaktu | Gate | Role | Model |
|-----------------|------|------|-------|
| `multiagent/pipeline` | `gate/pending` | Integrátor kickoff → Analytik | `composer-2.5-fast` |
| `multiagent/analyza` | `gate/pending` | Analytik | `claude-opus-5-thinking-high` |
| `multiagent/analyza` | `gate/no-go` | Analytik (rework) | `claude-opus-5-thinking-high` |
| `multiagent/verdikt` (VERDIKT-A) | `gate/pending` | Kontrolor analytika | `claude-opus-5-thinking-high` |
| `multiagent/implementace` | `gate/pending` | Vývojář | `composer-2.5-fast` |
| `multiagent/implementace` | `gate/no-go` | Vývojář (rework) | `composer-2.5-fast` |
| `multiagent/verdikt` (VERDIKT-V) | `gate/pending` | Kontrolor vývojáře | `gpt-5.6-sol-medium` |
| `multiagent/testy` | `gate/pending` | Tester | `composer-2.5-fast` |
| `multiagent/verdikt` (VERDIKT-T) | `gate/pending` | Kontrolor testera | `claude-sonnet-5-thinking-high` |
| všechny verdikty A+V+T | `gate/go` | Integrátor | `composer-2.5-fast` |

Alternativy: viz tabulka Modely v `docs/multi-agent-workflow.md`.  
**`*-fast` je legitimní**, když ne-fast alternativa není dostupná (dnes Vývojář/Tester/Integrátor).

### Režim `/m 2`

Jen Vývojář → Kontrolor vývojáře. Přeskoč Analytika/Testera.  
Artefakty: `[IMPLEMENTACE]` → `[VERDIKT-V]`. Pole ANALÝZA/VERDIKT-A v šabloně nejsou povinná.

## Postup role

1. Načti VSTUP issue: `gh issue view <num> --json body,labels,title`
2. Proveď **jen aktuální fázi** dle `docs/multi-agent-workflow.md` (I/O šablony).
3. Zapiš výstup do **body** cílového issue:

   ```bash
   gh issue view <num> --json body -q .body > /tmp/issue-body.md
   # edituj soubor
   gh issue edit <num> --body-file /tmp/issue-body.md
   ```

   **Nikdy** `gh issue edit --body "..."` inline — přepisuje celé body.
4. U verdiktu: body začíná `Verdikt: GO` nebo `Verdikt: NO-GO`.
5. Labely gate na verdikt **i** produkční issue (stejný `gate/go` nebo `gate/no-go`).
6. Kontrolor **neimplementuje**.
7. **NO-GO → STOP** — nepostupuj na další fázi.
8. Vývojář: WIP commit(y) na feature větvi povoleny (Integrátor squashne); **NE push** bez domluvy.
9. V chatu: shrnutí + odkaz na issue + aktuální fáze.

## Rework

Max ~3 reworky na bránu. Po 3. NO-GO → label `gate/blocked` na pipeline + eskalace Integrátorovi.

**Verdikt issue = 1 kolo (audit trail):** Kontrolor pro každé kolo review vytvoří **nové** `[VERDIKT-A|V|T]` issue. **Nepřepisuj** existující NO-GO verdikt na GO — staré issue zůstává s `Verdikt: NO-GO` v body (sync počítá NO-GO z body všech verdikt child issues, open i closed). Po opravě produkčního artefaktu → nový verdikt issue → znovu review.

## Modely — ověř dostupnost

Před spuštěním ověř slug v Cursor Task. Uveď skutečný slug v odpovědi (`MODEL:`).

| Role | Doporučený | Alternativa |
|------|------------|-------------|
| Analytik / K.A | `claude-opus-5-thinking-high` | `claude-4.5-opus-high-thinking` |
| Vývojář / Tester / Integrátor | `composer-2.5-fast` | `claude-sonnet-5-thinking-high` |
| K.V | `gpt-5.6-sol-medium` | `claude-opus-5-thinking-high` |
| K.T | `claude-sonnet-5-thinking-high` | `gpt-5.6-terra-medium` |

Nežádej dlouhé ROLE/VSTUP prompty — stačí `/m #N`.
