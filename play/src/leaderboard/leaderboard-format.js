// ============================================
// LEADERBOARD FORMATTING - rows as fixed-width monospace strings
// ============================================
// Rows are rendered as padded monospace text rather than per-cell text objects, so
// columns line up with one Phaser Text per row (which keeps per-row colouring cheap).
//
// IMPORTANT: this module must NOT import music-engine.js or music-ui.js, even though
// they own the canonical genre and difficulty tables. Both build Tone.js nodes at
// module-evaluation time (music-engine.js:17 calls `.toDestination()`), and StartupScene
// imports this file eagerly - pulling them in would create an AudioContext before any
// user gesture and break the iOS audio-unlock flow that startup-scene.js:317 goes out of
// its way to preserve. The label maps below are a deliberate small duplication that
// keeps that lazy-load boundary intact.
//
// Pure module: no Phaser, no Tone, no DOM.

const UNKNOWN_CELL = '—'; // em dash

const GENRE_CODES = {
  techno: 'TEC',
  dnb: 'DNB',
  tropical: 'TRO',
  dubstep: 'DUB',
  trance: 'TRN'
};

const GENRE_LABELS = {
  techno: 'TECHNO',
  dnb: 'D&B',
  tropical: 'TROPICAL',
  dubstep: 'DUBSTEP',
  trance: 'TRANCE'
};

const DIFFICULTY_CODES = {
  zen: 'ZEN',
  normal: 'NRM',
  intense: 'INT',
  chaos: 'CHS'
};

const DIFFICULTY_LABELS = {
  zen: 'ZEN',
  normal: 'NORMAL',
  intense: 'INTENSE',
  chaos: 'CHAOS'
};

export function formatDuration(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatGenre(entry, { long = false } = {}) {
  const table = long ? GENRE_LABELS : GENRE_CODES;
  if (entry.isMixedGenre) return long ? 'MIXED' : 'MIX';
  return table[entry.genre] || UNKNOWN_CELL;
}

export function formatDifficulty(entry, { long = false } = {}) {
  const table = long ? DIFFICULTY_LABELS : DIFFICULTY_CODES;
  return table[entry.difficulty] || UNKNOWN_CELL;
}

const MAGNITUDE_SUFFIXES = [[1e3, 'k'], [1e6, 'm'], [1e9, 'b']];

/**
 * Renders a number within `maxWidth` characters, falling back to k/m/b notation.
 * Plain truncation would silently turn 289200 into "28920" - a different, wrong number.
 * Very short runs produce enormous points-per-minute values, so this is reachable.
 */
export function abbreviateNumber(value, maxWidth) {
  const plain = String(value);
  if (plain.length <= maxWidth) return plain;

  for (const [factor, suffix] of MAGNITUDE_SUFFIXES) {
    if (value < factor) continue;
    const text = `${Math.round(value / factor)}${suffix}`;
    if (text.length <= maxWidth) return text;
  }

  return plain.slice(0, maxWidth);
}

// Cell renderers receive the entry plus a context of { rank, highlighted, width }.
function durationCell(entry) {
  return entry.durationSeconds > 0 ? formatDuration(entry.durationSeconds) : UNKNOWN_CELL;
}

function rateCell(entry, { width }) {
  return entry.pointsPerMinute > 0 ? abbreviateNumber(entry.pointsPerMinute, width) : UNKNOWN_CELL;
}

function scoreCell(entry, { width }) {
  return abbreviateNumber(entry.score, width);
}

function rankCell(_entry, { rank, highlighted }) {
  return `${highlighted ? '>' : ''}${rank}`;
}

// Widths are budgeted against the narrowest supported viewport. `compact` totals 30
// characters; at the 9px monospace the game-over screen uses on a 320px-wide phone
// (~5.4px per glyph) that is ~162px, comfortably inside the frame.
export const LEADERBOARD_VARIANTS = {
  compact: {
    rowCount: 5,
    columns: [
      { header: '#', width: 3, align: 'right', cell: rankCell },
      { header: 'SCORE', width: 6, align: 'right', cell: scoreCell },
      { header: 'GEN', width: 3, align: 'left', cell: entry => formatGenre(entry) },
      { header: 'DIF', width: 3, align: 'left', cell: entry => formatDifficulty(entry) },
      { header: 'TIME', width: 5, align: 'right', cell: durationCell },
      { header: 'PTS/M', width: 5, align: 'right', cell: rateCell }
    ]
  },
  full: {
    rowCount: 10,
    columns: [
      { header: '#', width: 3, align: 'right', cell: rankCell },
      { header: 'SCORE', width: 7, align: 'right', cell: scoreCell },
      { header: 'GENRE', width: 8, align: 'left', cell: entry => formatGenre(entry, { long: true }) },
      { header: 'MODE', width: 7, align: 'left', cell: entry => formatDifficulty(entry, { long: true }) },
      { header: 'TIME', width: 6, align: 'right', cell: durationCell },
      { header: 'PTS/MIN', width: 7, align: 'right', cell: rateCell }
    ]
  }
};

function padCell(value, width, align) {
  const text = String(value);
  if (text.length > width) return text.slice(0, width);
  return align === 'right' ? text.padStart(width) : text.padEnd(width);
}

export function formatLeaderboardHeader(variant) {
  return variant.columns
    .map(column => padCell(column.header, column.width, column.align))
    .join(' ');
}

export function formatLeaderboardRow(entry, rank, variant, highlighted = false) {
  return variant.columns
    .map(column => {
      const value = column.cell(entry, { rank, highlighted, width: column.width });
      return padCell(value, column.width, column.align);
    })
    .join(' ');
}
