// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between six screens: title, play,
// draft, paused, game over and victory.
//
// ?seed=N fixes the random pattern. ?shot=start|play|end (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, BEST_WAVE_KEY, COMBO_WINDOW, STEP } from './config.js';
import { createRandom } from './random.js';
import { createState, resetRun } from './state.js';
import { ACTION_CONFIRM, ACTION_CONTINUE, ACTION_DASH, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { createRenderer, layoutContinue, layoutDraft, SCREEN_DRAFT, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { startWave, updateWaves } from './waves.js';
import { updateEnemies } from './enemies.js';
import { updateBullets, updateOrbs } from './bullets.js';
import { updatePickups, updatePlayer } from './player.js';
import { updateNova } from './nova.js';
import { updateRing } from './ring.js';
import { updateParticles } from './particles.js';
import { applyUpgrade, grantCatchUpUpgrades } from './upgrades.js';
import { setMuted, sfx } from './audio.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const random = createRandom(seed);
const state = createState();
const renderer = createRenderer(canvas);
// Test hook: lets an automated play-test read the live state and drive the
// game. It changes nothing about play; a human player never sees it.
window.__emberfall = state;

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function readBestWave() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_WAVE_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBestWave(value) {
  try {
    window.localStorage.setItem(BEST_WAVE_KEY, String(value));
  } catch {
    // Same as the best score: without storage the best wave lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, state, random);
  let painted = 0;
  function paint() {
    renderer.draw(state, scene.screen, scene.best, 1200);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas, () => renderer.getView());
  let best = readBest();
  let bestWave = readBestWave();
  state.bestWave = bestWave;
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function startGame(wave = 1) {
    resetRun(state);
    state.best = best;
    state.bestWave = bestWave;
    // Continue starts at the best wave reached, with one random upgrade per
    // wave skipped — see grantCatchUpUpgrades in upgrades.js.
    if (wave > 1) grantCatchUpUpgrades(state, wave, random);
    startWave(state, wave, random);
    announce(`Playing. Wave ${wave} of 10.`);
  }

  function endGame(won) {
    state.screen = won ? SCREEN_WIN : SCREEN_OVER;
    if (state.score > best) {
      best = state.score;
      saveBest(best);
    }
    if (state.wave > bestWave) {
      bestWave = state.wave;
      state.bestWave = bestWave;
      saveBestWave(bestWave);
    }
    if (won) sfx.win();
    else sfx.gameOver();
    announce(won ? `Victory. Score ${state.score}. Best ${best}.` : `Game over. Score ${state.score}. Best ${best}.`);
  }

  function chooseDraft(index) {
    if (state.screen !== SCREEN_DRAFT || !state.draft || !state.draft[index]) return;
    applyUpgrade(state, state.draft[index]);
    sfx.upgrade();
    state.draft = null;
    startWave(state, state.wave + 1, random);
    state.screen = SCREEN_PLAY;
    announce(`Wave ${state.wave} of 10.`);
  }

  // Draft cards are chosen by click (hit-tested against the drawn cards) or by keys 1-3.
  window.addEventListener('keydown', (event) => {
    if (state.screen !== SCREEN_DRAFT) return;
    const n = ['Digit1', 'Digit2', 'Digit3'].indexOf(event.code);
    if (n >= 0) chooseDraft(n);
  });

  function handleActions(actions) {
    if (actions & ACTION_MUTE) {
      state.muted = !state.muted;
      setMuted(state.muted);
      announce(state.muted ? 'Muted.' : 'Sound on.');
    }
    if (state.screen === SCREEN_TITLE) {
      // C continues at the best wave; a click on the Continue button does
      // the same; anything else on the title starts a fresh run at wave 1.
      if (actions & ACTION_CONTINUE) {
        if (bestWave > 1) startGame(bestWave);
      } else if (actions & (ACTION_CONFIRM | ACTION_DASH)) {
        const m = input.mouse();
        const r = layoutContinue();
        if (bestWave > 1 && m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h) {
          startGame(bestWave);
        } else {
          startGame(1);
        }
      }
    } else if (state.screen === SCREEN_PLAY) {
      if (actions & ACTION_PAUSE) {
        state.screen = SCREEN_PAUSED;
        announce('Paused.');
      }
    } else if (state.screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        state.screen = SCREEN_PLAY;
        announce('Playing.');
      }
    } else if (state.screen === SCREEN_DRAFT) {
      if (actions & ACTION_CONFIRM) {
        const m = input.mouse();
        const rects = layoutDraft();
        for (const r of rects) {
          if (m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h) {
            chooseDraft(r.index);
            break;
          }
        }
      }
    } else if (state.screen === SCREEN_OVER || state.screen === SCREEN_WIN) {
      if (actions & (ACTION_RESTART | ACTION_CONFIRM | ACTION_DASH)) startGame();
    }
  }

  function step(dt, actions) {
    if (state.screen !== SCREEN_PLAY) return;
    // Hit stop: an elite or boss kill freezes the world for a beat while the
    // renderer keeps painting, so the impact reads.
    if (state.hitStop > 0) {
      state.hitStop -= dt;
      return;
    }
    state.time += dt;
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }
    if (state.starTimer > 0) state.starTimer -= dt;
    if (state.shardTimer > 0) state.shardTimer -= dt;
    if (state.regionBanner) {
      state.regionBanner.t -= dt;
      if (state.regionBanner.t <= 0) state.regionBanner = null;
    }
    updatePlayer(state, dt, input, actions, random);
    updateNova(state, dt, random);
    updateRing(state, dt, random);
    updateEnemies(state, dt, random);
    updateBullets(state, dt, random);
    updateOrbs(state, dt);
    updatePickups(state, dt);
    updateParticles(state, dt);
    const event = updateWaves(state, dt, random);
    if (event === 'clear') {
      state.screen = SCREEN_DRAFT;
      announce(`Wave ${state.wave} cleared. Choose an upgrade.`);
    } else if (event === 'win') {
      endGame(true);
    }
    if (!state.player.alive && state.screen === SCREEN_PLAY) endGame(false);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions0 = input.takeActions();
    let actions = actions0;
    handleActions(actions);
    if (state.screen === SCREEN_PLAY) {
      while (accumulator >= STEP && state.screen === SCREEN_PLAY) {
        step(STEP, actions);
        accumulator -= STEP;
        // Actions are one-shot: only the first step of the frame sees them.
        actions = 0;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(state, state.screen, best, now);
  }

  // Leaving the tab pauses a running game rather than letting shades close in unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.screen === SCREEN_PLAY) {
      state.screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('EMBERFALL. Click or press Space to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
