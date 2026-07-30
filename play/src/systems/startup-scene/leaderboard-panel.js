// ============================================
// START SCREEN HIGH SCORES - button and full table panel
// ============================================
// Kept out of startup-scene.js so the scene file stays a layout script.

import { gameState } from '../../config.js';
import { loadLeaderboard } from '../../leaderboard/leaderboard-store.js';
import { renderLeaderboardTable } from '../../leaderboard/leaderboard-view.js';

// Above the start screen's other interactive text (tutorial button sits at 1000).
const BUTTON_DEPTH = 1000;
const PANEL_DEPTH = 2000;

function buttonPosition() {
  // Bottom-right. The top-right corner collides with the boot-sequence text on narrow
  // viewports, and the centre column is already crowded by the instruction stack;
  // nothing else on this screen is anchored to the bottom-right at any size.
  return { x: gameState.WIDTH - 20, y: gameState.HEIGHT - 20 };
}

export function isHighScorePanelOpen() {
  return Boolean(this.highScorePanel);
}

/**
 * Phaser dispatches a game object's `pointerdown` AND the scene-wide `pointerdown` for
 * the same tap, and stopPropagation() only affects the underlying DOM event. Without
 * this, opening the panel from the button immediately closed it again: the button
 * opened it, then the scene's start-click handler saw an open panel and dismissed it.
 *
 * @returns true when this tap was already handled by the button or the panel backdrop.
 */
export function consumeHighScoreClick() {
  if (!this.highScoreClickHandled) return false;
  this.highScoreClickHandled = false;
  return true;
}

export function createHighScoresButtonSystem() {
  const { x, y } = buttonPosition();

  const button = this.add.text(x, y, '[HIGH SCORES]', {
    font: '14px monospace',
    fill: '#00ff00'
  });
  button.setOrigin(1, 1);
  button.setAlpha(0.6);
  button.setDepth(BUTTON_DEPTH);
  button.setInteractive({ useHandCursor: true });

  button.on('pointerover', () => button.setAlpha(1));
  button.on('pointerout', () => button.setAlpha(0.6));
  button.on('pointerdown', (pointer) => {
    pointer.event.stopPropagation();
    this.highScoreClickHandled = true;
    toggleHighScorePanelSystem.call(this, !isHighScorePanelOpen.call(this));
  });

  this.highScoresButton = button;
}

export function toggleHighScorePanelSystem(open) {
  if (this.highScorePanel) {
    // Destroying the container destroys the backdrop, texts and nested table.
    this.highScorePanel.destroy();
    this.highScorePanel = null;
  }
  if (!open) return;

  const WIDTH = gameState.WIDTH;
  const HEIGHT = gameState.HEIGHT;
  const screenRef = Math.min(WIDTH, HEIGHT);
  const rowFontSize = `${Math.min(16, Math.max(10, Math.floor(screenRef * 0.03)))}px`;

  const container = this.add.container(0, 0);
  container.setDepth(PANEL_DEPTH);

  // Interactive so it both swallows taps aimed at the start screen's buttons underneath
  // and gives the panel a single, unambiguous way to dismiss itself.
  const backdrop = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x000000, 0.85);
  backdrop.setInteractive();
  backdrop.on('pointerdown', (pointer) => {
    pointer.event.stopPropagation();
    this.highScoreClickHandled = true;
    toggleHighScorePanelSystem.call(this, false);
  });
  container.add(backdrop);

  const title = this.add.text(WIDTH / 2, HEIGHT * 0.18, 'HIGH SCORES', {
    font: `bold ${Math.floor(screenRef * 0.06)}px monospace`,
    fill: '#00ffcc',
    stroke: '#00ffcc',
    strokeThickness: 1
  });
  title.setOrigin(0.5);

  const tableY = HEIGHT * 0.28;
  const table = renderLeaderboardTable(this, {
    x: WIDTH / 2,
    y: tableY,
    entries: loadLeaderboard(),
    variant: 'full',
    fontSize: rowFontSize,
    depth: PANEL_DEPTH
  });

  const hint = this.add.text(WIDTH / 2, tableY + table.height + screenRef * 0.07, 'TAP OR PRESS ESC TO CLOSE', {
    font: '14px monospace',
    fill: '#00ff00'
  });
  hint.setOrigin(0.5);
  hint.setAlpha(0.7);

  // A solid card behind the content: the dimmed start screen alone leaves the title and
  // instruction text showing through the table, which makes the numbers hard to read.
  // Sized from the rendered rows rather than an estimate, so it fits at any font size.
  const rowWidths = table.container.list.map(row => row.width);
  const contentWidth = Math.max(title.width, hint.width, ...rowWidths);
  const padX = screenRef * 0.06;
  const padY = screenRef * 0.05;
  const cardTop = title.y - title.height / 2 - padY;
  const cardBottom = hint.y + hint.height / 2 + padY;

  const card = this.add.rectangle(
    WIDTH / 2,
    (cardTop + cardBottom) / 2,
    Math.min(WIDTH - 20, contentWidth + padX * 2),
    cardBottom - cardTop,
    0x000000,
    1
  );
  card.setStrokeStyle(1, 0x00ffcc, 0.6);

  // Insertion order is draw order within a container: card, then the content over it.
  container.add(card);
  container.add(title);
  container.add(table.container);
  container.add(hint);

  this.highScorePanel = container;
}

export function repositionHighScoreUiSystem() {
  if (this.highScoresButton) {
    const { x, y } = buttonPosition();
    this.highScoresButton.x = x;
    this.highScoresButton.y = y;
  }

  // The panel is laid out from the viewport size, so rebuild rather than reflow it.
  if (isHighScorePanelOpen.call(this)) {
    toggleHighScorePanelSystem.call(this, true);
  }
}
