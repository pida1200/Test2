create table if not exists sport_teams (
  id bigserial primary key,
  name text not null,
  thesportsdb_team_id text not null,
  sport text,
  league_hint text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists sport_teams_thesportsdb_team_id_key
  on sport_teams (thesportsdb_team_id);

create table if not exists sport_players (
  id bigserial primary key,
  name text not null,
  thesportsdb_player_id text not null,
  sport text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists sport_players_thesportsdb_player_id_key
  on sport_players (thesportsdb_player_id);
