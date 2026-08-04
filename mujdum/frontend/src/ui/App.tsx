import { useCallback, useEffect, useRef, useState, type FormEventHandler } from "react";
import { getApiErrorMessage } from "../apiError.js";
import { AppMainContent } from "./AppMainContent.js";
import { ChartModal } from "./ChartModal.js";
import { PAGE_TITLES, readDashIntervalSeconds, readSportIntervalSeconds, type Page } from "./appUtils.js";
import { useDashboard } from "./useDashboard.js";
import { useMetricChart } from "./useMetricChart.js";
import type { ActivityLogItem } from "./ActivityLogGrid";
import type { SportUpcomingEvent } from "./sportUpcomingFormatters.js";
import {
  type DictionarySportPlayer,
  type DictionarySportTeam
} from "./DictionariesPage.js";
import type { SportPlayerAddPayload } from "./SportPlayerAddForm.js";
import type { SportTeamAddPayload } from "./SportTeamAddForm.js";

type Room = { id: number; name: string; created_at: string };
type SettingsResponse = {
  settings: Record<string, unknown>;
};

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [sportTeams, setSportTeams] = useState<DictionarySportTeam[]>([]);
  const [sportPlayers, setSportPlayers] = useState<DictionarySportPlayer[]>([]);
  const [activities, setActivities] = useState<ActivityLogItem[] | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const onDictionaryError = useCallback((message: string) => {
    setError(message);
  }, []);
  const [syncingRooms, setSyncingRooms] = useState(false);
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [dashIntervalSeconds, setDashIntervalSeconds] = useState<string>("");
  const [sportIntervalSeconds, setSportIntervalSeconds] = useState<string>("180");
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingSportSettings, setSavingSportSettings] = useState(false);
  const [sportEvents, setSportEvents] = useState<SportUpcomingEvent[] | null>(null);
  const [sportSyncedAt, setSportSyncedAt] = useState<string | null>(null);
  const [sportSyncNotice, setSportSyncNotice] = useState<string | null>(null);
  const [syncingSport, setSyncingSport] = useState(false);
  const [dictNotice, setDictNotice] = useState<string | null>(null);
  const dictionariesLoadGenRef = useRef(0);
  const { dashboard, loadDashboard } = useDashboard({
    onLoadError: (message) => setError(message)
  });
  const {
    chart,
    closeChart,
    openChart,
    openElectricityChart,
    setChartWindow,
    setElectricityView,
    electricitySupportsBars,
    shiftChartPeriod,
    resetChartToCurrentPeriod,
    chartSupportsCalendarNav,
    chartCalendarPeriodKind,
    chartPeriodNavPrevLabel,
    chartPeriodNavNextLabel,
    formatChartPeriodLabel,
    isCurrentPeriod,
    isPeriodAnchorInFuture,
    isElectricityCombinedChart,
    currentPeriodAnchor
  } = useMetricChart();

  async function loadRooms() {
    const res = await fetch("/api/dictionaries/rooms");
    const json = (await res.json()) as { items: Room[] };
    setRooms(json.items);
  }

  function isStaleDictionaryLoad(gen: number) {
    return gen !== dictionariesLoadGenRef.current;
  }

  async function loadSportTeams(loadGen?: number) {
    const res = await fetch("/api/dictionaries/sport-teams");
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      throw new Error(getApiErrorMessage(json, "Nepodařilo se načíst týmy."));
    }
    const json = (await res.json()) as { items: DictionarySportTeam[] };
    if (loadGen !== undefined && isStaleDictionaryLoad(loadGen)) return;
    setSportTeams(json.items);
  }

  async function loadSportPlayers(loadGen?: number) {
    const res = await fetch("/api/dictionaries/sport-players");
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      throw new Error(getApiErrorMessage(json, "Nepodařilo se načíst sportovce."));
    }
    const json = (await res.json()) as { items: DictionarySportPlayer[] };
    if (loadGen !== undefined && isStaleDictionaryLoad(loadGen)) return;
    setSportPlayers(json.items);
  }

  async function loadDictionaries() {
    dictionariesLoadGenRef.current += 1;
    setDictNotice(null);
    await Promise.all([loadRooms(), loadSportTeams(), loadSportPlayers()]);
  }

  async function syncRoomsFromHomeAssistant() {
    setSyncingRooms(true);
    setError(null);
    try {
      const res = await fetch("/api/dictionaries/rooms/sync-from-home-assistant", {
        method: "POST",
        headers: { "content-type": "application/json" }
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(getApiErrorMessage(json, "Sync selhal."));
      }
      await loadRooms();
    } finally {
      setSyncingRooms(false);
    }
  }

  async function loadActivities() {
    const res = await fetch("/api/logs/activities");
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      throw new Error(getApiErrorMessage(json, "Nepodařilo se načíst logy."));
    }
    const json = (await res.json()) as { items: ActivityLogItem[] };
    setActivities(json.items);
  }

  async function loadSettings() {
    const res = await fetch("/api/settings");
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      throw new Error(getApiErrorMessage(json, "Nepodařilo se načíst nastavení."));
    }
    const json = (await res.json()) as SettingsResponse;
    setSettings(json);
    setDashIntervalSeconds(readDashIntervalSeconds(json));
    setSportIntervalSeconds(readSportIntervalSeconds(json));
  }

  async function saveDashboardInterval() {
    setSavingSettings(true);
    setError(null);
    try {
      const s = Number(dashIntervalSeconds);
      if (!Number.isFinite(s) || s < 5 || s > 600) {
        throw new Error("Interval musí být 5–600 sekund.");
      }
      const res = await fetch("/api/settings/dashboard-sync-interval-ms", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ value: Math.trunc(s * 1000) })
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(getApiErrorMessage(json, "Uložení selhalo."));
      }
      await loadSettings();
    } finally {
      setSavingSettings(false);
    }
  }

  async function loadSportUpcoming() {
    const res = await fetch("/api/sport/upcoming");
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      throw new Error(getApiErrorMessage(json, "Nepodařilo se načíst sportovní program."));
    }
    const json = (await res.json()) as {
      items: SportUpcomingEvent[];
      synced_at: string | null;
    };
    setSportEvents(json.items);
    setSportSyncedAt(json.synced_at);
  }

  async function refreshSport() {
    setSyncingSport(true);
    setError(null);
    setSportSyncNotice(null);
    try {
      const syncRes = await fetch("/api/sport/sync", { method: "POST" });
      if (!syncRes.ok) {
        const json = await syncRes.json().catch(() => null);
        throw new Error(getApiErrorMessage(json, "Synchronizace sportu selhala."));
      }
      const syncJson = (await syncRes.json()) as {
        errors?: string[];
        events_upserted?: number;
      };
      if (syncJson.errors && syncJson.errors.length > 0) {
        setSportSyncNotice(
          `Sync dokončen s upozorněními (${syncJson.errors.length}): ${syncJson.errors.slice(0, 2).join(" · ")}`
        );
      }
      await loadSportUpcoming();
    } finally {
      setSyncingSport(false);
    }
  }

  async function saveSportSyncInterval() {
    setSavingSportSettings(true);
    setError(null);
    try {
      const s = Number(sportIntervalSeconds);
      if (!Number.isFinite(s) || s < 5 || s > 600) {
        throw new Error("Interval musí být 5–600 sekund.");
      }
      const res = await fetch("/api/settings/sport-sync-interval-ms", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ value: Math.trunc(s * 1000) })
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(getApiErrorMessage(json, "Uložení selhalo."));
      }
      await loadSettings();
    } finally {
      setSavingSportSettings(false);
    }
  }

  useEffect(() => {
    if (page !== "dictionaries") return;
    const loadGen = ++dictionariesLoadGenRef.current;
    setDictNotice(null);
    Promise.all([loadRooms(), loadSportTeams(loadGen), loadSportPlayers(loadGen)]).catch((e) =>
      setError(errorMessage(e, "Nepodařilo se načíst číselníky."))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- načtení jen při vstupu na Číselníky
  }, [page]);

  useEffect(() => {
    if (page !== "log") return;
    loadActivities().catch((e) => setError(errorMessage(e, "Nepodařilo se načíst logy.")));
  }, [page]);

  useEffect(() => {
    if (page !== "settings") return;
    loadSettings().catch((e) => setError(errorMessage(e, "Nepodařilo se načíst nastavení.")));
  }, [page]);

  useEffect(() => {
    if (page !== "sport") return;
    setSportEvents(null);
    refreshSport().catch((e) => setError(errorMessage(e, "Nepodařilo se načíst sport.")));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- načtení jen při vstupu na záložku Sport
  }, [page]);

  const onAddRoom: FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) return;

    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: trimmed })
    });

    if (!res.ok) {
      const json = await res.json().catch(() => null);
      setError(getApiErrorMessage(json, "Nepodařilo se uložit místnost."));
      return;
    }

    setName("");
    await loadRooms();
  };

  async function onAddSportTeam(payload: SportTeamAddPayload) {
    setError(null);
    setDictNotice(null);

    const res = await fetch("/api/dictionaries/sport-teams", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: payload.name,
        thesportsdb_team_id: payload.thesportsdb_team_id,
        sport: payload.sport,
        league_hint: payload.league_hint
      })
    });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      throw new Error(getApiErrorMessage(json, "Nepodařilo se uložit tým."));
    }

    dictionariesLoadGenRef.current += 1;
    await loadSportTeams();
    setDictNotice(`Tým „${payload.name}“ byl uložen.`);
  }

  async function onAddSportPlayer(payload: SportPlayerAddPayload) {
    setError(null);
    setDictNotice(null);

    const res = await fetch("/api/dictionaries/sport-players", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: payload.name,
        thesportsdb_player_id: payload.thesportsdb_player_id,
        sport: payload.sport
      })
    });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      throw new Error(getApiErrorMessage(json, "Nepodařilo se uložit sportovce."));
    }

    dictionariesLoadGenRef.current += 1;
    await loadSportPlayers();
    setDictNotice(`Sportovec „${payload.name}“ byl uložen.`);
  }

  async function setSportTeamActive(row: DictionarySportTeam, active: boolean) {
    setError(null);
    const res = await fetch(`/api/dictionaries/sport-teams/${row.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ active })
    });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      setError(getApiErrorMessage(json, "Úprava týmu selhala."));
      return;
    }
    await loadSportTeams();
  }

  async function setSportPlayerActive(row: DictionarySportPlayer, active: boolean) {
    setError(null);
    const res = await fetch(`/api/dictionaries/sport-players/${row.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ active })
    });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      setError(getApiErrorMessage(json, "Úprava sportovce selhala."));
      return;
    }
    await loadSportPlayers();
  }

  function handleRefresh() {
    if (page === "dashboard") loadDashboard().catch(() => {});
    if (page === "sport") refreshSport().catch(() => {});
    if (page === "log") loadActivities().catch(() => {});
    if (page === "settings") loadSettings().catch(() => {});
  }

  const chartApi = {
    closeChart,
    setChartWindow,
    setElectricityView,
    electricitySupportsBars,
    shiftChartPeriod,
    resetChartToCurrentPeriod,
    chartSupportsCalendarNav,
    chartCalendarPeriodKind,
    chartPeriodNavPrevLabel,
    chartPeriodNavNextLabel,
    formatChartPeriodLabel,
    isCurrentPeriod,
    isPeriodAnchorInFuture,
    isElectricityCombinedChart,
    currentPeriodAnchor
  };

  return (
    <div className="shell">
      <header className="appHeader">
        <div className="brand">
          <div className="brandTitle">Můj dům</div>
          <div className="brandSub">Dashboard & číselníky</div>
        </div>

        <nav className="nav" aria-label="Hlavní navigace">
          {(Object.keys(PAGE_TITLES) as Page[]).map((pageKey) => (
            <button
              key={pageKey}
              className={`navItem ${page === pageKey ? "active" : ""}`}
              onClick={() => setPage(pageKey)}
            >
              {PAGE_TITLES[pageKey]}
            </button>
          ))}
        </nav>
      </header>

      <div className="content">
        <header className="topbar">
          <div className="topbarTitle">{PAGE_TITLES[page]}</div>
          {page === "testUi" ? (
            <span className="testUiTopbarSpacer" aria-hidden />
          ) : (
            <button className="ghostButton" onClick={handleRefresh}>
              Obnovit
            </button>
          )}
        </header>

        <main className="card">
          <AppMainContent
            page={page}
            error={error}
            dashboard={dashboard}
            rooms={rooms}
            sportTeams={sportTeams}
            sportPlayers={sportPlayers}
            dictNotice={dictNotice}
            syncingRooms={syncingRooms}
            name={name}
            activities={activities}
            settings={settings}
            dashIntervalSeconds={dashIntervalSeconds}
            sportIntervalSeconds={sportIntervalSeconds}
            savingSettings={savingSettings}
            savingSportSettings={savingSportSettings}
            sportEvents={sportEvents}
            sportSyncedAt={sportSyncedAt}
            sportSyncNotice={sportSyncNotice}
            syncingSport={syncingSport}
            onOpenChart={openChart}
            onOpenElectricityChart={openElectricityChart}
            onRoomNameChange={setName}
            onAddSportTeam={onAddSportTeam}
            onDictionaryError={onDictionaryError}
            onRefreshDictionaries={() =>
              loadDictionaries().catch((e) => setError(errorMessage(e, "Obnovení selhalo.")))
            }
            onSyncRoomsFromHa={() =>
              syncRoomsFromHomeAssistant().catch((e) =>
                setError(errorMessage(e, "Sync z HA selhal."))
              )
            }
            onAddRoom={onAddRoom}
            onAddSportPlayer={onAddSportPlayer}
            onSportTeamActiveChange={(row, active) => {
              setSportTeamActive(row, active).catch(() => {});
            }}
            onSportPlayerActiveChange={(row, active) => {
              setSportPlayerActive(row, active).catch(() => {});
            }}
            onDashIntervalChange={setDashIntervalSeconds}
            onSportIntervalChange={setSportIntervalSeconds}
            onSaveDashboardInterval={() =>
              saveDashboardInterval().catch((e) =>
                setError(errorMessage(e, "Uložení selhalo."))
              )
            }
            onSaveSportInterval={() =>
              saveSportSyncInterval().catch((e) =>
                setError(errorMessage(e, "Uložení selhalo."))
              )
            }
          />
        </main>
      </div>

      {chart ? <ChartModal chart={chart} chartApi={chartApi} /> : null}
    </div>
  );
}
