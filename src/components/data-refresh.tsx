import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { RefreshProgress } from "@/hooks/use-data-refresh";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Database, RefreshCw, Square } from "lucide-react";

interface DataRefreshProps {
  onRefresh: () => void;
  onStop: () => void;
  onReloadData: () => void;
  isRefreshing: boolean;
  progress: RefreshProgress;
  lastUpdated: Date | null;
  errorCount: number;
  className?: string;
}

const STAGE_LABELS: Record<RefreshProgress["stage"], string> = {
  idle: "",
  fetching: "Saving to Dataverse…",
  processing: "Computing stats…",
  done: "Done",
};

export function DataRefresh({
  onRefresh,
  onStop,
  onReloadData,
  isRefreshing,
  progress,
  lastUpdated,
  errorCount,
  className,
}: DataRefreshProps) {
  const percent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  const lastUpdatedLabel = lastUpdated
    ? `Updated ${lastUpdated.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })}`
    : "Never refreshed";

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing} className="gap-2">
                <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
                {isRefreshing ? "Refreshing…" : "Refresh Statistics"}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Fetch latest stats from NBA API and update player data</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={onReloadData} disabled={isRefreshing} className="gap-2">
                <Database className="h-3.5 w-3.5" />
                Reload Data
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Re-fetch saved stats from Dataverse without recalculating</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {isRefreshing && (
          <Button
            variant="outline"
            size="sm"
            onClick={onStop}
            className="gap-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <Square className="h-3 w-3 fill-current" />
            Stop
          </Button>
        )}

        <span className="text-xs text-muted-foreground">{lastUpdatedLabel}</span>

        {errorCount > 0 && !isRefreshing && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-1 text-xs text-destructive cursor-default">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {errorCount} error{errorCount > 1 ? "s" : ""}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{errorCount} player(s) failed to load stats</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {progress.stage === "done" && !isRefreshing && errorCount === 0 && (
          <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Complete
          </span>
        )}
      </div>

      {isRefreshing && progress.total > 0 && (
        <div className="flex flex-col gap-1">
          <Progress value={percent} className="h-1.5 w-full sm:w-64" />
          <p className="text-xs text-muted-foreground">
            {progress.stage === "fetching" && progress.currentPlayer ? (
              <span className="font-medium">{progress.currentPlayer}</span>
            ) : (
              <>
                {STAGE_LABELS[progress.stage]}
                {progress.currentPlayer && (
                  <>
                    {" "}
                    <span className="font-medium">{progress.currentPlayer}</span>
                  </>
                )}
              </>
            )}{" "}
            <span className="tabular-nums">
              ({progress.current}/{progress.total})
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
