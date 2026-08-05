# Deploy (MA tooling + Wiki)

Bez secretů v gitu. Vzdálený deploy produktů jen na žádost.

## Wiki (publikace KB)

Zdroj pravdy = `docs/wiki/`. Po změně seedu:

```bash
bash docs/scripts/sync-wiki-to-github.sh
# DRY_RUN=1 bash docs/scripts/sync-wiki-to-github.sh
```

CI: workflow `wiki-sync.yml` při pushi `docs/wiki/**` na `main`. Od #81 je hlavní cesta merge **labelem** `merge/approved` na `[PIPELINE]` (`multiagent-merge.yml`) — ten po pushi do `main` zavolá `sync-wiki-to-github.sh` **sám ve stejném jobu** (push GITHUB_TOKENem by `wiki-sync.yml` nespustil — E11) a stav zapíše do výsledkového komentáře jako `wiki-sync: ok | failed | skipped`. Mimo tuto cestu (dry-run bootstrap, ruční merge při nedostupných Actions) platí dosavadní postup — sync po pushi na `main`. Seed v gitu je SoT i před syncem UI.

**Selhání mirroru (`wiki-sync: failed`):** merge do `main` je hotový fakt a platí i tak. Postup nápravy:

```bash
bash docs/scripts/sync-wiki-to-github.sh
```

Po úspěchu smaž label `wiki/sync-failed` z `[PIPELINE]` a zavři založený `[BUG]` follow-up (odkaz je v komentáři `multiagent-merge.yml` i v artefaktu `wiki-sync.log` daného běhu).

Publikační URL: [pida1200/Test2/wiki](https://github.com/pida1200/Test2/wiki)

### Konvence stránek (GitHub Wiki)

GitHub Wiki odvozuje slug z **basename** souboru (podadresáře ignoruje). Seed je proto **plochý**: unikátní názvy `aplikacni-prehled.md`, `provozni-deploy.md`, … Interní odkazy = holý slug bez `/`, `../` a `.md` (např. `[Přehled](aplikacni-prehled)`). Kontrola: `npm run check:wiki`.

## Multi-agent „deploy“ = labely + skripty

```bash
bash docs/scripts/create-multiagent-labels.sh   # jednorázově / idempotentně
```

Žádný Docker stack jen pro MA — stačí `gh` + Cursor.

Ukázka kódu v šabloně: `examples/backend` (`npm run check:examples-backend`).
