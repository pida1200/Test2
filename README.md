# Multi-agent template

Šablona repozitáře pro **multi-agentní vývoj** v Cursoru: GitHub Issues jako I/O, slash `/m`, role 3+3 + kontroloři, Wiki KB seed.

Neobsahuje produktovou aplikaci — jen tooling, dokumentaci a ukázku `examples/backend`.

## Pro AI agenty

- **[`AGENTS.md`](AGENTS.md)** — struktura, checklist návratu
- **[`docs/navrat-k-projektu.md`](docs/navrat-k-projektu.md)** — copy-paste prompty
- **[`docs/multi-agent-workflow.md`](docs/multi-agent-workflow.md)** — role, modely, šablony
- **Wiki seed:** [`docs/wiki/Home.md`](docs/wiki/Home.md)

## Co tady najdeš

| Cesta | Účel |
|-------|------|
| `docs/` | workflow, zadání, learning-log, scripts |
| `docs/wiki/` | KB seed (sync → GitHub Wiki) |
| `.cursor/skills/m/` | slash `/m` |
| `.cursor/rules/` | závazná pravidla |
| `examples/backend` | třívrstvá ukázka + unit testy |
| `.github/` | issue šablony + MA Actions |

## Jak použít jako šablonu

1. Na GitHubu: **Use this template** (nebo fork) → nový repo.
2. Uprav `README.md` / `AGENTS.md` (název projektu).
3. Nahraď odkazy `pida1200/Test2` svým `owner/repo` ve `docs/wiki/` (absolutní GitHub URL) a v dokumentaci.
4. Jednorázově: `bash docs/scripts/create-multiagent-labels.sh`.
5. Bootstrap Wiki UI (Create first page `Home`), pak `bash docs/scripts/sync-wiki-to-github.sh`.
6. Ověř: `npm run check`.
7. První změna: feature větev + commit (**bez PR** — viz `repo-git.mdc`).

## Rychlý start

```bash
git status
npm run check
# Multi-agent:
# /m          — kickoff + orchestrace
# /m #N       — orchestrace pipeline
# /m #N once  — jeden krok
```

## Ověření

```bash
npm run check          # examples + docs + wiki + ma
npm run check:wiki
npm run check:ma
```
