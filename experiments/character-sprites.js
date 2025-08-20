// Character Sprite System for Beatrider
// Feature-flagged character variations

const CHARACTER_SPRITES = {
  // Default square character
  default: {
    name: 'Default Square',
    createTexture: function(scene, size) {
      const gfx = scene.add.graphics();
      gfx.fillStyle(0x00ffcc, 1).fillRect(0, 0, size, size);
      gfx.generateTexture('playerTex', size, size);
      gfx.destroy();
      return 'playerTex';
    },
    
    createSprite: function(scene, x, y, size) {
      const sprite = scene.add.image(x, y, 'playerTex');
      sprite.w = size;
      sprite.h = size;
      sprite.setDepth(500);
      return sprite;
    },
    
    updateIdle: function(scene, sprite, time) {
      // Original idle animation
      if(!scene.isJumping && !scene.isCrouching && !scene.isStretching && !scene.tweens.isTweening(sprite)) {
        const breathe = Math.sin(time * 0.003) * 0.05;
        const squish = Math.cos(time * 0.004) * 0.03;
        const breathScale = 1 + breathe;
        const squishScale = 1 - squish;
        
        sprite.setScale(
          breathScale * (1 + (scene.wobbleVelocity?.x || 0) * 0.01),
          squishScale * (1 + (scene.wobbleVelocity?.y || 0) * 0.01)
        );
      }
    },
    
    onJump: function(scene, sprite) {
      // Standard jump squash
      sprite.setScale(1.2, 0.8);
    },
    
    onLand: function(scene, sprite) {
      // Standard landing squash
      sprite.setScale(1.5, 0.6);
    },
    
    trail: null // No special trail
  },
  
  // Cuboid Unicorn character
  unicorn: {
    name: 'Cuboid Unicorn',
    headSprite: null,
    hornSprite: null,
    tailSprite: null,
    leftFootSprite: null,
    rightFootSprite: null,
    noseSprite: null,
    maneSegments: [],
    sparkles: [],
    rainbowColors: [0xff0000, 0xff7f00, 0xffff00, 0x00ff00, 0x0000ff, 0x4b0082, 0x9400d3],
    wobbleVelocity: { 
      head: { x: 0, y: 0 }, 
      tail: { x: 0, y: 0 },
      leftFoot: { x: 0, y: 0 },
      rightFoot: { x: 0, y: 0 },
      mane: []  // Will hold velocity for each mane segment
    },
    wobbleDamping: 0.9,
    elasticStrength: 0.4, // Tighter connection for head
    elasticStrengthLoose: 0.15, // Looser for feet and tail
    
    createTexture: function(scene, size) {
      const gfx = scene.add.graphics();
      
      // Body texture (taller and skinnier)
      gfx.fillStyle(0xffffff, 1);
      gfx.fillRect(0, 0, size * 0.8, size * 1.2); // 80% width
      gfx.generateTexture('unicornBodyTex', size * 0.8, size * 1.2);
      gfx.clear();
      
      // Head texture - trapezoid (narrower at top for nose, wider at bottom for eyes)
      const headSize = size * 0.7;
      gfx.fillStyle(0xffffff, 1);
      // Draw trapezoid: narrower at top (nose), wider at bottom
      gfx.beginPath();
      gfx.moveTo(headSize * 0.3, 0); // Top left (narrow nose)
      gfx.lineTo(headSize * 0.7, 0); // Top right (narrow nose)
      gfx.lineTo(headSize * 0.9, headSize); // Bottom right (wide)
      gfx.lineTo(headSize * 0.1, headSize); // Bottom left (wide)
      gfx.closePath();
      gfx.fillPath();
      // Add eyes higher up (more forward, closer to nose)
      gfx.fillStyle(0x000000, 1);
      gfx.fillCircle(headSize * 0.3, headSize * 0.4, size * 0.04);
      gfx.fillCircle(headSize * 0.7, headSize * 0.4, size * 0.04);
      gfx.generateTexture('unicornHeadTex', headSize, headSize);
      gfx.clear();
      
      // Horn texture - skinny isosceles triangle (white so we can tint it)
      const hornWidth = size * 0.15;
      const hornHeight = size * 0.4;
      gfx.fillStyle(0xffffff, 1); // White horn for tinting
      gfx.fillTriangle(hornWidth/2, 0, 0, hornHeight, hornWidth, hornHeight);
      gfx.generateTexture('unicornHornTex', hornWidth, hornHeight);
      gfx.clear();
      
      // Ear texture - white triangle with grey border
      const earWidth = size * 0.15;  // Smaller
      const earHeight = size * 0.2;   // Smaller
      gfx.lineStyle(2, 0x808080, 1); // Grey border
      gfx.fillStyle(0xffffff, 1); // White fill
      gfx.fillTriangle(earWidth/2, 0, 0, earHeight, earWidth, earHeight);
      gfx.strokeTriangle(earWidth/2, 0, 0, earHeight, earWidth, earHeight);
      gfx.generateTexture('unicornEarTex', earWidth, earHeight);
      gfx.clear();
      
      // Front feet texture (small triangles)
      const footSize = size * 0.25;
      gfx.fillStyle(0xffffff, 1);
      gfx.fillTriangle(footSize/2, 0, 0, footSize, footSize, footSize);
      gfx.generateTexture('unicornFootTex', footSize, footSize);
      gfx.clear();
      
      // Tail texture (small rectangle)
      const tailSize = size * 0.35;
      gfx.fillStyle(0xffffff, 1);
      gfx.fillRect(0, 0, tailSize * 0.6, tailSize);
      gfx.generateTexture('unicornTailTex', tailSize * 0.6, tailSize);
      gfx.clear();
      
      // Nose texture - light pink oval with two nostril dots
      const noseWidth = size * 0.2;
      const noseHeight = size * 0.15;
      gfx.fillStyle(0xffb3d9, 1); // Light pink
      gfx.fillEllipse(noseWidth/2, noseHeight/2, noseWidth/2, noseHeight/2);
      // Add nostrils
      gfx.fillStyle(0xff69b4, 1); // Darker pink for nostrils
      gfx.fillCircle(noseWidth * 0.35, noseHeight * 0.5, size * 0.015);
      gfx.fillCircle(noseWidth * 0.65, noseHeight * 0.5, size * 0.015);
      gfx.generateTexture('unicornNoseTex', noseWidth, noseHeight);
      gfx.clear();
      
      // Mane segment texture - yarn-like strands
      const maneWidth = size * 0.12;
      const maneHeight = size * 0.25;
      // Create yarn-like texture with multiple thin strands
      gfx.lineStyle(2, 0xffb3d9, 0.8); // Light pink with slight transparency
      for(let i = 0; i < 5; i++) {
        const x = (i + 0.5) * (maneWidth / 5);
        // Wavy line for yarn texture
        gfx.beginPath();
        gfx.moveTo(x, 0);
        for(let y = 0; y <= maneHeight; y += 5) {
          const wobble = Math.sin(y * 0.3 + i) * 2;
          gfx.lineTo(x + wobble, y);
        }
        gfx.strokePath();
      }
      gfx.generateTexture('unicornManeTex', maneWidth, maneHeight);
      gfx.destroy();
      
      return 'unicornBodyTex';
    },
    
    createSprite: function(scene, x, y, size) {
      // Create body (skinnier)
      const body = scene.add.image(x, y, 'unicornBodyTex');
      body.w = size * 0.8; // Match the skinnier width
      body.h = size * 1.2;
      body.setDepth(500);
      
      // Create floating head (trapezoid)
      const headSize = size * 0.7;
      this.headSprite = scene.add.image(x, y - size * 0.7, 'unicornHeadTex');  // Slightly further from body
      this.headSprite.setDepth(501);
      
      // Create nose on the narrow top part of the head
      const noseWidth = size * 0.2;
      const noseHeight = size * 0.15;
      this.noseSprite = scene.add.image(x, y - size * 0.95, 'unicornNoseTex'); // At the top/front of head
      this.noseSprite.setDepth(504); // In front of head
      
      // Create horn between eyes (moved back towards body)
      const hornWidth = size * 0.15;
      const hornHeight = size * 0.4;
      this.hornSprite = scene.add.image(x, y - size * 0.7, 'unicornHornTex');  // Further back
      this.hornSprite.setDepth(510);  // Highest depth - on top of everything including mane
      this.hornSprite.setTint(0xffd700);
      
      // Create ears on either side of horn (on top of head)
      const earWidth = size * 0.15;
      const earHeight = size * 0.2;
      this.leftEarSprite = scene.add.image(x - size * 0.15, y - size * 0.7, 'unicornEarTex');  // Match horn position
      this.leftEarSprite.setDepth(503); // Above head (501) and horn (502)
      
      this.rightEarSprite = scene.add.image(x + size * 0.15, y - size * 0.7, 'unicornEarTex');  // Match horn position
      this.rightEarSprite.setDepth(503); // Above head (501) and horn (502)
      
      // Create front feet (wider spacing so visible under body)
      const footSize = size * 0.25;
      this.leftFootSprite = scene.add.image(x - size * 0.4, y - size * 0.4, 'unicornFootTex');
      this.leftFootSprite.setDepth(498);
      this.leftFootSprite.setTint(0xffffff);
      
      this.rightFootSprite = scene.add.image(x + size * 0.4, y - size * 0.4, 'unicornFootTex');
      this.rightFootSprite.setDepth(498);
      this.rightFootSprite.setTint(0xffffff);
      
      // Create simple floating tail
      const tailSize = size * 0.35;
      this.tailSprite = scene.add.image(x, y + size * 0.5, 'unicornTailTex');  // Closer to body
      this.tailSprite.setDepth(499); // Behind body
      // White tail by default (no tint needed since texture is white)
      
      // Create mane segments along the back of the head
      this.maneSegments = [];
      const maneCount = 4; // Number of mane segments
      for(let i = 0; i < maneCount; i++) {
        const maneSegment = scene.add.image(
          x - size * 0.05, // Slightly behind center
          y - size * 0.65 + i * size * 0.08, // Cascade down from head
          'unicornManeTex'
        );
        maneSegment.setDepth(505 + i); // Layer on top - higher than nose (504)
        maneSegment.setAlpha(0.9); // Slight transparency for yarn effect
        maneSegment.angle = (Math.random() - 0.5) * 10; // Random slight rotation
        this.maneSegments.push(maneSegment);
        
        // Initialize wobble velocity for this segment
        this.wobbleVelocity.mane.push({ x: 0, y: 0 });
      }
      
      // Store references
      body.unicornHead = this.headSprite;
      body.unicornHorn = this.hornSprite;
      body.unicornNose = this.noseSprite;
      body.unicornLeftEar = this.leftEarSprite;
      body.unicornRightEar = this.rightEarSprite;
      body.unicornTail = this.tailSprite;
      body.unicornLeftFoot = this.leftFootSprite;
      body.unicornRightFoot = this.rightFootSprite;
      body.unicornMane = this.maneSegments;
      
      // Initialize sparkle particles
      this.sparkles = [];
      
      return body;
    },
    
    updateIdle: function(scene, sprite, time) {
      // Update wobble physics with damping
      this.wobbleVelocity.head.x *= this.wobbleDamping;
      this.wobbleVelocity.head.y *= this.wobbleDamping;
      this.wobbleVelocity.tail.x *= this.wobbleDamping;
      this.wobbleVelocity.tail.y *= this.wobbleDamping;
      this.wobbleVelocity.leftFoot.x *= this.wobbleDamping;
      this.wobbleVelocity.leftFoot.y *= this.wobbleDamping;
      this.wobbleVelocity.rightFoot.x *= this.wobbleDamping;
      this.wobbleVelocity.rightFoot.y *= this.wobbleDamping;
      
      // Body idle animation with enhanced breathing
      if(!scene.isJumping && !scene.isCrouching && !scene.isStretching && !scene.tweens.isTweening(sprite)) {
        const breathe = Math.sin(time * 0.003) * 0.05;
        const squish = Math.cos(time * 0.004) * 0.03;
        const wobbleX = (scene.wobbleVelocity?.x || 0) * 0.01;
        const wobbleY = (scene.wobbleVelocity?.y || 0) * 0.01;
        sprite.setScale(
          (1 + breathe) * (1 + wobbleX),
          (1 - squish) * (1 + wobbleY)
        );
      }
      
      // Head position with tight elastic connection and leash
      if(sprite.unicornHead) {
        const targetHeadY = sprite.y - sprite.h * 0.7;  // Slightly further from body
        const targetHeadX = sprite.x;
        
        // Calculate distance
        const headDx = targetHeadX - sprite.unicornHead.x;
        const headDy = targetHeadY - sprite.unicornHead.y;
        const distance = Math.sqrt(headDx * headDx + headDy * headDy);
        
        // Maximum leash distance (very tight for head)
        const maxLeash = 10;
        
        if(distance > maxLeash) {
          // Snap closer if too far
          const ratio = maxLeash / distance;
          sprite.unicornHead.x = targetHeadX - headDx * ratio;
          sprite.unicornHead.y = targetHeadY - headDy * ratio;
          // Reset velocity when snapping
          this.wobbleVelocity.head.x *= 0.5;
          this.wobbleVelocity.head.y *= 0.5;
        } else {
          // Normal elastic behavior within leash
          const maxForce = 2;
          let forceX = headDx * this.elasticStrength;
          let forceY = headDy * this.elasticStrength;
          forceX = Math.max(-maxForce, Math.min(maxForce, forceX));
          forceY = Math.max(-maxForce, Math.min(maxForce, forceY));
          
          this.wobbleVelocity.head.x += forceX;
          this.wobbleVelocity.head.y += forceY;
          
          // Update position with velocity
          sprite.unicornHead.x += this.wobbleVelocity.head.x;
          sprite.unicornHead.y += this.wobbleVelocity.head.y;
        }
        
        // Very subtle idle floating
        if(!scene.isJumping && !scene.tweens.isTweening(sprite)) {
          const floatY = Math.sin(time * 0.002) * 1; // Much smaller float
          const floatX = Math.cos(time * 0.0015) * 0.5;
          sprite.unicornHead.y += floatY;
          sprite.unicornHead.x += floatX;
          sprite.unicornHead.angle = Math.sin(time * 0.001) * 2; // Less rotation
        }
        
        // Nose follows head (at the narrow front/top)
        if(sprite.unicornNose) {
          sprite.unicornNose.x = sprite.unicornHead.x;
          sprite.unicornNose.y = sprite.unicornHead.y - sprite.h * 0.25; // At top of head
          sprite.unicornNose.angle = sprite.unicornHead.angle * 0.5;
          // Subtle breathing animation for nose
          const breathe = Math.sin(time * 0.004) * 0.02;
          sprite.unicornNose.setScale(1 + breathe, 1 - breathe);
        }
        
        // Horn follows head (between eyes, closer to body)
        if(sprite.unicornHorn) {
          sprite.unicornHorn.x = sprite.unicornHead.x;
          sprite.unicornHorn.y = sprite.unicornHead.y; // At head level, further back
          sprite.unicornHorn.angle = sprite.unicornHead.angle * 0.3;
          // Don't override tint if powered up
          if(!sprite.isPoweredUp) {
            sprite.unicornHorn.setTint(0xffd700);
          }
        }
        
        // Ears follow head position (back near horn, moderate spacing)
        if(sprite.unicornLeftEar) {
          sprite.unicornLeftEar.x = sprite.unicornHead.x - sprite.w * 0.225;  // Halfway back in
          sprite.unicornLeftEar.y = sprite.unicornHead.y + sprite.h * 0.15; // Further back on head
          // Don't override angle if powered up
          if(!sprite.isPoweredUp) {
            sprite.unicornLeftEar.angle = sprite.unicornHead.angle * 0.5 - 10;
          }
        }
        
        if(sprite.unicornRightEar) {
          sprite.unicornRightEar.x = sprite.unicornHead.x + sprite.w * 0.225;  // Halfway back in
          sprite.unicornRightEar.y = sprite.unicornHead.y + sprite.h * 0.15; // Further back on head
          // Don't override angle if powered up
          if(!sprite.isPoweredUp) {
            sprite.unicornRightEar.angle = sprite.unicornHead.angle * 0.5 + 10;
          }
        }
      }
      
      // Tail with elastic connection and leash
      if(sprite.unicornTail) {
        const targetTailY = sprite.y + sprite.h * 0.5;  // Closer to body
        const targetTailX = sprite.x;
        
        const tailDx = targetTailX - sprite.unicornTail.x;
        const tailDy = targetTailY - sprite.unicornTail.y;
        const distance = Math.sqrt(tailDx * tailDx + tailDy * tailDy);
        
        // Slightly longer leash for tail
        const maxLeash = 15;
        
        if(distance > maxLeash) {
          // Snap closer if too far
          const ratio = maxLeash / distance;
          sprite.unicornTail.x = targetTailX - tailDx * ratio;
          sprite.unicornTail.y = targetTailY - tailDy * ratio;
          this.wobbleVelocity.tail.x *= 0.5;
          this.wobbleVelocity.tail.y *= 0.5;
        } else {
          // Normal elastic behavior
          const maxTailForce = 1.5;
          let tailForceX = tailDx * this.elasticStrengthLoose;
          let tailForceY = tailDy * this.elasticStrengthLoose;
          tailForceX = Math.max(-maxTailForce, Math.min(maxTailForce, tailForceX));
          tailForceY = Math.max(-maxTailForce, Math.min(maxTailForce, tailForceY));
          
          this.wobbleVelocity.tail.x += tailForceX;
          this.wobbleVelocity.tail.y += tailForceY;
          
          // Update position
          sprite.unicornTail.x += this.wobbleVelocity.tail.x;
          sprite.unicornTail.y += this.wobbleVelocity.tail.y;
        }
        
        // Add floating opposite to head
        if(!scene.isJumping && !scene.tweens.isTweening(sprite)) {
          const floatY = Math.sin(time * 0.002 + Math.PI) * 4;
          const floatX = Math.cos(time * 0.0015 + Math.PI) * 2;
          sprite.unicornTail.y += floatY;
          sprite.unicornTail.x += floatX;
        }
        
        // Keep tail white unless powered up (tint handled in onPowerUp/onPowerDown)
        if(!sprite.isPoweredUp) {
          sprite.unicornTail.clearTint(); // Ensure tail stays white when not powered up
        }
      }
      
      // Mane segments - tightly anchored but wavy
      if(sprite.unicornMane && sprite.unicornMane.length > 0) {
        sprite.unicornMane.forEach((segment, i) => {
          // Mane segments stay anchored to head position
          if(sprite.unicornHead) {
            // Base position directly behind and below head, cascading down
            const baseX = sprite.unicornHead.x - sprite.w * 0.05;
            const baseY = sprite.unicornHead.y + sprite.h * 0.05 + i * sprite.h * 0.08;
            
            // Add wavy motion while staying anchored
            const waveX = Math.sin(time * 0.004 + i * 0.8) * 4; // Side-to-side wave
            const waveY = Math.cos(time * 0.003 + i * 0.6) * 2; // Gentle vertical bob
            
            // Position with wave offset from base
            segment.x = baseX + waveX;
            segment.y = baseY + waveY;
            
            // More dynamic angle changes
            const baseAngle = sprite.unicornHead.angle * 0.3;
            const waveAngle = Math.sin(time * 0.005 + i * 0.7) * 8; // Bigger angle variation
            segment.angle = baseAngle + waveAngle + i * 3;
            
            // Scale breathing for more life
            const scaleWave = 1 + Math.sin(time * 0.002 + i * 0.4) * 0.05;
            segment.setScale(scaleWave, 1);
          }
        });
      }
      
      // Front feet with elastic connections and galloping motion
      if(sprite.unicornLeftFoot && sprite.unicornRightFoot) {
        const targetFootY = sprite.y - sprite.h * 0.4; // At the front/top
        const leftTargetX = sprite.x - sprite.w * 0.4; // Wider spacing
        const rightTargetX = sprite.x + sprite.w * 0.4; // Wider spacing
        
        // Left foot with leash
        const leftDx = leftTargetX - sprite.unicornLeftFoot.x;
        const leftDy = targetFootY - sprite.unicornLeftFoot.y;
        const leftDistance = Math.sqrt(leftDx * leftDx + leftDy * leftDy);
        
        const maxFootLeash = 12;
        
        if(leftDistance > maxFootLeash) {
          const ratio = maxFootLeash / leftDistance;
          sprite.unicornLeftFoot.x = leftTargetX - leftDx * ratio;
          sprite.unicornLeftFoot.y = targetFootY - leftDy * ratio;
          this.wobbleVelocity.leftFoot.x *= 0.5;
          this.wobbleVelocity.leftFoot.y *= 0.5;
        } else {
          const maxFootForce = 1.2;
          let leftForceX = leftDx * this.elasticStrengthLoose;
          let leftForceY = leftDy * this.elasticStrengthLoose;
          leftForceX = Math.max(-maxFootForce, Math.min(maxFootForce, leftForceX));
          leftForceY = Math.max(-maxFootForce, Math.min(maxFootForce, leftForceY));
          
          this.wobbleVelocity.leftFoot.x += leftForceX;
          this.wobbleVelocity.leftFoot.y += leftForceY;
        }
        
        // Right foot with leash
        const rightDx = rightTargetX - sprite.unicornRightFoot.x;
        const rightDy = targetFootY - sprite.unicornRightFoot.y;
        const rightDistance = Math.sqrt(rightDx * rightDx + rightDy * rightDy);
        
        if(rightDistance > maxFootLeash) {
          const ratio = maxFootLeash / rightDistance;
          sprite.unicornRightFoot.x = rightTargetX - rightDx * ratio;
          sprite.unicornRightFoot.y = targetFootY - rightDy * ratio;
          this.wobbleVelocity.rightFoot.x *= 0.5;
          this.wobbleVelocity.rightFoot.y *= 0.5;
        } else {
          const maxFootForce = 1.2;
          let rightForceX = rightDx * this.elasticStrengthLoose;
          let rightForceY = rightDy * this.elasticStrengthLoose;
          rightForceX = Math.max(-maxFootForce, Math.min(maxFootForce, rightForceX));
          rightForceY = Math.max(-maxFootForce, Math.min(maxFootForce, rightForceY));
          
          this.wobbleVelocity.rightFoot.x += rightForceX;
          this.wobbleVelocity.rightFoot.y += rightForceY;
        }
        
        // Update positions
        sprite.unicornLeftFoot.x += this.wobbleVelocity.leftFoot.x;
        sprite.unicornLeftFoot.y += this.wobbleVelocity.leftFoot.y;
        sprite.unicornRightFoot.x += this.wobbleVelocity.rightFoot.x;
        sprite.unicornRightFoot.y += this.wobbleVelocity.rightFoot.y;
        
        // Galloping animation when moving
        if(scene.isMoving || scene.isDashing) {
          const gallop = time * 0.015;
          sprite.unicornLeftFoot.y += Math.sin(gallop) * 5;
          sprite.unicornRightFoot.y += Math.sin(gallop + Math.PI) * 5; // Opposite phase
          sprite.unicornLeftFoot.angle = Math.sin(gallop) * 15;
          sprite.unicornRightFoot.angle = Math.sin(gallop + Math.PI) * 15;
        } else {
          // Gentle idle animation
          sprite.unicornLeftFoot.y += Math.sin(time * 0.003) * 2;
          sprite.unicornRightFoot.y += Math.sin(time * 0.003 + Math.PI/2) * 2;
          sprite.unicornLeftFoot.angle = Math.sin(time * 0.002) * 5;
          sprite.unicornRightFoot.angle = Math.sin(time * 0.002 + Math.PI/2) * 5;
        }
      }
    },
    
    onJump: function(scene, sprite, isSuper = false) {
      // Body animation based on jump type
      if(isSuper) {
        // Super jump: extreme squash then stretch
        sprite.setScale(1.6, 0.3);
        scene.tweens.add({
          targets: sprite,
          scaleX: 0.6,
          scaleY: 1.8,
          duration: 300,
          ease: 'Power2',
          onComplete: () => {
            // 720 degree rotation for super jump
            scene.tweens.add({
              targets: sprite,
              angle: 720,
              duration: 1000,
              ease: 'Quad.easeOut'
            });
          }
        });
        
        // Apply strong wobble forces
        this.wobbleVelocity.head.y = -25;
        this.wobbleVelocity.tail.y = 20;
        // Mane stays attached - no wobble forces needed
      } else {
        // Regular jump: 360 rotation
        sprite.setScale(0.8, 1.4);
        scene.tweens.add({
          targets: sprite,
          angle: '+=360',
          duration: 600,
          ease: 'Quad.easeOut'
        });
        
        // Apply moderate wobble forces
        this.wobbleVelocity.head.y = -10;
        this.wobbleVelocity.tail.y = 8;
        // Mane stays attached - no wobble forces needed
      }
      
      // Head reaction
      if(sprite.unicornHead) {
        sprite.unicornHead.setScale(1.2, 0.8);
        scene.tweens.add({
          targets: sprite.unicornHead,
          scaleX: 1,
          scaleY: 1,
          angle: isSuper ? 180 : 90,
          duration: isSuper ? 400 : 200,
          ease: 'Elastic.easeOut',
          onComplete: () => {
            scene.tweens.add({
              targets: sprite.unicornHead,
              angle: 0,
              duration: 300,
              ease: 'Back.easeOut'
            });
          }
        });
      }
      
      // Tail reaction - opposite direction
      if(sprite.unicornTail) {
        scene.tweens.add({
          targets: sprite.unicornTail,
          angle: isSuper ? 45 : -15,
          scaleX: 0.7,
          scaleY: 1.5,
          duration: isSuper ? 400 : 200,
          ease: 'Back.easeOut',
          yoyo: true
        });
      }
      
      // Create rainbow sparkles
      this.createSparkles(scene, sprite.x, sprite.y, isSuper);
    },
    
    onLand: function(scene, sprite, isSuper = false) {
      if(isSuper) {
        // Multi-bounce landing sequence
        sprite.setScale(2, 0.3);
        this.wobbleVelocity.head.y = 15;
        this.wobbleVelocity.tail.y = -12;
        
        // First bounce
        scene.tweens.add({
          targets: sprite,
          scaleX: 0.8,
          scaleY: 1.3,
          y: sprite.y - 30,
          duration: 150,
          ease: 'Quad.easeOut',
          yoyo: true,
          onComplete: () => {
            // Second smaller bounce
            sprite.setScale(1.3, 0.7);
            scene.tweens.add({
              targets: sprite,
              scaleX: 1,
              scaleY: 1,
              y: sprite.y - 10,
              duration: 100,
              ease: 'Quad.easeOut',
              yoyo: true
            });
          }
        });
      } else {
        // Regular landing
        sprite.setScale(1.5, 0.6);
        scene.tweens.add({
          targets: sprite,
          scaleX: 1,
          scaleY: 1,
          duration: 200,
          ease: 'Elastic.easeOut'
        });
        
        this.wobbleVelocity.head.y = 8;
        this.wobbleVelocity.tail.y = -6;
      }
      
      // Head bounce reaction
      if(sprite.unicornHead) {
        sprite.unicornHead.setScale(1.4, 0.6);
        scene.tweens.add({
          targets: sprite.unicornHead,
          scaleX: 1,
          scaleY: 1,
          angle: 0,
          duration: isSuper ? 500 : 300,
          ease: 'Bounce.easeOut'
        });
      }
      
      // Tail spring reaction
      if(sprite.unicornTail) {
        sprite.unicornTail.setScale(1.5, 0.5);
        scene.tweens.add({
          targets: sprite.unicornTail,
          scaleX: 1,
          scaleY: 1,
          angle: 0,
          duration: isSuper ? 600 : 400,
          ease: 'Elastic.easeOut'
        });
      }
      
      // Reset sprite angle after landing
      scene.tweens.add({
        targets: sprite,
        angle: 0,
        duration: 200,
        ease: 'Cubic.easeOut'
      });
      
      // Burst of sparkles
      this.createSparkles(scene, sprite.x, sprite.y, true);
    },
    
    onMove: function(scene, sprite, fromX, toX) {
      // 4-phase jello movement animation
      const distance = Math.abs(toX - fromX);
      const direction = toX > fromX ? 1 : -1;
      
      // Phase 1: Initial stretch
      sprite.setScale(1.3, 0.7);
      sprite.angle = direction * 5;
      
      // Apply wobble forces
      this.wobbleVelocity.head.x = -direction * 8;
      this.wobbleVelocity.tail.x = direction * 6;
      
      // Phase 2-4: Animated with tweens
      scene.tweens.add({
        targets: sprite,
        scaleX: 0.8,
        scaleY: 1.2,
        angle: -direction * 3,
        duration: 50,
        ease: 'Linear',
        onComplete: () => {
          // Phase 3
          scene.tweens.add({
            targets: sprite,
            scaleX: 1.1,
            scaleY: 0.9,
            angle: direction * 2,
            duration: 50,
            ease: 'Linear',
            onComplete: () => {
              // Phase 4: settle
              scene.tweens.add({
                targets: sprite,
                scaleX: 1,
                scaleY: 1,
                angle: 0,
                duration: 50,
                ease: 'Back.easeOut'
              });
            }
          });
        }
      });
      
      // Create rainbow trail during movement
      this.createRainbowTrail(scene, fromX, sprite.y);
    },
    
    onPowerUp: function(scene, sprite) {
      sprite.isPoweredUp = true;
      
      // Make horn cycle through rainbow colors
      if(sprite.unicornHorn) {
        let hornColorIndex = 0;
        sprite.unicornHorn.rainbowInterval = scene.time.addEvent({
          delay: 100,
          loop: true,
          callback: () => {
            sprite.unicornHorn.setTint(this.rainbowColors[hornColorIndex]);
            hornColorIndex = (hornColorIndex + 1) % this.rainbowColors.length;
          }
        });
      }
      
      // Make ears perk up
      if(sprite.unicornLeftEar) {
        sprite.unicornLeftEar.angle = -20; // More upright
        sprite.unicornLeftEar.setTint(0xffffcc); // Slight glow
      }
      if(sprite.unicornRightEar) {
        sprite.unicornRightEar.angle = 20; // More upright
        sprite.unicornRightEar.setTint(0xffffcc); // Slight glow
      }
      
      // Make tail rainbow colored (synced with horn)
      if(sprite.unicornTail) {
        let tailColorIndex = 2; // Start at different color for variety
        sprite.unicornTail.rainbowInterval = scene.time.addEvent({
          delay: 100,
          loop: true,
          callback: () => {
            sprite.unicornTail.setTint(this.rainbowColors[tailColorIndex]);
            tailColorIndex = (tailColorIndex + 1) % this.rainbowColors.length;
          }
        });
      }
      
      // Create continuous rainbow sparkle trail from tail
      // Clear any existing interval first
      if(sprite.sparkleInterval) {
        sprite.sparkleInterval.destroy();
      }
      
      sprite.sparkleInterval = scene.time.addEvent({
        delay: 30,  // Even more frequent for denser trail
        loop: true,
        callback: () => {
          if(sprite.unicornTail) {
            // Emit sparkles from tail position
            const tailX = sprite.unicornTail.x;
            const tailY = sprite.unicornTail.y;
            
            // Create multiple small sparkles for trail effect
            for(let i = 0; i < 5; i++) {
              const sparkle = scene.add.graphics();
              sparkle.x = tailX + (Math.random() - 0.5) * 10;
              sparkle.y = tailY + (Math.random() - 0.5) * 10;
              
              // Random rainbow color
              const color = this.rainbowColors[Math.floor(Math.random() * this.rainbowColors.length)];
              sparkle.fillStyle(color, 1);
              
              // Small sparkle shape
              const size = 2 + Math.random() * 3;
              sparkle.fillCircle(0, 0, size);
              
              // Animate sparkle falling and fading
              scene.tweens.add({
                targets: sparkle,
                alpha: 0,
                scale: 0.5,
                y: sparkle.y + 30 + Math.random() * 20,
                x: sparkle.x + (Math.random() - 0.5) * 20,
                duration: 800 + Math.random() * 400,
                ease: 'Cubic.easeOut',
                onComplete: () => sparkle.destroy()
              });
            }
          }
        }
      });
    },
    
    onPowerDown: function(scene, sprite) {
      sprite.isPoweredUp = false;
      
      // Reset horn to normal gold
      if(sprite.unicornHorn) {
        if(sprite.unicornHorn.rainbowInterval) {
          sprite.unicornHorn.rainbowInterval.destroy();
          sprite.unicornHorn.rainbowInterval = null;
        }
        sprite.unicornHorn.setTint(0xffd700); // Back to gold
      }
      
      // Reset ears
      if(sprite.unicornLeftEar) {
        sprite.unicornLeftEar.angle = -10; // Normal angle
        sprite.unicornLeftEar.clearTint();
      }
      if(sprite.unicornRightEar) {
        sprite.unicornRightEar.angle = 10; // Normal angle
        sprite.unicornRightEar.clearTint();
      }
      
      // Reset tail to white
      if(sprite.unicornTail) {
        if(sprite.unicornTail.rainbowInterval) {
          sprite.unicornTail.rainbowInterval.destroy();
          sprite.unicornTail.rainbowInterval = null;
        }
        sprite.unicornTail.clearTint(); // Back to white
      }
      
      // Stop sparkle burst
      if(sprite.sparkleInterval) {
        sprite.sparkleInterval.destroy();
        sprite.sparkleInterval = null; // Clear the reference
      }
    },
    
    createSparkles: function(scene, x, y, burst = false) {
      const count = burst ? 8 : 3;
      for(let i = 0; i < count; i++) {
        const sparkle = scene.add.graphics();
        sparkle.x = x + (Math.random() - 0.5) * 30;
        sparkle.y = y + (Math.random() - 0.5) * 30;
        
        const color = this.rainbowColors[Math.floor(Math.random() * this.rainbowColors.length)];
        sparkle.fillStyle(color, 1);
        
        // Create a star shape manually
        const size = 3 + Math.random() * 3;
        const points = [];
        const spikes = 4;
        for(let j = 0; j < spikes * 2; j++) {
          const angle = (j * Math.PI) / spikes;
          const radius = j % 2 === 0 ? size : size / 2;
          points.push(Math.cos(angle) * radius);
          points.push(Math.sin(angle) * radius);
        }
        sparkle.fillPoints(points, true);
        
        // Animate sparkle
        scene.tweens.add({
          targets: sparkle,
          alpha: 0,
          scale: burst ? 2 : 1.5,
          y: sparkle.y - (burst ? 50 : 30),
          duration: burst ? 800 : 600,
          ease: 'Cubic.easeOut',
          onComplete: () => sparkle.destroy()
        });
        
        // Rotation
        scene.tweens.add({
          targets: sparkle,
          angle: 360,
          duration: burst ? 800 : 600,
          ease: 'Linear'
        });
      }
    },
    
    createRainbowTrail: function(scene, x, y) {
      const trailCount = 5;
      for(let i = 0; i < trailCount; i++) {
        const delay = i * 30;
        scene.time.delayedCall(delay, () => {
          const trail = scene.add.graphics();
          trail.x = x;
          trail.y = y - i * 5;
          
          const color = this.rainbowColors[i % this.rainbowColors.length];
          trail.fillStyle(color, 0.6);
          trail.fillRect(-10, -10, 20, 20);
          
          scene.tweens.add({
            targets: trail,
            alpha: 0,
            scale: 0.5,
            duration: 500,
            ease: 'Cubic.easeOut',
            onComplete: () => trail.destroy()
          });
        });
      }
    },
    
    onDash: function(scene, sprite, fromX, toX) {
      const direction = toX > fromX ? 1 : -1;
      
      // Ultra-fast movement with barrel roll
      sprite.setScale(0.6, 1.4);
      sprite.angle = direction * 15;
      
      // Strong wobble forces
      this.wobbleVelocity.head.x = -direction * 15;
      this.wobbleVelocity.head.y = 5;
      this.wobbleVelocity.tail.x = direction * 12;
      this.wobbleVelocity.tail.y = -5;
      
      // Create trail copies
      for(let i = 0; i < 3; i++) {
        const trail = scene.add.image(fromX - (direction * i * 20), sprite.y, 'unicornBodyTex');
        trail.setAlpha(0.5 - i * 0.15);
        trail.setTint(0x00ffff);
        trail.setScale(sprite.scaleX * (1 - i * 0.1), sprite.scaleY * (1 - i * 0.1));
        trail.angle = sprite.angle * (1 - i * 0.3);
        
        // Also create head/tail trails
        if(sprite.unicornHead && i < 2) {
          const headTrail = scene.add.image(sprite.unicornHead.x - (direction * i * 20), sprite.unicornHead.y, 'unicornHeadTex');
          headTrail.setAlpha(0.3 - i * 0.15);
          headTrail.setTint(this.rainbowColors[(i * 2) % this.rainbowColors.length]);
          headTrail.setScale(0.9);
          
          scene.tweens.add({
            targets: headTrail,
            alpha: 0,
            scale: 0.5,
            duration: 400,
            onComplete: () => headTrail.destroy()
          });
        }
        
        scene.tweens.add({
          targets: trail,
          alpha: 0,
          scaleY: 0.1,
          x: trail.x - direction * 30,
          duration: 500,
          delay: i * 50,
          ease: 'Power2',
          onComplete: () => trail.destroy()
        });
      }
      
      // Recovery animation
      scene.tweens.add({
        targets: sprite,
        scaleX: 1.2,
        scaleY: 0.8,
        angle: -direction * 5,
        duration: 100,
        ease: 'Power2',
        onComplete: () => {
          scene.tweens.add({
            targets: sprite,
            scaleX: 1,
            scaleY: 1,
            angle: 0,
            duration: 200,
            ease: 'Elastic.easeOut'
          });
        }
      });
      
      // Head and horn reaction
      if(sprite.unicornHead) {
        scene.tweens.add({
          targets: sprite.unicornHead,
          angle: direction * 360,
          duration: 300,
          ease: 'Power2'
        });
      }
      
      if(sprite.unicornHorn) {
        sprite.unicornHorn.setScale(1.5);
        scene.tweens.add({
          targets: sprite.unicornHorn,
          scale: 1,
          duration: 300,
          ease: 'Elastic.easeOut'
        });
      }
      
      // Tail whip
      if(sprite.unicornTail) {
        scene.tweens.add({
          targets: sprite.unicornTail,
          angle: -direction * 45,
          scaleX: 1.5,
          duration: 100,
          ease: 'Power2',
          yoyo: true
        });
      }
      
      // Rainbow burst
      this.createSparkles(scene, fromX, sprite.y, true);
    },
    
    onCharge: function(scene, sprite, chargeAmount) {
      // Crouch animation for charging
      const squashAmount = 1 + chargeAmount * 0.3;
      const stretchAmount = 1 - chargeAmount * 0.2;
      sprite.setScale(squashAmount, stretchAmount);
      
      // Head dips down
      if(sprite.unicornHead) {
        sprite.unicornHead.y = sprite.y - sprite.h * 0.8 + (chargeAmount * 10);
        sprite.unicornHead.setScale(1 + chargeAmount * 0.1, 1 - chargeAmount * 0.1);
      }
      
      // Tail rises up
      if(sprite.unicornTail) {
        sprite.unicornTail.y = sprite.y + sprite.h * 0.8 - (chargeAmount * 8);
        sprite.unicornTail.angle = chargeAmount * 20;
      }
      
      // Build wobble tension
      this.wobbleVelocity.head.y = -chargeAmount * 20;
      this.wobbleVelocity.tail.y = chargeAmount * 15;
    },
    
    onShoot: function(scene, sprite) {
      // Shooting recoil animation
      sprite.setScale(0.9, 1.1);
      scene.tweens.add({
        targets: sprite,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
        ease: 'Back.easeOut'
      });
      
      // Head kicks back
      if(sprite.unicornHead) {
        this.wobbleVelocity.head.y = -3;
        this.wobbleVelocity.head.x = Math.random() * 2 - 1;
      }
      
      // Horn flashes white then back to gold (unless powered up)
      if(sprite.unicornHorn && !sprite.isPoweredUp) {
        sprite.unicornHorn.setTint(0xffffff);
        scene.time.delayedCall(50, () => {
          sprite.unicornHorn.setTint(0xffd700); // Back to gold
        });
      }
    },
    
    
    onDestroy: function(scene, sprite) {
      // Particle dispersion death animation
      const parts = [
        { sprite: sprite.unicornHead, delay: 0 },
        { sprite: sprite.unicornNose, delay: 25 },
        { sprite: sprite.unicornHorn, delay: 50 },
        { sprite: sprite.unicornLeftEar, delay: 100 },
        { sprite: sprite.unicornRightEar, delay: 100 },
        { sprite: sprite.unicornLeftFoot, delay: 150 },
        { sprite: sprite.unicornRightFoot, delay: 150 },
        { sprite: sprite.unicornTail, delay: 200 },
        { sprite: sprite, delay: 250 } // Body last
      ];
      
      // Add mane segments to parts list
      if(sprite.unicornMane) {
        sprite.unicornMane.forEach((segment, i) => {
          parts.push({ sprite: segment, delay: 75 + i * 25 });
        });
      }
      
      parts.forEach(({ sprite: part, delay }) => {
        if(!part) return;
        
        // Create sparkle explosion at part location
        for(let i = 0; i < 5; i++) {
          const sparkle = scene.add.graphics();
          sparkle.x = part.x;
          sparkle.y = part.y;
          sparkle.fillStyle(this.rainbowColors[Math.floor(Math.random() * this.rainbowColors.length)], 1);
          sparkle.fillCircle(0, 0, 2 + Math.random() * 3);
          
          scene.tweens.add({
            targets: sparkle,
            x: part.x + (Math.random() - 0.5) * 200,
            y: part.y + (Math.random() - 0.5) * 200,
            alpha: 0,
            scale: 0,
            duration: 800,
            delay: delay,
            ease: 'Cubic.easeOut',
            onComplete: () => sparkle.destroy()
          });
        }
        
        // Animate part flying away (but don't destroy - we need them for respawn)
        scene.tweens.add({
          targets: part,
          x: part.x + (Math.random() - 0.5) * 300,
          y: part.y - Math.random() * 200 - 100,
          alpha: 0,
          scale: 0,
          angle: Math.random() * 720 - 360,
          duration: 1000,
          delay: delay,
          ease: 'Power2.easeOut'
        });
      });
    },
    
    onSpawn: function(scene, sprite) {
      // Store original positions
      const originalX = sprite.x;
      const originalY = sprite.y;
      
      // Set up all parts at scattered positions with 0 alpha
      const parts = [
        { sprite: sprite, offsetX: 0, offsetY: 0, delay: 0 },
        { sprite: sprite.unicornHead, offsetX: -100, offsetY: -150, delay: 100 },
        { sprite: sprite.unicornNose, offsetX: -50, offsetY: -180, delay: 125 },
        { sprite: sprite.unicornHorn, offsetX: 50, offsetY: -200, delay: 150 },
        { sprite: sprite.unicornLeftEar, offsetX: -150, offsetY: -100, delay: 200 },
        { sprite: sprite.unicornRightEar, offsetX: 150, offsetY: -100, delay: 200 },
        { sprite: sprite.unicornLeftFoot, offsetX: -120, offsetY: 100, delay: 250 },
        { sprite: sprite.unicornRightFoot, offsetX: 120, offsetY: 100, delay: 250 },
        { sprite: sprite.unicornTail, offsetX: 0, offsetY: 150, delay: 300 }
      ];
      
      // Add mane segments
      if(sprite.unicornMane) {
        sprite.unicornMane.forEach((segment, i) => {
          parts.push({ sprite: segment, offsetX: -80 + i * 20, offsetY: -120 + i * 30, delay: 175 + i * 25 });
        });
      }
      
      // Start all parts invisible and scattered
      parts.forEach(({ sprite: part, offsetX, offsetY }) => {
        if(!part) return;
        part.alpha = 0;
        part.setScale(0);
        if(part !== sprite) { // Don't offset the main body initially
          part.x += offsetX;
          part.y += offsetY;
        }
      });
      
      // Animate parts coming together
      parts.forEach(({ sprite: part, delay }) => {
        if(!part) return;
        
        // Create gathering sparkles
        for(let i = 0; i < 3; i++) {
          const sparkle = scene.add.graphics();
          sparkle.x = part.x + (Math.random() - 0.5) * 100;
          sparkle.y = part.y + (Math.random() - 0.5) * 100;
          sparkle.fillStyle(this.rainbowColors[Math.floor(Math.random() * this.rainbowColors.length)], 0.5);
          sparkle.fillCircle(0, 0, 3);
          
          scene.tweens.add({
            targets: sparkle,
            x: part.x,
            y: part.y,
            alpha: 0,
            scale: 0,
            duration: 500,
            delay: delay,
            ease: 'Power2.easeIn',
            onComplete: () => sparkle.destroy()
          });
        }
        
        // Get target position based on which part it is
        let targetX = originalX;
        let targetY = originalY;
        if(part === sprite.unicornHead) {
          targetY = originalY - sprite.h * 0.7;
        } else if(part === sprite.unicornNose) {
          targetY = originalY - sprite.h * 0.95;
        } else if(part === sprite.unicornHorn) {
          targetY = originalY - sprite.h * 0.7;
        } else if(part === sprite.unicornLeftEar) {
          targetX = originalX - sprite.w * 0.15;
          targetY = originalY - sprite.h * 0.7;
        } else if(part === sprite.unicornRightEar) {
          targetX = originalX + sprite.w * 0.15;
          targetY = originalY - sprite.h * 0.7;
        } else if(part === sprite.unicornLeftFoot) {
          targetX = originalX - sprite.w * 0.4;
          targetY = originalY - sprite.h * 0.4;
        } else if(part === sprite.unicornRightFoot) {
          targetX = originalX + sprite.w * 0.4;
          targetY = originalY - sprite.h * 0.4;
        } else if(part === sprite.unicornTail) {
          targetY = originalY + sprite.h * 0.5;
        } else if(sprite.unicornMane && sprite.unicornMane.includes(part)) {
          // Mane segments
          const maneIndex = sprite.unicornMane.indexOf(part);
          targetX = originalX - sprite.w * 0.05;
          targetY = originalY - sprite.h * 0.65 + maneIndex * sprite.h * 0.08;
        }
        
        // Animate part flying in
        scene.tweens.add({
          targets: part,
          x: targetX,
          y: targetY,
          alpha: 1,
          scale: 1,
          angle: 0,
          duration: 600,
          delay: delay,
          ease: 'Back.easeOut'
        });
      });
      
      // Final flash when fully assembled
      scene.time.delayedCall(900, () => {
        const flash = scene.add.graphics();
        flash.x = originalX;
        flash.y = originalY;
        flash.fillStyle(0xffffff, 0.8);
        flash.fillCircle(0, 0, 50);
        
        scene.tweens.add({
          targets: flash,
          alpha: 0,
          scale: 2,
          duration: 300,
          ease: 'Cubic.easeOut',
          onComplete: () => flash.destroy()
        });
      });
    }
  }
};

// Character manager to handle switching
class CharacterManager {
  constructor(scene) {
    this.scene = scene;
    this.currentCharacter = 'default';
    this.characterSprite = CHARACTER_SPRITES[this.currentCharacter];
  }
  
  initialize(characterType = 'default') {
    // Check localStorage for saved preference
    const saved = localStorage.getItem('selectedCharacter');
    if(saved && CHARACTER_SPRITES[saved]) {
      characterType = saved;
    }
    
    this.currentCharacter = characterType;
    this.characterSprite = CHARACTER_SPRITES[characterType];
  }
  
  createTextures(size) {
    // Create textures for all characters
    for(let key in CHARACTER_SPRITES) {
      CHARACTER_SPRITES[key].createTexture(this.scene, size);
    }
  }
  
  createPlayer(x, y, size) {
    return this.characterSprite.createSprite(this.scene, x, y, size);
  }
  
  updateIdle(sprite, time) {
    this.characterSprite.updateIdle(this.scene, sprite, time);
  }
  
  onJump(sprite, isSuper = false) {
    if(this.characterSprite.onJump) {
      this.characterSprite.onJump(this.scene, sprite, isSuper);
    }
  }
  
  onLand(sprite, isSuper = false) {
    if(this.characterSprite.onLand) {
      this.characterSprite.onLand(this.scene, sprite, isSuper);
    }
  }
  
  onCharge(sprite, chargeAmount) {
    if(this.characterSprite.onCharge) {
      this.characterSprite.onCharge(this.scene, sprite, chargeAmount);
    }
  }
  
  onShoot(sprite) {
    if(this.characterSprite.onShoot) {
      this.characterSprite.onShoot(this.scene, sprite);
    }
  }
  
  onPowerUp(sprite) {
    if(this.characterSprite.onPowerUp) {
      this.characterSprite.onPowerUp(this.scene, sprite);
    } else {
      // Default behavior for characters without custom power-up
      sprite.setTint(0x00ff00);
    }
  }
  
  onPowerDown(sprite) {
    if(this.characterSprite.onPowerDown) {
      this.characterSprite.onPowerDown(this.scene, sprite);
    } else {
      // Default behavior for characters without custom power-down
      sprite.clearTint();
    }
  }
  
  onMove(sprite, fromX, toX) {
    if(this.characterSprite.onMove) {
      this.characterSprite.onMove(this.scene, sprite, fromX, toX);
    }
  }
  
  onDash(sprite, fromX, toX) {
    if(this.characterSprite.onDash) {
      this.characterSprite.onDash(this.scene, sprite, fromX, toX);
    }
  }
  
  onSpawn(sprite) {
    if(this.characterSprite.onSpawn) {
      this.characterSprite.onSpawn(this.scene, sprite);
    }
  }
  
  onDestroy(sprite) {
    if(this.characterSprite.onDestroy) {
      this.characterSprite.onDestroy(this.scene, sprite);
    }
  }
  
  switchCharacter(characterType) {
    if(CHARACTER_SPRITES[characterType]) {
      this.currentCharacter = characterType;
      this.characterSprite = CHARACTER_SPRITES[characterType];
      localStorage.setItem('selectedCharacter', characterType);
      return true;
    }
    return false;
  }
  
  getAvailableCharacters() {
    return Object.keys(CHARACTER_SPRITES).map(key => ({
      id: key,
      name: CHARACTER_SPRITES[key].name
    }));
  }
}

// Export for use in main game
window.CharacterManager = CharacterManager;
window.CHARACTER_SPRITES = CHARACTER_SPRITES;