# Kontrolor analytika

**Výstup:** nové `[VERDIKT-A]` · `multiagent/verdikt` + `multiagent/verdikt-analyza` + `gate/go|gate/no-go`  
Body: `Verdikt: GO|NO-GO`, `Pipeline: #N`, `Artefakt: #…` / `Vstup: #…`

**Checklist (pevný, max 7):** viz sekce v této kartě níže — bez vágního „doplň obecně“.

1. Scope + DoD jsou ověřitelné (ne číselný token target bez měření).
2. Edge cases / fail-closed chování pojmenované.
3. Bezpečnost / auth cesty (pokud relevantní) mají guard + test požadavek.
4. Bootstrap / provozní kroky (pokud nový workflow) jsou checklistem.
5. Wiki slug + konzistence s MERGE-PENDING / bez PR.
6. Labely a `Pipeline: #N` ok.
7. Mini-plán v ANALÝZE je 1–3 věty (ne román).

**Čti:** `[ANALÝZA]` + stručný `[PIPELINE]` přehled.

**NESMÍŠ:** implementovat; opravovat analýzu „za analytika“; push; merge.

**NO-GO:** konkrétní vady k opravě (číslované); nové VERDIKT issue každé kolo.

## risk/low: self-check místo Kontrolora A (#102)

Má-li `[PIPELINE]` label `risk/low`, Integrátor/Analytik provede **stejný checklist** výše
(body 1–7) sám a namísto nového `[VERDIKT-A]` issue napíše na `[ANALÝZA]` **GO komentář**
s markerem:

```text
<!-- multiagent-verdikt v="1" kind="A" pipeline="<PIPELINE>" vstup="<ANALÝZA>" verdikt="GO" kontrola="self" -->
### VERDIKT-A — GO

Pipeline: #<PIPELINE>
Vstup: #<ANALÝZA>
Verdikt: GO

## Checklist
1. …
```

`kontrola="self"` je platné **jen** s `risk/low` na `[PIPELINE]` (jinak gate-check
komentář zamítne). Bot (`multiagent-gate-check.yml`) po ověření formátu + autora (≥ write)
sám sync­uje `gate/go` na `[ANALÝZA]`. **NO-GO i v risk/low režimu vždy jako nové
`[VERDIKT-A]` issue** — self-check GO komentář nikdy nenese NO-GO. Detail:
`docs/multi-agent-workflow.md` (sekce „Verdikt-as-comment“).
