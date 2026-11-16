// Keyboard and pointer input. Held keys give a move vector and a firing state;
// one-shot presses (confirm, pause, dash, mute, restart) are queued as bit
// flags and taken once by the loop, so a press between frames is never lost.

import { toLogical } from './view.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_DASH = 4;
export const ACTION_MUTE = 8;
export const ACTION_RESTART = 16;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Enter']);
const DASH = new Set(['Space', 'ShiftLeft', 'ShiftRight']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);
const RESTART = new Set(['KeyR']);

export function createInput(canvas, getView) {
  const keys = new Set();
  let actions = 0;
  let mouseX = 640;
  let mouseY = 300;
  let firing = false;

  window.addEventListener('keydown', (event) => {
    if (UP.has(event.code) || DOWN.has(event.code) || LEFT.has(event.code) || RIGHT.has(event.code)) {
      keys.add(event.code);
      event.preventDefault();
    } else if (DASH.has(event.code)) {
      if (!event.repeat) actions |= ACTION_DASH;
      event.preventDefault();
    } else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else if (RESTART.has(event.code)) {
      if (!event.repeat) actions |= ACTION_RESTART;
    }
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
  });
  window.addEventListener('blur', () => {
    keys.clear();
    firing = false;
  });
  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    const p = toLogical(getView(), event.clientX - rect.left, event.clientY - rect.top);
    mouseX = p.x;
    mouseY = p.y;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const p = toLogical(getView(), event.clientX - rect.left, event.clientY - rect.top);
    mouseX = p.x;
    mouseY = p.y;
    firing = true;
    actions |= ACTION_CONFIRM;
  });
  window.addEventListener('pointerup', () => {
    firing = false;
  });

  return {
    moveVector() {
      let x = 0;
      let y = 0;
      if (keys.has('ArrowLeft') || keys.has('KeyA')) x -= 1;
      if (keys.has('ArrowRight') || keys.has('KeyD')) x += 1;
      if (keys.has('ArrowUp') || keys.has('KeyW')) y -= 1;
      if (keys.has('ArrowDown') || keys.has('KeyS')) y += 1;
      if (x !== 0 && y !== 0) {
        const inv = 1 / Math.hypot(x, y);
        x *= inv;
        y *= inv;
      }
      return { x, y };
    },
    mouse() {
      return { x: mouseX, y: mouseY };
    },
    isFiring() {
      return firing;
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
