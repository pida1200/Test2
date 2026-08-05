# Provozní přehled — multi-agent tooling

Jak MA **běží** v repu Test2: labely, Actions, lokální skripty, Wiki sync.

## Prostředí

| Prostředí | Účel |
|-----------|------|
| Cursor + `gh` | role `/m`, zápis Issues |
| GitHub Actions | next-step komentář, pipeline sync, gate-check, wiki-sync |
| Lokál | `npm run check` / `check:ma` / sync skript |

## Služby (kontext monorepa)

MA dokumentace neběží jako app. Orientační porty produktů:

| Služba | Port |
|--------|------|
| mujdum FE / BE / DB / ES | 3000 / 3001 / 5434 / 9200 |
| číselníky FE / BE / DB | 3020 / 3011 / 5435 |

## Rychlé příkazy

```bash
gh auth status
bash docs/scripts/ma-pipeline-view.sh #<PIPELINE>
npm run check:ma
npm run check:wiki
bash docs/scripts/sync-wiki-to-github.sh
```

Detail konfigurace a deploy: [konfigurace](konfigurace) · [deploy](deploy) · [monitoring](monitoring).
