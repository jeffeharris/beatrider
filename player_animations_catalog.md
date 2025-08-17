# Player Sprite Animation Catalog for Beatrider

## Overview
This document catalogs all animations and visual transformations that affect the player sprite in Beatrider. These need special consideration for multi-part characters (body + floating head + floating tail).

## 1. Idle Animation (Continuous)
**Location:** Lines 5753-5777
**Description:** Breathing and subtle wobble when stationary

### Parameters:
- **Breathing Phase:** `0.003` speed increment per ms
- **Breath Scale X:** `1 + sin(phase) * 0.03` (±3% variation)
- **Squish Scale Y:** `1 - cos(phase * 2) * 0.02` (±2% variation)
- **Wobble Physics:** 
  - Damping: `0.92`
  - Random impulses: 2% chance per frame
  - Force range: ±2 units

### Multi-part Considerations:
- Head should float with slight delay from body
- Tail should have secondary motion with more elasticity
- Breathing should affect body primarily, head/tail secondarily

## 2. Ground Movement (Jello Stretch)
**Location:** Lines 3844-3897, 3970-4023
**Description:** 4-phase stretchy movement with reactive wobble

### Phase 1: Anticipation Stretch
- **Duration:** 60ms
- **Scale X:** `0.6` (40% squash)
- **Scale Y:** `1.3` (30% stretch)
- **Easing:** Cubic.easeOut

### Phase 2: Slingshot
- **Duration:** 80ms
- **Scale X:** `1.5` (50% stretch)
- **Scale Y:** `0.8` (20% squash)
- **Position:** Overshoot by 10 units
- **Easing:** Power2

### Phase 3: Bounce Back
- **Duration:** 60ms
- **Scale X:** `0.9` (10% squash)
- **Scale Y:** `1.1` (10% stretch)
- **Position:** Bounce back 5 units
- **Easing:** Sine.easeInOut

### Phase 4: Settle
- **Duration:** 200ms
- **Final Scale:** `1.0, 1.0`
- **Easing:** Elastic.easeOut with [0.4, 0.3] params
- **Wobble Force:** ±12 units opposite to movement

### Multi-part Considerations:
- Head should lag behind body movement by ~20ms
- Tail should trail with spring physics
- Stretch phases should elongate the gaps between parts

## 3. Air Movement (Barrel Roll)
**Location:** Lines 3817-3842, 3943-3968
**Description:** Horizontal movement while jumping with spin

### Parameters:
- **Movement Duration:** 300ms
- **Barrel Roll:** ±720° rotation
- **Roll Duration:** 400ms
- **Scale Pulse:** 
  - X: 1.2 (20% expansion)
  - Y: 1.3 (30% expansion)
  - Duration: 150ms with yoyo
- **Easing:** Quad.easeOut (movement), Cubic.easeOut (spin)

### Multi-part Considerations:
- All parts should rotate together around shared center
- Head and tail should orbit the body during spin
- Scale pulse should affect spacing between parts

## 4. Dash Movement
**Location:** Lines 4228-4385, 4450-4607
**Description:** Ultra-fast lane switch with trail effects

### Parameters:
- **Duration:** 60ms
- **Trail Count:** 2 afterimages
- **Trail Alpha:** [0.5, 0.3]
- **Trail Fade:** 200ms
- **Recovery Bounce:**
  - Scale X: [0.7, 1.2, 1]
  - Scale Y: [1.3, 0.9, 1]
  - Duration: 120ms

### Multi-part Considerations:
- Create separate trails for each part
- Parts should compress together during dash
- Recovery bounce should create spring separation

## 5. Regular Jump
**Location:** Lines 4055-4153
**Description:** Standard vertical jump with rotation

### Parameters:
- **Jump Height:** 120 units
- **Duration:** 250ms up, 250ms down
- **Scale During Jump:**
  - X: 1.2 (20% expansion)
  - Y: 1.2 (20% expansion)
- **Rotation:** 360° over 500ms
- **Landing Recovery:** 200ms to reset angle

### Multi-part Considerations:
- Head should float higher during apex
- Tail should trail behind vertical movement
- Parts should spread during ascent, compress on landing

## 6. Super Jump (Charged)
**Location:** Lines 4637-4877
**Description:** Variable height jump with charge mechanics

### Charge Phase (Crouch):
- **Scale X:** 1.4 (40% expansion)
- **Scale Y:** 0.6 (40% compression)
- **Duration:** 100ms to enter crouch
- **Max Charge Time:** 1000ms

### Launch Preparation:
- **Initial Squash:** Scale(1.6, 0.3)
- **Stretch:** Scale(0.6-0.9, 1.3-2.1) based on charge
- **Duration:** 150ms

### Flight Phase:
- **Height Range:** 120-360 units
- **Duration:** 300-500ms based on charge
- **Wobble During Flight:**
  - Amplitude: 15% decreasing to 0
  - Frequency: 4 cycles
- **Spin:** 360-720° based on charge

### Landing Sequence:
1. **Impact:** Scale(2.0, 0.3)
2. **First Bounce:** 
   - Scale(0.7, 1.5)
   - Height: 20 units
   - Duration: 100ms
3. **Mini Landing:** Scale(1.3, 0.7)
4. **Final Settle:** Elastic to Scale(1, 1) over 400ms

### Multi-part Considerations:
- Charge should compress parts together
- Launch should create dramatic separation
- Landing bounces need synchronized but offset motion

## 7. Charge Glow Effect
**Location:** Lines 3414-3433, 6129-6146
**Description:** Visual feedback during jump charging

### Parameters:
- **Base Radius:** 30 units
- **Max Radius:** 80 units (at full charge)
- **Pulse Speed:** 10-30 Hz based on charge
- **Alpha Range:** 0.3-0.8
- **Color Interpolation:** Cyan (0x00ffcc) to Yellow (0xffff00)

### Multi-part Considerations:
- Glow should emanate from body center
- Head and tail should have secondary glows

## 8. Death/Hit Animation
**Location:** Lines 5287-5354
**Description:** Explosion effect with player hiding

### Parameters:
- **Player Visibility:** Hidden immediately
- **Explosion Stages:** 4 cascading explosions
- **Camera Shake:** 500ms at 0.02 intensity
- **Screen Flash:** 300ms red flash
- **Particle Count:** 25 initial, then 12, 8, 5
- **Particle Spread:** 100-200 units

### Multi-part Considerations:
- Parts should explode separately
- Head and tail should fly off in different directions

## 9. Invincibility Flash
**Location:** Lines 5265-5281
**Description:** Flashing effect after respawn

### Parameters:
- **Alpha Range:** 0.3 to 1.0
- **Flash Duration:** 100ms
- **Yoyo:** Continuous
- **Total Duration:** 2000ms

### Multi-part Considerations:
- All parts should flash in sync
- Consider slight phase offset for visual interest

## 10. Shooting Recoil
**Location:** Lines 5555-5566
**Description:** Small recoil when firing

### Parameters:
- **Scale X:** 0.9 (10% compression)
- **Scale Y:** 1.1 (10% stretch)
- **Duration:** 50ms with yoyo
- **Wobble Force Y:** +3 units

### Multi-part Considerations:
- Body should recoil most
- Head should bob slightly
- Tail should whip backward

## 11. Power-Up Collection
**Location:** Lines 6421-6435
**Description:** Excited bounce animation

### Parameters:
- **Wobble Force:** X: ±20, Y: -15
- **Bounce Scale X:** 1.4
- **Bounce Scale Y:** 0.7
- **Duration:** 150ms with yoyo

### Multi-part Considerations:
- Parts should briefly separate on collection
- Create celebratory wiggle in all parts

## Special States & Flags

### Movement States:
- `isMoving`: Currently in lane transition
- `isStretching`: In stretch phase (immune to collision)
- `isDashing`: Performing dash move
- `isJumping`: Currently airborne
- `isCrouching`: Charging for super jump

### Visual States:
- `isInvincible`: Flashing with alpha animation
- `isShowingGameOver`: Player hidden
- `playerCanControl`: Affects input response

### Physics Values:
- `wobbleVelocity`: {x, y} current wobble forces
- `idleWobblePhase`: Current breathing animation phase
- `wobbleDamping`: 0.92 decay rate

## Implementation Notes for Multi-Part Character

1. **Transform Hierarchy:** Consider parent-child relationships where body is parent, head/tail are children with offsets

2. **Animation Blending:** Multiple animations can overlap (e.g., idle breathing during movement)

3. **Depth Sorting:** Player depth is 500, ensure all parts maintain relative depths

4. **Trail System:** Each part needs its own trail points array

5. **Collision Box:** Only the body should have collision, head/tail are visual only

6. **Tween Management:** Use `tweens.killTweensOf()` on all parts when interrupting animations

7. **Scale Center:** All scaling should happen from character's center point, not individual part centers

8. **Recovery Animations:** Many moves have multi-stage recovery that must complete before next action

9. **Queue System:** Some animations can be queued while others are playing (e.g., charge while jumping)

10. **Force Accumulation:** Wobble forces stack and decay over time, creating organic motion