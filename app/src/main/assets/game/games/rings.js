'use strict';
// RING RUSH: fly through cloud rings before your rivals. Avoid storm clouds.

registerGame({
  id: 'rings', name: 'Ring Rush', song: 'sky', touch: 'stickA', fruitRate: 1,
  desc: 'Fly through the rings before anyone else! Gold rings are worth 3. Storm clouds will zap you. Use your boost to steal rings!',
  controls: ['Fly: Left Stick / D-Pad', 'Boost: A'],
  controlsTouch: ['Fly: drag on the left side', 'Boost: tap A'],
  create(players, params) { return new RingGame(players, params); },
});

class RingGame {
  constructor(players, params) {
    this.players = players;
    this.duration = params.duration || 45;
    this.timeLeft = this.duration;
    this.scores = players.map(() => 0);
    this.fx = new Particles();
    this.scroll = 0;
    this.rings = []; this.clouds = [];
    this.ringT = 0.5; this.cloudT = 3;
    this.birds = players.map((p, i) => ({ x: 200, y: 200 + i * 110, vx: 0, vy: 0, boost: 0, cool: 0, stun: 0, speed: CHARS[p.char].speed, ai: { t: 0, ty: 360, tx: 260 } }));
  }
  spd() { return lerp(240, 360, 1 - this.timeLeft / this.duration); }
  spawnRings() {
    const pattern = randi(0, 3), y0 = rand(170, 560);
    const n = pattern === 0 ? 1 : randi(3, 5);
    for (let k = 0; k < n; k++) {
      let y = y0;
      if (pattern === 1) y = y0 + Math.sin(k * 1.2) * 110;
      if (pattern === 2) y = clamp(y0 + (k - n / 2) * 70, 150, 620);
      if (pattern === 3) y = k % 2 ? 220 : 520;
      this.rings.push({ x: W + 60 + k * 170, y: clamp(y, 150, 620), gold: Math.random() < 0.14, taken: -1, prev: {} });
    }
  }
  ai(i, dt) {
    const b = this.birds[i], p = this.players[i], a = b.ai, k = aiCtl();
    a.t -= dt;
    if (a.t <= 0) {
      a.t = lerp(0.6, 0.15, p.skill);
      let best = null, bv = -Infinity;
      for (const r of this.rings) {
        if (r.taken >= 0 || r.x < b.x + 20) continue;
        const tArr = (r.x - b.x) / (this.spd() + 200);
        const needY = Math.abs(r.y - b.y) / 430;
        if (needY > tArr + 0.3) continue;
        const v = (r.gold ? 3 : 1) / (1 + tArr) + rand(0, 0.5 * (1 - p.skill));
        if (v > bv) { bv = v; best = r; }
      }
      a.ring = best;
      a.ty = best ? best.y + rand(-1, 1) * (1 - p.skill) * 40 : 380;
      a.tx = best ? Math.min(best.x - 60, 700) : 300;
    }
    let ty = a.ty, tx = a.tx;
    for (const cl of this.clouds) {
      if (cl.x > b.x - 60 && cl.x - b.x < 260 && Math.abs(cl.y - b.y) < 110 && Math.random() < 0.5 + p.skill * 0.5) ty = cl.y + (b.y < cl.y ? -170 : 170);
    }
    const dy = ty - b.y, dx = tx - b.x;
    k.y = clamp(dy / 80, -1, 1); k.x = clamp(dx / 120, -1, 1);
    if (a.ring && a.ring.taken < 0 && b.cool <= 0 && a.ring.x - b.x < 320 && Math.abs(a.ring.y - b.y) < 60 && Math.random() < p.skill * 0.08) k.aP = true;
    return k;
  }
  update(dt) {
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) { this.timeLeft = 0; this.done = true; }
    const sp = this.spd();
    this.scroll += sp * dt;
    this.ringT -= dt; this.cloudT -= dt;
    if (this.ringT <= 0) { this.spawnRings(); this.ringT = rand(1.4, 2.2); }
    if (this.cloudT <= 0) { this.clouds.push({ x: W + 120, y: rand(170, 600), vy: rand(-30, 30), ph: rand(0, 6) }); this.cloudT = rand(1.6, 3.2) * (this.timeLeft > this.duration / 2 ? 1.3 : 0.8); }
    for (const r of this.rings) r.x -= sp * dt;
    for (const cl of this.clouds) { cl.x -= sp * 1.1 * dt; cl.y = clamp(cl.y + cl.vy * dt, 150, 620); }
    this.rings = this.rings.filter((r) => r.x > -80);
    this.clouds = this.clouds.filter((cl) => cl.x > -200);
    this.birds.forEach((b, i) => {
      const p = this.players[i];
      const k = b.stun > 0 ? NO_CTL : (p.human ? humanCtl(p.slot) : this.ai(i, dt));
      b.stun -= dt; b.boost -= dt; b.cool -= dt;
      if (k.aP && b.cool <= 0) { b.boost = 0.6; b.cool = 2.2; Sound.sfx('boost'); }
      const mx = 430 * b.speed * (b.boost > 0 ? 1.8 : 1);
      b.vx = approach(b.vx, k.x * mx, 2400 * dt);
      b.vy = approach(b.vy, k.y * mx, 2400 * dt);
      if (b.stun > 0) { b.vy = 160; b.vx = -120; }
      b.x = clamp(b.x + b.vx * dt, 50, W - 60);
      b.y = clamp(b.y + b.vy * dt, 130, H - 40);
      if (b.boost > 0 && Math.random() < 0.6) this.fx.burst(b.x - 30, b.y, 1, ['#fff', p.color], 60, { g: 0, life: 0.6 });
      for (const r of this.rings) {
        const side = b.x > r.x ? 1 : -1;
        const was = r.prev[i];
        r.prev[i] = side;
        if (r.taken >= 0 || was == null || was === side) continue;
        if (Math.abs(b.y - r.y) < 50) {
          r.taken = i;
          const v = r.gold ? 3 : 1;
          this.scores[i] += v;
          Sound.sfx(r.gold ? 'big' : 'coin');
          this.fx.ring(r.x, r.y, r.gold ? '#ffd23f' : p.color, 50);
          this.fx.text(r.x, r.y - 70, '+' + v, p.color);
        }
      }
      for (const cl of this.clouds) {
        if (b.stun <= 0 && dist(b.x, b.y, cl.x, cl.y) < 62) {
          b.stun = 1.2; Sound.sfx('hit'); if (p.human) vibrate(150);
          this.fx.burst(b.x, b.y, 12, ['#fff27a', '#fff'], 280, { g: 0 });
        }
      }
    });
    this.fx.update(dt);
  }
  drawRing(c, r, front) {
    const col = r.taken >= 0 ? 'rgba(255,255,255,0.25)' : r.gold ? '#ffd23f' : '#ff5d8f';
    c.strokeStyle = col; c.lineWidth = 10;
    c.beginPath(); c.ellipse(r.x, r.y, 20, 58, 0, front ? -Math.PI / 2 : Math.PI / 2, front ? Math.PI / 2 : Math.PI * 1.5); c.stroke();
    if (!front && r.taken < 0) { c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 3; c.beginPath(); c.ellipse(r.x - 3, r.y, 14, 50, 0, Math.PI / 2, Math.PI * 1.5); c.stroke(); }
  }
  draw(c) {
    drawBackground(c, 'sky', this.scroll);
    for (const r of this.rings) this.drawRing(c, r, false);
    for (const cl of this.clouds) {
      drawCloud(c, cl.x - 60, cl.y + 10, 1.1, '#5b5f7a');
      drawCloud(c, cl.x - 50, cl.y, 0.9, '#7d819e');
      if (Math.sin(G.t * 9 + cl.ph) > 0.7) {
        c.strokeStyle = '#fff27a'; c.lineWidth = 4;
        c.beginPath(); c.moveTo(cl.x - 5, cl.y + 25); c.lineTo(cl.x - 18, cl.y + 50); c.lineTo(cl.x + 2, cl.y + 50); c.lineTo(cl.x - 12, cl.y + 80); c.stroke();
      }
    }
    this.birds.forEach((b, i) => {
      const p = this.players[i];
      drawBird(c, b.x, b.y, 1.05, p.char, { hat: p.hat, legs: false, flap: 0.5 + Math.sin(G.t * (b.boost > 0 ? 30 : 16) + i) * 0.5, rot: b.stun > 0 ? G.t * 12 : clamp(b.vy / 1600, -0.35, 0.35), mood: b.stun > 0 ? 'ko' : null });
      drawText(c, playerLabel(p), b.x, b.y - 46, 17, p.color, 'center');
    });
    for (const r of this.rings) this.drawRing(c, r, true);
    this.fx.draw(c);
  }
}
