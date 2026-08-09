# Learning log (Cursor)

Krátké záznamy po významnějších krocích. Slouží jako:

- historie rozhodnutí a “proč”
- seznam technického dluhu / rizik
- backlog dalších kroků

## Kdy psát nový záznam

**Ano:** změny v `.cursor/rules/`, multi-agent běh, větší refaktor, incident (infra/produkce), učení v `examples/`.

**Ne (stačí odpověď v chatu):** drobný bugfix / typo. Větší úlohy raději do Obsidianu (`projekty/<projekt>/session-…`) nebo learning-logu.

Pravidlo: `repo-kvalita.mdc`.

## Šablona záznamu

```text
### YYYY-MM-DD – <název kroku>
- Výsledek: …
- Ověření: …
- Riziko: …
- Další krok: …
```

## Záznamy

### 2026-08-09 – /m #114 (P3) IMPLEMENTACE: cursor-agent, branch protection, smoke

- Výsledek: `docs/scripts/check-ma-env.sh` (+ test); wiki `provozni-cursor-agent`,
  `provozni-branch-protection`, `provozni-merge-smoke`, zmeny P3. CLI nainstalováno
  lokálně v Cloud VM — flagy `-p/--output-format/--model/--force` sedí s `ma-run-role.sh`.
  Issues write stále 403 → child issues vytvořeny create-only; labely = člověk.
- Ověření: `npm run check:ma`; `PATH=… bash docs/scripts/check-ma-env.sh`
- Riziko: ostrý live smoke merge musí udělat člověk; branch protection API 403 z Cloud.
- Další krok: labely na #114 + child; Ano na `[MERGE]` až po push feature větve.

### 2026-08-09 – Wiki seed sync: Auto + Task-first + merge Ano/Ne

- Výsledek: aktualizovány Home, Sidebar, aplikacni-*, provozni-* podle Auto modelů,
  Task-first orchestrace a `[MERGE]` Ano/Ne; `npm run check:wiki` + sync na GitHub Wiki.
- Ověření: `npm run check:wiki`; `bash docs/scripts/sync-wiki-to-github.sh` (pokud token dovolí)
- Riziko: mirror na UI vyžaduje Wiki enabled + token s push do `.wiki.git`
- Další krok: po merge PR ověřit [Test2 wiki](https://github.com/pida1200/Test2/wiki)

### 2026-08-09 – Merge jako GitHub úkol Ano/Ne

- Výsledek: po MERGE-PENDING bot založí `[MERGE] … Ano / Ne?` (assignee). Ano =
  `merge/approved` (na `[MERGE]` nebo `[PIPELINE]`), Ne = `merge/rejected`. Labely
  `multiagent/merge-review` + `merge/rejected`; workflows merge-task + úprava merge.yml.
- Ověření: `npm run check:ma`; `bash docs/scripts/create-multiagent-labels.sh`
- Riziko: Actions musí běžet (veřejné repo OK); assignee jen pokud autor pipeline ≠ bot.
- Další krok: po dalším MERGE-PENDING ověřit, že `[MERGE]` dorazí do Assigned.

### 2026-08-09 – Obnova orchestrace Task-first (řetězení fází)

- Výsledek: po #83 „CLI first“ agent často skončil u exit 3 / one-lineru a nepokračoval.
  Skill/command/rule znovu: Task/subagent ihned, exit 3 ≠ STOP, mezi fázemi se neptat.
  Next-bot: `/m #N` před CLI. Wiki `zmeny-2026-08-09-ma-orchestrace-task-first`.
- Ověření: `npm run check:ma`
- Riziko: bez otevřeného `/m #N` chatu CI pořád nespouští Cursor (mimo scope).
- Další krok: ověřit `/m #<pipeline>` bez `once` — Analytik→…→MERGE-PENDING v jednom běhu.

### 2026-08-09 – MA default modely → Cursor Auto (+ pin Grok/Composer)

- Výsledek: default `MODELS` = `auto` u všech rolí; `MODELS_PINNED` drží Grok/Composer.
  `ma-run-role.sh`: `--model` volitelné (default auto) — při auto se CLI flagu `--model`
  nepředává. Docs/snippets/skill/rule/wiki sync.
- Ověření: `npm run check:ma`
- Riziko: Auto negarantuje kontrolor ≠ produkce; pin přes `--model <slug>` / `MODELS_PINNED`.
- Další krok: merge PR; ověřit next-bot one-liner `--model auto` a Task `inherit`.

### 2026-08-05 – Rework IMPLEMENTACE #106 po VERDIKT-V NO-GO #107 (fail-closed marker)

- Výsledek: `parseVerdictComment()` v `docs/scripts/ma-verdict-lib.cjs` opraven —
  místo `matchAll(ATTR_RE)` (které tiše přeskočilo nezachycený token, takže marker
  s platnými povinnými atributy a přívěskem `bypass=1` vracel `valid: true`) teď
  parser skenuje celý obsah markeru a hlídá mezery mezi shodami; jakýkoli
  nerozpoznaný/nequoted/malformed token mimo `v`, `kind`, `pipeline`, `vstup`,
  `verdikt`, `kontrola` je nová chyba „Nerozpoznaný obsah markeru“ → `valid: false`,
  `reason: 'atributy'` (fail-closed, žádný jiný kontrakt nezměněn).
- Ověření: 2 nové negativní testy N14a (`bypass=1`) a N14b (malformed token bez
  `=`/uvozovek) v `test-ma-verdict-lib.sh`; `npm run check` PASS (backend 10/10,
  markdownlint 0, wiki seed OK, `check:ma` vč. všech verdict-lib testů).
- Riziko: žádné nové — čistě zúžení validace, zpětně kompatibilní se všemi
  existujícími pozitivními/negativními fixtures (P1–P5, N1–N13 beze změny).
- Další krok: nový Kontrolor vývojáře (VERDIKT-V) nad `feature/pipeline-100-ma-p2`.
- Vstup: [VERDIKT-V NO-GO #107](https://github.com/pida1200/Test2/issues/107)
- Větev: `feature/pipeline-100-ma-p2`

### 2026-08-05 – IMPLEMENTACE #100 (P2): Verdikt-as-comment + risk/low + check:merge

- Výsledek: dle ANALÝZA [#102](https://github.com/pida1200/Test2/issues/102) v2 (GO
  [#105](https://github.com/pida1200/Test2/issues/105)) — nová sdílená knihovna
  `docs/scripts/ma-verdict-lib.cjs` (marker `multiagent-verdikt`, parser, fail-closed
  trust guardy, `resolveVerdictSignal()` = jednotná časová osa legacy `[VERDIKT-*]`
  issues + GO komentářů s precedencí a detekcí `stale` po rework) + `test-ma-verdict-lib.sh`
  (P1–P5, N1–N13) zapojené do `check:ma`. Napojeno na G2 v `ma-merge-lib.cjs`
  (`evaluateGuards` přijímá `verdictSignals`, fallback na legacy `verdicts`),
  `multiagent-merge.yml`, `multiagent-gate-check.yml` (nový job `validate-verdict-comment`),
  `multiagent-next.yml` a `multiagent-pipeline-sync.yml`. Label `risk/low`
  (`create-multiagent-labels.sh`) → `routeNextStep({ riskLow })` v
  `multiagent-next-lib.cjs` přeskočí Kontrolora A u `multiagent/analyza`+`gate/go`.
  `package.json`: nový `check:merge` (lehčí subset pro G6 v merge workflow) + `check:ma`
  doplněn o verdict-lib testy. Docs sladěny (`multi-agent-workflow.md` — nová sekce
  „Verdikt-as-comment + risk/low“, `SKILL.md`, `multi-agenti.mdc`,
  `docs/ma-role-cards/kontrolor-a.md` — self-check proces).
- Ověření: `npm run check` (vč. `check:ma` s novými `test-ma-verdict-lib.sh` a
  rozšířenými `test-ma-merge-lib.sh` / `test-multiagent-next-lib.sh`).
- Riziko: workflow YAML (`multiagent-gate-check.yml`, `multiagent-merge.yml`,
  `multiagent-pipeline-sync.yml`, `multiagent-next.yml`) validován jen manuální kontrolou
  struktury (bez `js-yaml`/`pyyaml` v prostředí) — ostrý běh na GitHubu ještě neproběhl.
  Verdikt-as-comment nese fail-closed trust, ale je to nová, dosud neprocvičená cesta.
- Další krok: Kontrolor vývojáře (VERDIKT-V), pak Tester; první ostré použití
  `risk/low` self-check GO komentáře ověřit na reálném issue.
- Wiki: `zmeny-2026-08-05-pipeline-100-ma-p2-risk-low`
- Větev: `feature/pipeline-100-ma-p2`

### 2026-08-05 – MA quality + token P0–P1 (revize spotřeba)

- Výsledek: P0 — sync Další krok = `merge/approved`; Integrátor bez full check; Kontrolor A = `gpt-5.6-terra-medium`; gate-check maže stale; merge `shaMatches` (≥7) + G4b pipeline=. P1 — `docs/ma-role-cards/`, tenký `ma-run-role` prompt, next-bot CLI one-liner, `/m 2` routing, dedupe gramatika ve skillu, checklist KA, smazán Scope-first snippet. P2 založen jako samostatný `[PIPELINE]` (risk/low, verdikt-as-comment, check:merge).
- Ověření: `npm run check` (vč. rozšířených `test-ma-merge-lib` / `test-multiagent-next-lib` / `test-ma-run-role`).
- Riziko: `cursor-agent` stále často mimo PATH; live ostrý merge na nové pipeline ještě neběžel po těchto guard změnách.
- Další krok: merge feature větve (label `merge/approved` nebo ručně); pak P2 pipeline [#100](https://github.com/pida1200/Test2/issues/100).
- Wiki: `zmeny-2026-08-05-ma-quality-token-p0-p1`
- P2 issue: [#100](https://github.com/pida1200/Test2/issues/100) `[PIPELINE] MA P2 — risk/low, verdikt-as-comment, check:merge`

### 2026-08-05 – /m #81 IMPLEMENTACE: merge/push jako Git úkol (label `merge/approved`)

- Výsledek: nový `.github/workflows/multiagent-merge.yml` (spouštěč `issues.labeled` `merge/approved` nebo `workflow_dispatch`, fail-closed — `dry_run` default `true`, ostrý běh vyžaduje stejný ověřený `merge/approved`) + čisté funkce `docs/scripts/ma-merge-lib.cjs` (`parseMergePending`, `authorizeRun`, `evaluateGuards`, `composeResultComment`) s offline testy `test-ma-merge-lib.sh` (24 případů) zapojenými do `check:ma`; `create-multiagent-labels.sh` doplněn o `merge/approved`, `merge/done`, `merge/failed`, `wiki/sync-failed`; `multiagent-next-lib.cjs` hint u `multiagent/pipeline`+`gate/go` změněn na „přidej label `merge/approved`“ (+ nový assert v `test-multiagent-next-lib.sh`); dokumentace sladěna (`multi-agent-workflow.md` — MERGE-PENDING marker + bootstrap checklist B0–B5, `SKILL.md`, `multi-agenti.mdc`, `prompt-snippets.md`, `m.md`) a wiki (`provozni-konfigurace.md`, `provozni-deploy.md`, nový `zmeny-2026-08-05-pipeline-81-merge-git-ukol` + index).
- Ověření: `npm run check` zelené (`check:examples-backend` + `check:docs` + `check:wiki` + `check:ma` vč. nového `test-ma-merge-lib.sh`); logiku `multiagent-merge.yml` jsem navíc ověřil mimo CI přes mocknuté simulace (`github`/`context`/`core`/`child_process.execSync`) pro 5 scénářů — dry-run report-only (žádný zásah do issue), plný úspěšný merge + wiki-sync ok, wiki-sync failed (follow-up issue + label), guard fail (VERDIKT-V NO-GO → `merge/failed`, `main` beze změny) a G7 deny (`workflow_dispatch dry_run:false` bez `merge/approved`) — všech 5 se chovalo dle kontraktu #93.
- Riziko: samotný GitHub Actions běh (checkout, `git merge --no-ff`, `npm ci`, push, `sync-wiki-to-github.sh`) nebyl a nemohl být spuštěn v tomto prostředí (chybí `gh` Actions runner) — ověřeno jen logikou/mocky, ne živým během; první reálné ověření je až bootstrap B0–B5 po ručním merge #81. `contents: write` na nechráněném `main` zůstává rizikem popsaným v analýze — jediná pojistka jsou guardy G0–G7.
- Další krok: Kontrolor vývojáře → `[VERDIKT-V]`; poté Tester. Po GO: bootstrap B0–B5 (člověk) — teprve pak smí další pipeline použít `merge/approved` ostře.
- Stav: implementace hotová na `feature/pipeline-81-merge-git-ukol`, pushnuto; `[IMPLEMENTACE]` issue vytvořeno, `#81` má komentář s odkazem. Merge do `main` **NE** — čeká na `[VERDIKT-V]`/`[VERDIKT-T]` GO a poté bootstrap B0 (ruční merge člověkem).

### 2026-08-05 – /m #83 IMPLEMENTACE: MA CLI first + token budget

- Výsledek: nový `docs/scripts/ma-run-role.sh` (CLI first přes `cursor-agent`, Task fallback při exitu 3, exit kódy 0/2/3/4, `--dry-run`/`--print-prompt` bez binárky); skill/rule/command aktualizované na CLI first + tenký Integrátor + mini-plán jen Analytik/Vývojář; `docs/multi-agent-workflow.md` má novou sekci „Token budget rolí“; wiki `provozni-konfigurace` + nový `zmeny-2026-08-05-pipeline-83-ma-cli-tokeny` + index; `prompt-snippets.md` sladěn na `MERGE-PENDING` (#74).
- Ověření: `npm run check` zelené (`check:examples-backend` + `check:docs` + `check:wiki` + `check:ma` vč. nového `test-ma-run-role.sh`, 17 offline případů); `cursor-agent` **není** v PATH tohoto stroje — ověřeno degradací na exit 3 s vytištěným promptem, ne skutečným CLI během.
- Riziko: přesnost CLI flagů (`-p --output-format text --model … [--force]`) není ověřena proti reálné instalaci `cursor-agent` — až bude dostupná, ověřit `cursor-agent --help` a případnou odchylku zapsat sem.
- Další krok: Kontrolor vývojáře → `[VERDIKT-V]`; poté Tester.
- Stav: čeká na review (VERDIKT-V), pak testy; handoff `MERGE-PENDING` až po A+V+T GO.

### 2026-08-05 – /m #83 IMPLEMENTACE rework 1/3 dle VERDIKT-V NO-GO #88

- Výsledek: doplněny dva chybějící body z #88 beze změny kontraktu #85 — nový offline test v `test-ma-run-role.sh` (dočasná falešná binárka přes `mktemp -d`, exit 1 + stdout/stderr) ověřující `ma-run-role.sh` → exit `4` a beze zásahu zachovaný výstup CLI (17→20 offline případů); stručná dokumentace E10 (dlouhý/visící CLI běh nemá interní timeout, přerušení řeší volající) v hlavičce/`usage()` `ma-run-role.sh`, `docs/multi-agent-workflow.md` a wiki `provozni-konfigurace.md` (sekce Degradace).
- Ověření: `npm run check` zelené vč. `check:ma` / `test-ma-run-role.sh` (20/20).
- Riziko: beze změny oproti #87 — CLI flagy stále neověřené proti reálné instalaci `cursor-agent`.
- Další krok: nový Kontrolor vývojáře (VERDIKT-V) přes `/m #83`.
- Stav: commit `a8b85bc` na `feature/pipeline-83-ma-cli-tokeny`, pushnuto; #87 label `gate/no-go` → `gate/pending`.

### 2026-08-05 – /m #83 TESTY rework dle VERDIKT-T NO-GO #91

- Výsledek: opravena nepřesná evidence v #90 — tvrzení „21/21“ nahrazeno ověřitelným popisem (12 testovacích scénářů → 20 viditelných `OK` řádků na stdout, exit 0); produkční kód beze změny.
- Ověření: opakovaný běh `bash docs/scripts/test-ma-run-role.sh` → 20× `OK`, `ma-run-role.sh testy passed.`, exit 0; konzistentní s předchozím záznamem výše („20/20“).
- Riziko: beze změny — CLI flagy stále neověřené proti reálné instalaci `cursor-agent`.
- Další krok: nový Kontrolor testera (VERDIKT-T) přes `/m #83`.
- Stav: #90 label `gate/no-go` → `gate/pending`; žádný commit produkčního kódu, žádný merge.

### 2026-08-05 – archiv větve cursor/multiagent-role-gates-187d

- Výsledek: remote větev smazána; tip `11294bb` uložen jako tag `archive/cursor-multiagent-role-gates-187d` (raný MA / 1-issue model, mimo main).
- Ověření: `git ls-remote` — branch pryč, tag na origin.
- Riziko: žádné — obsah supersedován 7-issue modelem na main.
- Další krok: volitelně smazat i sloučené `feature/*` remote refs (úklid).

### 2026-08-05 – /m #74 MERGE-PENDING: merge do main jen člověk

- Výsledek: Integrátor končí push feature větve + komentář `MERGE-PENDING`; agent nesloučí do `main` (výjimka: explicitní „mergni a pushni“).
- Ověření: VERDIKT-A #76 / V #78 / T #80 GO; `npm run check`.
- Riziko: hromadění nesloučených `feature/*`; Wiki UI sync až po lidském pushi na `main`.
- Další krok: člověk `git merge feature/pipeline-74-merge-clovek` → push → zavřít #74.
- Stav: čeká na ruční merge do main.

### 2026-08-05 – /m #66 uzavřeno: šablona jen multi-agent

- Výsledek: z HEAD odstraněny produktové stromy a rules + SonarCloud; AGENTS/README/docs/wiki generické; `package.json` = `multiagent-template`.
- Ověření: VERDIKT-A #68 / V #71 (po reworku #70) / T #73 GO; `npm run check`; sweep mimo learning-log prázdný.
- Riziko: blobs zůstávají v git historii (BFG mimo scope); pravidlo mimo repo `Programovani/.cursor/rules/ciselniky-docker.mdc` může dál vnucovat kontext; staré `feature/*` větve mohou při merge vzkřísit soubory.
- Další krok: volitelně GitHub „Template repository“; uzavřít/rebase staré feature větve.

### 2026-08-05 – /m #51 uzavřeno: wiki flat slugy + link checks

- Výsledek: seed `docs/wiki/` zploštěn (unikátní basename = GitHub Wiki slug); sidebar/odkazy bez `/`/`../`/`.md`; `check-wiki-seed` + negativní testy; sync UI.
- Ověření: VERDIKT-A #61 / V #63 / T #65 GO; `npm run check` (docs/wiki/ma); HTTP smoke po syncu.
- Riziko: staré URL (`/wiki/prehled`, nested cesty) jsou mrtvé — GH Wiki redirecty neumí.
- Další krok: v nové dokumentaci vždy používat ploché slugy; checker blokuje regression.

### 2026-08-05 – /m #52 uzavřeno: orchestrace `/m #N` + once

- Výsledek: default `/m #N` = orchestrace fází do STOP; `/m #N once` = jeden krok. Skill/rule/command/docs + next-bot dual prompt; wiki `prehled`/`scénáře`/`provozni` + `zmeny/…#52`.
- Ověření: VERDIKT-A #54 / V #57 (po reworku #56) / T #59 GO; `check:docs`+`wiki`+`ma` zelené; Tester #58.
- Riziko: orchestrace stále vyžaduje otevřený Cursor chat (CI→Cursor API mimo scope); dlouhý kontext → preferovat Task per role.
- Další krok: ověřit v praxi `/m #<pipeline>` bez `once` na další feature.

### 2026-08-05 – /m #44 uzavřeno: kompletní wiki MA (funkční + provozní)

- Výsledek: vyplněn wiki seed (`aplikacni/` + `provozni/` + Home/`_Sidebar` + `zmeny/…#44`); na `main` i MA revize A–C (next-lib, `check:ma`, `wiki-sync.yml`, dedupe modelů). Wiki UI syncnuta.
- Ověření: VERDIKT-A #46 / V #48 / T #50 GO; `npm run check` zelený; Tester #49.
- Riziko: větev byla merge bez squash (2 commity) — historie čitelná.
- Další krok: ověřit CI `wiki-sync.yml` po pushi `docs/wiki/**` na main.

### 2026-08-05 – Revize MA setup (optimalizace A–C)

- Výsledek: dokumentační pravda (Wiki UI + AGENTS mapa + terminologie seed vs UI); jedna kanonická tabulka modelů; next-lib + unify Pipeline RE; `check:ma`; template body kontrakt; `_Sidebar` REQUIRED; `wiki-sync.yml`.
- Ověření: `npm run check` (+ `check:ma`); sync Wiki po opravě `zmeny/`.
- Riziko: wiki-sync CI potřebuje token s push do `.wiki.git`.
- Další krok: ověřit první CI běh wiki-sync po pushi `docs/wiki/**`.

### 2026-08-05 – Publikace GitHub Wiki z docs/wiki/

- Výsledek: bootstrap Home ve Wiki UI → vznikl `pida1200/Test2.wiki.git`; skript `docs/scripts/sync-wiki-to-github.sh` + `_Sidebar.md`; seed syncnut na https://github.com/pida1200/Test2/wiki; §4.6 aktualizován o sync příkaz.
- Ověření: `git ls-remote …Test2.wiki.git` OK; sync push `179f6db`; Home „Wiki — rozcestník“ + sidebar (10 stránek).
- Riziko: bootstrap UI je jednorázový (API/.git push bez první stránky nejde); sync vyžaduje `gh auth`.
- Další krok: ~~volitelně CI/workflow na sync~~ → fáze C revize (`wiki-sync.yml`).

### 2026-08-05 – /m #34 uzavřeno: Hybrid MA + Wiki KB (varianta C)

- Výsledek: gap analysis potvrdila hybrid na main; dokončen Wiki seed (ASCII `aplikacni`/`provozni`/`zmeny`), Wiki pravidla v rules/skill, `check:wiki` + negativní test. `docs/wiki/` = zdroj pravdy; Wiki UI sync = follow-up.
- Ověření: VERDIKT-A #37 GO; VERDIKT-V #39→#40 GO; VERDIKT-T #42→#43 GO; `npm run check` zelený.
- Riziko: GitHub Wiki UI ještě nemusí být založená.
- Další krok: ~~volitelně publikovat seed do Wiki UI~~ → **[done]** publikace + sync (viz záznam výše).

### 2026-08-05 – Wiki seed + rozhodnutí Issues vs Wiki v MA zadání

- Výsledek: `docs/multiagent-zadani.md` — Issues = stav/gate, Wiki = delší artefakty + KB; požadavek na strukturu `docs/wiki/` (Home, aplikační/, provozní/, zmeny/); seed stránky vytvořeny.
- Ověření: strom `docs/wiki/` v gitu; odkazy v AGENTS.md a multi-agent-workflow.md.
- Riziko: GitHub Wiki je oddělený git — seed v `docs/wiki/` je pravda v PR; sync do Wiki UI je manuální/Integrátor.
- Další krok: `/m #34` + doplnit labely na PIPELINE; při uzavření změny zapsat `zmeny/…`.

### 2026-08-05 – Zadání MA varianty C (hybrid) v docs/multiagent-zadani.md

- Výsledek: formální zadání — 1× `[PIPELINE]` jako požadavek, child issues jako artefakty, `gate/*` stav, `/m #N`, kritéria hotovo + copy-paste šablona PIPELINE.
- Ověření: odkaz z `docs/multi-agent-workflow.md` a `AGENTS.md`.
- Riziko: duplicita s workflow.md — zadání je shrnutí pro kickoff, detail zůstává ve workflow.
- Další krok: vytvořit `[PIPELINE]` z šablony a spustit `/m #N`.

### 2026-08-05 – /m #25: nálezy testera → [BUG] issues

- Výsledek: kontrakt „ve scope + blokující = ESKALACE_VÝVOJÁŘ (bez nového issue); mimo scope / odloženo = `[BUG]`“ s labely `bug`+`multiagent`+`multiagent/bug` (bez gate/*). Šablona `multiagent-bug.yml`, routing v `multiagent-next.yml`, docs/rules/skill/snippets.
- Ověření: VERDIKT-A #27 GO → VERDIKT-V #29 GO → VERDIKT-T #31 GO; Tester #30 8/8; dry-run bug→Vývojář; sync 11/11.
- Riziko: živý smoke test `[BUG]` na GitHubu až po push.
- Další krok: po merge ověřit komentář bota na testovacím bug issue.

### 2026-08-04 – /m #13/#17: hybrid „jeden pohled“ (ne single-issue)

- Výsledek: požadavek „vše v jednom issue“ → **varianta C**: 7 issues zůstává zápis/gate; `[PIPELINE]` dostane auto-přehled (`multiagent-pipeline-sync.yml` + markery `multiagent:prehled`). Oprava `multiagent-next.yml` (anchored Pipeline regex, marker dedupe). Single-issue (B) znovu odmítnuto (gate labely, lost update, historie, CI) — konzistentní s #8/PR #3.
- Ověření: VERDIKT-A #18 GO; VERDIKT-V #20/#21 NO-GO → #22 GO; VERDIKT-T #24 GO; `test-pipeline-sync` 11/11; Tester #23 9/9.
- Riziko: E2E Actions až po push; souběh řešen re-fetch/retry.
- Další krok: po merge ověřit sync + next na živém issue.

### 2026-08-04 – /m #8–#9: automatizace multi-agent workflow (3+3)

- Výsledek: doplněn spustitelný `/m` (`.cursor/commands/m.md` + `.cursor/skills/m/SKILL.md`), verifikované model slugy, `multiagent-next.yml` + `multiagent-gate-check.yml`, šablony ANALÝZA/IMPLEMENTACE/VERDIKT, `gate/blocked`, dry-run skript, poctivý `npm run check` wrapper. PR #3 zavřen bez merge (stale merge-base, `ma/*` odmítnuto; adoptovány jen skill/command/next přemapované na `multiagent/*`).
- Ověření: VERDIKT-A #10 GO → VERDIKT-V #14 GO (po NO-GO #12) → VERDIKT-T #16 GO; Tester #15 10/10; `npm run check:docs` 0; dry-run next OK.
- Riziko: E2E Action dedupe až po push workflows; auto-spouštění agentů z CI (Cursor API key) mimo scope.
- Další krok: po merge ověřit zelený run `multiagent-next` na test issue; případně Cursor secret pro auto-kick.

### 2026-08-04 – /m 2 ostrý běh: revize multiagent setup (#2)

- Výsledek: audit + opravy docs/rules — slash aliasy `/m` a `/m 2`, kickoff Integrátora (doplnit existující vs vytvořit), fallback modelů (ne-fast Alternativa; `*-fast` jen bez alternativy nebo rework); labely `multiagent*`/`gate*` založeny. Pipeline #2 → IMPLEMENTACE #4 → NO-GO #5/#6 → GO #7 (2er).
- Ověření: VERDIKT-V #7 `gate/go`; konzistence rule ↔ workflow ↔ prompt-snippets; `gh label list` 9 labelů.
- Riziko: doporučené slugy (composer-2.5, gpt-5.6-sol-high) nemusí být v Cursor Task — fallback nutný; Kontrolor byl přísný na formulace (2× NO-GO).
- Další krok: merge `feature/multiagent-setup-review` do main (bez PR dle domluvy) + případně ostrý `/m` 3+3 na runtime feature.

### 2026-08-04 – CI: SonarCloud ciselniky job při chybějícím projektu

- Výsledek: `test-coverage-ciselniky` padal na `setup-node` cache (`ciselniky/package-lock.json` neexistuje). Jobi mujdum/ciselniky i scan mají `if: hashFiles('…/package-lock.json') != ''`.
- Ověření: lokálně složka `ciselniky/` v Test2 chybí; po pushi CI má ciselniky skipnout.
- Riziko: až se ciselniky znovu objeví v repu, job se automaticky zapne.
- Další krok: počkat na zelený check na PR #1.

### 2026-08-04 – Multi-agent I/O přes GitHub Issues

- Výsledek: vstupy/výstupy rolí = GitHub Issues (`[PIPELINE|ANALÝZA|VERDIKT-*|IMPLEMENTACE|TESTY]`); labely `multiagent/*` + `gate/go|no-go|pending`; šablony v `.github/ISSUE_TEMPLATE/`; I/O šablony rolí používají `VSTUP_ISSUE`/`VÝSTUP_ISSUE`.
- Ověření: docs + issue templates v gitu; labely je potřeba založit v GitHub UI / `gh label create`.
- Riziko: cloud agent může mít `gh` read-only — Issues pak zakládá uživatel/Integrátor ručně ze šablon.
- Další krok: vytvořit labely v repo a vyzkoušet kickoff na jedné feature.

### 2026-08-04 – Multi-agent: doporučené modely podle role

- Výsledek: tabulka role → model (Analytik/K.A: Opus 4.8; Vývojář/Tester/Integrátor: Composer 2.5; K. vývojáře: GPT-5.6 Sol; K. testera: GPT-5.5); pravidlo kontrolor ≠ produkční model kde to jde.
- Ověření: `docs/multi-agent-workflow.md`, `multi-agenti.mdc`, `prompt-snippets.md`.
- Riziko: dostupnost slugů závisí na Cursor plánu/týmu — při chybějícím modelu použij Alternativu z tabulky.
- Další krok: ostrý běh s `MODEL:` v zadání každé role.

### 2026-08-04 – Multi-agent I/O šablony + rework při NO-GO

- Výsledek: u každé role (vč. Integrátora) šablona VSTUP / VÝSTUP / GATE / PŘI NO-GO; NO-GO = STOP a předchozí produkční role musí vyřešit vady, pak znovu stejný kontrolor; eskalace z testů zpět na vývojáře.
- Ověření: `docs/multi-agent-workflow.md`, `multi-agenti.mdc`, `prompt-snippets.md` sladěny.
- Riziko: bez disciplíny Integrátora lze bránu přeskočit — rule to výslovně zakazuje.
- Další krok: ostrý běh na konkrétní feature.

### 2026-08-04 – Multi-agent role 3+3 (analytik / vývojář / tester + kontroloři)

- Výsledek: pipeline s bránami GO — Analytik→K. analytika→Vývojář→K. vývojáře→Tester→K. testera→Integrátor; aktualizováno `docs/multi-agent-workflow.md`, `.cursor/rules/multi-agenti.mdc`, `docs/prompt-snippets.md`.
- Ověření: konzistence šablon a role tabulky napříč třemi soubory; bez změny runtime kódu.
- Riziko: 6 agentů je drahé na drobné úkoly — rule zůstává „jen na explicitní žádost“; zkrácená 2er varianta v prompt-snippets.
- Další krok: vyzkoušet ostrý běh na konkrétní feature (např. examples/backend nebo mujdum endpoint).

### 2026-06-27 – Projekt audi zrušen

- Výsledek: lokální projekt `audi/` (interní auditní aplikace) smazán z disku; odstraněno pravidlo `.cursor/rules/audi.mdc`; `AGENTS.md` bez odkazu na audi. V gitu nikdy nebyl commitnutý.
- Ověření: složka `cursor/audi/` neexistuje; `git ls-files audi/` prázdné.
- Riziko: žádné — šlo o necommitnutý WIP.
- Další krok: —

### 2026-05-17 – Paměť projektu pro agenty (AGENTS.md, návrat, session)

- Výsledek: `AGENTS.md`, `docs/navrat-k-projektu.md`, `docs/session-template.md`, rule `repo-navrat.mdc`; odkazy v README, `repo-kvalita`, Obsidian/mujdum rules; sekce v `mujdum/docs/sport.md`.
- Ověření: pravidla alwaysApply u `repo-navrat`; šablony v gitu sladěny s Obsidian `session-template.md`.
- Riziko: nízké — agent musí checklist skutečně provést; uživatel může doplnit Cursor Memories.
- Další krok: po větší session plnit Obsidian session + commit; při návratu použít prompt z `docs/navrat-k-projektu.md`.

### 2026-05-16 – mujdum Docker: lokálně standard, vzdáleně jen na žádost

- Výsledek: `mujdum-docker.mdc` — tabulka lokální vs. vzdálený, zákaz proaktivního `deploy-remote.sh`; `repo-kvalita.mdc` + `infra.mdc` sladěny.
- Ověření: pravidla v `.cursor/rules/`.
- Riziko: nízké — agent dřív občas nasazoval na `192.168.1.123` bez dotazu.
- Další krok: při deployi na server explicitní fráze od uživatele.

### 2026-05-16 – Obsidian: proaktivnější pravidla (obecně + mujdum)

- Výsledek: `obsidian-prace-programovani.mdc` — default používat MCP bez výzvy; `mujdum-obsidian-workflow.mdc` — povinný hub/session před/po, zápis středních i větších úloh; `repo-kvalita.mdc` + `mujdum.mdc` doplněny do postupu a DoD.
- Ověření: pravidla v `.cursor/rules/`; technická spec zůstává v gitu, session v `projekty/mujdum/`.
- Riziko: víc kroků na úkol; výjimka explicitní „bez Obsidianu“.
- Další krok: u každé mujdum feature session append + věta v odpovědi s odkazem na note.

### 2026-05-16 – mujdum: povinné lokální Docker nasazení po implementaci

- Výsledek: `mujdum-docker.mdc` zpřesněno — agent po změně FE/BE sám spustí `docker compose up -d --build frontend backend` a ověří health; `repo-kvalita.mdc` DoD doplněn o tento krok.
- Ověření: lokální deploy po úpravě pravidel — backend/frontend `200` na `:3001` / `:3000`.
- Riziko: delší čas dokončení úkolu u velkých rebuildů; výjimka jen docs / explicitní „bez docker“.
- Další krok: držet se pravidla u každé mujdum implementace; vzdálený server jen na žádost.

### 2026-05-13 – refaktor `.cursor/rules/` (A–D)

- Výsledek: nová pravidla `mujdum.mdc`, `repo-git.mdc`, `repo-kvalita.mdc`, `infra.mdc`, `mujdum-docker.mdc`, `examples-architektura.mdc`; zkrácený Obsidian; multi-agent jen na žádost; docs bez PR; smazány staré `architektura`, `kvalita-a-zpetna-vazba`, `prace-s-gitem`, `playbook-odkazy`, `mujdum-local-docker`.
- Ověření: ruční kontrola `.cursor/rules/` a odkazů v `mujdum/README.md`, `docs/multi-agent-workflow.md`.
- Riziko: Cursor může cacheovat staré názvy pravidel do příští session.
- Další krok: v další session ověřit, že agent na úkolu v `mujdum/` spouští správné testy a docker dle nových rules.

### 2026-04-21 – examples/backend: konzistentní chyby + 404

- Výsledek: přidaný konzistentní error response `{ error: { code, message } }`, 404 handler a error middleware.
- Ověření: `cd examples/backend && npm test` + `npm run lint`.
- Riziko: zatím chybí strukturované logování/trace pro 500 (jen obecná odpověď).
- Další krok: přidat ukázkový endpoint s validací vstupu přes `zod` + testy pro 400 (invalid input).

### 2026-04-21 – nastavení multi‑agent workflow + code review role

- Výsledek: přidané šablony pro práci s více agenty a pravidlo pro povinný code review agent u větších změn.
- Ověření: ruční kontrola šablon v `docs/multi-agent-workflow.md` + pravidel v `.cursor/rules/multi-agenti.mdc`.
- Riziko: bez discipliny integrátora může dojít k rozbití konvencí nebo duplicitním změnám (nutná jasná scope hranice).
- Další krok: na příštím úkolu spustit paralelně “Backend implementace” + “Code review agent” a zapracovat připomínky před PR.

### 2026-04-21 – multi‑agent run: POST /echo + review + zapracování připomínek

- Výsledek: přidaný `POST /echo` s validací Zod a jednotným error envelope (`error.issues`), doplněné mapování invalid JSON (400) a payload too large (413) + rozšířené testy (hraniční délky, `{}`, chybějící body).
- Ověření: `cd examples/backend && npm test` + `npm run lint`.
- Riziko: zatím chybí server-side strukturované logování pro 500 (ne do response), a konvence pro error kódy není centralizovaná.
- Další krok: přidat ukázkový “business” endpoint s validací query/path params + testy pro edge cases a případně centralizovat error codes do jedné konstanty.

### 2026-04-21 – zpřesnění pravidel: DoD + scope guard + review gate

- Výsledek: doplněný Definition of Done, scope guard a mini review checklist; u multi‑agent práce přidané scope hranice a review gate; do architektury doplněná konvence error envelope.
- Ověření: ruční kontrola změn v `.cursor/rules/` a návaznosti na workflow.
- Riziko: příliš “tvrdá” pravidla mohou zpomalit triviální úkoly (v praxi používat DoD rozumně).
- Další krok: udělat malé PR jen na změny v `.cursor/rules/` a vyzkoušet na 1 dalším úkolu, jestli to nezvyšuje režii.

### 2026-04-21 – efektivita: jednotný `npm run check` + prompt snippets

- Výsledek: přidaný root `package.json` s `npm run check` (test+lint) a prompt šablony v `docs/prompt-snippets.md`.
- Ověření: `npm run check` v rootu.
- Riziko: pokud přibydou další example projekty, bude potřeba rozšířit `check:all`.
- Další krok: až přidáš další `examples/*`, doplnit je do `check:all` a udržet jednotné skripty napříč repem.

### 2026-04-21 – prompt: scope‑first + 2 agenti (rychlá verze)

- Výsledek: doplněná rychlá copy‑paste šablona pro 2 agenty (implementace + code review) se striktním scope.
- Ověření: ruční kontrola `docs/prompt-snippets.md`.
- Riziko: pokud scope nebude konkrétní, agenti budou zasahovat mimo (nutné vyjmenovat složky/soubory).
- Další krok: použít šablonu na dalším úkolu a vyhodnotit, jestli zrychluje iteraci bez ztráty kvality.

### 2026-04-21 – pravidla vs docs: playbook odkazy

- Výsledek: přidané pravidlo `.cursor/rules/playbook-odkazy.mdc`, které vysvětluje, co patří do `.cursor/rules/` (krátké závazné) a co do `docs/` (delší playbooky).
- Ověření: ruční kontrola odkázaných souborů v `docs/`.
- Riziko: duplicita informací (nutné držet `docs/` a rules konzistentní).
- Další krok: při větších změnách workflow upravit primárně `docs/` a do rules dát jen krátké “závazné” shrnutí + odkaz.

### 2026-04-21 – template repo: checklist pro nové projekty

- Výsledek: doplněný “Template checklist” do `README.md` pro nové repozitáře založené z template.
- Ověření: ruční kontrola `README.md`.
- Riziko: checklist je generický – pro konkrétní stack bude chtít doplnit (DB/migrace/CI).
- Další krok: při vytvoření prvního skutečného projektu z template upravit checklist na míru stacku (npm scripts, CI, release proces).
