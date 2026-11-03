'use strict';
// SAMBA BEAT: rhythm game. Hit the notes in time with the music.

registerGame({
  id: 'samba', name: 'Samba Beat', song: 'samba', touch: 'arrows', fruitRate: 0.01,
  desc: 'Feel the rhythm! Hit each note as it reaches the line. Chain hits for a combo bonus. Perfect timing scores the most.',
  controls: ['Notes: D-Pad / Stick  ◀ ▼ ▲ ▶', 'or face buttons  X  A  Y  B'],
  controlsTouch: ['Tap the four arrow buttons in time with the notes'],
  create(players, params) { return new SambaGame(players, params); },
});

const LANE_COLS = ['#ff4d6d', '#4d9bff', '#3ddc84', '#ffc93c'];
const LANE_KEYS = ['left', 'down', 'up', 'right'];
const LANE_ARROWS = ['◀', '▼', '▲', '▶'];

class SambaGame {
  constructor(players, params) {
    this.players = players;
    this.noHud = true;
    this.fx = new Particles();
    const song = Music.get('samba');
    this.barDur = song.stepDur * 16;
    const bars = Math.floor((params.duration || 48) / this.barDur);
    this.chart = Music.chart('samba', bars, params.hard ? 0.95 : 0.7);
    this.endTime = bars * this.barDur + 1;
    this.scores = players.map(() => 0);
    this.hitsN = players.map(() => 0);
    this.perfect = players.map(() => 0);
    this.combo = players.map(() => 0);
    this.best = players.map(() => 0);
    this.state = players.map(() => this.chart.map(() => 0)); // 0 pending, 1 hit, 2 missed
    this.flash = players.map(() => [0, 0, 0, 0]);
    this.judge = players.map(() => ({ text: '', t: 0, col: '#fff' }));
    this.dance = players.map(() => 0);
    this.fallback = 0;
    this.speed = 420; // px per second
    this.started = false;
  }
  now() {
    const t = Music.time();
    return t >= 0 && Sound.ctx && Sound.ctx.state === 'running' ? t : this.fallback;
  }
  metric(i) { return Math.round((this.hitsN[i] / Math.max(1, this.chart.length)) * 100); }
  preUpdate(dt) { this.fallback += dt; }
  update(dt) {
    if (!this.started) { this.started = true; Music.play('samba', true); this.fallback = 0; }
    this.fallback += dt;
    const t = this.now();
    this.timeLeft = Math.max(0, this.endTime - t);
    if (t > this.endTime) this.done = true;
    this.players.forEach((p, i) => {
      const st = this.state[i];
      // misses
      this.chart.forEach((n, j) => {
        if (st[j] === 0 && t - n.time > 0.16) { st[j] = 2; this.combo[i] = 0; this.setJudge(i, 'MISS', '#ff4d6d'); }
      });
      let lanes = [false, false, false, false];
      if (p.human) {
        const k = humanCtl(p.slot);
        lanes = [k.left, k.down, k.up, k.right];
      } else {
        // CPU: hit each note with a random timing error depending on skill
        this.chart.forEach((n, j) => {
          if (st[j] !== 0) return;
          if (n.cpu == null) n.cpu = {};
          if (n.cpu[i] == null) n.cpu[i] = Math.random() < lerp(0.55, 0.97, p.skill) ? rand(-1, 1) * lerp(0.13, 0.03, p.skill) : 99;
          if (t >= n.time + n.cpu[i]) lanes[n.lane] = true;
        });
      }
      lanes.forEach((pr, lane) => {
        if (!pr) return;
        this.flash[i][lane] = 0.15;
        // nearest pending note in lane
        let bj = -1, bd = Infinity;
        this.chart.forEach((n, j) => { if (st[j] === 0 && n.lane === lane) { const d = Math.abs(n.time - t); if (d < bd) { bd = d; bj = j; } } });
        if (bj < 0 || bd > 0.16) { if (p.human) { this.combo[i] = 0; } return; }
        st[bj] = 1;
        this.hitsN[i]++;
        this.combo[i]++;
        this.best[i] = Math.max(this.best[i], this.combo[i]);
        const mult = 1 + Math.min(3, Math.floor(this.combo[i] / 10));
        let pts, txt, col;
        if (bd < 0.05) { pts = 100; txt = 'PERFECT'; col = '#ffd23f'; this.perfect[i]++; }
        else if (bd < 0.1) { pts = 60; txt = 'GOOD'; col = '#3ddc84'; }
        else { pts = 25; txt = 'OK'; col = '#9be7ff'; }
        this.scores[i] += pts * mult;
        this.setJudge(i, txt, col);
        this.dance[i] = 0.25;
        if (p.human) Sound.sfx(bd < 0.05 ? 'perfect' : 'good');
        const col0 = this.colX(i);
        this.fx.burst(col0.x + col0.lw * (lane + 0.5), this.hitY(), 6, [LANE_COLS[lane], '#fff'], 200, { g: 0 });
      });
      this.flash[i] = this.flash[i].map((f) => Math.max(0, f - dt));
      this.judge[i].t -= dt;
      this.dance[i] -= dt;
    });
    this.fx.update(dt);
  }
  setJudge(i, text, col) { this.judge[i] = { text, col, t: 0.5 }; }
  hitY() { return 560; }
  colX(i) {
    const n = this.players.length;
    const w = Math.min(300, (W - 40) / n - 16);
    const total = n * w + (n - 1) * 16;
    const x = (W - total) / 2 + i * (w + 16);
    return { x, w, lw: w / 4 };
  }
  draw(c) {
    drawBackground(c, 'carnival');
    const t = this.now();
    const hy = this.hitY();
    this.players.forEach((p, i) => {
      const { x, w, lw } = this.colX(i);
      c.fillStyle = 'rgba(15,5,35,0.72)'; rrect(c, x, 84, w, 600, 18); c.fill();
      c.strokeStyle = p.color; c.lineWidth = 3; rrect(c, x, 84, w, 600, 18); c.stroke();
      for (let l = 0; l < 4; l++) {
        const lx = x + l * lw + lw / 2;
        c.fillStyle = 'rgba(255,255,255,' + (0.05 + this.flash[i][l] * 2) + ')'; c.fillRect(x + l * lw + 2, 90, lw - 4, 588);
        c.strokeStyle = LANE_COLS[l]; c.lineWidth = 4; c.beginPath(); c.arc(lx, hy, lw * 0.36, 0, 7); c.stroke();
        drawText(c, LANE_ARROWS[l], lx, hy + 9, 24, 'rgba(255,255,255,0.6)', 'center', false);
      }
      c.save(); c.beginPath(); c.rect(x, 86, w, 596); c.clip();
      this.chart.forEach((n, j) => {
        const st = this.state[i][j];
        if (st === 1) return;
        const y = hy - (n.time - t) * this.speed;
        if (y < 40 || y > H + 40) return;
        const lx = x + n.lane * lw + lw / 2;
        c.globalAlpha = st === 2 ? 0.3 : 1;
        c.fillStyle = LANE_COLS[n.lane]; c.beginPath(); c.arc(lx, y, lw * 0.34, 0, 7); c.fill();
        c.strokeStyle = '#fff'; c.lineWidth = 3; c.stroke();
        drawText(c, LANE_ARROWS[n.lane], lx, y + 8, 22, '#fff', 'center', false);
        c.globalAlpha = 1;
      });
      c.restore();
      // dancer + info
      const d = this.dance[i] > 0;
      drawBird(c, x + w / 2, 150, 0.9, p.char, { hat: p.hat, flap: d ? 1 : 0.3 + Math.sin(G.t * 8) * 0.2, rot: d ? Math.sin(G.t * 30) * 0.2 : Math.sin(G.t * 4) * 0.08, squash: d ? 0.9 : 1 });
      drawText(c, playerLabel(p), x + 14, 112, 20, p.color);
      drawText(c, String(this.scores[i]), x + w - 12, 112, 22, '#fff', 'right');
      if (this.combo[i] >= 4) drawText(c, this.combo[i] + ' combo', x + w / 2, 230, 22, '#ffd23f', 'center');
      const jd = this.judge[i];
      if (jd.t > 0) { c.globalAlpha = clamp(jd.t * 3, 0, 1); drawText(c, jd.text, x + w / 2, hy - 60, 30, jd.col, 'center'); c.globalAlpha = 1; }
    });
    this.fx.draw(c);
    // progress bar
    const prog = clamp(t / this.endTime, 0, 1);
    c.fillStyle = 'rgba(0,0,0,0.4)'; rrect(c, 340, 22, 400, 18, 9); c.fill();
    c.fillStyle = '#ffd23f'; rrect(c, 340, 22, 400 * prog, 18, 9); c.fill();
  }
}
