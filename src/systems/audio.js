// Standalone Web Audio SFX/music system. Deliberately does NOT touch Phaser's
// sound manager (main.js keeps audio:{noAudio:true} — that's correct, not a
// bug, since Phaser's own sound manager is never used). AudioContext is only
// ever created lazily, from a real user gesture, per the mobile autoplay
// rule, and every public call is wrapped so a failure here can never crash
// the game or bubble up to the boot-error screen.
let ctx = null;
let master = null;
let musicGain = null;
let sfxGain = null;
let muted = false;
let currentMusic = null;
let unlocked = false;

function ensureCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = 1; master.connect(ctx.destination);
  musicGain = ctx.createGain(); musicGain.gain.value = 0.16; musicGain.connect(master);
  sfxGain = ctx.createGain(); sfxGain.gain.value = 0.34; sfxGain.connect(master);
  return ctx;
}

// Call this from a real input handler (button press / keydown), as early and
// as often as convenient — it's a cheap no-op once unlocked. This is what
// satisfies the "must resume after a user gesture" rule on iOS/mobile.
export function unlockAudio() {
  try {
    const c = ensureCtx();
    if (!c) return;
    if (c.state === 'suspended') c.resume().catch(() => {});
    unlocked = true;
  } catch (e) { /* never let audio break the game */ }
}

export function setMuted(v) { muted = !!v; if (master) { try { master.gain.value = muted ? 0 : 1; } catch (e) {} } }
export function isMuted() { return muted; }

function tone(freq, dur, { type = 'square', gainStart = 0.5, gainEnd = 0.001, slideTo = null, delay = 0 } = {}) {
  try {
    const c = ensureCtx();
    if (!c || muted) return;
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
    g.gain.setValueAtTime(gainStart, t0);
    g.gain.exponentialRampToValueAtTime(gainEnd, t0 + dur);
    osc.connect(g); g.connect(sfxGain);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  } catch (e) { /* swallow — audio must never break gameplay */ }
}

function noiseThud(dur, { delay = 0, gain = 0.4, filterFreq = 300 } = {}) {
  try {
    const c = ensureCtx();
    if (!c || muted) return;
    const t0 = c.currentTime + delay;
    const bufSize = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, bufSize, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
    const src = c.createBufferSource(); src.buffer = buf;
    const filt = c.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = filterFreq;
    const g = c.createGain(); g.gain.setValueAtTime(gain, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filt); filt.connect(g); g.connect(sfxGain);
    src.start(t0);
  } catch (e) {}
}

export const sfx = {
  step: () => tone(180, 0.045, { type: 'square', gainStart: 0.12, filterFreq: 200 }),
  bump: () => noiseThud(0.09, { gain: 0.3, filterFreq: 180 }),
  talk: () => tone(520, 0.05, { type: 'square', gainStart: 0.22 }),
  select: () => tone(660, 0.04, { type: 'square', gainStart: 0.2 }),
  open: () => { tone(440, 0.05, { gainStart: 0.2 }); tone(660, 0.06, { gainStart: 0.18, delay: 0.05 }); },
  door: () => tone(220, 0.22, { type: 'sine', gainStart: 0.25, slideTo: 440 }),
  warp: () => { tone(300, 0.12, { type: 'sawtooth', gainStart: 0.2, slideTo: 700 }); tone(700, 0.1, { type: 'sawtooth', gainStart: 0.16, slideTo: 1200, delay: 0.1 }); },
  hit: () => { noiseThud(0.12, { gain: 0.35, filterFreq: 500 }); tone(180, 0.1, { type: 'square', gainStart: 0.25, slideTo: 80, delay: 0.02 }); },
  miss: () => tone(300, 0.15, { type: 'sine', gainStart: 0.18, slideTo: 200 }),
  critical: () => { tone(740, 0.07, {type:'square',gainStart:0.18,slideTo:980});tone(1100,0.09,{type:'triangle',gainStart:0.16,delay:0.06}); },
  edge: () => { tone(440,0.07,{type:'square',gainStart:0.15});tone(660,0.09,{type:'square',gainStart:0.17,delay:0.06}); },
  resist: () => { tone(360,0.08,{type:'triangle',gainStart:0.14});tone(220,0.12,{type:'triangle',gainStart:0.13,delay:0.06}); },
  statusUp: () => { tone(520,0.06,{type:'square',gainStart:0.14});tone(780,0.08,{type:'square',gainStart:0.16,delay:0.055}); },
  statusDown: () => { tone(420,0.06,{type:'square',gainStart:0.14});tone(240,0.1,{type:'square',gainStart:0.14,delay:0.055}); },
  technique: (style = 'Open', phase = 'windup') => {
    const impact = phase === 'impact';
    if (style === 'Shooter') {
      tone(impact ? 190 : 620, impact ? 0.1 : 0.13, {type: 'square', gainStart: impact ? 0.2 : 0.13, slideTo: impact ? 80 : 260});
      if (impact) noiseThud(0.08, {gain: 0.22, filterFreq: 620});
    } else if (style === 'Rider') {
      tone(impact ? 105 : 260, impact ? 0.15 : 0.12, {type: 'triangle', gainStart: impact ? 0.23 : 0.12, slideTo: impact ? 62 : 190});
      if (impact) noiseThud(0.16, {gain: 0.28, filterFreq: 260});
    } else if (style === 'Scrambler') {
      tone(impact ? 360 : 540, 0.08, {type: 'square', gainStart: 0.14, slideTo: impact ? 210 : 760});
      tone(impact ? 220 : 760, 0.07, {type: 'triangle', gainStart: 0.12, slideTo: impact ? 150 : 420, delay: 0.065});
    } else if (style === 'Bull') {
      tone(impact ? 82 : 130, impact ? 0.18 : 0.16, {type: 'sawtooth', gainStart: impact ? 0.25 : 0.13, slideTo: impact ? 46 : 88});
      if (impact) noiseThud(0.18, {gain: 0.34, filterFreq: 190});
    } else if (style === 'Wall') {
      tone(impact ? 230 : 340, 0.12, {type: 'triangle', gainStart: 0.15, slideTo: impact ? 150 : 280});
      if (impact) tone(345, 0.1, {type: 'square', gainStart: 0.1, slideTo: 220, delay: 0.035});
    } else if (style === 'Thrower') {
      tone(impact ? 120 : 190, impact ? 0.2 : 0.16, {type: 'sawtooth', gainStart: impact ? 0.24 : 0.13, slideTo: impact ? 55 : 430});
      if (impact) noiseThud(0.2, {gain: 0.32, filterFreq: 230});
    } else {
      tone(impact ? 150 : 400, 0.12, {type: 'square', gainStart: 0.15, slideTo: impact ? 80 : 250});
    }
  },
  win: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, { type: 'square', gainStart: 0.22, delay: i * 0.1 })); },
  lose: () => { [392, 349, 294].forEach((f, i) => tone(f, 0.22, { type: 'sine', gainStart: 0.2, delay: i * 0.13 })); },
  badge: () => { [392, 523, 659, 784, 987].forEach((f, i) => tone(f, 0.2, { type: 'square', gainStart: 0.24, delay: i * 0.09 })); },
  levelup: () => { [440, 554, 659].forEach((f, i) => tone(f, 0.14, { type: 'triangle', gainStart: 0.22, delay: i * 0.08 })); },
  menu_move: () => tone(300, 0.03, { type: 'square', gainStart: 0.12 }),
};

// Minimal looping music bed: a short bassline pattern re-triggered on a timer.
// Intentionally simple (a handful of oscillator notes, not a real sequencer)
// so it can't be a source of crashes or CPU issues on low-end mobile.
const PATTERNS = {
  title:     { notes: [220, 220, 262, 196], step: 0.42, type: 'triangle', gain: 0.1 },
  overworld: { notes: [196, 0, 233, 0, 262, 0, 233, 0], step: 0.3, type: 'triangle', gain: 0.08 },
  battle:    { notes: [147, 147, 175, 147, 165, 165, 196, 165], step: 0.22, type: 'sawtooth', gain: 0.07 },
};
let musicTimer = null;
let musicStep = 0;
let musicKey = null;

export function playMusic(key) {
  if (musicKey === key) return;
  stopMusic();
  const pat = PATTERNS[key];
  if (!pat) return;
  musicKey = key; musicStep = 0;
  const c = ensureCtx();
  if (!c) return;
  const tick = () => {
    try {
      if (!muted && musicGain) {
        const note = pat.notes[musicStep % pat.notes.length];
        if (note > 0) {
          const t0 = c.currentTime;
          const osc = c.createOscillator(); const g = c.createGain();
          osc.type = pat.type; osc.frequency.setValueAtTime(note, t0);
          g.gain.setValueAtTime(pat.gain, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + pat.step * 0.9);
          osc.connect(g); g.connect(musicGain);
          osc.start(t0); osc.stop(t0 + pat.step);
        }
      }
    } catch (e) {}
    musicStep++;
  };
  tick();
  musicTimer = setInterval(tick, pat.step * 1000);
}

export function stopMusic() {
  if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  musicKey = null;
}
