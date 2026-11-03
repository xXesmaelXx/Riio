'use strict';
// Menu widget with d-pad / stick / touch navigation, plus shared UI drawing.

class Menu {
  constructor(items, opts = {}) {
    this.items = items;
    this.i = opts.start || 0;
    this.onlySlot = opts.onlySlot;
    while (this.items[this.i] && this.items[this.i].hidden) this.i++;
  }
  get cur() { return this.items[this.i]; }
  move(dir) {
    const a = this.items[this.i];
    if (!a) return;
    const ax = a.x + a.w / 2, ay = a.y + a.h / 2;
    let best = -1, bestScore = Infinity;
    this.items.forEach((b, j) => {
      if (j === this.i || b.hidden) return;
      const dx = b.x + b.w / 2 - ax, dy = b.y + b.h / 2 - ay;
      let primary, secondary;
      if (dir === 'up') { primary = -dy; secondary = Math.abs(dx); }
      else if (dir === 'down') { primary = dy; secondary = Math.abs(dx); }
      else if (dir === 'left') { primary = -dx; secondary = Math.abs(dy); }
      else { primary = dx; secondary = Math.abs(dy); }
      if (primary <= 4) return;
      const sc = primary + secondary * 2.2;
      if (sc < bestScore) { bestScore = sc; best = j; }
    });
    if (best < 0 && (dir === 'up' || dir === 'down')) { // wrap vertically
      let ext = -1, extV = dir === 'down' ? Infinity : -Infinity;
      this.items.forEach((b, j) => {
        if (b.hidden || j === this.i) return;
        const cy = b.y + b.h / 2;
        if (Math.abs(b.x + b.w / 2 - ax) > 300) return;
        if (dir === 'down' ? cy < extV : cy > extV) { extV = cy; ext = j; }
      });
      best = ext;
    }
    if (best >= 0) { this.i = best; Sound.sfx('move'); if (this.onMove) this.onMove(this.cur); }
  }
  activate(item) {
    if (!item) return;
    if (item.disabled) { Sound.sfx('deny'); if (item.onDisabled) item.onDisabled(); return; }
    Sound.sfx('select');
    if (item.action) item.action(item);
  }
  update(dt) {
    const d = Input.menuDir(dt, this.onlySlot);
    if (d) this.move(d);
    if (this.cur && this.cur.onSide && (d === 'left' || d === 'right')) { /* side handlers use their own */ }
    const slots = this.onlySlot != null ? [this.onlySlot] : [0, 1, 2, 3];
    for (const s of slots) if (Input.pressed(s, 'a')) { this.activate(this.cur); break; }
  }
  tap(x, y) {
    for (let j = 0; j < this.items.length; j++) {
      const b = this.items[j];
      if (b.hidden) continue;
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { this.i = j; this.activate(b); return true; }
    }
    return false;
  }
  draw(c) {
    this.items.forEach((b, j) => {
      if (b.hidden) return;
      if (b.draw) b.draw(c, b, j === this.i);
      else button(c, b.label, b.x, b.y, b.w, b.h, j === this.i, b);
    });
  }
}

function vList(labels, x, y, w, h, gap) {
  return labels.map((l, i) => Object.assign({ x, y: y + i * (h + gap), w, h }, l));
}

function drawTitle(c, title, sub) {
  drawText(c, title, W / 2, 78, 56, '#ffd23f', 'center');
  if (sub) drawText(c, sub, W / 2, 114, 22, '#ffe9f0', 'center');
}
// Button prompt hints along the bottom of the screen.
function drawHints(c, hints) {
  const touch = Input.lastSource === 'touch';
  let x = W - 24;
  for (let i = hints.length - 1; i >= 0; i--) {
    c.font = 'bold 22px ' + FONT;
    const [btn, label] = hints[i];
    if (touch && btn === 'B') {
      // show a tappable back arrow in the corner instead
      continue;
    }
    const tw = c.measureText(label).width;
    drawText(c, label, x, H - 22, 22, '#fff', 'right');
    x -= tw + 10;
    const col = { A: '#3ddc84', B: '#ff4d6d', X: '#4d9bff', Y: '#ffc93c', START: '#999', 'L/R': '#bbb' }[btn] || '#999';
    c.fillStyle = col; c.beginPath(); c.arc(x - 16, H - 30, 17, 0, 7); c.fill();
    drawText(c, btn === 'START' ? '≡' : btn, x - 16, H - (btn.length > 1 ? 25 : 23), btn.length > 1 ? 12 : 18, '#fff', 'center', false);
    x -= 50;
  }
  if (touch && hints.some((h) => h[0] === 'B')) drawBackButton(c);
}
const BACK_BTN = { x: 20, y: 18, w: 96, h: 56 };
function drawBackButton(c) {
  button(c, '◀', BACK_BTN.x, BACK_BTN.y, BACK_BTN.w, BACK_BTN.h, false, { color: '#7a5cff', size: 28 });
}
function backHit(x, y) { return x >= BACK_BTN.x && x <= BACK_BTN.x + BACK_BTN.w && y >= BACK_BTN.y && y <= BACK_BTN.y + BACK_BTN.h; }

function drawFruitCounter(c, x, y) {
  panel(c, x, y, 190, 54, 'rgba(30,14,70,0.85)', '#ffd23f', 27);
  drawFruit(c, 'mango', x + 32, y + 28, 1.1);
  drawText(c, String(Save.data.fruit), x + 60, y + 38, 28, '#fff');
}

function playerLabel(p) { return p.human ? 'P' + (p.slot + 1) : 'CPU'; }

// Small player card used in HUDs and results.
function playerCard(c, p, x, y, w, h, value, highlight) {
  panel(c, x, y, w, h, 'rgba(25,10,55,0.82)', highlight ? '#fff6b0' : p.color, 16);
  c.save();
  c.beginPath(); rrect(c, x + 4, y + 4, h - 8, h - 8, 12); c.clip();
  c.fillStyle = p.color; c.fillRect(x, y, h, h);
  drawBird(c, x + h / 2 - 8, y + h / 2 + 12, h / 62, p.char, { hat: p.hat, legs: false, flap: 0.3 });
  c.restore();
  drawText(c, playerLabel(p), x + h + 6, y + 22, 17, p.color);
  drawText(c, String(value), x + w - 12, y + h - 12, Math.min(30, h * 0.5), '#fff', 'right');
}
