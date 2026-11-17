// The one state store. Every module reads and writes this object; nothing else
// holds game state, so a fresh state is a fresh game and a screenshot stage is
// just a state with chosen values.

import { PLAYER, TOTAL_WAVES } from './config.js';

export function createState() {
  return {
    screen: 'title', // title | play | draft | paused | over | win
    time: 0,
    wave: 0,
    waveState: 'idle', // idle | spawning | fighting | clear
    spawnQueue: [],
    spawnTimer: 0,
    score: 0,
    best: 0,
    combo: 0,
    comboTimer: 0,
    kills: 0,
    starTimer: 0,
    shake: 0,
    novaFx: null, // {x, y, maxR, t, dur} while a nova ring expands
    hitStop: 0, // seconds the world freezes on elite/boss kills
    draft: null, // [upgrade, upgrade, upgrade] while choosing
    upgradesOwned: [],
    player: {
      x: 640,
      y: 360,
      angle: 0,
      hp: PLAYER.hp,
      maxHp: PLAYER.hp,
      speed: PLAYER.speed,
      fireRate: PLAYER.fireRate,
      damage: PLAYER.damage,
      projectiles: PLAYER.projectiles,
      pierce: PLAYER.pierce,
      magnet: PLAYER.magnet,
      crit: PLAYER.crit,
      dashCooldown: PLAYER.dashCooldown,
      dashTimer: 0,
      dashTime: 0,
      dashX: 0,
      dashY: 0,
      invuln: 0,
      fireTimer: 0,
      regen: 0,
      novaLevel: 0,
      novaTimer: 0,
      alive: true,
    },
    enemies: [],
    bullets: [],
    orbs: [],
    particles: [],
    texts: [],
    pickups: [],
    boss: null,
    muted: false,
  };
}

export function resetRun(state) {
  const fresh = createState();
  fresh.best = state.best;
  fresh.muted = state.muted;
  Object.keys(fresh).forEach((k) => {
    state[k] = fresh[k];
  });
  state.screen = 'play';
  state.wave = 0;
  state.waveState = 'idle';
}

export function totalWaves() {
  return TOTAL_WAVES;
}
