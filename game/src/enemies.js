// Enemies: spawn, movement AI per type, the boss, and what happens when one
// dies (score, combo, drops, splitting). Contact damage lives here too.

import { COLORS, COMBO_STEP, COMBO_WINDOW, EMBER_DROP_CHANCE, ENEMY, STAR_DROP_CHANCE, W, H } from './config.js';
import { addShake, addText, spawnBurst } from './particles.js';
import { sfx } from './audio.js';

export function spawnEnemy(state, type, x, y, wave) {
  const base = ENEMY[type];
  const hpScale = 1 + 0.08 * (wave - 1);
  const speedScale = 1 + 0.03 * (wave - 1);
  const enemy = {
    type,
    x,
    y,
    vx: 0,
    vy: 0,
    hp: Math.round(base.hp * hpScale),
    maxHp: Math.round(base.hp * hpScale),
    speed: base.speed * Math.min(speedScale, 1.3),
    r: base.r,
    damage: base.damage,
    score: base.score,
    t: Math.random() * 10,
    fireCd: 1 + Math.random(),
    touchCd: 0,
    mode: 'chase',
    modeTimer: 2 + Math.random() * 2,
    burstTimer: 4,
    summonTimer: 8,
    chargeX: 0,
    chargeY: 0,
  };
  state.enemies.push(enemy);
  if (type === 'boss') state.boss = enemy;
  return enemy;
}

function addScore(state, base, x, y) {
  const mult = 1 + Math.min(state.combo, 50) * COMBO_STEP;
  const star = state.starTimer > 0 ? 2 : 1;
  const gained = Math.round(base * mult * star);
  state.score += gained;
  state.combo += 1;
  state.comboTimer = COMBO_WINDOW;
  state.kills += 1;
  addText(state, x, y - 10, `+${gained}`, '#ffe9a8');
}

function dropPickup(state, x, y, random) {
  const roll = random();
  if (roll < EMBER_DROP_CHANCE) {
    state.pickups.push({ kind: 'ember', x, y, vx: (random() - 0.5) * 60, vy: (random() - 0.5) * 60, life: 12 });
  } else if (roll < EMBER_DROP_CHANCE + STAR_DROP_CHANCE) {
    state.pickups.push({ kind: 'star', x, y, vx: (random() - 0.5) * 60, vy: (random() - 0.5) * 60, life: 12 });
  }
}

export function damageEnemy(state, enemy, dmg, random) {
  enemy.hp -= dmg;
  spawnBurst(state, enemy.x, enemy.y, COLORS[enemy.type] || '#ffffff', 3, 120, 0.3, 2);
  if (enemy.hp > 0) {
    sfx.hit();
    return false;
  }
  // Death: score, particles, drops, and the splitter's children.
  addScore(state, enemy.score, enemy.x, enemy.y);
  spawnBurst(state, enemy.x, enemy.y, COLORS[enemy.type] || '#ffffff', 16, 220, 0.6, 4);
  sfx.die();
  dropPickup(state, enemy.x, enemy.y, random);
  if (enemy.type === 'splitter') {
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      spawnEnemy(state, 'mote', enemy.x + Math.cos(a) * 24, enemy.y + Math.sin(a) * 24, state.wave);
    }
  }
  if (enemy.type === 'boss') {
    state.boss = null;
    addShake(state, 12);
    spawnBurst(state, enemy.x, enemy.y, COLORS.boss, 60, 320, 0.9, 5);
  }
  const idx = state.enemies.indexOf(enemy);
  if (idx >= 0) state.enemies.splice(idx, 1);
  return true;
}

export function damagePlayer(state, dmg) {
  const p = state.player;
  if (p.invuln > 0 || !p.alive) return;
  p.hp -= dmg;
  p.invuln = 0.5;
  addShake(state, 7);
  spawnBurst(state, p.x, p.y, '#ff5d5d', 10, 180, 0.5, 3);
  sfx.playerHit();
  if (p.hp <= 0) {
    p.hp = 0;
    p.alive = false;
    spawnBurst(state, p.x, p.y, COLORS.player, 40, 280, 0.9, 4);
  }
}

function moveToward(e, tx, ty, speed, dt) {
  const dx = tx - e.x;
  const dy = ty - e.y;
  const d = Math.hypot(dx, dy) || 1;
  e.x += (dx / d) * speed * dt;
  e.y += (dy / d) * speed * dt;
}

function fireOrb(state, e, speed) {
  const p = state.player;
  const dx = p.x - e.x;
  const dy = p.y - e.y;
  const d = Math.hypot(dx, dy) || 1;
  state.orbs.push({
    x: e.x,
    y: e.y,
    vx: (dx / d) * speed,
    vy: (dy / d) * speed,
    r: 6,
    damage: e.damage,
    life: 4,
  });
}

export function updateEnemies(state, dt, random) {
  const p = state.player;
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i];
    e.t += dt;
    if (e.touchCd > 0) e.touchCd -= dt;
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;

    if (e.type === 'mote' || e.type === 'husk') {
      moveToward(e, p.x, p.y, e.speed, dt);
    } else if (e.type === 'wisp') {
      const wob = Math.sin(e.t * 5) * 0.7;
      const nx = dx / dist;
      const ny = dy / dist;
      e.x += (nx - ny * wob) * e.speed * dt;
      e.y += (ny + nx * wob) * e.speed * dt;
    } else if (e.type === 'spitter') {
      if (dist < 240) moveToward(e, e.x - dx, e.y - dy, e.speed, dt);
      else if (dist > 300) moveToward(e, p.x, p.y, e.speed, dt);
      else {
        e.x += (-dy / dist) * e.speed * 0.5 * dt;
        e.y += (dx / dist) * e.speed * 0.5 * dt;
      }
      e.fireCd -= dt;
      if (e.fireCd <= 0 && dist < 560 && p.alive) {
        fireOrb(state, e, 190);
        e.fireCd = 2.2;
      }
    } else if (e.type === 'splitter') {
      moveToward(e, p.x, p.y, e.speed, dt);
    } else if (e.type === 'boss') {
      updateBoss(state, e, dt, random, dist, dx, dy);
    }

    e.x = Math.max(e.r, Math.min(W - e.r, e.x));
    e.y = Math.max(e.r, Math.min(H - e.r, e.y));

    // Contact damage, with a per-enemy cooldown so one touch is one hit.
    if (p.alive && dist < e.r + 16 && e.touchCd <= 0) {
      e.touchCd = 0.9;
      damagePlayer(state, e.damage);
      const kb = 140;
      p.x += (dx / dist) * -kb * dt * 10;
      p.y += (dy / dist) * -kb * dt * 10;
    }
  }
}

function updateBoss(state, e, dt, random, dist, dx, dy) {
  const p = state.player;
  e.modeTimer -= dt;
  e.burstTimer -= dt;
  e.summonTimer -= dt;

  if (e.mode === 'chase') {
    moveToward(e, p.x, p.y, e.speed, dt);
    if (e.burstTimer <= 0 && p.alive) {
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        state.orbs.push({ x: e.x, y: e.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, r: 6, damage: 10, life: 5 });
      }
      e.burstTimer = 4;
      sfx.boss();
    }
    if (e.summonTimer <= 0) {
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + random();
        spawnEnemy(state, 'mote', e.x + Math.cos(a) * 70, e.y + Math.sin(a) * 70, state.wave);
      }
      e.summonTimer = 8;
    }
    if (e.modeTimer <= 0 && dist < 300 && dist > 120) {
      e.mode = 'telegraph';
      e.modeTimer = 0.5;
      e.chargeX = p.x;
      e.chargeY = p.y;
    }
  } else if (e.mode === 'telegraph') {
    if (e.modeTimer <= 0) {
      e.mode = 'charge';
      e.modeTimer = 0.55;
    }
  } else if (e.mode === 'charge') {
    const cx = e.chargeX - e.x;
    const cy = e.chargeY - e.y;
    const cd = Math.hypot(cx, cy) || 1;
    e.x += (cx / cd) * 520 * dt;
    e.y += (cy / cd) * 520 * dt;
    if (e.modeTimer <= 0) {
      e.mode = 'chase';
      e.modeTimer = 2.5 + random() * 2;
    }
  }
}
