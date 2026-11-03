'use strict';
// Drawing helpers: text, UI widgets, procedurally drawn birds, hats and themed backgrounds.

const FONT = "'Trebuchet MS', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

function drawText(c, str, x, y, size, color = '#fff', align = 'left', outline = true, weight = 'bold') {
  c.font = weight + ' ' + Math.round(size) + 'px ' + FONT;
  c.textAlign = align;
  c.textBaseline = 'alphabetic';
  if (outline) {
    c.lineJoin = 'round';
    c.lineWidth = Math.max(3, size * 0.16);
    c.strokeStyle = 'rgba(20,8,40,0.85)';
    c.strokeText(str, x, y);
  }
  c.fillStyle = color;
  c.fillText(str, x, y);
}
function wrapText(c, str, maxW, size) {
  c.font = 'bold ' + Math.round(size) + 'px ' + FONT;
  const words = str.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (c.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}
function rrect(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
function panel(c, x, y, w, h, fill = 'rgba(30,14,70,0.88)', stroke = '#ffd23f', r = 22) {
  c.fillStyle = 'rgba(0,0,0,0.25)';
  rrect(c, x + 5, y + 7, w, h, r); c.fill();
  c.fillStyle = fill;
  rrect(c, x, y, w, h, r); c.fill();
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = 4; c.stroke(); }
}
function button(c, label, x, y, w, h, focused, opts = {}) {
  const pulse = focused ? 1 + Math.sin(G.t * 8) * 0.025 : 1;
  c.save();
  c.translate(x + w / 2, y + h / 2); c.scale(pulse, pulse); c.translate(-w / 2, -h / 2);
  const base = opts.disabled ? '#5b5470' : (opts.color || '#ff5d8f');
  c.fillStyle = 'rgba(0,0,0,0.3)'; rrect(c, 0, 6, w, h, h * 0.35); c.fill();
  c.fillStyle = base; rrect(c, 0, 0, w, h, h * 0.35); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.18)'; rrect(c, 6, 4, w - 12, h * 0.42, h * 0.25); c.fill();
  if (focused) { c.strokeStyle = '#fff6b0'; c.lineWidth = 6; rrect(c, -2, -2, w + 4, h + 4, h * 0.37); c.stroke(); }
  drawText(c, label, w / 2, h / 2 + (opts.size || h * 0.42) * 0.36, opts.size || h * 0.42, opts.disabled ? '#bbb' : '#fff', 'center');
  if (opts.sub) drawText(c, opts.sub, w / 2, h - 8, 16, '#ffe9a8', 'center');
  c.restore();
}
function starShape(c, x, y, r, filled, color = '#ffd23f') {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
    c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.closePath();
  c.fillStyle = filled ? color : 'rgba(0,0,0,0.35)';
  c.fill();
  c.strokeStyle = filled ? '#8a5a00' : 'rgba(255,255,255,0.5)'; c.lineWidth = 2; c.stroke();
}
function ellipse(c, x, y, rx, ry, rot = 0) { c.beginPath(); c.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, Math.PI * 2); }

// ---------- fruit ----------
function drawFruit(c, kind, x, y, s = 1, rot = 0) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
  switch (kind) {
    case 'mango':
      c.fillStyle = '#ffb030'; ellipse(c, 0, 0, 15, 12, 0.4); c.fill();
      c.fillStyle = '#ff6b3d'; ellipse(c, 5, 3, 8, 6, 0.4); c.fill();
      c.fillStyle = '#3aa14a'; ellipse(c, -8, -12, 7, 3, -0.5); c.fill();
      break;
    case 'banana':
      c.strokeStyle = '#ffd93b'; c.lineWidth = 9; c.lineCap = 'round';
      c.beginPath(); c.arc(0, -10, 18, 0.5, 2.6); c.stroke();
      c.strokeStyle = '#6b4a1e'; c.lineWidth = 4; c.beginPath(); c.moveTo(-15, -2); c.lineTo(-18, -6); c.stroke();
      break;
    case 'pineapple':
      c.fillStyle = '#3aa14a';
      for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(i * 5, -12); c.lineTo(i * 9, -28); c.lineTo(i * 5 + 4, -12); c.fill(); }
      c.fillStyle = '#f2b81c'; ellipse(c, 0, 2, 13, 17); c.fill();
      c.strokeStyle = '#b5770c'; c.lineWidth = 2;
      for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(-12, i * 6); c.lineTo(12, i * 6 + 8); c.stroke(); }
      break;
    case 'star':
      starShape(c, 0, 0, 17, true, '#fff27a');
      c.fillStyle = 'rgba(255,255,255,0.7)'; ellipse(c, -4, -5, 4, 3); c.fill();
      break;
    case 'grape':
      c.fillStyle = '#8e44ad';
      [[0, -8], [-7, -1], [7, -1], [0, 5], [-4, 11], [4, 11], [0, -1]].forEach(([a, b]) => { c.beginPath(); c.arc(a, b, 6, 0, 7); c.fill(); });
      break;
    case 'coconut':
      c.fillStyle = '#6b4226'; c.beginPath(); c.arc(0, 0, 16, 0, 7); c.fill();
      c.fillStyle = '#3d2412'; [[-5, -4], [4, -5], [0, 3]].forEach(([a, b]) => { c.beginPath(); c.arc(a, b, 2.5, 0, 7); c.fill(); });
      break;
    default: // berry
      c.fillStyle = '#e8322f'; c.beginPath(); c.arc(0, 0, 13, 0, 7); c.fill();
      c.fillStyle = '#3aa14a'; ellipse(c, 0, -12, 6, 3); c.fill();
  }
  c.restore();
}

// ---------- birds ----------
// Draws a bird centred on (x,y). s = scale (1 ~ 70px wide). o: face (1|-1), flap (0..1), rot, hat, alpha, squash, mood
function drawBird(c, x, y, s, ch, o = {}) {
  if (typeof ch === 'string') ch = CHARS[ch];
  const face = o.face || 1;
  const t = G.t + (o.phase || 0);
  const flap = o.flap != null ? o.flap : 0.5 + Math.sin(t * 3) * 0.15;
  c.save();
  c.translate(x, y);
  if (o.rot) c.rotate(o.rot);
  c.scale(s * face, s * (o.squash || 1));
  if (o.alpha != null) c.globalAlpha = o.alpha;

  // legs
  if (o.legs !== false) {
    c.strokeStyle = ch.legs || '#e09a3e'; c.lineWidth = 3.5; c.lineCap = 'round';
    const lw = ch.species === 'spoonbill' ? 18 : 8;
    const step = o.walk ? Math.sin(t * 16) * 5 : 0;
    c.beginPath(); c.moveTo(-4, 14); c.lineTo(-6 + step, 22 + lw); c.moveTo(5, 14); c.lineTo(7 - step, 22 + lw); c.stroke();
  }
  // tail
  const tails = ch.tail || [ch.wing];
  tails.forEach((col, i) => {
    c.fillStyle = col;
    const len = ch.species === 'hummingbird' ? 22 : ch.species === 'parrot' ? 44 : 30;
    ellipse(c, -22 - len * 0.45, 8 + i * 3, len * 0.55, 6 - i, 0.25 + i * 0.12); c.fill();
  });
  // body
  c.fillStyle = ch.body; ellipse(c, 0, 0, 25, 21); c.fill();
  c.fillStyle = ch.belly; ellipse(c, 7, 7, 15, 12, -0.2); c.fill();
  // back wing
  c.save();
  c.translate(-3, -4);
  c.rotate(-0.15 - flap * 1.2);
  c.fillStyle = ch.wing;
  if (ch.species === 'hummingbird') c.globalAlpha *= 0.75;
  ellipse(c, -12, 2, 20, 11, 0.2); c.fill();
  if (ch.wingTip) { c.fillStyle = ch.wingTip; ellipse(c, -24, 4, 9, 6, 0.2); c.fill(); }
  c.restore();
  // head
  const hx = 15, hy = -16;
  c.fillStyle = ch.head || ch.body; c.beginPath(); c.arc(hx, hy, 15, 0, Math.PI * 2); c.fill();
  if (ch.cheek) { c.fillStyle = ch.cheek; ellipse(c, hx + 4, hy + 2, 7, 6); c.fill(); }
  // crest
  if (ch.crest) {
    c.fillStyle = ch.crest;
    for (let i = 0; i < 3; i++) { ellipse(c, hx - 8 - i * 3, hy - 13 + i * 3, 8, 3.5, -0.9 + i * 0.3); c.fill(); }
  }
  // beak
  const bk = ch.beak;
  c.fillStyle = bk;
  switch (ch.species) {
    case 'toucan': {
      const gr = c.createLinearGradient(hx + 8, 0, hx + 46, 0);
      gr.addColorStop(0, '#ffd23f'); gr.addColorStop(0.7, '#ff7a1a'); gr.addColorStop(1, '#d6331f');
      c.fillStyle = gr;
      c.beginPath(); c.moveTo(hx + 8, hy - 10); c.quadraticCurveTo(hx + 46, hy - 12, hx + 48, hy + 2); c.quadraticCurveTo(hx + 30, hy + 8, hx + 9, hy + 6); c.closePath(); c.fill();
      c.strokeStyle = '#1d1d26'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(hx + 10, hy - 1); c.lineTo(hx + 44, hy - 1); c.stroke();
      break;
    }
    case 'hummingbird':
      c.beginPath(); c.moveTo(hx + 11, hy - 2); c.lineTo(hx + 42, hy + 1); c.lineTo(hx + 11, hy + 3); c.closePath(); c.fill();
      break;
    case 'spoonbill':
      c.beginPath(); c.moveTo(hx + 10, hy - 3); c.lineTo(hx + 34, hy - 2); c.lineTo(hx + 34, hy + 3); c.lineTo(hx + 10, hy + 4); c.fill();
      ellipse(c, hx + 38, hy + 0.5, 7, 6); c.fill();
      break;
    case 'crow':
      c.beginPath(); c.moveTo(hx + 10, hy - 6); c.lineTo(hx + 32, hy + 1); c.lineTo(hx + 10, hy + 6); c.closePath(); c.fill();
      break;
    default: // parrot hook
      c.beginPath(); c.moveTo(hx + 9, hy - 8); c.quadraticCurveTo(hx + 28, hy - 8, hx + 25, hy + 9); c.quadraticCurveTo(hx + 20, hy + 2, hx + 10, hy + 5); c.closePath(); c.fill();
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.moveTo(hx + 10, hy + 2); c.quadraticCurveTo(hx + 18, hy + 6, hx + 13, hy + 10); c.lineTo(hx + 9, hy + 5); c.fill();
  }
  // eye
  const blink = o.mood === 'ko' ? 1 : ((t * 0.7) % 4 < 0.12 ? 1 : 0);
  if (ch.eyeRing) { c.fillStyle = ch.eyeRing; c.beginPath(); c.arc(hx + 4, hy - 4, 8, 0, 7); c.fill(); }
  if (o.mood === 'ko') {
    c.strokeStyle = '#222'; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(hx, hy - 8); c.lineTo(hx + 8, hy); c.moveTo(hx + 8, hy - 8); c.lineTo(hx, hy); c.stroke();
  } else if (blink) {
    c.strokeStyle = '#222'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(hx, hy - 4); c.lineTo(hx + 9, hy - 4); c.stroke();
  } else {
    c.fillStyle = '#fff'; c.beginPath(); c.arc(hx + 4, hy - 4, 5.5, 0, 7); c.fill();
    c.fillStyle = ch.pupil || '#1a1020'; c.beginPath(); c.arc(hx + 5.5, hy - 4, 3, 0, 7); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(hx + 6.5, hy - 5.5, 1.1, 0, 7); c.fill();
  }
  if (ch.brow || o.mood === 'angry') {
    c.strokeStyle = '#120a1e'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(hx - 3, hy - 13); c.lineTo(hx + 10, hy - 9); c.stroke();
  }
  // hat
  const hat = o.hat || 'none';
  if (hat !== 'none') drawHat(c, hat, hx - 1, hy - 13);
  c.restore();
}

function drawHat(c, id, x, y) {
  c.save(); c.translate(x, y);
  switch (id) {
    case 'party':
      c.fillStyle = '#ff5d8f'; c.beginPath(); c.moveTo(-11, 2); c.lineTo(2, -30); c.lineTo(13, 2); c.closePath(); c.fill();
      c.fillStyle = '#ffd23f'; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(-3 + i * 4, -6 - i * 8, 2.5, 0, 7); c.fill(); }
      c.fillStyle = '#3bceac'; c.beginPath(); c.arc(2, -31, 5, 0, 7); c.fill();
      break;
    case 'flowers':
      ['#ff5d8f', '#ffd23f', '#ff8c42', '#b967ff', '#ff5d8f'].forEach((col, i) => {
        const a = Math.PI + 0.3 + i * 0.6, px = Math.cos(a) * 16, py = 4 + Math.sin(a) * 9;
        c.fillStyle = col; for (let k = 0; k < 5; k++) { ellipse(c, px + Math.cos(k * 1.26) * 3.5, py + Math.sin(k * 1.26) * 3.5, 3, 3); c.fill(); }
        c.fillStyle = '#fff6b0'; c.beginPath(); c.arc(px, py, 2, 0, 7); c.fill();
      });
      break;
    case 'straw':
      c.fillStyle = '#e8c66a'; ellipse(c, 0, 0, 26, 6); c.fill();
      c.fillStyle = '#d9b04f'; rrect(c, -12, -15, 24, 15, 6); c.fill();
      c.fillStyle = '#e8322f'; c.fillRect(-12, -6, 24, 4);
      break;
    case 'shades':
      c.fillStyle = '#111'; c.translate(6, 11);
      rrect(c, -5, 0, 12, 8, 3); c.fill(); rrect(c, 9, 0, 12, 8, 3); c.fill(); c.fillRect(5, 2, 6, 2);
      c.fillStyle = 'rgba(120,200,255,0.6)'; c.fillRect(-3, 1, 4, 2); c.fillRect(11, 1, 4, 2);
      break;
    case 'tophat':
      c.fillStyle = '#1b1b25'; ellipse(c, 0, 0, 20, 5); c.fill(); c.fillRect(-11, -26, 22, 26);
      c.fillStyle = '#b967ff'; c.fillRect(-11, -7, 22, 5);
      break;
    case 'feathers':
      ['#ff3b6b', '#ffd23f', '#3bceac', '#4d7cff', '#b967ff'].forEach((col, i) => {
        c.save(); c.rotate(-0.9 + i * 0.45); c.fillStyle = col; ellipse(c, 0, -22, 5, 18); c.fill(); c.restore();
      });
      c.fillStyle = '#ffd23f'; rrect(c, -14, -4, 28, 7, 3); c.fill();
      c.fillStyle = '#ff3b6b'; c.beginPath(); c.arc(0, -1, 3.5, 0, 7); c.fill();
      break;
    case 'crown':
      c.fillStyle = '#ffd23f';
      c.beginPath(); c.moveTo(-13, 2); c.lineTo(-13, -12); c.lineTo(-6, -5); c.lineTo(0, -16); c.lineTo(6, -5); c.lineTo(13, -12); c.lineTo(13, 2); c.closePath(); c.fill();
      c.fillStyle = '#e8322f'; c.beginPath(); c.arc(0, -3, 3, 0, 7); c.fill();
      c.fillStyle = '#3bceac'; c.beginPath(); c.arc(-8, -2, 2, 0, 7); c.arc(8, -2, 2, 0, 7); c.fill();
      break;
    case 'headphones':
      c.strokeStyle = '#2b2b36'; c.lineWidth = 4; c.beginPath(); c.arc(0, 12, 16, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
      c.fillStyle = '#ff5d8f'; rrect(c, -20, 8, 9, 14, 4); c.fill(); rrect(c, 11, 8, 9, 14, 4); c.fill();
      break;
    case 'bow':
      c.fillStyle = '#ff5d8f';
      c.beginPath(); c.moveTo(0, 0); c.lineTo(-13, -8); c.lineTo(-13, 8); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(0, 0); c.lineTo(13, -8); c.lineTo(13, 8); c.closePath(); c.fill();
      c.fillStyle = '#ff9ebd'; c.beginPath(); c.arc(0, 0, 4, 0, 7); c.fill();
      break;
    case 'captain':
      c.fillStyle = '#2a1d10'; c.beginPath(); c.moveTo(-22, 2); c.quadraticCurveTo(0, -30, 22, 2); c.quadraticCurveTo(0, -6, -22, 2); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(0, -9, 4, 0, 7); c.fill();
      break;
    case 'sombrero':
      c.fillStyle = '#e07a2a'; ellipse(c, 0, 0, 30, 7); c.fill();
      c.fillStyle = '#c45e18'; c.beginPath(); c.moveTo(-11, 0); c.quadraticCurveTo(0, -30, 11, 0); c.fill();
      c.fillStyle = '#3bceac'; c.fillRect(-10, -5, 20, 3);
      break;
  }
  c.restore();
}

// ---------- backgrounds ----------
function skyGrad(c, top, bottom, h = H) {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, top); g.addColorStop(1, bottom);
  c.fillStyle = g; c.fillRect(0, 0, W, h);
}
function drawCloud(c, x, y, s, col = 'rgba(255,255,255,0.9)') {
  c.fillStyle = col;
  c.beginPath();
  c.arc(x, y, 26 * s, 0, 7); c.arc(x + 30 * s, y - 12 * s, 32 * s, 0, 7); c.arc(x + 62 * s, y, 24 * s, 0, 7);
  c.rect(x, y - 4 * s, 62 * s, 24 * s);
  c.fill();
}
function drawPalm(c, x, y, s, sway = 0) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.strokeStyle = '#8a5a2b'; c.lineWidth = 14; c.lineCap = 'round';
  c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(18, -90, 8 + sway * 8, -170); c.stroke();
  c.translate(8 + sway * 8, -170);
  c.fillStyle = '#2f9e44';
  for (let i = 0; i < 6; i++) {
    c.save(); c.rotate(-Math.PI + i * 0.62 + sway * 0.1);
    ellipse(c, 45, 0, 48, 11, 0.25); c.fill(); c.restore();
  }
  c.fillStyle = '#6b4226'; c.beginPath(); c.arc(-6, 8, 8, 0, 7); c.arc(7, 9, 8, 0, 7); c.fill();
  c.restore();
}
function drawBunting(c, y, offset = 0, colors = ['#ff3b6b', '#ffd23f', '#3bceac', '#4d7cff', '#b967ff']) {
  c.strokeStyle = '#4a3b2a'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(0, y); c.quadraticCurveTo(W / 2, y + 40, W, y); c.stroke();
  for (let i = 0; i < 26; i++) {
    const x = ((i * 52 + offset) % (W + 52)) - 26;
    const yy = y + 40 * (1 - Math.pow((x - W / 2) / (W / 2), 2)) * 0.5;
    c.fillStyle = colors[i % colors.length];
    c.beginPath(); c.moveTo(x - 14, yy); c.lineTo(x + 14, yy); c.lineTo(x, yy + 26); c.closePath(); c.fill();
  }
}
const HOUSE_COLS = ['#ff8c42', '#ffd23f', '#3bceac', '#ff5d8f', '#7aa7ff', '#b967ff', '#f25f5c', '#70c1b3'];
function drawHouses(c, baseY, scroll, scale = 1, seed = 1, dark = false) {
  const rng = seeded(seed);
  const widths = [], heights = [], cols = [];
  for (let i = 0; i < 24; i++) { widths.push(80 + rng() * 70); heights.push(90 + rng() * 140); cols.push(HOUSE_COLS[Math.floor(rng() * HOUSE_COLS.length)]); }
  const total = widths.reduce((a, b) => a + b, 0) * scale;
  let x = -((scroll % total) + total) % total;
  let i = 0;
  while (x < W) {
    const k = i % 24, w = widths[k] * scale, h = heights[k] * scale;
    c.fillStyle = dark ? shade(cols[k], -0.45) : cols[k];
    c.fillRect(x, baseY - h, w - 3, h);
    c.fillStyle = dark ? 'rgba(255,230,140,0.85)' : 'rgba(40,30,80,0.35)';
    for (let wy = baseY - h + 18 * scale; wy < baseY - 30 * scale; wy += 38 * scale)
      for (let wx = x + 14 * scale; wx < x + w - 26 * scale; wx += 30 * scale) c.fillRect(wx, wy, 14 * scale, 18 * scale);
    c.fillStyle = dark ? '#2a1c3a' : '#9b4d2e';
    c.fillRect(x - 3, baseY - h - 8 * scale, w + 3, 10 * scale);
    x += w; i++;
  }
}
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (v) => clamp(Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt), 0, 255);
  return 'rgb(' + f(r) + ',' + f(g) + ',' + f(b) + ')';
}
function drawHills(c, baseY, scroll, amp, col, freq = 0.004, phase = 0) {
  c.fillStyle = col;
  c.beginPath(); c.moveTo(0, H);
  for (let x = 0; x <= W; x += 16) {
    const wx = x + scroll;
    c.lineTo(x, baseY - amp * (0.5 + 0.3 * Math.sin(wx * freq + phase) + 0.2 * Math.sin(wx * freq * 2.7 + phase * 2)));
  }
  c.lineTo(W, H); c.closePath(); c.fill();
}

function drawBackground(c, theme, scroll = 0) {
  const t = G.t;
  switch (theme) {
    case 'beach': {
      skyGrad(c, '#4fc3f7', '#c9f1ff', 470);
      c.fillStyle = '#fff3a8'; c.beginPath(); c.arc(1050, 130, 60, 0, 7); c.fill();
      for (let i = 0; i < 4; i++) drawCloud(c, ((i * 380 + t * 12 - scroll * 0.1) % 1600) - 200, 80 + (i % 2) * 70, 0.9);
      // distant rock islands
      c.fillStyle = '#5e8f6a';
      c.beginPath(); c.moveTo(80, 470); c.quadraticCurveTo(160, 300, 240, 470); c.fill();
      c.beginPath(); c.moveTo(900, 470); c.quadraticCurveTo(980, 330, 1060, 470); c.fill();
      const sea = c.createLinearGradient(0, 430, 0, 560); sea.addColorStop(0, '#1e88e5'); sea.addColorStop(1, '#4dd0e1');
      c.fillStyle = sea; c.fillRect(0, 440, W, 130);
      c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 3;
      for (let i = 0; i < 12; i++) { const x = ((i * 120 + t * 30) % 1400) - 60; c.beginPath(); c.arc(x, 470 + (i % 3) * 30, 18, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
      c.fillStyle = '#f7d794'; c.fillRect(0, 560, W, 160);
      c.fillStyle = '#efc777'; for (let i = 0; i < 30; i++) c.fillRect((i * 97) % W, 590 + (i * 37) % 120, 18, 4);
      drawPalm(c, 70, 600, 1.1, Math.sin(t * 1.3));
      drawPalm(c, 1210, 610, 1.2, Math.sin(t * 1.1 + 1));
      break;
    }
    case 'market': {
      skyGrad(c, '#ffb46b', '#ffe3b3', 520);
      for (let i = 0; i < 3; i++) drawCloud(c, ((i * 500 + t * 8 - scroll * 0.1) % 1700) - 200, 90 + i * 40, 0.8, 'rgba(255,255,255,0.7)');
      drawHouses(c, 420, scroll * 0.3, 0.7, 5);
      drawHouses(c, 560, scroll * 0.6, 1, 9);
      drawBunting(c, 150, scroll * 0.6 + t * 10);
      c.fillStyle = '#c99a6b'; c.fillRect(0, 560, W, 160);
      c.fillStyle = '#b5845a'; for (let i = 0; i < 20; i++) c.fillRect(((i * 140 - scroll) % 1400 + 1400) % 1400 - 70, 600 + (i % 3) * 35, 60, 6);
      break;
    }
    case 'sky': {
      skyGrad(c, '#2f80ed', '#a8e6ff');
      c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.arc(200, 120, 70, 0, 7); c.fill();
      drawHills(c, 640, scroll * 0.15, 260, '#7fb3c9', 0.003, 1);
      // tall rocky peaks
      c.fillStyle = '#5c8a8a';
      for (let i = 0; i < 4; i++) {
        const x = ((i * 420 - scroll * 0.25) % 1680 + 1680) % 1680 - 200;
        c.beginPath(); c.moveTo(x, 720); c.quadraticCurveTo(x + 40, 330, x + 120, 300); c.quadraticCurveTo(x + 200, 330, x + 240, 720); c.fill();
      }
      drawHills(c, 720, scroll * 0.4, 160, '#3f9b5a', 0.005, 2);
      for (let i = 0; i < 6; i++) drawCloud(c, ((i * 300 - scroll * 0.5 + t * 10) % 1800 + 1800) % 1800 - 250, 120 + (i * 83) % 300, 1.1, 'rgba(255,255,255,0.85)');
      break;
    }
    case 'rooftops': {
      skyGrad(c, '#ff7e5f', '#feb47b');
      c.fillStyle = '#fff1b0'; c.beginPath(); c.arc(980, 260, 90, 0, 7); c.fill();
      drawHills(c, 520, scroll * 0.1, 220, '#8e5a7a', 0.003, 3);
      drawHouses(c, 560, scroll * 0.3, 0.6, 13);
      break;
    }
    case 'jungle': {
      skyGrad(c, '#0f5132', '#5fbf77');
      for (let l = 0; l < 3; l++) {
        c.fillStyle = ['#0b3d26', '#14613a', '#1f7f4a'][l];
        for (let i = 0; i < 14; i++) {
          const x = ((i * 110 - scroll * (0.2 + l * 0.2)) % 1540 + 1540) % 1540 - 120;
          c.beginPath(); c.arc(x, 120 + l * 60 + (i % 3) * 25, 70 - l * 10, 0, 7); c.fill();
        }
      }
      c.strokeStyle = '#2d6a2d'; c.lineWidth = 5;
      for (let i = 0; i < 8; i++) { const x = ((i * 170 - scroll * 0.5) % 1360 + 1360) % 1360; c.beginPath(); c.moveTo(x, 0); c.quadraticCurveTo(x + 20 * Math.sin(t + i), 120, x, 240 + (i % 3) * 50); c.stroke(); }
      break;
    }
    case 'carnival': {
      skyGrad(c, '#1b0f3a', '#6a2c91');
      for (let i = 0; i < 40; i++) { c.fillStyle = 'rgba(255,255,255,' + (0.3 + 0.3 * Math.sin(t * 2 + i)) + ')'; c.fillRect((i * 137) % W, (i * 71) % 300, 3, 3); }
      // fireworks
      for (let k = 0; k < 3; k++) {
        const ph = (t * 0.5 + k * 0.33) % 1;
        const fx = 250 + k * 380, fy = 140 + (k % 2) * 60;
        c.strokeStyle = ['#ffd23f', '#ff5d8f', '#3bceac'][k]; c.globalAlpha = 1 - ph; c.lineWidth = 3;
        for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; c.beginPath(); c.moveTo(fx + Math.cos(a) * ph * 40, fy + Math.sin(a) * ph * 40); c.lineTo(fx + Math.cos(a) * ph * 90, fy + Math.sin(a) * ph * 90); c.stroke(); }
        c.globalAlpha = 1;
      }
      drawHouses(c, 560, scroll * 0.4, 0.9, 21, true);
      // string lights
      for (let r = 0; r < 2; r++) {
        const y = 230 + r * 70;
        c.strokeStyle = '#2a1c3a'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, y); c.quadraticCurveTo(W / 2, y + 60, W, y); c.stroke();
        for (let i = 0; i < 24; i++) {
          const x = i * 56 + 20, yy = y + 60 * (1 - Math.pow((x - W / 2) / (W / 2), 2)) * 0.5;
          c.fillStyle = ['#ffd23f', '#ff5d8f', '#3bceac', '#7aa7ff'][(i + r + Math.floor(t * 3)) % 4];
          c.beginPath(); c.arc(x, yy + 6, 6, 0, 7); c.fill();
        }
      }
      c.fillStyle = '#3a1f5c'; c.fillRect(0, 560, W, 160);
      c.fillStyle = '#4b2a73'; for (let i = 0; i < 16; i++) c.fillRect(i * 90, 560, 45, 160);
      break;
    }
    default: {
      // menu backdrop: sunset city with drifting confetti
      skyGrad(c, '#2b1055', '#d53369');
      c.fillStyle = 'rgba(255,220,120,0.9)'; c.beginPath(); c.arc(640, 470, 160, 0, 7); c.fill();
      drawHills(c, 600, t * 6, 200, '#5a2a6e', 0.003, 0);
      drawHouses(c, 620, t * 12, 0.7, 3, true);
      c.fillStyle = '#1c0b33'; c.fillRect(0, 620, W, 100);
      for (let i = 0; i < 30; i++) {
        const x = (i * 173 + t * 30 * (1 + (i % 3))) % (W + 40) - 20, y = (i * 97 + t * 60 * (1 + (i % 2))) % (H + 40) - 20;
        c.save(); c.translate(x, y); c.rotate(t * 2 + i); c.fillStyle = HOUSE_COLS[i % 8]; c.fillRect(-6, -3, 12, 6); c.restore();
      }
    }
  }
}
