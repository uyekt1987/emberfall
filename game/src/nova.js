// Nova Burst: the upgrade that turns the Warden into a walking lantern.
// Every few seconds it detonates a ring of light around the player, hurting
// every shade caught inside. Level 1 cannot one-shot a husk (40 < 60 HP).

import { damageEnemy } from './enemies.js';
import { addShake, addText, spawnBurst } from './particles.js';
import { sfx } from './audio.js';

export function novaStats(level) {
  return {
    damage: 40 + (level - 1) * 15,
    radius: 170 + (level - 1) * 25,
    cd: 6 - (level - 1) * 0.7,
  };
}

export function updateNova(state, dt, random) {
  // The expanding ring is visual only; it ages out even when the player has
  // no nova level (a staged screenshot can set it directly).
  if (state.novaFx) {
    state.novaFx.t += dt;
    if (state.novaFx.t > state.novaFx.dur) state.novaFx = null;
  }
  const p = state.player;
  if (!p.alive || p.novaLevel <= 0) return;
  p.novaTimer -= dt;
  if (p.novaTimer > 0) return;
  const stats = novaStats(p.novaLevel);
  const r2 = stats.radius * stats.radius;
  // Iterate a copy: a nova that kills a bomber detonates it, which removes
  // enemies from the live array mid-loop.
  for (const e of [...state.enemies]) {
    const dx = e.x - p.x;
    const dy = e.y - p.y;
    if (dx * dx + dy * dy < r2) damageEnemy(state, e, stats.damage, random);
  }
  state.novaFx = { x: p.x, y: p.y, maxR: stats.radius, t: 0, dur: 0.45 };
  addText(state, p.x, p.y - 28, 'NOVA!', '#ffd27a', 18);
  spawnBurst(state, p.x, p.y, '#ffd27a', 26, 320, 0.6, 4);
  addShake(state, 5);
  sfx.nova();
  p.novaTimer = stats.cd;
}
