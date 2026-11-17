// The lantern-garden arena: a layered, parallax background drawn in code.
//
// Four layers, far to near, all deterministic — the scatter is seeded once at
// module load, and the only motion comes from nowMs, so a staged screenshot
// (fixed nowMs, fixed player position) always paints the same frame:
//
//   (a) dusk sky — deep indigo at the top melting into warm amber at the
//       horizon, the cold-vs-warm contrast the whole palette hangs on.
//   (b) far layer — a dark tree line and garden fence along the top edge,
//       with dim far lanterns breathing among the trees.
//   (c) mid layer — lantern posts with warm glow pools on the ground.
//   (d) ground — grass tufts, stones and glow mushrooms scattered from a
//       fixed seed, so the floor has texture without any repeating grid.
//
// Parallax: the far and mid layers shift a little against the player's
// position relative to the arena centre (the ground is the playfield, so it
// stays fixed). Drifting embers float over everything, slow and deterministic.

import { COLORS, H, W } from './config.js';
import { createRandom } from './random.js';

const rng = createRandom(20261117);
const pick = (arr) => arr[Math.floor(rng() * arr.length)];

// --- seeded scatter (built once, same every run) ----------------------------

// Grass tufts: small clusters of 3 blades, two dark greens.
const GRASS = [];
for (let i = 0; i < 110; i++) {
  GRASS.push({
    x: 30 + rng() * (W - 60),
    y: 70 + rng() * (H - 120),
    s: 0.7 + rng() * 0.9,
    c: rng() < 0.5 ? COLORS.grass : COLORS.grassDark,
    lean: (rng() - 0.5) * 4,
  });
}

// Stones: small flat grey ellipses.
const STONES = [];
for (let i = 0; i < 26; i++) {
  STONES.push({
    x: 30 + rng() * (W - 60),
    y: 80 + rng() * (H - 140),
    rx: 3 + rng() * 5,
    ry: 2 + rng() * 3,
    c: pick([COLORS.stone, '#454b73', '#2e3352']),
  });
}

// Glow mushrooms: a pale stem, a bright cap, and a soft halo. Two colours.
const SHROOMS = [];
for (let i = 0; i < 15; i++) {
  SHROOMS.push({
    x: 40 + rng() * (W - 80),
    y: 90 + rng() * (H - 160),
    s: 0.8 + rng() * 0.7,
    cap: rng() < 0.6 ? COLORS.mushroom : '#a5f2c0',
    glow: rng() < 0.6 ? COLORS.mushroomGlow : 'rgba(165,242,192,0.22)',
  });
}

// Far tree line: dark rounded canopies along the top edge, plus a few down
// the left and right edges so the garden feels enclosed.
const TREES = [];
for (let x = 20; x < W; x += 90 + rng() * 60) {
  TREES.push({ x, y: -6, r: 42 + rng() * 36, c: pick([COLORS.tree, COLORS.treeEdge]) });
}
for (let y = 120; y < H - 60; y += 130 + rng() * 70) {
  TREES.push({ x: -8, y, r: 34 + rng() * 26, c: COLORS.tree });
  TREES.push({ x: W + 8, y: y + 60, r: 34 + rng() * 26, c: COLORS.treeEdge });
}

// Dim lanterns hanging among the far trees.
const FAR_LANTERNS = [];
for (let i = 0; i < 9; i++) {
  FAR_LANTERNS.push({
    x: 60 + rng() * (W - 120),
    y: 26 + rng() * 34,
    phase: rng() * Math.PI * 2,
  });
}

// Lantern posts: near the corners and the middle of the long edges, so the
// warm pools frame the playfield without sitting under the HUD.
const POSTS = [
  { x: 120, y: 96 },
  { x: 640, y: 64 },
  { x: 1160, y: 96 },
  { x: 84, y: 640 },
  { x: 1196, y: 640 },
  { x: 90, y: 360 },
  { x: 1190, y: 360 },
];

// Drifting embers: slow, warm, deterministic from nowMs.
const EMBERS = [];
for (let i = 0; i < 20; i++) {
  EMBERS.push({
    seed: i * 173 + 41,
    y0: 50 + ((i * 97) % (H - 100)),
    size: 1.5 + (i % 3) * 0.8,
    speed: 0.006 + (i % 4) * 0.002,
    alpha: 0.22 + (i % 5) * 0.07,
  });
}

// --- layers -----------------------------------------------------------------

function drawSky(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, COLORS.skyTop);
  g.addColorStop(0.55, COLORS.bg1);
  g.addColorStop(1, COLORS.skyHorizon);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // A low warm band on the horizon, like the last light of the garden.
  const band = ctx.createLinearGradient(0, H - 190, 0, H);
  band.addColorStop(0, 'rgba(255,150,60,0)');
  band.addColorStop(1, 'rgba(255,150,60,0.10)');
  ctx.fillStyle = band;
  ctx.fillRect(0, H - 190, W, 190);
}

function drawFarLayer(ctx, ox, oy, nowMs) {
  ctx.save();
  ctx.translate(-ox, -oy);
  // Tree canopies.
  for (const t of TREES) {
    ctx.fillStyle = t.c;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(t.x - t.r * 0.55, t.y + t.r * 0.3, t.r * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(t.x + t.r * 0.55, t.y + t.r * 0.3, t.r * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Garden fence: a rail and slats just below the top tree line.
  ctx.fillStyle = COLORS.fence;
  ctx.fillRect(0, 58, W, 4);
  for (let x = 24; x < W; x += 48) {
    ctx.fillRect(x, 44, 5, 22);
  }
  // Far lanterns, breathing softly.
  for (const l of FAR_LANTERNS) {
    const breathe = 0.5 + 0.5 * Math.sin(nowMs / 1100 + l.phase);
    ctx.fillStyle = `rgba(255,190,90,${0.10 + breathe * 0.16})`;
    ctx.beginPath();
    ctx.arc(l.x, l.y, 3 + breathe * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawLanternPost(ctx, x, y, nowMs, phase) {
  // Warm pool of light on the ground first, then the post, then the lantern.
  const breathe = 0.5 + 0.5 * Math.sin(nowMs / 900 + phase);
  const pool = ctx.createRadialGradient(x, y + 26, 2, x, y + 26, 74);
  pool.addColorStop(0, `rgba(255,180,58,${0.16 + breathe * 0.08})`);
  pool.addColorStop(1, 'rgba(255,180,58,0)');
  ctx.fillStyle = pool;
  ctx.beginPath();
  ctx.ellipse(x, y + 26, 74, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  // Post.
  ctx.fillStyle = COLORS.post;
  ctx.fillRect(x - 3, y - 34, 6, 62);
  ctx.fillRect(x - 8, y + 26, 16, 4);
  // Hanging lantern: dark frame, amber glass, white-hot core.
  ctx.fillStyle = '#241a33';
  ctx.fillRect(x - 9, y - 48, 18, 20);
  ctx.fillStyle = `rgba(255,190,90,${0.75 + breathe * 0.25})`;
  ctx.fillRect(x - 6, y - 45, 12, 14);
  ctx.fillStyle = '#fff3d6';
  ctx.fillRect(x - 2, y - 42, 4, 8);
  // Halo around the lantern itself.
  const halo = ctx.createRadialGradient(x, y - 38, 1, x, y - 38, 26);
  halo.addColorStop(0, `rgba(255,210,122,${0.20 + breathe * 0.12})`);
  halo.addColorStop(1, 'rgba(255,210,122,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y - 38, 26, 0, Math.PI * 2);
  ctx.fill();
}

function drawGround(ctx) {
  // Grass tufts: three short blades each.
  for (const g of GRASS) {
    ctx.strokeStyle = g.c;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(g.x - 3 * g.s, g.y);
    ctx.lineTo(g.x - 4 * g.s + g.lean, g.y - 7 * g.s);
    ctx.moveTo(g.x, g.y);
    ctx.lineTo(g.x + g.lean, g.y - 9 * g.s);
    ctx.moveTo(g.x + 3 * g.s, g.y);
    ctx.lineTo(g.x + 4 * g.s + g.lean, g.y - 6 * g.s);
    ctx.stroke();
  }
  // Stones.
  for (const s of STONES) {
    ctx.fillStyle = s.c;
    ctx.beginPath();
    ctx.ellipse(s.x, s.y, s.rx, s.ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Glow mushrooms.
  for (const m of SHROOMS) {
    const halo = ctx.createRadialGradient(m.x, m.y - 4 * m.s, 1, m.x, m.y - 4 * m.s, 16 * m.s);
    halo.addColorStop(0, m.glow);
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(m.x, m.y - 4 * m.s, 16 * m.s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8f6ff';
    ctx.fillRect(m.x - 1.5 * m.s, m.y - 5 * m.s, 3 * m.s, 5 * m.s);
    ctx.fillStyle = m.cap;
    ctx.beginPath();
    ctx.arc(m.x, m.y - 5 * m.s, 4.5 * m.s, Math.PI, 0);
    ctx.fill();
  }
}

function drawEmbers(ctx, nowMs) {
  for (const e of EMBERS) {
    const x = ((e.seed + nowMs * e.speed) % (W + 40)) - 20;
    const y = e.y0 + Math.sin(nowMs / 1400 + e.seed) * 9;
    ctx.fillStyle = `rgba(255,157,46,${e.alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, e.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawVignette(ctx) {
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.85);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

// --- entry point ------------------------------------------------------------

// Paints the whole arena behind the entities. playerX/playerY drive the
// parallax: far layers move least, mid layers a little more, the ground not
// at all (it is the playfield). Deterministic for fixed inputs.
export function drawBackground(ctx, playerX, playerY, nowMs) {
  const dx = playerX - W / 2;
  const dy = playerY - H / 2;
  drawSky(ctx);
  drawFarLayer(ctx, dx * 0.03, dy * 0.03, nowMs);
  ctx.save();
  ctx.translate(-dx * 0.06, -dy * 0.06);
  for (let i = 0; i < POSTS.length; i++) {
    drawLanternPost(ctx, POSTS[i].x, POSTS[i].y, nowMs, i * 1.7);
  }
  ctx.restore();
  drawGround(ctx);
  drawEmbers(ctx, nowMs);
  drawVignette(ctx);
}
