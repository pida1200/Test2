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
