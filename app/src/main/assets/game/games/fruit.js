'use strict';
// FRUIT FRENZY: run, jump and flap to catch falling fruit. Dodge coconuts.

registerGame({
  id: 'fruit', name: 'Fruit Frenzy', song: 'beach', touch: 'stickA', theme: 'beach',
  desc: 'Fruit is falling from the trees! Catch as much as you can. Golden star fruit is worth 5, but coconuts will knock you silly.',
  controls: ['Move: Left Stick / D-Pad', 'Jump & Flap: A (flap twice in the air)'],
  controlsTouch: ['Move: drag on the left side', 'Jump & Flap: tap A'],
  create(players, params) { return new FruitGame(players, params); },
});

const FRUIT_TYPES = [
  { k: 'mango', v: 1, w: 30 }, { k: 'banana', v: 1, w: 28 }, { k: 'grape', v: 2, w: 16 },
  { k: 'pineapple', v: 3, w: 10 }, { k: 'star', v: 5, w: 4 }, { k: 'coconut', v: 0, w: 14, bad: true },
];
function pickWeighted(list) {
  const tot = list.reduce((a, b) => a + b.w, 0);
  let r = Math.random() * tot;
  for (const it of list) { r -= it.w; if (r <= 0) return it; }
  return list[0];
}

class FruitGame {
  constructor(players, params) {
    this.players = players;
    this.hard = !!params.hard;
    this.theme = params.theme || 'beach';
    this.duration = params.duration || 45;
    this.timeLeft = this.duration;
    this.scores = players.map(() => 0);
    this.ground = 615;
    this.fx = new Particles();
    this.fruits = [];
    this.spawnT = 0.5;
    this.birds = players.map((p, i) => ({
      x: 220 + i * 280, y: this.ground - 42, vx: 0, vy: 0, onGround: true, flaps: 0, stun: 0, face: i < 2 ? 1 : -1,
      ai: { t: 0, tx: 220 + i * 280, jumpT: 0 }, speed: 400 * CHARS[p.char].speed,
    }));
  }
  spawnFruit() {
    const ty = pickWeighted(FRUIT_TYPES);
    const g = this.hard ? 430 : 320;
    this.fruits.push({ x: rand(70, W - 70), y: -30, vy: rand(60, 160), g, type: ty, rot: rand(0, 6), vr: rand(-3, 3), ground: 0, gone: false });
  }
  ai(i, dt) {
    const b = this.birds[i], a = b.ai, p = this.players[i], k = aiCtl();
    a.t -= dt;
    const catchY = this.ground - 60;
    if (a.t <= 0) {
      a.t = lerp(0.55, 0.15, p.skill) + rand(0, 0.15);
      let best = null, bestV = -1;
      for (const f of this.fruits) {
        if (f.gone || f.type.bad) continue;
        const dy = catchY - f.y;
        const tReach = dy > 0 ? (-f.vy + Math.sqrt(f.vy * f.vy + 2 * f.g * dy)) / f.g : 0.3;
        const need = Math.abs(f.x - b.x) / b.speed;
        if (need > tReach + 0.35) continue;
        const v = f.type.v / (1 + need) + rand(0, 1 - p.skill);
        if (v > bestV) { bestV = v; best = f; }
      }
      a.target = best;
      a.tx = best ? best.x : b.x + rand(-200, 200);
    }
    let tx = a.tx;
    // dodge coconuts above us
    for (const f of this.fruits) {
      if (!f.type.bad || f.ground || f.gone) continue;
      if (Math.abs(f.x - b.x) < 70 && f.y > 150 && f.y < b.y && Math.random() < p.skill + 0.2) tx = b.x + (b.x < f.x ? -160 : 160);
    }
    const dx = tx - b.x;
    k.x = Math.abs(dx) > 14 ? Math.sign(dx) : 0;
    const t = a.target;
    if (t && !t.gone && Math.abs(t.x - b.x) < 80 && t.y > b.y - 260 && t.y < b.y - 70 && Math.random() < 0.06 + p.skill * 0.1) k.aP = true;
    return k;
  }
  update(dt) {
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) { this.timeLeft = 0; this.done = true; }
    const prog = 1 - this.timeLeft / this.duration;
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnFruit();
      if (this.players.length > 2 && Math.random() < 0.4) this.spawnFruit();
      this.spawnT = lerp(this.hard ? 0.5 : 0.7, this.hard ? 0.22 : 0.34, prog);
    }
    this.birds.forEach((b, i) => {
      const p = this.players[i];
      const k = b.stun > 0 ? NO_CTL : (p.human ? humanCtl(p.slot) : this.ai(i, dt));
      b.stun = Math.max(0, b.stun - dt);
      b.vx = approach(b.vx, k.x * b.speed, 2600 * dt);
      if (k.x) b.face = Math.sign(k.x);
      if (k.aP) {
        if (b.onGround) { b.vy = -660; b.onGround = false; b.flaps = 2; Sound.sfx('jump'); }
        else if (b.flaps > 0) { b.flaps--; b.vy = -500; Sound.sfx('flap'); }
      }
      b.vy += 1500 * dt;
      b.x = clamp(b.x + b.vx * dt, 40, W - 40);
      b.y += b.vy * dt;
      if (b.y < 110) { b.y = 110; b.vy = Math.max(0, b.vy); }
      if (b.y >= this.ground - 42) { b.y = this.ground - 42; b.vy = 0; b.onGround = true; }
    });
    // birds bump into each other
    for (let i = 0; i < this.birds.length; i++) for (let j = i + 1; j < this.birds.length; j++) {
      const a = this.birds[i], b = this.birds[j];
      const d = dist(a.x, a.y, b.x, b.y);
      if (d < 56 && d > 0) { const push = (56 - d) / 2 * Math.sign(a.x - b.x || 1); a.x += push; b.x -= push; }
    }
    for (const f of this.fruits) {
      if (f.ground) { f.ground += dt; if (f.ground > 0.9) f.gone = true; }
      else {
        f.vy += f.g * dt; f.y += f.vy * dt; f.rot += f.vr * dt;
        if (f.y >= this.ground - 16) {
          f.y = this.ground - 16; f.ground = 0.001;
          if (f.type.bad) Sound.sfx('bump');
        }
      }
      if (f.gone) continue;
      this.birds.forEach((b, i) => {
        if (f.gone || dist(b.x + b.face * 8, b.y - 6, f.x, f.y) > 50) return;
        if (f.type.bad) {
          if (f.ground || b.stun > 0) return;
          b.stun = 1.3; f.gone = true; this.scores[i] = Math.max(0, this.scores[i] - 1);
          Sound.sfx('hit'); this.fx.burst(f.x, f.y, 14, ['#6b4226', '#3d2412', '#fff'], 300);
          this.fx.text(b.x, b.y - 60, 'BONK!', '#ff8fa3');
          if (this.players[i].human) vibrate(120);
        } else {
          f.gone = true; this.scores[i] += f.type.v;
          Sound.sfx(f.type.v >= 3 ? 'big' : 'coin');
          this.fx.burst(f.x, f.y, 10, ['#ffd23f', '#fff', '#ff8c42'], 220);
          this.fx.text(f.x, f.y - 30, '+' + f.type.v, this.players[i].color);
        }
      });
    }
    this.fruits = this.fruits.filter((f) => !f.gone);
    this.fx.update(dt);
  }
  draw(c) {
    drawBackground(c, this.theme === 'beach' ? 'beach' : this.theme);
    if (this.theme !== 'beach') { // grassy ground for other themes
      c.fillStyle = '#4caf50'; c.fillRect(0, this.ground - 4, W, H);
      c.fillStyle = '#3b8f3e'; for (let i = 0; i < 40; i++) c.fillRect(i * 33, this.ground - 4, 14, 8);
      c.fillStyle = '#6d4c2f'; c.fillRect(0, this.ground + 50, W, H);
    }
    // canopy
    c.fillStyle = '#2f9e44';
    for (let i = 0; i < 12; i++) { c.beginPath(); c.arc(i * 120 + 40, -10 + (i % 2) * 18, 80, 0, 7); c.fill(); }
    c.fillStyle = '#237a35';
    for (let i = 0; i < 12; i++) { c.beginPath(); c.arc(i * 120 + 100, -30, 60, 0, 7); c.fill(); }
    for (const f of this.fruits) {
      const h = clamp((this.ground - f.y) / 600, 0, 1);
      c.fillStyle = 'rgba(0,0,0,' + (0.3 * (1 - h)) + ')';
      ellipse(c, f.x, this.ground, 18 * (1 - h * 0.5), 5); c.fill();
    }
    this.birds.forEach((b) => { c.fillStyle = 'rgba(0,0,0,0.25)'; ellipse(c, b.x, this.ground, 34, 8); c.fill(); });
    for (const f of this.fruits) {
      c.globalAlpha = f.ground > 0.6 ? 1 - (f.ground - 0.6) / 0.3 : 1;
      drawFruit(c, f.type.k, f.x, f.y, 1.4, f.rot); c.globalAlpha = 1;
    }
    this.birds.forEach((b, i) => {
      const p = this.players[i];
      const flap = b.onGround ? 0.3 : 0.5 + Math.sin(G.t * 20) * 0.5;
      drawBird(c, b.x, b.y, 1.2, p.char, { face: b.face, flap, hat: p.hat, walk: b.onGround && Math.abs(b.vx) > 40, mood: b.stun > 0 ? 'ko' : null, rot: b.stun > 0 ? Math.sin(G.t * 20) * 0.2 : 0 });
      if (b.stun > 0) for (let s = 0; s < 3; s++) starShape(c, b.x + Math.cos(G.t * 6 + s * 2.1) * 30, b.y - 58 + Math.sin(G.t * 6 + s * 2.1) * 8, 7, true);
      drawText(c, playerLabel(p), b.x, b.y - 72, 18, p.color, 'center');
    });
    this.fx.draw(c);
  }
}
