'use strict';
// Core engine: canvas, scaling, loop, scenes, save data, utilities, particles.

const W = 1280, H = 720;
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

const G = {
  scene: null,
  next: null,
  fade: 0,
  fadeDir: 0,
  t: 0,
  timeScale: 1,
  isAndroid: typeof window.AndroidBridge !== 'undefined',
};

// ---------- view scaling ----------
const view = { s: 1, ox: 0, oy: 0, css: 1, cox: 0, coy: 0 };
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cw = window.innerWidth, ch = window.innerHeight;
  canvas.width = Math.round(cw * dpr);
  canvas.height = Math.round(ch * dpr);
  canvas.style.width = cw + 'px';
  canvas.style.height = ch + 'px';
  const s = Math.min(cw / W, ch / H);
  view.css = s;
  view.cox = (cw - W * s) / 2;
  view.coy = (ch - H * s) / 2;
  view.s = s * dpr;
  view.ox = view.cox * dpr;
  view.oy = view.coy * dpr;
}
window.addEventListener('resize', resize);
resize();
function toGame(clientX, clientY) {
  return { x: (clientX - view.cox) / view.css, y: (clientY - view.coy) / view.css };
}

// ---------- utilities ----------
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
const approach = (v, target, step) => (v < target ? Math.min(v + step, target) : Math.max(v - step, target));
const easeOutBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function seeded(seed) { // mulberry32
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function vibrate(ms) {
  if (!Save.data || !Save.data.opts.vibrate) return;
  try {
    if (G.isAndroid && window.AndroidBridge.vibrate) window.AndroidBridge.vibrate(ms);
    else if (navigator.vibrate) navigator.vibrate(ms);
  } catch (e) { /* ignore */ }
}

// ---------- save data ----------
const SAVE_KEY = 'featherfiesta_save_v1';
const Save = {
  data: null,
  defaults() {
    return {
      fruit: 0,
      totalFruit: 0,
      chapter: 0,          // highest unlocked chapter index
      stars: {},           // stageId -> 0..3
      cleared: {},         // stageId -> true
      seen: {},            // story scenes viewed
      chars: ['pico', 'tuca'],
      games: ['fruit', 'bump', 'pinata'], // minigames unlocked for party / free play
      hatsOwned: ['none'],
      hats: {},            // charId -> hatId
      lastChar: 'pico',
      beaten: false,
      opts: { music: 0.6, sfx: 0.8, vibrate: true, touchAlpha: 0.55, difficulty: 1 },
      stats: { played: 0, partyWins: 0, fruitCaught: 0 },
    };
  },
  load() {
    let raw = null;
    try {
      raw = G.isAndroid && window.AndroidBridge.load ? window.AndroidBridge.load() : localStorage.getItem(SAVE_KEY);
    } catch (e) { raw = null; }
    const d = this.defaults();
    if (raw) {
      try {
        const o = JSON.parse(raw);
        Object.assign(d, o);
        d.opts = Object.assign(this.defaults().opts, o.opts || {});
        d.stats = Object.assign(this.defaults().stats, o.stats || {});
      } catch (e) { /* corrupted save, use defaults */ }
    }
    this.data = d;
  },
  write() {
    const raw = JSON.stringify(this.data);
    try {
      if (G.isAndroid && window.AndroidBridge.save) window.AndroidBridge.save(raw);
      else localStorage.setItem(SAVE_KEY, raw);
    } catch (e) { /* storage unavailable */ }
  },
  reset() { this.data = this.defaults(); this.write(); },
  addFruit(n) {
    if (n <= 0) return;
    this.data.fruit += n;
    this.data.totalFruit += n;
  },
  unlockGame(id) { if (!this.data.games.includes(id)) this.data.games.push(id); },
  unlockChar(id) { if (!this.data.chars.includes(id)) { this.data.chars.push(id); return true; } return false; },
};

// ---------- scenes ----------
function setScene(scene, instant) {
  if (instant || !G.scene) {
    if (G.scene && G.scene.exit) G.scene.exit();
    G.scene = scene;
    if (scene.enter) scene.enter();
    G.fade = instant ? 0 : 1;
    G.fadeDir = -1;
    return;
  }
  G.next = scene;
  G.fadeDir = 1;
}

// ---------- particles ----------
class Particles {
  constructor() { this.list = []; }
  burst(x, y, n, colors, speed = 240, opts = {}) {
    for (let i = 0; i < n; i++) {
      const a = opts.angle != null ? opts.angle + rand(-opts.spread || -0.5, opts.spread || 0.5) : rand(0, Math.PI * 2);
      const sp = rand(speed * 0.3, speed);
      this.list.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.4, 0.9) * (opts.life || 1), max: 1,
        size: rand(3, 7) * (opts.size || 1), color: pick(colors), g: opts.g != null ? opts.g : 500, kind: opts.kind || 'dot', rot: rand(0, 6), vr: rand(-8, 8),
      });
      this.list[this.list.length - 1].max = this.list[this.list.length - 1].life;
    }
  }
  confetti(x, y, n) {
    this.burst(x, y, n, ['#ff3b6b', '#ffd23f', '#3bceac', '#4d7cff', '#ff8c42', '#b967ff'], 520, { kind: 'rect', g: 380, life: 2.2, size: 1.2 });
  }
  text(x, y, str, color = '#fff', size = 30) {
    this.list.push({ x, y, vx: 0, vy: -70, life: 0.9, max: 0.9, kind: 'text', str, color, size, g: 0 });
  }
  ring(x, y, color, r = 40) {
    this.list.push({ x, y, vx: 0, vy: 0, life: 0.4, max: 0.4, kind: 'ring', color, size: r, g: 0 });
  }
  update(dt) {
    for (const p of this.list) {
      p.life -= dt;
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === 'rect') { p.vx *= 0.985; p.rot += p.vr * dt; }
    }
    this.list = this.list.filter((p) => p.life > 0);
  }
  draw(c) {
    for (const p of this.list) {
      const a = clamp(p.life / p.max, 0, 1);
      c.globalAlpha = p.kind === 'text' ? Math.min(1, a * 2) : a;
      if (p.kind === 'text') {
        drawText(c, p.str, p.x, p.y, p.size, p.color, 'center');
      } else if (p.kind === 'rect') {
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot);
        c.fillStyle = p.color; c.fillRect(-p.size, -p.size * 0.5, p.size * 2, p.size);
        c.restore();
      } else if (p.kind === 'ring') {
        c.strokeStyle = p.color; c.lineWidth = 6 * a;
        c.beginPath(); c.arc(p.x, p.y, p.size * (1.6 - a * 0.6), 0, Math.PI * 2); c.stroke();
      } else {
        c.fillStyle = p.color;
        c.beginPath(); c.arc(p.x, p.y, p.size * (0.4 + a * 0.6), 0, Math.PI * 2); c.fill();
      }
    }
    c.globalAlpha = 1;
  }
}

// ---------- main loop ----------
let lastFrame = performance.now();
function frame(now) {
  let dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  dt *= G.timeScale;
  G.t += dt;
  try {
    Input.poll(dt);
    if (G.fadeDir !== 0) {
      G.fade += G.fadeDir * dt * 4;
      if (G.fadeDir > 0 && G.fade >= 1) {
        G.fade = 1;
        if (G.scene && G.scene.exit) G.scene.exit();
        G.scene = G.next; G.next = null;
        if (G.scene.enter) G.scene.enter();
        G.fadeDir = -1;
      } else if (G.fadeDir < 0 && G.fade <= 0) { G.fade = 0; G.fadeDir = 0; }
    }
    if (G.scene && G.fadeDir <= 0) G.scene.update(dt);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(view.s, 0, 0, view.s, view.ox, view.oy);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    if (G.scene) G.scene.draw(ctx);
    if (typeof drawToasts === 'function') drawToasts(ctx, dt);
    if (G.fade > 0) { ctx.fillStyle = 'rgba(15,5,35,' + G.fade + ')'; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
    Input.endFrame();
  } catch (err) {
    G.lastError = err;
    console.error(err);
  }
  requestAnimationFrame(frame);
}
