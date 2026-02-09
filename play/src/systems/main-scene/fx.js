export function createSplatEffectSystem(x, y) {
  // Create a splat/squish effect for hitting walls
  const splatColor = 0x00ffcc;
  
  // Main splat circle that expands and fades
  const splat = this.add.circle(x, y, 30, splatColor, 1); // Much bigger initial size
  splat.setDepth(1000); // Make sure it's on top
  this.tweens.add({
    targets: splat,
    scaleX: 6, // Bigger expansion
    scaleY: 0.8, // Less squish
    alpha: 0,
    duration: 400,
    ease: 'Power2',
    onComplete: () => splat.destroy()
  });
  
  // Splatter particles that spray outward
  for(let i = 0; i < 12; i++) {
    const particle = this.add.rectangle(x, y, 16, 16, splatColor); // Bigger particles
    particle.setDepth(1000); // Make sure particles are on top
    const angle = (Math.PI * 2 / 12) * i;
    const speed = 150 + Math.random() * 100;
    
    // Particles spray more horizontally than vertically
    const xVel = Math.cos(angle) * speed * 1.5;
    const yVel = Math.sin(angle) * speed * 0.5;
    
    this.tweens.add({
      targets: particle,
      x: x + xVel,
      y: y + yVel,
      scaleX: 0.2,
      scaleY: 2, // Stretch vertically as they fall
      alpha: 0,
      rotation: Math.random() * Math.PI,
      duration: 600,
      ease: 'Power2',
      onComplete: () => particle.destroy()
    });
  }
  
  // Screen flash
  this.cameras.main.flash(200, 0, 255, 204, true);
}

export function createDeathExplosionSystem(playerX, playerY, enemyX, enemyY, enemyScale = 1.0) {
  // Multi-stage explosion for dramatic effect
  const colors = [0x00ffcc, 0xff3366, 0xffff00, 0xffffff];
  
  // Stage 1: Initial impact
  this._createExplosion(playerX, playerY, 0x00ffcc, 25, 1.0); // Player explosion always full size
  this._createExplosion(enemyX, enemyY, 0xff3366, 15, enemyScale); // Enemy explosion scales
  
  // Stage 2: Shockwave ring
  const ring = this.add.circle(playerX, playerY, 20, 0xffffff, 0);
  ring.setStrokeStyle(4, 0x00ffff, 1);
  this.tweens.add({
    targets: ring,
    scale: 5,
    alpha: 0,
    duration: 500,
    ease: 'Power2',
    onComplete: () => ring.destroy()
  });
  
  // Stage 3: Delayed secondary explosions
  this.time.delayedCall(100, () => {
    for(let i = 0; i < 3; i++) {
      const offsetX = (Math.random() - 0.5) * 60;
      const offsetY = (Math.random() - 0.5) * 60;
      this._createExplosion(playerX + offsetX, playerY + offsetY, colors[i % colors.length], 10);
    }
  });
  
  // Camera shake and flash
  this.cameras.main.shake(500, 0.02);
  this.cameras.main.flash(300, 255, 0, 0, true);
}

export function createExplosionSystem(x, y, color = 0xff3366, particleCount = 8, scale = 1.0){
  // Create particle explosion effect scaled by distance
  const scaledParticleCount = Math.max(3, Math.floor(particleCount * scale)); // Reduce particles for distant explosions
  const particleSize = 12 * scale; // Scale particle size
  
  for(let i = 0; i < scaledParticleCount; i++){
    const particle = this.add.rectangle(x, y, particleSize, particleSize, color);
    particle.setDepth(1000); // Ensure on top
    const angle = (Math.PI * 2 / scaledParticleCount) * i;
    const speed = (100 + Math.random() * 100) * scale; // Scale spread distance
    
    this.tweens.add({
      targets: particle,
      x: x + Math.cos(angle) * speed,
      y: y + Math.sin(angle) * speed,
      alpha: 0,
      scale: 0.1,
      duration: 400,
      ease: 'Power2',
      onComplete: () => particle.destroy()
    });
  }
  
  // Add a flash effect scaled by distance
  const flash = this.add.circle(x, y, 40 * scale, color, 0.9); // Scale flash size
  flash.setDepth(999); // Just below particles
  this.tweens.add({
    targets: flash,
    scale: 3, // Bigger expansion
    alpha: 0,
    duration: 200,
    ease: 'Power2',
    onComplete: () => flash.destroy()
  });
}
