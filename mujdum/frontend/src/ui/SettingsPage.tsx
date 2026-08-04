import { parseNumberSetting } from "./appUtils.js";

type SettingsResponse = {
  settings: Record<string, unknown>;
};

type Props = Readonly<{
  error: string | null;
  settings: SettingsResponse | null;
  dashIntervalSeconds: string;
  sportIntervalSeconds: string;
  savingSettings: boolean;
  savingSportSettings: boolean;
  onDashIntervalChange: (value: string) => void;
  onSportIntervalChange: (value: string) => void;
  onSaveDashboardInterval: () => void;
  onSaveSportInterval: () => void;
}>;

function formatCurrentIntervalMs(ms: unknown, fallback: string): string {
  const n = parseNumberSetting(ms);
  if (typeof ms === "number" && Number.isFinite(n) && n > 0) {
    return `${Math.round(n / 1000)} s`;
  }
  return fallback;
}

export function SettingsPage({
  error,
  settings,
  dashIntervalSeconds,
  sportIntervalSeconds,
  savingSettings,
  savingSportSettings,
  onDashIntervalChange,
  onSportIntervalChange,
  onSaveDashboardInterval,
  onSaveSportInterval
}: Props) {
  const dashCurrent = formatCurrentIntervalMs(
    settings?.settings?.dashboard_sync_interval_ms,
    "—"
  );
  const sportCurrent = formatCurrentIntervalMs(
    settings?.settings?.sport_sync_interval_ms,
    "180 s (výchozí)"
  );

  return (
    <section className="settings">
      {error ? <div className="error">{error}</div> : null}
      <div className="tile">
        <div className="tileTitle">Home Assistant</div>
        <div className="tileHint">Interval načítání dat pro Dashboard (backend sync).</div>

        <div className="settingsRow">
          <label className="label">
            <span>Interval (sekundy)</span>
            <input
              className="input"
              inputMode="numeric"
              value={dashIntervalSeconds}
              onChange={(e) => onDashIntervalChange(e.target.value)}
              placeholder="např. 30"
            />
          </label>
          <button
            className="button"
            type="button"
            disabled={savingSettings}
            onClick={onSaveDashboardInterval}
          >
            {savingSettings ? "Ukládám…" : "Uložit"}
          </button>
        </div>

        <div className="tileHint">Aktuálně: {dashCurrent}</div>
      </div>

      <div className="tile">
        <div className="tileTitle">Sport (TheSportsDB)</div>
        <div className="tileHint">
          Interval načítání nadcházejících zápasů z TheSportsDB (backend job). Výchozí 3 minuty.
        </div>

        <div className="settingsRow">
          <label className="label">
            <span>Interval (sekundy)</span>
            <input
              className="input"
              inputMode="numeric"
              value={sportIntervalSeconds}
              onChange={(e) => onSportIntervalChange(e.target.value)}
              placeholder="180"
            />
          </label>
          <button
            className="button"
            type="button"
            disabled={savingSportSettings}
            onClick={onSaveSportInterval}
          >
            {savingSportSettings ? "Ukládám…" : "Uložit"}
          </button>
        </div>

        <div className="tileHint">Aktuálně: {sportCurrent}</div>
      </div>
    </section>
  );
}
