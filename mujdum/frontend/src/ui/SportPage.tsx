import { Suspense, lazy } from "react";
import type { SportUpcomingEvent } from "./sportUpcomingFormatters.js";

const SportUpcomingList = lazy(() => import("./SportUpcomingList"));

type Props = Readonly<{
  error: string | null;
  sportSyncNotice: string | null;
  sportSyncedAt: string | null;
  sportEvents: SportUpcomingEvent[] | null;
  syncingSport: boolean;
}>;

function SportEmptyMessage({ sportSyncedAt }: Readonly<{ sportSyncedAt: string | null }>) {
  if (sportSyncedAt) {
    return (
      <p className="muted">
        Žádná utkání od začátku dnešního dne. Přidej aktivní tým v Číselnících nebo obnov sync
        později.
      </p>
    );
  }

  return (
    <p className="muted">
      Žádné nadcházející akce. Přidej tým v Číselnících, nastav <code>THESPORTSDB_API_KEY</code> a
      zkus Obnovit.
    </p>
  );
}

function SportEventsBody({
  sportEvents,
  syncingSport
}: Readonly<{
  sportEvents: SportUpcomingEvent[] | null;
  syncingSport: boolean;
}>) {
  if (sportEvents === null || syncingSport) {
    return <p className="muted">{syncingSport ? "Synchronizuji…" : "Načítám…"}</p>;
  }

  if (sportEvents.length === 0) {
    return null;
  }

  return (
    <Suspense fallback={<p className="muted">Načítám seznam…</p>}>
      <SportUpcomingList events={sportEvents} />
    </Suspense>
  );
}

export function SportPage({
  error,
  sportSyncNotice,
  sportSyncedAt,
  sportEvents,
  syncingSport
}: Props) {
  const showEmpty = sportEvents !== null && !syncingSport && sportEvents.length === 0;

  return (
    <section className="dictRoomsSection" aria-labelledby="sport-upcoming-h">
      {error ? <div className="error">{error}</div> : null}
      {sportSyncNotice ? <p className="sportSyncNotice">{sportSyncNotice}</p> : null}
      <p className="tileHint">
        Nadcházející utkání pro aktivní týmy a sportovce z číselníků. Obnovit spustí sync z
        TheSportsDB a načte cache.
        {sportSyncedAt
          ? ` Poslední sync: ${new Date(sportSyncedAt).toLocaleString("cs-CZ")}.`
          : null}
      </p>
      <h2 id="sport-upcoming-h" className="h2">
        Nadcházející akce
      </h2>
      <SportEventsBody sportEvents={sportEvents} syncingSport={syncingSport} />
      {showEmpty ? <SportEmptyMessage sportSyncedAt={sportSyncedAt} /> : null}
    </section>
  );
}
