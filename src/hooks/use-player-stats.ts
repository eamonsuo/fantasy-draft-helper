import { fetchPlayerRecords } from "@/api/dataverse";
import { useQuery } from "@tanstack/react-query";

/**
 * Hook to read player stats from Dataverse.
 */
export function usePlayerStats() {
  return useQuery({
    queryKey: ["playerStats"],
    queryFn: fetchPlayerRecords,
    staleTime: 5 * 60 * 1000, // re-fetch at most every 5 minutes
  });
}
