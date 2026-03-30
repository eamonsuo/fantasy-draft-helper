import { useDraftPicks, useLeagueDrafts } from "@/hooks/use-draft";
import { useDraftStore } from "@/stores/draft-store";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

/**
 * Finds the most recent in-progress or completed draft for the league,
 * polls picks every 30 seconds, and syncs them into the draft store.
 * Returns helpers for the manual refresh button.
 */
export function useLiveDraft() {
  const queryClient = useQueryClient();
  const { setDraftedPlayerIds } = useDraftStore();

  // Find the active (or most recent) draft
  const { data: drafts } = useLeagueDrafts();
  const activeDraft =
    drafts?.find((d) => d.status === "drafting") ?? drafts?.find((d) => d.status === "complete") ?? drafts?.[0];

  const draftId = activeDraft?.draft_id;

  // Poll picks — 30s auto-refresh
  const { data: picks, isFetching } = useDraftPicks(draftId);

  // Sync picks into store whenever pick list changes
  const prevPickCount = useRef(0);
  useEffect(() => {
    if (!picks) return;
    if (picks.length === prevPickCount.current) return;
    prevPickCount.current = picks.length;
    const pickedIds = new Set(picks.map((p) => p.player_id));
    setDraftedPlayerIds(pickedIds);
  }, [picks, setDraftedPlayerIds]);

  const manualSync = () => {
    if (draftId) {
      queryClient.invalidateQueries({ queryKey: ["sleeper", "draftPicks", draftId] });
    }
  };

  return {
    draftId,
    draftStatus: activeDraft?.status ?? null,
    pickedCount: picks?.length ?? 0,
    isSyncing: isFetching,
    manualSync,
  };
}
