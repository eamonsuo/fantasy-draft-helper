import type { NbaApiGameResponse, NbaApiGamesResponse, NbaApiPlayerGameBasicStat } from "@/types/nbaapi";

const NBA_BASE = import.meta.env.DEV ? "/nba-api" : "https://api.server.nbaapi.com";
const PAGE_SIZE = 100;

/** Earliest date we care about — start of the 23-24 NBA regular season. */
const SEASON_CUTOFF_DATE = "2023-10-01";

/**
 * Fetch a single page from GET /api/games with playerGameBasicStats included and playoffs excluded.
 * Pass ascending=false (default) to get most-recent games first, enabling early cutoff.
 */
export async function fetchNbaGamesPage(
  page: number,
  pageSize = PAGE_SIZE,
  ascending = false,
): Promise<NbaApiGamesResponse> {
  const params = new URLSearchParams({
    include: "playerGameBasicStats",
    isPlayoff: "false",
    page: String(page),
    pageSize: String(pageSize),
    sortBy: "date",
    ascending: String(ascending),
  });
  const res = await fetch(`${NBA_BASE}/api/games?${params}`, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`NBA API /api/games error: ${res.status} ${res.statusText}`);
  return res.json() as Promise<NbaApiGamesResponse>;
}

/**
 * Walk pages of GET /api/games (isPlayoff=false, include=playerGameBasicStats),
 * fetching newest-first and stopping as soon as a game date falls before the
 * start of the 23-24 season (SEASON_CUTOFF_DATE).
 * Calls onProgress(fetched, total) after each page if supplied.
 */
export async function fetchAllNbaGames(
  onProgress?: (fetched: number, total: number) => void,
): Promise<NbaApiGameResponse[]> {
  const first = await fetchNbaGamesPage(1);
  const { pages, total } = first.pagination;
  const games: NbaApiGameResponse[] = [];
  let done = false;

  for (const game of first.data) {
    if (game.date < SEASON_CUTOFF_DATE) {
      done = true;
      break;
    }
    games.push(game);
  }
  onProgress?.(games.length, total);

  for (let page = 2; page <= pages && !done; page++) {
    const result = await fetchNbaGamesPage(page);
    for (const game of result.data) {
      if (game.date < SEASON_CUTOFF_DATE) {
        done = true;
        break;
      }
      games.push(game);
    }
    onProgress?.(games.length, total);
  }

  return games;
}

/**
 * Determine the NBA season end-year from a game date string (YYYY-MM-DD).
 * Oct–Dec of year Y maps to season Y+1  (e.g. "2025-11-01" → 2026).
 * Jan–Sep of year Y maps to season Y    (e.g. "2026-02-15" → 2026).
 */
export function gameSeasonYear(dateStr: string): number {
  const month = parseInt(dateStr.slice(5, 7), 10);
  const year = parseInt(dateStr.slice(0, 4), 10);
  return month >= 10 ? year + 1 : year;
}

/** Normalize a player name for fuzzy matching (strips diacritics, punctuation, whitespace). */
export function normalizeNbaPlayerName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/** Strip common name suffixes (Jr, Sr, I, II, III, IV, V) before normalizing. */
function stripNameSuffix(name: string): string {
  return name.replace(/\s+(jr\.?|sr\.?|iii|ii|iv|v|i)$/i, "").trim();
}

export interface NbaGameEntry {
  date: string;
  stats: NbaApiPlayerGameBasicStat;
}

/**
 * From a flat list of game responses, build two lookup structures:
 *  - playerSeasonMap: nbaPlayerId → seasonYear → NbaGameEntry[]
 *  - nameToNbaId: normalizedName → nbaPlayerId (exact + suffix-stripped variants)
 *  - firstInitialLastNameToNbaId: firstInitial+normalizedLastName → nbaPlayerId (fallback)
 */
export function buildPlayerSeasonMap(games: NbaApiGameResponse[]): {
  playerSeasonMap: Map<string, Map<number, NbaGameEntry[]>>;
  nameToNbaId: Map<string, string>;
  firstInitialLastNameToNbaId: Map<string, string>;
} {
  const playerSeasonMap = new Map<string, Map<number, NbaGameEntry[]>>();
  const nameToNbaId = new Map<string, string>();
  const firstInitialLastNameToNbaId = new Map<string, string>();

  for (const game of games) {
    const season = gameSeasonYear(game.date);
    for (const stat of game.playerGameBasicStats ?? []) {
      const { playerId, playerName } = stat;
      if (!playerId) continue;

      if (playerName) {
        const normalized = normalizeNbaPlayerName(playerName);
        nameToNbaId.set(normalized, playerId);

        // Also index the suffix-stripped variant (e.g. "Gary Trent" for "Gary Trent Jr.")
        const noSuffix = normalizeNbaPlayerName(stripNameSuffix(playerName));
        if (noSuffix !== normalized) {
          nameToNbaId.set(noSuffix, playerId);
        }

        // Index first-initial + last-name for partial-match fallback
        const parts = playerName.trim().split(/\s+/);
        if (parts.length >= 2) {
          const firstInitial = normalizeNbaPlayerName(parts[0][0]);
          const lastName = normalizeNbaPlayerName(parts.slice(1).join(" "));
          // Only store if not already taken by a different player (avoid ambiguous keys)
          const key = firstInitial + lastName;
          if (!firstInitialLastNameToNbaId.has(key)) {
            firstInitialLastNameToNbaId.set(key, playerId);
          }
        }
      }

      if (!playerSeasonMap.has(playerId)) playerSeasonMap.set(playerId, new Map());
      const seasonMap = playerSeasonMap.get(playerId)!;
      if (!seasonMap.has(season)) seasonMap.set(season, []);
      seasonMap.get(season)!.push({ date: game.date, stats: stat });
    }
  }

  return { playerSeasonMap, nameToNbaId, firstInitialLastNameToNbaId };
}
