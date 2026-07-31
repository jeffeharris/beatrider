// ============================================
// LEADERBOARD ENTRIES - construction and ranking
// ============================================
// Pure module: no Phaser, no Tone, no DOM. It is imported by both scenes and by
// storage.js, so it must stay a side-effect-free leaf.

/**
 * @typedef {Object} LeaderboardEntry
 * @property {string} id Stable identifier, unique per recorded run.
 * @property {number} score
 * @property {string} genre Dominant genre key for the run ('unknown' for legacy rows).
 * @property {boolean} isMixedGenre True when more than one genre was played.
 * @property {string} difficulty Difficulty key ('unknown' for legacy rows).
 * @property {number} durationSeconds Play time, excluding paused time.
 * @property {number} pointsPerMinute
 * @property {number} timestamp Epoch ms the run ended (0 for legacy rows).
 * @property {boolean} [isLegacySeed] Set on the row migrated from the old scalar high score.
 */

// Stored deep enough that capping never loses a score the player can still see,
// while keeping the persisted blob small.
export const LEADERBOARD_MAX_STORED = 50;

export function computePointsPerMinute(score, durationSeconds) {
  if (!durationSeconds || durationSeconds <= 0) return 0;
  return Math.round((score / durationSeconds) * 60);
}

export function buildLeaderboardEntry({
  score,
  genreSummary,
  difficultyKey,
  durationSeconds,
  timestamp = Date.now(),
  id
}) {
  return {
    // A stable id means a future score-sync can dedupe uploads without needing to
    // retrofit identifiers onto scores that were already recorded locally.
    id: id || `${timestamp.toString(36)}-${score}`,
    score,
    genre: genreSummary?.dominantGenre || 'unknown',
    isMixedGenre: Boolean(genreSummary?.isMixed),
    difficulty: difficultyKey || 'unknown',
    durationSeconds,
    pointsPerMinute: computePointsPerMinute(score, durationSeconds),
    timestamp
  };
}

// Higher score first; on a tie the run that got there first keeps the better rank.
function compareEntries(a, b) {
  if (b.score !== a.score) return b.score - a.score;
  return a.timestamp - b.timestamp;
}

/**
 * @returns {{entries: LeaderboardEntry[], rank: number|null}} The new capped list, and
 * the 1-based rank of `entry`, or null if it did not make the cut.
 */
export function insertEntryRanked(entries, entry, maxStored = LEADERBOARD_MAX_STORED) {
  const ranked = [...entries, entry].sort(compareEntries).slice(0, maxStored);
  const index = ranked.indexOf(entry);
  return { entries: ranked, rank: index === -1 ? null : index + 1 };
}

/**
 * Builds the v3 leaderboard from the pre-v3 scalar high score, so an existing player's
 * best run still appears in the table. Its genre/difficulty/duration were never
 * recorded, so those stay 'unknown' and render as em dashes.
 */
export function seedLeaderboardFromLegacyHighScore(highScore) {
  if (!highScore || highScore <= 0) return [];
  return [{
    id: 'legacy-high-score',
    score: highScore,
    genre: 'unknown',
    isMixedGenre: false,
    difficulty: 'unknown',
    durationSeconds: 0,
    pointsPerMinute: 0,
    timestamp: 0,
    isLegacySeed: true
  }];
}
