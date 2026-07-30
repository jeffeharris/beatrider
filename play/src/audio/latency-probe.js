// Audio latency / scheduling probe.
//
// Answers the one question that decides whether Beatrider can ship as a native
// app: how far behind the beat does sound actually arrive on this device?
//
// This is distinct from the `[audio-metrics]` logging in music-engine.js — that
// reports *musical* density (hits per bar, average velocity). This reports
// *timing*: output latency, scheduling headroom, and the audio/visual offset.
//
// Enable with `?latency=1`, `localStorage.latencyProbe = '1'`, or
// `window.__LATENCY__ = true`. Off by default, so it costs nothing in a release
// build beyond one branch per sequencer callback.

const SAMPLE_WINDOW = 512; // rolling ticks retained for percentile stats

let enabled = null; // null = not yet resolved
let ticks = [];     // rolling scheduling-headroom samples, in ms
let lateTicks = 0;  // callbacks that fired at/after their scheduled audio time
let totalTicks = 0;
let overlayEl = null;

export function isLatencyProbeEnabled() {
  if (enabled !== null) return enabled;
  enabled = false;

  if (typeof window === 'undefined') return enabled;

  if (window.__LATENCY__ === true) {
    enabled = true;
    return enabled;
  }

  try {
    if (window.localStorage?.getItem('latencyProbe') === '1') {
      enabled = true;
      return enabled;
    }
  } catch (_) {
    // Ignore storage access errors (private mode, sandboxed WebView contexts).
  }

  try {
    const params = new URLSearchParams(window.location?.search || '');
    enabled = params.get('latency') === '1';
  } catch (_) {
    enabled = false;
  }

  return enabled;
}

/**
 * Static facts about the audio path. These are what actually differ between
 * desktop Chrome, iOS WKWebView, and Android System WebView.
 *
 * - baseLatency:   the graph's own buffering (quantum size / sampleRate).
 * - outputLatency: browser handoff -> speaker. The big unknown on Android, and
 *                  the number that decides iOS-only vs. a native audio plugin.
 *                  Not implemented in all Safari versions; reported as null.
 * - lookAhead:     Tone's scheduler headroom. Absorbs main-thread jank, but it
 *                  does NOT reduce output latency — it only prevents late notes.
 */
export function getAudioPathInfo(Tone) {
  const ctx = Tone?.context;
  const raw = ctx?.rawContext ?? ctx;
  if (!raw) return null;

  const baseLatency = typeof raw.baseLatency === 'number' ? raw.baseLatency : null;
  // Chromium exposes outputLatency; older Safari does not. Distinguish
  // "unsupported" (null) from "measured as zero" — they mean different things.
  const outputLatency = typeof raw.outputLatency === 'number' ? raw.outputLatency : null;

  const totalMs = (baseLatency ?? 0) * 1000 + (outputLatency ?? 0) * 1000;

  return {
    sampleRate: raw.sampleRate ?? null,
    state: raw.state ?? null,
    baseLatencyMs: baseLatency === null ? null : baseLatency * 1000,
    outputLatencyMs: outputLatency === null ? null : outputLatency * 1000,
    // Best available estimate of "sound is heard this many ms after its
    // scheduled time". Understated when outputLatency is unsupported.
    totalLatencyMs: totalMs,
    outputLatencySupported: outputLatency !== null,
    lookAheadMs: typeof ctx?.lookAhead === 'number' ? ctx.lookAhead * 1000 : null,
  };
}

/**
 * Record one sequencer callback.
 *
 * `scheduledTime` is the audio-context timestamp the note was scheduled for;
 * comparing it against the context clock at callback time yields the remaining
 * scheduling headroom. Healthy is close to Tone's lookAhead (100ms by default).
 * Trending toward zero means the main thread is starving the scheduler, which
 * is audible as dropped or rushed hits — a different failure from output
 * latency, and one that shows up under Phaser's render load rather than at idle.
 */
export function recordSequenceTick(Tone, scheduledTime) {
  if (!isLatencyProbeEnabled()) return;

  const ctx = Tone?.context;
  const raw = ctx?.rawContext ?? ctx;
  if (!raw || typeof raw.currentTime !== 'number') return;

  const leadMs = (scheduledTime - raw.currentTime) * 1000;

  totalTicks += 1;
  if (leadMs <= 0) lateTicks += 1;

  ticks.push(leadMs);
  if (ticks.length > SAMPLE_WINDOW) ticks.shift();
}

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))));
  return sorted[idx];
}

/**
 * Full report. Also exposed as `window.__latency()` so it can be pulled from a
 * remote-debugging console on a real handset without any UI.
 */
export function getLatencyReport(Tone) {
  const path = getAudioPathInfo(Tone);
  const sorted = [...ticks].sort((a, b) => a - b);
  const mean = ticks.length ? ticks.reduce((a, b) => a + b, 0) / ticks.length : null;

  return {
    ...path,
    scheduling: {
      samples: ticks.length,
      totalTicks,
      meanLeadMs: mean,
      p50LeadMs: percentile(sorted, 50),
      p05LeadMs: percentile(sorted, 5),   // worst-case headroom
      minLeadMs: sorted.length ? sorted[0] : null,
      lateTicks,
      latePct: totalTicks ? (lateTicks / totalTicks) * 100 : 0,
    },
    // Visuals scheduled via Tone.Draw fire at the note's audio time, but the
    // sound is not heard until totalLatencyMs later — so spawns currently lead
    // the beat by this much. Delay Tone.Draw by this to re-sync sight to sound.
    recommendedDrawOffsetMs: path?.totalLatencyMs ?? 0,
  };
}

function fmt(v, unit = 'ms') {
  if (v === null || v === undefined) return 'n/a';
  return `${v.toFixed(1)}${unit}`;
}

/**
 * Formats the report as a single line — the shape worth pasting into a devlog
 * entry when comparing handsets.
 */
export function formatLatencyReport(report) {
  if (!report) return '[latency] unavailable';
  const s = report.scheduling;
  return (
    `[latency] sr=${report.sampleRate ?? 'n/a'} ` +
    `base=${fmt(report.baseLatencyMs)} ` +
    `output=${report.outputLatencySupported ? fmt(report.outputLatencyMs) : 'unsupported'} ` +
    `total=${fmt(report.totalLatencyMs)} ` +
    `lookAhead=${fmt(report.lookAheadMs)} | ` +
    `lead p50=${fmt(s.p50LeadMs)} p05=${fmt(s.p05LeadMs)} min=${fmt(s.minLeadMs)} ` +
    `late=${s.lateTicks}/${s.totalTicks} (${s.latePct.toFixed(1)}%)`
  );
}

function ensureOverlay() {
  if (overlayEl || typeof document === 'undefined') return overlayEl;
  overlayEl = document.createElement('div');
  overlayEl.id = 'latencyOverlay';
  overlayEl.style.cssText = [
    'position:fixed', 'top:0', 'left:0', 'z-index:99999',
    'background:rgba(0,0,0,0.82)', 'color:#0f0',
    'font:10px/1.35 monospace', 'padding:6px 8px',
    'white-space:pre', 'pointer-events:none',
    'max-width:100vw', 'overflow:hidden',
  ].join(';');
  document.body.appendChild(overlayEl);
  return overlayEl;
}

/**
 * Starts the probe: installs `window.__latency()` and, when a document exists,
 * a small always-on overlay. Safe to call unconditionally — it no-ops unless
 * the probe is enabled.
 */
export function startLatencyProbe(Tone, { intervalMs = 500 } = {}) {
  if (!isLatencyProbeEnabled()) return () => {};

  if (typeof window !== 'undefined') {
    window.__latency = () => getLatencyReport(Tone);
    window.__latencyLine = () => formatLatencyReport(getLatencyReport(Tone));
  }

  const el = ensureOverlay();
  const timer = setInterval(() => {
    const report = getLatencyReport(Tone);
    if (!el) return;
    const s = report.scheduling;
    el.textContent = [
      `sr ${report.sampleRate ?? 'n/a'}  state ${report.state ?? 'n/a'}`,
      `base   ${fmt(report.baseLatencyMs)}`,
      `output ${report.outputLatencySupported ? fmt(report.outputLatencyMs) : 'unsupported'}`,
      `TOTAL  ${fmt(report.totalLatencyMs)}`,
      `lead p50 ${fmt(s.p50LeadMs)}  p05 ${fmt(s.p05LeadMs)}`,
      `late ${s.lateTicks}/${s.totalTicks} (${s.latePct.toFixed(1)}%)`,
    ].join('\n');
  }, intervalMs);

  console.log('[latency] probe enabled — call __latency() for the full report');

  return () => {
    clearInterval(timer);
    if (el?.parentNode) el.parentNode.removeChild(el);
  };
}

/** Test seam — resets rolling state. */
export function resetLatencyProbe() {
  ticks = [];
  lateTicks = 0;
  totalTicks = 0;
  enabled = null;
}
