# Návrat k projektu (po restartu / novém chatu)

Agent **nepamatuje** předchozí konverzaci. Kontext obnovíš odkazem na git, rules a poznámky.

## Checklist pro agenta

Viz **`AGENTS.md`** → sekce „Návrat k projektu“. Stručně:

1. `git status` + `git log -5`
2. `docs/learning-log.md` (konec souboru)
3. Otevřené `[PIPELINE]` / Wiki dle úkolu
4. Obsidian `projekty/<projekt>/` (pokud trezor používáš)

## Copy-paste pro tebe (nový chat)

```text
Navazuji na práci v multi-agent template repu.

Přečti AGENTS.md (sekce Návrat k projektu), git log -5, docs/learning-log.md (poslední záznamy).
Volitelně Obsidian projekty/<projekt>/hub.md + nejnovější session-*.md.

Větev: <např. feature/…>
Poslední známý commit: <hash nebo „git log“>
Úkol teď: <jedna věta>

Pravidla: .cursor/rules/ — bez PR; MA přes /m.
```

## Copy-paste — multi-agent pipeline

```text
Scope: multi-agent / docs/wiki.

Před kódem: docs/multi-agent-workflow.md, otevřené [PIPELINE] issue.
Teď: /m #<N>  (nebo /m #<N> once)
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
