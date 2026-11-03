'use strict';
// BEACH BUMP: shove rivals off a shrinking sandbar. Knockouts score points.

registerGame({
  id: 'bump', name: 'Beach Bump', song: 'beach', touch: 'stickA', fruitRate: 3,
  desc: 'Bump the other birds into the sea! Each knockout scores a point. Falling in costs a point. The sandbar shrinks as time runs out.',
  controls: ['Move: Left Stick / D-Pad', 'Dash Charge: A'],
  controlsTouch: ['Move: drag on the left side', 'Dash Charge: tap A'],
  fmt: (v) => v + ' KO',
  create(players, params) { return new BumpGame(players, params); },
});

class BumpGame {
  constructor(players, params) {
    this.players = players;
    this.duration = params.duration || 60;
    this.timeLeft = this.duration;
    this.scores = players.map(() => 0);
    this.kos = players.map(() => 0);
    this.cx = 640; this.cy = 420; this.R = 300; this.r = 30;
    this.fx = new Particles();
    this.birds = players.map((p, i) => {
      const a = i * Math.PI / 2 + Math.PI / 4;
      return { x: Math.cos(a) * 150, y: Math.sin(a) * 150, vx: 0, vy: 0, face: Math.cos(a) > 0 ? -1 : 1, dashT: 0, cool: 0, knock: 0, fall: 0, inv: 0, lastHit: -1, lastHitT: 0,
        power: CHARS[p.char].power, speed: CHARS[p.char].speed, ai: { t: 0, target: -1, dx: 0, dy: 0 } };
    });
  }
  metric(i) { return this.kos[i]; }
  ai(i, dt) {
    const b = this.birds[i], p = this.players[i], a = b.ai, k = aiCtl();
    a.t -= dt;
    if (a.t <= 0) {
      a.t = lerp(0.6, 0.18, p.skill);
      let best = -1, bd = Infinity;
      this.birds.forEach((o, j) => { if (j === i || o.fall) return; const d = dist(b.x, b.y, o.x, o.y) - Math.hypot(o.x, o.y) * 0.6; if (d < bd) { bd = d; best = j; } });
      a.target = best;
    }
    const R = this.R;
    let tx = 0, ty = 0;
    const o = this.birds[a.target];
    if (o && !o.fall) {
      const om = Math.hypot(o.x, o.y) || 1;
      tx = o.x - (o.x / om) * 70; ty = o.y - (o.y / om) * 70;
      const d = dist(b.x, b.y, o.x, o.y);
      const myM = Math.hypot(b.x, b.y);
      if (d < 170 && b.cool <= 0 && myM < om + 40 && Math.random() < 0.06 + p.skill * 0.14) {
        k.aP = true; a.dx = (o.x - b.x) / d; a.dy = (o.y - b.y) / d;
      }
    }
    const m = Math.hypot(b.x, b.y);
    if (m > R - 55 - p.skill * 25 && !k.aP) { tx = 0; ty = 0; }
    let dx = tx - b.x, dy = ty - b.y; const dl = Math.hypot(dx, dy) || 1;
    k.x = dx / dl; k.y = dy / dl;
    if (k.aP) { k.x = a.dx; k.y = a.dy; }
    return k;
  }
  update(dt) {
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) { this.timeLeft = 0; this.done = true; }
    const shrinkStart = 25;
    this.R = this.timeLeft < shrinkStart ? lerp(195, 300, this.timeLeft / shrinkStart) : 300;
    const r = this.r;
    this.birds.forEach((b, i) => {
      const p = this.players[i];
      b.cool -= dt; b.dashT -= dt; b.inv -= dt; b.lastHitT -= dt; b.knock -= dt;
      if (b.fall) {
        b.fall += dt;
        if (b.fall > 1.4) { // respawn
          const a = rand(0, Math.PI * 2), d = rand(0, this.R * 0.4);
          Object.assign(b, { x: Math.cos(a) * d, y: Math.sin(a) * d, vx: 0, vy: 0, fall: 0, inv: 1.4, lastHit: -1 });
          this.fx.ring(this.cx + b.x, this.cy + b.y * 0.62, '#fff', 30);
        }
        return;
      }
      const k = b.knock > 0 ? NO_CTL : (p.human ? humanCtl(p.slot) : this.ai(i, dt));
      const acc = 1500 * b.speed, max = 280 * b.speed;
      b.vx += k.x * acc * dt; b.vy += k.y * acc * dt;
      if (k.x) b.face = Math.sign(k.x);
      if (k.aP && b.cool <= 0) {
        let dx = k.x, dy = k.y; const m = Math.hypot(dx, dy);
        if (m < 0.2) { dx = b.face; dy = 0; } else { dx /= m; dy /= m; }
        b.vx += dx * 620; b.vy += dy * 620; b.dashT = 0.28; b.cool = 0.9;
        Sound.sfx('dash'); this.fx.burst(this.cx + b.x, this.cy + b.y * 0.62, 8, ['#f7d794', '#fff'], 160, { g: 0 });
      }
      const sp = Math.hypot(b.vx, b.vy);
      const lim = b.knock > 0 ? 1300 : b.dashT > 0 ? 900 : max;
      if (sp > lim) { b.vx *= lim / sp; b.vy *= lim / sp; }
      const fr = Math.pow(b.knock > 0 ? 0.12 : b.dashT > 0 ? 0.3 : 0.02, dt);
      b.vx *= fr; b.vy *= fr;
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (Math.hypot(b.x, b.y) > this.R + 6) {
        b.fall = 0.001; Sound.sfx('splash');
        this.fx.burst(this.cx + b.x, this.cy + b.y * 0.62, 20, ['#bfefff', '#fff', '#4dd0e1'], 280, { g: 600 });
        if (b.lastHit >= 0 && b.lastHitT > 0) {
          this.kos[b.lastHit]++; this.scores[b.lastHit]++;
          this.fx.text(this.cx + b.x, this.cy + b.y * 0.62 - 40, 'KO! +1 ' + playerLabel(this.players[b.lastHit]), this.players[b.lastHit].color);
          if (this.players[b.lastHit].human) vibrate(60);
        }
        this.scores[i] = Math.max(0, this.scores[i] - 1);
        if (p.human) vibrate(200);
      }
    });
    // collisions
    for (let i = 0; i < this.birds.length; i++) for (let j = i + 1; j < this.birds.length; j++) {
      const a = this.birds[i], b = this.birds[j];
      if (a.fall || b.fall) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      if (d >= r * 2 || d === 0) continue;
      const nx = dx / d, ny = dy / d;
      const overlap = r * 2 - d;
      a.x -= nx * overlap / 2; a.y -= ny * overlap / 2; b.x += nx * overlap / 2; b.y += ny * overlap / 2;
      const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
      if (rel <= 0) continue;
      const pa = a.dashT > 0 ? 1.9 * a.power : 1, pb = b.dashT > 0 ? 1.9 * b.power : 1;
      const ia = b.inv > 0 ? 0.2 : 1, ib = a.inv > 0 ? 0.2 : 1;
      const imp = rel * 1.25;
      b.vx += nx * imp * pa * ib; b.vy += ny * imp * pa * ib;
      a.vx -= nx * imp * pb * ia * 0.7; a.vy -= ny * imp * pb * ia * 0.7;
      b.lastHit = i; b.lastHitT = 2.5; a.lastHit = j; a.lastHitT = 2.5;
      if (a.dashT > 0 && b.inv <= 0) b.knock = 0.45;
      if (b.dashT > 0 && a.inv <= 0) a.knock = 0.45;
      if (rel > 200) {
        Sound.sfx('bump');
        this.fx.burst(this.cx + (a.x + b.x) / 2, this.cy + (a.y + b.y) / 2 * 0.62 - 20, 8, ['#fff', '#ffd23f'], 200, { g: 0 });
        if (this.players[i].human || this.players[j].human) vibrate(40);
      }
    }
    this.fx.update(dt);
  }
  draw(c) {
    const t = G.t;
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0d6fb8'); g.addColorStop(1, '#23b5d3');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(255,255,255,0.25)'; c.lineWidth = 3;
    for (let i = 0; i < 30; i++) { const x = (i * 211 + t * 20) % (W + 100) - 50, y = (i * 97) % H; c.beginPath(); c.arc(x, y, 16, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
    const R = this.R, ry = 0.62;
    c.fillStyle = 'rgba(255,255,255,0.35)'; ellipse(c, this.cx, this.cy, R + 26 + Math.sin(t * 2) * 5, (R + 26) * ry); c.fill();
    c.fillStyle = '#d9b46a'; ellipse(c, this.cx, this.cy + 16, R + 4, (R + 4) * ry); c.fill();
    const sg = c.createRadialGradient(this.cx - R * 0.3, this.cy - R * 0.3, R * 0.1, this.cx, this.cy, R * 1.05);
    sg.addColorStop(0, '#fff1c4'); sg.addColorStop(0.6, '#f7d794'); sg.addColorStop(1, '#e5b866');
    c.fillStyle = sg; ellipse(c, this.cx, this.cy, R, R * ry); c.fill();
    drawBeachBall(c, this.cx + R * 0.75, this.cy - R * ry * 0.75, 20, G.t);
    c.fillStyle = '#efc777';
    for (let i = 0; i < 18; i++) { const a = i * 2.4, d = (i * 37) % (R * 0.85); c.fillRect(this.cx + Math.cos(a) * d, this.cy + Math.sin(a) * d * ry, 14, 4); }
    if (this.timeLeft < 25) drawText(c, 'The sandbar is shrinking!', W / 2, H - 24, 26, '#fff6b0', 'center');
    const order = this.birds.map((b, i) => i).sort((a, b) => this.birds[a].y - this.birds[b].y);
    for (const i of order) {
      const b = this.birds[i], p = this.players[i];
      const sx = this.cx + b.x, sy = this.cy + b.y * ry;
      if (b.fall) {
        const k = clamp(b.fall / 0.6, 0, 1);
        if (k < 1) drawBird(c, sx, sy + k * 40, 1.1 * (1 - k * 0.6), p.char, { face: b.face, hat: p.hat, alpha: 1 - k, mood: 'ko' });
        continue;
      }
      c.fillStyle = 'rgba(0,0,0,0.25)'; ellipse(c, sx, sy + 4, 32, 11); c.fill();
      c.strokeStyle = p.color; c.lineWidth = 4; ellipse(c, sx, sy + 4, 36, 13); c.stroke();
      const blink = b.inv > 0 && Math.floor(t * 12) % 2;
      if (!blink) drawBird(c, sx, sy - 34, 1.1, p.char, { face: b.face, hat: p.hat, walk: Math.hypot(b.vx, b.vy) > 40, flap: b.dashT > 0 ? 1 : 0.3, rot: b.dashT > 0 ? 0.25 * b.face : 0 });
      drawText(c, playerLabel(p), sx, sy - 82, 18, p.color, 'center');
    }
    this.fx.draw(c);
  }
}
