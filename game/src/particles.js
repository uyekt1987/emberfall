// Pooled particles, floating score texts and screen shake. Nothing allocates
// per frame beyond the pool's fixed cap, so long sessions stay smooth.

const MAX_PARTICLES = 320;
const MAX_TEXTS = 24;

export function spawnBurst(state, x, y, color, count, speed = 160, life = 0.5, size = 3) {
  for (let i = 0; i < count; i++) {
    if (state.particles.length >= MAX_PARTICLES) return;
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.3 + Math.random() * 0.7);
    state.particles.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      life: life * (0.6 + Math.random() * 0.7),
      maxLife: life,
      size: size * (0.6 + Math.random() * 0.8),
      color,
      drag: 0.9,
    });
  }
}

export function spawnTrail(state, x, y, color) {
  if (state.particles.length >= MAX_PARTICLES) return;
  state.particles.push({
    x,
    y,
    vx: (Math.random() - 0.5) * 30,
    vy: (Math.random() - 0.5) * 30,
    life: 0.35,
    maxLife: 0.35,
    size: 5,
    color,
    drag: 0.92,
  });
}

export function addText(state, x, y, text, color = '#f2f4ff', size = 15) {
  if (state.texts.length >= MAX_TEXTS) state.texts.shift();
  state.texts.push({ x, y, text, life: 0.9, maxLife: 0.9, color, size });
}

export function addShake(state, amount) {
  state.shake = Math.min(14, state.shake + amount);
}

export function updateParticles(state, dt) {
  const ps = state.particles;
  for (let i = ps.length - 1; i >= 0; i--) {
    const p = ps[i];
    p.life -= dt;
    if (p.life <= 0) {
      ps.splice(i, 1);
      continue;
    }
    const d = Math.pow(p.drag, dt * 60);
    p.vx *= d;
    p.vy *= d;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  const ts = state.texts;
  for (let i = ts.length - 1; i >= 0; i--) {
    const t = ts[i];
    t.life -= dt;
    t.y -= 34 * dt;
    if (t.life <= 0) ts.splice(i, 1);
  }
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 34);
}

export function shakeOffset(state) {
  if (state.shake <= 0.2) return { x: 0, y: 0 };
  const s = state.shake;
  return { x: (Math.random() - 0.5) * s, y: (Math.random() - 0.5) * s };
}
