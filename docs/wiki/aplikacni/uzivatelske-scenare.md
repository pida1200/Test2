# Uživatelské scénáře (slash `/m`)

Číslo issue **vždy s `#`**. Bez `#` je `2` režim, ne issue.

## Happy path — plná pipeline

1. Vytvoř / doplň `[PIPELINE]` (šablona nebo Integrátor).
2. V Cursoru: **`/m #N`** — **orchestrace** (Analytik → … → Integrátor) v jednom chatu.
3. Jen jeden krok: **`/m #N once`**.
4. Po GO na A+V+T Integrátor uzavře pipeline + learning-log + případně `zmeny/`.

CI bot komentuje oba příkazy; **nespouští** Cursor sám.

## Rychlá 2er

| Příkaz | Chování |
|--------|---------|
| `/m 2` | Vývojář + Kontrolor V (zeptá se na pipeline, pokud chybí) |
| `/m 2 #N` | totéž nad pipeline `#N` |

Přeskočí Analytika a Testera — vhodné pro úzký bugfix se schváleným kontraktem.

## Bug

| Příkaz | Chování |
|--------|---------|
| `/m #<bug>` | issue s `multiagent/bug` → Vývojář (oprava / povýšení na pipeline) |

## Co číst vs psát

- **Čti** `[PIPELINE]` (auto-přehled mezi markery `multiagent:prehled`).
- **Piš** do child issue přes `gh issue edit --body-file`.
- Uvnitř markerů v PIPELINE **needituj** — bot přepíše.
- Child body: samostatný řádek `Pipeline: #N` (CI anchored regex).
