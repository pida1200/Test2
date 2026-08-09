# Deploy (MA tooling + Wiki)

Bez secretů v gitu. Vzdálený deploy produktů jen na žádost.

## Wiki (publikace KB)

Zdroj pravdy = `docs/wiki/`. Po změně seedu:

```bash
bash docs/scripts/sync-wiki-to-github.sh
# DRY_RUN=1 bash docs/scripts/sync-wiki-to-github.sh
```

CI: workflow `wiki-sync.yml` při pushi `docs/wiki/**` na `main`.

Hlavní cesta merge = **Ano** na `[MERGE]` úkolu (`merge/approved` → `multiagent-merge.yml`). Ten po pushi do `main` zavolá `sync-wiki-to-github.sh` **sám ve stejném jobu** (push `GITHUB_TOKEN`em by `wiki-sync.yml` nespustil) a stav zapíše jako `wiki-sync: ok | failed | skipped`. Mimo tuto cestu: sync po pushi na `main` nebo ručně skriptem.

**Selhání mirroru (`wiki-sync: failed`):** merge do `main` platí. Náprava:

```bash
bash docs/scripts/sync-wiki-to-github.sh
```

Po úspěchu smaž `wiki/sync-failed` a zavři `[BUG]` follow-up.

Publikační URL: [pida1200/Test2/wiki](https://github.com/pida1200/Test2/wiki)

### Konvence stránek (GitHub Wiki)

Seed je **plochý** (basename = slug). Interní odkazy bez `/`, `../` a `.md`. Kontrola: `npm run check:wiki`.

## Multi-agent „deploy“ = labely + skripty

```bash
bash docs/scripts/create-multiagent-labels.sh   # vč. multiagent/merge-review, merge/rejected
```

Žádný Docker stack jen pro MA — stačí `gh` + Cursor.

Ukázka kódu: `examples/backend` (`npm run check:examples-backend`).
