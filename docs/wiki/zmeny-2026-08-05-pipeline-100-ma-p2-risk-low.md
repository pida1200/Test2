# Změna: Verdikt-as-comment + risk/low (#100, ANALÝZA #102 v2)

- **Pipeline:** #100
- **Datum:** 2026-08-05
- **Větev:** `feature/pipeline-100-ma-p2`

## Cíl

Dvě zrychlení MA pipeline beze ztráty auditovatelnosti a fail-closed principu:

1. **Verdikt-as-comment** — GO verdikt (kterékoli fáze A/V/T) může vzniknout jako
   speciálně formátovaný komentář s markerem přímo na produkčním issue, ne jen jako
   nové `[VERDIKT-*]` issue. **NO-GO tudy nikdy nejde** — vždy nové `[VERDIKT-*]` issue
   (audit trail zachován).
2. **`risk/low`** label na `[PIPELINE]` — u nízkorizikových pipeline přeskočí Kontrolora A;
   Integrátor/Analytik provede self-check a napíše GO komentář s `kontrola="self"`.

## Dopad

### Aplikační

- Nová sdílená knihovna `docs/scripts/ma-verdict-lib.cjs`: parser markeru
  `<!-- multiagent-verdikt v="1" kind="A|V|T" pipeline="N" vstup="M" verdikt="GO"
  kontrola="kontrolor|self" -->`, validace anchored řádků (`Pipeline:`/`Vstup:`/`Verdikt:`)
  proti markeru, fail-closed trust guardy (autor ≥ write/admin, umístění, pipeline/vstup/kind
  match, `kontrola="self"` jen s `risk/low`) a `resolveVerdictSignal()` — jednotná časová osa
  z legacy `[VERDIKT-*]` issues + GO komentářů, precedence „poslední vyhrává, NO-GO při shodě“,
  detekce `stale` GO po novějším `gate/no-go`/`gate/pending` labelu (rework). Testy
  `test-ma-verdict-lib.sh` (P1–P5 pozitivní, N1–N13 negativní), zapojené do `npm run check:ma`.
- `docs/scripts/ma-merge-lib.cjs` (G2): `evaluateGuards` nově přijímá `verdictSignals`
  (výstup `resolveVerdictSignal`) a vyžaduje `status === 'GO'` pro A/V/T; legacy `verdicts`
  vstup zůstává jako fallback pro zpětnou kompatibilitu.
- `.github/workflows/multiagent-merge.yml`: G2 počítá `verdictSignals` přes
  `verdictLib.resolveVerdictSignal()` (issues + komentáře + label historie + author permission);
  G6 (post-merge ověření) používá **`npm run check:merge`** místo plného `npm run check`.
- `.github/workflows/multiagent-gate-check.yml`: nový job `validate-verdict-comment`
  reagující na `issue_comment` s markerem `multiagent-verdikt` — validuje formát + trust,
  a při úspěchu sám nastaví `gate/go` (odebere `gate/pending`/`gate/no-go`) na hostitelském
  issue; při chybě napíše/aktualizuje vysvětlující komentář.
- `.github/workflows/multiagent-next.yml` a `multiagent-pipeline-sync.yml`: routing
  a přehled `[PIPELINE]` počítají s `risk/low` (přeskočení `VERDIKT-A` fáze) a s jednotným
  `verdictSignals` (issue i komentář) pro `allGo`/historii verdiktů.
- `docs/scripts/multiagent-next-lib.cjs`: `routeNextStep({ riskLow })` — u
  `multiagent/analyza` + `gate/go` + `riskLow=true` routuje přímo na Vývojáře.

### Provozní

- `docs/scripts/create-multiagent-labels.sh` — nový label `risk/low`
  (`C2E0C6`, „Low-risk pipeline: self-check ANALÝZA skips Kontrolor A (#100)“).
- `package.json` — nový skript `check:merge` (subset `check:examples-backend` +
  `check:wiki`, rychlejší než plný `check` pro G6 v merge workflow); `check:ma` doplněn
  o `test-ma-verdict-lib.sh`.
- Dokumentace sladěna: `docs/multi-agent-workflow.md` (nová sekce „Verdikt-as-comment +
  risk/low“, aktualizovaná tabulka labelů a automatizace), `.cursor/skills/m/SKILL.md`
  (routing `multiagent/analyza` + `risk/low` → Vývojář; sekce k verdikt-as-comment),
  `.cursor/rules/multi-agenti.mdc` (sekce `risk/low` + verdikt-as-comment, aktualizace
  automatizace next/gate-check/sync/merge), `docs/ma-role-cards/kontrolor-a.md`
  (self-check proces + formát GO komentáře s `kontrola="self"`).

## Odkazy

- [#100](https://github.com/pida1200/Test2/issues/100) (PIPELINE) ·
  [#102](https://github.com/pida1200/Test2/issues/102) (ANALÝZA v2) ·
  [#105](https://github.com/pida1200/Test2/issues/105) (VERDIKT-A GO)
- Wiki: [pipeline-81-merge-git-ukol](zmeny-2026-08-05-pipeline-81-merge-git-ukol) (MERGE-PENDING
  marker, na který verdikt-as-comment navazuje)
