import { fetchAllNbaPlayers } from "@/api/sleeper";
import type { Player } from "@/types/player";
import type { SleeperPlayersMap } from "@/types/sleeper";
import { useQuery } from "@tanstack/react-query";

/**
 * Transform the Sleeper players map into an array of active NBA players
 * sorted by last name.
 */
function transformPlayers(playersMap: SleeperPlayersMap): Player[] {
  return Object.values(playersMap)
    .filter((p) => p.active && p.team && p.position !== "DEF")
    .map((p) => ({
      playerId: p.player_id,
      espnId: p.espn_id ?? null,
      fullName: p.full_name ?? `${p.first_name} ${p.last_name}`,
      firstName: p.first_name,
      lastName: p.last_name,
      team: p.team ?? "",
      position: p.position ?? "",
      fantasyPositions: p.fantasy_positions ?? [],
      age: p.age,
      yearsExp: p.years_exp,
      status: p.status,
      injuryStatus: p.injury_status,
      number: p.number,
      birthCountry: p.birth_country ?? null,
    }))
    .sort((a, b) => a.lastName.localeCompare(b.lastName));
}

/**
 * Fetch all NBA players from Sleeper API.
 * The response is ~5MB so we cache it aggressively (1 hour stale, 2 hour GC).
 */
export function useSleeperPlayers() {
  return useQuery({
    queryKey: ["sleeper", "players"],
    queryFn: fetchAllNbaPlayers,
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
    select: transformPlayers,
  });
}
