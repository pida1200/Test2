import {
  formatSportEventStartsAt,
  sportEventMatchLabel,
  sportEventMetaLine,
  type SportUpcomingEvent
} from "./sportUpcomingFormatters.js";

export default function SportUpcomingList({
  events
}: Readonly<{ events: SportUpcomingEvent[] }>) {
  return (
    <ul className="sportEventList">
      {events.map((event) => {
        const meta = sportEventMetaLine(event);
        return (
          <li key={event.id} className="sportEventCard">
            <div className="sportEventWhen">{formatSportEventStartsAt(event.starts_at)}</div>
            <div className="sportEventTitle">{sportEventMatchLabel(event)}</div>
            {meta ? <div className="sportEventMeta">{meta}</div> : null}
          </li>
        );
      })}
    </ul>
  );
}
