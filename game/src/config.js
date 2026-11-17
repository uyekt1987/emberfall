// Tuning and look for EMBERFALL. One place for every number the game balances on.

export const W = 1280;
export const H = 720;
export const STEP = 1 / 60;
export const BEST_KEY = 'emberfall.best';
export const TOTAL_WAVES = 10;

export const COLORS = {
  // Sky and field — one dusk: deep indigo above, warm amber at the horizon.
  bg0: '#0b0e1e', // deepest indigo, canvas edge
  bg1: '#141a33', // indigo mid, sky body
  skyTop: '#0d1026', // sky, top
  skyHorizon: '#3a2340', // sky, horizon — dusk purple-amber
  grid: 'rgba(120,140,255,0.07)',
  post: '#241a33', // lantern post wood
  tree: '#0a0d1c', // far tree silhouettes
  treeEdge: '#131a33', // far tree silhouettes, lighter set
  fence: '#1a1430', // garden fence
  grass: '#1d4a30', // ground grass
  grassDark: '#143522', // ground grass, darker set
  stone: '#3a4066', // ground stones
  mushroom: '#7ee0ff', // glow mushroom caps
  mushroomGlow: 'rgba(126,224,255,0.25)',
  // Warm light — the lantern side of the palette.
  lantern: '#ffd27a',
  player: '#ffb43a',
  playerRing: '#ff7a1a',
  bullet: '#ffe9a8',
  ember: '#ff9d2e',
  star: '#ffe95e',
  gold: '#ffd700', // elite outlines, title accents
  elite: '#ffd700',
  titleGlow: 'rgba(255,180,58,0.55)',
  // The shades — each enemy keeps its own cold or hot hue against the indigo.
  orb: '#c77dff',
  mote: '#7ee0ff',
  wisp: '#9d8cff',
  spitter: '#ff6b9d',
  splitter: '#7dffb0',
  husk: '#ff5d5d',
  bomber: '#ff8c1a',
  healer: '#b8ff2e',
  boss: '#e0aaff',
  // UI.
  text: '#f2f4ff',
  dim: '#9aa3c7',
  hp: '#ff5d5d',
  hpBg: 'rgba(255,255,255,0.14)',
  card: 'rgba(20,26,51,0.92)',
  cardEdge: '#ffd27a',
};

export const PLAYER = {
  hp: 100,
  speed: 260,
  radius: 16,
  fireRate: 4, // shots per second
  damage: 10,
  projectiles: 1,
  bulletSpeed: 620,
  bulletRadius: 4,
  pierce: 0,
  magnet: 90,
  crit: 0.05,
  dashSpeed: 900,
  dashTime: 0.12,
  dashCooldown: 0.9,
  invulnAfterDash: 0.25,
};

export const ENEMY = {
  mote: { hp: 10, speed: 115, r: 10, damage: 6, score: 10, cost: 1 },
  wisp: { hp: 15, speed: 175, r: 9, damage: 8, score: 15, cost: 2 },
  spitter: { hp: 20, speed: 72, r: 12, damage: 10, score: 20, cost: 3 },
  splitter: { hp: 30, speed: 88, r: 14, damage: 12, score: 25, cost: 3 },
  husk: { hp: 60, speed: 55, r: 20, damage: 16, score: 30, cost: 5 },
  bomber: { hp: 25, speed: 95, r: 13, damage: 14, score: 25, cost: 3 },
  healer: { hp: 20, speed: 60, r: 11, damage: 6, score: 25, cost: 3 },
  boss: { hp: 1200, speed: 62, r: 46, damage: 20, score: 1000, cost: 0 },
};

export const WAVE_BUDGET = (wave) => 6 + wave * 4;
export const COMBO_WINDOW = 3; // seconds without a kill before the combo resets
export const COMBO_STEP = 0.02; // +2% score per combo kill, up to +100%
export const EMBER_DROP_CHANCE = 0.08;
export const EMBER_HEAL = 10;
export const STAR_DROP_CHANCE = 0.02;
export const STAR_TIME = 10; // seconds of double score
