# Změna: Merge jako GitHub úkol Ano/Ne

- **Datum:** 2026-08-09
- **Navazuje na:** #81 (merge/approved na PIPELINE)
- **Dotčené:** `multiagent-merge-task.yml`, `multiagent-merge.yml`, `ma-merge-lib.cjs`, labely, šablona issue

## Shrnutí

Po `MERGE-PENDING` bot založí issue **`[MERGE] Pipeline #N — Ano / Ne?`** (assignee = autor pipeline).

| | Label | Výsledek |
|---|--------|----------|
| **Ano** | `merge/approved` | merge do `main` |
| **Ne** | `merge/rejected` | úkol uzavřen, bez merge |

Ano funguje i na `[PIPELINE]` (zpětná kompatibilita).
