export function resolveComboFromWindow({ currentCombo, nowMs, lastKillTimeMs, comboWindowMs, maxCombo }) {
  const withinWindow = nowMs - lastKillTimeMs < comboWindowMs;
  if (!withinWindow) return 1;
  return Math.min(currentCombo + 1, maxCombo);
}

export function resolveComboForChain({ currentCombo, maxCombo }) {
  return Math.min(currentCombo + 1, maxCombo);
}

export function applyPoints({ currentScore, basePoints, comboMultiplier = 1 }) {
  const pointsAwarded = basePoints * comboMultiplier;
  return {
    pointsAwarded,
    nextScore: currentScore + pointsAwarded
  };
}

export function updateMaxComboReached({ currentMaxComboReached, combo }) {
  return Math.max(currentMaxComboReached || 0, combo || 0);
}
