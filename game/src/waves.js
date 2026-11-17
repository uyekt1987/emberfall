// Waves: each wave is a spawn budget spent on a shuffled queue of enemies,
// trickled in from the edges. Wave 10 swaps the budget for the Hollow King.

import { ENEMY, TOTAL_WAVES, WAVE_BUDGET, W, H, regionForWave } from './config.js';
import { spawnEnemy } from './enemies.js';
import { rollDraft } from './upgrades.js';
import { addText } from './particles.js';
import { sfx } from './audio.js';

// Which types may appear by wave, so the early game stays readable.
function allowedTypes(wave) {
  const types = ['mote'];
  if (wave >= 2) types.push('wisp');
  if (wave >= 3) types.push('spitter', 'bomber');
  if (wave >= 4) types.push('splitter', 'healer');
  if (wave >= 5) types.push('husk');
  return types;
}

// Weighted pick from the active region's mix, filtered to the types the
// wave has unlocked — so the Garden stays light on motes and wisps, the
// Fields bring spitters and splitters, and the Deep is heavy on husks,
// bombers and healers.
function pickType(region, allowed, random) {
  let total = 0;
  for (const t of allowed) total += region.weights[t] || 0;
  if (total <= 0) return allowed[Math.floor(random() * allowed.length)];
  let roll = random() * total;
  for (const t of allowed) {
    roll -= region.weights[t] || 0;
    if (roll <= 0) return t;
  }
  return allowed[allowed.length - 1];
}

export function startWave(state, wave, random) {
  state.wave = wave;
  state.waveState = 'spawning';
  state.spawnQueue = [];
  state.spawnTimer = 0.4;
  // Crossing into a new region gets a banner: name, 2.5 s, drawn by the renderer.
  const region = regionForWave(wave);
  if (wave === region.firstWave) {
    state.regionBanner = { name: region.name, t: 2.5, dur: 2.5 };
  }
  if (wave === TOTAL_WAVES) {
    spawnEnemy(state, 'boss', W / 2, 90, wave);
    sfx.boss();
    return;
  }
  let budget = WAVE_BUDGET(wave);
  const types = allowedTypes(wave);
  while (budget > 0) {
    const type = pickType(region, types, random);
    const cost = ENEMY[type].cost;
    if (cost > budget && types.length > 1) continue;
    if (cost > budget) break;
    state.spawnQueue.push(type);
    budget -= cost;
  }
  // Shuffle so the wave is not one long run of the same type.
  for (let i = state.spawnQueue.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [state.spawnQueue[i], state.spawnQueue[j]] = [state.spawnQueue[j], state.spawnQueue[i]];
  }
}

function edgePoint(state, random) {
  const side = Math.floor(random() * 4);
  const m = 30;
  let x;
  let y;
  if (side === 0) {
    x = m + random() * (W - 2 * m);
    y = m;
  } else if (side === 1) {
    x = m + random() * (W - 2 * m);
    y = H - m;
  } else if (side === 2) {
    x = m;
    y = m + random() * (H - 2 * m);
  } else {
    x = W - m;
    y = m + random() * (H - 2 * m);
  }
  // Never spawn on top of the player.
  const dx = x - state.player.x;
  const dy = y - state.player.y;
  if (Math.hypot(dx, dy) < 260) {
    x = W - x;
    y = H - y;
  }
  return { x, y };
}

// Returns 'clear' when the wave is fully cleared, else null.
export function updateWaves(state, dt, random) {
  if (state.waveState === 'spawning') {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0 && state.spawnQueue.length > 0) {
      const type = state.spawnQueue.shift();
      const p = edgePoint(state, random);
      // From wave 5, some non-boss spawns come out elite: triple HP, bigger,
      // worth triple score — and they always drop an ember shard when they
      // die. The Deep (waves 7+) breeds elites far more often.
      const region = regionForWave(state.wave);
      const isElite = state.wave >= 5 && type !== 'boss' && random() < region.eliteChance;
      spawnEnemy(state, type, p.x, p.y, state.wave, isElite);
      if (isElite) addText(state, p.x, p.y - 24, 'ELITE!', '#ffd700', 16);
      state.spawnTimer = 0.45 + random() * 0.35;
    }
    if (state.spawnQueue.length === 0) state.waveState = 'fighting';
  }
  if (state.waveState === 'fighting' && state.enemies.length === 0) {
    state.waveState = 'clear';
    const bonus = 100 * state.wave;
    state.score += bonus;
    if (state.wave >= TOTAL_WAVES) return 'win';
    sfx.waveClear();
    state.draft = rollDraft(state, random);
    return 'clear';
  }
  return null;
}
