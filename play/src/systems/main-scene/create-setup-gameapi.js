import Phaser from 'phaser';
import { gameState, isMobile, LANES, ENEMY_SPEED_BASE } from '../../config.js';
import { saveGameData } from '../../storage.js';
import { getSection } from '../../audio/music-engine.js';
import { currentDifficulty, uiState, updateGridButton } from '../../audio/music-ui.js';

export function setupSceneGameApi() {
  window.GameAPI = {
    onBeat: () => {
      this.beats++;

      if (this.isTutorial) {
        this.handleTutorialSpawn();
        if (this.tutorialWave < 7) {
          return;
        }
      }

      if (this.adaptiveState.isAssisting) {
        if (Math.random() > this.adaptiveState.currentSpawnMultiplier) {
          return;
        }
      }

      const baseSpeed = (ENEMY_SPEED_BASE + Math.floor(this.beats / 16) * 30) * currentDifficulty.speedMult;
      const speed = baseSpeed * this.adaptiveState.currentSpeedMultiplier;

      const lane = Phaser.Math.Between(0, LANES - 1);
      this._spawnEnemy(lane, speed, 'enemyTex');

      for (const enemy of this.enemies) {
        if (enemy.enemyType === 'enemyTex') {
          enemy.pulseTime = this.time.now;
        }
      }
    },
    onSnare: () => {
      if (this.isTutorial && this.tutorialWave < 7) return;

      if (this.adaptiveState.isAssisting) {
        if (Math.random() > this.adaptiveState.currentSpawnMultiplier) {
          return;
        }
      }

      const baseSpeed = (ENEMY_SPEED_BASE * 1.5 + Math.floor(this.beats / 16) * 30) * currentDifficulty.speedMult;
      const speed = baseSpeed * this.adaptiveState.currentSpeedMultiplier;
      const lane = Phaser.Math.Between(0, LANES - 1);
      this._spawnEnemy(lane, speed, 'fastEnemyTex');

      for (const enemy of this.enemies) {
        if (enemy.enemyType === 'fastEnemyTex') {
          enemy.pulseTime = this.time.now;
        }
      }
    },
    onHihat: () => {
      if (this.isTutorial && this.tutorialWave < 7) return;

      if (this.adaptiveState.isAssisting) {
        if (Math.random() > this.adaptiveState.currentSpawnMultiplier) {
          return;
        }
      }

      const lane = Phaser.Math.Between(0, LANES - 1);
      this._spawnObstacle(lane);

      for (const obstacle of this.obstacles) {
        obstacle.pulseTime = this.time.now;
      }
    },
    onAcid: () => {
      if (this.isTutorial && this.tutorialWave < 5) return;

      const lane = Phaser.Math.Between(0, LANES - 1);
      this._spawnPowerUp(lane);
    },
    onStab: () => {
      if (this.isTutorial) return;

      const lane = Phaser.Math.Between(0, LANES - 1);
      this._spawnDrifter(lane);

      for (const enemy of this.enemies) {
        if (enemy.isDrifter) {
          enemy.pulseTime = this.time.now;
        }
      }
    },
    onSub: () => {
      this._pulseGrid();

      if (this.isTutorial) return;

      const section = getSection(window.currentBar || 0);
      this.isBreakSection = section === 'BREAK';
    },
    toggleGrid: () => {
      this.gridVisible = !this.gridVisible;
      gameState.gridEnabled = this.gridVisible;
      saveGameData({ settings: { gridEnabled: gameState.gridEnabled } });

      window.trackEvent('settings_change', {
        setting_type: 'grid',
        grid_enabled: gameState.gridEnabled
      });

      if (this.gridText) {
        const gridTextContent = isMobile
          ? `GRID: ${this.gridVisible ? 'ON' : 'OFF'}`
          : `GRID: ${this.gridVisible ? 'ON' : 'OFF'} [G]`;
        this.gridText.setText(gridTextContent);
      }
      if (!this.gridVisible && this.gridGraphics) {
        this.gridGraphics.clear();
      } else if (this.gridVisible && this.isPaused) {
        this._drawPerspectiveGrid();
      }
      uiState.gridVisible = this.gridVisible;
      updateGridButton();
    },
    reset: () => {
      this.scene.restart();
    }
  };
}
