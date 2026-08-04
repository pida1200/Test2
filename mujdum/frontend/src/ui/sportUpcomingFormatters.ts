import { APP_TIMEZONE } from "./chartTimezone.js";

export type SportUpcomingEvent = {
  id: number;
  title: string;
  home_team: string;
  away_team: string;
  starts_at: string | null;
  league: string | null;
  sport: string | null;
  team_name: string | null;
  player_name: string | null;
};

export function formatSportEventStartsAt(startsAt: string | null): string {
  if (!startsAt) return "Čas neuveden";
  const d = new Date(startsAt);
  if (!Number.isFinite(d.getTime())) return "Čas neuveden";
  return d.toLocaleString("cs-CZ", {
    timeZone: APP_TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function sportEventMatchLabel(
  event: Pick<SportUpcomingEvent, "title" | "home_team" | "away_team">
): string {
  const title = event.title.trim();
  if (title) return title;
  const home = event.home_team.trim();
  const away = event.away_team.trim();
  if (home && away) return `${home} vs ${away}`;
  return home || away || "Utkání";
}

export function sportEventMetaLine(
  event: Pick<SportUpcomingEvent, "league" | "sport" | "team_name" | "player_name">
): string | null {
  const parts: string[] = [];
  if (event.league?.trim()) parts.push(event.league.trim());
  if (event.sport?.trim()) parts.push(event.sport.trim());
  const source = [event.team_name, event.player_name].filter(Boolean).join(" · ");
  if (source) parts.push(source);
  return parts.length > 0 ? parts.join(" · ") : null;
}
