# Monitoring a ověření (MA)

## Lokální check

```bash
npm run check          # examples + docs + wiki + check:ma
npm run check:wiki     # struktura docs/wiki/ (vč. _Sidebar)
npm run check:ma       # pipeline-sync, regex, wiki negativní, next-lib, dry-run
bash docs/scripts/ma-pipeline-view.sh #<N>
bash docs/scripts/dry-run-multiagent-next.sh "multiagent/verdikt,gate/go" "[VERDIKT-V] x"
```

## Co sledovat v Issues

- Komentář `<!-- multiagent-next -->` — další role + model + `/m #N`
- Sekce `<!-- multiagent:prehled -->` v `[PIPELINE]` — tabulka fází
- Komentář `<!-- multiagent-gate-check -->` — chyby formátu verdiktu
- Po ≥3 NO-GO: `gate/blocked` na pipeline

## Wiki UI

Po syncu ověř Home + sidebar: [Test2 wiki](https://github.com/pida1200/Test2/wiki).  
Drift seed ↔ UI = spusť znovu `sync-wiki-to-github.sh` nebo push na `main` (wiki-sync).

## Learning log

Po větším MA běhu: `docs/learning-log.md` (Integrátor při close).
