## Grafy v mujdum — nastavení variant a mapa souborů

### Mapa souborů (rychlé hledání)

```text
mujdum/frontend/src/ui/
├── App.tsx                      # klik na metriku, openChart/loadChart, modal, tlačítka časového okna (6h–1 rok), přepínač Sloupce/Čára
├── DashboardMetricChart.tsx     # výběr varianty: spojité hodnoty (MUI) vs výčet (SVG timeline)
├── StateTimelineChart.tsx       # varianta B: diskrétní / výčtové stavy (barevný pruh + legenda)
├── ElectricityCombinedChart.tsx # elektřina čára: výroba + spotřeba (W)
├── ElectricityEnergyBarChart.tsx# elektřina sloupce: výroba + spotřeba (kWh) za týden/měsíc
├── useMetricChart.ts            # stav grafu, okna, kalendářní navigace, electricityView line/bars
├── dashboardMetricChartUtils.ts # hasNumericSeries, metricChartColor, formatAxisTime, stateColorForLabel, energy buckety
├── testUiChartTheme.ts          # muiLineChartHeight/Margin, muiChartSx, barvy os
├── muiAppDataGridTheme.ts       # MUI ThemeProvider pro číselný graf
└── TestUiCharts.tsx             # záložka Test UI: srovnání Recharts / Chart.js / MUI (ne produkce)

mujdum/docs/
├── grafy.md                     # tento soubor
├── api.md                       # GET /api/dashboard/metrics/:key/history
└── zadani.md                    # popis dashboardu a grafů v kontextu aplikace
```

---

## 1. Automatický výběr varianty

Rozhodnutí v `DashboardMetricChart.tsx` podle dat z API.

| Podmínka | Varianta | Soubor |
|----------|----------|--------|
| `points.length === 0` nebo &lt; 2 body a ne čísla | Text „Pro tuto hodnotu zatím není graf.“ | `DashboardMetricChart.tsx` |
| `hasNumericSeries(points) === false` | **SVG timeline** (výčtové stavy) | `StateTimelineChart.tsx` |
| `hasNumericSeries(points) === true` | **MUI X LineChart** (spojité hodnoty) | `NumericLineChart` v `DashboardMetricChart.tsx` |

Spojitá řada = alespoň **2 body** s vyplněným `numeric` — funkce `hasNumericSeries` v `dashboardMetricChartUtils.ts`.

Backend při zápisu do `dashboard_metrics_history` plní `numeric_value`, pokud jde hodnotu interpretovat jako číslo (`backend/src/app.ts` při syncu/snapshotu).

---

## 2. Varianta A — spojité hodnoty (MUI X LineChart)

**Soubor:** `mujdum/frontend/src/ui/DashboardMetricChart.tsx` → `NumericLineChart`

**Nastavení** — stejné jako Test UI → MUI čárový (`MuiDualSeriesLine` v `TestUiCharts.tsx`). Konstanty v `testUiChartTheme.ts`: `muiLineChartHeight`, `muiLineChartMargin`, `muiChartSx`.

| Parametr | Hodnota | Poznámka |
|----------|---------|----------|
| `height` | `200` | `muiLineChartHeight` |
| `margin` | `{ left: 48, right: 48, top: 12, bottom: 28 }` | `muiLineChartMargin` |
| `curve` / `area` | *(výchozí MUI)* | jako Test UI čárový — typicky `monotoneX`, bez výplně |
| `showMark` | `false` | bez bodů na křivce |
| `xAxis.scaleType` | `"time"` | časová osa |
| `xAxis.tickNumber` | `6` | počet ticků na X |
| `grid.horizontal` | `true` | vodorovná mřížka |
| `slotProps.tooltip` | `trigger: "axis"`, `anchor: "pointer"`, `position: "top"` | štítek u kurzoru u nejbližšího měření (`muiChartLineTooltipSlotProps`) |
| vzhled štítku | `muiChartTooltipSx` | tmavé pozadí, viditelný v modalu |
| `showMark` | `false` | bez viditelných bodů na čáře |
| `axisHighlight` | *(není)* | jen u Test UI „interaktivní“ podvarianty |

**Barvy série** — `dashboardMetricChartUtils.ts` → `metricChartColor(metricKey)`:

- `electricity_*`, `*_pct` → `#b7c4ff`
- `temp_*` → `#44e2cd`
- jinak → `#44e2cd`

**Vzhled os:** `testUiChartTheme.ts` → `muiChartSx`

**Téma:** `muiAppDataGridTheme.ts` (ThemeProvider kolem číselného grafu)

Reference: [MUI X LineChart](https://mui.com/x/api/charts/line-chart/)

---

## 3. Varianta B — výčtové / diskrétní hodnoty (SVG timeline)

**Soubor:** `mujdum/frontend/src/ui/StateTimelineChart.tsx`

Barevný pruh po čase + legenda stavů (on/off, text).

| Oblast | Kde měnit |
|--------|-----------|
| Rozměry SVG (`w`, `h`, `pad`, `barH`) | `StateTimelineChart.tsx` |
| Barva stavu | `stateColorForLabel()` v `dashboardMetricChartUtils.ts` |
| Popisek hodnoty | `toStateLabel()` v `dashboardMetricChartUtils.ts` |
| Formát času na ose | `formatAxisTime()` v `dashboardMetricChartUtils.ts` |
| Legenda (CSS) | `frontend/src/styles.css` — `.stateTimelineLegend`, `.stateTimelineLegendDot` |

---

## 4. Časové okno (obě varianty)

**Soubor:** `mujdum/frontend/src/ui/App.tsx`

- Výchozí okno: `openChart` → **6 h** (`6 * 60` minut)
- Přepínání: tlačítka v modalu → `setChartWindow(minutes)`
- API: `GET /api/dashboard/metrics/:key/history?minutes=…` (viz `docs/api.md`)

---

## 4b. Elektřina — sloupcová varianta (energie kWh)

Graf elektřiny (`ElectricityCombinedChart`, kombinovaná výroba + spotřeba) má pro okno **měsíc** a **rok** přepínač **Sloupce / Čára**:

| Okno | Výchozí pohled | Sloupce zobrazují |
|------|----------------|-------------------|
| měsíc | **Sloupce** | týdenní energie kWh (kalendářní týden po–ne protínající měsíc) |
| rok | **Sloupce** | měsíční energie kWh (leden–prosinec) |
| 6h–týden | Čára | okamžitý výkon W (beze změny) |

| Vrstva | Soubor |
|--------|--------|
| Bar chart (MUI `BarChart`, kWh) | `frontend/src/ui/ElectricityEnergyBarChart.tsx` |
| Stav `electricityView` (`line`/`bars`) + fetch energie | `frontend/src/ui/useMetricChart.ts` |
| Přepínač Sloupce/Čára + render | `frontend/src/ui/App.tsx` (hlavička + tělo modalu) |
| Popisky/format bucketů (`formatEnergyBucketLabel`, `formatChartEnergyKwh`, `defaultElectricityViewForWindow`) | `frontend/src/ui/dashboardMetricChartUtils.ts` |
| Backend agregace W→kWh do týdnů/měsíců | `backend/src/electricityEnergyBuckets.ts` |
| Endpoint | `GET /api/dashboard/electricity/energy?period=&anchor=` (viz `docs/api.md`) |

- **Energie = integrál výkonu** (lichoběžníková metoda, mezery > 6 h se přeskočí — `MAX_GAP_HOURS`), zóna `Europe/Prague`.
- Přepínač se zobrazí jen pro elektřinu a okno měsíc/rok (`electricitySupportsBars`). Kalendářní navigace (předchozí/další období) funguje i ve sloupcovém režimu.
- **Pozn.:** roční sloupce jsou omezené délkou historie v `dashboard_metrics_history` (sběr od jara 2026) — starší měsíce mohou být nulové.

---

## 5. Test UI (experimentální, ne dashboard)

**Soubor:** `mujdum/frontend/src/ui/TestUiCharts.tsx`

Srovnání Recharts / Chart.js / MUI — čárový, sloupcový, interaktivní podvarianty na demo datech. Produkční dashboard používá pouze MUI (varianta A) + SVG timeline (varianta B).

---

## 6. Rychlý přehled „chci změnit…“

| Cíl | Kam sáhnout |
|-----|-------------|
| Výplň / tvar křivky (spojité hodnoty) | `DashboardMetricChart.tsx` → `NumericLineChart` → `series[]` |
| Barva teplot / elektřiny | `metricChartColor()` v `dashboardMetricChartUtils.ts` |
| Vynutit timeline pro konkrétní klíč | `DashboardMetricChart.tsx` nebo `hasNumericSeries` |
| Timeline vzhled | `StateTimelineChart.tsx` |
| Časová okna v modalu | `App.tsx` |
| Barvy os MUI | `testUiChartTheme.ts` → `muiChartSx` |
