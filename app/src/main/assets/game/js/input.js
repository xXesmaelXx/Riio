'use strict';
// Unified input for up to 4 players.
// Sources: keyboard (P1), touch screen (P1), browser Gamepad API, and the native
// Android bridge (MainActivity forwards controller events through window.__pad).

const BTNS = ['a', 'b', 'x', 'y', 'l', 'r', 'start', 'select', 'up', 'down', 'left', 'right'];
function mkPad() { const o = { ax: 0, ay: 0 }; BTNS.forEach((b) => (o[b] = false)); return o; }

const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  Space: 'a', Enter: 'a', KeyJ: 'a', KeyZ: 'a',
  Backspace: 'b', KeyK: 'b', KeyX: 'b',
  KeyU: 'x', KeyC: 'x', KeyI: 'y', KeyV: 'y',
  KeyQ: 'l', KeyE: 'r', Escape: 'start', KeyP: 'start', Tab: 'select',
};

const TOUCH_LAYOUTS = {
  stickA: [{ b: 'a', x: 1160, y: 590, r: 78, label: 'A' }],
  tapA: [{ b: 'a', x: 1160, y: 590, r: 78, label: 'A' }],
  stickAB: [{ b: 'a', x: 1170, y: 585, r: 72, label: 'A' }, { b: 'b', x: 1030, y: 640, r: 52, label: 'B' }],
  arrows: [
    { b: 'left', x: 95, y: 615, r: 66, label: '◀' }, { b: 'down', x: 245, y: 615, r: 66, label: '▼' },
    { b: 'up', x: 1035, y: 615, r: 66, label: '▲' }, { b: 'right', x: 1185, y: 615, r: 66, label: '▶' },
  ],
};
const PAUSE_BTN = { x: 772, y: 42, r: 30 };

const Input = {
  cur: [mkPad(), mkPad(), mkPad(), mkPad()],
  prev: [mkPad(), mkPad(), mkPad(), mkPad()],
  keys: new Set(),
  native: [mkPad(), mkPad(), mkPad(), mkPad()],
  nativeOn: [false, false, false, false],
  nativeUsed: false,
  backQueued: false,
  touchLayout: null,
  touch: { stick: null, btns: new Map(), taps: new Map() },
  taps: [],
  lastSource: 'touch',
  repeat: { dir: '', t: 0 },
  apiSlots: [],

  init() {
    window.addEventListener('keydown', (e) => {
      if (KEYMAP[e.code]) { e.preventDefault(); this.keys.add(e.code); this.lastSource = 'kb'; Sound.unlock(); }
    });
    window.addEventListener('keyup', (e) => { this.keys.delete(e.code); });
    window.addEventListener('blur', () => this.keys.clear());
    const opt = { passive: false };
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); Sound.unlock(); this.lastSource = 'touch'; for (const t of e.changedTouches) this.tStart(t.identifier, t.clientX, t.clientY); }, opt);
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); for (const t of e.changedTouches) this.tMove(t.identifier, t.clientX, t.clientY); }, opt);
    const end = (e) => { e.preventDefault(); for (const t of e.changedTouches) this.tEnd(t.identifier, t.clientX, t.clientY); };
    canvas.addEventListener('touchend', end, opt);
    canvas.addEventListener('touchcancel', end, opt);
    canvas.addEventListener('mousedown', (e) => { Sound.unlock(); this.tStart('m', e.clientX, e.clientY); });
    window.addEventListener('mousemove', (e) => { if (e.buttons) this.tMove('m', e.clientX, e.clientY); });
    window.addEventListener('mouseup', (e) => this.tEnd('m', e.clientX, e.clientY));

    // Bridge used by the Android activity for physical controllers.
    window.__pad = {
      key: (slot, name, down) => {
        if (slot < 0 || slot > 3 || !(name in this.native[slot])) return;
        this.native[slot][name] = !!down; this.nativeOn[slot] = true; this.nativeUsed = true; this.lastSource = 'pad';
        Sound.unlock();
      },
      axis: (slot, x, y) => {
        if (slot < 0 || slot > 3) return;
        this.native[slot].ax = x; this.native[slot].ay = y; this.nativeOn[slot] = true; this.nativeUsed = true;
        if (Math.abs(x) > 0.5 || Math.abs(y) > 0.5) this.lastSource = 'pad';
      },
      conn: (slot, on) => {
        if (slot < 0 || slot > 3) return;
        this.nativeOn[slot] = !!on; this.nativeUsed = true;
        if (!on) this.native[slot] = mkPad();
        if (G.scene && G.scene.onPadChange) G.scene.onPadChange(slot, on);
      },
      back: () => { this.backQueued = true; },
      pause: () => { if (G.scene && G.scene.onSystemPause) G.scene.onSystemPause(); },
    };
  },

  // ----- touch handling -----
  tStart(id, cx, cy) {
    const p = toGame(cx, cy);
    if (this.touchLayout && dist(p.x, p.y, PAUSE_BTN.x, PAUSE_BTN.y) > PAUSE_BTN.r + 14) {
      for (const b of TOUCH_LAYOUTS[this.touchLayout]) {
        if (dist(p.x, p.y, b.x, b.y) < b.r * 1.25) { this.touch.btns.set(id, b.b); return; }
      }
      if (this.touchLayout === 'tapA') { this.touch.btns.set(id, 'a'); return; }
      if (this.touchLayout !== 'arrows' && p.x < W * 0.55 && !this.touch.stick) {
        this.touch.stick = { id, cx: p.x, cy: p.y, x: p.x, y: p.y };
        return;
      }
    }
    this.touch.taps.set(id, { x: p.x, y: p.y, sx: p.x, sy: p.y });
  },
  tMove(id, cx, cy) {
    const p = toGame(cx, cy);
    const st = this.touch.stick;
    if (st && st.id === id) {
      st.x = p.x; st.y = p.y;
      const d = dist(st.cx, st.cy, p.x, p.y), R = 80;
      if (d > R * 1.4) { // let the stick base follow the thumb
        const k = (d - R * 1.4) / d;
        st.cx += (p.x - st.cx) * k; st.cy += (p.y - st.cy) * k;
      }
      return;
    }
    const tp = this.touch.taps.get(id);
    if (tp) { tp.x = p.x; tp.y = p.y; if (G.scene && G.scene.onDrag) G.scene.onDrag(p.x, p.y, tp); }
  },
  tEnd(id, cx, cy) {
    if (this.touch.stick && this.touch.stick.id === id) { this.touch.stick = null; return; }
    if (this.touch.btns.has(id)) { this.touch.btns.delete(id); return; }
    const tp = this.touch.taps.get(id);
    if (tp) {
      this.touch.taps.delete(id);
      const p = toGame(cx, cy);
      if (dist(p.x, p.y, tp.sx, tp.sy) < 40) this.taps.push({ x: p.x, y: p.y });
    }
  },

  // ----- polling -----
  padCount() {
    let n = 0;
    for (let i = 0; i < 4; i++) if (this.nativeOn[i]) n = i + 1;
    return Math.max(n, this.apiSlots.length);
  },
  hasPad(slot) { return this.nativeOn[slot] || !!this.apiSlots[slot]; },
  isConnected(slot) { return slot === 0 || this.hasPad(slot); },

  poll() {
    const tmp = this.prev; this.prev = this.cur; this.cur = tmp;
    for (let i = 0; i < 4; i++) {
      const s = this.cur[i];
      BTNS.forEach((b) => (s[b] = false));
      s.ax = 0; s.ay = 0;
    }
    // keyboard -> P1
    const k = this.cur[0];
    for (const code of this.keys) k[KEYMAP[code]] = true;
    // touch -> P1
    for (const b of this.touch.btns.values()) k[b] = true;
    const st = this.touch.stick;
    if (st) {
      let dx = (st.x - st.cx) / 80, dy = (st.y - st.cy) / 80;
      const m = Math.hypot(dx, dy);
      if (m > 1) { dx /= m; dy /= m; }
      if (m > 0.15) { k.ax = dx; k.ay = dy; }
    }
    if (this.backQueued) { k.b = true; this.backQueued = false; }
    // native controllers
    for (let i = 0; i < 4; i++) {
      if (!this.nativeOn[i]) continue;
      const n = this.native[i], s = this.cur[i];
      BTNS.forEach((b) => { if (n[b]) s[b] = true; });
      if (Math.abs(n.ax) > Math.abs(s.ax)) s.ax = n.ax;
      if (Math.abs(n.ay) > Math.abs(s.ay)) s.ay = n.ay;
    }
    // browser Gamepad API (skipped once native events arrive to avoid double input)
    this.apiSlots = [];
    if (!this.nativeUsed && navigator.getGamepads) {
      let pads = [];
      try { pads = navigator.getGamepads() || []; } catch (e) { pads = []; }
      for (const gp of pads) {
        if (!gp || !gp.connected) continue;
        const slot = this.apiSlots.length;
        if (slot > 3) break;
        this.apiSlots.push(gp.index);
        const s = this.cur[slot], bt = gp.buttons;
        const pr = (i) => !!(bt[i] && (bt[i].pressed || bt[i].value > 0.5));
        const map = { a: 0, b: 1, x: 2, y: 3, l: 4, r: 5, select: 8, start: 9, up: 12, down: 13, left: 14, right: 15 };
        let any = false;
        for (const name in map) if (pr(map[name])) { s[name] = true; any = true; }
        if (pr(6)) s.l = true; if (pr(7)) s.r = true;
        let ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
        if (Math.hypot(ax, ay) < 0.22) { ax = 0; ay = 0; }
        if (Math.abs(ax) > Math.abs(s.ax)) s.ax = ax;
        if (Math.abs(ay) > Math.abs(s.ay)) s.ay = ay;
        if (any || ax || ay) this.lastSource = 'pad';
      }
    }
    // combine: d-pad drives the axis; a pushed stick also counts as a direction press
    for (let i = 0; i < 4; i++) {
      const s = this.cur[i];
      if (Math.abs(s.ax) < 0.2) s.ax = (s.right ? 1 : 0) - (s.left ? 1 : 0);
      if (Math.abs(s.ay) < 0.2) s.ay = (s.down ? 1 : 0) - (s.up ? 1 : 0);
      const m = Math.hypot(s.ax, s.ay);
      if (m > 1) { s.ax /= m; s.ay /= m; }
      s.sl = s.ax < -0.6; s.sr = s.ax > 0.6; s.su = s.ay < -0.6; s.sd = s.ay > 0.6;
    }
    this.handleTaps();
  },
  handleTaps() {
    if (!this.taps.length) return;
    const taps = this.taps; this.taps = [];
    for (const t of taps) if (G.scene && G.scene.onTap && G.fadeDir <= 0) G.scene.onTap(t.x, t.y);
  },
  endFrame() {},

  down(p, b) { return !!this.cur[p][b]; },
  pressed(p, b) { return !!this.cur[p][b] && !this.prev[p][b]; },
  ax(p) { return this.cur[p].ax; },
  ay(p) { return this.cur[p].ay; },
  // direction just pressed via d-pad or stick flick
  dirPressed(p, d) {
    const map = { up: 'su', down: 'sd', left: 'sl', right: 'sr' };
    return (this.cur[p][d] && !this.prev[p][d]) || (this.cur[p][map[d]] && !this.prev[p][map[d]] && !this.cur[p][d]);
  },
  anyPressed(b) { for (let i = 0; i < 4; i++) if (this.pressed(i, b)) return i; return -1; },
  // Menu navigation for any player with key repeat. Returns 'up'|'down'|'left'|'right'|''.
  menuDir(dt, onlySlot) {
    let held = '';
    for (let i = 0; i < 4; i++) {
      if (onlySlot != null && i !== onlySlot) continue;
      const s = this.cur[i];
      if (s.up || s.su) held = 'up'; else if (s.down || s.sd) held = 'down';
      else if (s.left || s.sl) held = 'left'; else if (s.right || s.sr) held = 'right';
      if (held) break;
    }
    const r = this.repeat;
    if (!held) { r.dir = ''; return ''; }
    if (held !== r.dir) { r.dir = held; r.t = 0.38; return held; }
    r.t -= dt;
    if (r.t <= 0) { r.t = 0.11; return held; }
    return '';
  },
  showTouch() { return this.lastSource === 'touch' && !!this.touchLayout; },
  drawTouch(c) {
    if (!this.touchLayout) return;
    const alpha = Save.data.opts.touchAlpha;
    // pause button is always visible in gameplay
    c.globalAlpha = Math.max(0.35, alpha);
    c.fillStyle = 'rgba(0,0,0,0.45)';
    c.beginPath(); c.arc(PAUSE_BTN.x, PAUSE_BTN.y, PAUSE_BTN.r, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff'; c.fillRect(PAUSE_BTN.x - 11, PAUSE_BTN.y - 13, 8, 26); c.fillRect(PAUSE_BTN.x + 3, PAUSE_BTN.y - 13, 8, 26);
    c.globalAlpha = 1;
    if (!this.showTouch()) return;
    c.globalAlpha = alpha;
    for (const b of TOUCH_LAYOUTS[this.touchLayout]) {
      const on = this.cur[0][b.b];
      c.fillStyle = on ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.35)';
      c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 4;
      c.beginPath(); c.arc(b.x, b.y, b.r, 0, Math.PI * 2); c.fill(); c.stroke();
      drawText(c, b.label, b.x, b.y + b.r * 0.22, b.r * 0.62, '#fff', 'center');
    }
    if (this.touchLayout === 'tapA') drawText(c, 'Tap anywhere to jump', 1160, 500, 22, '#fff', 'center');
    else if (this.touchLayout !== 'arrows') {
      const st = this.touch.stick;
      const cx = st ? st.cx : 170, cy = st ? st.cy : 560;
      c.fillStyle = 'rgba(0,0,0,0.3)'; c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 3;
      c.beginPath(); c.arc(cx, cy, 80, 0, Math.PI * 2); c.fill(); c.stroke();
      const kx = cx + this.cur[0].ax * 80 * (st ? 1 : 0), ky = cy + this.cur[0].ay * 80 * (st ? 1 : 0);
      c.fillStyle = 'rgba(255,255,255,0.7)';
      c.beginPath(); c.arc(kx, ky, 36, 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1;
  },
  pauseHit(x, y) { return !!this.touchLayout && dist(x, y, PAUSE_BTN.x, PAUSE_BTN.y) < PAUSE_BTN.r + 14; },
};
