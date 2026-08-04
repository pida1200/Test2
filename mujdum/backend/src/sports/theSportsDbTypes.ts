/** Normalized upcoming event from TheSportsDB (v1 eventsnext). */
export type UpcomingSportEvent = {
  externalEventId: string;
  title: string;
  homeTeam: string;
  awayTeam: string;
  /** Best-effort ISO UTC; may be null if date/time from API is incomplete */
  startsAtUtc: string | null;
  league: string | null;
  sport: string | null;
};

export type TheSportsDbRawEvent = {
  idEvent?: string;
  strEvent?: string;
  strHomeTeam?: string;
  strAwayTeam?: string;
  dateEvent?: string;
  strTime?: string;
  strLeague?: string;
  strSport?: string;
  [key: string]: unknown;
};
