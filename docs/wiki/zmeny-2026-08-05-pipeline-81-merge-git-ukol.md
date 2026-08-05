# Změna: Git úkol pro merge/push (#81)

- **Pipeline:** #81
- **Datum:** 2026-08-05
- **Větev:** `feature/pipeline-81-merge-git-ukol`

## Cíl

Závěrečné sloučení feature větve do `main` spouštět jako **úkol v GitHubu** — label
`merge/approved` na `[PIPELINE]` issue — ne příkazem v Cursoru. MERGE-PENDING platí,
dokud člověk label nepřidá. Žádná cesta k zápisu do `main` (vč. `workflow_dispatch`)
tento signál nesmí obejít.

Rework (v2) po `[VERDIKT-A]` NO-GO [#94](https://github.com/pida1200/Test2/issues/94)
opravuje tři vady: (1) `workflow_dispatch` už není paralelní cesta k pushi — ostrý běh
vyžaduje stejný ověřený `merge/approved`, default je dry-run; (2) přibyl bootstrap
checklist B0–B5 (níže); (3) stav wiki mirroru (`wiki-sync: ok|failed|skipped`) je
povinná položka výsledkového komentáře.

## Dopad

### Aplikační

- Nový workflow `.github/workflows/multiagent-merge.yml`: spouštěč `issues.labeled`
  (`merge/approved`) nebo `workflow_dispatch` (fail-closed, `dry_run` default `true`).
- Guardy G0–G6 (actor ≥ write, gate/go, VERDIKT-A/V/T GO, žádný otevřený blocker bug
  ve scope, HEAD větve == sha z MERGE-PENDING markeru, bezkonfliktní merge, zelený
  `npm run check`) + autorizace G7 (`authorizeRun()` — jediná a společná pro obě cesty,
  default **deny**) v `docs/scripts/ma-merge-lib.cjs` (offline testy `test-ma-merge-lib.sh`,
  zapojené do `npm run check:ma`).
- MERGE-PENDING komentář Integrátora nese nový machine marker
  `<!-- multiagent-merge-pending pipeline="N" branch="…" sha="…" -->` (parser vezme
  poslední dle `created_at`; fallback na starší `**Větev:**`/`**HEAD:**` zůstává funkční).
- Po úspěšném merge: push do `main`, wiki mirror (`sync-wiki-to-github.sh` ve stejném
  jobu), výsledkový komentář s `wiki-sync: ok|failed|skipped`, `merge/approved` → pryč,
  `merge/done` přidán, `[PIPELINE]` **uzavřen**. Guard fail → `main` beze změny,
  `merge/failed`, issue zůstává OPEN.
- Selhání wiki mirroru **neshodí** merge — přidá se `wiki/sync-failed` + artefakt
  `wiki-sync.log` + otevřený `[BUG]` follow-up.

### Provozní

- `docs/scripts/create-multiagent-labels.sh` — nové labely `merge/approved`,
  `merge/done`, `merge/failed`, `wiki/sync-failed` (idempotentně).
- `docs/scripts/multiagent-next-lib.cjs` — hint u `multiagent/pipeline` + `gate/go`
  změněn z „čeká na ruční merge (bez akce agenta)“ na „přidej label `merge/approved`“
  (+ asserty v `test-multiagent-next-lib.sh`).
- Dokumentace sladěna: `docs/multi-agent-workflow.md`, `.cursor/skills/m/SKILL.md`,
  `.cursor/rules/multi-agenti.mdc`, `docs/prompt-snippets.md`, `docs/wiki/provozni-konfigurace.md`,
  `docs/wiki/provozni-deploy.md`.

## Bootstrap checklist B0–B5 (jen jednou)

Workflow reagující na `issues` se čte z verze na `main`, kde `merge/*` labely ještě
neexistují — proto **#81 se tímto workflow sloučit nemůže** (label se poprvé ostře
použije až na další pipeline):

| # | Krok | Kdo | Ověření |
|---|------|-----|---------|
| B0 | `#81` merguje **člověk** ručně (`git merge --no-ff` + push) | člověk | `git log origin/main -1` obsahuje merge commit #81 |
| B1 | `bash docs/scripts/create-multiagent-labels.sh` | člověk / Integrátor | příkaz doběhne bez chyby |
| B2 | `gh label list --search merge/` → 4 labely | člověk | výpis obsahuje `merge/approved`, `merge/done`, `merge/failed`, `wiki/sync-failed` |
| B3 | Dry-run nad uzavřenou historickou pipeline (`workflow_dispatch`, `pipeline: 83`, `dry_run: true`) | člověk | běh zelený, `git log origin/main -1` beze změny |
| B4 | Zápis výsledku B0–B3 do `[PIPELINE] #81` (komentář + odkaz na běh B3) | člověk / Integrátor | komentář existuje |
| B5 | Teprve nyní smí **další** pipeline použít `merge/approved` ostře | — | — |

## Odkazy

- [#81](https://github.com/pida1200/Test2/issues/81) · [#93](https://github.com/pida1200/Test2/issues/93) (ANALÝZA v2) · [#94](https://github.com/pida1200/Test2/issues/94) (VERDIKT-A NO-GO v1) · [#95](https://github.com/pida1200/Test2/issues/95) (VERDIKT-A GO v2)
- Wiki: [provozni-konfigurace](provozni-konfigurace) · [provozni-deploy](provozni-deploy)
