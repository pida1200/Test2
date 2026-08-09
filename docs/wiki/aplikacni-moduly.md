# Moduly procesu (role 3+3)

„Moduly“ multi-agent toku = **role**, ne React/Node balíčky. Struktura šablony je v `AGENTS.md`.

## Produkce ↔ kontrola

| Produkce | Artefakt | Kontrola | Artefakt |
|----------|----------|----------|----------|
| Analytik | `[ANALÝZA]` | Kontrolor A | `[VERDIKT-A]` (nebo GO komentář při `risk/low`) |
| Vývojář | `[IMPLEMENTACE]` | Kontrolor V | `[VERDIKT-V]` |
| Tester | `[TESTY]` | Kontrolor T | `[VERDIKT-T]` |

**Integrátor** (tenký) orchestruje kickoff, konflikty, push **feature větve**, learning-log, handoff `MERGE-PENDING`.  
**Merge do `main`** = člověk na `[MERGE]` úkolu (Ano/Ne) — bez PR. Full check = Tester / merge G6.

## Pravidla brány

- Další fáze **jen po** `gate/go` na verdiktu (a sync na produkčním issue).
- `NO-GO` = STOP; produkční role opraví; **nové** verdikt issue každé kolo (audit).
- Kontrolor **neimplementuje** a neopravuje „za“ produkci.
- Max ~3 reworky → `gate/blocked` na pipeline.

## Bug path

- Vada **ve scope** při testech → eskalace na Vývojáře v `[TESTY]` (ne nové bug issue).
- Nález **mimo scope** / odložený → `[BUG]` (`multiagent/bug`, **bez** `gate/*`).

## Labely

`multiagent` + `multiagent/{pipeline,analyza,implementace,testy,verdikt,bug,merge-review}` + `gate/{pending,go,no-go,blocked}` + `merge/{approved,rejected,done,failed}`.  
Labely `ma/*` se **nezavádějí**.
