# cursor — projekt na učení práce v Cursoru

Tenhle repozitář je “sandbox” na trénink workflow v Cursoru: Git bez PR, pravidla pro AI (`.cursor/rules`), ukázky v `examples/` a produkt **mujdum**.

## Pro AI agenty a návrat po restartu

- **[`AGENTS.md`](AGENTS.md)** — struktura repa, checklist kontextu, kde zapisovat paměť
- **[`docs/navrat-k-projektu.md`](docs/navrat-k-projektu.md)** — copy-paste prompty pro nový chat
- **Obsidian** `projekty/mujdum/` — sessiony a follow-up (viz `.cursor/rules/obsidian-prace-programovani.mdc`)

## Co tady najdeš

- `docs/` – krátké návody, learning-log, šablony session
- `.cursor/rules/` – pravidla pro AI (`repo-navrat`, `repo-git`, `repo-kvalita`, `mujdum`, …)

## Doporučený postup (10–20 min)

1. Otevři `docs/01-zakladni-nastaveni.md` a nastav editor na “team-friendly” defaulty.
2. Projdi `docs/02-git-a-pr-workflow.md` a zkus si vytvořit větev + změnu + commit.
3. Zapni a uprav pravidla v `.cursor/rules/` a vyzkoušej “piš kód podle pravidel”.

## Jak začít

```bash
cd /Users/zdenekkorinek/Programovani/cursor
git status
```

## Template checklist (když založíš nový projekt z template)

Po vytvoření nového repa přes **Use this template** doporučený postup:

1. **Uprav README** (název projektu, popis, odkazy).
2. **Zkontroluj `.cursor/rules/`** – ponech jen pravidla, která chceš skutečně vynucovat pro daný projekt.
3. **Nastav `npm run check`**:
   - buď ponech root `package.json` a uprav skripty pro tvůj stack,
   - nebo ho nahraď vlastním “check” pipeline (test+lint).
4. **První PR**:
   - malá změna (např. úprava pravidel/README),
   - `npm run check`,
   - PR popis se Summary + Test plan.
5. **Learning log**:
   - používej `docs/learning-log.md` jako backlog rizik a dalších kroků.
