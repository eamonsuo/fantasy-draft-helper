/** Pagination metadata returned by every paginated NBA API response. */
export interface NbaApiPagination {
  page: number;
  pageSize: number;
  pages: number;
  total: number;
}

/** controllers.PlayerGameBasicStatDTO */
export interface NbaApiPlayerGameBasicStat {
  playerId: string;
  playerName: string;
  /** Team abbreviation (e.g. "LAL") */
  team: string;
  /** Minutes played in "MM:SS" format */
  mp: string;
  fg: number;
  fga: number;
  fgPercent: number;
  threeP: number;
  threePa: number;
  threePPercent: number;
  ft: number;
  fta: number;
  ftPercent: number;
  orb: number;
  drb: number;
  trb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  pf: number;
  pts: number;
  plusMinus: number;
  gmSc: number;
  status: string;
}

/** controllers.GameResponseDTO (subset of fields we use) */
export interface NbaApiGameResponse {
  gameId: string;
  date: string;
  homeTeam: string;
  visitorTeam: string;
  homePts: number;
  visitorPts: number;
  isPlayoff: boolean;
  arena: string;
  startTimeET: string;
  gameDuration: string;
  playerGameBasicStats: NbaApiPlayerGameBasicStat[];
}

/** controllers.GamesResponse */
export interface NbaApiGamesResponse {
  data: NbaApiGameResponse[];
  pagination: NbaApiPagination;
}
