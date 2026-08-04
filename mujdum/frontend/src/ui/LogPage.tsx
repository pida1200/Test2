import { Suspense, lazy } from "react";
import type { ActivityLogItem } from "./ActivityLogGrid";

const ActivityLogGrid = lazy(() => import("./ActivityLogGrid"));

type Props = Readonly<{
  error: string | null;
  activities: ActivityLogItem[] | null;
}>;

function LogPageBody({ activities }: Readonly<{ activities: ActivityLogItem[] }>) {
  if (activities.length === 0) {
    return <p className="muted">Žádné záznamy.</p>;
  }

  return (
    <Suspense fallback={<p className="muted">Načítám tabulku…</p>}>
      <ActivityLogGrid rows={activities} />
    </Suspense>
  );
}

export function LogPage({ error, activities }: Props) {
  return (
    <section className="dictRoomsSection" aria-labelledby="log-grid-h">
      <h2 id="log-grid-h" className="h2">
        Aktivitní log
      </h2>
      {error ? <div className="error">{error}</div> : null}
      {activities === null ? (
        <p className="muted">Načítám…</p>
      ) : (
        <LogPageBody activities={activities} />
      )}
    </section>
  );
}
