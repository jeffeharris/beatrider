import { formatDuration } from '../../leaderboard/leaderboard-format.js';
import { computePointsPerMinute } from '../../leaderboard/leaderboard-entry.js';

export function getScoreBucket(score) {
  if (score < 100) return '0-99';
  if (score < 500) return '100-499';
  if (score < 1000) return '500-999';
  if (score < 2500) return '1000-2499';
  if (score < 5000) return '2500-4999';
  return '5000+';
}

export function buildSurvivalStats({ nowMs, gameStartTimeMs, score }) {
  const survivalTimeMs = nowMs - gameStartTimeMs;
  const survivalSeconds = Math.max(0, Math.floor(survivalTimeMs / 1000));

  return {
    survivalSeconds,
    survivalTimeString: formatDuration(survivalSeconds),
    pointsPerSecond: survivalSeconds > 0 ? (score / survivalSeconds).toFixed(1) : '0.0',
    pointsPerMinute: computePointsPerMinute(score, survivalSeconds)
  };
}

/**
 * Vertical layout for the game-over stack, as offsets from a returned `centerY`.
 *
 * The stack is anchored rather than pinned to the middle of the viewport: with the
 * leaderboard added, centring the score pushed the table and the restart countdown off
 * the bottom of short (landscape) viewports.
 */
export function resolveGameOverLayout({ screenRef, beatHighScore, leaderboardHeight, viewportHeight }) {
  const statsOffset = screenRef * (beatHighScore ? 0.15 : 0.13);
  const leaderboardTitleOffset = statsOffset + screenRef * 0.055;
  const leaderboardOffset = leaderboardTitleOffset + screenRef * 0.035;
  const restartOffset = leaderboardOffset + leaderboardHeight + screenRef * 0.05;

  const topOffset = screenRef * 0.08;
  const margin = screenRef * 0.04;
  const centerY = Math.max(
    topOffset + margin,
    Math.min(viewportHeight / 2, viewportHeight - restartOffset - margin)
  );

  return {
    centerY,
    topOffset,
    statsOffset,
    leaderboardTitleOffset,
    leaderboardOffset,
    restartOffset
  };
}

export function appendRecentDeath(recentDeaths, nextScore, maxEntries = 3) {
  const next = [...recentDeaths, { score: nextScore, timestamp: Date.now() }];
  if (next.length <= maxEntries) return next;
  return next.slice(next.length - maxEntries);
}

export function shouldEnableAdaptiveAssist(recentDeaths, { requiredDeaths = 3, lowScoreThreshold = 1000 } = {}) {
  if (recentDeaths.length < requiredDeaths) return false;
  const latest = recentDeaths.slice(recentDeaths.length - requiredDeaths);
  return latest.every(death => death.score < lowScoreThreshold);
}
