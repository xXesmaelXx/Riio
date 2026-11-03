'use strict';
// PlayScene runs any minigame: how-to-play card, countdown, gameplay, pause menu, finish banner.

function humanCtl(slot) {
  return {
    x: Input.ax(slot), y: Input.ay(slot),
    a: Input.down(slot, 'a'), aP: Input.pressed(slot, 'a'),
    b: Input.down(slot, 'b'), bP: Input.pressed(slot, 'b'),
    left: Input.dirPressed(slot, 'left') || Input.pressed(slot, 'x'),
    down: Input.dirPressed(slot, 'down') || Input.pressed(slot, 'a'),
    up: Input.dirPressed(slot, 'up') || Input.pressed(slot, 'y'),
    right: Input.dirPressed(slot, 'right') || Input.pressed(slot, 'b'),
  };
}
const NO_CTL = { x: 0, y: 0, a: false, aP: false, b: false, bP: false, left: false, down: false, up: false, right: false };
function aiCtl() { return { x: 0, y: 0, a: false, aP: false, b: false, bP: false, left: false, down: false, up: false, right: false }; }

// Default HUD: four player cards around a centred timer.
const HUD_X = [12, 240, 828, 1056];
function drawHud(c, inst, players, fmt) {
  players.forEach((p, i) => {
    const v = fmt ? fmt(inst.scores[i], i) : inst.scores[i];
    playerCard(c, p, HUD_X[i], 10, 216, 62, v, false);
  });
  if (inst.timeLeft != null) {
    panel(c, 570, 8, 140, 66, 'rgba(25,10,55,0.85)', inst.timeLeft < 10 ? '#ff4d6d' : '#ffd23f', 20);
    const tl = Math.ceil(Math.max(0, inst.timeLeft));
    drawText(c, String(tl), 640, 56, 40, inst.timeLeft < 10 && tl % 2 ? '#ff8fa3' : '#fff', 'center');
  }
}

class PlayScene {
  constructor(gameId, players, params, cb) {
    this.def = GAMES[gameId];
    this.players = players;
    this.params = params || {};
    this.cb = cb || {};
    this.state = 'intro';
    this.ready = players.map((p) => !p.human);
    this.t = 0;
    this.pauseMenu = null;
    this.readyBtn = { x: W / 2 - 150, y: 560, w: 300, h: 76 };
  }
  enter() {
    this.inst = this.def.create(this.players, this.params);
    Music.play(this.def.song);
    Input.touchLayout = null;
  }
  exit() { Input.touchLayout = null; }
  startCountdown() {
    this.state = 'count'; this.t = 3; this.lastCount = 4;
    Input.touchLayout = this.def.touch || 'stickA';
  }
  restart() {
    Sound.unlock();
    this.inst = this.def.create(this.players, this.params);
    Music.play(this.def.song, true);
    this.startCountdown();
  }
  pause() {
    if (this.state !== 'play' && this.state !== 'count') return;
    this.resumeState = this.state;
    this.state = 'pause';
    Input.touchLayout = null;
    Sound.sfx('back');
    const items = [
      { label: 'Resume', action: () => this.resume() },
      { label: 'Restart', action: () => this.restart() },
      { label: 'How to Play', action: () => { this.showHelp = !this.showHelp; } },
      { label: 'Quit', color: '#7a5cff', action: () => this.quit() },
    ];
    this.pauseMenu = new Menu(vList(items, W / 2 - 170, 230, 340, 70, 18));
    this.showHelp = false;
    Sound.suspend();
  }
  resume() {
    Sound.unlock();
    this.state = this.resumeState || 'play';
    Input.touchLayout = this.def.touch || 'stickA';
  }
  quit() { Sound.unlock(); Input.touchLayout = null; if (this.cb.quit) this.cb.quit(); }
  onSystemPause() { this.pause(); }
  onPadChange(slot, on) { if (!on && this.players.some((p) => p.human && p.slot === slot)) this.pause(); }
  onTap(x, y) {
    if (this.state === 'intro') {
      const b = this.readyBtn;
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) this.setReady(0);
      else if (backHit(x, y)) this.quit();
    } else if (this.state === 'pause') {
      this.pauseMenu.tap(x, y);
    } else if ((this.state === 'play' || this.state === 'count') && Input.pauseHit(x, y)) {
      this.pause();
    } else if (this.inst.onTap && this.state === 'play') this.inst.onTap(x, y);
  }
  setReady(slot) {
    this.players.forEach((p, i) => { if (p.human && p.slot === slot && !this.ready[i]) { this.ready[i] = true; Sound.sfx('select'); } });
  }
  update(dt) {
    this.t -= dt;
    switch (this.state) {
      case 'intro':
        for (let s = 0; s < 4; s++) if (Input.pressed(s, 'a')) this.setReady(s);
        if (Input.anyPressed('b') >= 0) { Sound.sfx('back'); this.quit(); return; }
        if (Input.anyPressed('start') >= 0) this.ready = this.ready.map(() => true);
        if (this.ready.every((r) => r)) this.startCountdown();
        break;
      case 'count': {
        const n = Math.ceil(this.t);
        if (n !== this.lastCount) { this.lastCount = n; if (n > 0) Sound.sfx('count'); else Sound.sfx('go'); }
        if (this.inst.preUpdate) this.inst.preUpdate(dt);
        if (Input.anyPressed('start') >= 0) this.pause();
        if (this.t <= 0) { this.state = 'play'; this.t = 0.8; }
        break;
      }
      case 'play':
        if (Input.anyPressed('start') >= 0) { this.pause(); return; }
        this.inst.update(dt);
        if (this.inst.done) { this.state = 'finish'; this.t = 2.2; Sound.sfx('whistle'); Input.touchLayout = null; }
        break;
      case 'finish':
        if (this.inst.postUpdate) this.inst.postUpdate(dt);
        if (this.t <= 0) this.finish();
        break;
      case 'pause':
        this.pauseMenu.update(dt);
        if (Input.anyPressed('b') >= 0 || Input.anyPressed('start') >= 0) { Sound.sfx('select'); this.resume(); }
        break;
    }
  }
  finish() {
    const inst = this.inst, n = this.players.length;
    const metric = this.players.map((p, i) => (inst.metric ? inst.metric(i) : inst.scores[i]));
    const order = [...Array(n).keys()].sort((a, b) => inst.scores[b] - inst.scores[a]);
    const ranks = new Array(n);
    order.forEach((pi, k) => { ranks[pi] = k > 0 && inst.scores[pi] === inst.scores[order[k - 1]] ? ranks[order[k - 1]] : k; });
    if (inst.coop) ranks.fill(0);
    const fruit = this.players.map((p, i) => (inst.fruit ? inst.fruit[i] : Math.max(0, Math.round(inst.scores[i] * (this.def.fruitRate || 1)))));
    const res = { gameId: this.def.id, players: this.players, scores: inst.scores.slice(), metric, ranks, fruit, won: inst.won, fmt: this.def.fmt };
    Save.data.stats.played++;
    if (this.cb.end) this.cb.end(res);
  }
  draw(c) {
    const inst = this.inst;
    inst.draw(c);
    if (!inst.noHud && this.state !== 'intro') drawHud(c, inst, this.players, this.def.fmt);
    if (inst.drawOverlay) inst.drawOverlay(c);
    if (this.state === 'play' || this.state === 'count') Input.drawTouch(c);
    if (this.state === 'count') {
      const n = Math.ceil(this.t), f = this.t - Math.floor(this.t);
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(0, 0, W, H);
      const sc = easeOutBack(clamp((1 - f) * 2, 0, 1));
      c.save(); c.translate(W / 2, H / 2); c.scale(sc, sc);
      drawText(c, n > 0 ? String(n) : 'GO!', 0, 40, 140, n > 0 ? '#fff' : '#ffd23f', 'center');
      c.restore();
    } else if (this.state === 'play' && this.t > 0) {
      c.globalAlpha = clamp(this.t * 2, 0, 1);
      drawText(c, 'GO!', W / 2, H / 2 + 40, 140, '#ffd23f', 'center');
      c.globalAlpha = 1;
    } else if (this.state === 'finish') {
      const k = easeOutBack(clamp((2.2 - this.t) * 3, 0, 1));
      c.save(); c.translate(W / 2, H / 2); c.scale(k, k); c.rotate(-0.05);
      drawText(c, inst.finishText || 'FINISH!', 0, 30, 120, '#ffd23f', 'center');
      c.restore();
    } else if (this.state === 'intro') this.drawIntro(c);
    else if (this.state === 'pause') this.drawPause(c);
  }
  drawHelpPanel(c, x, y, w, h) {
    const d = this.def;
    panel(c, x, y, w, h);
    drawText(c, d.name, x + w / 2, y + 62, 50, '#ffd23f', 'center');
    let yy = y + 104;
    for (const line of wrapText(c, d.desc, w - 80, 24)) { drawText(c, line, x + w / 2, yy, 24, '#fff', 'center'); yy += 32; }
    yy += 10;
    const touch = Input.lastSource === 'touch';
    for (const line of (touch ? d.controlsTouch || d.controls : d.controls)) {
      drawText(c, line, x + w / 2, yy, 22, '#9be7ff', 'center'); yy += 30;
    }
    if (this.params.goalText) {
      yy += 6;
      drawText(c, 'GOAL: ' + this.params.goalText, x + w / 2, yy, 26, '#3ddc84', 'center');
    }
  }
  drawIntro(c) {
    c.fillStyle = 'rgba(15,5,35,0.6)'; c.fillRect(0, 0, W, H);
    this.drawHelpPanel(c, 190, 40, 900, 420);
    // ready indicators
    this.players.forEach((p, i) => {
      const x = 190 + i * 228, y = 470;
      panel(c, x, y, 216, 74, 'rgba(25,10,55,0.85)', this.ready[i] ? '#3ddc84' : p.color, 16);
      drawBird(c, x + 42, y + 42, 0.62, p.char, { hat: p.hat, legs: false, flap: this.ready[i] ? 0.5 + Math.sin(G.t * 14) * 0.5 : 0.3 });
      drawText(c, playerLabel(p), x + 82, y + 32, 20, p.color);
      drawText(c, this.ready[i] ? 'READY!' : 'Press A', x + 82, y + 58, 20, this.ready[i] ? '#3ddc84' : '#fff');
    });
    const b = this.readyBtn;
    if (!this.ready[this.players.findIndex((p) => p.human && p.slot === 0)]) button(c, 'Ready!', b.x, b.y + 10, b.w, b.h - 10, true, { color: '#3ddc84' });
    drawHints(c, [['A', 'Ready'], ['START', 'Skip'], ['B', 'Back']]);
  }
  drawPause(c) {
    c.fillStyle = 'rgba(15,5,35,0.72)'; c.fillRect(0, 0, W, H);
    if (this.showHelp) {
      this.drawHelpPanel(c, 190, 20, 900, 400);
      this.pauseMenu.items.forEach((it, i) => { it.y = 440 + Math.floor(i / 2) * 84; it.x = W / 2 - 350 + (i % 2) * 360; });
    } else {
      drawText(c, 'PAUSED', W / 2, 170, 70, '#ffd23f', 'center');
      this.pauseMenu.items.forEach((it, i) => { it.y = 230 + i * 88; it.x = W / 2 - 170; });
    }
    this.pauseMenu.draw(c);
  }
}
