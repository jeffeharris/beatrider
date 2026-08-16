/**
 * Pure beat-synced pulse math for the HUD resource bar warning system.
 * No imports and no browser globals, so `node --test` can load it directly
 * (same pattern as perspective.js).
 *
 * The scene records kick timestamps via recordBeat() (called at the very top
 * of GameAPI.onBeat, before any early return, so the pulse keeps running
 * during the tutorial and while adaptive assist is thinning spawns).
 * updateResourceBarSystem then maps time-since-last-beat to an intensity
 * multiplier with beatPulseIntensity() and applies it to the low/critical
 * resource visuals.
 */

// Default beat interval (120 BPM quarter note) used until two real kicks have
// been heard and a measured kick-to-kick gap replaces it.
export const DEFAULT_BEAT_INTERVAL_MS = 500;

// Measured kick-to-kick gaps outside this window are ignored: shorter ones
// are syncopated double-hits inside a bar, longer ones are silence (mute,
// pause, section break) rather than a real tempo.
export const MIN_BEAT_INTERVAL_MS = 200;
export const MAX_BEAT_INTERVAL_MS = 2000;

// After this many beat intervals with no beat, the pulse goes static — the
// music is stopped or paused, and throbbing off a stale timestamp would read
// as a broken HUD.
export const MAX_SILENCE_INTERVALS = 2;

// Intensity floors for the two warning tiers. The pulse decays smoothly from
// 1 at the instant of a beat down to the floor across one beat interval — a
// gentle throb, never an on/off strobe (photosensitivity concern).
export const LOW_PULSE_FLOOR = 0.75;
export const CRITICAL_PULSE_FLOOR = 0.55;

/** Initial beat-tracking state: no beat heard yet, default tempo. */
export function createBeatPulseState() {
  return { lastBeatTime: null, beatInterval: DEFAULT_BEAT_INTERVAL_MS };
}

/**
 * Record a beat at time `now` (ms). Returns the next state. The measured gap
 * to the previous beat becomes the new interval only when it is plausible
 * (see MIN/MAX_BEAT_INTERVAL_MS); otherwise the previous interval is kept.
 * @param {{ lastBeatTime: number|null, beatInterval: number }} state
 * @param {number} now
 * @returns {{ lastBeatTime: number, beatInterval: number }}
 */
export function recordBeat(state, now) {
  let beatInterval = state.beatInterval;
  if (state.lastBeatTime != null) {
    const delta = now - state.lastBeatTime;
    if (delta >= MIN_BEAT_INTERVAL_MS && delta <= MAX_BEAT_INTERVAL_MS) {
      beatInterval = delta;
    }
  }
  return { lastBeatTime: now, beatInterval };
}

/**
 * Map time-since-last-beat to an intensity multiplier in
 * [minIntensity, maxIntensity].
 *
 * - At the instant of a beat the pulse peaks at maxIntensity, then eases
 *   down to minIntensity across one beat interval with a quadratic ease-out
 *   ((1 - phase)^2) — bright on the kick, settling between kicks.
 * - No beat recorded yet, a non-positive interval, or non-finite inputs:
 *   returns maxIntensity — the static low-state appearance (never invisible,
 *   never a division by zero).
 * - More than maxSilenceIntervals beat intervals since the last beat (music
 *   stopped, paused, or the clock jumped backwards): returns maxIntensity,
 *   going static instead of pulsing off a stale timestamp.
 *
 * @param {{ now: number, lastBeatTime: number|null, beatInterval: number,
 *           minIntensity: number, maxIntensity?: number,
 *           maxSilenceIntervals?: number }} params
 * @returns {number} intensity multiplier in [minIntensity, maxIntensity]
 */
export function beatPulseIntensity({
  now,
  lastBeatTime,
  beatInterval,
  minIntensity,
  maxIntensity = 1,
  maxSilenceIntervals = MAX_SILENCE_INTERVALS
}) {
  const hasBeat = lastBeatTime != null && Number.isFinite(lastBeatTime);
  if (!hasBeat || !Number.isFinite(now) || !(beatInterval > 0)) {
    return maxIntensity;
  }
  const elapsed = now - lastBeatTime;
  if (elapsed < 0 || elapsed > beatInterval * maxSilenceIntervals) {
    return maxIntensity;
  }
  const phase = Math.min(elapsed / beatInterval, 1);
  const decay = (1 - phase) * (1 - phase);
  return minIntensity + (maxIntensity - minIntensity) * decay;
}
