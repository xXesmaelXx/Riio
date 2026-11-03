'use strict';
// RAPID RIVER: steer a leaf raft down the jungle rapids. Grab fruit, dodge rocks and logs.

registerGame({
  id: 'river', name: 'Rapid River', song: 'jungle', touch: 'stickA', fruitRate: 0.1,
  desc: 'Ride the jungle rapids on a leaf! Grab fruit for points. Rocks and logs knock off 15 points. Hop to jump over danger!',
  controls: ['Steer: Left Stick / D-Pad', 'Hop: A'],
  controlsTouch: ['Steer: drag on the left side', 'Hop: tap A'],
  create(players, params) { return new RiverGame(players, params); },
});

class RiverGame {
  constructor(players, params) {
    this.players = players;
    this.duration = params.duration || 45;
    this.timeLeft = this.duration;
    this.scores = players.map(() => 0);
    this.fx = new Particles();
    this.L = 250; this.R = 1030;
    this.objs = [];
    this.flow = 0;
    this.spawnT = 0.5; this.fruitT = 0.3;
    this.boats = players.map((p, i) => ({ x: 340 + i * 200, y: 560, vx: 0, vy: 0, hop: 0, cool: 0, stun: 0, inv: 0, speed: CHARS[p.char].speed, ai: { t: 0, tx: 340 + i * 200 } }));
  }
  spd() { return lerp(230, 400, 1 - this.timeLeft / this.duration); }
  spawn() {
    const r = Math.random();
    if (r < 0.55) this.objs.push({ k: 'rock', x: rand(this.L + 40, this.R - 40), y: -60, r: rand(28, 42) });
    else if (r < 0.85) { const dir = Math.random() < 0.5 ? 1 : -1; this.objs.push({ k: 'log', x: rand(this.L + 120, this.R - 120), y: -60, w: 170, h: 30, vx: dir * rand(60, 140) }); }
    else this.objs.push({ k: 'whirl', x: rand(this.L + 100, this.R - 100), y: -80, r: 75 });
  }
  hits(o, b) {
    if (o.k === 'rock') return dist(o.x, o.y, b.x, b.y) < o.r + 26;
    if (o.k === 'log') return Math.abs(b.x - o.x) < o.w / 2 + 22 && Math.abs(b.y - o.y) < o.h / 2 + 22;
    return false;
  }
  ai(i, dt) {
    const b = this.boats[i], p = this.players[i], a = b.ai, k = aiCtl();
    a.t -= dt;
    if (a.t <= 0) {
      a.t = lerp(0.5, 0.12, p.skill);
      // score candidate columns
      let bestX = b.x, bestV = -Infinity;
      for (let cx = this.L + 50; cx <= this.R - 50; cx += 40) {
        let v = -Math.abs(cx - b.x) / 300;
        for (const o of this.objs) {
          if (o.y > b.y + 20 || o.y < b.y - 420) continue;
          const near = 1 - (b.y - o.y) / 420;
          if (o.k === 'fruit' && Math.abs(o.x - cx) < 40) v += (o.gold ? 3 : 1) * (0.5 + near);
          if ((o.k === 'rock' && Math.abs(o.x - cx) < o.r + 40) || (o.k === 'log' && Math.abs(o.x - cx) < o.w / 2 + 40)) v -= 3 * (0.5 + near) * (0.4 + p.skill);
        }
        v += rand(0, 0.6 * (1 - p.skill));
        if (v > bestV) { bestV = v; bestX = cx; }
      }
      a.tx = bestX;
    }
    k.x = clamp((a.tx - b.x) / 60, -1, 1);
    k.y = clamp((560 - b.y) / 80, -1, 1);
    if (b.cool <= 0) for (const o of this.objs) {
      if ((o.k === 'rock' || o.k === 'log') && o.y < b.y && b.y - o.y < 110 && this.hits({ ...o, y: b.y }, b) && Math.random() < p.skill) k.aP = true;
    }
    return k;
  }
  update(dt) {
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) { this.timeLeft = 0; this.done = true; }
    const sp = this.spd();
    this.flow += sp * dt;
    this.spawnT -= dt; this.fruitT -= dt;
    if (this.spawnT <= 0) { this.spawn(); this.spawnT = lerp(1.0, 0.5, 1 - this.timeLeft / this.duration) * rand(0.7, 1.2); }
    if (this.fruitT <= 0) {
      const gold = Math.random() < 0.12;
      this.objs.push({ k: 'fruit', x: rand(this.L + 40, this.R - 40), y: -40, gold, kind: gold ? 'star' : pick(['mango', 'banana', 'grape', 'pineapple']) });
      this.fruitT = rand(0.35, 0.7);
    }
    for (const o of this.objs) {
      o.y += sp * dt;
      if (o.k === 'log') { o.x += o.vx * dt; if (o.x < this.L + o.w / 2 || o.x > this.R - o.w / 2) o.vx *= -1; }
    }
    this.boats.forEach((b, i) => {
      const p = this.players[i];
      const k = b.stun > 0 ? NO_CTL : (p.human ? humanCtl(p.slot) : this.ai(i, dt));
      b.stun -= dt; b.inv -= dt; b.cool -= dt; b.hop -= dt;
      if (k.aP && b.cool <= 0 && b.hop <= 0) { b.hop = 0.62; b.cool = 1.3; Sound.sfx('jump'); }
      const mx = 380 * b.speed;
      b.vx = approach(b.vx, k.x * mx, 1800 * dt);
      b.vy = approach(b.vy, k.y * mx * 0.7, 1800 * dt);
      for (const o of this.objs) if (o.k === 'whirl') {
        const d = dist(o.x, o.y, b.x, b.y);
        if (d < o.r * 1.6 && b.hop <= 0) { b.vx += (o.x - b.x) / d * 900 * dt; b.vy += (o.y - b.y) / d * 900 * dt; }
      }
      b.x = clamp(b.x + b.vx * dt, this.L + 28, this.R - 28);
      b.y = clamp(b.y + b.vy * dt, 300, H - 50);
      for (const o of this.objs) {
        if (o.gone) continue;
        if (o.k === 'fruit' && dist(o.x, o.y, b.x, b.y - (b.hop > 0 ? 40 : 0)) < 46) {
          o.gone = true; const v = o.gold ? 30 : 10; this.scores[i] += v;
          Sound.sfx(o.gold ? 'big' : 'coin'); this.fx.text(o.x, o.y - 30, '+' + v, p.color);
          this.fx.burst(o.x, o.y, 8, ['#ffd23f', '#fff'], 180, { g: 0 });
        } else if (b.hop <= 0 && b.inv <= 0 && this.hits(o, b)) {
          b.stun = 0.7; b.inv = 1.4; this.scores[i] = Math.max(0, this.scores[i] - 15);
          b.vy = 300; b.vx = (b.x - o.x) > 0 ? 300 : -300;
          Sound.sfx('hit'); if (p.human) vibrate(150);
          this.fx.text(b.x, b.y - 50, '-15', '#ff4d6d'); this.fx.burst(b.x, b.y, 14, ['#bfefff', '#fff'], 260, { g: 0 });
        }
      }
    });
    // raft bumping
    for (let i = 0; i < this.boats.length; i++) for (let j = i + 1; j < this.boats.length; j++) {
      const a = this.boats[i], b = this.boats[j];
      if (a.hop > 0 || b.hop > 0) continue;
      const d = dist(a.x, a.y, b.x, b.y);
      if (d < 60 && d > 0) {
        const nx = (b.x - a.x) / d, ny = (b.y - a.y) / d, o = (60 - d) / 2;
        a.x -= nx * o; a.y -= ny * o; b.x += nx * o; b.y += ny * o;
        a.vx -= nx * 120; b.vx += nx * 120;
      }
    }
    this.objs = this.objs.filter((o) => !o.gone && o.y < H + 100);
    this.fx.update(dt);
  }
  draw(c) {
    const t = G.t;
    // banks
    c.fillStyle = '#1f7f4a'; c.fillRect(0, 0, W, H);
    for (let side = 0; side < 2; side++) for (let i = 0; i < 9; i++) {
      const y = ((i * 110 + this.flow * 1) % 990) - 120;
      const x = side ? this.R + 40 + (i % 3) * 60 : this.L - 40 - (i % 3) * 60;
      c.fillStyle = ['#14613a', '#2f9e44', '#0b3d26'][i % 3]; c.beginPath(); c.arc(x, y, 70, 0, 7); c.fill();
    }
    c.fillStyle = '#8a6b3d'; c.fillRect(this.L - 18, 0, 18, H); c.fillRect(this.R, 0, 18, H);
    const g = c.createLinearGradient(this.L, 0, this.R, 0);
    g.addColorStop(0, '#0f7a8a'); g.addColorStop(0.5, '#23b5d3'); g.addColorStop(1, '#0f7a8a');
    c.fillStyle = g; c.fillRect(this.L, 0, this.R - this.L, H);
    c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 3;
    for (let i = 0; i < 26; i++) {
      const x = this.L + 20 + (i * 137) % (this.R - this.L - 40), y = ((i * 89 + this.flow * 1.4) % (H + 80)) - 40;
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 8, y + 18, x, y + 36); c.stroke();
    }
    for (const o of this.objs) {
      if (o.k === 'whirl') {
        for (let r = 0; r < 4; r++) { c.strokeStyle = 'rgba(255,255,255,' + (0.5 - r * 0.1) + ')'; c.lineWidth = 4; c.beginPath(); c.arc(o.x, o.y, o.r * (1 - r * 0.22), t * 4 + r, t * 4 + r + 4.2); c.stroke(); }
      }
    }
    for (const o of this.objs) {
      if (o.k === 'rock') {
        c.fillStyle = 'rgba(255,255,255,0.4)'; ellipse(c, o.x, o.y + 10, o.r + 10, o.r * 0.6 + 6); c.fill();
        c.fillStyle = '#6f6f7f'; ellipse(c, o.x, o.y, o.r, o.r * 0.85); c.fill();
        c.fillStyle = '#9a9aab'; ellipse(c, o.x - o.r * 0.25, o.y - o.r * 0.3, o.r * 0.45, o.r * 0.3); c.fill();
      } else if (o.k === 'log') {
        c.fillStyle = '#6b4226'; rrect(c, o.x - o.w / 2, o.y - o.h / 2, o.w, o.h, 14); c.fill();
        c.fillStyle = '#c99a6b'; ellipse(c, o.x + o.w / 2 - 6, o.y, 8, o.h / 2 - 2); c.fill();
        c.strokeStyle = '#4a2c17'; c.lineWidth = 2; c.beginPath(); c.moveTo(o.x - o.w / 2 + 20, o.y - 4); c.lineTo(o.x + 30, o.y - 4); c.stroke();
      } else if (o.k === 'fruit') {
        c.fillStyle = 'rgba(255,255,255,0.3)'; c.beginPath(); c.arc(o.x, o.y + 6, 24, 0, 7); c.fill();
        drawFruit(c, o.kind, o.x, o.y + Math.sin(t * 4 + o.x) * 3, 1.25);
      }
    }
    const order = this.boats.map((b, i) => i).sort((a, b) => this.boats[a].y - this.boats[b].y);
    for (const i of order) {
      const b = this.boats[i], p = this.players[i];
      const h = b.hop > 0 ? Math.sin((1 - b.hop / 0.62) * Math.PI) * 50 : 0;
      c.fillStyle = 'rgba(0,0,0,0.25)'; ellipse(c, b.x, b.y + 8, 40 - h * 0.2, 16); c.fill();
      if (b.inv > 0 && Math.floor(t * 12) % 2) continue;
      c.save(); c.translate(b.x, b.y - h); c.rotate(Math.sin(t * 3 + i) * 0.08);
      c.fillStyle = '#3ddc84'; c.beginPath(); c.moveTo(0, -40); c.quadraticCurveTo(38, -10, 0, 34); c.quadraticCurveTo(-38, -10, 0, -40); c.fill();
      c.strokeStyle = '#1f8f5a'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -36); c.lineTo(0, 30); c.stroke();
      c.strokeStyle = p.color; c.lineWidth = 4; c.beginPath(); c.moveTo(0, -40); c.quadraticCurveTo(38, -10, 0, 34); c.quadraticCurveTo(-38, -10, 0, -40); c.stroke();
      c.restore();
      drawBird(c, b.x, b.y - 24 - h, 0.8, p.char, { hat: p.hat, legs: false, face: b.vx < -30 ? -1 : 1, flap: b.hop > 0 ? 1 : 0.3, mood: b.stun > 0 ? 'ko' : null });
      drawText(c, playerLabel(p), b.x, b.y - 64 - h, 17, p.color, 'center');
    }
    this.fx.draw(c);
  }
}
