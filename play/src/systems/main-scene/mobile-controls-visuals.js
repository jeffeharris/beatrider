export function updateZoneVisualsSystem() {
  if (!this.zoneVisuals) return;

  this.zoneVisuals.clear();

  this.zoneVisuals.lineStyle(2, 0x00aaff, 0.4);
  this.zoneVisuals.fillStyle(0x00aaff, 0.1);
  this.zoneVisuals.fillCircle(this.touchStartX, this.touchStartY, this.zoneDeadRadius);
  this.zoneVisuals.strokeCircle(this.touchStartX, this.touchStartY, this.zoneDeadRadius);

  this.zoneVisuals.lineStyle(1, 0xffffff, 0.2);
  this.zoneVisuals.strokeCircle(this.touchStartX, this.touchStartY, this.zoneRadius);

  const cx = this.touchStartX;
  const cy = this.touchStartY;
  const r = this.zoneRadius;

  const angle60 = 60 * Math.PI / 180;
  const angle120 = 120 * Math.PI / 180;

  this.zoneVisuals.lineStyle(1, 0xffffff, 0.3);
  this.zoneVisuals.lineBetween(cx, cy, cx + r * Math.cos(-angle60), cy + r * Math.sin(-angle60));
  this.zoneVisuals.lineBetween(cx, cy, cx + r * Math.cos(angle60), cy + r * Math.sin(angle60));
  this.zoneVisuals.lineBetween(cx, cy, cx + r * Math.cos(-angle120), cy + r * Math.sin(-angle120));
  this.zoneVisuals.lineBetween(cx, cy, cx + r * Math.cos(angle120), cy + r * Math.sin(angle120));

  this.zoneVisuals.lineStyle(3, 0x00ff00, 0.4);
  this.zoneVisuals.arc(cx, cy, r * 0.8, -angle120, -angle60, false);

  this.zoneVisuals.lineStyle(3, 0x0088ff, 0.4);
  this.zoneVisuals.arc(cx, cy, r * 0.8, angle60, angle120, false);

  this.zoneVisuals.lineStyle(3, 0xff8800, 0.4);
  this.zoneVisuals.arc(cx, cy, r * 0.8, -angle60, angle60, false);
  this.zoneVisuals.arc(cx, cy, r * 0.8, angle120, Math.PI, false);
  this.zoneVisuals.arc(cx, cy, r * 0.8, -Math.PI, -angle120, false);
}
