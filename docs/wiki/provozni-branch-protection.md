# Branch protection na `main`

Součást MA P3 (#103 / #114). Repo **nepoužívá PR** pro běžný tok — merge do `main` jde přes label Ano na `[MERGE]` (`multiagent-merge.yml`) nebo ruční merge člověkem.

## Doporučené nastavení (GitHub UI)

**Settings → Branches → Add/Edit rule → Branch name pattern: `main`**

| Volba | Doporučení | Proč |
|-------|------------|------|
| Restrict who can push | zapnout; jen lidé s write + případně GitHub Actions | zabrání náhodnému pushi agenta |
| Require a pull request before merging | **vypnout** (nebo výjimka pro Actions) | MA tok je bez PR |
| Require status checks | volitelně `Multi-agent merge` / CI | ostrý merge až po zeleném check |
| Allow force pushes | vypnout | |
| Allow deletions | vypnout | |

`GITHUB_TOKEN` ve workflow `multiagent-merge.yml` má `contents: write` jen v tom jobu — protection musí **povolit** push z Actions (nebo použít PAT s výjimkou), jinak ostrý Ano selže na push.

## Ověření

```bash
# vyžaduje token s admin na repo (Cloud integration často 403)
gh api repos/:owner/:repo/branches/main/protection
```

Nebo UI: Settings → Branches → u `main` je pravidlo vidět.

## Ruční fallback

Když protection / Actions blokují: člověk sloučí lokálně dle MERGE-PENDING (`git merge --no-ff` + `npm run check` + push) — viz [provozni-konfigurace](provozni-konfigurace).
