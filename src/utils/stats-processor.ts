import type { NbaGameEntry } from "@/api/nbaapi";
import type { NbaApiPlayerGameBasicStat } from "@/types/nbaapi";
import type { Player, ProcessedPlayerData, SeasonStats } from "@/types/player";
import type { SleeperScoringSettings } from "@/types/sleeper";
import { calculateFantasyPoints, type GameStats } from "./fantasy-scoring";

/**
 * Fallback: derive an approximate week number from a game date.
 * NBA regular season typically starts late October.
 * Week 1 starts on the Monday of the first game week.
 */
function getWeekFromDate(dateStr: string): number {
  if (!dateStr) return 0;
  const date = new Date(dateStr);
  // Use ISO week-of-year as a reasonable proxy
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / 86400000);
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
}

/**
 * Parse an NBA API "MM:SS" minutes string to a decimal number of minutes.
 */
function parseMp(mp: string): number {
  if (!mp) return 0;
  const [mm, ss] = mp.split(":");
  const mins = parseInt(mm ?? "0", 10);
  const secs = parseInt(ss ?? "0", 10);
  return isNaN(mins) ? 0 : mins + (isNaN(secs) ? 0 : secs / 60);
}

/**
 * Convert a NbaApiPlayerGameBasicStat to the GameStats shape expected
 * by calculateFantasyPoints.
 */
function nbaStatToGameStats(stat: NbaApiPlayerGameBasicStat): GameStats {
  return {
    minutes: parseMp(stat.mp),
    points: stat.pts,
    rebounds: stat.trb,
    offensiveRebounds: stat.orb,
    defensiveRebounds: stat.drb,
    assists: stat.ast,
    steals: stat.stl,
    blocks: stat.blk,
    turnovers: stat.tov,
    fieldGoalsMade: stat.fg,
    fieldGoalsAttempted: stat.fga,
    freeThrowsMade: stat.ft,
    freeThrowsAttempted: stat.fta,
    threePointFieldGoalsMade: stat.threeP,
    threePointFieldGoalsAttempted: stat.threePa,
    personalFouls: stat.pf,
  };
}

/**
 * Process a single season's NBA API game entries into SeasonStats.
 * Total team games defaults to 82 (regular season).
 */
export function processSeasonStatsFromNbaApi(
  entries: NbaGameEntry[],
  seasonDisplay: string,
  scoring: SleeperScoringSettings,
  totalTeamGames = 82,
): SeasonStats {
  const played = entries.filter((e) => parseMp(e.stats.mp) > 0);
  const gamesPlayed = played.length;

  if (gamesPlayed === 0) {
    return {
      season: seasonDisplay,
      gamesPlayed: 0,
      totalTeamGames,
      gamesPlayedPct: 0,
      fantasyAvg: 0,
      weeklyHighAvg: 0,
    };
  }

  const withFp = played.map((e) => ({
    date: e.date,
    fantasyPoints: calculateFantasyPoints(nbaStatToGameStats(e.stats), scoring),
  }));

  const gamesPlayedPct = Math.round((gamesPlayed / totalTeamGames) * 10000) / 100;

  const totalFP = withFp.reduce((sum, g) => sum + g.fantasyPoints, 0);
  const fantasyAvg = Math.round((totalFP / gamesPlayed) * 100) / 100;

  // Weekly high avg — group by ISO week, take max per week, then average
  const weekMap = new Map<number, number[]>();
  for (const g of withFp) {
    const week = getWeekFromDate(g.date);
    if (!weekMap.has(week)) weekMap.set(week, []);
    weekMap.get(week)!.push(g.fantasyPoints);
  }
  let totalWeeklyHighs = 0;
  let weekCount = 0;
  for (const scores of weekMap.values()) {
    totalWeeklyHighs += Math.max(...scores);
    weekCount++;
  }
  const weeklyHighAvg = weekCount > 0 ? Math.round((totalWeeklyHighs / weekCount) * 100) / 100 : 0;

  return { season: seasonDisplay, gamesPlayed, totalTeamGames, gamesPlayedPct, fantasyAvg, weeklyHighAvg };
}

/**
 * Process all seasons for a player using NBA API game data and produce
 * the full ProcessedPlayerData. seasonYears is ordered most-recent first,
 * e.g. [2026, 2025, 2024].
 */
export function processPlayerStatsFromNbaApi(
  player: Player,
  playerSeasonMap: Map<number, NbaGameEntry[]>,
  seasonYears: number[],
  scoring: SleeperScoringSettings,
): ProcessedPlayerData {
  const seasons = seasonYears.map((year) => {
    const entries = playerSeasonMap.get(year) ?? [];
    const prevYear = String(year - 1).slice(-2);
    const seasonDisplay = `${prevYear}-${String(year).slice(-2)}`;
    return processSeasonStatsFromNbaApi(entries, seasonDisplay, scoring);
  });

  const playedSeasons = seasons.filter((s) => s.gamesPlayed > 0);
  const count = playedSeasons.length || 1;

  const gamesPlayedPctTotal =
    Math.round((playedSeasons.reduce((sum, s) => sum + s.gamesPlayedPct, 0) / count) * 100) / 100;
  const fantasyAvgTotal = Math.round((playedSeasons.reduce((sum, s) => sum + s.fantasyAvg, 0) / count) * 100) / 100;
  const weeklyHighAvgTotal =
    Math.round((playedSeasons.reduce((sum, s) => sum + s.weeklyHighAvg, 0) / count) * 100) / 100;

  return {
    playerId: player.playerId,
    espnId: player.espnId != null ? String(player.espnId) : null,
    fullName: player.fullName,
    team: player.team ?? "",
    position: player.position ?? "",
    fantasyPositions: player.fantasyPositions ?? [],
    seasons,
    gamesPlayedPctTotal,
    fantasyAvgTotal,
    weeklyHighAvgTotal,
    isDrafted: false,
    lastUpdated: new Date().toISOString(),
    injuryStatus: player.injuryStatus ?? null,
    birthCountry: player.birthCountry ?? null,
  };
}
