// Enemies: spawn, movement AI per type, the boss, and what happens when one
// dies (score, combo, drops, splitting). Contact damage lives here too.

import { COLORS, COMBO_STEP, COMBO_WINDOW, EMBER_DROP_CHANCE, ENEMY, SHARD_DROP_CHANCE, STAR_DROP_CHANCE, W, H } from './config.js';
import { addShake, addText, spawnBurst } from './particles.js';
import { sfx } from './audio.js';

export function spawnEnemy(state, type, x, y, wave, isElite = false) {
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
    // Bomber: armed countdown to self-destruct, and a re-entry guard so one
    // bomber never explodes twice (its own death and a chain blast).
    armed: false,
    fuse: 0,
    exploding: false,
    // Healer: cooldown between heal pulses, and the visible ring timer.
    healCd: 1.5 + Math.random(),
    healPulse: 0,
    // Ember Ring: per-enemy cooldown so one orbiting blade cannot shred the
    // same shade every frame.
    ringCd: 0,
    elite: false,
  };
  if (isElite) {
    enemy.hp *= 3;
    enemy.maxHp *= 3;
    enemy.r = Math.round(enemy.r * 1.35);
    enemy.score *= 3;
    enemy.speed *= 0.95;
    enemy.damage += 2;
    enemy.elite = true;
  }
  state.enemies.push(enemy);
  if (type === 'boss') state.boss = enemy;
  return enemy;
}

// A bomber's explosion: the bomber is removed from the array BEFORE the AoE
// damage runs, so a chain blast that kills another bomber cannot loop back
// onto one that is already gone. Each chained bomber explodes once, then the
// chain ends because every bomber in range has already been removed.
function explodeBomber(state, enemy, random) {
  if (enemy.exploding) return;
  enemy.exploding = true;
  const idx = state.enemies.indexOf(enemy);
  if (idx >= 0) state.enemies.splice(idx, 1);
  const R = 110;
  spawnBurst(state, enemy.x, enemy.y, COLORS.bomber, 30, 320, 0.7, 5);
  spawnBurst(state, enemy.x, enemy.y, '#ffffff', 10, 200, 0.4, 3);
  addShake(state, 8);
  sfx.explode();
  const p = state.player;
  if (p.alive) {
    const d = Math.hypot(p.x - enemy.x, p.y - enemy.y);
    if (d < R + 16) damagePlayer(state, enemy.damage);
  }
  for (const other of [...state.enemies]) {
    const d = Math.hypot(other.x - enemy.x, other.y - enemy.y);
    if (d < R + other.r) damageEnemy(state, other, 30, random);
  }
}

// A healer's pulse: every shade within 160 px regains 12 HP, capped at its
// max HP (so a boss can never be overhealed past full).
function healPulse(state, healer) {
  const R = 160;
  healer.healPulse = 0.5;
  for (const other of [...state.enemies]) {
    if (other === healer) continue;
    const d = Math.hypot(other.x - healer.x, other.y - healer.y);
    if (d < R && other.hp < other.maxHp) {
      other.hp = Math.min(other.maxHp, other.hp + 12);
      spawnBurst(state, other.x, other.y, COLORS.healer, 3, 60, 0.4, 2);
    }
  }
  spawnBurst(state, healer.x, healer.y, COLORS.healer, 10, 140, 0.5, 3);
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
  } else if (roll < EMBER_DROP_CHANCE + STAR_DROP_CHANCE + SHARD_DROP_CHANCE) {
    // A shard: +50% damage for 8 seconds once picked up.
    state.pickups.push({ kind: 'shard', x, y, vx: (random() - 0.5) * 60, vy: (random() - 0.5) * 60, life: 12 });
  }
}

function dropShard(state, x, y, random) {
  state.pickups.push({ kind: 'shard', x, y, vx: (random() - 0.5) * 60, vy: (random() - 0.5) * 60, life: 12 });
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
  if (enemy.elite) {
    // Elites always drop an ember and a shard, and often a star too — better
    // than a normal kill. The kill also freezes the world for a beat (hit stop).
    state.pickups.push({ kind: 'ember', x: enemy.x, y: enemy.y, vx: (random() - 0.5) * 60, vy: (random() - 0.5) * 60, life: 12 });
    dropShard(state, enemy.x, enemy.y, random);
    if (random() < 0.25) {
      state.pickups.push({ kind: 'star', x: enemy.x, y: enemy.y, vx: (random() - 0.5) * 60, vy: (random() - 0.5) * 60, life: 12 });
    }
    state.hitStop = 0.07;
  } else {
    dropPickup(state, enemy.x, enemy.y, random);
  }
  // A bomber shot dead detonates the same way as an armed one.
  if (enemy.type === 'bomber' && !enemy.exploding) {
    explodeBomber(state, enemy, random);
  }
  if (enemy.type === 'splitter') {
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      spawnEnemy(state, 'mote', enemy.x + Math.cos(a) * 24, enemy.y + Math.sin(a) * 24, state.wave);
    }
  }
  if (enemy.type === 'boss') {
    state.boss = null;
    state.hitStop = 0.12;
    addShake(state, 12);
    spawnBurst(state, enemy.x, enemy.y, COLORS.boss, 60, 320, 0.9, 5);
    // The Hollow King always leaves a shard behind for the warden.
    dropShard(state, enemy.x, enemy.y, random);
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
    // Another enemy's explosion (or a nova) may have removed this one
    // mid-loop; skip the slot rather than touching a missing enemy.
    if (!e) continue;
    e.t += dt;
    if (e.touchCd > 0) e.touchCd -= dt;
    if (e.ringCd > 0) e.ringCd -= dt;
    if (e.healPulse > 0) e.healPulse -= dt;
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
    } else if (e.type === 'bomber') {
      // Chases like a mote; inside 90 px it arms a 0.7 s fuse (flashing as a
      // telegraph) and then detonates, hurting the player and other shades.
      // While armed it creeps at 40% speed, so the fuse reads as a warning.
      moveToward(e, p.x, p.y, e.armed ? e.speed * 0.4 : e.speed, dt);
      if (!e.armed && dist < 90 && p.alive) {
        e.armed = true;
        e.fuse = 0.7;
      }
      if (e.armed) {
        e.fuse -= dt;
        if (e.fuse <= 0) explodeBomber(state, e, random);
      }
    } else if (e.type === 'healer') {
      // Keeps its distance like a spitter, strafing in the middle band, and
      // pulses a heal to nearby shades every 2.5 s.
      if (dist < 260) moveToward(e, e.x - dx, e.y - dy, e.speed, dt);
      else if (dist > 320) moveToward(e, p.x, p.y, e.speed, dt);
      else {
        e.x += (-dy / dist) * e.speed * 0.5 * dt;
        e.y += (dx / dist) * e.speed * 0.5 * dt;
      }
      e.healCd -= dt;
      if (e.healCd <= 0) {
        healPulse(state, e);
        e.healCd = 2.5;
      }
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
