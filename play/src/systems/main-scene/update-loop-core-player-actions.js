import Phaser from 'phaser';
import * as Tone from 'tone';
import { LANES } from '../../config.js';
import { gameSounds } from '../../audio/game-sounds.js';
import { MAIN_SCENE_ACTIONS, dispatchMainSceneAction } from './action-dispatch.js';

export function handleMovementInputAndOffscreen(dt) {
  const player = this.stateSlices?.player;
  const flow = this.stateSlices?.flow;
  const combat = this.stateSlices?.combat;

  if (!(flow?.playerCanControl ?? this.playerCanControl)) {
    // noop
  } else if (Phaser.Input.Keyboard.JustDown(this.keys.LEFT) || Phaser.Input.Keyboard.JustDown(this.keys.A)) {
    const now = this.time.now;
    if (now - this.lastLeftPress < this.doubleTapWindow) {
      if (this.laneBeforeKeyboardMove !== undefined && this.isMoving) {
        this.tweens.killTweensOf(this.player);
        if (player) player.lane = this.laneBeforeKeyboardMove;
        else this.playerLane = this.laneBeforeKeyboardMove;
        this.player.x = this._laneX(player?.lane ?? this.playerLane);
        this.player.setScale(1, 1);
        if (player) player.moving = false;
        else this.isMoving = false;
      }
      dispatchMainSceneAction.call(this, MAIN_SCENE_ACTIONS.DASH_LEFT, { source: 'keyboard' });
      this.lastLeftPress = 0;
      this.laneBeforeKeyboardMove = undefined;
    } else {
      this.laneBeforeKeyboardMove = player?.lane ?? this.playerLane;
      dispatchMainSceneAction.call(this, MAIN_SCENE_ACTIONS.MOVE_LEFT, { source: 'keyboard' });
      this.lastLeftPress = now;
    }
  } else if (Phaser.Input.Keyboard.JustDown(this.keys.RIGHT) || Phaser.Input.Keyboard.JustDown(this.keys.D)) {
    const now = this.time.now;
    if (now - this.lastRightPress < this.doubleTapWindow) {
      if (this.laneBeforeKeyboardMove !== undefined && this.isMoving) {
        this.tweens.killTweensOf(this.player);
        if (player) player.lane = this.laneBeforeKeyboardMove;
        else this.playerLane = this.laneBeforeKeyboardMove;
        this.player.x = this._laneX(player?.lane ?? this.playerLane);
        this.player.setScale(1, 1);
        if (player) player.moving = false;
        else this.isMoving = false;
      }
      dispatchMainSceneAction.call(this, MAIN_SCENE_ACTIONS.DASH_RIGHT, { source: 'keyboard' });
      this.lastRightPress = 0;
      this.laneBeforeKeyboardMove = undefined;
    } else {
      this.laneBeforeKeyboardMove = player?.lane ?? this.playerLane;
      dispatchMainSceneAction.call(this, MAIN_SCENE_ACTIONS.MOVE_RIGHT, { source: 'keyboard' });
      this.lastRightPress = now;
    }
  }

  if ((player?.lane ?? this.playerLane) < 0 || (player?.lane ?? this.playerLane) >= LANES) {
    if (combat) combat.offScreenTimer -= dt;
    else this.offScreenTimer -= dt;
    if (this.offScreenTurnDelay > 0) {
      this.offScreenTurnDelay -= dt;
    }

    const shakeIntensity = Math.max(0, 1 - (combat?.offScreenTimer ?? this.offScreenTimer) / 800) * 4;
    this.cameras.main.shake(100, shakeIntensity * 0.01);

    if (!this.offScreenPulse) {
      this.offScreenPulse = 0;
    }
    this.offScreenPulse += dt;

    if (this.offScreenPulse > 200) {
      this.offScreenPulse = 0;
      try {
        const intensity = Math.max(0, 1 - (combat?.offScreenTimer ?? this.offScreenTimer) / 800);
        const freq = 50 + intensity * 30;
        gameSounds.offScreenWomp.triggerAttackRelease(freq, '16n', Tone.now(), 0.2 + intensity * 0.3);
      } catch (e) {}
    }

    this.cameras.main.setPostPipeline('ChromaticAberration');

    if ((combat?.offScreenTimer ?? this.offScreenTimer) < 300) {
      this.cameras.main.shake(100, 0.02);
    }
    if ((combat?.offScreenTimer ?? this.offScreenTimer) <= 0) {
      if ((player?.lane ?? this.playerLane) < 0) {
        if (player) player.lane = 0;
        else this.playerLane = 0;
      } else if ((player?.lane ?? this.playerLane) >= LANES) {
        if (player) player.lane = LANES - 1;
        else this.playerLane = LANES - 1;
      }

      const targetX = this._laneX(player?.lane ?? this.playerLane);

      this.tweens.add({
        targets: this.player,
        x: targetX,
        duration: 300,
        ease: 'Back.easeOut',
        onStart: () => {
          this.player.setScale(1.5, 0.7);
        },
        onComplete: () => {
          this.tweens.add({
            targets: this.player,
            scaleX: 1,
            scaleY: 1,
            duration: 200,
            ease: 'Bounce.easeOut'
          });
        }
      });

      this.tweens.add({
        targets: this.player,
        angle: 360,
        duration: 300,
        ease: 'Power2'
      });

      if (combat?.rapidFire ?? this.rapidFire) {
        this.player.setTint(0x00ff00);
      } else {
        this.player.clearTint();
      }
      this.player.setAlpha(1);
      this.offScreenPulse = false;
      try {
        gameSounds.move.triggerAttackRelease('C3', '16n');
      } catch (e) {}
    }
  } else {
    if (!(combat?.rapidFire ?? this.rapidFire)) this.player.clearTint();
    this.offScreenPulse = false;
    this.cameras.main.resetPostPipeline();
  }
}

export function handleCrouchChargeAndJump(dt) {
  const player = this.stateSlices?.player;
  const flow = this.stateSlices?.flow;

  if ((flow?.playerCanControl ?? this.playerCanControl) && (this.keys.DOWN.isDown || this.keys.S.isDown)) {
    if (!(player?.crouching ?? this.isCrouching)) {
      if (player) player.crouching = true;
      else this.isCrouching = true;
      this.crouchTimer = 0;
      this.chargeGlow.setVisible(true);

      try {
        gameSounds.jumpCharge.triggerAttack('C2');
        gameSounds.jumpCharge.frequency.rampTo(440, this.maxChargeTime / 1000);
      } catch (e) {}

      if (!(player?.jumping ?? this.isJumping)) {
        this.tweens.add({
          targets: this.player,
          scaleX: 1.4,
          scaleY: 0.6,
          duration: 100,
          ease: 'Power2'
        });
      }
    }
    this.crouchTimer += dt;

    const chargePercent = Math.min(this.crouchTimer / this.maxChargeTime, 1.0);
    this.chargeGlow.clear();
    this.chargeGlow.x = this.player.x;
    this.chargeGlow.y = this.player.y;

    const pulse = Math.sin(this.time.now * (10 + chargePercent * 20) * 0.001) * 0.2 + 0.8;
    const glowRadius = 30 + chargePercent * 50 * pulse;
    const glowAlpha = 0.3 + chargePercent * 0.5 * pulse;
    const glowColor = Phaser.Display.Color.Interpolate.ColorWithColor(
      { r: 0, g: 255, b: 204 },
      { r: 255, g: 255, b: 0 },
      1,
      chargePercent
    );
    const hexColor = Phaser.Display.Color.GetColor(glowColor.r, glowColor.g, glowColor.b);

    this.chargeGlow.fillStyle(hexColor, glowAlpha);
    this.chargeGlow.fillCircle(0, 0, glowRadius);
  } else if (player?.crouching ?? this.isCrouching) {
    const chargePercent = Math.min(this.crouchTimer / this.maxChargeTime, 1.0);

    try {
      gameSounds.jumpCharge.triggerRelease();
    } catch (e) {}

    if (!(player?.jumping ?? this.isJumping)) {
      dispatchMainSceneAction.call(this, MAIN_SCENE_ACTIONS.SUPER_JUMP, { chargePercent, source: 'keyboard' });
    } else {
      this.queuedSuperJumpCharge = chargePercent;
    }
    if (player) player.crouching = false;
    else this.isCrouching = false;
    this.crouchTimer = 0;
    this.chargeGlow.setVisible(false);
  }

  if (
    (flow?.playerCanControl ?? this.playerCanControl) &&
    (Phaser.Input.Keyboard.JustDown(this.keys.UP) || Phaser.Input.Keyboard.JustDown(this.keys.W)) &&
    !(player?.crouching ?? this.isCrouching)
  ) {
    dispatchMainSceneAction.call(this, MAIN_SCENE_ACTIONS.JUMP, { source: 'keyboard' });
  }
}

export function handleFiringInput() {
  const input = this.stateSlices?.input;
  if (this.keys.SPACE.isDown || (input?.touchFiring ?? this.isTouchFiring)) {
    if (this.keys.SPACE.isDown && (window.controlType === 'unknown' || window.controlType === 'touch')) {
      window.controlType = 'keyboard';
      window.trackEvent('control_type_detected', {
        type: 'keyboard',
        platform: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
      });
    }
    dispatchMainSceneAction.call(this, MAIN_SCENE_ACTIONS.FIRE, {
      source: this.keys.SPACE.isDown ? 'keyboard' : 'touch'
    });
  }
}
