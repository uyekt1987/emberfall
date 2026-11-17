// Synthesized sound only: every effect is an oscillator (or filtered noise)
// with a short envelope, so the game ships no audio files and makes no network
// request. The context is created on the first user gesture; headless runs
// without one simply stay silent.

let ctx = null;
let muted = false;

function ac() {
  if (!ctx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    } catch {
      ctx = null;
    }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export function setMuted(value) {
  muted = value;
}

export function isMuted() {
  return muted;
}

function tone(freq, dur, type, vol, slideTo) {
  if (muted) return;
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(dur, vol, freq) {
  if (muted) return;
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = freq;
  const gain = c.createGain();
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(t);
}

export const sfx = {
  shoot() {
    tone(720, 0.07, 'square', 0.05, 320);
  },
  hit() {
    tone(240, 0.05, 'triangle', 0.06, 160);
  },
  die() {
    noise(0.16, 0.12, 900);
    tone(180, 0.14, 'sawtooth', 0.05, 60);
  },
  explode() {
    noise(0.25, 0.16, 600);
    tone(120, 0.25, 'sawtooth', 0.08, 40);
  },
  nova() {
    tone(523, 0.18, 'sine', 0.09, 1047);
    noise(0.12, 0.06, 3000);
  },
  playerHit() {
    tone(140, 0.18, 'sawtooth', 0.1, 70);
    noise(0.12, 0.1, 500);
  },
  pickup() {
    tone(880, 0.09, 'sine', 0.08, 1320);
  },
  star() {
    tone(660, 0.1, 'sine', 0.08, 990);
    setTimeout(() => tone(990, 0.12, 'sine', 0.07, 1320), 70);
  },
  shard() {
    // A shard pickup: a bright two-note chime, higher than the star's.
    tone(1047, 0.09, 'sine', 0.09, 1568);
    setTimeout(() => tone(1568, 0.14, 'sine', 0.08, 2093), 80);
  },
  dash() {
    noise(0.1, 0.07, 2400);
  },
  waveClear() {
    [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.16, 'triangle', 0.08), i * 90));
  },
  boss() {
    tone(98, 0.5, 'sawtooth', 0.09, 49);
    tone(147, 0.5, 'square', 0.04, 73);
  },
  upgrade() {
    [440, 587, 880].forEach((f, i) => setTimeout(() => tone(f, 0.12, 'sine', 0.08), i * 70));
  },
  gameOver() {
    [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.08), i * 160));
  },
  win() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => tone(f, 0.2, 'triangle', 0.08), i * 110));
  },
};
