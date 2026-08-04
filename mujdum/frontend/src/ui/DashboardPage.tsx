import type { DashboardResponse } from "./useDashboard.js";
import { runAsyncAction } from "./appUtils.js";
import {
  formatEnergyKwh,
  formatIrrigationRainSensor,
  formatMinutesLeft,
  formatMowerSchedulePaused,
  formatOnOff,
  formatPercent,
  formatPower,
  formatRainSensor,
  formatTemp
} from "./dashboardFormatters.js";

type Props = Readonly<{
  error: string | null;
  dashboard: DashboardResponse | null;
  onOpenChart: (key: string, title: string) => void;
  onOpenElectricityChart: () => void;
}>;

export function DashboardPage({
  error,
  dashboard,
  onOpenChart,
  onOpenElectricityChart
}: Props) {
  return (
    <>
      {error ? <div className="error">{error}</div> : null}
      <section className="grid2">
        <div className="tile">
          <div className="tileTitle">Teploty</div>
          <div className="kv">
            <div className="k">Jirčany</div>
            <div className="v">
              <button
                className="metricButton"
                type="button"
                onClick={() => onOpenChart("temp_jircany", "Teplota • Jirčany")}
              >
                {formatTemp(dashboard?.metrics?.temp_jircany)}
              </button>
            </div>
          </div>
          <div className="kv">
            <div className="k">Táta obývák</div>
            <div className="v">
              <button
                className="metricButton"
                type="button"
                onClick={() => onOpenChart("temp_tata_obyvak", "Teplota • Táta obývák")}
              >
                {formatTemp(dashboard?.metrics?.temp_tata_obyvak)}
              </button>
            </div>
          </div>
          <div className="kv">
            <div className="k">Obývák</div>
            <div className="v">
              <button
                className="metricButton"
                type="button"
                onClick={() => onOpenChart("temp_obyvak", "Teplota • Obývák")}
              >
                {formatTemp(dashboard?.metrics?.temp_obyvak)}
              </button>
            </div>
          </div>
          <div className="kv">
            <div className="k">Ložnice</div>
            <div className="v">
              <button
                className="metricButton"
                type="button"
                onClick={() => onOpenChart("temp_loznice", "Teplota • Ložnice")}
              >
                {formatTemp(dashboard?.metrics?.temp_loznice)}
              </button>
            </div>
          </div>
          <div className="kv">
            <div className="k">Skleník</div>
            <div className="v">
              <button
                className="metricButton"
                type="button"
                onClick={() => onOpenChart("temp_sklenik", "Teplota • Skleník")}
              >
                {formatTemp(dashboard?.metrics?.temp_sklenik)}
              </button>
            </div>
          </div>
        </div>

        <div className="tile">
          <button
            type="button"
            className="tileTitleButton"
            onClick={runAsyncAction(() => onOpenElectricityChart())}
          >
            Elektřina
          </button>
          <div className="kv">
            <div className="k">Aktuální výroba</div>
            <div className="v">
              <button
                className="metricButton"
                type="button"
                onClick={() =>
                  onOpenChart("electricity_production_w", "Elektřina • Aktuální výroba")
                }
              >
                {formatPower(dashboard?.metrics?.electricity_production_w)}
              </button>
            </div>
          </div>
          <div className="kv">
            <div className="k">Aktuální spotřeba</div>
            <div className="v">
              <button
                className="metricButton"
                type="button"
                onClick={() =>
                  onOpenChart("electricity_consumption_w", "Elektřina • Aktuální spotřeba")
                }
              >
                {formatPower(dashboard?.metrics?.electricity_consumption_w)}
              </button>
            </div>
          </div>
          <div className="kv">
            <div className="k">Dnes vyrobeno</div>
            <div className="v">
              {formatEnergyKwh(dashboard?.metrics?.electricity_today_produced_kwh)}
            </div>
          </div>
          <div className="kv">
            <div className="k">Dnes spotřebováno</div>
            <div className="v">
              {formatEnergyKwh(dashboard?.metrics?.electricity_today_consumed_kwh)}
            </div>
          </div>
          <div className="kv">
            <div className="k">Dnes nakoupeno</div>
            <div className="v">
              {formatEnergyKwh(dashboard?.metrics?.electricity_today_purchased_kwh)}
            </div>
          </div>
          <div className="kv">
            <div className="k">Dnes prodáno</div>
            <div className="v">
              {formatEnergyKwh(dashboard?.metrics?.electricity_today_sold_kwh)}
            </div>
          </div>
        </div>

        <div className="tile">
          <div className="tileTitle">Sekačka</div>
          <div className="kv">
            <div className="k">Plán</div>
            <div className="v">
              <button
                className="metricButton"
                type="button"
                onClick={() => onOpenChart("mower_schedule_paused", "Sekačka • Plán")}
              >
                {formatMowerSchedulePaused(dashboard?.metrics?.mower_schedule_paused)}
              </button>
            </div>
          </div>
          <div className="kv">
            <div className="k">Mower status</div>
            <div className="v">
              <button
                className="metricButton"
                type="button"
                onClick={() => onOpenChart("mower_status", "Sekačka • Status")}
              >
                {typeof dashboard?.metrics?.mower_status === "string" &&
                dashboard.metrics.mower_status.trim()
                  ? String(dashboard.metrics.mower_status)
                  : "—"}
              </button>
            </div>
          </div>
          <div className="kv">
            <div className="k">Progress</div>
            <div className="v">
              <button
                className="metricButton"
                type="button"
                onClick={() => onOpenChart("mower_progress_pct", "Sekačka • Progress")}
              >
                {formatPercent(dashboard?.metrics?.mower_progress_pct)}
              </button>
            </div>
          </div>
          <div className="kv">
            <div className="k">Senzor deště</div>
            <div className="v">
              <button
                className="metricButton"
                type="button"
                onClick={() => onOpenChart("mower_rain_sensor", "Sekačka • Senzor deště")}
              >
                {formatRainSensor(dashboard?.metrics?.mower_rain_sensor)}
              </button>
            </div>
          </div>
          <div className="kv">
            <div className="k">Do spuštění po dešti</div>
            <div className="v">
              <button
                className="metricButton"
                type="button"
                onClick={() =>
                  onOpenChart("mower_rain_sensor_delay_min", "Sekačka • Do spuštění po dešti")
                }
              >
                {formatMinutesLeft(dashboard?.metrics?.mower_rain_sensor_delay_min)}
              </button>
            </div>
          </div>
        </div>

        <div className="tile">
          <div className="tileTitle">Zavlažování</div>
          <div className="kv">
            <div className="k">Sekce (auto)</div>
            <div className="v">
              <button
                className="metricButton"
                type="button"
                onClick={() => onOpenChart("irrigation_auto_any", "Zavlažování • Sekce (auto)")}
              >
                {formatOnOff(dashboard?.metrics?.irrigation_auto_any)}
              </button>
            </div>
          </div>
          <div className="kv">
            <div className="k">Dešťový senzor</div>
            <div className="v">
              <button
                className="metricButton"
                type="button"
                onClick={() =>
                  onOpenChart("irrigation_rain_sensor", "Zavlažování • Dešťový senzor")
                }
              >
                {formatIrrigationRainSensor(dashboard?.metrics?.irrigation_rain_sensor)}
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
