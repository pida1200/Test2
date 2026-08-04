# Návrat k projektu (po restartu / novém chatu)

Agent **nepamatuje** předchozí konverzaci. Kontext obnovíš odkazem na git, rules a poznámky.

## Checklist pro agenta

Viz **`AGENTS.md`** → sekce „Návrat k projektu“. Stručně:

1. `git status` + `git log -5`
2. `docs/learning-log.md` (konec souboru)
3. **mujdum:** Obsidian `projekty/mujdum/hub.md` + poslední `session-*.md`; spec v `mujdum/docs/`
4. **číselníky:** `ciselniky/AGENTS.md` + `ciselniky/docs/README.md`; Obsidian `projekty/ciselniky/hub.md` + poslední `session-*.md`

## Copy-paste pro tebe (nový chat)

```text
Navazuji na práci v repu cursor.

Přečti AGENTS.md (sekce Návrat k projektu), git log -5, docs/learning-log.md (poslední záznamy),
Obsidian projekty/mujdum/hub.md + nejnovější session-*.md.

Větev: <např. cursor/optional-issues-f4e46>
Poslední známý commit: <hash nebo „git log“>
Úkol teď: <jedna věta>

Pravidla: .cursor/rules/ — lokální Docker po změně mujdum, vzdálený deploy jen na žádost.
```

## Copy-paste — jen mujdum / sport

```text
Scope: mujdum/** — sport modul.

Před kódem: mujdum/docs/sport.md (stav fází), Obsidian session dnešního dne,
mujdum/docs/api.md (Sport).

Teď: <konkrétní krok>
```

## Copy-paste — číselníky

```text
Scope: cursor/ciselniky/**

Před kódem: ciselniky/AGENTS.md, ciselniky/docs/README.md,
Obsidian projekty/ciselniky/hub.md + nejnovější session-*.md.
Spec jen dle tabulky v AGENTS.md — ne celé zadani.md.

Větev: <větev>
Úkol teď: <jedna věta>

Po změně běhu: npm test, npm run deploy, npm run check.
Commit/push jen na mou žádost.
```

## Kdy založit novou Obsidian session

- Nový kalendářní den → `session-YYYY-MM-DD.md` ze šablony (`docs/session-template.md`).
- Stejný den, další větší blok práce → **append** do existující session.
- Po každé větší feature: větev, commity, follow-up `[ ]`, odkaz na změněné soubory v gitu.

## Související

- `AGENTS.md` — hlavní průvodce pro agenty
- `docs/session-template.md` — šablona session
- `docs/prompt-snippets.md` — další prompty
- `.cursor/rules/repo-navrat.mdc` — připomínka v každém chatu
