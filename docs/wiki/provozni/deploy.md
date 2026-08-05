# Deploy (MA tooling + Wiki)

Bez secretů v gitu. Vzdálený deploy produktů jen na žádost.

## Wiki (publikace KB)

Zdroj pravdy = `docs/wiki/`. Po změně seedu:

```bash
bash docs/scripts/sync-wiki-to-github.sh
# DRY_RUN=1 bash docs/scripts/sync-wiki-to-github.sh
```

CI: workflow `wiki-sync.yml` při pushi `docs/wiki/**` na `main` (vyžaduje bootstrap Wiki UI jednou — Create the first page).

Publikační URL: [pida1200/Test2/wiki](https://github.com/pida1200/Test2/wiki)

## Multi-agent „deploy“ = labely + skripty

```bash
bash docs/scripts/create-multiagent-labels.sh   # jednorázově / idempotentně
```

Žádný Docker stack jen pro MA — stačí `gh` + Cursor.

## Produkt (orientačně)

```bash
# mujdum — jen při změně běhu aplikace
cd mujdum && docker compose up -d --build frontend backend

# číselníky
cd ciselniky && npm run deploy && npm run check
```
