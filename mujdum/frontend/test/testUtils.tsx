import type { FormEventHandler } from "react";
import { vi } from "vitest";
import type { ActivityLogItem } from "../src/ui/ActivityLogGrid";
import type { Page } from "../src/ui/appUtils.js";
import type {
  DictionarySportPlayer,
  DictionarySportTeam
} from "../src/ui/DictionariesPage.js";
import type { SportUpcomingEvent } from "../src/ui/sportUpcomingFormatters.js";
import type { DashboardResponse } from "../src/ui/useDashboard.js";

type Room = { id: number; name: string; created_at: string };

type SettingsResponse = {
  settings: Record<string, unknown>;
};

export type AppMainContentTestProps = {
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
  onAddSportTeam: (payload: unknown) => Promise<void>;
  onDictionaryError: (message: string) => void;
  onRefreshDictionaries: () => void;
  onSyncRoomsFromHa: () => void;
  onAddRoom: FormEventHandler<HTMLFormElement>;
  onAddSportPlayer: (payload: unknown) => Promise<void>;
  onSportTeamActiveChange: (row: DictionarySportTeam, active: boolean) => void;
  onSportPlayerActiveChange: (row: DictionarySportPlayer, active: boolean) => void;
  onDashIntervalChange: (value: string) => void;
  onSportIntervalChange: (value: string) => void;
  onSaveDashboardInterval: () => void;
  onSaveSportInterval: () => void;
};

export function createAppMainContentProps(
  overrides: Partial<AppMainContentTestProps> = {}
): AppMainContentTestProps {
  return {
    page: "dashboard",
    error: null,
    dashboard: null,
    rooms: [],
    sportTeams: [],
    sportPlayers: [],
    dictNotice: null,
    syncingRooms: false,
    name: "",
    activities: null,
    settings: null,
    dashIntervalSeconds: "30",
    sportIntervalSeconds: "180",
    savingSettings: false,
    savingSportSettings: false,
    sportEvents: null,
    sportSyncedAt: null,
    sportSyncNotice: null,
    syncingSport: false,
    onOpenChart: vi.fn(),
    onOpenElectricityChart: vi.fn(),
    onRoomNameChange: vi.fn(),
    onAddSportTeam: vi.fn(async () => {}),
    onDictionaryError: vi.fn(),
    onRefreshDictionaries: vi.fn(),
    onSyncRoomsFromHa: vi.fn(),
    onAddRoom: vi.fn(),
    onAddSportPlayer: vi.fn(async () => {}),
    onSportTeamActiveChange: vi.fn(),
    onSportPlayerActiveChange: vi.fn(),
    onDashIntervalChange: vi.fn(),
    onSportIntervalChange: vi.fn(),
    onSaveDashboardInterval: vi.fn(),
    onSaveSportInterval: vi.fn(),
    ...overrides
  };
}

export const sampleSportEvent: SportUpcomingEvent = {
  id: 1,
  title: "Sparta — Slavia",
  home_team: "Sparta",
  away_team: "Slavia",
  starts_at: "2026-06-01T18:00:00.000Z",
  league: "Fortuna liga",
  sport: "Soccer",
  team_name: "Sparta",
  player_name: null
};

export const sampleActivity: ActivityLogItem = {
  id: "1",
  "@timestamp": "2026-05-30T12:00:00.000Z",
  level: "info",
  event: "dashboard.ha_sync",
  message: "Sync OK"
};
