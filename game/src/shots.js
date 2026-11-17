// The screenshot scenes behind ?shot=start|play|end. Each one builds its state
// directly from the seed, so the same seed always gives the same frame, and
// the frame is what a real game looks like at that moment.

import { spawnEnemy } from './enemies.js';
import { rollDraft } from './upgrades.js';
import { spawnBurst } from './particles.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

export function stageShot(name, state, random) {
  if (name === 'start') {
    state.screen = SCREEN_TITLE;
    state.best = 0;
    const spots = [
      ['mote', 300, 220],
      ['wisp', 980, 200],
      ['spitter', 880, 480],
      ['splitter', 420, 500],
      ['mote', 640, 150],
      ['husk', 1120, 380],
      ['bomber', 760, 560],
      ['healer', 520, 160],
      ['mote', 1080, 580, true], // elite: gold outline + gold ring on show
    ];
    for (const [type, x, y] of spots) spawnEnemy(state, type, x, y, 3);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    state.screen = SCREEN_PLAY;
    state.wave = 4;
    state.waveState = 'fighting';
    state.score = 1250;
    state.combo = 12;
    state.comboTimer = 2.1;
    state.kills = 87;
    state.best = 3420;
    state.player.hp = 78;
    state.player.x = 640;
    state.player.y = 380;
    state.player.angle = -0.6;
    state.player.fireTimer = 0;
    // Nova Burst level 1, mid-ring, so the gold ring reads in the shot.
    state.player.novaLevel = 1;
    state.novaFx = { x: 640, y: 380, maxR: 170, t: 0.2, dur: 0.45 };
    const foes = [
      ['mote', 820, 300],
      ['mote', 760, 420],
      ['wisp', 940, 260],
      ['spitter', 1020, 480],
      ['splitter', 480, 260],
      ['husk', 380, 470, true],
      ['mote', 560, 180],
      ['wisp', 700, 540],
      ['mote', 1060, 360],
      ['spitter', 240, 320],
      ['bomber', 880, 300],
      ['healer', 300, 540],
      ['wisp', 1120, 620, true], // elite wisp: gold outline + ring
      ['bomber', 1010, 580], // armed below: fuse ring on show
    ];
    for (const [type, x, y, elite] of foes) spawnEnemy(state, type, x, y, 4, !!elite);
    // Arm the last bomber so its fuse telegraph reads in the shot.
    const armedBomber = state.enemies.find((e) => e.type === 'bomber' && e.x === 1010);
    if (armedBomber) {
      armedBomber.armed = true;
      armedBomber.fuse = 0.45;
    }
    state.spawnQueue = ['mote', 'wisp', 'mote', 'spitter', 'mote'];
    for (let i = 0; i < 5; i++) {
      const a = -0.6 + (i - 2) * 0.09;
      state.bullets.push({
        x: 640 + Math.cos(a) * (60 + i * 26),
        y: 380 + Math.sin(a) * (60 + i * 26),
        vx: Math.cos(a) * 620,
        vy: Math.sin(a) * 620,
        r: 4,
        damage: 10,
        crit: i === 2,
        pierceLeft: 0,
        life: 1,
        hit: new Set(),
      });
    }
    state.orbs.push({ x: 900, y: 420, vx: -140, vy: 60, r: 6, damage: 10, life: 3 });
    state.pickups.push({ kind: 'ember', x: 520, y: 470, vx: 0, vy: 0, life: 12 });
    state.pickups.push({ kind: 'star', x: 780, y: 180, vx: 0, vy: 0, life: 12 });
    spawnBurst(state, 820, 300, '#7ee0ff', 8, 160, 0.6, 3);
    spawnBurst(state, 700, 540, '#9d8cff', 6, 140, 0.5, 3);
    return { screen: SCREEN_PLAY, best: 3420 };
  }
  // end: the victory screen after the boss falls.
  state.screen = SCREEN_WIN;
  state.wave = 10;
  state.waveState = 'clear';
  state.score = 8420;
  state.best = 8420;
  state.kills = 156;
  state.combo = 0;
  state.player.x = 640;
  state.player.y = 360;
  // The fallen Hollow King and the last shades, still standing behind the
  // victory screen, so the end shot shows the full cast.
  spawnEnemy(state, 'boss', 210, 540, 10);
  spawnEnemy(state, 'mote', 1070, 520, 10);
  spawnEnemy(state, 'wisp', 990, 610, 10);
  spawnEnemy(state, 'healer', 290, 620, 10);
  spawnBurst(state, 640, 300, '#e0aaff', 40, 300, 0.9, 5);
  spawnBurst(state, 640, 360, '#ffb43a', 24, 220, 0.8, 4);
  spawnBurst(state, 640, 330, '#ffd700', 30, 260, 0.9, 4);
  state.draft = null;
  return { screen: SCREEN_WIN, best: 8420 };
}
