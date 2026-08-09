# Provozní přehled — multi-agent tooling

Jak MA **běží** v repu Test2: labely, Actions, lokální skripty, Wiki sync.

## Prostředí

| Prostředí | Účel |
|-----------|------|
| Cursor + `gh` | `/m #N` orchestrace (Task), zápis Issues |
| GitHub Actions | next, pipeline-sync, gate-check, **merge-task** (Ano/Ne), merge, wiki-sync |
| Lokál | `npm run check` / `check:ma` / sync skript |

## Rychlé příkazy

```bash
gh auth status
bash docs/scripts/check-ma-env.sh
bash docs/scripts/create-multiagent-labels.sh
bash docs/scripts/ma-pipeline-view.sh #<PIPELINE>
npm run check:ma
npm run check:wiki
bash docs/scripts/sync-wiki-to-github.sh
```

## Merge Ano/Ne (zkráceně)

Po `MERGE-PENDING` → Assigned issue `[MERGE] … Ano / Ne?` → label `merge/approved` nebo `merge/rejected`.  
Detail: [konfigurace](provozni-konfigurace) · [zmeny-2026-08-09-ma-merge-ano-ne](zmeny-2026-08-09-ma-merge-ano-ne).

Detail: [konfigurace](provozni-konfigurace) · [deploy](provozni-deploy) · [monitoring](provozni-monitoring).
