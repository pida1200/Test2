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

### Konvence stránek (GitHub Wiki)

GitHub Wiki odvozuje slug z **basename** souboru (podadresáře ignoruje). Seed je proto **plochý**: unikátní názvy `aplikacni-prehled.md`, `provozni-deploy.md`, … Interní odkazy = holý slug bez `/`, `../` a `.md` (např. `[Přehled](aplikacni-prehled)`). Kontrola: `npm run check:wiki`.

## Multi-agent „deploy“ = labely + skripty

```bash
bash docs/scripts/create-multiagent-labels.sh   # jednorázově / idempotentně
```

Žádný Docker stack jen pro MA — stačí `gh` + Cursor.

Ukázka kódu v šabloně: `examples/backend` (`npm run check:examples-backend`).
