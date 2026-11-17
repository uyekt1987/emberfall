// Ember Ring: the upgrade that turns the Warden's light into orbiting
// blades. Two to four small flame blades circle the player at a fixed
// radius and cut any shade they touch. Each blade can only hurt the same
// shade once per 0.5 s (the per-enemy ringCd in enemies.js), so a shade
// standing in the orbit takes steady damage instead of melting instantly.

import { damageEnemy } from './enemies.js';
import { spawnBurst } from './particles.js';

export function ringStats(level) {
  return {
    damage: 12 + (level - 1) * 8, // Lv1 12, Lv2 20, Lv3 28
    radius: 95 + (level - 1) * 15, // Lv1 95, Lv2 110, Lv3 125
    blades: 1 + level, // Lv1 2, Lv2 3, Lv3 4
    hitCd: 0.5,
  };
}

export function updateRing(state, dt, random) {
  const p = state.player;
  if (!p.alive || p.ringLevel <= 0) return;
  p.ringAngle += dt * 3.2;
  const stats = ringStats(p.ringLevel);
  for (let b = 0; b < stats.blades; b++) {
    const a = p.ringAngle + (b / stats.blades) * Math.PI * 2;
    const bx = p.x + Math.cos(a) * stats.radius;
    const by = p.y + Math.sin(a) * stats.radius;
    // Iterate a copy: a blade that kills a bomber detonates it, which
    // removes enemies from the live array mid-loop.
    for (const e of [...state.enemies]) {
      if (e.ringCd > 0) continue;
      const dx = e.x - bx;
      const dy = e.y - by;
      const rr = e.r + 12;
      if (dx * dx + dy * dy < rr * rr) {
        e.ringCd = stats.hitCd;
        damageEnemy(state, e, stats.damage, random);
        spawnBurst(state, bx, by, '#ffd27a', 3, 110, 0.25, 2);
      }
    }
  }
}

export function drawRing(ctx, state) {
  const p = state.player;
  if (!p.alive || p.ringLevel <= 0) return;
  const stats = ringStats(p.ringLevel);
  // A faint orbit guide, so the blades' reach reads before they arrive.
  ctx.strokeStyle = 'rgba(255,210,122,0.18)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(p.x, p.y, stats.radius, 0, Math.PI * 2);
  ctx.stroke();
  for (let b = 0; b < stats.blades; b++) {
    const a = p.ringAngle + (b / stats.blades) * Math.PI * 2;
    const bx = p.x + Math.cos(a) * stats.radius;
    const by = p.y + Math.sin(a) * stats.radius;
    // A small flame blade: a rotated diamond with a hot core.
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillStyle = '#ffb43a';
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(6, 0);
    ctx.lineTo(0, 11);
    ctx.lineTo(-6, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff3d6';
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(3, 0);
    ctx.lineTo(0, 5);
    ctx.lineTo(-3, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
