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
  const survivalMinutes = Math.floor(survivalSeconds / 60);
  const survivalSecondsRemainder = survivalSeconds % 60;

  return {
    survivalSeconds,
    survivalTimeString: `${survivalMinutes}:${survivalSecondsRemainder.toString().padStart(2, '0')}`,
    pointsPerSecond: survivalSeconds > 0 ? (score / survivalSeconds).toFixed(1) : '0.0'
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
