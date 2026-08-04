## Příloha: mapování dashboard metrik → Home Assistant

**Zdroj pravdy v kódu:** `backend/src/index.ts` (objekt `mapping`, doplnění `temp_jircany` z počasí), odvozené metriky v `backend/src/homeAssistant.ts` (`haComputeDashboardMetrics`). Denní energie (kWh): `backend/src/electricityEnergy.ts` — počítá se po HA syncu a ukládá do `dashboard_metrics`. HTTP routy: `backend/src/app.ts`.

Backend při syncu volá `GET /api/states` a hodnoty bere podle níže uvedených pravidel. U položek s `entity_id` se entita hledá v tomto seznamu stavů; u položek s **friendly name** musí přesně sedět atribut `attributes.friendly_name` (po přejmenování v HA je potřeba upravit kód).

### Přehled klíčů metrik → HA

| Klíč v DB / API (`metrics.*`) | Jak se vyhodnocuje | Identifikátor v HA | Poznámka |
|-------------------------------|-------------------|--------------------|----------|
| `temp_jircany` | Samostatné volání | Entita `weather.forecast_home` | Hodnota z `attributes.temperature`. Při chybě se metrika do syncu nedoplní. |
| `temp_tata_obyvak` | Friendly name + **area** | `_TZ3000_m8a8apt5 TS0201 Teplota` v area **Tata obývák** | Stejný friendly name může být na více senzorech — rozlišení přes `areaName` v `index.ts` + HA šablona. |
| `temp_loznice` | Friendly name + **area** | `_TZ3000_m8a8apt5 TS0201 Teplota` v area **Ložnice** | Viz výše. |
| `temp_obyvak` | Podle friendly name | `_TZ3000_j5fbnjeh TS0201 Teplota` | Ze `state`. |
| `temp_sklenik` | Podle friendly name | `Teplomer sklenik Teplota` | Ze `state`. |
| `mower_schedule_paused` | Podle friendly name | `Mower_6656 Pause schedule` | Typicky `on` / `off`. |
| `mower_status` | Podle `entity_id` | `sensor.mower_6656_mower_status` | Ze `state`. |
| `mower_progress_pct` | Podle `entity_id` | `sensor.mower_6656_progress` | Ze `state`. |
| `mower_rain_sensor` | Podle `entity_id` | `sensor.mower_6656_rain_sensor` | Ze `state`. |
| `mower_rain_sensor_delay_min` | Friendly name + fallback | `Mower_6656 Rain sensor delay` (fallback `sensor.mower_6656_rain_sensor_countdown`) | Fallback jen když primární chybí / unavailable. |
| `irrigation_rain_sensor` | Podle `entity_id` | `binary_sensor.zavlaha_destovy_senzor` | Ze `state`. |
| `electricity_production_w` | `entity_id` + zálohy | `sensor.inverter_93648emu197w0029`; zálohy: `sensor.homekit_homekit_pv` | Ze `state` (W). |
| `electricity_consumption_w` | `entity_id` + zálohy | `sensor.house_consumption`; zálohy: `sensor.homekit_homekit_grid` | Ze `state` (W). |
| `irrigation_auto_any` | Odvozeno v kódu | — | `true`, pokud nějaká entita s `friendly_name` obsahujícím `Automatické zavlažování` má `state === "on"`. |

### Denní energie (kWh) — odvozené, ne z HA přímo

Po každém HA syncu se z historie výkonu (`dashboard_metrics_history`) pro dnešní kalendářní den v **`Europe/Prague`** dopočítají a uloží:

| Klíč | Význam |
|------|--------|
| `electricity_today_produced_kwh` | ∫ výroba (FVE) |
| `electricity_today_consumed_kwh` | ∫ spotřeba domu |
| `electricity_today_purchased_kwh` | ∫ max(spotřeba − výroba, 0) — import |
| `electricity_today_sold_kwh` | ∫ max(výroba − spotřeba, 0) — export |

`GET /api/dashboard` čte uložené hodnoty; pokud chybí, doplní je z cache/výpočtu (`mergeTodayElectricityMetricsIfMissing`). Přesnost závisí na intervalu HA syncu a mezerách v historii (mezery &gt; 6 h se v integraci přeskočí).

### Číselník místností (areas)

- HA: `POST /api/template` — `haListAreaNames` v `homeAssistant.ts`.

### Údržba při změně v Home Assistant

1. **Přejmenování / duplicitní senzor** — upravit `mapping` v `index.ts`; u duplicit použít `areaName`.
2. **Nová entita** — `entityId` / `fallbackEntityIds` / nový řádek + dlaždice ve frontendu (`App.tsx`).
3. **Počasí Jirčany** — druhý argument `haGetWeatherTemperatureFromState(..., "weather.forecast_home")`.

### Zápis do databáze

Každý HA sync: `dashboard_metrics` + `dashboard_metrics_history` pro okamžité metriky; denní kWh jen v `dashboard_metrics` (bez history řádků).
