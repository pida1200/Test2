create table if not exists sports_upcoming_events (
  id bigserial primary key,
  source text not null default 'thesportsdb',
  external_event_id text not null,
  title text not null,
  home_team text not null default '',
  away_team text not null default '',
  starts_at timestamptz,
  league text,
  sport text,
  sport_team_id bigint references sport_teams (id) on delete set null,
  sport_player_id bigint references sport_players (id) on delete set null,
  synced_at timestamptz not null default now()
);

create unique index if not exists sports_upcoming_events_source_external_id_key
  on sports_upcoming_events (source, external_event_id);

create index if not exists sports_upcoming_events_starts_at_idx
  on sports_upcoming_events (starts_at);

create index if not exists sports_upcoming_events_sport_team_id_idx
  on sports_upcoming_events (sport_team_id);

create index if not exists sports_upcoming_events_sport_player_id_idx
  on sports_upcoming_events (sport_player_id);
