import type { SleeperDraft, SleeperDraftPick, SleeperLeague, SleeperPlayersMap } from "@/types/sleeper";

const SLEEPER_BASE = "https://api.sleeper.app/v1";

export async function fetchAllNbaPlayers(): Promise<SleeperPlayersMap> {
  const res = await fetch(`${SLEEPER_BASE}/players/nba`);
  if (!res.ok) throw new Error(`Sleeper players API error: ${res.status}`);
  return res.json();
}

export async function fetchLeague(leagueId: string): Promise<SleeperLeague> {
  const res = await fetch(`${SLEEPER_BASE}/league/${encodeURIComponent(leagueId)}`);
  if (!res.ok) throw new Error(`Sleeper league API error: ${res.status}`);
  return res.json();
}

export async function fetchLeagueDrafts(leagueId: string): Promise<SleeperDraft[]> {
  const res = await fetch(`${SLEEPER_BASE}/league/${encodeURIComponent(leagueId)}/drafts`);
  if (!res.ok) throw new Error(`Sleeper drafts API error: ${res.status}`);
  return res.json();
}

export async function fetchDraftPicks(draftId: string): Promise<SleeperDraftPick[]> {
  const res = await fetch(`${SLEEPER_BASE}/draft/${encodeURIComponent(draftId)}/picks`);
  if (!res.ok) throw new Error(`Sleeper draft picks API error: ${res.status}`);
  return res.json();
}
