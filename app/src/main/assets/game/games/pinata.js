'use strict';
// PIÑATA POP: aim your target and throw berries at floating piñatas and balloons.

registerGame({
  id: 'pinata', name: 'Piñata Pop', song: 'market', touch: 'stickA', fruitRate: 0.1,
  desc: 'Aim and throw berries to pop piñatas! Balloons 10, star piñatas 25, golden birds 50. Do NOT hit the crow balloons (-30).',
  controls: ['Aim: Left Stick / D-Pad', 'Throw: A'],
  controlsTouch: ['Aim: drag on the left side', 'Throw: tap A'],
  create(players, params) { return new PinataGame(players, params); },
});

const PINATA_TYPES = [
  { k: 'balloon', v: 10, r: 32, w: 40 },
  { k: 'star', v: 25, r: 40, w: 25 },
  { k: 'gold', v: 50, r: 26, w: 8 },
  { k: 'crow', v: -30, r: 34, w: 16 },
];

class PinataGame {
  constructor(players, params) {
    this.players = players;
    this.hard = !!params.hard;
    this.theme = params.theme || 'market';
    this.duration = params.duration || 45;
    this.timeLeft = this.duration;
    this.scores = players.map(() => 0);
    this.fx = new Particles();
    this.targets = [];
    this.shots = [];
    this.spawnT = 0;
    this.aims = players.map((p, i) => ({ x: 260 + i * 250, y: 380, cool: 0, ai: { t: 0, target: null, ox: 0, oy: 0 } }));
    for (let i = 0; i < 4; i++) this.spawn(true);
  }
  spawn(initial) {
    const ty = pickWeighted(PINATA_TYPES);
    const fromLeft = Math.random() < 0.5;
    const sp = (ty.k === 'gold' ? 260 : rand(70, 150)) * (this.hard ? 1.35 : 1);
    const t = { type: ty, x: initial ? rand(200, 1080) : (fromLeft ? -50 : W + 50), y: rand(170, 520), vx: fromLeft ? sp : -sp, vy: 0, phase: rand(0, 6), amp: rand(10, 50), age: 0, hit: false };
    if (ty.k === 'balloon') { t.x = rand(120, 1160); t.y = H + 50; t.vx = rand(-30, 30); t.vy = -rand(70, 120) * (this.hard ? 1.3 : 1); }
    this.targets.push(t);
  }
  ai(i, dt) {
    const a = this.aims[i], p = this.players[i], st = a.ai, k = aiCtl();
    st.t -= dt;
    if (st.t <= 0 || !st.target || st.target.hit || !this.targets.includes(st.target)) {
      st.t = lerp(1.2, 0.5, p.skill);
      let best = null, bv = -Infinity;
      for (const t of this.targets) {
        if (t.hit || t.type.v < 0 || t.x < 30 || t.x > W - 30 || t.y > H - 30) continue;
        const v = t.type.v / (1 + dist(a.x, a.y, t.x, t.y) / 400) + rand(0, 20 * (1 - p.skill));
        if (v > bv) { bv = v; best = t; }
      }
      st.target = best;
      st.ox = rand(-1, 1) * (1 - p.skill) * 40; st.oy = rand(-1, 1) * (1 - p.skill) * 40;
    }
    const t = st.target;
    if (!t) return k;
    const tx = t.x + t.vx * 0.22 + st.ox, ty = t.y + t.vy * 0.22 + st.oy;
    const dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy);
    const sp = lerp(0.45, 1, p.skill);
    if (d > 6) { k.x = clamp(dx / 60, -1, 1) * sp; k.y = clamp(dy / 60, -1, 1) * sp; }
    if (d < t.type.r * 0.7 && a.cool <= 0 && Math.random() < 0.3 + p.skill * 0.5) k.aP = true;
    return k;
  }
  update(dt) {
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) { this.timeLeft = 0; this.done = true; }
    this.spawnT -= dt;
    if (this.spawnT <= 0 && this.targets.length < (this.hard ? 13 : 10)) { this.spawn(); this.spawnT = this.hard ? rand(0.3, 0.55) : rand(0.45, 0.8); }
    for (const t of this.targets) {
      t.age += dt;
      t.x += t.vx * dt; t.y += t.vy * dt;
      if (t.type.k !== 'balloon') t.y += Math.cos(t.age * 2 + t.phase) * t.amp * dt;
    }
    this.targets = this.targets.filter((t) => !t.hit && t.x > -120 && t.x < W + 120 && t.y > -100);
    this.aims.forEach((a, i) => {
      const p = this.players[i];
      const k = p.human ? humanCtl(p.slot) : this.ai(i, dt);
      a.cool -= dt;
      a.x = clamp(a.x + k.x * 820 * dt, 20, W - 20);
      a.y = clamp(a.y + k.y * 820 * dt, 90, H - 20);
      if (k.aP && a.cool <= 0) {
        a.cool = 0.32;
        const sx = 160 + i * 320;
        this.shots.push({ i, sx, sy: H + 30, tx: a.x, ty: a.y, t: 0 });
        Sound.sfx('throw');
      }
    });
    for (const s of this.shots) {
      s.t += dt / 0.22;
      if (s.t >= 1 && !s.done) {
        s.done = true;
        let hit = null, hd = Infinity;
        for (const t of this.targets) { const d = dist(s.tx, s.ty, t.x, t.y); if (!t.hit && d < t.type.r + 14 && d < hd) { hd = d; hit = t; } }
        if (hit) {
          hit.hit = true;
          const v = hit.type.v;
          this.scores[s.i] = Math.max(0, this.scores[s.i] + v);
          if (v > 0) {
            Sound.sfx(v >= 50 ? 'big' : 'pop');
            this.fx.confetti(hit.x, hit.y, v >= 25 ? 30 : 14);
            if (this.players[s.i].human && v >= 50) vibrate(40);
          } else {
            Sound.sfx('squawk'); this.fx.burst(hit.x, hit.y, 16, ['#2a2340', '#555'], 260);
            if (this.players[s.i].human) vibrate(150);
          }
          this.fx.text(hit.x, hit.y - 30, (v > 0 ? '+' : '') + v, v > 0 ? this.players[s.i].color : '#ff4d6d', 34);
        } else this.fx.burst(s.tx, s.ty, 5, ['#e8322f', '#9c1f1c'], 120);
      }
    }
    this.shots = this.shots.filter((s) => s.t < 1.1);
    this.fx.update(dt);
  }
  drawTarget(c, t) {
    const x = t.x, y = t.y;
    switch (t.type.k) {
      case 'balloon': {
        const col = ['#ff5d8f', '#4d9bff', '#3ddc84', '#ffc93c'][Math.floor(t.phase) % 4];
        c.strokeStyle = '#ddd'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y + 34); c.quadraticCurveTo(x + 8, y + 55, x, y + 75); c.stroke();
        c.fillStyle = col; ellipse(c, x, y, 28, 34); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.45)'; ellipse(c, x - 9, y - 12, 7, 11, -0.4); c.fill();
        break;
      }
      case 'star': {
        c.strokeStyle = '#7a5a3a'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y - 40); c.lineTo(x, y - 90); c.stroke();
        c.save(); c.translate(x, y); c.rotate(Math.sin(t.age * 3) * 0.2);
        starShape(c, 0, 0, 42, true, '#ff8c42');
        starShape(c, 0, 0, 24, true, '#ffd23f');
        for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 5; c.fillStyle = HOUSE_COLS[i]; ellipse(c, Math.cos(a) * 44, Math.sin(a) * 44 + 8, 4, 10, a); c.fill(); }
        c.restore();
        break;
      }
      case 'gold':
        c.save(); c.shadowColor = '#fff27a'; c.shadowBlur = 20;
        drawBird(c, x, y, 0.75, { species: 'hummingbird', body: '#ffd23f', belly: '#fff3a8', wing: '#fff27a', head: '#ffcc00', beak: '#b5770c', tail: ['#ffb000'] }, { face: t.vx > 0 ? 1 : -1, flap: 0.5 + Math.sin(G.t * 40) * 0.5, legs: false });
        c.restore();
        break;
      case 'crow':
        c.strokeStyle = '#ddd'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y + 34); c.lineTo(x, y + 75); c.stroke();
        c.fillStyle = '#2a2340'; ellipse(c, x, y, 30, 34); c.fill();
        c.fillStyle = '#e0b33a'; c.beginPath(); c.moveTo(x - 6, y + 2); c.lineTo(x + 6, y + 2); c.lineTo(x, y + 14); c.fill();
        c.fillStyle = '#ff4d6d'; c.beginPath(); c.arc(x - 9, y - 6, 4, 0, 7); c.arc(x + 9, y - 6, 4, 0, 7); c.fill();
        c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.moveTo(x - 16, y - 16); c.lineTo(x - 4, y - 11); c.moveTo(x + 16, y - 16); c.lineTo(x + 4, y - 11); c.stroke();
        break;
    }
  }
  draw(c) {
    drawBackground(c, this.theme);
    for (const t of this.targets) this.drawTarget(c, t);
    for (const s of this.shots) {
      if (s.t > 1) continue;
      const x = lerp(s.sx, s.tx, s.t), y = lerp(s.sy, s.ty, s.t) - Math.sin(s.t * Math.PI) * 120;
      drawFruit(c, 'berry', x, y, 1.1 - s.t * 0.4);
    }
    this.fx.draw(c);
    this.aims.forEach((a, i) => {
      const p = this.players[i], cool = a.cool > 0;
      c.strokeStyle = p.color; c.lineWidth = 5; c.globalAlpha = cool ? 0.55 : 1;
      c.beginPath(); c.arc(a.x, a.y, 24, 0, 7); c.stroke();
      c.beginPath(); c.moveTo(a.x - 36, a.y); c.lineTo(a.x - 12, a.y); c.moveTo(a.x + 12, a.y); c.lineTo(a.x + 36, a.y);
      c.moveTo(a.x, a.y - 36); c.lineTo(a.x, a.y - 12); c.moveTo(a.x, a.y + 12); c.lineTo(a.x, a.y + 36); c.stroke();
      c.globalAlpha = 1;
      drawText(c, playerLabel(p), a.x + 30, a.y - 26, 18, p.color);
    });
    // throwers along the bottom
    this.players.forEach((p, i) => drawBird(c, 160 + i * 320, H - 18, 0.9, p.char, { hat: p.hat, face: 1, legs: false, flap: this.aims[i].cool > 0.15 ? 1 : 0.3 }));
  }
}
