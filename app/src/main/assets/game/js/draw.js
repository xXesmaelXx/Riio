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
  const pulse = focused ? 1 + Math.sin(G.t * 8) * 0.03 : 1;
  c.save();
  c.translate(x + w / 2, y + h / 2); c.scale(pulse, pulse); c.translate(-w / 2, -h / 2);
  const base = opts.disabled ? '#6b6480' : (opts.color || '#ff5d8f');
  const r = h * 0.38;
  c.fillStyle = 'rgba(0,0,0,0.28)'; rrect(c, 2, 8, w, h, r); c.fill();
  c.fillStyle = tone(base, -0.35); rrect(c, 0, 4, w, h, r); c.fill();
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, tone(base, 0.3)); g.addColorStop(0.5, base); g.addColorStop(1, tone(base, -0.12));
  c.fillStyle = g; rrect(c, 0, 0, w, h - 2, r); c.fill();
  c.strokeStyle = focused ? '#fff' : 'rgba(255,255,255,0.75)'; c.lineWidth = focused ? 6 : 3; rrect(c, 0, 0, w, h - 2, r); c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.35)'; rrect(c, 10, 5, w - 20, h * 0.34, r * 0.6); c.fill();
  if (focused) { c.strokeStyle = 'rgba(255,240,120,0.9)'; c.lineWidth = 4; rrect(c, -6, -6, w + 12, h + 10, r + 4); c.stroke(); }
  drawText(c, label, w / 2, h / 2 + (opts.size || h * 0.42) * 0.36, opts.size || h * 0.42, opts.disabled ? '#ccc' : '#fff', 'center');
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
// Glossy cartoon bird: shaded bodies, layered feathers, big expressive eyes.
// Draws a bird centred on (x,y). s = scale (1 ~ 70px wide). o: face (1|-1), flap (0..1), rot, hat, alpha, squash, mood
const _shadeCache = {};
function tone(hex, amt) {
  const k = hex + amt;
  if (!_shadeCache[k]) _shadeCache[k] = shade(hex, amt);
  return _shadeCache[k];
}
function radial(c, x, y, r, col, light = 0.35, dark = -0.3) {
  const g = c.createRadialGradient(x - r * 0.35, y - r * 0.45, r * 0.1, x, y, r * 1.15);
  g.addColorStop(0, tone(col, light));
  g.addColorStop(0.55, col);
  g.addColorStop(1, tone(col, dark));
  return g;
}
function featherPath(c, x, y, len, wid, ang) {
  c.save(); c.translate(x, y); c.rotate(ang);
  c.beginPath(); c.moveTo(0, -wid); c.quadraticCurveTo(len * 0.6, -wid * 1.1, len, 0); c.quadraticCurveTo(len * 0.6, wid * 1.1, 0, wid); c.closePath();
  c.restore();
}
function drawBird(c, x, y, s, ch, o = {}) {
  if (typeof ch === 'string') ch = CHARS[ch];
  const face = o.face || 1;
  const t = G.t + (o.phase || 0);
  const flap = o.flap != null ? o.flap : 0.5 + Math.sin(t * 3) * 0.15;
  const line = tone(ch.body, -0.5);
  const sp = ch.species;
  c.save();
  c.translate(x, y);
  if (o.rot) c.rotate(o.rot);
  c.scale(s * face, s * (o.squash || 1));
  if (o.alpha != null) c.globalAlpha = o.alpha;
  c.lineJoin = 'round'; c.lineCap = 'round';

  // legs and feet
  if (o.legs !== false) {
    const legCol = ch.legs || '#e8a24a';
    const lw = sp === 'spoonbill' ? 18 : 8;
    const step = o.walk ? Math.sin(t * 16) * 5 : 0;
    c.strokeStyle = tone(legCol, -0.35); c.lineWidth = 5.5;
    c.beginPath(); c.moveTo(-5, 14); c.lineTo(-6 + step, 22 + lw); c.moveTo(6, 14); c.lineTo(7 - step, 22 + lw); c.stroke();
    c.strokeStyle = legCol; c.lineWidth = 3.5; c.stroke();
    c.lineWidth = 3;
    for (const fx of [-6 + step, 7 - step]) {
      c.beginPath(); c.moveTo(fx - 4, 23 + lw); c.lineTo(fx + 6, 23 + lw); c.moveTo(fx, 22 + lw); c.lineTo(fx + 3, 25 + lw); c.stroke();
    }
  }
  // tail feathers fan
  const tails = ch.tail || [ch.wing];
  const tlen = sp === 'hummingbird' ? 24 : sp === 'parrot' ? 50 : sp === 'crow' ? 34 : 32;
  for (let i = tails.length - 1; i >= 0; i--) {
    const col = tails[i];
    for (let k = -1; k <= 1; k++) {
      featherPath(c, -16, 8 + i * 2, -(tlen - Math.abs(k) * 6 - i * 4), 6.5 - i, 0.32 + k * 0.16 + i * 0.08);
      const g = c.createLinearGradient(-16, 0, -16 - tlen, 0);
      g.addColorStop(0, tone(col, -0.15)); g.addColorStop(1, tone(col, 0.2));
      c.fillStyle = g; c.fill();
      c.strokeStyle = tone(col, -0.45); c.lineWidth = 1.3; c.stroke();
    }
  }
  // body
  ellipse(c, 0, 0, 25, 22);
  c.fillStyle = radial(c, 0, 0, 25, ch.body); c.fill();
  c.strokeStyle = line; c.lineWidth = 2; c.stroke();
  // belly with soft feather scallops
  c.save();
  ellipse(c, 0, 0, 25, 22); c.clip();
  ellipse(c, 8, 8, 16, 13, -0.2);
  c.fillStyle = radial(c, 8, 8, 16, ch.belly, 0.3, -0.15); c.fill();
  c.strokeStyle = tone(ch.belly, -0.18); c.lineWidth = 1.2;
  for (let r = 0; r < 2; r++) for (let k = 0; k < 3; k++) {
    c.beginPath(); c.arc(1 + k * 7 + r * 3, 5 + r * 7, 3.5, 0.2, Math.PI - 0.2); c.stroke();
  }
  c.restore();
  // wing: layered feathers, rotates with flap
  c.save();
  c.translate(-3, -5);
  c.rotate(-0.15 - flap * 1.2);
  if (sp === 'hummingbird') c.globalAlpha *= 0.8;
  const wingCol = ch.wing, tip = ch.wingTip || tone(ch.wing, -0.25);
  for (let k = 3; k >= 0; k--) {
    featherPath(c, -2, 3 + k * 2.5, -(30 - k * 3), 5.5, 0.12 + k * 0.1);
    c.fillStyle = k === 0 ? tip : tone(wingCol, -0.05 * k); c.fill();
    c.strokeStyle = tone(wingCol, -0.5); c.lineWidth = 1.2; c.stroke();
  }
  ellipse(c, -8, 1, 14, 9, 0.15);
  c.fillStyle = radial(c, -8, 1, 14, wingCol, 0.3, -0.25); c.fill();
  c.strokeStyle = tone(wingCol, -0.5); c.lineWidth = 1.4; c.stroke();
  c.restore();

  // head
  const hx = 14, hy = -18, hr = 17;
  const headCol = ch.head || ch.body;
  // tuft / crest behind the head
  const crestCol = ch.crest || headCol;
  const crestN = ch.crest ? 4 : sp === 'crow' ? 3 : 2;
  for (let i = 0; i < crestN; i++) {
    featherPath(c, hx - 4, hy - hr + 4, -(ch.crest ? 16 : 10) + i * 1.5, ch.crest ? 3.5 : 3, -1.9 + i * 0.32 + Math.sin(t * 2 + i) * 0.04);
    c.fillStyle = tone(crestCol, i % 2 ? -0.1 : 0.05); c.fill();
    c.strokeStyle = tone(crestCol, -0.45); c.lineWidth = 1.1; c.stroke();
  }
  c.beginPath(); c.arc(hx, hy, hr, 0, Math.PI * 2);
  c.fillStyle = radial(c, hx, hy, hr, headCol, 0.4, -0.28); c.fill();
  c.strokeStyle = line; c.lineWidth = 2; c.stroke();
  if (ch.cheek) { c.fillStyle = ch.cheek; ellipse(c, hx + 5, hy + 4, 8, 7); c.fill(); }
  // blush
  c.fillStyle = 'rgba(255,120,150,0.35)'; ellipse(c, hx + 9, hy + 7, 4.5, 2.6); c.fill();

  // beak
  const bx = hx + 2;
  const beakG = (x0, x1, col) => { const g = c.createLinearGradient(0, hy - 10, 0, hy + 10); g.addColorStop(0, tone(col, 0.35)); g.addColorStop(1, tone(col, -0.2)); return g; };
  c.strokeStyle = tone(ch.beak, -0.5); c.lineWidth = 1.6;
  switch (sp) {
    case 'toucan': {
      const gr = c.createLinearGradient(bx + 8, 0, bx + 50, 0);
      gr.addColorStop(0, '#ffe066'); gr.addColorStop(0.55, '#ff8a1a'); gr.addColorStop(1, '#e0341f');
      c.fillStyle = gr;
      c.beginPath(); c.moveTo(bx + 8, hy - 11); c.quadraticCurveTo(bx + 48, hy - 14, bx + 50, hy + 3); c.quadraticCurveTo(bx + 32, hy + 10, bx + 9, hy + 7); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = 'rgba(40,20,10,0.6)'; c.beginPath(); c.moveTo(bx + 10, hy - 1); c.quadraticCurveTo(bx + 30, hy + 1, bx + 47, hy - 1); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.45)'; ellipse(c, bx + 24, hy - 8, 10, 2.2, -0.05); c.fill();
      break;
    }
    case 'hummingbird':
      c.fillStyle = beakG(0, 0, ch.beak);
      c.beginPath(); c.moveTo(bx + 11, hy - 3); c.lineTo(bx + 44, hy + 1); c.lineTo(bx + 11, hy + 4); c.closePath(); c.fill(); c.stroke();
      break;
    case 'spoonbill':
      c.fillStyle = beakG(0, 0, ch.beak);
      c.beginPath(); c.moveTo(bx + 10, hy - 4); c.lineTo(bx + 34, hy - 2.5); c.quadraticCurveTo(bx + 46, hy - 7, bx + 46, hy + 1);
      c.quadraticCurveTo(bx + 46, hy + 9, bx + 34, hy + 4); c.lineTo(bx + 10, hy + 5); c.closePath(); c.fill(); c.stroke();
      break;
    case 'crow':
      c.fillStyle = beakG(0, 0, ch.beak);
      c.beginPath(); c.moveTo(bx + 9, hy - 7); c.quadraticCurveTo(bx + 26, hy - 5, bx + 34, hy + 2); c.quadraticCurveTo(bx + 22, hy + 6, bx + 9, hy + 7); c.closePath(); c.fill(); c.stroke();
      break;
    default: // hooked parrot beak, two-tone
      c.fillStyle = beakG(0, 0, ch.beak);
      c.beginPath(); c.moveTo(bx + 8, hy - 10); c.bezierCurveTo(bx + 26, hy - 14, bx + 34, hy, bx + 25, hy + 12);
      c.quadraticCurveTo(bx + 22, hy + 3, bx + 9, hy + 3); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = tone(ch.beak, -0.55);
      c.beginPath(); c.moveTo(bx + 9, hy + 3); c.quadraticCurveTo(bx + 18, hy + 4, bx + 20, hy + 8); c.quadraticCurveTo(bx + 15, hy + 12, bx + 9, hy + 9); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.5)'; ellipse(c, bx + 16, hy - 7, 5, 1.8, 0.1); c.fill();
  }

  // eye: large glossy cartoon eye
  const ex = hx + 4, ey = hy - 5;
  const blink = o.mood !== 'ko' && ((t * 0.7) % 4 < 0.12);
  if (ch.eyeRing) { c.fillStyle = ch.eyeRing; ellipse(c, ex, ey, 10.5, 12); c.fill(); }
  if (o.mood === 'ko') {
    c.strokeStyle = '#1a1020'; c.lineWidth = 2.6;
    c.beginPath(); c.moveTo(ex - 5, ey - 5); c.lineTo(ex + 5, ey + 5); c.moveTo(ex + 5, ey - 5); c.lineTo(ex - 5, ey + 5); c.stroke();
  } else {
    ellipse(c, ex, ey, 7.6, 9.4);
    c.fillStyle = '#fff'; c.fill();
    c.strokeStyle = tone(headCol, -0.55); c.lineWidth = 1.6; c.stroke();
    if (blink) {
      c.fillStyle = tone(headCol, -0.1); ellipse(c, ex, ey, 7.8, 9.6); c.fill();
      c.strokeStyle = '#1a1020'; c.lineWidth = 2; c.beginPath(); c.arc(ex, ey - 1, 6.5, 0.25, Math.PI - 0.25); c.stroke();
    } else {
      const look = o.look || 0;
      const ix = ex + 1.8 + look, iy = ey + 0.5;
      const ig = c.createRadialGradient(ix - 1, iy - 2, 0.5, ix, iy, 6);
      const iris = ch.iris || '#6b4a2a';
      ig.addColorStop(0, tone(iris, 0.45)); ig.addColorStop(1, tone(iris, -0.3));
      c.fillStyle = ig; c.beginPath(); c.arc(ix, iy, 5.6, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#120a18'; c.beginPath(); c.arc(ix + 0.4, iy + 0.3, 3.1, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(ix + 1.8, iy - 2.2, 1.7, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(ix - 1.6, iy + 2, 0.8, 0, Math.PI * 2); c.fill();
      // upper eyelid gives the eye some attitude
      c.save(); ellipse(c, ex, ey, 7.6, 9.4); c.clip();
      c.fillStyle = tone(headCol, -0.05);
      const lid = o.mood === 'angry' || ch.brow ? 3.5 : o.mood === 'happy' ? -3 : -6;
      c.beginPath(); c.moveTo(ex - 9, ey - 12); c.lineTo(ex + 9, ey - 12); c.lineTo(ex + 9, ey - 9 + lid + 2); c.quadraticCurveTo(ex, ey - 11 + lid, ex - 9, ey - 9 + lid - (o.mood === 'angry' || ch.brow ? 3 : 0)); c.closePath(); c.fill();
      c.restore();
    }
  }
  // brow
  c.strokeStyle = tone(headCol, -0.6); c.lineWidth = 2.6;
  c.beginPath();
  if (o.mood === 'angry' || ch.brow) { c.moveTo(ex - 7, ey - 15); c.quadraticCurveTo(ex, ey - 12, ex + 7, ey - 9); }
  else if (o.mood === 'ko') { c.moveTo(ex - 6, ey - 12); c.quadraticCurveTo(ex, ey - 15, ex + 6, ey - 12); }
  else { c.moveTo(ex - 6, ey - 13); c.quadraticCurveTo(ex + 1, ey - 17 - (o.mood === 'happy' ? 2 : 0), ex + 7, ey - 14); }
  c.stroke();

  // hat
  const hat = o.hat || 'none';
  if (hat !== 'none') drawHat(c, hat, hx - 1, hy - hr + 2);
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
function drawCloud(c, x, y, s, col = 'rgba(255,255,255,0.95)') {
  const puffs = [[0, 0, 26], [30, -14, 32], [62, -2, 25], [16, 8, 22], [46, 8, 24]];
  const storm = col[0] === '#';
  c.fillStyle = storm ? tone(col, -0.25) : 'rgba(170,205,235,0.75)';
  c.beginPath(); for (const [px, py, r] of puffs) { c.moveTo(x + px * s + r * s, y + py * s + 5 * s); c.arc(x + px * s, y + py * s + 5 * s, r * s, 0, 7); } c.fill();
  c.fillStyle = col;
  c.beginPath(); for (const [px, py, r] of puffs) { c.moveTo(x + px * s + r * s, y + py * s); c.arc(x + px * s, y + py * s, r * s, 0, 7); } c.fill();
  if (!storm) { c.fillStyle = 'rgba(255,255,255,0.9)'; c.beginPath(); c.arc(x + 24 * s, y - 22 * s, 14 * s, 0, 7); c.fill(); }
}
function sunGlow(c, x, y, r) {
  const g = c.createRadialGradient(x, y, r * 0.2, x, y, r * 4);
  g.addColorStop(0, 'rgba(255,250,220,0.95)'); g.addColorStop(0.25, 'rgba(255,240,170,0.45)'); g.addColorStop(1, 'rgba(255,240,170,0)');
  c.fillStyle = g; c.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
  c.fillStyle = '#fffbe6'; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
}
function drawUmbrella(c, x, y, s, cols) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = 'rgba(120,80,30,0.2)'; ellipse(c, 10, 4, 70, 10); c.fill();
  c.strokeStyle = '#7a5a3a'; c.lineWidth = 4; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -92); c.stroke();
  const n = 6;
  for (let i = 0; i < n; i++) {
    const x0 = -72 + i * 24, x1 = x0 + 24;
    c.fillStyle = cols[i % cols.length];
    c.beginPath(); c.moveTo(0, -100);
    c.lineTo(x0, -64 + Math.abs(x0) * 0.05);
    c.quadraticCurveTo((x0 + x1) / 2, -56, x1, -64 + Math.abs(x1) * 0.05);
    c.closePath(); c.fill();
  }
  c.strokeStyle = 'rgba(0,0,0,0.2)'; c.lineWidth = 1.5; c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.3)'; c.beginPath(); c.moveTo(0, -100); c.lineTo(-50, -72); c.lineTo(-20, -74); c.closePath(); c.fill();
  c.restore();
}
function drawBeachBall(c, x, y, r, rot = 0) {
  c.save(); c.translate(x, y); c.rotate(rot);
  const cols = ['#ff4d4d', '#ffffff', '#2f8cff', '#ffffff', '#ffc93c', '#ffffff'];
  for (let i = 0; i < 6; i++) {
    c.fillStyle = cols[i];
    c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, r, i * Math.PI / 3, (i + 1) * Math.PI / 3); c.closePath(); c.fill();
  }
  const g = c.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
  g.addColorStop(0, 'rgba(255,255,255,0.7)'); g.addColorStop(0.4, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,40,0.3)');
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 2; c.stroke();
  c.restore();
}
function drawSeaside(c, t, scroll = 0, horizon = 430) {
  // sunny bay: sky, hazy peaks, city strip, sea and beach
  const g = c.createLinearGradient(0, 0, 0, horizon);
  g.addColorStop(0, '#1e8fff'); g.addColorStop(0.6, '#62c4ff'); g.addColorStop(1, '#d6f4ff');
  c.fillStyle = g; c.fillRect(0, 0, W, horizon + 10);
  sunGlow(c, 1060, 110, 46);
  for (let i = 0; i < 5; i++) drawCloud(c, ((i * 330 + t * 10 - scroll * 0.05) % 1650) - 200, 70 + (i % 3) * 45, 0.8 + (i % 2) * 0.3);
  // hazy rounded peaks
  c.fillStyle = '#9cc7d9';
  c.beginPath(); c.moveTo(0, horizon);
  c.quadraticCurveTo(110, horizon - 120, 220, horizon - 40); c.quadraticCurveTo(300, horizon - 230, 380, horizon - 60);
  c.quadraticCurveTo(470, horizon - 90, 560, horizon - 30); c.lineTo(760, horizon - 30);
  c.quadraticCurveTo(880, horizon - 170, 990, horizon - 50); c.quadraticCurveTo(1110, horizon - 120, 1280, horizon - 40); c.lineTo(W, horizon); c.fill();
  c.fillStyle = '#7fb59a';
  c.beginPath(); c.moveTo(0, horizon); c.quadraticCurveTo(200, horizon - 60, 420, horizon - 15); c.quadraticCurveTo(700, horizon - 50, 900, horizon - 12); c.quadraticCurveTo(1100, horizon - 55, W, horizon - 10); c.lineTo(W, horizon); c.fill();
  // distant pastel city along the shore
  const rng = seeded(77);
  for (let x = -20; x < W; x += 22 + rng() * 20) {
    const h = 14 + rng() * 34;
    c.fillStyle = ['#f6d6c8', '#fff4e0', '#d8e8f0', '#f8e3a8', '#e9c6d8'][Math.floor(rng() * 5)];
    c.fillRect(x, horizon - h, 18 + rng() * 10, h);
  }
  // sea
  const sg = c.createLinearGradient(0, horizon, 0, horizon + 140);
  sg.addColorStop(0, '#1272d6'); sg.addColorStop(0.6, '#1ea7e1'); sg.addColorStop(1, '#5fe0e8');
  c.fillStyle = sg; c.fillRect(0, horizon, W, 150);
  for (let i = 0; i < 26; i++) {
    const x = ((i * 97 + t * 25) % (W + 60)) - 30, y = horizon + 10 + (i * 37) % 110;
    c.fillStyle = 'rgba(255,255,255,' + (0.35 + 0.35 * Math.sin(t * 3 + i)) + ')';
    c.fillRect(x, y, 14 + (i % 3) * 6, 2.5);
  }
  // foam line and sand
  const shore = horizon + 140;
  c.fillStyle = 'rgba(255,255,255,0.85)';
  c.beginPath(); c.moveTo(0, shore);
  for (let x = 0; x <= W; x += 40) c.quadraticCurveTo(x + 20, shore - 8 + Math.sin(t * 2 + x * 0.05) * 4, x + 40, shore);
  c.lineTo(W, shore + 12); c.lineTo(0, shore + 12); c.fill();
  const bg = c.createLinearGradient(0, shore, 0, H);
  bg.addColorStop(0, '#fbe3a6'); bg.addColorStop(1, '#f0c27a');
  c.fillStyle = bg; c.fillRect(0, shore + 8, W, H - shore);
  return shore;
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
  if (typeof World3D !== 'undefined' && World3D.request(theme, scroll)) return;
  const t = G.t;
  switch (theme) {
    case 'beach': {
      drawSeaside(c, t, scroll, 420);
      c.fillStyle = 'rgba(214,160,90,0.35)'; for (let i = 0; i < 30; i++) c.fillRect((i * 97) % W, 590 + (i * 37) % 120, 18, 3);
      drawUmbrella(c, 300, 600, 0.9, ['#ff4d6d', '#fff']);
      drawUmbrella(c, 960, 596, 0.85, ['#2f8cff', '#ffd23f']);
      c.fillStyle = '#ff8c42'; rrect(c, 250, 600, 90, 22, 6); c.fill(); c.fillStyle = '#fff'; c.fillRect(268, 600, 10, 22); c.fillRect(298, 600, 10, 22);
      drawPalm(c, 70, 600, 1.1, Math.sin(t * 1.3));
      drawPalm(c, 1210, 610, 1.2, Math.sin(t * 1.1 + 1));
      break;
    }
    case 'market': {
      skyGrad(c, '#ffb46b', '#ffe3b3', 520);
      sunGlow(c, 1080, 120, 50);
      for (let i = 0; i < 3; i++) drawCloud(c, ((i * 500 + t * 8 - scroll * 0.1) % 1700) - 200, 90 + i * 40, 0.8, 'rgba(255,255,255,0.7)');
      drawHouses(c, 420, scroll * 0.3, 0.7, 5);
      drawHouses(c, 560, scroll * 0.6, 1, 9);
      drawBunting(c, 150, scroll * 0.6 + t * 10);
      c.fillStyle = '#c99a6b'; c.fillRect(0, 560, W, 160);
      c.fillStyle = '#b5845a'; for (let i = 0; i < 20; i++) c.fillRect(((i * 140 - scroll) % 1400 + 1400) % 1400 - 70, 600 + (i % 3) * 35, 60, 6);
      break;
    }
    case 'sky': {
      skyGrad(c, '#1e8fff', '#bdeeff');
      sunGlow(c, 200, 120, 50);
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
      sunGlow(c, 980, 260, 70);
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
      for (let i = 0; i < 5; i++) { c.fillStyle = 'rgba(255,255,200,0.08)'; c.beginPath(); c.moveTo(200 + i * 240, 0); c.lineTo(280 + i * 240, 0); c.lineTo(160 + i * 240, H); c.lineTo(20 + i * 240, H); c.fill(); }
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
      // menu backdrop: sunny bay with drifting confetti
      const shore = drawSeaside(c, t, 0, 470);
      drawUmbrella(c, 160, 700, 1, ['#ff4d6d', '#fff']);
      drawUmbrella(c, 1150, 705, 0.9, ['#3ddc84', '#ffd23f']);
      drawBeachBall(c, 1020, 680, 26, t * 0.5);
      for (let i = 0; i < 26; i++) {
        const x = (i * 173 + t * 30 * (1 + (i % 3))) % (W + 40) - 20, y = (i * 97 + t * 60 * (1 + (i % 2))) % (H + 40) - 20;
        c.save(); c.translate(x, y); c.rotate(t * 2 + i); c.fillStyle = HOUSE_COLS[i % 8]; c.fillRect(-6, -3, 12, 6); c.restore();
      }
    }
  }
}

// Chunky, glossy, multi-coloured logo lettering.
function drawLogoWord(c, word, cx, y, size, colors, wobble = 0) {
  c.font = '900 ' + size + 'px ' + FONT;
  c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  const widths = [...word].map((ch) => c.measureText(ch).width * 0.96);
  let x = cx - widths.reduce((a, b) => a + b, 0) / 2;
  [...word].forEach((ch, i) => {
    const col = colors[i % colors.length];
    const yy = y + Math.sin(G.t * 3 + i * 0.7) * wobble;
    c.save(); c.translate(x + widths[i] / 2, yy); c.rotate(Math.sin(i * 1.7) * 0.06);
    c.lineJoin = 'round';
    for (let d = 10; d > 0; d -= 2) { c.fillStyle = tone(col, -0.55); c.fillText(ch, -widths[i] / 2 + d * 0.3, d); }
    c.strokeStyle = '#1d0f3a'; c.lineWidth = size * 0.12; c.strokeText(ch, -widths[i] / 2, 0);
    const g = c.createLinearGradient(0, -size * 0.8, 0, 0);
    g.addColorStop(0, tone(col, 0.45)); g.addColorStop(0.5, col); g.addColorStop(1, tone(col, -0.15));
    c.fillStyle = g; c.fillText(ch, -widths[i] / 2, 0);
    c.strokeStyle = '#fff'; c.lineWidth = size * 0.03; c.strokeText(ch, -widths[i] / 2, 0);
    c.restore();
    x += widths[i];
  });
}
