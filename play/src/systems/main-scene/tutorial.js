import Phaser from 'phaser';
import * as Tone from 'tone';
import { gameState, LANES, ENEMY_SPEED_BASE } from '../../config.js';
import { currentDifficulty } from '../../audio/music-ui.js';

export function handleTutorialSpawnSystem() {
  switch (this.tutorialWave) {
    case 0:
      if (!this.tutorialWaveStarted) {
        this.tutorialText.setText('PRESS SPACE TO SHOOT');
        this.tutorialProgressText.setText('Shoot the approaching enemies');
        this.tutorialWaveStarted = true;
        this.shootingShown = false;
      }

      if (this.beats >= 1) {
        if (!this.shootingShown) {
          this.shootingShown = true;
          this.tutorialText.setText('ENEMIES APPEAR ON BEAT!');
        }
        if (this.beats % 1 === 0) {
          this._spawnEnemy(2, ENEMY_SPEED_BASE * 0.8, 'enemyTex');
        }
      }
      break;

    case 1:
      if (!this.tutorialWaveStarted) {
        this.tutorialText.setText('PRESS ← → TO MOVE LANES');
        this.tutorialProgressText.setText('Move left and right');
        this.tutorialWaveStarted = true;
        this.tutorialTimer = 10000;
        this.movementShown = false;

        this.tutorialText.setText('DODGE THE V FORMATION!');
        this.movementShown = true;

        this._spawnObstacle(2);
        this.time.delayedCall(1000, () => {
          this._spawnObstacle(1);
          this._spawnObstacle(3);
        });
        this.time.delayedCall(2000, () => {
          this._spawnObstacle(0);
          this._spawnObstacle(4);
        });
      }

      if (this.beats === 4) {
        this._spawnObstacle(2);
        this.time.delayedCall(1000, () => {
          this._spawnObstacle(1);
          this._spawnObstacle(3);
        });
        this.time.delayedCall(2000, () => {
          this._spawnObstacle(0);
          this._spawnObstacle(4);
        });
      }
      break;

    case 2:
      if (this.beats % 6 === 0) {
        this._spawnObstacle(2);
        this.time.delayedCall(600, () => {
          this._spawnEnemy(2, ENEMY_SPEED_BASE * 0.6, 'enemyTex');
        });
      }

      if (!this.tutorialWaveStarted) {
        this.tutorialText.setText('JUMP + SHOOT = ARC SHOT OVER SHIELDS');
        this.tutorialProgressText.setText('Hit 2 enemies behind shields');
        this.tutorialWaveStarted = true;
      }
      break;

    case 3:
      if (!this.tutorialWaveStarted) {
        this.tutorialText.setText('DOUBLE-TAP → TO DASH');
        this.tutorialProgressText.setText('Dash through gaps to collect power-ups');
        this.tutorialWaveStarted = true;

        this._spawnObstacle(0);
        this._spawnObstacle(1);
        this._spawnObstacle(3);
        this._spawnObstacle(4);
        this.time.delayedCall(20, () => {
          this._spawnPowerUp(0);
        });
      }

      if (this.beats % 8 === 0 && this.beats > 0) {
        this._spawnObstacle(0);
        this._spawnObstacle(1);
        this._spawnObstacle(3);
        this._spawnObstacle(4);
        this.time.delayedCall(20, () => {
          this._spawnPowerUp(4);
        });
      }
      break;

    case 4:
      if (this.beats === 1) {
        this._spawnObstacle(2);
        this.time.delayedCall(700, () => {
          this._spawnEnemy(2, ENEMY_SPEED_BASE * 0.5, 'enemyTex');
        });
      }

      if (this.beats === 12) {
        this._spawnObstacle(3);
        this.time.delayedCall(700, () => {
          this._spawnEnemy(3, ENEMY_SPEED_BASE * 0.5, 'enemyTex');
        });
      }

      if (!this.tutorialWaveStarted) {
        this.tutorialText.setText('JUMP + SHOOT = ARC SHOT');
        this.tutorialProgressText.setText('Hit enemy, then move to dodge shield');
        this.tutorialWaveStarted = true;
        this.tutorialArcShotCount = 0;
      }

      if (this.tutorialArcShotCount !== (this.tutorialProgress.arcShotsHit || 0)) {
        this.tutorialArcShotCount = this.tutorialProgress.arcShotsHit || 0;
        if (this.tutorialArcShotCount === 1) {
          this.tutorialText.setText('GOOD! NOW MOVE TO DODGE THE SHIELD');
        }
      }
      break;

    case 5:
      if (!this.tutorialWaveStarted) {
        this.tutorialText.setText('HOLD ↓ TO CHARGE SUPER JUMP');
        this.tutorialProgressText.setText('Hold down, then release to jump higher!');
        this.tutorialWaveStarted = true;
        this.superJumpShown = false;
        this.tutorialSuperJumps = 0;
      }

      if (this.beats === 2 && !this.superJumpShown) {
        this.superJumpShown = true;
        this.tutorialText.setText('CHARGE AND JUMP OVER THE SHIELD!');
        this._spawnObstacle(2);
      }

      if (this.beats > 2 && this.beats % 6 === 0) {
        this._spawnObstacle(Phaser.Math.Between(1, 3));
      }
      break;

    case 6:
      if (!this.tutorialWaveStarted) {
        this.tutorialText.setText('STARS APPEAR DURING BREAKS!');
        this.tutorialProgressText.setText('Super jump to collect stars above shields');
        this.tutorialWaveStarted = true;
        this.isBreakSection = true;
      }

      if (this.beats % 8 === 0) {
        this._spawnObstacle(2);
      }
      if (this.beats % 8 === 4) {
        this._spawnObstacle(Phaser.Math.Between(1, 3));
      }
      break;

    case 7:
      if (!this.tutorialWaveStarted) {
        this.tutorialText.setText('FULL GAME - SURVIVE!');
        this.tutorialProgressText.setText('Starting at 70% difficulty, will increase gradually');
        this.tutorialWaveStarted = true;
        this.tutorialTimer = 30000;

        this.adaptiveState.isAssisting = true;
        this.adaptiveState.assistStartTime = this.time.now;
        this.adaptiveState.currentSpawnMultiplier = 0.7;
        this.adaptiveState.currentSpeedMultiplier = 0.85;
      }
      break;
  }
}

export function updateTutorialProgressSystem() {
  if (!this.isTutorial) return;

  switch (this.tutorialWave) {
    case 0:
      this.tutorialProgressText.setText(`Enemies hit: ${this.tutorialProgress.shotsHit}/3`);
      if (this.tutorialProgress.shotsHit >= 3) {
        this.advanceTutorial();
      }
      break;

    case 1:
      if (this.tutorialTimer) {
        this.tutorialTimer -= 16;
        const seconds = Math.ceil(this.tutorialTimer / 1000);
        this.tutorialProgressText.setText(`Dodge for: ${seconds} seconds`);
        if (this.tutorialTimer <= 0) {
          this.advanceTutorial();
        }
      }
      break;

    case 2:
      this.tutorialProgressText.setText(`Arc shots hit: ${this.tutorialProgress.arcShotsHit || 0}/2`);
      if ((this.tutorialProgress.arcShotsHit || 0) >= 2) {
        this.advanceTutorial();
      }
      break;

    case 3:
      this.tutorialProgressText.setText(`Power-ups collected: ${this.tutorialProgress.powerUpsCollected || 0}/2`);
      if ((this.tutorialProgress.powerUpsCollected || 0) >= 2) {
        this.advanceTutorial();
      }
      break;

    case 4:
      this.tutorialProgressText.setText(`Arc shots hit: ${this.tutorialProgress.arcShotsHit || 0}/2`);
      if ((this.tutorialProgress.arcShotsHit || 0) >= 2) {
        this.advanceTutorial();
      }
      break;

    case 5:
      if (this.jumpChargeAmount > 0.3) {
        this.tutorialText.setText('RELEASE TO JUMP!');
      } else if (this.jumpChargeAmount > 0.1) {
        this.tutorialText.setText('KEEP HOLDING TO CHARGE MORE!');
      } else if (this.isChargingJump) {
        this.tutorialText.setText('CHARGING...');
      }

      this.tutorialProgressText.setText(`Super jumps: ${this.tutorialSuperJumps || 0}/2`);
      if ((this.tutorialSuperJumps || 0) >= 2) {
        this.advanceTutorial();
      }
      break;

    case 6:
      this.tutorialProgressText.setText(`Stars collected: ${this.tutorialProgress.starsCollected}/2`);
      if (this.tutorialProgress.starsCollected >= 2) {
        this.isBreakSection = false;
        this.advanceTutorial();
      }
      break;

    case 7:
      if (this.tutorialTimer) {
        this.tutorialTimer -= 16;
        const seconds = Math.ceil(this.tutorialTimer / 1000);
        const difficultyPercent = Math.round(this.adaptiveState.currentSpawnMultiplier * 100);
        const speedPercent = Math.round(this.adaptiveState.currentSpeedMultiplier * 100);
        this.tutorialProgressText.setText(`Practice: ${seconds}s | Difficulty: ${difficultyPercent}% | Speed: ${speedPercent}%`);
        if (this.tutorialTimer <= 0) {
          this.completeTutorial();
        }
      }
      break;
  }
}

export function advanceTutorialSystem() {
  this.tutorialWave++;
  this.tutorialWaveStarted = false;
  this.tutorialTimer = null;

  const successText = this.add.text(gameState.WIDTH / 2, gameState.HEIGHT / 2, 'EXCELLENT!', {
    font: 'bold 48px monospace',
    fill: '#00ff00',
    stroke: '#000000',
    strokeThickness: 6
  }).setOrigin(0.5).setDepth(1001);

  this.tweens.add({
    targets: successText,
    scale: 1.5,
    alpha: 0,
    duration: 1000,
    ease: 'Power2',
    onComplete: () => successText.destroy()
  });
}

export function skipTutorialSystem() {
  this.tutorialText.setText('SKIPPING TUTORIAL...');
  this.tutorialProgressText.setText('Starting full game...');

  this.time.delayedCall(500, () => {
    this.isTutorial = false;
    this.tutorialText.destroy();
    this.tutorialProgressText.destroy();
    this.skipTutorialButton.destroy();

    this.adaptiveState.isAssisting = false;
    this.adaptiveState.currentSpawnMultiplier = 1.0;
    this.adaptiveState.currentSpeedMultiplier = 1.0;
    this.adaptiveState.assistStartTime = null;
    Tone.Transport.bpm.value = 120;
    this.beats = 0;
  });
}

export function completeTutorialSystem() {
  localStorage.setItem('beatrider_tutorial_completed', 'true');
  this.tutorialText.setText('TUTORIAL COMPLETE!');
  this.tutorialProgressText.setText('Starting full game...');

  this.time.delayedCall(2000, () => {
    this.isTutorial = false;
    this.tutorialText.destroy();
    this.tutorialProgressText.destroy();
    if (this.skipTutorialButton && !this.skipTutorialButton.destroyed) {
      this.skipTutorialButton.destroy();
    }

    this.adaptiveState.isAssisting = false;
    this.adaptiveState.currentSpawnMultiplier = 1.0;
    this.adaptiveState.currentSpeedMultiplier = 1.0;
    this.adaptiveState.assistStartTime = null;
    Tone.Transport.bpm.value = 120;

    window.GameAPI.onBeat = () => {
      this.beats++;
      const speed = (ENEMY_SPEED_BASE + Math.floor(this.beats / 16) * 30) * currentDifficulty.speedMult;
      const lane = Phaser.Math.Between(0, LANES - 1);
      this._spawnEnemy(lane, speed, 'enemyTex');

      for (const enemy of this.enemies) {
        if (enemy.enemyType === 'enemyTex') {
          enemy.pulseTime = this.time.now;
        }
      }
    };
  });
}
