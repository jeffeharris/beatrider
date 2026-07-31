// ============================================
// LEADERBOARD STORE - the only place the leaderboard touches persistence
// ============================================
// Everything here is local. No network is involved at any point.

import { loadGameData, saveGameData } from '../storage.js';
import { insertEntryRanked } from './leaderboard-entry.js';

export function loadLeaderboard() {
  // Read through loadGameData() rather than storage.js's `savedData`, which is a
  // one-time snapshot taken at module load. The game auto-restarts between rounds
  // without a page reload, so a cached copy would go stale after the first round and
  // each save would silently drop the entries recorded before it.
  const data = loadGameData();
  return Array.isArray(data.leaderboard) ? data.leaderboard : [];
}

/**
 * Inserts `entry`, persists the result and reports where it landed.
 * @returns {{entries: import('./leaderboard-entry.js').LeaderboardEntry[], rank: number|null}}
 */
export function recordLeaderboardEntry(entry) {
  const { entries, rank } = insertEntryRanked(loadLeaderboard(), entry);

  // deepMerge() treats arrays as scalars (storage.js isObject() excludes them), so this
  // overwrites the stored list wholesale. That is what we want - it lets the capped list
  // shrink - but it means the complete list must be passed every time, never a delta.
  saveGameData({ leaderboard: entries });

  return { entries, rank };
}
