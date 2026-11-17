// The renderer: one canvas, a logical 1280x720 field scaled to fit, and every
// screen — field, entities, HUD, menus and the upgrade draft — painted from
// the state. Nothing here mutates state.
//
// Visual identity (visual polish pass): the field is the layered lantern
// garden from background.js, and every creature is a chunky pixel-art sprite
// from sprites.js — the warden, the shades and the Hollow King are shapes you
// can tell apart at a glance, not coloured geometry. Gameplay drawing that
// carries information — elite gold rings, health bars, the bomber fuse ring,
// the healer pulse ring, the nova ring — is kept exactly as before.

import { COLORS, H, TOTAL_WAVES, W, regionForWave } from './config.js';
import { computeView } from './view.js';
import { shakeOffset } from './particles.js';
import { drawBackground } from './background.js';
import { drawSprite } from './sprites.js';
import { drawRing } from './ring.js';

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
      drawBackground(ctx, state.player.x, state.player.y, nowMs, regionForWave(Math.max(1, state.wave)));
      drawPickups(ctx, state);
      drawEnemies(ctx, state, nowMs);
      if (state.player.alive && screen !== SCREEN_TITLE) drawPlayer(ctx, state, nowMs);
      drawRing(ctx, state);
      drawBullets(ctx, state);
      drawParticles(ctx, state);
      drawNova(ctx, state);
      drawTexts(ctx, state);
      if (screen === SCREEN_PLAY || screen === SCREEN_DRAFT || screen === SCREEN_PAUSED) drawHud(ctx, state, best);
      if (state.regionBanner && (screen === SCREEN_PLAY || screen === SCREEN_DRAFT)) drawRegionBanner(ctx, state);
      if (screen === SCREEN_TITLE) drawTitle(ctx, state, best, nowMs);
      if (screen === SCREEN_DRAFT) drawDraft(ctx, state);
      if (screen === SCREEN_PAUSED) drawCenter(ctx, 'PAUSED', 'P or Esc to resume — M to mute');
      if (screen === SCREEN_OVER) drawEnd(ctx, state, best, false, nowMs);
      if (screen === SCREEN_WIN) drawEnd(ctx, state, best, true, nowMs);
    },
  };
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
    } else if (pk.kind === 'shard') {
      // A shard: a hot-pink diamond with a white-hot core and a soft glow,
      // so it reads as a third pickup at a glance.
      const glow = ctx.createRadialGradient(pk.x, pk.y, 1, pk.x, pk.y, 20);
      glow.addColorStop(0, COLORS.shardGlow);
      glow.addColorStop(1, 'rgba(255,46,136,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(pk.x, pk.y, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.shard;
      ctx.beginPath();
      ctx.moveTo(pk.x, pk.y - 11);
      ctx.lineTo(pk.x + 8, pk.y);
      ctx.lineTo(pk.x, pk.y + 11);
      ctx.lineTo(pk.x - 8, pk.y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(pk.x, pk.y - 5);
      ctx.lineTo(pk.x + 3.5, pk.y);
      ctx.lineTo(pk.x, pk.y + 5);
      ctx.lineTo(pk.x - 3.5, pk.y);
      ctx.closePath();
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
    // The boss flashes while it telegraphs a charge.
    const flash = e.type === 'boss' && e.mode === 'telegraph' ? (Math.sin(nowMs / 60) > 0 ? 1 : 0.4) : 1;
    ctx.globalAlpha = flash;
    // Pixel-art sprite, chunky at ~2.6x the collision radius. Elites wear
    // the baked gold outline as well as the gold ring below.
    drawSprite(ctx, e.type, e.x, e.y, e.r * 2.6, nowMs, { elite: e.elite });
    ctx.globalAlpha = 1;
    if (e.type === 'bomber' && e.armed) {
      // The fuse burns: the sprite flashes white-hot and the ring closes in
      // and brightens over the 0.7 s fuse.
      if (Math.sin(nowMs / 70) > 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.28)';
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r * 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      const fp = Math.max(0, Math.min(1, e.fuse / 0.7));
      ctx.strokeStyle = `rgba(255,255,255,${0.35 + 0.65 * (1 - fp)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r + 8 + (1 - fp) * 6, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (e.type === 'healer' && e.healPulse > 0) {
      // The expanding green ring shows the radius the pulse just healed.
      const p = 1 - e.healPulse / 0.5;
      ctx.strokeStyle = `rgba(184,255,46,${1 - p})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 20 + p * 140, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Elites wear a gold ring so the player can spot the triple-HP threat.
    if (e.elite) {
      ctx.strokeStyle = COLORS.gold;
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
  // The warden's lantern glow: a warm pool that breathes with the flame.
  const breathe = 0.85 + 0.15 * Math.sin(nowMs / 700);
  const g = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, 58);
  g.addColorStop(0, `rgba(255,180,58,${0.5 * breathe})`);
  g.addColorStop(1, 'rgba(255,180,58,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 58, 0, Math.PI * 2);
  ctx.fill();
  // A shard buff wraps the warden in a hot-pink ring while +50% damage lasts.
  if (state.shardTimer > 0) {
    const pulse = 0.5 + 0.5 * Math.sin(nowMs / 180);
    ctx.strokeStyle = `rgba(255,46,136,${0.55 + pulse * 0.35})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 30 + pulse * 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  // The warden sprite, turned to face the aim. The grid faces up, so the
  // aim angle needs a quarter turn.
  drawSprite(ctx, 'player', p.x, p.y, 52, nowMs, { angle: p.angle + Math.PI / 2 });
  // Aim tick, just past the lantern.
  ctx.strokeStyle = '#fff3d6';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(p.x + Math.cos(p.angle) * 26, p.y + Math.sin(p.angle) * 26);
  ctx.lineTo(p.x + Math.cos(p.angle) * 36, p.y + Math.sin(p.angle) * 36);
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
  // Wave and region, centre.
  ctx.textAlign = 'center';
  ctx.font = FONT(22);
  const region = regionForWave(Math.max(1, state.wave));
  ctx.fillText(`WAVE ${Math.max(1, state.wave)} / ${TOTAL_WAVES} · ${region.name}`, W / 2, 40);
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
  // Shard buff: the damage timer, and the run's shard counter below it.
  if (state.shardTimer > 0) {
    ctx.fillStyle = COLORS.shard;
    ctx.font = FONT(16);
    ctx.fillText(`+50% DAMAGE ${Math.ceil(state.shardTimer)}s`, W - 24, state.starTimer > 0 ? 130 : 108);
  }
  if (state.shardCount > 0) {
    ctx.fillStyle = COLORS.shard;
    ctx.font = FONT(14, 500);
    ctx.fillText(`◆ SHARDS ${state.shardCount}`, W - 24, state.shardTimer > 0 ? 152 : 130);
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
  // Kept clear of the dash label below it (the label's glyphs reach ~12 px
  // above its baseline).
  if (p.novaLevel > 0) {
    const cd = 6 - (p.novaLevel - 1) * 0.7;
    const frac = Math.max(0, Math.min(1, 1 - p.novaTimer / cd));
    ctx.fillStyle = COLORS.hpBg;
    ctx.fillRect(24, H - 72, 120, 10);
    ctx.fillStyle = frac >= 1 ? '#ffd27a' : COLORS.dim;
    ctx.fillRect(24, H - 72, 120 * frac, 10);
    ctx.fillStyle = COLORS.text;
    ctx.font = FONT(13, 500);
    ctx.fillText(frac >= 1 ? `NOVA Lv${p.novaLevel} ready` : `NOVA Lv${p.novaLevel} charging`, 24, H - 80);
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

function drawRegionBanner(ctx, state) {
  const b = state.regionBanner;
  if (!b) return;
  // Fades in over the first half-second, holds, then fades out.
  const age = b.dur - b.t;
  const alpha = Math.min(1, age / 0.4, b.t / 0.6);
  ctx.textAlign = 'center';
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.shadowColor = COLORS.titleGlow;
  ctx.shadowBlur = 24;
  ctx.fillStyle = COLORS.lantern;
  ctx.font = FONT(40);
  ctx.fillText(b.name, W / 2, 150);
  ctx.shadowBlur = 0;
  ctx.fillStyle = COLORS.dim;
  ctx.font = FONT(17, 500);
  ctx.fillText('a new region — new shades, new ground', W / 2, 182);
  ctx.globalAlpha = 1;
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

// A row of tiny pixel lanterns — the motif under the title and end screens.
function drawLanternRow(ctx, cx, y, count, gap) {
  const x0 = cx - ((count - 1) * gap) / 2;
  for (let i = 0; i < count; i++) {
    const x = x0 + i * gap;
    ctx.fillStyle = '#241a33';
    ctx.fillRect(x - 5, y - 6, 10, 11);
    ctx.fillStyle = COLORS.lantern;
    ctx.fillRect(x - 3, y - 4, 6, 7);
    ctx.fillStyle = '#fff3d6';
    ctx.fillRect(x - 1, y - 2, 2, 3);
  }
}

export function layoutContinue() {
  // The Continue button on the title screen; null when there is nothing to
  // continue from (best wave 1 or below). main.js hit-tests clicks against it.
  return { x: W / 2 - 190, y: 470, w: 380, h: 52 };
}

function drawTitle(ctx, state, best, nowMs) {
  ctx.fillStyle = 'rgba(8,10,24,0.45)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  // The title glows like a lantern.
  ctx.shadowColor = COLORS.titleGlow;
  ctx.shadowBlur = 32;
  ctx.fillStyle = COLORS.lantern;
  ctx.font = FONT(84);
  ctx.fillText('EMBERFALL', W / 2, 250);
  ctx.shadowBlur = 0;
  // A thin gold rule under the title.
  ctx.fillStyle = COLORS.gold;
  ctx.fillRect(W / 2 - 130, 272, 260, 3);
  ctx.fillStyle = COLORS.text;
  ctx.font = FONT(22, 500);
  ctx.fillText('The last Ember Warden. Ten waves of shade. One fading light.', W / 2, 316);
  ctx.fillStyle = COLORS.dim;
  ctx.font = FONT(17, 500);
  ctx.fillText('WASD move  ·  Mouse aim  ·  Click or hold to shoot  ·  Space dash  ·  P pause  ·  M mute', W / 2, 352);
  ctx.fillStyle = COLORS.player;
  ctx.font = FONT(24);
  ctx.fillText('Click or press Space to start', W / 2, 408);
  if (best > 0 || state.bestWave > 1) {
    ctx.fillStyle = COLORS.dim;
    ctx.font = FONT(17, 500);
    const parts = [];
    if (best > 0) parts.push(`Best score: ${best}`);
    if (state.bestWave > 1) parts.push(`Best wave: ${state.bestWave} / ${TOTAL_WAVES}`);
    ctx.fillText(parts.join('  ·  '), W / 2, 448);
  }
  // Continue: resume at the best wave reached, with one random upgrade per
  // wave skipped (see grantCatchUpUpgrades). Only offered past wave 1.
  if (state.bestWave > 1) {
    const r = layoutContinue();
    ctx.fillStyle = 'rgba(20,26,51,0.92)';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = COLORS.shard;
    ctx.lineWidth = 2;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = COLORS.text;
    ctx.font = FONT(20);
    ctx.fillText(`CONTINUE — WAVE ${state.bestWave}`, W / 2, r.y + 33);
    ctx.fillStyle = COLORS.dim;
    ctx.font = FONT(14, 500);
    ctx.fillText('Click the button, or press C', W / 2, r.y + r.h + 24);
  }
  // The warden stands below the text, flanked by two shades — the cast, in
  // one look.
  drawSprite(ctx, 'player', W / 2, 580, 72, nowMs);
  drawSprite(ctx, 'mote', W / 2 - 130, 592, 36, nowMs);
  drawSprite(ctx, 'wisp', W / 2 + 130, 592, 36, nowMs);
  drawLanternRow(ctx, W / 2, 652, 7, 26);
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
  ctx.shadowColor = COLORS.titleGlow;
  ctx.shadowBlur = 18;
  ctx.fillStyle = COLORS.text;
  ctx.font = FONT(34);
  ctx.fillText(`WAVE ${state.wave} CLEARED`, W / 2, 190);
  ctx.shadowBlur = 0;
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
    // A lit top edge, like a lantern's rim.
    ctx.fillStyle = COLORS.lantern;
    ctx.fillRect(r.x, r.y, r.w, 4);
    ctx.fillStyle = COLORS.lantern;
    ctx.font = FONT(15, 500);
    ctx.fillText(`[ ${i + 1} ]`, r.x + r.w / 2, r.y + 38);
    ctx.fillStyle = COLORS.text;
    ctx.font = FONT(22);
    ctx.fillText(u.name, r.x + r.w / 2, r.y + 80);
    ctx.fillStyle = COLORS.dim;
    ctx.font = FONT(16, 500);
    ctx.fillText(u.desc, r.x + r.w / 2, r.y + 116);
  });
}

function drawEnd(ctx, state, best, won, nowMs) {
  ctx.fillStyle = 'rgba(8,10,24,0.66)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.shadowColor = won ? COLORS.titleGlow : 'rgba(255,93,93,0.5)';
  ctx.shadowBlur = 26;
  ctx.fillStyle = won ? COLORS.lantern : COLORS.hp;
  ctx.font = FONT(52);
  ctx.fillText(won ? 'THE GARDEN BURNS BRIGHT' : 'THE EMBER DIES', W / 2, 250);
  ctx.shadowBlur = 0;
  ctx.fillStyle = COLORS.gold;
  ctx.fillRect(W / 2 - 110, 270, 220, 3);
  ctx.fillStyle = COLORS.text;
  ctx.font = FONT(20, 500);
  ctx.fillText(won ? 'All ten waves survived. The lantern garden lives.' : `Fell on wave ${Math.max(1, state.wave)} of ${TOTAL_WAVES}.`, W / 2, 308);
  ctx.font = FONT(30);
  ctx.fillText(`SCORE ${state.score}`, W / 2, 366);
  ctx.font = FONT(18, 500);
  ctx.fillStyle = COLORS.dim;
  ctx.fillText(`Best ${Math.max(best, state.score)}  ·  ${state.kills} shades banished  ·  ${state.shardCount} shard${state.shardCount === 1 ? '' : 's'} collected`, W / 2, 402);
  ctx.fillStyle = COLORS.player;
  ctx.font = FONT(22);
  ctx.fillText('Press R or click to play again', W / 2, 452);
  // The warden, lantern still lit, under the victory — or a lone shade where
  // the light went out.
  if (won) {
    drawSprite(ctx, 'player', W / 2, 540, 72, nowMs);
    drawLanternRow(ctx, W / 2, 612, 7, 26);
  } else {
    ctx.globalAlpha = 0.7;
    drawSprite(ctx, 'mote', W / 2, 540, 56, nowMs);
    ctx.globalAlpha = 1;
  }
}
