// The player: movement and dash, aim, firing, regeneration, and picking up
// embers and stars. The main loop passes the frame's one-shot actions in.

import { PLAYER, W, H } from './config.js';
import { firePlayer } from './bullets.js';
import { spawnTrail } from './particles.js';
import { sfx } from './audio.js';
import { ACTION_DASH } from './input.js';

export function updatePlayer(state, dt, input, actions, random) {
  const p = state.player;
  if (!p.alive) return;

  if (p.invuln > 0) p.invuln -= dt;
  if (p.dashTimer > 0) p.dashTimer -= dt;
  if (p.fireTimer > 0) p.fireTimer -= dt;
  if (p.regen > 0) p.hp = Math.min(p.maxHp, p.hp + p.regen * dt);

  const move = input.moveVector();
  const mouse = input.mouse();
  p.angle = Math.atan2(mouse.y - p.y, mouse.x - p.x);

  // Dash: a short burst in the current move direction (or the aim direction
  // when standing still), with brief invulnerability and a trail.
  if ((actions & ACTION_DASH) && p.dashTimer <= 0) {
    let dx = move.x;
    let dy = move.y;
    if (dx === 0 && dy === 0) {
      dx = Math.cos(p.angle);
      dy = Math.sin(p.angle);
    }
    const d = Math.hypot(dx, dy) || 1;
    p.dashX = dx / d;
    p.dashY = dy / d;
    p.dashTime = PLAYER.dashTime;
    p.dashTimer = p.dashCooldown;
    p.invuln = Math.max(p.invuln, PLAYER.invulnAfterDash);
    sfx.dash();
  }
  if (p.dashTime > 0) {
    p.dashTime -= dt;
    p.x += p.dashX * PLAYER.dashSpeed * dt;
    p.y += p.dashY * PLAYER.dashSpeed * dt;
    spawnTrail(state, p.x, p.y, '#ffb43a');
  } else {
    p.x += move.x * p.speed * dt;
    p.y += move.y * p.speed * dt;
  }
  p.x = Math.max(18, Math.min(W - 18, p.x));
  p.y = Math.max(18, Math.min(H - 18, p.y));

  if (input.isFiring() && p.fireTimer <= 0) {
    firePlayer(state, random);
    p.fireTimer = 1 / p.fireRate;
  }
}

export function updatePickups(state, dt) {
  const p = state.player;
  for (let i = state.pickups.length - 1; i >= 0; i--) {
    const pk = state.pickups[i];
    pk.life -= dt;
    const dx = p.x - pk.x;
    const dy = p.y - pk.y;
    const d = Math.hypot(dx, dy) || 1;
    if (p.alive && d < p.magnet) {
      const pull = 420 * (1 - d / (p.magnet + 1));
      pk.x += (dx / d) * pull * dt;
      pk.y += (dy / d) * pull * dt;
    } else {
      pk.x += pk.vx * dt;
      pk.y += pk.vy * dt;
      pk.vx *= 0.98;
      pk.vy *= 0.98;
    }
    let taken = pk.life <= 0;
    if (p.alive && d < 26) {
      if (pk.kind === 'ember') {
        p.hp = Math.min(p.maxHp, p.hp + 10);
        sfx.pickup();
      } else {
        state.starTimer = 10;
        sfx.star();
      }
      taken = true;
    }
    if (taken) state.pickups.splice(i, 1);
  }
}
