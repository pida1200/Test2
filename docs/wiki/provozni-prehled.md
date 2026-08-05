# Provozní přehled — multi-agent tooling

Jak MA **běží** v repu Test2: labely, Actions, lokální skripty, Wiki sync.

## Prostředí

| Prostředí | Účel |
|-----------|------|
| Cursor + `gh` | role `/m`, zápis Issues |
| GitHub Actions | next-step komentář, pipeline sync, gate-check, wiki-sync |
| Lokál | `npm run check` / `check:ma` / sync skript |

## Rychlé příkazy

```bash
gh auth status
bash docs/scripts/ma-pipeline-view.sh #<PIPELINE>
npm run check:ma
npm run check:wiki
bash docs/scripts/sync-wiki-to-github.sh
```

Detail konfigurace a deploy: [konfigurace](provozni-konfigurace) · [deploy](provozni-deploy) · [monitoring](provozni-monitoring).
