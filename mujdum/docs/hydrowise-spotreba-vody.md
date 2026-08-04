# Hydrawise — odhad spotřeby vody (závlaha)

Řadič **Zavlaha** (Hydrawise), 6 sekcí, program **Zaklad**. Data z Hydrawise API (`get_run_summary` / `get_watering_report`); objemy v aplikaci „Porovnání spotřeby“ u tohoto účtu často sedí na **minuty ≈ litry** (~60 l/h), což je jiný model než níže.

## Průtok pro výpočty v tomto repu

| Konstanta | Hodnota |
|-----------|---------|
| **Průměrný průtok závlahy** | **915 l/h** |
| Přepočet | **15,25 l/min** (= 915 ÷ 60) |

### Vzorec

```text
spotřeba_vody_l = skutečný_čas_závlahy_min × (915 / 60)
```

- **Zdroj času:** součet `total_actual_run_time_minutes` ze všech sekcí za měsíc (`get_run_summary`, `period: MONTH`), nebo součet `reported_duration_seconds` z `get_watering_report` (jen dokončené běhy).
- **Kdy aktualizovat tabulku:** po konci měsíce, nebo po změně průtoku / počtu sekcí.

## Spotřeba podle měsíců — rok 2026

Řadič instalován cca **17. 3. 2026** — leden a únor bez závlahy z tohoto systému.

| Měsíc | Čas závlahy (min) | Odhad spotřeby (l) @ 915 l/h | Poznámka |
|-------|-------------------|------------------------------|----------|
| 2026-01 | 0 | 0 | před instalací |
| 2026-02 | 0 | 0 | před instalací |
| 2026-03 | ~15 | ~233 | od ~17. 3., ne celý měsíc |
| 2026-04 | 765 | **11 666** | shoda minut s app (~765 l v UI ≈ 60 l/h) |
| 2026-05 | 1 351 | **20 603** | shoda minut s app (~1 351 l v UI) |
| 2026-06 | — | — | doplnit po měsíci |
| 2026-07 | — | — | |
| 2026-08 | — | — | |
| 2026-09 | — | — | |
| 2026-10 | — | — | |
| 2026-11 | — | — | |
| 2026-12 | — | — | |

**Součet za období s daty (březen–květen 2026):** ~2 131 min → **~32 502 l** (odhad @ 915 l/h).

### Srovnání s aplikací Hydrawise

V mobilní aplikaci v sekci **Porovnání spotřeby** pro duben/květen 2026 vychází přibližně **765 l** a **1 351 l** — to odpovídá **~1 litr na 1 minutu** zálivky (~60 l/h), ne 915 l/h. Pro plánování a reporty v rámci mujdum používej **915 l/h** z tabulky výše, pokud není domluveno jinak.

## Jak doplnit další měsíc (MCP)

Pro každou sekci (id z `list_zones`) a měsíc:

```text
get_run_summary(zone_id, period: "MONTH", start_month: M, end_month: M, year: 2026)
```

Sečti `total_actual_run_time_minutes` přes všech 6 sekcí, pak:

```text
litry = součet_minut × 15.25
```

Controller id: **2079007** (Zavlaha).

## Související

- Hydrowise MCP: [hunter-hydrowise-mcp](https://github.com/skialpine/hunter-hydrowise-mcp) (běh na `192.168.1.123:8765/mcp`)
- Dashboard mujdum: zavlažování z **Home Assistant** (`irrigation_*` v `home-assistant-mapovani.md`) — jiný zdroj než Hydrawise objemy
