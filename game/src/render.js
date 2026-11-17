// The renderer: one canvas, a logical 1280x720 field scaled to fit, and every
// screen — field, entities, HUD, menus and the upgrade draft — painted from
// the state. Nothing here mutates state.

import { COLORS, H, TOTAL_WAVES, W } from './config.js';
import { computeView } from './view.js';
import { shakeOffset } from './particles.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_DRAFT = 'draft';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const FONT = (size, weight = 700) => `${weight} ${size}px system-ui, -apple-system, sans-serif`;

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let view = computeView(canvas.clientWidth || W, canvas.clientHeight || H);

  function resize() {
    canvas.width = canvas.clientWidth || W;
    canvas.height = canvas.clientHeight || H;
    view = computeView(canvas.width, canvas.height);
  }
  resize();
  window.addEventListener('resize', resize);

  return {
    getView() {
      return view;
    },
    draw(state, screen, best, nowMs = 0) {
      resize();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = COLORS.bg0;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const shake = shakeOffset(state);
      ctx.setTransform(view.scale, 0, 0, view.scale, view.ox + shake.x * view.scale, view.oy + shake.y * view.scale);
      drawField(ctx, nowMs);
      drawPickups(ctx, state);
      drawEnemies(ctx, state, nowMs);
      if (state.player.alive && screen !== SCREEN_TITLE) drawPlayer(ctx, state, nowMs);
      drawBullets(ctx, state);
      drawParticles(ctx, state);
      drawNova(ctx, state);
      drawTexts(ctx, state);
      if (screen === SCREEN_PLAY || screen === SCREEN_DRAFT || screen === SCREEN_PAUSED) drawHud(ctx, state, best);
      if (screen === SCREEN_TITLE) drawTitle(ctx, state, best);
      if (screen === SCREEN_DRAFT) drawDraft(ctx, state);
      if (screen === SCREEN_PAUSED) drawCenter(ctx, 'PAUSED', 'P or Esc to resume — M to mute');
      if (screen === SCREEN_OVER) drawEnd(ctx, state, best, false);
      if (screen === SCREEN_WIN) drawEnd(ctx, state, best, true);
    },
  };
}

function drawField(ctx, nowMs) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, COLORS.bg1);
  g.addColorStop(1, COLORS.bg0);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // Lantern posts on a grid, with a soft glow that breathes.
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  for (let x = 80; x < W; x += 160) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 80; y < H; y += 160) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  for (let x = 80; x < W; x += 160) {
    for (let y = 80; y < H; y += 160) {
      const breathe = 0.5 + 0.5 * Math.sin(nowMs / 900 + (x + y) / 90);
      ctx.fillStyle = `rgba(255,210,122,${0.16 + breathe * 0.18})`;
      ctx.beginPath();
      ctx.arc(x, y, 5 + breathe * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Ambient drifting embers.
  for (let i = 0; i < 14; i++) {
    const x = ((i * 173 + nowMs * 0.008) % (W + 40)) - 20;
    const y = 60 + ((i * 97) % (H - 120)) + Math.sin(nowMs / 1400 + i) * 8;
    ctx.fillStyle = 'rgba(255,157,46,0.35)';
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  // Vignette.
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.85);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

function drawPickups(ctx, state) {
  for (const pk of state.pickups) {
    const blink = pk.life < 3 ? (Math.sin(pk.life * 10) > 0 ? 1 : 0.35) : 1;
    ctx.globalAlpha = blink;
    if (pk.kind === 'ember') {
      ctx.fillStyle = COLORS.ember;
      ctx.beginPath();
      ctx.arc(pk.x, pk.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff3d6';
      ctx.beginPath();
      ctx.arc(pk.x, pk.y, 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = COLORS.star;
      drawStar(ctx, pk.x, pk.y, 11, 5);
    }
    ctx.globalAlpha = 1;
  }
}

function drawStar(ctx, x, y, r, points) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const px = x + Math.cos(a) * rad;
    const py = y + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function drawEnemies(ctx, state, nowMs) {
  for (const e of state.enemies) {
    const color = COLORS[e.type] || '#ffffff';
    const flash = e.type === 'boss' && e.mode === 'telegraph' ? (Math.sin(nowMs / 60) > 0 ? 1 : 0.4) : 1;
    ctx.globalAlpha = flash;
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    if (e.type === 'mote') {
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === 'wisp') {
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(e.x - 3, e.y - 3, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    } else if (e.type === 'spitter') {
      ctx.beginPath();
      ctx.moveTo(e.x, e.y - e.r);
      ctx.lineTo(e.x + e.r, e.y);
      ctx.lineTo(e.x, e.y + e.r);
      ctx.lineTo(e.x - e.r, e.y);
      ctx.closePath();
      ctx.fill();
    } else if (e.type === 'splitter') {
      ctx.beginPath();
      ctx.moveTo(e.x, e.y - e.r);
      ctx.lineTo(e.x + e.r, e.y + e.r * 0.8);
      ctx.lineTo(e.x - e.r, e.y + e.r * 0.8);
      ctx.closePath();
      ctx.fill();
    } else if (e.type === 'husk') {
      ctx.fillRect(e.x - e.r, e.y - e.r, e.r * 2, e.r * 2);
    } else if (e.type === 'bomber') {
      // Spiked circle with a pulsing core; while the fuse is armed it flashes
      // white/orange as a telegraph before it blows.
      const pulse = 1 + 0.15 * Math.sin(nowMs / 120);
      ctx.fillStyle = e.armed && Math.sin(nowMs / 70) > 0 ? '#ffffff' : color;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + e.t;
        const a2 = a + 0.35;
        ctx.moveTo(e.x + Math.cos(a) * e.r, e.y + Math.sin(a) * e.r);
        ctx.lineTo(e.x + Math.cos(a) * (e.r + 7), e.y + Math.sin(a) * (e.r + 7));
        ctx.lineTo(e.x + Math.cos(a2) * e.r, e.y + Math.sin(a2) * e.r);
      }
      ctx.fill();
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r * 0.75 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff3d6';
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r * 0.3 * pulse, 0, Math.PI * 2);
      ctx.fill();
      if (e.armed) {
        // Fuse ring: it closes in and brightens as the 0.7 s fuse burns down.
        const fp = Math.max(0, Math.min(1, e.fuse / 0.7));
        ctx.strokeStyle = `rgba(255,255,255,${0.35 + 0.65 * (1 - fp)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r + 8 + (1 - fp) * 6, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (e.type === 'healer') {
      // Soft lime glow, then a plus/cross mark. While a heal pulse is out,
      // an expanding green ring shows the radius it just healed.
      const g = ctx.createRadialGradient(e.x, e.y, 2, e.x, e.y, e.r + 12);
      g.addColorStop(0, 'rgba(184,255,46,0.35)');
      g.addColorStop(1, 'rgba(184,255,46,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r + 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      const w = e.r * 0.45;
      ctx.fillRect(e.x - w, e.y - e.r, w * 2, e.r * 2);
      ctx.fillRect(e.x - e.r, e.y - w, e.r * 2, w * 2);
      if (e.healPulse > 0) {
        const p = 1 - e.healPulse / 0.5;
        ctx.strokeStyle = `rgba(184,255,46,${1 - p})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 20 + p * 140, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (e.type === 'boss') {
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r * 0.62, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#2a0a2e';
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Elites wear a gold ring so the player can spot the triple-HP threat.
    if (e.elite) {
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r + 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Health bar for the tough ones.
    if ((e.type === 'husk' || e.type === 'boss' || e.elite) && e.hp < e.maxHp) {
      const w = e.type === 'boss' ? 120 : 44;
      const x = e.x - w / 2;
      const y = e.y - e.r - 12;
      ctx.fillStyle = COLORS.hpBg;
      ctx.fillRect(x, y, w, 6);
      ctx.fillStyle = COLORS.hp;
      ctx.fillRect(x, y, w * (e.hp / e.maxHp), 6);
    }
  }
}

function drawPlayer(ctx, state, nowMs) {
  const p = state.player;
  const blink = p.invuln > 0 && Math.sin(nowMs / 50) > 0 ? 0.45 : 1;
  ctx.globalAlpha = blink;
  // Glow.
  const g = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, 44);
  g.addColorStop(0, 'rgba(255,180,58,0.5)');
  g.addColorStop(1, 'rgba(255,180,58,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 44, 0, Math.PI * 2);
  ctx.fill();
  // Body.
  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
  ctx.fill();
  // Flame ring, rotating.
  ctx.strokeStyle = COLORS.playerRing;
  ctx.lineWidth = 3;
  const a0 = nowMs / 500;
  for (let i = 0; i < 3; i++) {
    const a = a0 + (i / 3) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 21, a, a + 1.1);
    ctx.stroke();
  }
  // Aim tick.
  ctx.strokeStyle = '#fff3d6';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(p.x + Math.cos(p.angle) * 20, p.y + Math.sin(p.angle) * 20);
  ctx.lineTo(p.x + Math.cos(p.angle) * 30, p.y + Math.sin(p.angle) * 30);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawBullets(ctx, state) {
  ctx.globalCompositeOperation = 'lighter';
  for (const b of state.bullets) {
    ctx.fillStyle = b.crit ? '#ff9d2e' : COLORS.bullet;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.crit ? 6 : 4, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const o of state.orbs) {
    ctx.fillStyle = COLORS.orb;
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.r + 2.5, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
}

function drawParticles(ctx, state) {
  ctx.globalCompositeOperation = 'lighter';
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

function drawNova(ctx, state) {
  const fx = state.novaFx;
  if (!fx) return;
  const p = Math.min(1, fx.t / fx.dur);
  ctx.strokeStyle = `rgba(255,210,122,${1 - p})`;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(fx.x, fx.y, Math.max(1, fx.maxR * p), 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = `rgba(255,210,122,${(1 - p) * 0.5})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(fx.x, fx.y, Math.max(1, fx.maxR * p * 0.7), 0, Math.PI * 2);
  ctx.stroke();
}

function drawTexts(ctx, state) {
  ctx.textAlign = 'center';
  for (const t of state.texts) {
    ctx.font = FONT(t.size || 15);
    ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}

function drawHud(ctx, state, best) {
  const p = state.player;
  ctx.textAlign = 'left';
  // HP bar.
  ctx.fillStyle = COLORS.hpBg;
  ctx.fillRect(24, 22, 220, 18);
  ctx.fillStyle = p.hp / p.maxHp > 0.3 ? '#7dffb0' : COLORS.hp;
  ctx.fillRect(24, 22, 220 * Math.max(0, p.hp / p.maxHp), 18);
  ctx.fillStyle = COLORS.text;
  ctx.font = FONT(15);
  ctx.fillText(`HP ${Math.ceil(p.hp)} / ${p.maxHp}`, 24, 58);
  // Wave, centre.
  ctx.textAlign = 'center';
  ctx.font = FONT(22);
  ctx.fillText(`WAVE ${Math.max(1, state.wave)} / ${TOTAL_WAVES}`, W / 2, 40);
  const left = state.enemies.length + state.spawnQueue.length;
  ctx.font = FONT(14, 500);
  ctx.fillStyle = COLORS.dim;
  ctx.fillText(state.waveState === 'clear' ? 'Wave cleared' : `${left} shade${left === 1 ? '' : 's'} left`, W / 2, 62);
  // Score, right.
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.text;
  ctx.font = FONT(22);
  ctx.fillText(`SCORE ${state.score}`, W - 24, 40);
  ctx.font = FONT(14, 500);
  ctx.fillStyle = COLORS.dim;
  ctx.fillText(`BEST ${Math.max(best, state.score)}`, W - 24, 62);
  if (state.combo > 1) {
    ctx.fillStyle = COLORS.star;
    ctx.font = FONT(16);
    ctx.fillText(`COMBO x${(1 + Math.min(state.combo, 50) * 0.02).toFixed(2)} (${state.combo})`, W - 24, 86);
  }
  if (state.starTimer > 0) {
    ctx.fillStyle = COLORS.star;
    ctx.font = FONT(16);
    ctx.fillText(`2x SCORE ${Math.ceil(state.starTimer)}s`, W - 24, 108);
  }
  // Dash, bottom left.
  ctx.textAlign = 'left';
  const dashReady = p.dashTimer <= 0;
  ctx.fillStyle = COLORS.hpBg;
  ctx.fillRect(24, H - 40, 120, 10);
  ctx.fillStyle = dashReady ? COLORS.player : COLORS.dim;
  ctx.fillRect(24, H - 40, 120 * (dashReady ? 1 : 1 - p.dashTimer / p.dashCooldown), 10);
  ctx.fillStyle = COLORS.text;
  ctx.font = FONT(13, 500);
  ctx.fillText(dashReady ? 'DASH ready — Space' : 'DASH recharging', 24, H - 48);
  // Nova Burst, bottom left above the dash bar, once the upgrade is owned.
  if (p.novaLevel > 0) {
    const cd = 6 - (p.novaLevel - 1) * 0.7;
    const frac = Math.max(0, Math.min(1, 1 - p.novaTimer / cd));
    ctx.fillStyle = COLORS.hpBg;
    ctx.fillRect(24, H - 64, 120, 10);
    ctx.fillStyle = frac >= 1 ? '#ffd27a' : COLORS.dim;
    ctx.fillRect(24, H - 64, 120 * frac, 10);
    ctx.fillStyle = COLORS.text;
    ctx.font = FONT(13, 500);
    ctx.fillText(frac >= 1 ? `NOVA Lv${p.novaLevel} ready` : `NOVA Lv${p.novaLevel} charging`, 24, H - 72);
  }
  // Upgrades owned, bottom right.
  const owned = state.upgradesOwned;
  if (owned.length > 0) {
    ctx.textAlign = 'right';
    ctx.font = FONT(13, 500);
    ctx.fillStyle = COLORS.dim;
    ctx.fillText(`Upgrades: ${owned.length}`, W - 24, H - 48);
  }
}

function drawCenter(ctx, title, sub) {
  ctx.fillStyle = 'rgba(8,10,24,0.6)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.text;
  ctx.font = FONT(56);
  ctx.fillText(title, W / 2, H / 2 - 10);
  ctx.font = FONT(18, 500);
  ctx.fillStyle = COLORS.dim;
  ctx.fillText(sub, W / 2, H / 2 + 34);
}

function drawTitle(ctx, state, best) {
  ctx.fillStyle = 'rgba(8,10,24,0.45)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.lantern;
  ctx.font = FONT(84);
  ctx.fillText('EMBERFALL', W / 2, 250);
  ctx.fillStyle = COLORS.text;
  ctx.font = FONT(22, 500);
  ctx.fillText('The last Ember Warden. Ten waves of shade. One fading light.', W / 2, 296);
  ctx.fillStyle = COLORS.dim;
  ctx.font = FONT(17, 500);
  ctx.fillText('WASD move  ·  Mouse aim  ·  Click or hold to shoot  ·  Space dash  ·  P pause  ·  M mute', W / 2, 350);
  ctx.fillStyle = COLORS.player;
  ctx.font = FONT(24);
  ctx.fillText('Click or press Space to start', W / 2, 420);
  if (best > 0) {
    ctx.fillStyle = COLORS.dim;
    ctx.font = FONT(17, 500);
    ctx.fillText(`Best score: ${best}`, W / 2, 462);
  }
}

export function layoutDraft() {
  const w = 300;
  const h = 190;
  const gap = 28;
  const total = w * 3 + gap * 2;
  const x0 = (W - total) / 2;
  const y = 250;
  return [0, 1, 2].map((i) => ({ x: x0 + i * (w + gap), y, w, h, index: i }));
}

function drawDraft(ctx, state) {
  ctx.fillStyle = 'rgba(8,10,24,0.62)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.text;
  ctx.font = FONT(34);
  ctx.fillText(`WAVE ${state.wave} CLEARED`, W / 2, 190);
  ctx.font = FONT(19, 500);
  ctx.fillStyle = COLORS.dim;
  ctx.fillText('Choose an upgrade — click a card, or press 1, 2 or 3', W / 2, 222);
  const rects = layoutDraft();
  state.draft.forEach((u, i) => {
    const r = rects[i];
    ctx.fillStyle = COLORS.card;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = COLORS.cardEdge;
    ctx.lineWidth = 2;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = COLORS.lantern;
    ctx.font = FONT(15, 500);
    ctx.fillText(`[ ${i + 1} ]`, r.x + r.w / 2, r.y + 34);
    ctx.fillStyle = COLORS.text;
    ctx.font = FONT(22);
    ctx.fillText(u.name, r.x + r.w / 2, r.y + 76);
    ctx.fillStyle = COLORS.dim;
    ctx.font = FONT(16, 500);
    ctx.fillText(u.desc, r.x + r.w / 2, r.y + 112);
  });
}

function drawEnd(ctx, state, best, won) {
  ctx.fillStyle = 'rgba(8,10,24,0.66)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = won ? COLORS.lantern : COLORS.hp;
  ctx.font = FONT(52);
  ctx.fillText(won ? 'THE GARDEN BURNS BRIGHT' : 'THE EMBER DIES', W / 2, 260);
  ctx.fillStyle = COLORS.text;
  ctx.font = FONT(20, 500);
  ctx.fillText(won ? 'All ten waves survived. The lantern garden lives.' : `Fell on wave ${Math.max(1, state.wave)} of ${TOTAL_WAVES}.`, W / 2, 306);
  ctx.font = FONT(30);
  ctx.fillText(`SCORE ${state.score}`, W / 2, 368);
  ctx.font = FONT(18, 500);
  ctx.fillStyle = COLORS.dim;
  ctx.fillText(`Best ${Math.max(best, state.score)}  ·  ${state.kills} shades banished`, W / 2, 404);
  ctx.fillStyle = COLORS.player;
  ctx.font = FONT(22);
  ctx.fillText('Press R or click to play again', W / 2, 462);
}
