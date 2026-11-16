// The viewport transform: the logical field is W x H, drawn scaled to fit the
// canvas with letterboxing. Input and render share this, so a mouse position
// always maps to the same logical point the renderer paints.

import { W, H } from './config.js';

export function computeView(canvasWidth, canvasHeight) {
  const scale = Math.min(canvasWidth / W, canvasHeight / H);
  return {
    scale,
    ox: (canvasWidth - W * scale) / 2,
    oy: (canvasHeight - H * scale) / 2,
    width: canvasWidth,
    height: canvasHeight,
  };
}

export function toLogical(view, clientX, clientY) {
  return {
    x: (clientX - view.ox) / view.scale,
    y: (clientY - view.oy) / view.scale,
  };
}

export function insideField(x, y, margin = 0) {
  return x > margin && x < W - margin && y > margin && y < H - margin;
}
