import { Suspense, lazy, useState, type FormEventHandler } from "react";
import type { DictionaryRoom } from "./RoomsDictionaryGrid";
import { SportPlayerAddForm, type SportPlayerAddPayload } from "./SportPlayerAddForm.js";
import { SportTeamAddForm, type SportTeamAddPayload } from "./SportTeamAddForm.js";

const RoomsDictionaryGrid = lazy(() => import("./RoomsDictionaryGrid"));
const SportTeamsDictionaryGrid = lazy(() => import("./SportTeamsDictionaryGrid"));
const SportPlayersDictionaryGrid = lazy(() => import("./SportPlayersDictionaryGrid"));

export type DictionarySportTeam = {
  id: number;
  name: string;
  thesportsdb_team_id: string;
  sport: string | null;
  league_hint: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type DictionarySportPlayer = {
  id: number;
  name: string;
  thesportsdb_player_id: string;
  sport: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type DictionaryTab = "rooms" | "teams" | "players";

type Props = Readonly<{
  rooms: DictionaryRoom[];
  sportTeams: DictionarySportTeam[];
  sportPlayers: DictionarySportPlayer[];
  error: string | null;
  notice: string | null;
  syncingRooms: boolean;
  roomName: string;
  onRoomNameChange: (value: string) => void;
  onAddSportTeam: (payload: SportTeamAddPayload) => Promise<void>;
  onAddSportPlayer: (payload: SportPlayerAddPayload) => Promise<void>;
  onDictionaryError: (message: string) => void;
  onRefresh: () => void;
  onSyncRoomsFromHa: () => void;
  onAddRoom: FormEventHandler<HTMLFormElement>;
  onSportTeamActiveChange: (row: DictionarySportTeam, active: boolean) => void;
  onSportPlayerActiveChange: (row: DictionarySportPlayer, active: boolean) => void;
}>;

function DictionaryRoomsTab({
  rooms,
  roomName,
  onRoomNameChange,
  onAddRoom
}: Readonly<{
  rooms: DictionaryRoom[];
  roomName: string;
  onRoomNameChange: (value: string) => void;
  onAddRoom: FormEventHandler<HTMLFormElement>;
}>) {
  return (
    <section
      className="dictRoomsSection"
      role="tabpanel"
      id="dict-panel-rooms"
      aria-labelledby="dict-tab-rooms"
    >
      <form className="form" onSubmit={onAddRoom}>
        <label className="label">
          <span>Místnost</span>
          <input
            className="input"
            value={roomName}
            onChange={(e) => onRoomNameChange(e.target.value)}
            placeholder="např. Obývák"
          />
        </label>
        <button className="button" type="submit">
          Přidat
        </button>
      </form>
      {rooms.length === 0 ? (
        <p className="muted">Zatím žádné místnosti.</p>
      ) : (
        <Suspense fallback={<p className="muted">Načítám tabulku…</p>}>
          <RoomsDictionaryGrid rows={rooms} />
        </Suspense>
      )}
    </section>
  );
}

function DictionaryTeamsTab({
  sportTeams,
  onAddSportTeam,
  onDictionaryError,
  onSportTeamActiveChange
}: Readonly<{
  sportTeams: DictionarySportTeam[];
  onAddSportTeam: (payload: SportTeamAddPayload) => Promise<void>;
  onDictionaryError: (message: string) => void;
  onSportTeamActiveChange: (row: DictionarySportTeam, active: boolean) => void;
}>) {
  return (
    <section
      className="dictRoomsSection"
      role="tabpanel"
      id="dict-panel-teams"
      aria-labelledby="dict-tab-teams"
    >
      <p className="tileHint">
        Vyber sport a tým z TheSportsDB — do databáze se uloží jen ověřený záznam.
      </p>
      <div className="sportTeamAddSection">
        <SportTeamAddForm onSubmit={onAddSportTeam} onError={onDictionaryError} />
      </div>
      {sportTeams.length === 0 ? (
        <p className="muted">Zatím žádné týmy.</p>
      ) : (
        <div className="dictGridBelowForm">
          <Suspense fallback={<p className="muted">Načítám tabulku…</p>}>
            <SportTeamsDictionaryGrid
              rows={sportTeams}
              onToggleActive={onSportTeamActiveChange}
            />
          </Suspense>
        </div>
      )}
    </section>
  );
}

function DictionaryPlayersTab({
  sportPlayers,
  onAddSportPlayer,
  onDictionaryError,
  onSportPlayerActiveChange
}: Readonly<{
  sportPlayers: DictionarySportPlayer[];
  onAddSportPlayer: (payload: SportPlayerAddPayload) => Promise<void>;
  onDictionaryError: (message: string) => void;
  onSportPlayerActiveChange: (row: DictionarySportPlayer, active: boolean) => void;
}>) {
  return (
    <section
      className="dictRoomsSection"
      role="tabpanel"
      id="dict-panel-players"
      aria-labelledby="dict-tab-players"
    >
      <p className="tileHint">
        Vyber sport a sportovce z TheSportsDB — do databáze se uloží jen ověřený záznam.
      </p>
      <div className="sportTeamAddSection">
        <SportPlayerAddForm onSubmit={onAddSportPlayer} onError={onDictionaryError} />
      </div>
      {sportPlayers.length === 0 ? (
        <p className="muted">Zatím žádní sportovci.</p>
      ) : (
        <div className="dictGridBelowForm">
          <Suspense fallback={<p className="muted">Načítám tabulku…</p>}>
            <SportPlayersDictionaryGrid
              rows={sportPlayers}
              onToggleActive={onSportPlayerActiveChange}
            />
          </Suspense>
        </div>
      )}
    </section>
  );
}

export function DictionariesPage({
  rooms,
  sportTeams,
  sportPlayers,
  error,
  notice,
  syncingRooms,
  roomName,
  onRoomNameChange,
  onAddSportTeam,
  onAddSportPlayer,
  onDictionaryError,
  onRefresh,
  onSyncRoomsFromHa,
  onAddRoom,
  onSportTeamActiveChange,
  onSportPlayerActiveChange
}: Props) {
  const [tab, setTab] = useState<DictionaryTab>("rooms");

  return (
    <>
      <div className="dictPageHeader">
        <div className="dictTabs" role="tablist" aria-label="Číselníky">
          <button
            type="button"
            role="tab"
            id="dict-tab-rooms"
            aria-selected={tab === "rooms"}
            aria-controls="dict-panel-rooms"
            className={`dictTab ${tab === "rooms" ? "active" : ""}`}
            onClick={() => setTab("rooms")}
          >
            Místnosti
          </button>
          <button
            type="button"
            role="tab"
            id="dict-tab-teams"
            aria-selected={tab === "teams"}
            aria-controls="dict-panel-teams"
            className={`dictTab ${tab === "teams" ? "active" : ""}`}
            onClick={() => setTab("teams")}
          >
            Týmy
          </button>
          <button
            type="button"
            role="tab"
            id="dict-tab-players"
            aria-selected={tab === "players"}
            aria-controls="dict-panel-players"
            className={`dictTab ${tab === "players" ? "active" : ""}`}
            onClick={() => setTab("players")}
          >
            Sportovci
          </button>
        </div>
        <div className="actionsRow dictPageActions">
          <button className="ghostButton" type="button" onClick={onRefresh}>
            Obnovit
          </button>
          {tab === "rooms" ? (
            <button
              className="button"
              type="button"
              disabled={syncingRooms}
              onClick={onSyncRoomsFromHa}
            >
              {syncingRooms ? "Synchronizuji…" : "Aktualizace z Home Assistant"}
            </button>
          ) : null}
        </div>
      </div>

      {error ? <div className="error">{error}</div> : null}
      {notice && !error ? <p className="sportSyncNotice">{notice}</p> : null}

      {tab === "rooms" ? (
        <DictionaryRoomsTab
          rooms={rooms}
          roomName={roomName}
          onRoomNameChange={onRoomNameChange}
          onAddRoom={onAddRoom}
        />
      ) : null}

      {tab === "teams" ? (
        <DictionaryTeamsTab
          sportTeams={sportTeams}
          onAddSportTeam={onAddSportTeam}
          onDictionaryError={onDictionaryError}
          onSportTeamActiveChange={onSportTeamActiveChange}
        />
      ) : null}

      {tab === "players" ? (
        <DictionaryPlayersTab
          sportPlayers={sportPlayers}
          onAddSportPlayer={onAddSportPlayer}
          onDictionaryError={onDictionaryError}
          onSportPlayerActiveChange={onSportPlayerActiveChange}
        />
      ) : null}
    </>
  );
}
