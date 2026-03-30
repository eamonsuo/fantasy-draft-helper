export interface SleeperPlayer {
  player_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  team: string | null;
  position: string | null;
  age: number | null;
  years_exp: number | null;
  status: string | null;
  injury_status: string | null;
  espn_id: number | null;
  number: number | null;
  depth_chart_order: number | null;
  sport: string;
  fantasy_positions: string[] | null;
  active: boolean;
  birth_country: string | null;
}

export type SleeperPlayersMap = Record<string, SleeperPlayer>;

export interface SleeperScoringSettings {
  pts?: number;
  reb?: number;
  ast?: number;
  stl?: number;
  blk?: number;
  to?: number;
  ftmi?: number;
  tpm?: number;
  oreb?: number;
  pf?: number;
  ff?: number;
  tf?: number;
  dd?: number;
  td?: number;
  bonus_pt_40p?: number;
  bonus_pt_50p?: number;
  bonus_ast_15p?: number;
  bonus_reb_20p?: number;
}

export interface SleeperLeague {
  league_id: string;
  name: string;
  sport: string;
  season: string;
  season_type: string;
  status: string;
  total_rosters: number;
  roster_positions: string[];
  scoring_settings: SleeperScoringSettings;
  settings: Record<string, unknown>;
}

export interface SleeperDraft {
  draft_id: string;
  league_id: string;
  type: string;
  status: string;
  season: string;
  sport: string;
  settings: { rounds: number; pick_timer: number; teams: number; [key: string]: unknown };
}

export interface SleeperDraftPick {
  round: number;
  roster_id: number;
  player_id: string;
  picked_by: string;
  pick_no: number;
  draft_slot: number;
  draft_id: string;
  metadata: { first_name: string; last_name: string; team: string; position: string; [key: string]: string };
}
