export interface SeasonStats {
  season: string;
  gamesPlayed: number;
  totalTeamGames: number;
  gamesPlayedPct: number;
  fantasyAvg: number;
  weeklyHighAvg: number;
}

export interface ProcessedPlayerData {
  playerId: string;
  espnId: string | null;
  fullName: string;
  team: string;
  position: string;
  fantasyPositions: string[];
  seasons: SeasonStats[];
  gamesPlayedPctTotal: number;
  fantasyAvgTotal: number;
  weeklyHighAvgTotal: number;
  lastUpdated: string;
  isDrafted: boolean;
  injuryStatus: string | null;
  birthCountry: string | null;
}

export interface Player {
  playerId: string;
  espnId: number | null;
  fullName: string;
  firstName: string;
  lastName: string;
  team: string;
  position: string;
  fantasyPositions: string[];
  age: number | null;
  yearsExp: number | null;
  status: string | null;
  injuryStatus: string | null;
  number: number | null;
  birthCountry: string | null;
}
