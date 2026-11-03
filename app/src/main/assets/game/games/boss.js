'use strict';
// CROW CLASH: co-op boss battle against Don Corvo at the Grand Parade.

registerGame({
  id: 'boss', name: 'Crow Clash', song: 'boss', touch: 'stickA', fruitRate: 0.5,
  desc: 'Team up against Don Corvo! Walk over fruit to pick it up (hold up to 3), then throw it at him. Dodge his swoops and feather bombs!',
  controls: ['Move: Left Stick / D-Pad', 'Throw fruit at Don Corvo: A'],
  controlsTouch: ['Move: drag on the left side', 'Throw fruit: tap A'],
  create(players, params) { return new BossGame(players, params); },
});

class BossGame {
  constructor(players, params) {
    this.players = players;
    this.coop = true;
    this.duration = params.duration || 120;
    this.timeLeft = this.duration;
    this.scores = players.map(() => 0);
    this.fx = new Particles();
    this.ax0 = 80; this.ax1 = W - 80; this.ay0 = 240; this.ay1 = H - 40;
    this.maxHp = 110 + players.filter((p) => p.human).length * 10;
    this.boss = { x: W / 2, y: 170, hp: this.maxHp, state: 'hover', t: 2, vx: 0, vy: 0, tx: W / 2, ty: 170, flash: 0, phase: 1, target: 0 };
    this.heroes = players.map((p, i) => ({ x: 300 + i * 230, y: 560, vx: 0, vy: 0, face: 1, ammo: 0, stun: 0, inv: 0, hearts: 3, down: 0, cool: 0, speed: CHARS[p.char].speed, ai: { t: 0, tx: 300, ty: 500 } }));
    this.fruit = []; this.shots = []; this.bombs = []; this.feathers = [];
    this.fruitT = 0;
    for (let i = 0; i < 6; i++) this.spawnFruit();
  }
  metric() { return this.won ? Math.max(1, Math.round(this.timeLeft)) : 0; }
  spawnFruit() { this.fruit.push({ x: rand(this.ax0 + 30, this.ax1 - 30), y: rand(this.ay0 + 30, this.ay1 - 20), kind: pick(['mango', 'banana', 'pineapple', 'grape']), t: 0 }); }
  ai(i, dt) {
    const h = this.heroes[i], p = this.players[i], a = h.ai, k = aiCtl();
    a.t -= dt;
    if (a.t <= 0) {
      a.t = lerp(0.6, 0.2, p.skill);
      if (h.ammo < 3) {
        let best = null, bd = Infinity;
        for (const f of this.fruit) { const d = dist(h.x, h.y, f.x, f.y); if (d < bd) { bd = d; best = f; } }
        if (best) { a.tx = best.x; a.ty = best.y; }
      } else { a.tx = this.boss.x + rand(-150, 150); a.ty = clamp(this.boss.y + 250, this.ay0, this.ay1); }
    }
    let tx = a.tx, ty = a.ty;
    for (const b of this.bombs) if (dist(b.x, b.y, h.x, h.y) < b.r + 60 && Math.random() < 0.4 + p.skill * 0.6) { tx = h.x + (h.x - b.x) * 3; ty = h.y + (h.y - b.y) * 3; }
    if (this.boss.state === 'swoopWarn' || this.boss.state === 'swoop') {
      const bs = this.boss;
      if (Math.abs(h.x - bs.tx) < 120 && Math.random() < 0.5 + p.skill * 0.5) tx = h.x + (h.x < bs.tx ? -260 : 260);
    }
    const dx = tx - h.x, dy = ty - h.y, d = Math.hypot(dx, dy);
    if (d > 10) { k.x = dx / d; k.y = dy / d; }
    if (h.ammo > 0 && h.cool <= 0 && Math.random() < 0.03 + p.skill * 0.07 && this.boss.state !== 'swoop') k.aP = true;
    return k;
  }
  hurt(i) {
    const h = this.heroes[i];
    if (h.inv > 0 || h.down > 0) return;
    h.hearts--; h.inv = 1.5; h.stun = 0.6;
    if (h.ammo > 0) { for (let n = 0; n < h.ammo; n++) this.fruit.push({ x: clamp(h.x + rand(-60, 60), this.ax0, this.ax1), y: clamp(h.y + rand(-60, 60), this.ay0, this.ay1), kind: 'mango', t: 0 }); h.ammo = 0; }
    Sound.sfx('hit'); if (this.players[i].human) vibrate(180);
    this.fx.burst(h.x, h.y - 30, 14, ['#fff', '#ff4d6d'], 260, { g: 0 });
    if (h.hearts <= 0) { h.down = 5; this.fx.text(h.x, h.y - 70, 'DOWN!', '#ff4d6d'); }
  }
  update(dt) {
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) { this.timeLeft = 0; this.done = true; this.won = false; this.finishText = "TIME'S UP!"; return; }
    const bs = this.boss;
    bs.phase = bs.hp < this.maxHp * 0.35 ? 3 : bs.hp < this.maxHp * 0.7 ? 2 : 1;
    bs.t -= dt; bs.flash -= dt;
    const fast = 1 + (bs.phase - 1) * 0.25;
    switch (bs.state) {
      case 'hover':
        bs.x = lerp(bs.x, bs.tx, dt * 2); bs.y = lerp(bs.y, bs.ty + Math.sin(G.t * 3) * 20, dt * 2);
        if (bs.t <= 0) {
          const r = Math.random();
          if (r < 0.4) { // swoop at a hero
            const alive = this.heroes.map((h, i) => i).filter((i) => this.heroes[i].down <= 0);
            const ti = alive.length ? pick(alive) : 0;
            bs.target = ti; bs.tx = this.heroes[ti].x; bs.ty = this.heroes[ti].y; bs.state = 'swoopWarn'; bs.t = 1.0 / fast;
            Sound.sfx('squawk');
          } else if (r < 0.8) { // bombs
            bs.state = 'bomb'; bs.t = 0.4; bs.n = 2 + bs.phase * 2;
          } else { // feather fan
            bs.state = 'feathers'; bs.t = 0.5;
            for (let k = 0; k < 6 + bs.phase * 3; k++) {
              const ang = Math.PI * (0.15 + 0.7 * k / (5 + bs.phase * 3));
              this.feathers.push({ x: bs.x, y: bs.y + 30, vx: Math.cos(ang) * 330 * fast, vy: Math.sin(ang) * 330 * fast, a: ang });
            }
            Sound.sfx('throw');
          }
        }
        break;
      case 'swoopWarn':
        bs.x = lerp(bs.x, bs.tx, dt * 1.2);
        if (bs.t <= 0) { bs.state = 'swoop'; bs.sx = bs.x; bs.sy = bs.y; bs.t = 0.55; Sound.sfx('dash'); }
        break;
      case 'swoop': {
        const k = 1 - bs.t / 0.55;
        bs.x = lerp(bs.sx, bs.tx, k); bs.y = lerp(bs.sy, bs.ty, Math.sin(k * Math.PI));
        if (k > 0.35 && k < 0.65) this.heroes.forEach((h, i) => { if (dist(h.x, h.y - 30, bs.x, bs.y) < 80) this.hurt(i); });
        if (bs.t <= 0) { bs.state = 'hover'; bs.t = rand(1.2, 2.2) / fast; bs.tx = rand(250, W - 250); bs.ty = 170; }
        break;
      }
      case 'bomb':
        bs.x = lerp(bs.x, bs.tx, dt * 2);
        if (bs.t <= 0 && bs.n > 0) {
          bs.n--; bs.t = 0.35 / fast;
          const h = pick(this.heroes);
          this.bombs.push({ x: clamp(h.x + rand(-90, 90), this.ax0, this.ax1), y: clamp(h.y + rand(-60, 60), this.ay0, this.ay1), t: 1.3, r: 70 });
        } else if (bs.n <= 0 && bs.t <= 0) { bs.state = 'hover'; bs.t = rand(1.2, 2.0) / fast; bs.tx = rand(250, W - 250); }
        break;
      case 'feathers':
        if (bs.t <= 0) { bs.state = 'hover'; bs.t = rand(1.0, 1.8) / fast; bs.tx = rand(250, W - 250); }
        break;
      case 'stunned':
        bs.y = lerp(bs.y, 260, dt * 3);
        if (bs.t <= 0) { bs.state = 'hover'; bs.t = 1; bs.ty = 170; }
        break;
    }
    // heroes
    this.heroes.forEach((h, i) => {
      const p = this.players[i];
      h.inv -= dt; h.stun -= dt; h.cool -= dt;
      if (h.down > 0) { h.down -= dt; if (h.down <= 0) { h.hearts = 3; h.inv = 2; this.fx.ring(h.x, h.y - 30, '#3ddc84', 40); } return; }
      const k = h.stun > 0 ? NO_CTL : (p.human ? humanCtl(p.slot) : this.ai(i, dt));
      const mx = 340 * h.speed;
      h.vx = approach(h.vx, k.x * mx, 2600 * dt); h.vy = approach(h.vy, k.y * mx, 2600 * dt);
      if (k.x) h.face = Math.sign(k.x);
      h.x = clamp(h.x + h.vx * dt, this.ax0, this.ax1); h.y = clamp(h.y + h.vy * dt, this.ay0, this.ay1);
      for (const f of this.fruit) if (!f.gone && h.ammo < 3 && dist(f.x, f.y, h.x, h.y) < 44) { f.gone = true; h.ammo++; Sound.sfx('coin'); }
      if (k.aP && h.ammo > 0 && h.cool <= 0) {
        h.ammo--; h.cool = 0.25;
        this.shots.push({ x: h.x, y: h.y - 40, i, kind: 'mango', life: 1.5 });
        Sound.sfx('throw');
      }
    });
    this.fruit = this.fruit.filter((f) => !f.gone);
    this.fruitT -= dt;
    if (this.fruitT <= 0 && this.fruit.length < 8) { this.spawnFruit(); this.fruitT = 0.8; }
    // shots home in on the boss
    for (const s of this.shots) {
      const dx = bs.x - s.x, dy = bs.y - s.y, d = Math.hypot(dx, dy) || 1;
      s.x += dx / d * 900 * dt; s.y += dy / d * 900 * dt; s.life -= dt;
      if (d < 60 && !s.done) {
        s.done = true;
        if (bs.state === 'swoop' && Math.random() < 0.5) { this.fx.text(bs.x, bs.y - 60, 'DODGED', '#bbb'); continue; }
        const dmg = bs.state === 'stunned' ? 2 : 1;
        bs.hp -= dmg; bs.flash = 0.15; this.scores[s.i] += dmg;
        Sound.sfx('pop'); this.fx.burst(bs.x, bs.y, 10, ['#ffb030', '#fff', '#2a2340'], 260, { g: 300 });
        this.fx.text(bs.x + rand(-40, 40), bs.y - 70, '-' + dmg, this.players[s.i].color);
        if (bs.hp > 0 && Math.floor(bs.hp / 25) < Math.floor((bs.hp + dmg) / 25) && bs.state !== 'stunned') { bs.state = 'stunned'; bs.t = 2.5; Sound.sfx('squawk'); }
        if (bs.hp <= 0) { this.done = true; this.won = true; this.finishText = 'VICTORY!'; Sound.sfx('boom'); this.fx.confetti(bs.x, bs.y, 80); }
      }
    }
    this.shots = this.shots.filter((s) => !s.done && s.life > 0);
    for (const b of this.bombs) {
      b.t -= dt;
      if (b.t <= 0 && !b.exploded) {
        b.exploded = true; Sound.sfx('boom');
        this.fx.burst(b.x, b.y, 22, ['#2a2340', '#ff8c42', '#ffd23f'], 360, { g: 0 });
        this.heroes.forEach((h, i) => { if (dist(h.x, h.y, b.x, b.y) < b.r) this.hurt(i); });
      }
    }
    this.bombs = this.bombs.filter((b) => b.t > -0.2);
    for (const f of this.feathers) {
      f.x += f.vx * dt; f.y += f.vy * dt;
      this.heroes.forEach((h, i) => { if (!f.gone && dist(h.x, h.y - 30, f.x, f.y) < 34) { f.gone = true; this.hurt(i); } });
    }
    this.feathers = this.feathers.filter((f) => !f.gone && f.y < H + 40 && f.x > -40 && f.x < W + 40);
    this.fx.update(dt);
  }
  postUpdate(dt) { this.fx.update(dt); }
  draw(c) {
    drawBackground(c, 'carnival');
    c.fillStyle = 'rgba(80,40,120,0.6)'; rrect(c, this.ax0 - 40, this.ay0 - 50, this.ax1 - this.ax0 + 80, this.ay1 - this.ay0 + 90, 30); c.fill();
    c.strokeStyle = '#ffd23f'; c.lineWidth = 4; c.setLineDash([16, 12]); rrect(c, this.ax0 - 40, this.ay0 - 50, this.ax1 - this.ax0 + 80, this.ay1 - this.ay0 + 90, 30); c.stroke(); c.setLineDash([]);
    for (const f of this.fruit) drawFruit(c, f.kind, f.x, f.y + Math.sin(G.t * 4 + f.x) * 3, 1.3);
    for (const b of this.bombs) {
      if (b.exploded) continue;
      const k = 1 - b.t / 1.3;
      c.fillStyle = 'rgba(255,60,60,' + (0.15 + k * 0.3) + ')'; ellipse(c, b.x, b.y, b.r, b.r * 0.55); c.fill();
      c.strokeStyle = '#ff4d6d'; c.lineWidth = 3; ellipse(c, b.x, b.y, b.r * k, b.r * 0.55 * k); c.stroke();
      const by = b.y - (1 - k) * 500;
      c.fillStyle = '#2a2340'; c.beginPath(); c.arc(b.x, by, 16, 0, 7); c.fill();
      c.fillStyle = '#ff8c42'; c.beginPath(); c.arc(b.x + 8, by - 14, 5, 0, 7); c.fill();
    }
    const bs = this.boss;
    if (bs.state === 'swoopWarn') {
      c.strokeStyle = 'rgba(255,77,109,' + (0.5 + Math.sin(G.t * 20) * 0.3) + ')'; c.lineWidth = 8; c.setLineDash([20, 14]);
      c.beginPath(); c.moveTo(bs.x, bs.y); c.lineTo(bs.tx, bs.ty); c.stroke(); c.setLineDash([]);
      c.fillStyle = 'rgba(255,77,109,0.25)'; ellipse(c, bs.tx, bs.ty, 80, 40); c.fill();
    }
    const order = this.heroes.map((h, i) => i).sort((a, b) => this.heroes[a].y - this.heroes[b].y);
    for (const i of order) {
      const h = this.heroes[i], p = this.players[i];
      c.fillStyle = 'rgba(0,0,0,0.3)'; ellipse(c, h.x, h.y + 4, 30, 10); c.fill();
      if (h.inv > 0 && h.down <= 0 && Math.floor(G.t * 12) % 2) continue;
      drawBird(c, h.x, h.y - 34, 1.0, p.char, { hat: p.hat, face: h.face, walk: Math.hypot(h.vx, h.vy) > 40, mood: h.down > 0 || h.stun > 0 ? 'ko' : null, rot: h.down > 0 ? 1.4 : 0, alpha: h.down > 0 ? 0.6 : 1 });
      for (let n = 0; n < h.ammo; n++) drawFruit(c, 'mango', h.x - 18 + n * 18, h.y - 88, 0.7);
      for (let n = 0; n < 3; n++) { c.fillStyle = n < h.hearts ? '#ff4d6d' : 'rgba(0,0,0,0.4)'; c.beginPath(); c.arc(h.x - 16 + n * 16, h.y + 20, 6, 0, 7); c.fill(); }
      drawText(c, h.down > 0 ? Math.ceil(h.down) + '' : playerLabel(p), h.x, h.y - 104, 17, p.color, 'center');
    }
    for (const f of this.feathers) { c.save(); c.translate(f.x, f.y); c.rotate(f.a); c.fillStyle = '#1a1530'; ellipse(c, 0, 0, 18, 5); c.fill(); c.fillStyle = '#5a4a7a'; c.fillRect(-16, -1, 32, 2); c.restore(); }
    for (const s of this.shots) drawFruit(c, s.kind, s.x, s.y, 1.1, G.t * 10);
    // boss
    const flap = bs.state === 'stunned' ? 0.2 : 0.5 + Math.sin(G.t * 14) * 0.5;
    c.save();
    if (bs.flash > 0) c.globalAlpha = 0.6;
    drawBird(c, bs.x, bs.y, 2.1, 'corvo', { hat: 'captain', legs: false, face: bs.tx < bs.x ? -1 : 1, flap, mood: bs.state === 'stunned' ? 'ko' : 'angry', rot: bs.state === 'swoop' ? 0.4 : 0 });
    c.restore();
    if (bs.state === 'stunned') for (let s = 0; s < 4; s++) starShape(c, bs.x + Math.cos(G.t * 6 + s * 1.6) * 60, bs.y - 80 + Math.sin(G.t * 6 + s * 1.6) * 12, 10, true);
    this.fx.draw(c);
  }
  drawOverlay(c) {
    const bs = this.boss;
    panel(c, 340, 80, 600, 44, 'rgba(25,10,55,0.85)', '#ff4d6d', 16);
    c.fillStyle = '#3a1020'; rrect(c, 352, 92, 576, 20, 10); c.fill();
    c.fillStyle = '#ff4d6d'; rrect(c, 352, 92, 576 * clamp(bs.hp / this.maxHp, 0, 1), 20, 10); c.fill();
    drawText(c, 'DON CORVO', 640, 108, 18, '#fff', 'center');
  }
}
