// ============================================
// LEADERBOARD VIEW - shared Phaser renderer
// ============================================
// Used by both the game-over overlay and the start screen; the two differ only by
// variant, font size and depth. Deliberately has no `import Phaser` - it duck-types the
// scene it is handed, so it stays cheap to load and does not widen either bundle.

import { LEADERBOARD_VARIANTS, formatLeaderboardHeader, formatLeaderboardRow } from './leaderboard-format.js';

/**
 * Renders a table of entries, one Phaser Text per row, grouped in a Container.
 * The caller owns the container and should destroy() it (which destroys the rows).
 *
 * @returns {{container: object, height: number, rowCount: number}}
 */
export function renderLeaderboardTable(scene, {
  x,
  y,
  entries,
  variant = 'compact',
  fontSize = '12px',
  lineSpacing = 4,
  depth = 100,
  highlightRank = null,
  color = '#00ffcc',
  headerColor = '#00ff00',
  highlightColor = '#ffff00',
  emptyMessage = 'NO SCORES YET'
}) {
  const spec = LEADERBOARD_VARIANTS[variant] || LEADERBOARD_VARIANTS.compact;
  const container = scene.add.container(x, y);
  container.setDepth(depth);

  const lines = [];
  if (!entries.length) {
    lines.push({ text: emptyMessage, fill: color });
  } else {
    lines.push({ text: formatLeaderboardHeader(spec), fill: headerColor });
    entries.slice(0, spec.rowCount).forEach((entry, index) => {
      const rank = index + 1;
      const highlighted = rank === highlightRank;
      lines.push({
        text: formatLeaderboardRow(entry, rank, spec, highlighted),
        fill: highlighted ? highlightColor : color
      });
    });
  }

  let offsetY = 0;
  lines.forEach(line => {
    const text = scene.add.text(0, offsetY, line.text, {
      font: `${fontSize} monospace`,
      fill: line.fill
    });
    // Rows are padded to equal length, so centring each one keeps the columns aligned.
    text.setOrigin(0.5, 0);
    container.add(text);
    offsetY += text.height + lineSpacing;
  });

  return {
    container,
    height: Math.max(0, offsetY - lineSpacing),
    rowCount: lines.length
  };
}
