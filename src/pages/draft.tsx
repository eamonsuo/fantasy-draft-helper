import { DataRefresh } from "@/components/data-refresh";
import { PlayerFilters } from "@/components/player-filters";
import { PlayerList } from "@/components/player-list";
import { Button } from "@/components/ui/button";
import { useDataRefresh } from "@/hooks/use-data-refresh";
import { useLeagueSettings } from "@/hooks/use-draft";
import { useLiveDraft } from "@/hooks/use-live-draft";
import { usePlayerStats } from "@/hooks/use-player-stats";
import { useSleeperPlayers } from "@/hooks/use-players";
import { useDraftStore } from "@/stores/draft-store";
import type { ProcessedPlayerData } from "@/types/player";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useMemo } from "react";

export function DraftPage() {
  const { data: players, isLoading: playersLoading } = useSleeperPlayers();
  const { data: cachedStats } = usePlayerStats();
  const { data: league } = useLeagueSettings();
  const { refresh, stop, progress, errors, isRefreshing, lastUpdated } = useDataRefresh();
  const queryClient = useQueryClient();
  const handleReloadData = () => queryClient.invalidateQueries({ queryKey: ["playerStats"] });

  const { draftedPlayerIds } = useDraftStore();
  const { draftStatus, pickedCount, isSyncing, manualSync } = useLiveDraft();

  // Build a map of processed stats for O(1) lookups
  const statsMap = useMemo(() => {
    const map = new Map<string, ProcessedPlayerData>();
    for (const s of cachedStats ?? []) {
      map.set(s.playerId, s);
    }
    return map;
  }, [cachedStats]);

  // Merge Sleeper player info with processed stats. For players without
  // stats yet, synthesise a ProcessedPlayerData with nulled stat fields.
  const mergedPlayers = useMemo<ProcessedPlayerData[]>(() => {
    if (!players) return [];
    return players.map((p) => {
      const stats = statsMap.get(p.playerId);
      // Always overlay fresh Sleeper data (injury status, team, drafted flag) on cached stats
      if (stats)
        return {
          ...stats,
          team: p.team ?? stats.team,
          injuryStatus: p.injuryStatus,
          birthCountry: p.birthCountry ?? null,
          isDrafted: draftedPlayerIds.has(p.playerId),
        };
      return {
        playerId: p.playerId,
        fullName: p.fullName,
        team: p.team,
        position: p.position,
        fantasyPositions: p.fantasyPositions,
        espnId: p.espnId != null ? String(p.espnId) : null,
        seasons: [],
        gamesPlayedPctTotal: 0,
        fantasyAvgTotal: 0,
        weeklyHighAvgTotal: 0,
        isDrafted: draftedPlayerIds.has(p.playerId),
        lastUpdated: "",
        injuryStatus: p.injuryStatus,
        birthCountry: p.birthCountry ?? null,
      };
    });
  }, [players, statsMap, draftedPlayerIds]);

  const handleRefresh = () => {
    if (!players) return;
    const scoring = league?.scoring_settings;
    refresh(players, scoring);
  };

  const isLoading = playersLoading;

  return (
    <div className="flex flex-col gap-4 p-3 sm:p-4 h-full">
      {/* Header row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Draft Board</h1>
          <p className="text-sm text-muted-foreground">
            {mergedPlayers.length} players
            {draftedPlayerIds.size > 0 && (
              <span className="ml-2 text-orange-500 dark:text-orange-400">· {draftedPlayerIds.size} drafted</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {draftStatus && (
            <Button variant="outline" size="sm" onClick={manualSync} disabled={isSyncing} className="gap-1.5">
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              {draftStatus === "drafting" ? "Live" : "Draft"} · {pickedCount} picks
            </Button>
          )}
          <DataRefresh
            onRefresh={handleRefresh}
            onStop={stop}
            onReloadData={handleReloadData}
            isRefreshing={isRefreshing}
            progress={progress}
            lastUpdated={lastUpdated}
            errorCount={errors.length}
          />
        </div>
      </div>

      {/* Filters */}
      <PlayerFilters />

      {/* Player list */}
      <div className="flex-1 overflow-auto">
        <PlayerList data={mergedPlayers} isLoading={isLoading} />
      </div>
    </div>
  );
}
