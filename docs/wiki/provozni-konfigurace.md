# Konfigurace multi-agent

## Labely (povinné)

| Skupina | Hodnoty |
|---------|---------|
| Základ | `multiagent` |
| Artefakt | `multiagent/pipeline`, `…/analyza`, `…/implementace`, `…/testy`, `…/verdikt`, `…/bug`, `…/merge-review` |
| Gate | `gate/pending`, `gate/go`, `gate/no-go`, `gate/blocked` |
| Merge | `merge/approved` (Ano), `merge/rejected` (Ne), `merge/done`, `merge/failed` |
| Wiki mirror | `wiki/sync-failed` |
| Riziko | `risk/low` (self-check ANALÝZA, přeskočí Kontrolora A) |

Bug: `bug` + `multiagent` + `multiagent/bug` — **bez** `gate/*`.  
`[MERGE]` úkol: `multiagent` + `multiagent/merge-review` — **bez** `gate/*`.

Jednorázově / idempotentně:

```bash
bash docs/scripts/create-multiagent-labels.sh
```

## CI kontrakt v body issue

Samostatné řádky (anchored regex):

```text
Pipeline: #44
Verdikt: GO          # jen verdikt issues
Vstup: #45           # verdikt → produkční issue
```

Na `[MERGE]` úkolu povinný řádek `Pipeline: #N` (stejný tvar).

## GitHub Actions

| Workflow | Účel |
|----------|------|
| `multiagent-next.yml` | komentář: `/m #N` orchestrace **první**, volitelně CLI one-liner |
| `multiagent-pipeline-sync.yml` | auto-přehled v `[PIPELINE]`; po A+V+T GO → hint Ano/Ne na `[MERGE]` |
| `multiagent-gate-check.yml` | soft validace verdiktů / GO komentářů |
| `multiagent-merge-task.yml` | po MERGE-PENDING → založí `[MERGE] … Ano / Ne?`; `merge/rejected` = Ne |
| `multiagent-merge.yml` | **Ano** (`merge/approved` na `[MERGE]` nebo `[PIPELINE]`) → guardy → merge do `main` |
| `wiki-sync.yml` | mirror `docs/wiki/` → `.wiki.git` (při pushi na `main`; merge job volá sync sám) |

### Merge Ano/Ne (úkol v GitHubu)

1. Integrátor napíše `MERGE-PENDING` + machine marker na `[PIPELINE]`.
2. Bot založí **`[MERGE] Pipeline #N — Ano / Ne?`** (assignee = autor pipeline).
3. Člověk na tom issue (Labels vpravo):

| | Label | Výsledek |
|---|--------|----------|
| **Ano** | `merge/approved` | `multiagent-merge.yml` sloučí větev do `main` |
| **Ne** | `merge/rejected` | úkol uzavřen, `main` beze změny |

Zpětná kompatibilita: Ano lze dát i na `[PIPELINE]`.

### `multiagent-merge.yml` — vstupy a autorizace (G7)

| Cesta | Kdy zapisuje do `main` |
|---|---|
| `issues.labeled` + `merge/approved` na `[MERGE]` nebo `[PIPELINE]` | ano, projdou-li guardy G0–G6 |
| `workflow_dispatch`, `dry_run: true` (default) | **nikdy** — jen report |
| `workflow_dispatch`, `dry_run: false` | ano, jen s ověřeným `merge/approved` (≥ write) |

### Bootstrap merge (#81, historicky)

B0–B5 (první zavedení label merge): viz [zmeny-2026-08-05-pipeline-81-merge-git-ukol](zmeny-2026-08-05-pipeline-81-merge-git-ukol).  
Nové labely `multiagent/merge-review` + `merge/rejected`: znovu `create-multiagent-labels.sh` — [zmeny-2026-08-09-ma-merge-ano-ne](zmeny-2026-08-09-ma-merge-ano-ne).

## Cursor

- Skill `/m`: `.cursor/skills/m/SKILL.md`
- **Orchestrace (default):** `/m #N` — Task/subagent řetězí fáze v jednom chatu do STOP
- **Jeden krok:** `/m #N once`
- **Modely:** default `auto` (Cursor Auto); pin Grok/Composer v `MODELS_PINNED` — tabulka v `docs/multi-agent-workflow.md` (sekce Modely)
- Rule: `.cursor/rules/multi-agenti.mdc`

## Orchestrace vs CI

| Vrstva | Co dělá |
|--------|---------|
| Cursor `/m #N` | **Task/subagent** řetězí role; CLI jen když `cursor-agent` v PATH; exit 3 → ihned Task (ne STOP) |
| `multiagent-next.yml` | jen komentář (`/m #N` + volitelný CLI) |
| Actions | **nespouští** Cursor agenty |

## Degradace

Bez `gh` write: agent vypíše body/labely k ručnímu vložení.

Chybí-li `cursor-agent`: v orchestraci ihned Task (`ma-run-role.sh --print-prompt`).

**Actions nedostupné:** člověk sloučí ručně dle MERGE-PENDING (`git merge --no-ff` + check + push). Label bez běhu workflow nic nepushne.

**Wiki mirror fail** po merge: `wiki/sync-failed` + `[BUG]` follow-up; merge do `main` platí. Náprava: `bash docs/scripts/sync-wiki-to-github.sh`.
