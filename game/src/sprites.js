// Pixel-art sprites for EMBERFALL, drawn entirely in code.
//
// Every sprite is a grid of characters — one character per pixel, mapped to a
// colour in the sprite's palette — rendered once to a small offscreen canvas
// and then blitted large with smoothing off, so the art reads as chunky
// pixels. No image files, no network, nothing to load.
//
// Each sprite has 1-2 frames: frame 0 is the idle pose, frame 1 (where
// defined) is a small motion pose — a blink, a tail swing, a robe step, a
// pulsing core. The frame is picked from nowMs, so staged screenshots (fixed
// nowMs) always show the same frame. Elite variants get a baked gold outline.
//
// The grids face UP (north). The warden sprite is rotated to the aim angle
// when drawn; enemies are drawn unrotated.

const SPRITE_DEFS = {
  // The Ember Warden: a hooded figure with glowing amber eyes and a hand
  // lantern at their side. The robe hem steps in frame 1, the lantern flame
  // flickers white-hot.
  player: {
    palette: {
      K: '#1c1026', // outline
      D: '#3a2350', // hood shadow
      Y: '#ffe9a8', // glowing eyes / lantern core
      W: '#fff3d6', // white-hot flame
      R: '#a03d1e', // robe
      r: '#7a2a18', // robe shade
      L: '#c97b1e', // lantern frame
    },
    frames: [
      [
        '................',
        '....KKKKK.......',
        '...KDDDDDK..LLL.',
        '...KDYDDYDK.LYL.',
        '...KDDDDDK..LLL.',
        '....KKKKK...K...',
        '..KKRRRRRKK.K...',
        '.KRRRRRRRRRK....',
        '.KRrRRRRRrRK....',
        '.KRRRRRRRRRK....',
        '.KRRRRRRRRRK....',
        '.KRRRKKRRRRK....',
        '.KRRRKKRRRRK....',
        '.KRRRKKRRRRK....',
        '.KRRR..KRRRK....',
        '................',
      ],
      [
        '................',
        '....KKKKK.......',
        '...KDDDDDK..LLL.',
        '...KDYDDYDK.LWL.',
        '...KDDDDDK..LLL.',
        '....KKKKK...K...',
        '..KKRRRRRKK.K...',
        '.KRRRRRRRRRK....',
        '.KRrRRRRRrRK....',
        '.KRRRRRRRRRK....',
        '.KRRRRRRRRRK....',
        '.KRRRKKRRRRK....',
        '.KRRRKKRRRRK....',
        '.KRRRK.KRRRK....',
        '.KRRR...KRRK....',
        '................',
      ],
    ],
  },

  // Mote: a small round shade with two cyan eyes. Frame 1 blinks and squashes.
  mote: {
    palette: {
      K: '#160f24',
      B: '#3b2d6b', // shade body
      b: '#2a1f4d', // body shade
      C: '#7ee0ff', // eyes
    },
    frames: [
      [
        '....KKKK....',
        '..KKBBBBKK..',
        '.KBBBBBBBBK.',
        '.KBCBBBBCBK.',
        '.KBBBBBBBBK.',
        '.KBbBBBBbBK.',
        '..KBBBBBBK..',
        '..KBBBBBBK..',
        '...KBBBBK...',
        '....KKKK....',
        '............',
        '............',
      ],
      [
        '....KKKK....',
        '..KKBBBBKK..',
        '.KBBBBBBBBK.',
        '.KBBBBBBBBK.',
        '.KBBBBBBBBK.',
        '.KBbBBBBbBK.',
        '..KBBBBBBK..',
        '..KBBBBBBK..',
        '...KBBBBK...',
        '....KKKK....',
        '............',
        '............',
      ],
    ],
  },

  // Wisp: a floating shade with a split, waving tail. Frame 1 swings the tail.
  wisp: {
    palette: {
      K: '#160f24',
      P: '#6b4fd8', // shade body
      p: '#4a33a0', // body shade
      W: '#f2ecff', // eyes
    },
    frames: [
      [
        '...KKKKK....',
        '..KPPPPPK...',
        '.KPPWPPPPK..',
        '.KPWPPWPPK..',
        '.KPPPPPPPK..',
        '..KPPPPPK...',
        '..KPPPPPK...',
        '...KPPKPPK..',
        '..KPPK..KPK.',
        '..KP....KP..',
        '.KP......PK.',
        '............',
      ],
      [
        '...KKKKK....',
        '..KPPPPPK...',
        '.KPPWPPPPK..',
        '.KPWPPWPPK..',
        '.KPPPPPPPK..',
        '..KPPPPPK...',
        '..KPPPPPK...',
        '..KPPKPPK...',
        '.KPK..KPPK..',
        '.KP....KP...',
        'KP......PK..',
        '............',
      ],
    ],
  },

  // Spitter: a hooded shade with a wide open mouth — two white teeth over a
  // dark gullet — so it reads as the ranged one even at a glance.
  spitter: {
    palette: {
      K: '#160f24',
      S: '#7a2a52', // hood
      s: '#5c1f3d', // hood shade
      P: '#ff6b9d', // eyes
      M: '#2a0a2e', // open mouth
      T: '#fff3d6', // teeth
    },
    frames: [
      [
        '......KK......',
        '.....KSSK.....',
        '....KSSSSK....',
        '...KSSSSSSK...',
        '...KSPSSPSK...',
        '..KSSSSSSSSK..',
        '..KSMMMMMMSK..',
        '..KSMTMMTMSK..',
        '..KSMMMMMMSK..',
        '..KSSSSSSSSK..',
        '..KSSSSSSSSK..',
        '..KSSK..KSSK..',
        '..KSSK..KSSK..',
        '..............',
      ],
    ],
  },

  // Splitter: a layered triangle — dark green shell over a bright green
  // inner triangle — with two pale eyes near the point.
  splitter: {
    palette: {
      K: '#10241a',
      G: '#1f7a4d', // shell
      L: '#7dffb0', // inner layer
      W: '#eafff2', // eyes
    },
    frames: [
      [
        '......KK......',
        '.....KGGK.....',
        '....KGGGGK....',
        '...KGGGGGGK...',
        '...KGWGGWGK...',
        '..KGGGGGGGGK..',
        '..KGGLLLLGGK..',
        '.KGGGLLLLLGGK.',
        '.KGGLLLLLLGGK.',
        '.KGGGGGGGGGGK.',
        'KGGGGGGGGGGGGK',
        'KKKKKKKKKKKKKK',
        '..............',
        '..............',
      ],
    ],
  },

  // Husk: a big armoured shade — shoulder plates, a chest plate, a belt, and
  // two red eyes under a heavy brow. The tank of the swarm.
  husk: {
    palette: {
      K: '#160f24',
      A: '#8a2f2f', // armour plate
      H: '#5c1f1f', // body
      h: '#3d1414', // body shade
      E: '#ff5d5d', // eyes
    },
    frames: [
      [
        '...KKKKK....KKKKK...',
        '..KAAAAAK..KAAAAAK..',
        '..KAAAAAK..KAAAAAK..',
        '..KKAAAKKKKAAAKK....',
        '....KHHHHHHHHHK.....',
        '...KHHHHHHHHHHHK....',
        '...KHEHHHHHHHEHK....',
        '...KHHHHHHHHHHHK....',
        '...KHAAAAAAAAAHK....',
        '...KHAAAAAAAAAHK....',
        '...KHAAAAAAAAAHK....',
        '...KHHHKKKKKHHHK....',
        '...KHHHKKKKKHHHK....',
        '..KHHHK....KHHHK....',
        '..KHHHK....KHHHK....',
        '..KHHHK....KHHHK....',
        '..KHHK......KHHK....',
        '..KHHK......KHHK....',
        '....................',
        '....................',
      ],
    ],
  },

  // Bomber: a spiky shade with a glowing orange core. Frame 1 swells the
  // core, so the pulse reads even before the fuse arms.
  bomber: {
    palette: {
      K: '#160f24',
      B: '#4a1f3d', // body
      O: '#ff8c1a', // core
      W: '#ffe9a8', // core hot spot
    },
    frames: [
      [
        '......K.......',
        '.....KBK......',
        '..K..KBBBK....',
        '...KBBBBBBK...',
        '..KBBBBBBBBK..',
        '..KBBBOOBBBK..',
        '.KBBBOOWOOBBK.',
        '..KBBBOOBBBK..',
        '..KBBBBBBBBK..',
        '...KBBBBBBK...',
        '....KBBBK..K..',
        '.....KBK......',
        '......K.......',
        '..............',
      ],
      [
        '......K.......',
        '.....KBK......',
        '..K..KBBBK....',
        '...KBBBBBBK...',
        '..KBBBOOBBBK..',
        '..KBBOOOOBBK..',
        '.KBBOOWWOOBBK.',
        '..KBBOOOOBBK..',
        '..KBBBOOBBBK..',
        '...KBBBBBBK...',
        '....KBBBK..K..',
        '.....KBK......',
        '......K.......',
        '..............',
      ],
    ],
  },

  // Healer: a robed shade in dark green with a lime plus on its chest and
  // glowing lime eyes — the plus is the tell.
  healer: {
    palette: {
      K: '#10241a',
      H: '#1f5c2e', // robe
      h: '#143d20', // robe shade
      G: '#b8ff2e', // plus / eyes
    },
    frames: [
      [
        '.....KKKK.....',
        '....KHHHHK....',
        '...KHHHHHHK...',
        '...KHGHHGHK...',
        '...KHHHHHHK...',
        '....KKKKKK....',
        '..KKHHHHHHKK..',
        '..KHHHHHHHHK..',
        '..KHHHGGHHHK..',
        '..KHHGGGGHHK..',
        '..KHHHGGHHHK..',
        '..KHHHHHHHHK..',
        '..KHHK..KHHK..',
        '..............',
      ],
    ],
  },

  // The Hollow King: a huge crowned shade — gold crown, dark robe, violet
  // eyes, an amber gem set in the chest. The boss of wave 10.
  boss: {
    palette: {
      K: '#120a20',
      D: '#241533', // robe
      d: '#1a0f28', // robe shade
      Y: '#ffd700', // crown gold
      V: '#e0aaff', // eyes
      W: '#f2e6ff', // eye glints
      G: '#ffb43a', // chest gem
      O: '#ff7a1a', // gem core
      R: '#3d1a4d', // robe trim
    },
    frames: [
      [
        '......K.......K......K......',
        '......KK......KK.....KK.....',
        '.....KYYK....KYYK...KYYK....',
        '.....KYYYK..KYYYYK..KYYYK...',
        '.....KKKKKKKKKKKKKKKKKKK....',
        '....KKDDDDDDDDDDDDDDDDDDKK..',
        '...KDDDDDDDDDDDDDDDDDDDDDDK.',
        '...KDDDDDDDDDDDDDDDDDDDDDDK.',
        '...KDDVDDDDDDDDDDDDDDVDDDK..',
        '...KDDWDDDDDDDDDDDDDDWDDDK..',
        '...KDDDDDDDDDDDDDDDDDDDDDDK.',
        '...KDDDDDDDDDDDDDDDDDDDDDDK.',
        '..KDDDDDDDDDDDDDDDDDDDDDDDDK',
        '..KDDDDDDDDDDDDDDDDDDDDDDDDK',
        '..KDDDRRDDDDDDDDDDDDDRRDDDK.',
        '..KDDDDDDDDDDDDDDDDDDDDDDDDK',
        '..KDDDDDDDDDDGGDDDDDDDDDDDDK',
        '..KDDDDDDDDDDGOGDDDDDDDDDDDK',
        '..KDDDDDDDDDDGGDDDDDDDDDDDDK',
        '..KDDDDDDDDDDDDDDDDDDDDDDDDK',
        '..KDDDDDDDDDDDDDDDDDDDDDDDDK',
        '..KDDDDDDDDDDDDDDDDDDDDDDDDK',
        '..KDDDKDDDDDDDDDDDDDDDKDDDK.',
        '..KDDDKDDDDDDDDDDDDDDDKDDDK.',
        '..KDDK..KDDDDDDDDDDDK..KDDK.',
        '..KDK....KDDDDDDDDDK....KDK.',
        '..KK......KKKKKKKK......KK..',
        '............................',
      ],
    ],
  },
};

export { SPRITE_DEFS };

// ---- build cache -----------------------------------------------------------

const cache = new Map();

function buildFrame(rows, palette) {
  const h = rows.length;
  const w = rows[0].length;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < w; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const col = palette[ch];
      if (!col) continue;
      g.fillStyle = col;
      g.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

// A 1 px gold silhouette behind the sprite, for the elite variant.
function withGoldOutline(base) {
  const c = document.createElement('canvas');
  c.width = base.width + 2;
  c.height = base.height + 2;
  const g = c.getContext('2d');
  const sil = document.createElement('canvas');
  sil.width = base.width;
  sil.height = base.height;
  const sg = sil.getContext('2d');
  sg.drawImage(base, 0, 0);
  sg.globalCompositeOperation = 'source-in';
  sg.fillStyle = '#ffd700';
  sg.fillRect(0, 0, sil.width, sil.height);
  g.drawImage(sil, 0, 1);
  g.drawImage(sil, 2, 1);
  g.drawImage(sil, 1, 0);
  g.drawImage(sil, 1, 2);
  g.drawImage(base, 1, 1);
  return c;
}

function spriteImage(name, frame, elite) {
  const key = `${name}:${frame}:${elite ? 'e' : ''}`;
  let img = cache.get(key);
  if (img) return img;
  const def = SPRITE_DEFS[name];
  if (!def) return null;
  const rows = def.frames[Math.min(frame, def.frames.length - 1)];
  img = buildFrame(rows, def.palette);
  if (elite) img = withGoldOutline(img);
  cache.set(key, img);
  return img;
}

// Which animation frame a sprite shows at a given moment. Two-frame sprites
// swap every 260 ms; single-frame sprites always show frame 0. Deterministic
// for a fixed nowMs, so staged screenshots are repeatable.
export function spriteFrame(name, nowMs) {
  const def = SPRITE_DEFS[name];
  if (!def || def.frames.length < 2) return 0;
  return Math.floor(nowMs / 260) % def.frames.length;
}

// Draw a sprite centred at (x, y), scaled to `size` px on its longest side.
// opts: { angle (radians, sprite faces up), elite (gold outline), flip }.
export function drawSprite(ctx, name, x, y, size, nowMs = 0, opts = {}) {
  const def = SPRITE_DEFS[name];
  if (!def) return false;
  const img = spriteImage(name, spriteFrame(name, nowMs), !!opts.elite);
  if (!img) return false;
  ctx.save();
  ctx.translate(x, y);
  if (opts.angle) ctx.rotate(opts.angle);
  if (opts.flip) ctx.scale(-1, 1);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, -size / 2, -size / 2, size, size);
  ctx.restore();
  return true;
}
