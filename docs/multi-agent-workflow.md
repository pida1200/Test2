# Multi‑agent workflow (jednoduchý)

Cíl: **1 GitHub Issue = 1 feature**. Stav říká label `ma/*`. Ty v Cursoru napíšeš jen:

```text
Multiagent #N
```

Agent přečte issue, podle labelu udělá aktuální roli, zapíše výstup **do stejného issue** (sekce v body + komentář), posune label na další fázi.

Detailní starší model (7 issues) je dole jako volitelný — default je tento.

## Stavový stroj (labely)

Na issue je **právě jeden** phase label:

| Label | Kdo běží | Co udělá | Další label |
|-------|----------|----------|-------------|
| `ma/analyza` | Analytik | doplní sekci Analýza | `ma/review-a` |
| `ma/review-a` | Kontrolor A | GO → `ma/vyvoj` / NO-GO → `ma/analyza` + komentář vad | |
| `ma/vyvoj` | Vývojář | kód + sekce Implementace | `ma/review-v` |
| `ma/review-v` | Kontrolor V | GO → `ma/testy` / NO-GO → `ma/vyvoj` | |
| `ma/testy` | Tester | testy + sekce Testy | `ma/review-t` |
| `ma/review-t` | Kontrolor T | GO → `ma/done` / NO-GO → `ma/testy` nebo `ma/vyvoj` | |
| `ma/done` | Integrátor | finální lint/test, commit, learning-log, zavře issue | — |
| `ma/blocked` | — | ruční zásah / eskalace | sundat po opravě |

Plus vždy label `multiagent`.

## Start (2 kroky)

1. **GitHub** → New issue → šablona *Multi-agent feature* → vznikne issue s `multiagent` + `ma/analyza`.
2. **Cursor** (nový Agent chat):

```text
Multiagent #N
```

Hotovo. Po každém běhu agent posune label → GitHub Action napíše komentář s dalším `Multiagent #N` (copy-paste). Znovu stejný prompt.

## Co agent při `Multiagent #N` dělá

1. Načte issue `#N` (title, body, labely, poslední komentáře).
2. Podle `ma/*` zvolí roli + model (tabulka níže).
3. Zapíše výstup do **body** (příslušná sekce) a krátký komentář.
4. U review: komentář začíná `Verdikt: GO` nebo `Verdikt: NO-GO` + seznam vad.
5. **Přepne labely** (odebere starý `ma/*`, přidá nový). Při NO-GO vrátí produkční fázi.
6. V chatu: 3–5 vět + odkaz na issue.

Nepiš dlouhé role-prompty. Stačí `Multiagent #N`.

## Modely podle fáze

| Fáze | Model |
|------|--------|
| `ma/analyza`, `ma/review-a` | `claude-opus-4-8-thinking-high` |
| `ma/vyvoj`, `ma/testy`, `ma/done` | `composer-2.5` |
| `ma/review-v` | `gpt-5.6-sol-high` |
| `ma/review-t` | `gpt-5.5-high` |

## Struktura body issue (šablona)

```markdown
## Cíl
…

## Analýza
(vyplní Analytik)

## Verdikt analýzy
(vyplní Kontrolor A — nebo komentář)

## Implementace
(vyplní Vývojář: soubory, ověření)

## Verdikt vývoje
…

## Testy
…

## Verdikt testů
…

## Uzavření
(commit, learning-log)
```

## Automatizace

- Workflow: `.github/workflows/multiagent-next.yml`  
  Při změně `ma/*` labelu bot **komentuje** další krok: `Multiagent #N` + která role.
- Labely: `bash docs/scripts/create-multiagent-labels.sh`

## Pravidla (zůstávají)

- Kontrolor **neimplementuje**.
- NO-GO = STOP, předchozí role opraví, znovu review.
- Max. ~3 reworky na fázi, pak `ma/blocked` + eskalace.
- Commit/push bez PR (`repo-git.mdc`); u multi-agent zápis do `docs/learning-log.md`.
- Secrets nepatří do issue.

## Kickoff od Integrátora (volitelné)

Když chceš, aby agent issue i vytvořil:

```text
Multiagent start
Cíl: <1 věta>
Scope: <složky>
```

Agent vytvoří issue ze šablony (label `ma/analyza`) a hned běží Analytik, nebo vrátí `Multiagent #N`.

---

## Volitelné: starý model 7 issues

Pokud potřebuješ oddělené artefakty: `[PIPELINE]`, `[ANALÝZA]`, `[VERDIKT-*]`, … — viz git historii / starší šablony v `.github/ISSUE_TEMPLATE/multiagent-*.yml`. **Default je 1 issue + `ma/*`.**
