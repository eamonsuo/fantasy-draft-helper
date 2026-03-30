import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useDraftStore } from "@/stores/draft-store";
import type { ProcessedPlayerData, SeasonStats } from "@/types/player";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useMemo, useState } from "react";

const SLEEPER_CDN = "https://sleepercdn.com";

// ─── Sort config ──────────────────────────────────────────────────────────────

type SortKey = "fantasyAvgTotal" | "weeklyHighAvgTotal" | "gamesPlayedPctTotal" | "fullName";

const SORT_OPTIONS: { key: SortKey; label: string; tooltip: string }[] = [
  { key: "weeklyHighAvgTotal", label: "Wk Hi Avg", tooltip: "Avg weekly best game — 3-season average" },
  { key: "gamesPlayedPctTotal", label: "GP% Avg", tooltip: "Games played % — 3-season average" },
  { key: "fantasyAvgTotal", label: "FP/G Avg", tooltip: "Fantasy points per game — 3-season average" },
  { key: "fullName", label: "Name", tooltip: "Sort alphabetically by name" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function colourForValue(value: number, whiteMin: number, greenMin: number) {
  if (!value) return "text-muted-foreground";
  if (value >= greenMin) return "text-emerald-600 dark:text-emerald-400";
  if (value >= whiteMin) return "text-foreground";
  return "text-rose-500 dark:text-rose-400";
}

function fmtStat(v: number | null | undefined, decimals = 1) {
  if (!v) return "—";
  return v.toFixed(decimals);
}
function fmtPct(v: number | null | undefined) {
  if (!v) return "—";
  return `${v.toFixed(0)}%`;
}

/** Sample standard deviation (n-1). Returns null when fewer than 2 values. */
function stdDev(values: number[]): number | null {
  if (values.length < 2) return null;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PlayerAvatar({
  playerId,
  name,
  isDrafted,
  size = "md",
}: {
  playerId: string;
  name: string;
  isDrafted: boolean;
  size?: "sm" | "md";
}) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const hue = name.charCodeAt(0) % 360;
  const dim = size === "sm" ? "w-8 h-8 text-[10px]" : "w-11 h-11 text-xs";

  if (failed) {
    return (
      <div
        className={cn(
          "rounded-full flex items-center justify-center font-bold text-white shrink-0 select-none",
          dim,
          isDrafted && "opacity-40 grayscale",
        )}
        style={{ background: `hsl(${hue} 55% 45%)` }}
      >
        {initials}
      </div>
    );
  }
  return (
    <img
      src={`${SLEEPER_CDN}/content/nba/players/thumb/${playerId}.jpg`}
      alt={name}
      className={cn("rounded-full object-cover object-top shrink-0 bg-muted", dim, isDrafted && "opacity-40 grayscale")}
      onError={() => setFailed(true)}
    />
  );
}

function TeamLogo({ team }: { team: string }) {
  const [failed, setFailed] = useState(false);
  if (!team || failed) return <span className="text-xs font-mono uppercase text-muted-foreground">{team || "—"}</span>;
  return (
    <div className="flex items-center gap-1">
      <img
        src={`${SLEEPER_CDN}/images/team_logos/nba/${team.toLowerCase()}.jpg`}
        alt={team}
        className="w-4 h-4 rounded-sm object-contain shrink-0"
        onError={() => setFailed(true)}
      />
      <span className="text-xs font-medium uppercase text-muted-foreground">{team}</span>
    </div>
  );
}

const INJURY_CONFIG: Record<string, { label: string; className: string }> = {
  DTD: {
    label: "DTD",
    className:
      "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700",
  },
  GTD: {
    label: "GTD",
    className:
      "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700",
  },
  OUT: {
    label: "Out",
    className: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-200 dark:border-red-700",
  },
  IR: {
    label: "IR",
    className: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-200 dark:border-red-700",
  },
  PUP: {
    label: "PUP",
    className: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-200 dark:border-red-700",
  },
  SUS: {
    label: "SUS",
    className:
      "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
  },
  COV: {
    label: "COV",
    className: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-600",
  },
};

function InjuryBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const cfg = INJURY_CONFIG[status.toUpperCase()] ?? {
    label: status,
    className: "bg-muted text-muted-foreground border-muted",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1 py-px text-[10px] font-semibold leading-none",
        cfg.className,
      )}
    >
      {cfg.label}
    </span>
  );
}

const POS_COLOURS: Record<string, string> = {
  PG: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  SG: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
  SF: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
  PF: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  C: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800",
};

function PosBadge({ pos }: { pos: string }) {
  const cls = POS_COLOURS[pos] ?? "bg-muted text-muted-foreground border-muted";
  return (
    <span
      className={cn("inline-flex items-center rounded border px-1 py-px text-[10px] font-semibold leading-none", cls)}
    >
      {pos}
    </span>
  );
}

// ─── Stat block: avg on top, season breakdown below ───────────────────────────

interface StatBlockProps {
  label: string;
  avg: number | null | undefined;
  seasons: SeasonStats[];
  formatFn: (v: number | null | undefined) => string;
  colourFn: (v: number) => string;
  highlight?: boolean;
  isPct?: boolean;
}

function StatBlock({ label, avg, seasons, formatFn, colourFn, highlight, isPct }: StatBlockProps) {
  const hasData = (avg ?? 0) > 0;

  const playedValues = seasons
    .filter((s) => s.gamesPlayed > 0)
    .map((s) => (label.startsWith("GP%") ? s.gamesPlayedPct : label.startsWith("Wk") ? s.weeklyHighAvg : s.fantasyAvg));
  const sd = stdDev(playedValues);

  return (
    <div className={cn("flex flex-col gap-1 rounded-lg px-3 py-2 min-w-0", highlight ? "bg-muted/60" : "bg-muted/30")}>
      {/* Label */}
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground leading-none">
        {label}
      </span>

      {/* Avg — large and prominent, with std dev inline */}
      <div className="flex items-baseline gap-1.5">
        <span
          className={cn(
            "text-2xl font-bold tabular-nums leading-none",
            hasData ? colourFn(avg!) : "text-muted-foreground",
          )}
        >
          {hasData ? formatFn(avg) : "—"}
        </span>
        {sd != null && (
          <span className="text-[10px] text-muted-foreground tabular-nums">
            (±{isPct ? `${sd.toFixed(0)}%` : sd.toFixed(1)})
          </span>
        )}
      </div>

      {/* Per-season breakdown */}
      <div className="flex gap-2 mt-0.5">
        {seasons.slice(0, 3).map((s, i) => {
          const val = label.startsWith("GP%")
            ? s.gamesPlayedPct
            : label.startsWith("Wk")
              ? s.weeklyHighAvg
              : s.fantasyAvg;
          return (
            <div key={i} className="flex flex-col items-center gap-0.5 min-w-0">
              <span className="text-[9px] text-muted-foreground leading-none whitespace-nowrap">{s.season}</span>
              <span
                className={cn(
                  "text-xs tabular-nums leading-none font-medium",
                  val ? colourFn(val) : "text-muted-foreground",
                )}
              >
                {val ? formatFn(val) : "—"}
              </span>
            </div>
          );
        })}
        {/* Pad missing seasons */}
        {Array.from({ length: Math.max(0, 3 - seasons.length) }).map((_, i) => (
          <div key={`pad-${i}`} className="flex flex-col items-center gap-0.5 min-w-0">
            <span className="text-[9px] text-muted-foreground leading-none">—</span>
            <span className="text-xs text-muted-foreground leading-none">—</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Sort bar ─────────────────────────────────────────────────────────────────

interface SortBarProps {
  sortKey: SortKey;
  sortDesc: boolean;
  onSort: (key: SortKey) => void;
}

function SortBar({ sortKey, sortDesc, onSort }: SortBarProps) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className="text-xs text-muted-foreground mr-1">Sort:</span>
      {SORT_OPTIONS.map((opt) => {
        const active = sortKey === opt.key;
        const Icon = active ? (sortDesc ? ArrowDown : ArrowUp) : ArrowUpDown;
        return (
          <TooltipProvider key={opt.key}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onSort(opt.key)}
                  className={cn(
                    "flex items-center gap-1 rounded px-2 py-1 text-xs font-medium border transition-colors",
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground",
                  )}
                >
                  {opt.label}
                  <Icon className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{opt.tooltip}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
}

// ─── Individual card ──────────────────────────────────────────────────────────

function PlayerCard({ player, rank, sortKey }: { player: ProcessedPlayerData; rank: number; sortKey: SortKey }) {
  const positions = player.fantasyPositions.length ? player.fantasyPositions : [player.position];

  const fpColour = (v: number) => colourForValue(v, 20, 30);
  const wkColour = (v: number) => colourForValue(v, 20, 30);
  const gpColour = (v: number) => colourForValue(v, 60, 85);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-card p-3 transition-opacity",
        player.isDrafted && "opacity-40",
      )}
    >
      {/* ── Top row: rank + avatar + name + team/pos + drafted button ── */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono text-muted-foreground w-5 shrink-0 text-right">{rank}</span>

        <PlayerAvatar playerId={player.playerId} name={player.fullName} isDrafted={player.isDrafted} />

        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={cn(
                "font-semibold text-sm leading-tight",
                player.isDrafted && "line-through text-muted-foreground",
              )}
            >
              {player.fullName}
            </span>
            {player.injuryStatus && <InjuryBadge status={player.injuryStatus} />}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <TeamLogo team={player.team} />
            <div className="flex gap-0.5 flex-wrap">
              {positions.filter(Boolean).map((p) => (
                <PosBadge key={p} pos={p} />
              ))}
            </div>
            {player.birthCountry && (
              <span className="text-[10px] text-muted-foreground leading-none">{player.birthCountry}</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Stat blocks ── */}
      <div className="grid grid-cols-3 gap-2">
        <StatBlock
          label="Wk Hi Avg"
          avg={player.weeklyHighAvgTotal}
          seasons={player.seasons}
          formatFn={fmtStat}
          colourFn={wkColour}
          highlight={sortKey === "weeklyHighAvgTotal"}
        />
        <StatBlock
          label="GP% Avg"
          avg={player.gamesPlayedPctTotal}
          seasons={player.seasons}
          formatFn={fmtPct}
          colourFn={gpColour}
          highlight={sortKey === "gamesPlayedPctTotal"}
          isPct
        />
        <StatBlock
          label="FP/G Avg"
          avg={player.fantasyAvgTotal}
          seasons={player.seasons}
          formatFn={fmtStat}
          colourFn={fpColour}
          highlight={sortKey === "fantasyAvgTotal"}
        />
      </div>
    </div>
  );
}

// ─── Main list ────────────────────────────────────────────────────────────────

interface PlayerListProps {
  data: ProcessedPlayerData[];
  isLoading?: boolean;
}

export function PlayerList({ data, isLoading }: PlayerListProps) {
  const [sortKey, setSortKey] = useState<SortKey>("weeklyHighAvgTotal");
  const [sortDesc, setSortDesc] = useState(true);

  const { draftedPlayerIds, filters } = useDraftStore();

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDesc((d) => !d);
    } else {
      setSortKey(key);
      setSortDesc(key !== "fullName"); // name sorts asc by default
    }
  }

  const sorted = useMemo(() => {
    let rows = data.map((p) => ({ ...p, isDrafted: draftedPlayerIds.has(p.playerId) }));

    if (filters.hideDrafted) rows = rows.filter((p) => !p.isDrafted);

    if (filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      rows = rows.filter((p) => p.fullName.toLowerCase().includes(q));
    }

    if (filters.positions.length > 0) {
      rows = rows.filter((p) => {
        const pos = p.fantasyPositions.length ? p.fantasyPositions : [p.position];
        return filters.positions.some((fp) => pos.some((pp) => pp?.toUpperCase() === fp.toUpperCase()));
      });
    }

    if (filters.australianOnly) {
      rows = rows.filter((p) => p.birthCountry === "Australia");
    }

    rows.sort((a, b) => {
      let av: number | string = a[sortKey] as number | string;
      let bv: number | string = b[sortKey] as number | string;
      if (typeof av === "string" && typeof bv === "string") {
        return sortDesc ? bv.localeCompare(av) : av.localeCompare(bv);
      }
      const an = (av as number) ?? 0;
      const bn = (bv as number) ?? 0;
      return sortDesc ? bn - an : an - bn;
    });

    return rows;
  }, [data, draftedPlayerIds, filters, sortKey, sortDesc]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <SortBar sortKey={sortKey} sortDesc={sortDesc} onSort={handleSort} />

      {sorted.length === 0 ? (
        <p className="text-center text-muted-foreground py-12 text-sm">No players found.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((player, i) => (
            <PlayerCard key={player.playerId} player={player} rank={i + 1} sortKey={sortKey} />
          ))}
        </div>
      )}
    </div>
  );
}
