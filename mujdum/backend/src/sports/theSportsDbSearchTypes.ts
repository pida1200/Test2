export type TheSportsDbSportOption = {
  name: string;
};

export type TheSportsDbTeamSearchResult = {
  thesportsdb_team_id: string;
  name: string;
  sport: string | null;
  league: string | null;
  country: string | null;
};

export type TheSportsDbTeamVerifyResult = {
  thesportsdb_team_id: string;
  name: string;
  sport: string | null;
  league: string | null;
};

export type TheSportsDbPlayerSearchResult = {
  thesportsdb_player_id: string;
  name: string;
  sport: string | null;
  team: string | null;
};

export type TheSportsDbPlayerVerifyResult = {
  thesportsdb_player_id: string;
  name: string;
  sport: string | null;
  team: string | null;
};
