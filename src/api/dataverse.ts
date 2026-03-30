import type {
  Eamon_nbaplayerstatses,
  Eamon_nbaplayerstatsesBase,
} from "@/generated/models/Eamon_nbaplayerstatsesModel";
import { Eamon_nbaplayerstatsesService } from "@/generated/services/Eamon_nbaplayerstatsesService";
import type { ProcessedPlayerData } from "@/types/player";

/** Cast a JS number to the decimal type Dataverse expects at runtime. */
function toDecimal(value: number): string {
  return parseFloat(value.toFixed(10)) as unknown as string;
}

export function toDataverseRecord(
  player: ProcessedPlayerData,
): Omit<Eamon_nbaplayerstatsesBase, "eamon_nbaplayerstatsid"> {
  const s = player.seasons;
  return {
    eamon_player_id: player.playerId,
    eamon_espn_id: player.espnId ?? undefined,
    eamon_full_name: player.fullName,
    eamon_team: player.team ?? undefined,
    eamon_position: player.fantasyPositions.length ? player.fantasyPositions.join(",") : (player.position ?? undefined),
    eamon_birth_country: player.birthCountry ?? undefined,
    eamon_games_pct_yr1: s[0]?.gamesPlayedPct != null ? toDecimal(s[0].gamesPlayedPct) : undefined,
    eamon_games_pct_yr2: s[1]?.gamesPlayedPct != null ? toDecimal(s[1].gamesPlayedPct) : undefined,
    eamon_games_pct_yr3: s[2]?.gamesPlayedPct != null ? toDecimal(s[2].gamesPlayedPct) : undefined,
    eamon_games_pct_total: toDecimal(player.gamesPlayedPctTotal),
    eamon_fantasy_avg_yr1: s[0]?.fantasyAvg != null ? toDecimal(s[0].fantasyAvg) : undefined,
    eamon_fantasy_avg_yr2: s[1]?.fantasyAvg != null ? toDecimal(s[1].fantasyAvg) : undefined,
    eamon_fantasy_avg_yr3: s[2]?.fantasyAvg != null ? toDecimal(s[2].fantasyAvg) : undefined,
    eamon_fantasy_avg_total: toDecimal(player.fantasyAvgTotal),
    eamon_weekly_high_avg_yr1: s[0]?.weeklyHighAvg != null ? toDecimal(s[0].weeklyHighAvg) : undefined,
    eamon_weekly_high_avg_yr2: s[1]?.weeklyHighAvg != null ? toDecimal(s[1].weeklyHighAvg) : undefined,
    eamon_weekly_high_avg_yr3: s[2]?.weeklyHighAvg != null ? toDecimal(s[2].weeklyHighAvg) : undefined,
    eamon_weekly_high_avg_total: toDecimal(player.weeklyHighAvgTotal),
    eamon_is_drafted: player.isDrafted as unknown as Eamon_nbaplayerstatsesBase["eamon_is_drafted"],
    eamon_last_updated: player.lastUpdated ?? undefined,
    statecode: 0,
  };
}

/**
 * Convert a Dataverse record back to the app domain model.
 */
export function fromDataverseRecord(rec: Eamon_nbaplayerstatses): ProcessedPlayerData {
  const seasons = (["25-26", "24-25", "23-24"] as const).map((label, i) => {
    const gamesPlayedPct = parseFloat(
      [rec.eamon_games_pct_yr1, rec.eamon_games_pct_yr2, rec.eamon_games_pct_yr3][i] ?? "0",
    );
    return {
      season: label,
      // Dataverse doesn\'t store raw gamesPlayed — derive a non-zero sentinel from pct so
      // downstream filters (e.g. std dev) know the player actually played that season.
      gamesPlayed: gamesPlayedPct > 0 ? 1 : 0,
      totalTeamGames: 82,
      gamesPlayedPct,
      fantasyAvg: parseFloat(
        [rec.eamon_fantasy_avg_yr1, rec.eamon_fantasy_avg_yr2, rec.eamon_fantasy_avg_yr3][i] ?? "0",
      ),
      weeklyHighAvg: parseFloat(
        [rec.eamon_weekly_high_avg_yr1, rec.eamon_weekly_high_avg_yr2, rec.eamon_weekly_high_avg_yr3][i] ?? "0",
      ),
    };
  });

  return {
    playerId: rec.eamon_player_id,
    espnId: rec.eamon_espn_id ?? null,
    fullName: rec.eamon_full_name,
    team: rec.eamon_team ?? "",
    position: rec.eamon_position ?? "",
    fantasyPositions: rec.eamon_position ? rec.eamon_position.split(",").map((p) => p.trim()) : [],
    seasons,
    gamesPlayedPctTotal: parseFloat(rec.eamon_games_pct_total ?? "0"),
    fantasyAvgTotal: parseFloat(rec.eamon_fantasy_avg_total ?? "0"),
    weeklyHighAvgTotal: parseFloat(rec.eamon_weekly_high_avg_total ?? "0"),
    isDrafted: rec.eamon_is_drafted === 1,
    lastUpdated: rec.eamon_last_updated ?? "",
    injuryStatus: null,
    birthCountry: rec.eamon_birth_country ?? null,
  };
}

/**
 * Fetch all player records from Dataverse using the generated service.
 * Pages through all results so the full table is returned regardless of size.
 */
export async function fetchPlayerRecords(): Promise<ProcessedPlayerData[]> {
  const select: Parameters<typeof Eamon_nbaplayerstatsesService.getAll>[0] = {
    select: [
      "eamon_player_id",
      "eamon_espn_id",
      "eamon_full_name",
      "eamon_team",
      "eamon_position",
      "eamon_birth_country",
      "eamon_games_pct_yr1",
      "eamon_games_pct_yr2",
      "eamon_games_pct_yr3",
      "eamon_games_pct_total",
      "eamon_fantasy_avg_yr1",
      "eamon_fantasy_avg_yr2",
      "eamon_fantasy_avg_yr3",
      "eamon_fantasy_avg_total",
      "eamon_weekly_high_avg_yr1",
      "eamon_weekly_high_avg_yr2",
      "eamon_weekly_high_avg_yr3",
      "eamon_weekly_high_avg_total",
      "eamon_is_drafted",
      "eamon_last_updated",
    ],
  };
  const records: ProcessedPlayerData[] = [];
  let skipToken: string | undefined;
  do {
    const result = await Eamon_nbaplayerstatsesService.getAll({ ...select, skipToken });
    for (const rec of result.data ?? []) {
      records.push(fromDataverseRecord(rec));
    }
    skipToken = result.skipToken;
  } while (skipToken);
  return records;
}

// Cache of eamon_player_id -> eamon_nbaplayerstatsid for upsert decisions
let recordIdCache: Map<string, string> | null = null;

/**
 * Pre-warm the ID cache — call this once before bulk upserts.
 * Pages through ALL records so the cache is complete regardless of table size.
 */
export async function warmRecordIdCache(): Promise<void> {
  recordIdCache = new Map<string, string>();
  const options: Parameters<typeof Eamon_nbaplayerstatsesService.getAll>[0] = {
    select: ["eamon_player_id", "eamon_nbaplayerstatsid"],
  };
  let skipToken: string | undefined;
  do {
    const result = await Eamon_nbaplayerstatsesService.getAll({ ...options, skipToken });
    for (const r of result.data ?? []) {
      if (r.eamon_nbaplayerstatsid) {
        recordIdCache.set(r.eamon_player_id, r.eamon_nbaplayerstatsid);
      }
    }
    skipToken = result.skipToken;
  } while (skipToken);
}

/** Reset the cache (call after a refresh session completes or is stopped). */
export function resetRecordIdCache(): void {
  recordIdCache = null;
}

/**
 * Upsert a player record — creates if new, updates if already exists.
 */
export async function upsertPlayerRecord(
  record: Omit<Eamon_nbaplayerstatsesBase, "eamon_nbaplayerstatsid">,
): Promise<void> {
  // Ensure the module-level cache is initialized so new IDs are persisted across calls.

  if (!recordIdCache) {
    recordIdCache = new Map<string, string>();
  }
  const existingId = recordIdCache.get(record.eamon_player_id);
  if (existingId) {
    console.log(`[upsert] Updating existing record: player_id=${record.eamon_player_id}, id=${existingId}`);
    const result = await Eamon_nbaplayerstatsesService.update(existingId, record);
    console.log(`[upsert] Update result:`, result);
  } else {
    console.log(`[upsert] Creating new record: player_id=${record.eamon_player_id}`);
    const result = await Eamon_nbaplayerstatsesService.create(record);
    console.log(`[upsert] Create result:`, result);
    const newId = result.data?.eamon_nbaplayerstatsid;
    if (newId) {
      console.log(`[upsert] New record id cached: ${newId}`);
      recordIdCache.set(record.eamon_player_id, newId);
    } else {
      console.warn(`[upsert] Create returned no id for player_id=${record.eamon_player_id}`);
    }
  }
}
