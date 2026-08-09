# Index změn

Chronologie změn řešení. Každá větší pipeline doplní řádek + stránku dle [zmeny-sablona](zmeny-sablona).

| Datum | Pipeline | Stránka | Shrnutí |
|-------|----------|---------|---------|
| 2026-08-09 | (direct) | [ma-merge-ano-ne](zmeny-2026-08-09-ma-merge-ano-ne) | `[MERGE]` GitHub úkol Ano/Ne (`merge/approved` / `merge/rejected`) po MERGE-PENDING |
| 2026-08-09 | (direct) | [ma-orchestrace-task-first](zmeny-2026-08-09-ma-orchestrace-task-first) | Obnova řetězení fází: Task/subagent default; CLI jen s cursor-agent; next-bot `/m #N` první |
| 2026-08-09 | (direct) | [ma-cursor-models-grok](zmeny-2026-08-09-ma-cursor-models-grok) | Default MA = Cursor Auto; pin Grok/Composer volitelně; Anthropic/OpenAI jen na žádost |
| 2026-08-05 | #100 | [pipeline-100-ma-p2-risk-low](zmeny-2026-08-05-pipeline-100-ma-p2-risk-low) | Verdikt-as-comment (GO komentář na produkčním issue, fail-closed trust, precedence) + label `risk/low` (self-check přeskočí Kontrolora A); `check:merge` pro G6 |
| 2026-08-05 | P0–P1 | [ma-quality-token-p0-p1](zmeny-2026-08-05-ma-quality-token-p0-p1) | Role cards, Kontrolor A ≠ Opus, merge G4b/SHA≥7, next CLI one-liner, sync→merge/approved |
| 2026-08-05 | #81 | [pipeline-81-merge-git-ukol](zmeny-2026-08-05-pipeline-81-merge-git-ukol) | Merge do main = Git úkol (label `merge/approved`); fail-closed `workflow_dispatch`; bootstrap B0–B5; povinný stav wiki mirroru |
| 2026-08-05 | #83 | [pipeline-83-ma-cli-tokeny](zmeny-2026-08-05-pipeline-83-ma-cli-tokeny) | MA role CLI first (`ma-run-role.sh`), Task fallback, tenký Integrátor, mini-plán jen A+V |
| 2026-08-05 | #74 | [pipeline-74-merge-clovek](zmeny-2026-08-05-pipeline-74-merge-clovek) | Merge do main jen člověk; MERGE-PENDING handoff |
| 2026-08-05 | #66 | [pipeline-66-sablona-ma](zmeny-2026-08-05-pipeline-66-sablona-ma) | Šablona jen MA — odstraněny produktové stromy a odkazy |
| 2026-08-05 | #51 | [pipeline-51-wiki-odkazy](zmeny-2026-08-05-pipeline-51-wiki-odkazy) | Ploché wiki slugy; oprava sidebar 404; check odkazů |
| 2026-08-05 | #52 | [pipeline-52-ma-auto](zmeny-2026-08-05-pipeline-52-ma-auto) | `/m #N` orchestrace + `once`; CI nespouští Cursor |
| 2026-08-05 | #44 | [pipeline-44-wiki-komplet](zmeny-2026-08-05-pipeline-44-wiki-komplet) | Kompletní MA wiki (aplikacni + provozni) + revize tooling |
| 2026-08-05 | #34 | [pipeline-34-hybrid-ma](zmeny-2026-08-05-pipeline-34-hybrid-ma) | Wiki KB seed ASCII, check skript, pravidla rolí |

## Pravidlo

Po uzavření `[PIPELINE]` (GO na A+V+T): Integrátor přidá záznam sem a aktualizuje `aplikacni-*` nebo `provozni-*`, pokud se změnilo chování nebo provoz.
