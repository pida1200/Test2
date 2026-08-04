# Multi‑agent workflow (Cursor) – šablony

Cíl: u větších úkolů rozdělit práci mezi více agentů paralelně, ale mít **1 integrátora**, který změny spojí, otestuje a uzavře (**commit / merge / push bez PR**).

## Role

- **Integrátor (ty / hlavní agent)**: rozdělení práce, finální rozhodnutí, integrace, testy/lint, uzavření na feature větvi.
- **Implementační agenti**: pracují v jasně vymezeném prostoru (složky/soubory).
- **Code review agent**: čte diff/změny a vrací připomínky (styl, edge cases, testy, rizika).

## Kdy použít více agentů

- Úkol má **aspoň 2 nezávislé části** (např. backend API + frontend UI + testy + docs).
- Je potřeba paralelně: **implementace vs review vs test plan**.

## Standardní rozdělení (doporučené)

### Agent A – Backend

- Scope: `mujdum/backend/` nebo `examples/backend/`, API kontrakt, validace, error handling
- Výstup: seznam změn, endpointy, jak otestovat, návrh error kontraktu

### Agent B – Frontend

- Scope: `mujdum/frontend/`, UI napojení na API, responsivita
- Výstup: komponenty, stavy (loading/error), test plan

### Agent C – Test/QA

- Scope: unit testy, edge cases, “co může spadnout”
- Výstup: nové testy / návrh testů, příkazy pro spuštění, nalezené problémy

### Agent D – Code review (povinný u větších změn)

- Scope: přečíst diff a návrh řešení (neimplementuje)
- Výstup: checklist připomínek + doporučené fixy

## Šablona zadání pro agenty (kopíruj)

### Zadání pro Integrátora (hlavní)

```text
Cíl: <1 věta>
Kontext: <kde v repu + proč>
Kritéria hotovo: <3–5 bodů>
Ověření: <jaké testy/lint>
Pravidla: .cursor/rules/ + repo-git (bez PR) + po běhu zápis do docs/learning-log.md
```

### Zadání pro Backend agenta

```text
Jsi backend agent. Scope: <složky/soubory>.
Dodrž .cursor/rules/ (mujdum.mdc nebo examples-architektura.mdc).
Navrhni API kontrakt (request/response), validaci vstupu a konzistentní chyby.
Přidej unit testy pro hlavní tok + 1 edge case.
Výstup: stručné shrnutí + které soubory jsi změnil + jak to otestovat.
Neřeš frontend ani git push.
```

### Zadání pro Frontend agenta

```text
Jsi frontend agent. Scope: <složky/soubory>.
Dodrž .cursor/rules/mujdum.mdc.
Implementuj UI + napojení na API, loading/error stavy, responsivitu.
Výstup: stručné shrnutí + které soubory + jak to manuálně ověřit.
Neřeš backend ani git push.
```

### Zadání pro Test/QA agenta

```text
Jsi test/QA agent. Scope: testy a ověřování.
Dodrž .cursor/rules/repo-kvalita.mdc.
Zaměř se na: edge cases, regresní rizika, chybové stavy.
Výstup: checklist testů + návrh (nebo implementace) unit testů + co opravit.
Neřeš implementaci feature mimo testy.
```

### Zadání pro Code review agenta

```text
Jsi code review agent. Neimplementuj nic.
Přečti změny a zhodnoť:
- API kontrakt a error handling
- test coverage a edge cases
- čitelnost a konvence
- bezpečnost / logování (bez citlivých dat)
Výstup: 5–10 konkrétních připomínek + doporučené úpravy.
```
