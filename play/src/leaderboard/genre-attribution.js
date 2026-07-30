// ============================================
// GENRE ATTRIBUTION - which genre(s) a run was played to
// ============================================
// Genre is switchable mid-run from the settings drawer, so a run can span several.
// This tracks how long each one was actually played for, to pick a dominant genre and
// detect mixed runs.
//
// CRITICAL: `elapsedMs` values passed in here are play time
// (scene.time.now - scene.gameStartTime), never raw clock time. resumeGameSystem()
// already advances gameStartTime by the pause duration (pause-overlay.js), so elapsed
// time excludes paused time and every segment boundary is pause-compensated without
// this module needing to know that pause exists.
//
// Pure module: no Phaser, no Tone, no DOM.

/**
 * @typedef {{genre: string, startMs: number}} GenreSegment
 * @typedef {{segments: GenreSegment[]}} GenreAttributionState
 * @typedef {{dominantGenre: string, isMixed: boolean, breakdownMs: Object<string, number>}} GenreSummary
 */

export function createGenreAttributionState(initialGenre) {
  return { segments: [{ genre: initialGenre || 'unknown', startMs: 0 }] };
}

/**
 * Records a switch to `genre` at `elapsedMs`. Returns the state unchanged when the genre
 * has not actually changed, so this is safe to call every frame with the live value.
 */
export function recordGenreSwitch(state, { genre, elapsedMs }) {
  const segments = state?.segments;
  if (!segments?.length) return createGenreAttributionState(genre);

  const last = segments[segments.length - 1];
  if (last.genre === genre) return state;

  return {
    // Clamp so a segment can never start before the one it follows.
    segments: [...segments, { genre, startMs: Math.max(last.startMs, elapsedMs) }]
  };
}

/** @returns {GenreSummary} */
export function summarizeGenreAttribution(state, { elapsedMs }) {
  const segments = state?.segments;
  if (!segments?.length) {
    return { dominantGenre: 'unknown', isMixed: false, breakdownMs: {} };
  }

  const endMs = Math.max(elapsedMs, segments[segments.length - 1].startMs);
  const breakdownMs = {};

  segments.forEach((segment, index) => {
    const next = segments[index + 1];
    const segmentEndMs = next ? next.startMs : endMs;
    const durationMs = Math.max(0, segmentEndMs - segment.startMs);
    breakdownMs[segment.genre] = (breakdownMs[segment.genre] || 0) + durationMs;
  });

  const genres = Object.keys(breakdownMs);
  const dominantGenre = genres.reduce(
    (best, genre) => (breakdownMs[genre] > breakdownMs[best] ? genre : best),
    genres[0]
  );

  // Genres that were switched through without any play time elapsing (rapidly tapping
  // the genre buttons) should not make a run count as mixed.
  const playedGenres = genres.filter(genre => breakdownMs[genre] > 0);

  return { dominantGenre, isMixed: playedGenres.length > 1, breakdownMs };
}
