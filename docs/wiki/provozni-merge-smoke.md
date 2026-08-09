# Live smoke — merge Ano (`merge/approved`)

Součást MA P3 (#103 / #114). Ověří ostrý běh `multiagent-merge.yml` po bootstrapu #81.

## Předpoklady

1. Na `main` je workflow `multiagent-merge.yml` + `multiagent-merge-task.yml`.
2. Labely: `bash docs/scripts/create-multiagent-labels.sh`  
   (vč. `multiagent/merge-review`, `merge/approved`, `merge/rejected`).
3. Branch protection dovolí push z Actions (nebo dočasně uvolni).
4. Máš účet s **≥ write** na repo.

## Postup (malá pipeline)

1. Zvol uzavřenou nebo novou mini-pipeline s A+V+T GO + `MERGE-PENDING` markerem  
   (nebo doběhni `/m #N` na drobnou změnu docs).
2. Počkej na `[MERGE] Pipeline #N — Ano / Ne?` (bot po MERGE-PENDING).
3. Na `[MERGE]` přidej label **`merge/approved`** (Ano).
4. Sleduj Actions → **Multi-agent merge**:
   - guardy G0–G6 pass
   - push do `main`
   - komentář s `wiki-sync: ok|failed|skipped`
   - `[PIPELINE]` + `[MERGE]` → `merge/done` + closed
5. Ověř: `git fetch origin && git log origin/main -1 --oneline` obsahuje merge commit.

## Ne (kontrola)

Na jiném `[MERGE]` (nebo po novém MERGE-PENDING) zkus **`merge/rejected`** — úkol se uzavře, `main` beze změny.

## Dry-run (bez push)

Actions → `Multi-agent merge` → Run workflow → `dry_run: true`, `pipeline: <N>`.
