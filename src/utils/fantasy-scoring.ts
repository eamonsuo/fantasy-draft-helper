import type { SleeperScoringSettings } from "@/types/sleeper";

/** Generic per-game stats shape required by calculateFantasyPoints. */
export interface GameStats {
  minutes: number;
  points: number;
  rebounds: number;
  offensiveRebounds: number;
  defensiveRebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fieldGoalsMade: number;
  fieldGoalsAttempted: number;
  freeThrowsMade: number;
  freeThrowsAttempted: number;
  threePointFieldGoalsMade: number;
  threePointFieldGoalsAttempted: number;
  personalFouls: number;
}

/**
 * Default fantasy scoring weights used when Sleeper league settings
 * are not available. These are a typical NBA fantasy points league setup.
 */
export const DEFAULT_SCORING: SleeperScoringSettings = {
  ast: 1.5, //Assist
  blk: 1.5, //Block
  bonus_ast_15p: 1, //Assist - Calculated
  bonus_pt_40p: 1, //Points - Calculated
  bonus_pt_50p: 2, //Points - Calculated
  bonus_reb_20p: 2, //Rebound - Calculated
  dd: 1, //Double-double - Calculated
  ff: -2, //Flagrant foul - Ignored (not available from ESPN)
  ftmi: -0.5, //Free throws missed - Calculated
  oreb: 0.5, //Offensive rebound
  pf: -0.5, //Personal foul
  pts: 0.5, //Points Scored
  reb: 1, //Rebound
  stl: 2.5, //Steal
  td: 2, //Triple-double - Calculated
  tf: -0.5, //Technical foul - Calculated (bundled with personal foul)
  to: -1, //Turnover
  tpm: 1, //Three-point made
};

/**
 * Calculate fantasy points for a single game using the given scoring settings.
 *
 * Maps ESPN game stats fields to Sleeper scoring setting keys.
 */
export function calculateFantasyPoints(game: GameStats, scoring: SleeperScoringSettings): number {
  let points = 0;

  points += game.points * (scoring.pts ?? 0);
  points += game.rebounds * (scoring.reb ?? 0);
  points += game.assists * (scoring.ast ?? 0);
  points += game.steals * (scoring.stl ?? 0);
  points += game.blocks * (scoring.blk ?? 0);
  points += game.turnovers * (scoring.to ?? 0);
  points += game.threePointFieldGoalsMade * (scoring.tpm ?? 0);
  points += game.personalFouls * (scoring.pf ?? 0);

  // Free throw misses
  if (scoring.ftmi) {
    const ftMisses = game.freeThrowsAttempted - game.freeThrowsMade;
    points += ftMisses * scoring.ftmi;
  }

  // Offensive rebounds — available from NBA API (orb field)
  if (scoring.oreb) points += game.offensiveRebounds * scoring.oreb;
  // ff / tf (flagrant/technical fouls) — not available from NBA API — skipped

  // Milestone point bonuses
  if (scoring.bonus_pt_40p && game.points >= 40) points += scoring.bonus_pt_40p;
  if (scoring.bonus_pt_50p && game.points >= 50) points += scoring.bonus_pt_50p;
  if (scoring.bonus_ast_15p && game.assists >= 15) points += scoring.bonus_ast_15p;
  if (scoring.bonus_reb_20p && game.rebounds >= 20) points += scoring.bonus_reb_20p;

  // Double-double bonus: 10+ in 2+ of pts/reb/ast/stl/blk
  if (scoring.dd) {
    const ddCategories = [game.points, game.rebounds, game.assists, game.steals, game.blocks];
    const ddCount = ddCategories.filter((v) => v >= 10).length;
    if (ddCount >= 2) points += scoring.dd;
  }

  // Triple-double bonus: 10+ in 3+ categories
  if (scoring.td) {
    const tdCategories = [game.points, game.rebounds, game.assists, game.steals, game.blocks];
    const tdCount = tdCategories.filter((v) => v >= 10).length;
    if (tdCount >= 3) points += scoring.td;
  }

  return Math.round(points * 100) / 100;
}
