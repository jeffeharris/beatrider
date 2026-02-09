export function updateTrailsSystem() {
  this.trailGraphics.clear();

  for (const enemy of this.enemies) {
    if (enemy.trailPoints && enemy.trailPoints.length > 1) {
      for (let i = 0; i < enemy.trailPoints.length - 1; i++) {
        const point = enemy.trailPoints[i];
        const nextPoint = enemy.trailPoints[i + 1];
        const alpha = (i / enemy.trailPoints.length) * 0.5;
        point.alpha = alpha;

        let color = 0xff3366;
        if (enemy.enemyType === 'fastEnemyTex') color = 0xffff00;
        else if (enemy.isDrifter) color = 0xff00ff;

        this.trailGraphics.lineStyle(2, color, alpha);
        this.trailGraphics.lineBetween(point.x, point.y, nextPoint.x, nextPoint.y);
      }
    }
  }

  for (const bullet of this.bullets) {
    if (bullet.trailPoints && bullet.trailPoints.length > 1) {
      for (let i = 0; i < bullet.trailPoints.length - 1; i++) {
        const point = bullet.trailPoints[i];
        const nextPoint = bullet.trailPoints[i + 1];
        const alpha = (i / bullet.trailPoints.length) * 0.7;
        const color = bullet.isArcShot ? 0xffff00 : 0x00ffff;

        this.trailGraphics.lineStyle(1, color, alpha);
        this.trailGraphics.lineBetween(point.x, point.y, nextPoint.x, nextPoint.y);
      }
    }
  }
}
