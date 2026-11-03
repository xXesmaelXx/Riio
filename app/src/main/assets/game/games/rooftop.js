'use strict';
// ROOFTOP HOP: auto-running race over the rooftops. Jump the gaps and chimneys.

registerGame({
  id: 'rooftop', name: 'Rooftop Hop', song: 'market', touch: 'tapA', fruitRate: 0.1,
  desc: 'Race across the city rooftops! You run automatically. Jump over gaps and chimneys. Falling costs you precious time.',
  controls: ['Jump: A  (press again in the air to double jump)'],
  controlsTouch: ['Jump: tap anywhere  (tap again in the air to double jump)'],
  fmt: (v) => v + 'm',
  create(players, params) { return new RooftopGame(players, params); },
});

class RooftopGame {
  constructor(players, params) {
    this.players = players;
    this.duration = params.duration || 45;
    this.timeLeft = this.duration;
    this.scores = players.map(() => 0);
    this.noHud = true;
    this.rng = seeded(Math.floor(Math.random() * 1e9));
    this.roofs = [{ x0: -400, x1: 900, y: 250, chim: [] }];
    this.extend(5000);
    this.fx = new Particles();
    this.runners = players.map((p) => ({ x: 120, y: 210, vy: 0, onGround: true, jumps: 0, fall: 0, stall: 0, stumble: 0, speedMul: 1 + (CHARS[p.char].speed - 1) * 0.4, ai: { delay: 0 } }));
    this.t = 0;
  }
  extend(toX) {
    while (this.roofs[this.roofs.length - 1].x1 < toX) {
      const last = this.roofs[this.roofs.length - 1], r = this.rng;
      const prog = clamp(last.x1 / 20000, 0, 1);
      const gap = lerp(110, 200, prog) + r() * lerp(110, 170, prog);
      const w = 320 + r() * 520;
      const y = clamp(last.y + (r() - 0.5) * 140, 180, 290);
      const roof = { x0: last.x1 + gap, x1: last.x1 + gap + w, y, chim: [] };
      if (w > 450 && r() < 0.6) roof.chim.push(roof.x0 + 160 + r() * (w - 320));
      this.roofs.push(roof);
    }
  }
  roofAt(x) { for (const r of this.roofs) if (x >= r.x0 && x <= r.x1) return r; return null; }
  nextRoof(x) { for (const r of this.roofs) if (r.x0 > x) return r; return null; }
  speed() { return lerp(380, 600, clamp(this.t / 50, 0, 1)); }
  ai(i, dt) {
    const b = this.runners[i], p = this.players[i], k = aiCtl();
    const sp = this.speed() * b.speedMul;
    const cur = this.roofAt(b.x + 20);
    b.ai.delay -= dt;
    if (b.onGround && cur) {
      const toEdge = cur.x1 - b.x;
      const ideal = sp * lerp(0.05, 0.13, p.skill) + 25;
      const err = (1 - p.skill) * 70;
      if (toEdge < ideal + rand(-err, err * 0.5) && b.ai.delay <= 0) { k.aP = true; b.ai.delay = 0.3; }
      for (const cx of cur.chim) if (cx - b.x > 30 && cx - b.x < sp * 0.18 + 20 && b.ai.delay <= 0) { k.aP = true; b.ai.delay = 0.3; }
    } else if (!b.onGround && b.jumps > 0 && b.vy > 0) {
      const nr = this.roofAt(b.x) || this.nextRoof(b.x);
      if (nr && (b.y > nr.y - 60 || nr.x0 - b.x > sp * 0.25) && !this.roofAt(b.x) && Math.random() < 0.25 + p.skill * 0.6) k.aP = true;
    }
    return k;
  }
  update(dt) {
    this.t += dt;
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) { this.timeLeft = 0; this.done = true; }
    const maxX = Math.max(...this.runners.map((b) => b.x));
    this.extend(maxX + 3000);
    this.runners.forEach((b, i) => {
      const p = this.players[i];
      const k = p.human ? humanCtl(p.slot) : this.ai(i, dt);
      if (b.fall) {
        b.fall += dt;
        b.vy += 2200 * dt; b.y += b.vy * dt;
        if (b.fall > 0.9) {
          const nr = this.nextRoof(b.x - 30) || this.roofs[this.roofs.length - 1];
          Object.assign(b, { x: nr.x0 + 30, y: nr.y - 40, vy: 0, fall: 0, stall: 0.7, onGround: true, jumps: 1 });
        }
        return;
      }
      b.stall -= dt; b.stumble -= dt;
      let sp = this.speed() * b.speedMul;
      if (b.stall > 0) sp = 0; else if (b.stumble > 0) sp *= 0.35;
      if (k.aP && b.stall <= 0) {
        if (b.onGround) { b.vy = -770; b.onGround = false; b.jumps = 1; Sound.sfx('jump'); }
        else if (b.jumps > 0) { b.vy = -660; b.jumps--; Sound.sfx('flap'); }
      }
      const oldX = b.x;
      b.x += sp * dt;
      b.vy += 2200 * dt;
      b.y += b.vy * dt;
      const roof = this.roofAt(b.x);
      if (roof && b.vy >= 0 && b.y + 40 >= roof.y && b.y + 40 - b.vy * dt <= roof.y + 12) {
        b.y = roof.y - 40; b.vy = 0;
        if (!b.onGround) { b.onGround = true; b.jumps = 1; }
      } else if (roof && b.y + 40 > roof.y + 12 && oldX < roof.x0) {
        // hit the wall of a higher roof
        b.x = roof.x0 - 1;
      } else if (!roof || b.y + 40 < roof.y - 1) b.onGround = false;
      if (roof) for (const cx of roof.chim) {
        if (b.stumble <= 0 && Math.abs(b.x - cx) < 26 && b.y + 40 > roof.y - 55) {
          b.stumble = 0.6; Sound.sfx('bump'); if (p.human) vibrate(60);
          this.fx.burst(cx, roof.y - 50, 10, ['#b5543a', '#7a3b2a'], 200);
        }
      }
      if (b.y > 420) { b.fall = 0.001; Sound.sfx('lose'); if (p.human) vibrate(200); }
      this.scores[i] = Math.max(0, Math.floor((b.x - 120) / 40));
    });
    this.fx.update(dt);
  }
  draw(c) {
    const n = this.players.length;
    const top = 0, laneH = H / n;
    const sc = Math.min(1.25, laneH / 300);
    this.players.forEach((p, i) => {
      const b = this.runners[i];
      const ly = top + i * laneH;
      c.save();
      c.beginPath(); c.rect(0, ly, W, laneH); c.clip();
      const g = c.createLinearGradient(0, ly, 0, ly + laneH); g.addColorStop(0, '#ff7e5f'); g.addColorStop(1, '#feb47b');
      c.fillStyle = g; c.fillRect(0, ly, W, laneH);
      c.fillStyle = 'rgba(255,241,176,0.9)'; c.beginPath(); c.arc(W * 0.78, ly + laneH * 0.45, laneH * 0.22, 0, 7); c.fill();
      c.globalAlpha = 0.3;
      drawHouses(c, ly + laneH, b.x * 0.15 * sc, sc * 0.5, 13 + i, true);
      c.globalAlpha = 1;
      const camX = b.x - 260 / sc;
      const camY = ly + laneH - 300 * sc;
      c.translate(0, camY); c.scale(sc, sc); c.translate(-camX, 0);
      const viewW = W / sc;
      for (const r of this.roofs) {
        if (r.x1 < camX - 50 || r.x0 > camX + viewW + 50) continue;
        c.fillStyle = '#4e342e'; c.fillRect(r.x0, r.y, r.x1 - r.x0, 400);
        c.fillStyle = '#ffe08a';
        for (let wx = r.x0 + 30; wx < r.x1 - 40; wx += 70) for (let wy = r.y + 40; wy < r.y + 340; wy += 70) c.fillRect(wx, wy, 30, 36);
        c.fillStyle = '#e8613c'; c.fillRect(r.x0 - 8, r.y - 14, r.x1 - r.x0 + 16, 18);
        c.fillStyle = '#a3452c'; for (let tx = r.x0 - 8; tx < r.x1; tx += 22) c.fillRect(tx, r.y - 14, 3, 18);
        for (const cx of r.chim) {
          c.fillStyle = '#b5543a'; c.fillRect(cx - 18, r.y - 62, 36, 50);
          c.fillStyle = '#7a3b2a'; c.fillRect(cx - 22, r.y - 66, 44, 10);
        }
      }
      // ghost markers for rivals
      this.runners.forEach((o, j) => {
        if (j === i) return;
        c.globalAlpha = 0.35;
        drawBird(c, o.x, o.y, 1, this.players[j].char, { hat: this.players[j].hat, walk: o.onGround, flap: o.onGround ? 0.3 : 0.9 });
        c.globalAlpha = 1;
      });
      const fl = b.stall > 0 && Math.floor(G.t * 12) % 2;
      if (!fl) drawBird(c, b.x, b.y, 1.15, p.char, { hat: p.hat, walk: b.onGround && b.stall <= 0, flap: b.onGround ? 0.3 : 0.5 + Math.sin(G.t * 22) * 0.5, mood: b.fall || b.stumble > 0 ? 'ko' : null, rot: b.stumble > 0 ? -0.3 : 0 });
      this.fx.draw(c);
      c.restore();
      // lane hud
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(0, ly + laneH - 2, W, 4);
      panel(c, 12, ly + 8, 250, 48, 'rgba(25,10,55,0.8)', p.color, 14);
      drawText(c, playerLabel(p) + ' ' + CHARS[p.char].name, 26, ly + 41, 22, p.color);
      drawText(c, this.scores[i] + 'm', 250, ly + 41, 24, '#fff', 'right');
      const place = this.scores.filter((s) => s > this.scores[i]).length + 1;
      drawText(c, ['1st', '2nd', '3rd', '4th'][place - 1], W - 30, ly + 46, 30, place === 1 ? '#ffd23f' : '#fff', 'right');
    });
    panel(c, 570, 6, 140, 60, 'rgba(25,10,55,0.85)', this.timeLeft < 10 ? '#ff4d6d' : '#ffd23f', 18);
    drawText(c, String(Math.ceil(this.timeLeft)), 640, 50, 38, '#fff', 'center');
  }
}
