import { resetRecordIdCache, toDataverseRecord, upsertPlayerRecord, warmRecordIdCache } from "@/api/dataverse";
import { buildPlayerSeasonMap, fetchAllNbaGames, normalizeNbaPlayerName } from "@/api/nbaapi";
import type { Player } from "@/types/player";
import type { SleeperScoringSettings } from "@/types/sleeper";
import { DEFAULT_SCORING } from "@/utils/fantasy-scoring";
import { processPlayerStatsFromNbaApi } from "@/utils/stats-processor";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";

const SEASONS = [2026, 2025, 2024];

export interface RefreshProgress {
  current: number;
  total: number;
  currentPlayer: string;
  stage: "fetching" | "processing" | "done" | "idle";
}

const IDLE_PROGRESS: RefreshProgress = { current: 0, total: 0, currentPlayer: "", stage: "idle" };

export function useDataRefresh() {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<RefreshProgress>(IDLE_PROGRESS);
  const [errors, setErrors] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const stopRequestedRef = useRef(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const stop = useCallback(() => {
    stopRequestedRef.current = true;
    resetRecordIdCache();
    setIsRefreshing(false);
    setProgress(IDLE_PROGRESS);
  }, []);

  const refresh = useCallback(
    async (players: Player[], scoring?: SleeperScoringSettings) => {
      console.log("[refresh] Starting. Players count:", players.length);
      stopRequestedRef.current = false;
      const scoringSettings = scoring ?? DEFAULT_SCORING;
      const results = [];
      const errs: string[] = [];

      setIsRefreshing(true);
      setErrors([]);
      setProgress({
        current: 0,
        total: players.length,
        currentPlayer: "Building player directory…",
        stage: "fetching",
      });

      // Warm the Dataverse ID cache before the loop so upserts use update vs create
      // correctly and avoid concurrent-request contention on the Dataverse client.
      console.log("[refresh] Warming record ID cache…");
      try {
        await warmRecordIdCache();
        console.log("[refresh] warmRecordIdCache complete");
      } catch (e) {
        console.warn("[refresh] warmRecordIdCache failed (non-fatal):", e);
      }

      // Fetch all regular-season games from the NBA API (paginated)
      console.log("[refresh] Fetching all NBA API games…");
      let playerSeasonMap = new Map<string, Map<number, import("@/api/nbaapi").NbaGameEntry[]>>();
      let nameToNbaId = new Map<string, string>();
      let firstInitialLastNameToNbaId = new Map<string, string>();
      try {
        const allGames = await fetchAllNbaGames((fetched, total) => {
          setProgress((prev) => ({ ...prev, currentPlayer: `Loading game data… ${fetched}/${total}` }));
        });
        console.log("[refresh] NBA API games fetched:", allGames.length);
        ({ playerSeasonMap, nameToNbaId, firstInitialLastNameToNbaId } = buildPlayerSeasonMap(allGames));
        console.log("[refresh] Players in game data:", playerSeasonMap.size);
      } catch (err) {
        console.error("[refresh] fetchAllNbaGames failed:", err);
        errs.push(`Failed to load NBA game data: ${err instanceof Error ? err.message : "Unknown error"}`);
      }

      const total = players.length;
      const BATCH_SIZE = 10;

      // --- Phase 1: compute stats for all players (fast — pure in-memory lookups) ---
      setProgress({ current: 0, total, currentPlayer: "", stage: "processing" });
      for (let i = 0; i < players.length; i++) {
        if (stopRequestedRef.current) {
          console.log("[refresh] Stopped by user at player index", i);
          break;
        }
        const player = players[i];
        setProgress({ current: i + 1, total, currentPlayer: player.fullName, stage: "processing" });
        try {
          // Sleeper uses numeric IDs; NBA API uses bbref-style IDs — resolve via name map with fallbacks
          let nbaId = nameToNbaId.get(normalizeNbaPlayerName(player.fullName)) ?? null;

          // Fallback 1: first initial + last name (handles suffix mismatches and minor first-name differences)
          if (!nbaId && player.firstName && player.lastName) {
            const firstInitial = normalizeNbaPlayerName(player.firstName[0]);
            const lastName = normalizeNbaPlayerName(player.lastName);
            nbaId = firstInitialLastNameToNbaId.get(firstInitial + lastName) ?? null;
          }

          if (!nbaId) {
            console.warn(`[refresh] No NBA API match for: ${player.fullName} (sleeperId=${player.playerId})`);
          }
          const seasonDataByYear = playerSeasonMap.get(nbaId ?? "") ?? new Map();
          results.push(processPlayerStatsFromNbaApi(player, seasonDataByYear, SEASONS, scoringSettings));
        } catch (err) {
          console.error(`[refresh] Stats processing error for ${player.fullName}:`, err);
          errs.push(`${player.fullName}: ${err instanceof Error ? err.message : "Unknown error"}`);
        }
      }

      // --- Phase 2: upsert to Dataverse in parallel batches of BATCH_SIZE ---
      console.log(`[refresh] Saving ${results.length} players in batches of ${BATCH_SIZE}…`);
      setProgress({ current: 0, total: results.length, currentPlayer: "", stage: "fetching" });
      for (let i = 0; i < results.length && !stopRequestedRef.current; i += BATCH_SIZE) {
        const batch = results.slice(i, i + BATCH_SIZE);
        setProgress({
          current: i,
          total: results.length,
          currentPlayer: `Saving ${i + 1}–${Math.min(i + BATCH_SIZE, results.length)} of ${results.length}…`,
          stage: "fetching",
        });

        const batchResults = await Promise.allSettled(batch.map((p) => upsertPlayerRecord(toDataverseRecord(p))));

        for (let j = 0; j < batchResults.length; j++) {
          const outcome = batchResults[j];
          if (outcome.status === "rejected") {
            const name = batch[j]?.fullName ?? "unknown";
            console.error(`[refresh] Dataverse save failed for ${name}:`, outcome.reason);
            errs.push(
              `Dataverse save failed for ${name}: ${outcome.reason instanceof Error ? outcome.reason.message : "Unknown error"}`,
            );
          }
        }

        queryClient.invalidateQueries({ queryKey: ["playerStats"] });
      }

      console.log("[refresh] Loop complete. Errors:", errs.length);
      const now = new Date();
      setLastUpdated(now);
      setErrors(errs);
      setProgress({ current: total, total, currentPlayer: "", stage: "done" });
      setIsRefreshing(false);
      resetRecordIdCache();

      // Final invalidation to pick up any remaining saves
      queryClient.invalidateQueries({ queryKey: ["playerStats"] });

      return { results, errors: errs };
    },
    [queryClient],
  );

  return { refresh, stop, progress, errors, isRefreshing, lastUpdated };
}
