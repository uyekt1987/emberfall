// Projectiles: the player's shots (with spread and piercing) and the enemies'
// orbs. Collision is circle against circle; a piercing bullet remembers which
// enemies it already hit so it cannot damage the same one twice.

import { PLAYER, SHARD_DAMAGE_MULT, W, H } from './config.js';
import { damageEnemy, damagePlayer } from './enemies.js';
import { addText, spawnBurst } from './particles.js';
import { sfx } from './audio.js';

export function firePlayer(state, random) {
  const p = state.player;
  const n = p.projectiles;
  const spread = 0.09;
  // A shard buff multiplies every shot's damage while it lasts.
  const dmg = p.damage * (state.shardTimer > 0 ? SHARD_DAMAGE_MULT : 1);
  for (let i = 0; i < n; i++) {
    const off = (i - (n - 1) / 2) * spread;
    const a = p.angle + off;
    const crit = random() < p.crit;
    // Spawned at the player's centre, not at the muzzle: a shade pressed right
    // against the player is still in front of the shot.
    state.bullets.push({
      x: p.x,
      y: p.y,
      vx: Math.cos(a) * PLAYER.bulletSpeed,
      vy: Math.sin(a) * PLAYER.bulletSpeed,
      r: PLAYER.bulletRadius,
      damage: dmg * (crit ? 2 : 1),
      crit,
      pierceLeft: p.pierce,
      life: 1.1,
      hit: new Set(),
    });
  }
  sfx.shoot();
}

export function updateBullets(state, dt, random) {
  const bullets = state.bullets;
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.life -= dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    let dead = b.life <= 0 || b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20;
    if (!dead) {
      for (let j = state.enemies.length - 1; j >= 0; j--) {
        const e = state.enemies[j];
        // A chain explosion may have removed this slot mid-loop.
        if (!e) continue;
        if (b.hit.has(e)) continue;
        const dx = e.x - b.x;
        const dy = e.y - b.y;
        if (dx * dx + dy * dy < (e.r + b.r) * (e.r + b.r)) {
          b.hit.add(e);
          damageEnemy(state, e, b.damage, random);
          // Floating damage number at the impact point; crits are bigger and amber.
          addText(state, b.x, b.y - 8, String(Math.round(b.damage)), b.crit ? '#ff9d2e' : '#ffffff', b.crit ? 17 : 13);
          spawnBurst(state, b.x, b.y, '#ffe9a8', 2, 90, 0.25, 2);
          if (b.pierceLeft > 0) {
            b.pierceLeft -= 1;
          } else {
            dead = true;
          }
          break;
        }
      }
    }
    if (dead) bullets.splice(i, 1);
  }
}

export function updateOrbs(state, dt) {
  const orbs = state.orbs;
  const p = state.player;
  for (let i = orbs.length - 1; i >= 0; i--) {
    const o = orbs[i];
    o.life -= dt;
    o.x += o.vx * dt;
    o.y += o.vy * dt;
    let dead = o.life <= 0 || o.x < -20 || o.x > W + 20 || o.y < -20 || o.y > H + 20;
    if (!dead && p.alive) {
      const dx = p.x - o.x;
      const dy = p.y - o.y;
      if (dx * dx + dy * dy < (16 + o.r) * (16 + o.r)) {
        damagePlayer(state, o.damage);
        spawnBurst(state, o.x, o.y, '#c77dff', 6, 120, 0.4, 3);
        dead = true;
      }
    }
    if (dead) orbs.splice(i, 1);
  }
}
