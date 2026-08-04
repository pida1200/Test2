import { Suspense, lazy } from "react";
import type { FormEventHandler } from "react";
import type { ActivityLogItem } from "./ActivityLogGrid";
import { DashboardPage } from "./DashboardPage.js";
import {
  DictionariesPage,
  type DictionarySportPlayer,
  type DictionarySportTeam
} from "./DictionariesPage.js";
import { LogPage } from "./LogPage.js";
import { SettingsPage } from "./SettingsPage.js";
import { SportPage } from "./SportPage.js";
import type { Page } from "./appUtils.js";
import type { SportPlayerAddPayload } from "./SportPlayerAddForm.js";
import type { SportTeamAddPayload } from "./SportTeamAddForm.js";
import type { SportUpcomingEvent } from "./sportUpcomingFormatters.js";
import type { DashboardResponse } from "./useDashboard.js";

const TestUiCharts = lazy(() => import("./TestUiCharts"));

type Room = { id: number; name: string; created_at: string };

type SettingsResponse = {
  settings: Record<string, unknown>;
};

type Props = Readonly<{
  page: Page;
  error: string | null;
  dashboard: DashboardResponse | null;
  rooms: Room[];
  sportTeams: DictionarySportTeam[];
  sportPlayers: DictionarySportPlayer[];
  dictNotice: string | null;
  syncingRooms: boolean;
  name: string;
  activities: ActivityLogItem[] | null;
  settings: SettingsResponse | null;
  dashIntervalSeconds: string;
  sportIntervalSeconds: string;
  savingSettings: boolean;
  savingSportSettings: boolean;
  sportEvents: SportUpcomingEvent[] | null;
  sportSyncedAt: string | null;
  sportSyncNotice: string | null;
  syncingSport: boolean;
  onOpenChart: (key: string, title: string) => void;
  onOpenElectricityChart: () => void;
  onRoomNameChange: (value: string) => void;
  onAddSportTeam: (payload: SportTeamAddPayload) => Promise<void>;
  onDictionaryError: (message: string) => void;
  onRefreshDictionaries: () => void;
  onSyncRoomsFromHa: () => void;
  onAddRoom: FormEventHandler<HTMLFormElement>;
  onAddSportPlayer: (payload: SportPlayerAddPayload) => Promise<void>;
  onSportTeamActiveChange: (row: DictionarySportTeam, active: boolean) => void;
  onSportPlayerActiveChange: (row: DictionarySportPlayer, active: boolean) => void;
  onDashIntervalChange: (value: string) => void;
  onSportIntervalChange: (value: string) => void;
  onSaveDashboardInterval: () => void;
  onSaveSportInterval: () => void;
}>;

export function AppMainContent(props: Props) {
  switch (props.page) {
    case "dashboard":
      return (
        <DashboardPage
          error={props.error}
          dashboard={props.dashboard}
          onOpenChart={props.onOpenChart}
          onOpenElectricityChart={props.onOpenElectricityChart}
        />
      );
    case "dictionaries":
      return (
        <DictionariesPage
          rooms={props.rooms}
          sportTeams={props.sportTeams}
          sportPlayers={props.sportPlayers}
          error={props.error}
          notice={props.dictNotice}
          syncingRooms={props.syncingRooms}
          roomName={props.name}
          onRoomNameChange={props.onRoomNameChange}
          onAddSportTeam={props.onAddSportTeam}
          onDictionaryError={props.onDictionaryError}
          onRefresh={props.onRefreshDictionaries}
          onSyncRoomsFromHa={props.onSyncRoomsFromHa}
          onAddRoom={props.onAddRoom}
          onAddSportPlayer={props.onAddSportPlayer}
          onSportTeamActiveChange={props.onSportTeamActiveChange}
          onSportPlayerActiveChange={props.onSportPlayerActiveChange}
        />
      );
    case "sport":
      return (
        <SportPage
          error={props.error}
          sportSyncNotice={props.sportSyncNotice}
          sportSyncedAt={props.sportSyncedAt}
          sportEvents={props.sportEvents}
          syncingSport={props.syncingSport}
        />
      );
    case "log":
      return <LogPage error={props.error} activities={props.activities} />;
    case "settings":
      return (
        <SettingsPage
          error={props.error}
          settings={props.settings}
          dashIntervalSeconds={props.dashIntervalSeconds}
          sportIntervalSeconds={props.sportIntervalSeconds}
          savingSettings={props.savingSettings}
          savingSportSettings={props.savingSportSettings}
          onDashIntervalChange={props.onDashIntervalChange}
          onSportIntervalChange={props.onSportIntervalChange}
          onSaveDashboardInterval={props.onSaveDashboardInterval}
          onSaveSportInterval={props.onSaveSportInterval}
        />
      );
    case "testUi":
      return (
        <Suspense fallback={<p className="muted">Načítám knihovny grafů…</p>}>
          <TestUiCharts />
        </Suspense>
      );
    default:
      return null;
  }
}
