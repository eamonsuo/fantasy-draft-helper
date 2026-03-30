import { fetchDraftPicks, fetchLeague, fetchLeagueDrafts } from "@/api/sleeper";
import { useQuery } from "@tanstack/react-query";

const LEAGUE_ID = import.meta.env.VITE_SLEEPER_LEAGUE_ID as string;

export function useLeagueSettings() {
  return useQuery({
    queryKey: ["sleeper", "league", LEAGUE_ID],
    queryFn: () => fetchLeague(LEAGUE_ID),
    enabled: !!LEAGUE_ID && LEAGUE_ID !== "REPLACE_WITH_YOUR_LEAGUE_ID",
    staleTime: 30 * 60 * 1000,
  });
}

export function useLeagueDrafts() {
  return useQuery({
    queryKey: ["sleeper", "drafts", LEAGUE_ID],
    queryFn: () => fetchLeagueDrafts(LEAGUE_ID),
    enabled: !!LEAGUE_ID && LEAGUE_ID !== "REPLACE_WITH_YOUR_LEAGUE_ID",
    staleTime: 5 * 60 * 1000,
  });
}

export function useDraftPicks(draftId: string | undefined) {
  return useQuery({
    queryKey: ["sleeper", "draftPicks", draftId],
    queryFn: () => fetchDraftPicks(draftId!),
    enabled: !!draftId,
    refetchInterval: 30_000, // poll every 30s during live draft
  });
}
