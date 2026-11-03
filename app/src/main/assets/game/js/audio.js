'use strict';
// Procedural audio: synthesized sound effects and a samba-style music sequencer.

const Sound = {
  ctx: null, master: null, musicGain: null, sfxGain: null, noiseBuf: null,
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { this.ctx = new AC(); } catch (e) { this.ctx = null; return; }
    const c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = 0.9; this.master.connect(c.destination);
    const comp = c.createDynamicsCompressor(); comp.connect(this.master);
    this.musicGain = c.createGain(); this.musicGain.connect(comp);
    this.sfxGain = c.createGain(); this.sfxGain.connect(comp);
    this.applyVolumes();
    const len = c.sampleRate * 1;
    this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    if (Music.pending) { const p = Music.pending; Music.pending = null; Music.play(p); }
  },
  unlock() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); },
  applyVolumes() {
    if (!this.ctx || !Save.data) return;
    this.musicGain.gain.value = Save.data.opts.music * 0.55;
    this.sfxGain.gain.value = Save.data.opts.sfx;
  },
  tone(t, freq, dur, type, vol, dest, slideTo) {
    const c = this.ctx; if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.sfxGain);
    o.start(t); o.stop(t + dur + 0.02);
  },
  noise(t, dur, vol, freq, type, dest) {
    const c = this.ctx; if (!c) return;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = type || 'highpass'; f.frequency.value = freq || 6000;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || this.sfxGain);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  },
  sfx(name) {
    const c = this.ctx; if (!c || c.state !== 'running') return;
    const t = c.currentTime + 0.005;
    switch (name) {
      case 'move': this.tone(t, 660, 0.06, 'square', 0.05); break;
      case 'select': this.tone(t, 880, 0.08, 'square', 0.08); this.tone(t + 0.06, 1320, 0.1, 'square', 0.07); break;
      case 'back': this.tone(t, 500, 0.1, 'square', 0.07, null, 300); break;
      case 'deny': this.tone(t, 200, 0.18, 'sawtooth', 0.08); break;
      case 'jump': this.tone(t, 380, 0.15, 'square', 0.06, null, 760); break;
      case 'flap': this.noise(t, 0.08, 0.12, 1500, 'bandpass'); break;
      case 'coin': this.tone(t, 988, 0.07, 'square', 0.07); this.tone(t + 0.06, 1319, 0.16, 'square', 0.07); break;
      case 'big': [784, 988, 1175, 1568].forEach((f, i) => this.tone(t + i * 0.05, f, 0.14, 'square', 0.06)); break;
      case 'hit': this.noise(t, 0.2, 0.35, 900, 'lowpass'); this.tone(t, 180, 0.2, 'sawtooth', 0.12, null, 60); break;
      case 'bump': this.tone(t, 160, 0.12, 'sine', 0.3, null, 80); this.noise(t, 0.06, 0.2, 2000, 'bandpass'); break;
      case 'splash': this.noise(t, 0.5, 0.35, 1200, 'lowpass'); this.noise(t + 0.05, 0.4, 0.15, 4000, 'highpass'); break;
      case 'pop': this.tone(t, 900, 0.08, 'triangle', 0.2, null, 300); this.noise(t, 0.05, 0.2, 3000, 'highpass'); break;
      case 'throw': this.noise(t, 0.15, 0.15, 2500, 'bandpass'); break;
      case 'dash': this.noise(t, 0.2, 0.2, 1800, 'bandpass'); this.tone(t, 300, 0.15, 'triangle', 0.08, null, 600); break;
      case 'boost': this.tone(t, 300, 0.3, 'sawtooth', 0.06, null, 1200); break;
      case 'count': this.tone(t, 660, 0.18, 'square', 0.1); break;
      case 'go': this.tone(t, 1320, 0.4, 'square', 0.1); this.tone(t, 990, 0.4, 'square', 0.06); break;
      case 'whistle': this.tone(t, 2100, 0.35, 'sine', 0.15); this.tone(t + 0.1, 2300, 0.25, 'sine', 0.1); break;
      case 'perfect': this.tone(t, 1568, 0.08, 'triangle', 0.12); break;
      case 'good': this.tone(t, 1175, 0.07, 'triangle', 0.1); break;
      case 'miss': this.tone(t, 150, 0.12, 'sawtooth', 0.06); break;
      case 'fanfare': [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(t + i * 0.11, f, i === 5 ? 0.6 : 0.16, 'square', 0.08)); break;
      case 'lose': [392, 370, 349, 262].forEach((f, i) => this.tone(t + i * 0.18, f, 0.3, 'triangle', 0.12)); break;
      case 'boom': this.noise(t, 0.6, 0.5, 400, 'lowpass'); this.tone(t, 90, 0.5, 'sine', 0.4, null, 30); break;
      case 'squawk': this.tone(t, 700, 0.22, 'sawtooth', 0.09, null, 400); this.tone(t + 0.1, 900, 0.18, 'sawtooth', 0.07, null, 500); break;
      case 'unlock': [523, 784, 1047, 1568].forEach((f, i) => this.tone(t + i * 0.08, f, 0.3, 'triangle', 0.12)); break;
      case 'type': this.tone(t, rand(500, 700), 0.03, 'square', 0.025); break;
    }
  },
};

// ---------- music ----------
const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };
const SONGS = {
  title:    { bpm: 104, root: 60, scale: 'major', prog: [0, 5, 3, 4], seed: 11, lead: 'triangle', perc: 0.8 },
  menu:     { bpm: 96,  root: 62, scale: 'major', prog: [0, 3, 4, 3], seed: 23, lead: 'triangle', perc: 0.5 },
  beach:    { bpm: 112, root: 65, scale: 'major', prog: [0, 4, 5, 3], seed: 31, lead: 'square', perc: 0.9 },
  market:   { bpm: 120, root: 62, scale: 'major', prog: [0, 3, 0, 4], seed: 47, lead: 'square', perc: 1 },
  sky:      { bpm: 108, root: 67, scale: 'major', prog: [0, 5, 1, 4], seed: 59, lead: 'triangle', perc: 0.7 },
  jungle:   { bpm: 116, root: 57, scale: 'minor', prog: [0, 5, 6, 4], seed: 71, lead: 'square', perc: 1 },
  carnival: { bpm: 126, root: 60, scale: 'major', prog: [0, 3, 4, 0], seed: 83, lead: 'square', perc: 1.1 },
  samba:    { bpm: 118, root: 64, scale: 'major', prog: [0, 5, 3, 4], seed: 97, lead: 'square', perc: 1 },
  boss:     { bpm: 132, root: 57, scale: 'minor', prog: [0, 6, 5, 4], seed: 101, lead: 'sawtooth', perc: 1.1 },
  results:  { bpm: 100, root: 65, scale: 'major', prog: [0, 3, 4, 0], seed: 113, lead: 'triangle', perc: 0.6 },
};
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

function buildSong(def) {
  const rng = seeded(def.seed * 7919);
  const sc = SCALES[def.scale];
  const rhythms = [[0, 3, 6, 8, 10, 12, 14], [0, 2, 3, 6, 7, 10, 12], [0, 4, 6, 8, 11, 14], [2, 3, 6, 8, 10, 11, 14], [0, 3, 6, 10, 12], [0, 2, 4, 6, 8, 11, 12, 14]];
  const mel = [];
  let idx = 7 + Math.floor(rng() * 3);
  for (let bar = 0; bar < 4; bar++) {
    const chordDeg = def.prog[bar % def.prog.length];
    const r = rhythms[Math.floor(rng() * rhythms.length)];
    const notes = [];
    for (let i = 0; i < r.length; i++) {
      const s = r[i];
      if (s === 0 || s === 8) {
        // land on a chord tone
        const tones = [chordDeg, chordDeg + 2, chordDeg + 4].map((d) => d + 7);
        idx = tones.reduce((best, tt) => (Math.abs(tt - idx) < Math.abs(best - idx) ? tt : best), tones[0]);
      } else {
        idx += Math.floor(rng() * 5) - 2;
      }
      idx = clamp(idx, 4, 13);
      const next = i + 1 < r.length ? r[i + 1] : 16;
      const oct = Math.floor(idx / 7), deg = ((idx % 7) + 7) % 7;
      notes.push({ s, n: def.root + oct * 12 - 12 + sc[deg], len: next - s, deg: idx });
    }
    mel.push(notes);
  }
  return { def, mel, sc, stepDur: 60 / def.bpm / 4 };
}

const Music = {
  id: null, song: null, startTime: 0, nextTime: 0, step: 0, timer: null, pending: null, built: {},
  get(id) { if (!this.built[id]) this.built[id] = buildSong(SONGS[id]); return this.built[id]; },
  play(id, force) {
    if (!force && this.id === id && this.timer) return;
    this.stop();
    this.id = id;
    if (!Sound.ctx) { this.pending = id; return; }
    this.song = this.get(id);
    this.startTime = Sound.ctx.currentTime + 0.12;
    this.nextTime = this.startTime;
    this.step = 0;
    this.timer = setInterval(() => this.tick(), 25);
    this.tick();
  },
  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null; this.song = null; this.id = null; this.pending = null;
  },
  time() { return Sound.ctx && this.song ? Sound.ctx.currentTime - this.startTime : -1; },
  tick() {
    const c = Sound.ctx; if (!c || !this.song) return;
    if (c.state !== 'running') { // keep the clock aligned while suspended
      this.nextTime = Math.max(this.nextTime, c.currentTime);
      return;
    }
    while (this.nextTime < c.currentTime + 0.15) {
      this.playStep(this.step, this.nextTime);
      this.nextTime += this.song.stepDur;
      this.step++;
    }
  },
  playStep(step, t) {
    const S = this.song, d = S.def, out = Sound.musicGain;
    const s = step % 16, bar = Math.floor(step / 16);
    const p = d.perc;
    // percussion
    if (s === 0) Sound.tone(t, 110, 0.25, 'sine', 0.35 * p, out, 45);
    if (s === 8) Sound.tone(t, 100, 0.35, 'sine', 0.6 * p, out, 40);
    if (s === 12 && bar % 2 === 1) Sound.tone(t, 120, 0.15, 'sine', 0.25 * p, out, 60);
    Sound.noise(t, 0.04, (s % 4 === 0 ? 0.07 : 0.035) * p, 7000, 'highpass', out);
    if ([0, 2, 3, 5, 6, 8, 10, 11, 13, 14].includes(s) && p > 0.6) Sound.tone(t, 1800, 0.03, 'square', 0.025 * p, out);
    if ([0, 3, 6, 10, 12].includes(s) && p > 0.85) Sound.tone(t, s % 2 ? 1046 : 784, 0.12, 'triangle', 0.05 * p, out);
    // harmony
    const deg = d.prog[bar % d.prog.length];
    const note = (i) => d.root + S.sc[((i % 7) + 7) % 7] + Math.floor(i / 7) * 12;
    const bassPat = { 0: 0, 6: 4, 8: 0, 11: 4, 14: 7 };
    if (bassPat[s] != null) Sound.tone(t, mtof(note(deg + bassPat[s]) - 24), 0.2, 'triangle', 0.22, out);
    if ([2, 6, 10, 13].includes(s)) {
      [0, 2, 4].forEach((k) => Sound.tone(t, mtof(note(deg + k) - 12), 0.12, 'square', 0.018, out));
    }
    // melody (rest on every 4th phrase for breathing room)
    if (bar % 8 !== 7) {
      for (const n of S.mel[bar % 4]) {
        if (n.s === s) Sound.tone(t, mtof(n.n), Math.min(0.5, n.len * S.stepDur * 0.9), d.lead, d.lead === 'square' || d.lead === 'sawtooth' ? 0.045 : 0.12, out);
      }
    }
  },
  // Note chart for the rhythm minigame, derived from the melody so notes follow the music.
  chart(id, bars, density) {
    const S = this.get(id);
    const out = [];
    const rng = seeded(S.def.seed + bars);
    for (let bar = 2; bar < bars; bar++) {
      if (bar % 8 === 7) continue;
      for (const n of S.mel[bar % 4]) {
        const strong = n.s % 4 === 0;
        if (!strong && rng() > density) continue;
        out.push({ time: (bar * 16 + n.s) * S.stepDur, lane: ((n.deg % 4) + 4) % 4 });
      }
    }
    return out;
  },
};
