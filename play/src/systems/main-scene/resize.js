import { gameState, isMobile, updateDimensions } from '../../config.js';

export function resizeMainSceneSystem() {
  updateDimensions(this.cameras.main.width, this.cameras.main.height);

  this.vanishX = gameState.WIDTH / 2;
  this.vanishY = gameState.HEIGHT * 0.15;

  if (this.player) {
    this.player.x = this._laneX(this.playerLane);
    this.player.y = gameState.PLAYER_Y;
  }

  const scoreY = isMobile ? gameState.HEIGHT - 36 : gameState.HEIGHT - 24;
  const highScoreY = isMobile ? gameState.HEIGHT - 72 : gameState.HEIGHT - 48;
  const comboY = isMobile ? gameState.HEIGHT - 108 : gameState.HEIGHT - 72;

  if (this.scoreLabel) {
    this.scoreLabel.y = scoreY;
  }
  if (this.scoreText) {
    this.scoreText.y = scoreY;
  }
  if (this.highScoreLabel) {
    this.highScoreLabel.y = highScoreY;
  }
  if (this.highScoreText) {
    this.highScoreText.y = highScoreY;
  }
  if (this.comboText) {
    this.comboText.y = comboY;
  }

  if (this.comboMeterBg) {
    const meterY = comboY + 30;
    this.comboMeterY = meterY;
    this.comboMeterBg.clear();
    this.comboMeterBg.fillStyle(0x333333, 0.5);
    this.comboMeterBg.fillRect(10, meterY, 200, 8);
  }

  if (this.stars) {
    this.createStarfield();
  }

  if (this.gridVisible && this.gridGraphics) {
    this._drawPerspectiveGrid();
  }

  if (this.mobileControls) {
    this.setupMobileControls();
  }
}
