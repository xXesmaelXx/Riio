'use strict';
// Menus and game modes: title, main menu, adventure, party, free play, wardrobe, options, controllers.

// ---------- toasts ----------
const Toasts = [];
function toast(text, color = '#ffd23f') { Toasts.push({ text, color, t: 3 }); }
function drawToasts(c, dt) {
  let y = 130;
  for (const t of Toasts) {
    t.t -= dt;
    const a = clamp(Math.min(t.t, 3 - t.t) * 4, 0, 1);
    c.globalAlpha = a;
    c.font = 'bold 28px ' + FONT;
    const w = c.measureText(t.text).width + 60;
    panel(c, W / 2 - w / 2, y - 40 + (1 - a) * -20, w, 58, 'rgba(25,10,55,0.95)', t.color, 20);
    drawText(c, t.text, W / 2, y - 2 + (1 - a) * -20, 28, t.color, 'center');
    c.globalAlpha = 1;
    y += 70;
  }
  for (let i = Toasts.length - 1; i >= 0; i--) if (Toasts[i].t <= 0) Toasts.splice(i, 1);
}

function cpuSkill(bonus = 0) { return clamp([0.3, 0.58, 0.85][Save.data.opts.difficulty] + bonus, 0.1, 0.97); }

function buildPlayers(entries, skillBonus = 0) {
  return entries.map((e, i) => ({
    i, slot: e.human ? e.slot : -1, human: e.human, char: e.char,
    hat: e.human ? (Save.data.hats[e.char] || 'none') : (e.hat || 'none'),
    color: PCOLORS[i], skill: cpuSkill(skillBonus) + (e.human ? 0 : rand(-0.06, 0.06)),
  }));
}

// Base class for simple menu screens.
class MenuScene {
  constructor() { this.menu = null; }
  back() {}
  update(dt) {
    if (this.menu) this.menu.update(dt);
    if (Input.anyPressed('b') >= 0) { Sound.sfx('back'); this.back(); }
  }
  onTap(x, y) {
    if (backHit(x, y) && Input.lastSource === 'touch') { Sound.sfx('back'); this.back(); return; }
    if (this.menu) this.menu.tap(x, y);
  }
}

// ---------- title ----------
class TitleScene {
  enter() { Music.play('title'); this.t = 0; }
  update(dt) {
    this.t += dt;
    if (Input.anyPressed('a') >= 0 || Input.anyPressed('start') >= 0) this.go();
  }
  onTap() { this.go(); }
  go() { Sound.unlock(); Sound.sfx('select'); if (!Music.timer) Music.play('title'); setScene(new MainMenu()); }
  draw(c) {
    drawBackground(c, 'menu');
    const t = G.t;
    PLAYABLE.slice(0, Save.data.beaten ? 5 : 4).forEach((id, i) => {
      const x = ((t * 120 + i * 330) % (W + 300)) - 150, y = 330 + Math.sin(t * 2 + i) * 40 + (i % 2) * 70;
      drawBird(c, x, y, 1.2, id, { legs: false, flap: 0.5 + Math.sin(t * 14 + i) * 0.5, hat: Save.data.hats[id] || 'none' });
    });
    c.save(); c.translate(W / 2, 190); c.rotate(Math.sin(t * 1.5) * 0.02);
    const s = 1 + Math.sin(t * 3) * 0.02; c.scale(s, s);
    drawText(c, 'FEATHER', 0, -20, 110, '#ffd23f', 'center');
    drawText(c, 'FIESTA', 0, 90, 120, '#ff5d8f', 'center');
    c.restore();
    drawText(c, 'A Carnival Party Adventure', W / 2, 330, 28, '#fff', 'center');
    if (Math.floor(t * 2) % 2 === 0) drawText(c, Input.lastSource === 'touch' ? 'Tap to start' : 'Press A to start', W / 2, 600, 36, '#fff', 'center');
    drawText(c, '1-4 players  •  Controllers supported', W / 2, 690, 20, '#ffe9f0', 'center');
  }
}

// ---------- main menu ----------
class MainMenu extends MenuScene {
  enter() {
    Music.play('menu');
    const items = [
      { label: 'Adventure', color: '#ff5d8f', action: () => setScene(new AdventureMap()) },
      { label: 'Party Mode', color: '#ff8c42', action: () => setScene(new PartySetup()) },
      { label: 'Minigames', color: '#3bceac', action: () => setScene(new FreePlayScene()) },
      { label: 'Wardrobe', color: '#b967ff', action: () => setScene(new ShopScene()) },
      { label: 'Options', color: '#4d7cff', action: () => setScene(new OptionsScene(this)) },
      { label: 'Controllers', color: '#4d7cff', action: () => setScene(new ControllerScene()) },
    ];
    if (G.isAndroid) items.push({ label: 'Exit', color: '#7a5cff', action: () => { Save.write(); window.AndroidBridge.exit(); } });
    this.menu = new Menu(items.map((it, i) => {
      if (i < 3) return Object.assign({ x: 90, y: 180 + i * 125, w: 460, h: 105, size: 42 }, it);
      return Object.assign({ x: 600 + ((i - 3) % 2) * 290, y: 470 + Math.floor((i - 3) / 2) * 92, w: 270, h: 76, size: 30 }, it);
    }), { start: this._last || 0 });
  }
  back() { setScene(new TitleScene()); }
  draw(c) {
    drawBackground(c, 'menu');
    drawText(c, 'FEATHER FIESTA', 90, 120, 64, '#ffd23f');
    drawFruitCounter(c, W - 220, 24);
    panel(c, W - 220, 88, 190, 54, 'rgba(30,14,70,0.85)', '#ffd23f', 27);
    starShape(c, W - 188, 115, 16, true);
    drawText(c, totalStars() + ' / 30', W - 160, 126, 26, '#fff');
    // featured bird
    const id = Save.data.lastChar;
    drawBird(c, 880, 300, 3, id, { hat: Save.data.hats[id] || 'none', flap: 0.4 + Math.sin(G.t * 3) * 0.2 });
    this.menu.draw(c);
    drawHints(c, [['A', 'Select'], ['B', 'Back']]);
  }
}

// ---------- lobby: join & character select ----------
class LobbyScene {
  constructor(opts) {
    this.opts = opts;
    const humans = opts.humans || null; // reuse previous selection
    this.slots = [0, 1, 2, 3].map((i) => ({ joined: i === 0, ready: false, char: i === 0 ? Save.data.lastChar : null }));
    if (humans) humans.forEach((h) => { if (h.slot > 0 && Input.hasPad(h.slot)) { this.slots[h.slot].joined = true; this.slots[h.slot].char = h.char; } });
    if (!this.allowed().includes(this.slots[0].char)) this.slots[0].char = this.allowed()[0];
    this.t = 0;
  }
  enter() { Music.play('menu'); }
  allowed() { return PLAYABLE.filter((id) => Save.data.chars.includes(id) && !(this.opts.excludeCorvo && id === 'corvo')); }
  cycle(i, dir) {
    const al = this.allowed();
    const taken = this.slots.filter((s, j) => j !== i && s.joined).map((s) => s.char);
    let idx = al.indexOf(this.slots[i].char);
    for (let n = 0; n < al.length; n++) {
      idx = (idx + dir + al.length) % al.length;
      if (!taken.includes(al[idx])) break;
    }
    this.slots[i].char = al[idx];
    Sound.sfx('move');
  }
  update(dt) {
    this.t += dt;
    for (let i = 0; i < 4; i++) {
      const s = this.slots[i];
      if (!s.joined) {
        if (Input.hasPad(i) && Input.pressed(i, 'a')) {
          s.joined = true; s.ready = false; s.char = null; this.cycle(i, 1); Sound.sfx('select');
        }
        continue;
      }
      if (!s.ready) {
        if (Input.dirPressed(i, 'left')) this.cycle(i, -1);
        if (Input.dirPressed(i, 'right')) this.cycle(i, 1);
        if (Input.pressed(i, 'a')) { s.ready = true; Sound.sfx('select'); }
        if (Input.pressed(i, 'b')) {
          Sound.sfx('back');
          if (i === 0) { this.opts.back(); return; }
          s.joined = false;
        }
      } else if (Input.pressed(i, 'b')) { s.ready = false; Sound.sfx('back'); }
    }
    if (Input.pressed(0, 'start') && !this.slots[0].ready) this.slots[0].ready = true;
    const joined = this.slots.filter((s) => s.joined);
    if (joined.length && joined.every((s) => s.ready)) this.done();
  }
  done() {
    const entries = this.slots.map((s, i) => (s.joined ? { human: true, slot: i, char: s.char } : null));
    const used = entries.filter(Boolean).map((e) => e.char);
    let pool = PLAYABLE.filter((id) => !used.includes(id) && (id !== 'corvo' || (Save.data.beaten && !this.opts.excludeCorvo)));
    pool = shuffle(pool);
    const total = this.opts.total || 4;
    const out = [];
    for (let i = 0; i < 4; i++) {
      if (entries[i]) out.push(entries[i]);
      else if (out.length < total || entries.slice(i).some(Boolean)) out.push({ human: false, char: pool.pop() || 'pico', hat: pick(['none', 'none', 'party', 'shades', 'flowers', 'straw']) });
    }
    Save.data.lastChar = this.slots[0].char;
    Save.write();
    this.opts.done(out.slice(0, Math.max(total, out.filter((e) => e.human).length)));
  }
  panelRect(i) { return { x: 30 + i * 310, y: 150, w: 290, h: 430 }; }
  onTap(x, y) {
    if (backHit(x, y)) { Sound.sfx('back'); this.opts.back(); return; }
    const r = this.panelRect(0);
    if (y > r.y && y < r.y + 330 && x > r.x && x < r.x + r.w) {
      if (x < r.x + 80) this.cycle(0, -1); else if (x > r.x + r.w - 80) this.cycle(0, 1);
    }
    if (x > 440 && x < 840 && y > 600 && y < 690) { this.slots[0].ready = true; this.slots.forEach((s, i) => { if (i > 0 && s.joined) s.ready = true; }); Sound.sfx('select'); }
  }
  draw(c) {
    drawBackground(c, 'menu');
    drawTitle(c, this.opts.title || 'Who is playing?', this.opts.sub || 'Connect controllers and press A to join');
    for (let i = 0; i < 4; i++) {
      const s = this.slots[i], r = this.panelRect(i);
      panel(c, r.x, r.y, r.w, r.h, 'rgba(30,14,70,0.88)', s.joined ? (s.ready ? '#3ddc84' : PCOLORS[i]) : '#5b5470');
      drawText(c, 'P' + (i + 1), r.x + 20, r.y + 44, 32, PCOLORS[i]);
      if (!s.joined) {
        const has = Input.hasPad(i);
        drawText(c, has ? 'Press A to join' : 'CPU', r.x + r.w / 2, r.y + 200, 28, '#ccc', 'center');
        if (!has) drawText(c, 'Connect a controller', r.x + r.w / 2, r.y + 240, 18, '#aaa', 'center');
        drawBird(c, r.x + r.w / 2, r.y + 320, 1.2, { species: 'parrot', body: '#555', belly: '#777', wing: '#444', beak: '#888', tail: ['#444'] }, { alpha: 0.4 });
        continue;
      }
      const ch = CHARS[s.char];
      drawBird(c, r.x + r.w / 2, r.y + 190, 2.2, ch, { hat: Save.data.hats[s.char] || 'none', flap: s.ready ? 0.5 + Math.sin(G.t * 14) * 0.5 : 0.4, phase: i });
      drawText(c, '◀', r.x + 30, r.y + 200, 40, s.ready ? '#555' : '#fff', 'center');
      drawText(c, '▶', r.x + r.w - 30, r.y + 200, 40, s.ready ? '#555' : '#fff', 'center');
      drawText(c, ch.name, r.x + r.w / 2, r.y + 320, 34, '#fff', 'center');
      const lines = wrapText(c, ch.desc, r.w - 30, 17);
      lines.slice(0, 3).forEach((l, k) => drawText(c, l, r.x + r.w / 2, r.y + 352 + k * 22, 17, '#ddd', 'center', false, 'normal'));
      if (s.ready) drawText(c, 'READY!', r.x + r.w / 2, r.y + 90, 36, '#3ddc84', 'center');
    }
    if (Input.lastSource === 'touch') button(c, this.opts.goLabel || "Let's go!", 440, 600, 400, 86, true, { color: '#3ddc84', size: 36 });
    else drawHints(c, [['A', 'Ready'], ['L/R', 'Change bird'], ['B', 'Back']]);
  }
}

// ---------- dialog ----------
class DialogScene {
  constructor(lines, theme, next) { this.lines = lines; this.theme = theme; this.next = next; this.i = 0; this.chars = 0; }
  enter() { Music.play('menu'); }
  advance() {
    const full = this.lines[this.i].text.length;
    if (this.chars < full) { this.chars = full; return; }
    this.i++; this.chars = 0; Sound.sfx('move');
    if (this.i >= this.lines.length) this.next();
  }
  update(dt) {
    if (this.i >= this.lines.length) return;
    const before = Math.floor(this.chars);
    this.chars = Math.min(this.lines[this.i].text.length, this.chars + dt * 45);
    if (Math.floor(this.chars) !== before && before % 3 === 0) Sound.sfx('type');
    if (Input.anyPressed('a') >= 0) this.advance();
    if (Input.anyPressed('start') >= 0) { this.i = this.lines.length; this.next(); }
  }
  onTap(x, y) { if (x > W - 200 && y < 90) { this.i = this.lines.length; this.next(); } else this.advance(); }
  draw(c) {
    drawBackground(c, this.theme);
    c.fillStyle = 'rgba(15,5,35,0.35)'; c.fillRect(0, 0, W, H);
    const ln = this.lines[Math.min(this.i, this.lines.length - 1)];
    const speakers = [...new Set(this.lines.map((l) => l.who))];
    speakers.forEach((who, k) => {
      const active = who === ln.who;
      const x = W * (k + 1) / (speakers.length + 1);
      drawBird(c, x, active ? 330 : 350, active ? 2.6 : 2.1, who, { face: x > W / 2 ? -1 : 1, alpha: active ? 1 : 0.55, hat: Save.data.hats[who] || (who === 'corvo' ? 'captain' : who === 'tio' ? 'straw' : 'none'), flap: active ? 0.4 + Math.sin(G.t * 10) * 0.2 : 0.3, mood: who === 'corvo' && this.i < this.lines.length - 3 ? 'angry' : null });
    });
    panel(c, 60, 470, W - 120, 210);
    drawText(c, CHARS[ln.who].name, 100, 520, 34, '#ffd23f');
    const shown = ln.text.slice(0, Math.floor(this.chars));
    wrapText(c, shown, W - 220, 28).forEach((l, k) => drawText(c, l, 100, 570 + k * 38, 28, '#fff', 'left', false));
    if (this.chars >= ln.text.length && Math.floor(G.t * 3) % 2) drawText(c, '▼', W - 110, 660, 28, '#ffd23f', 'center');
    button(c, 'Skip ▶▶', W - 190, 20, 170, 56, false, { color: '#7a5cff', size: 24 });
  }
}

// ---------- adventure ----------
const MAP_NODES = [[170, 520], [400, 380], [640, 520], [880, 360], [1110, 480]];
class AdventureMap extends MenuScene {
  constructor(focus) { super(); this.focus = focus != null ? focus : Math.min(Save.data.chapter, CHAPTERS.length - 1); }
  enter() {
    Music.play('menu');
    this.menu = new Menu(CHAPTERS.map((ch, i) => ({
      x: MAP_NODES[i][0] - 70, y: MAP_NODES[i][1] - 70, w: 140, h: 140, disabled: i > Save.data.chapter,
      onDisabled: () => toast('Finish the previous chapter first!', '#ff8fa3'),
      action: () => setScene(new ChapterScene(i)),
      draw: (c, b, f) => this.drawNode(c, i, f),
    })), { start: this.focus });
  }
  back() { setScene(new MainMenu()); }
  drawNode(c, i, focused) {
    const ch = CHAPTERS[i], [x, y] = MAP_NODES[i];
    const locked = i > Save.data.chapter;
    const s = focused ? 1.08 + Math.sin(G.t * 6) * 0.03 : 1;
    c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.arc(4, 8, 66, 0, 7); c.fill();
    c.fillStyle = locked ? '#5b5470' : ['#4fc3f7', '#ffb46b', '#7fb3c9', '#2f9e44', '#b967ff'][i]; c.beginPath(); c.arc(0, 0, 66, 0, 7); c.fill();
    c.strokeStyle = focused ? '#fff6b0' : '#ffd23f'; c.lineWidth = focused ? 8 : 4; c.stroke();
    if (locked) drawText(c, '🔒', 0, 18, 50, '#fff', 'center', false);
    else {
      const stars = ch.stages.reduce((a, st) => a + (Save.data.stars[st.id] || 0), 0);
      drawText(c, String(i + 1), 0, 20, 60, '#fff', 'center');
      for (let k = 0; k < 6; k++) starShape(c, -50 + k * 20, 52, 9, k < stars);
      if (ch.stages.every((st) => Save.data.cleared[st.id])) { drawText(c, '✔', 48, -40, 34, '#3ddc84', 'center'); }
    }
    c.restore();
    drawText(c, ch.name, x, y - 84, 24, locked ? '#aaa' : '#fff', 'center');
  }
  draw(c) {
    // island map
    skyGrad(c, '#1e88e5', '#4dd0e1');
    c.fillStyle = '#f7d794'; ellipse(c, 640, 460, 640, 270); c.fill();
    c.fillStyle = '#7cc46a'; ellipse(c, 640, 450, 590, 230); c.fill();
    c.fillStyle = '#5fae55'; ellipse(c, 850, 380, 260, 120); c.fill();
    c.strokeStyle = '#fff3c0'; c.lineWidth = 10; c.setLineDash([18, 16]);
    c.beginPath(); MAP_NODES.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); c.setLineDash([]);
    drawPalm(c, 60, 600, 0.6, Math.sin(G.t)); drawPalm(c, 1220, 620, 0.6, Math.sin(G.t + 1));
    drawTitle(c, 'Adventure', 'Recover the 5 pieces of the Golden Drum!');
    this.menu.draw(c);
    // player marker on the newest chapter
    const [mx, my] = MAP_NODES[Math.min(Save.data.chapter, 4)];
    drawBird(c, mx + 70, my - 40 + Math.sin(G.t * 4) * 6, 0.9, Save.data.lastChar, { hat: Save.data.hats[Save.data.lastChar] || 'none', legs: false, flap: 0.5 + Math.sin(G.t * 14) * 0.5 });
    // drum pieces
    panel(c, 20, 640, 470, 64, 'rgba(30,14,70,0.85)', '#ffd23f', 20);
    drawText(c, 'Drum pieces:', 40, 682, 22, '#fff');
    CHAPTERS.forEach((ch, i) => {
      const got = ch.stages.every((st) => Save.data.cleared[st.id]);
      c.fillStyle = got ? '#ffd23f' : 'rgba(0,0,0,0.4)'; c.beginPath(); c.arc(220 + i * 54, 672, 20, 0, 7); c.fill();
      c.strokeStyle = got ? '#8a5a00' : '#777'; c.lineWidth = 3; c.stroke();
    });
    drawHints(c, [['A', 'Enter'], ['B', 'Back']]);
  }
}

class ChapterScene extends MenuScene {
  constructor(ci) { super(); this.ci = ci; this.ch = CHAPTERS[ci]; }
  enter() {
    Music.play('menu');
    if (!Save.data.seen[this.ch.id + '_intro']) {
      Save.data.seen[this.ch.id + '_intro'] = true; Save.write();
      setScene(new DialogScene(this.ch.intro, this.ch.theme, () => setScene(new ChapterScene(this.ci))), true);
      return;
    }
    const items = this.ch.stages.map((st, si) => ({
      x: 120 + si * 540, y: 200, w: 500, h: 300, disabled: si > 0 && !Save.data.cleared[this.ch.stages[si - 1].id],
      onDisabled: () => toast('Clear the previous stage first!', '#ff8fa3'),
      action: () => this.startStage(si),
      draw: (c, b, f) => this.drawStage(c, b, f, st, si),
    }));
    items.push({ label: 'Replay Story', x: 120, y: 540, w: 300, h: 70, color: '#7a5cff', action: () => setScene(new DialogScene(this.ch.intro, this.ch.theme, () => setScene(new ChapterScene(this.ci)))) });
    const firstOpen = this.ch.stages.findIndex((st) => !Save.data.cleared[st.id]);
    this.menu = new Menu(items, { start: Math.max(0, firstOpen) });
  }
  back() { setScene(new AdventureMap(this.ci)); }
  drawStage(c, b, f, st, si) {
    const g = GAMES[st.game];
    const locked = b.disabled;
    const sc = f ? 1.03 : 1;
    c.save(); c.translate(b.x + b.w / 2, b.y + b.h / 2); c.scale(sc, sc); c.translate(-b.w / 2, -b.h / 2);
    panel(c, 0, 0, b.w, b.h, locked ? 'rgba(40,30,60,0.9)' : 'rgba(30,14,70,0.92)', f ? '#fff6b0' : '#ffd23f');
    drawText(c, 'Stage ' + (si + 1), 24, 44, 24, '#ffb3c6');
    drawText(c, st.name, 24, 88, 38, locked ? '#888' : '#fff');
    drawText(c, g.name, 24, 126, 24, '#9be7ff');
    drawText(c, 'Goal: ' + st.label.replace('{g}', st.goal[0]), 24, 176, 24, '#3ddc84');
    if (!st.boss) drawText(c, '★★ ' + st.goal[1] + '   ★★★ ' + st.goal[2], 24, 210, 20, '#ffe9a8');
    else drawText(c, '★★ with 40s left   ★★★ with 70s left', 24, 210, 20, '#ffe9a8');
    for (let k = 0; k < 3; k++) starShape(c, b.w - 150 + k * 50, 50, 20, k < (Save.data.stars[st.id] || 0));
    if (locked) drawText(c, '🔒 Locked', b.w / 2, 268, 28, '#aaa', 'center', false);
    else drawText(c, f ? (Input.lastSource === 'touch' ? 'Tap to play' : 'Press A to play') : '', b.w / 2, 270, 26, '#fff', 'center');
    c.restore();
  }
  startStage(si) {
    const st = this.ch.stages[si];
    const ci = this.ci;
    const lobby = new LobbyScene({
      title: st.name, sub: 'Friends can join with controllers', excludeCorvo: st.boss, goLabel: 'Start!',
      back: () => setScene(new ChapterScene(ci)),
      done: (entries) => runStage(ci, si, entries),
    });
    setScene(lobby);
  }
  draw(c) {
    drawBackground(c, this.ch.theme);
    c.fillStyle = 'rgba(15,5,35,0.35)'; c.fillRect(0, 0, W, H);
    drawTitle(c, 'Chapter ' + (this.ci + 1) + ': ' + this.ch.name, 'Find the ' + this.ch.piece);
    if (this.menu) this.menu.draw(c);
    drawHints(c, [['A', 'Play'], ['B', 'Map']]);
  }
}

function runStage(ci, si, entries) {
  const ch = CHAPTERS[ci], st = ch.stages[si];
  const players = buildPlayers(entries, ci * 0.03 - 0.05);
  const params = Object.assign({ theme: ch.theme, goalText: st.label.replace('{g}', st.goal[0]) }, st.params);
  setScene(new PlayScene(st.game, players, params, {
    quit: () => setScene(new ChapterScene(ci)),
    end: (res) => {
      const humans = res.players.map((p, i) => i).filter((i) => res.players[i].human);
      const best = Math.max(...humans.map((i) => res.metric[i]));
      const pass = st.boss ? !!res.won : best >= st.goal[0];
      const stars = pass ? st.goal.filter((g) => best >= g).length : 0;
      const prevStars = Save.data.stars[st.id] || 0;
      const newBest = stars > prevStars;
      if (newBest) Save.data.stars[st.id] = stars;
      const firstClear = pass && !Save.data.cleared[st.id];
      if (pass) { Save.data.cleared[st.id] = true; Save.unlockGame(st.game); }
      const fruit = humans.reduce((a, i) => a + res.fruit[i], 0) + (firstClear ? 30 : 0);
      Save.addFruit(fruit);
      Save.write();
      const chapterDone = ch.stages.every((s) => Save.data.cleared[s.id]);
      const justFinishedChapter = firstClear && chapterDone && !Save.data.seen[ch.id + '_outro'];
      setScene(new ResultsScene(res, {
        mode: 'adventure', pass, stars, newBest, fruit, goal: st.label.replace('{g}', st.goal[0]), metricLabel: st.boss ? null : st.label.replace('{g}', ''), best,
        buttons: [
          { label: 'Retry', action: () => runStage(ci, si, entries) },
          { label: 'Continue', color: '#3ddc84', action: () => {
            if (justFinishedChapter) finishChapter(ci);
            else setScene(new ChapterScene(ci));
          } },
        ],
      }));
    },
  }));
}

function finishChapter(ci) {
  const ch = CHAPTERS[ci];
  Save.data.seen[ch.id + '_outro'] = true;
  Save.data.chapter = Math.max(Save.data.chapter, Math.min(ci + 1, CHAPTERS.length - 1));
  Save.write();
  setScene(new DialogScene(ch.outro, ch.theme, () => {
    toast(ch.piece + ' recovered!');
    if (ch.unlockChar && Save.unlockChar(ch.unlockChar)) { toast(CHARS[ch.unlockChar].name + ' is now playable!', '#3ddc84'); Sound.sfx('unlock'); }
    if (ci === CHAPTERS.length - 1) { Save.data.beaten = true; Save.addFruit(200); Save.write(); setScene(new EndingScene()); }
    else { Save.write(); setScene(new AdventureMap(ci + 1)); }
  }));
}

class EndingScene {
  enter() { Music.play('carnival'); this.t = 0; this.fx = new Particles(); }
  update(dt) {
    this.t += dt; this.fx.update(dt);
    if (Math.random() < dt * 3) this.fx.confetti(rand(100, W - 100), rand(100, 300), 20);
    if (this.t > 2 && (Input.anyPressed('a') >= 0 || Input.anyPressed('b') >= 0)) setScene(new MainMenu());
  }
  onTap() { if (this.t > 2) setScene(new MainMenu()); }
  draw(c) {
    drawBackground(c, 'carnival');
    ['pico', 'tuca', 'zuzu', 'nina', 'corvo', 'tio'].forEach((id, i) => {
      const x = 160 + i * 192, hop = Math.abs(Math.sin(G.t * 5 + i)) * 40;
      drawBird(c, x, 520 - hop, 1.6, id, { hat: id === 'corvo' ? 'captain' : id === 'tio' ? 'straw' : Save.data.hats[id] || 'feathers', flap: 0.5 + Math.sin(G.t * 10 + i) * 0.5, rot: Math.sin(G.t * 5 + i) * 0.15 });
    });
    // golden drum
    c.fillStyle = '#ffd23f'; ellipse(c, 640, 330, 90, 30); c.fill();
    c.fillStyle = '#e8a317'; c.fillRect(550, 330, 180, 90); ellipse(c, 640, 420, 90, 30); c.fill();
    c.fillStyle = '#fff3a8'; ellipse(c, 640, 330, 80, 24); c.fill();
    this.fx.draw(c);
    drawText(c, 'THE FEATHER FIESTA IS SAVED!', W / 2, 110, 54, '#ffd23f', 'center');
    drawText(c, 'Don Corvo joined the flock and is now playable.', W / 2, 160, 26, '#fff', 'center');
    drawText(c, 'Thanks for playing!  +200 fruit bonus', W / 2, 200, 24, '#9be7ff', 'center');
    if (this.t > 2) drawText(c, 'Press A to continue', W / 2, 690, 26, '#fff', 'center');
  }
}

// ---------- results ----------
class ResultsScene extends MenuScene {
  constructor(res, opts) { super(); this.res = res; this.opts = opts; this.t = 0; this.fx = new Particles(); }
  enter() {
    Music.play('results');
    const btns = this.opts.buttons;
    this.menu = new Menu(btns.map((b, i) => Object.assign({ x: W / 2 - (btns.length * 300) / 2 + i * 300 + 10, y: 620, w: 280, h: 76 }, b)), { start: btns.length - 1 });
    if (this.opts.mode === 'adventure') { Sound.sfx(this.opts.pass ? 'fanfare' : 'lose'); if (this.opts.pass) this.fx.confetti(W / 2, 200, 60); }
    else Sound.sfx('fanfare');
  }
  back() {}
  update(dt) { this.t += dt; this.fx.update(dt); if (this.t > 0.6) this.menu.update(dt); }
  onTap(x, y) { if (this.t > 0.6) this.menu.tap(x, y); }
  draw(c) {
    drawBackground(c, 'menu');
    const r = this.res, o = this.opts, g = GAMES[r.gameId];
    drawTitle(c, g.name + ' Results', o.mode === 'adventure' ? (o.pass ? 'Stage clear!' : 'So close! Try again.') : o.sub);
    const order = r.players.map((p, i) => i).sort((a, b) => r.ranks[a] - r.ranks[b]);
    const fmt = r.fmt || ((v) => v);
    order.forEach((pi, k) => {
      const p = r.players[pi];
      const y = 150 + k * 92, x = o.mode === 'adventure' ? 80 : 240;
      const appear = clamp((this.t - k * 0.12) * 4, 0, 1);
      c.save(); c.globalAlpha = appear; c.translate((1 - appear) * -60, 0);
      panel(c, x, y, 640, 80, 'rgba(30,14,70,0.88)', p.color, 18);
      drawText(c, r.players.length > 1 && r.gameId !== 'boss' ? ['1st', '2nd', '3rd', '4th'][r.ranks[pi]] : '', x + 20, y + 52, 34, r.ranks[pi] === 0 ? '#ffd23f' : '#fff');
      drawBird(c, x + 130, y + 46, 0.8, p.char, { hat: p.hat, legs: false, flap: r.ranks[pi] === 0 ? 0.5 + Math.sin(G.t * 14) * 0.5 : 0.3 });
      drawText(c, playerLabel(p) + '  ' + CHARS[p.char].name, x + 180, y + 50, 26, p.color);
      drawText(c, String(fmt(r.scores[pi])), x + 470, y + 52, 32, '#fff', 'right');
      if (p.human) { drawFruit(c, 'mango', x + 520, y + 40, 0.9); drawText(c, '+' + r.fruit[pi], x + 545, y + 52, 24, '#ffd23f'); }
      if (o.points) drawText(c, '+' + o.points[pi] + ' pts', x + 630, y + 52, 22, '#3ddc84', 'right');
      c.restore();
    });
    if (o.mode === 'adventure') {
      panel(c, 760, 150, 440, 360);
      drawText(c, 'GOAL', 980, 200, 30, '#ffd23f', 'center');
      wrapText(c, o.goal, 400, 24).forEach((l, k) => drawText(c, l, 980, 240 + k * 30, 24, '#fff', 'center'));
      if (GAMES[r.gameId].id === 'samba') drawText(c, 'Your accuracy: ' + o.best + '%', 980, 310, 24, '#9be7ff', 'center');
      else if (GAMES[r.gameId].id === 'boss') drawText(c, o.pass ? 'Time left: ' + o.best + 's' : 'Don Corvo escaped!', 980, 310, 24, '#9be7ff', 'center');
      else drawText(c, 'Your best: ' + o.best, 980, 310, 24, '#9be7ff', 'center');
      for (let k = 0; k < 3; k++) {
        const pop = clamp((this.t - 0.5 - k * 0.25) * 4, 0, 1);
        const sc = k < o.stars ? easeOutBack(pop) : 1;
        c.save(); c.translate(900 + k * 80, 390); c.scale(sc, sc); starShape(c, 0, 0, 34, k < o.stars && pop > 0); c.restore();
      }
      drawText(c, o.pass ? (o.newBest ? 'New best!' : 'Cleared!') : 'Not cleared', 980, 470, 28, o.pass ? '#3ddc84' : '#ff8fa3', 'center');
      drawText(c, '+' + o.fruit + ' fruit', 980, 500, 22, '#ffd23f', 'center');
    }
    this.fx.draw(c);
    this.menu.draw(c);
  }
}

// ---------- party mode ----------
class PartySetup extends MenuScene {
  enter() {
    Music.play('menu');
    this.rounds = this.rounds || 5;
    const opts = [3, 5, 7, 10];
    this.menu = new Menu([
      ...opts.map((n, i) => ({ label: n + ' rounds', x: 140 + i * 260, y: 300, w: 230, h: 100, size: 32, color: '#ff8c42', action: () => { this.rounds = n; this.start(); } })),
    ], { start: 1 });
  }
  back() { setScene(new MainMenu()); }
  start() {
    const avail = Save.data.games.filter((id) => id !== 'boss');
    setScene(new LobbyScene({
      title: 'Party Mode', sub: 'Up to 4 players. Empty seats are filled by CPU birds.',
      back: () => setScene(new PartySetup()),
      done: (entries) => { const party = new Party(entries, this.rounds, avail); party.next(); },
    }));
  }
  draw(c) {
    drawBackground(c, 'menu');
    drawTitle(c, 'Party Mode', 'Random minigames. Win rounds to earn points. Most points wins the party!');
    this.menu.draw(c);
    panel(c, 140, 450, 1000, 150);
    drawText(c, 'Minigames in the mix (' + Save.data.games.filter((id) => id !== 'boss').length + '):', 170, 495, 24, '#ffd23f');
    const names = Save.data.games.filter((id) => id !== 'boss').map((id) => GAMES[id].name).join(' • ');
    wrapText(c, names, 940, 22).forEach((l, k) => drawText(c, l, 170, 530 + k * 28, 22, '#fff', 'left', false));
    drawText(c, 'Unlock more minigames in Adventure!', 170, 590, 18, '#9be7ff', 'left', false);
    drawHints(c, [['A', 'Choose'], ['B', 'Back']]);
  }
}

class Party {
  constructor(entries, rounds, games) {
    this.entries = entries;
    this.players = buildPlayers(entries);
    this.rounds = rounds; this.round = 0;
    this.points = this.players.map(() => 0);
    this.games = games;
    this.bag = [];
  }
  drawGame() {
    if (!this.bag.length) this.bag = shuffle(this.games.slice());
    return this.bag.pop();
  }
  next() {
    if (this.round >= this.rounds) { setScene(new PodiumScene(this)); return; }
    this.round++;
    const gid = this.drawGame();
    setScene(new RouletteScene(this, gid));
  }
  play(gid) {
    setScene(new PlayScene(gid, this.players, { theme: GAMES[gid].theme }, {
      quit: () => setScene(new MainMenu()),
      end: (res) => {
        const n = this.players.length;
        const pts = res.ranks.map((r) => Math.max(0, n - 1 - r));
        pts.forEach((p, i) => (this.points[i] += p));
        const fruit = res.players.reduce((a, p, i) => a + (p.human ? res.fruit[i] : 0), 0);
        Save.addFruit(fruit); Save.write();
        setScene(new ResultsScene(res, {
          mode: 'party', points: pts, sub: 'Round ' + this.round + ' of ' + this.rounds,
          buttons: [{ label: this.round >= this.rounds ? 'Final Results' : 'Next Round', color: '#3ddc84', action: () => setScene(new StandingsScene(this)) }],
        }));
      },
    }));
  }
}

class RouletteScene {
  constructor(party, gid) {
    this.party = party; this.gid = gid; this.t = 0;
    this.list = party.games.length > 1 ? party.games : [gid];
    this.spin = 2.2; this.shown = 0;
  }
  enter() { Music.play('menu'); }
  update(dt) {
    this.t += dt;
    if (this.t < this.spin) {
      const speed = lerp(18, 3, this.t / this.spin);
      const prev = Math.floor(this.shown);
      this.shown += speed * dt;
      if (Math.floor(this.shown) !== prev) Sound.sfx('move');
    } else if (!this.landed) { this.landed = true; Sound.sfx('fanfare'); }
    if (this.t > this.spin + 1.2 || (this.landed && Input.anyPressed('a') >= 0)) { if (!this.went) { this.went = true; this.party.play(this.gid); } }
  }
  onTap() { if (this.landed && !this.went) { this.went = true; this.party.play(this.gid); } }
  draw(c) {
    drawBackground(c, 'menu');
    drawTitle(c, 'Round ' + this.party.round + ' of ' + this.party.rounds, 'Next minigame...');
    const id = this.landed ? this.gid : this.list[Math.floor(this.shown) % this.list.length];
    const g = GAMES[id];
    const s = this.landed ? 1 + Math.sin(G.t * 8) * 0.03 : 1;
    c.save(); c.translate(W / 2, 360); c.scale(s, s);
    panel(c, -330, -150, 660, 300, 'rgba(30,14,70,0.95)', this.landed ? '#fff6b0' : '#ffd23f');
    drawText(c, g.name, 0, -40, 64, '#ffd23f', 'center');
    wrapText(c, g.desc, 600, 22).slice(0, 3).forEach((l, k) => drawText(c, l, 0, 20 + k * 30, 22, '#fff', 'center', false));
    c.restore();
    this.party.players.forEach((p, i) => playerCard(c, p, 60 + i * 300, 580, 280, 70, this.party.points[i] + ' pts'));
  }
}

class StandingsScene {
  constructor(party) { this.party = party; this.t = 0; }
  enter() { Music.play('results'); }
  update(dt) { this.t += dt; if (this.t > 0.5 && (Input.anyPressed('a') >= 0)) this.party.next(); }
  onTap() { if (this.t > 0.5) this.party.next(); }
  draw(c) {
    drawBackground(c, 'menu');
    drawTitle(c, 'Party Standings', 'After round ' + this.party.round + ' of ' + this.party.rounds);
    const max = Math.max(1, ...this.party.points);
    this.party.players.forEach((p, i) => {
      const x = 200 + i * 240, h = 360 * (this.party.points[i] / max) * clamp(this.t * 2, 0, 1);
      c.fillStyle = p.color; rrect(c, x - 60, 600 - h, 120, h + 4, 12); c.fill();
      drawBird(c, x, 560 - h, 1.3, p.char, { hat: p.hat, flap: 0.5 + Math.sin(G.t * 10 + i) * 0.3 });
      drawText(c, String(this.party.points[i]), x, 640, 34, '#fff', 'center');
      drawText(c, playerLabel(p), x, 676, 22, p.color, 'center');
    });
    drawHints(c, [['A', 'Continue']]);
  }
}

class PodiumScene {
  constructor(party) {
    this.party = party; this.t = 0; this.fx = new Particles();
    const order = party.players.map((p, i) => i).sort((a, b) => party.points[b] - party.points[a]);
    this.order = order;
    this.winner = party.players[order[0]];
  }
  enter() {
    Music.play('carnival'); Sound.sfx('fanfare');
    if (this.winner.human) { Save.data.stats.partyWins++; Save.addFruit(50); Save.write(); toast('Party champion bonus: +50 fruit!'); }
  }
  update(dt) {
    this.t += dt; this.fx.update(dt);
    if (Math.random() < dt * 4) this.fx.confetti(rand(200, W - 200), 120, 16);
    if (this.t > 1.5 && Input.anyPressed('a') >= 0) setScene(new MainMenu());
  }
  onTap() { if (this.t > 1.5) setScene(new MainMenu()); }
  draw(c) {
    drawBackground(c, 'carnival');
    drawText(c, playerLabel(this.winner) + ' ' + CHARS[this.winner.char].name + ' wins the party!', W / 2, 100, 50, '#ffd23f', 'center');
    const pos = [[640, 330, 230], [400, 400, 160], [880, 440, 120], [1100, 480, 80]];
    this.order.forEach((pi, k) => {
      const p = this.party.players[pi], [x, top] = pos[k];
      c.fillStyle = ['#ffd23f', '#c0c0d0', '#d08a4a', '#6a5a8a'][k]; c.fillRect(x - 90, top, 180, H - top);
      drawText(c, String(k + 1), x, top + 70, 60, '#fff', 'center');
      drawText(c, this.party.points[pi] + ' pts', x, top + 115, 26, '#fff', 'center');
      const hop = k === 0 ? Math.abs(Math.sin(G.t * 6)) * 30 : 0;
      drawBird(c, x, top - 60 - hop, k === 0 ? 1.9 : 1.4, p.char, { hat: p.hat, flap: k === 0 ? 0.5 + Math.sin(G.t * 16) * 0.5 : 0.3 });
      drawText(c, playerLabel(p), x, top - 130 - hop, 22, p.color, 'center');
    });
    this.fx.draw(c);
    if (this.t > 1.5) drawText(c, 'Press A to continue', W / 2, 700, 24, '#fff', 'center');
  }
}

// ---------- free play ----------
class FreePlayScene extends MenuScene {
  constructor(start) { super(); this.start = start || 0; }
  enter() {
    Music.play('menu');
    this.menu = new Menu(GAME_ORDER.map((id, i) => ({
      x: 70 + (i % 4) * 290, y: 160 + Math.floor(i / 4) * 230, w: 270, h: 210,
      disabled: !Save.data.games.includes(id),
      onDisabled: () => toast('Unlock it in Adventure mode!', '#ff8fa3'),
      action: () => this.pickPlayers(id, i),
      draw: (c, b, f) => this.drawCard(c, b, f, id),
    })), { start: this.start });
  }
  back() { setScene(new MainMenu()); }
  drawCard(c, b, f, id) {
    const g = GAMES[id], locked = b.disabled;
    const s = f ? 1.05 : 1;
    c.save(); c.translate(b.x + b.w / 2, b.y + b.h / 2); c.scale(s, s); c.translate(-b.w / 2, -b.h / 2);
    panel(c, 0, 0, b.w, b.h, locked ? 'rgba(40,30,60,0.9)' : 'rgba(30,14,70,0.92)', f ? '#fff6b0' : '#ffd23f');
    if (locked) { drawText(c, '🔒', b.w / 2, 100, 60, '#fff', 'center', false); drawText(c, '???', b.w / 2, 170, 28, '#888', 'center'); }
    else {
      const icon = { fruit: 'mango', bump: 'coconut', pinata: 'star', rooftop: 'banana', rings: 'grape', river: 'pineapple', samba: 'star', boss: 'berry' }[id];
      drawFruit(c, icon, b.w / 2, 80, 2.2, Math.sin(G.t * 2) * 0.2);
      drawText(c, g.name, b.w / 2, 160, 28, '#fff', 'center');
      drawText(c, g.coop || id === 'boss' ? 'Co-op' : '1-4 players', b.w / 2, 190, 18, '#9be7ff', 'center');
    }
    c.restore();
  }
  pickPlayers(id, idx) {
    const back = () => setScene(new FreePlayScene(idx));
    setScene(new LobbyScene({ title: GAMES[id].name, back, excludeCorvo: id === 'boss', done: (entries) => runFree(id, entries, idx) }));
  }
  draw(c) {
    drawBackground(c, 'menu');
    drawTitle(c, 'Minigames', Save.data.games.length + ' of ' + GAME_ORDER.length + ' unlocked');
    this.menu.draw(c);
    drawHints(c, [['A', 'Play'], ['B', 'Back']]);
  }
}
function runFree(id, entries, idx) {
  const players = buildPlayers(entries);
  setScene(new PlayScene(id, players, { theme: GAMES[id].theme }, {
    quit: () => setScene(new FreePlayScene(idx)),
    end: (res) => {
      const fruit = res.players.reduce((a, p, i) => a + (p.human ? res.fruit[i] : 0), 0);
      Save.addFruit(fruit); Save.write();
      setScene(new ResultsScene(res, {
        mode: 'free', sub: id === 'boss' ? (res.won ? 'Don Corvo was defeated!' : 'Don Corvo escaped!') : 'Free play',
        buttons: [
          { label: 'Retry', action: () => runFree(id, entries, idx) },
          { label: 'Minigames', color: '#3ddc84', action: () => setScene(new FreePlayScene(idx)) },
        ],
      }));
    },
  }));
}

// ---------- wardrobe shop ----------
class ShopScene extends MenuScene {
  enter() {
    Music.play('menu');
    this.ci = Math.max(0, Save.data.chars.indexOf(Save.data.lastChar));
    const items = HATS.map((h, i) => ({
      x: 560 + (i % 4) * 172, y: 150 + Math.floor(i / 4) * 150, w: 160, h: 136,
      action: () => this.choose(h), draw: (c, b, f) => this.drawHatCard(c, b, f, h),
    }));
    items.push({ label: '◀ Bird', x: 60, y: 580, w: 200, h: 70, color: '#7a5cff', action: () => this.cycle(-1) });
    items.push({ label: 'Bird ▶', x: 280, y: 580, w: 200, h: 70, color: '#7a5cff', action: () => this.cycle(1) });
    this.menu = new Menu(items);
  }
  get char() { return Save.data.chars[this.ci]; }
  cycle(d) { this.ci = (this.ci + d + Save.data.chars.length) % Save.data.chars.length; }
  back() { Save.write(); setScene(new MainMenu()); }
  choose(h) {
    const d = Save.data;
    if (d.hatsOwned.includes(h.id)) { d.hats[this.char] = h.id; Save.write(); return; }
    if (d.fruit >= h.price) {
      d.fruit -= h.price; d.hatsOwned.push(h.id); d.hats[this.char] = h.id; Save.write();
      Sound.sfx('unlock'); toast('Bought ' + h.name + '!');
    } else { Sound.sfx('deny'); toast('Not enough fruit! Need ' + (h.price - d.fruit) + ' more.', '#ff8fa3'); }
  }
  update(dt) {
    super.update(dt);
    if (Input.anyPressed('l') >= 0) { this.cycle(-1); Sound.sfx('move'); }
    if (Input.anyPressed('r') >= 0) { this.cycle(1); Sound.sfx('move'); }
  }
  drawHatCard(c, b, f, h) {
    const d = Save.data, owned = d.hatsOwned.includes(h.id), worn = (d.hats[this.char] || 'none') === h.id;
    panel(c, b.x, b.y, b.w, b.h, worn ? 'rgba(40,90,60,0.92)' : 'rgba(30,14,70,0.92)', f ? '#fff6b0' : worn ? '#3ddc84' : '#ffd23f', 16);
    c.save(); c.translate(b.x + b.w / 2, b.y + 70); c.scale(1.7, 1.7);
    if (h.id === 'none') drawText(c, '✖', 0, 10, 26, '#aaa', 'center', false); else drawHat(c, h.id, 0, 0);
    c.restore();
    drawText(c, h.name, b.x + b.w / 2, b.y + 106, 16, '#fff', 'center');
    if (owned) drawText(c, worn ? 'WEARING' : 'OWNED', b.x + b.w / 2, b.y + 128, 16, worn ? '#3ddc84' : '#9be7ff', 'center');
    else { drawFruit(c, 'mango', b.x + b.w / 2 - 30, b.y + 122, 0.6); drawText(c, String(h.price), b.x + b.w / 2 - 14, b.y + 129, 18, d.fruit >= h.price ? '#ffd23f' : '#ff8fa3'); }
  }
  draw(c) {
    drawBackground(c, 'menu');
    drawTitle(c, 'Wardrobe', 'Spend fruit on hats. Each bird remembers its own look!');
    drawFruitCounter(c, W - 220, 24);
    panel(c, 50, 150, 460, 410);
    const id = this.char;
    drawBird(c, 280, 360, 4, id, { hat: Save.data.hats[id] || 'none', flap: 0.4 + Math.sin(G.t * 3) * 0.2 });
    drawText(c, CHARS[id].name, 280, 200, 40, '#ffd23f', 'center');
    this.menu.draw(c);
    drawHints(c, [['A', 'Buy / Wear'], ['L/R', 'Change bird'], ['B', 'Back']]);
  }
}

// ---------- options ----------
class OptionsScene extends MenuScene {
  constructor(from) { super(); this.from = from; this.confirmReset = false; }
  enter() { this.build(); }
  build() {
    const o = Save.data.opts;
    const pct = (v) => Math.round(v * 100) + '%';
    const rows = [
      { label: 'Music: ' + pct(o.music), key: 'music', step: 0.1 },
      { label: 'Sound FX: ' + pct(o.sfx), key: 'sfx', step: 0.1 },
      { label: 'Vibration: ' + (o.vibrate ? 'On' : 'Off'), key: 'vibrate' },
      { label: 'Touch buttons: ' + pct(o.touchAlpha), key: 'touchAlpha', step: 0.15 },
      { label: 'CPU skill: ' + ['Easy', 'Normal', 'Hard'][o.difficulty], key: 'difficulty' },
      { label: this.confirmReset ? 'Press again to ERASE save' : 'Reset save data', key: 'reset', color: '#c0392b' },
    ];
    const start = this.menu ? this.menu.i : 0;
    this.menu = new Menu(rows.map((r, i) => Object.assign({ x: 290, y: 150 + i * 82, w: 700, h: 68, size: 28, color: r.color || '#4d7cff', action: () => this.change(r.key, 1) }, r)), { start });
  }
  change(key, dir) {
    const o = Save.data.opts;
    if (key === 'reset') {
      if (this.confirmReset) { Save.reset(); Sound.applyVolumes(); toast('Save data erased', '#ff8fa3'); this.confirmReset = false; }
      else this.confirmReset = true;
      this.build(); return;
    }
    this.confirmReset = false;
    if (key === 'vibrate') o.vibrate = !o.vibrate;
    else if (key === 'difficulty') o.difficulty = (o.difficulty + dir + 3) % 3;
    else {
      const step = key === 'touchAlpha' ? 0.15 : 0.1;
      let v = Math.round((o[key] + step * dir) * 100) / 100;
      if (v > 1.001) v = key === 'touchAlpha' ? 0.1 : 0; if (v < -0.001) v = 1;
      o[key] = clamp(v, key === 'touchAlpha' ? 0.1 : 0, 1);
    }
    Sound.applyVolumes(); Save.write(); this.build();
  }
  update(dt) {
    const d = Input.menuDir(dt);
    if (d === 'up' || d === 'down') this.menu.move(d);
    else if (d === 'left' || d === 'right') { this.change(this.menu.cur.key, d === 'left' ? -1 : 1); Sound.sfx('move'); }
    if (Input.anyPressed('a') >= 0) this.menu.activate(this.menu.cur);
    if (Input.anyPressed('b') >= 0) { Sound.sfx('back'); this.back(); }
  }
  back() { Save.write(); setScene(new MainMenu()); }
  draw(c) {
    drawBackground(c, 'menu');
    drawTitle(c, 'Options');
    this.menu.draw(c);
    drawHints(c, [['A', 'Change'], ['L/R', 'Adjust'], ['B', 'Back']]);
  }
}

// ---------- controllers ----------
class ControllerScene extends MenuScene {
  enter() { Music.play('menu'); }
  back() { setScene(new MainMenu()); }
  update(dt) { if (Input.anyPressed('b') >= 0 && Input.anyPressed('a') < 0) { Sound.sfx('back'); this.back(); } }
  onTap(x, y) { if (backHit(x, y) || y > 640) this.back(); }
  draw(c) {
    drawBackground(c, 'menu');
    drawTitle(c, 'Controllers', 'Pair Bluetooth or USB gamepads in Android settings. Each controller is one player.');
    for (let i = 0; i < 4; i++) {
      const x = 40 + i * 305, y = 150;
      const on = Input.isConnected(i), s = Input.cur[i];
      panel(c, x, y, 285, 330, 'rgba(30,14,70,0.88)', on ? PCOLORS[i] : '#5b5470');
      drawText(c, 'Player ' + (i + 1), x + 142, y + 44, 30, PCOLORS[i], 'center');
      drawText(c, i === 0 ? (Input.hasPad(0) ? 'Controller + touch' : 'Touch / keyboard') : on ? 'Controller' : 'Not connected', x + 142, y + 76, 20, on ? '#fff' : '#888', 'center');
      // stick
      c.strokeStyle = '#aaa'; c.lineWidth = 3; c.beginPath(); c.arc(x + 80, y + 170, 46, 0, 7); c.stroke();
      c.fillStyle = on ? PCOLORS[i] : '#555'; c.beginPath(); c.arc(x + 80 + s.ax * 40, y + 170 + s.ay * 40, 18, 0, 7); c.fill();
      // face buttons
      const fb = [['y', 0, -36, '#ffc93c'], ['x', -36, 0, '#4d9bff'], ['b', 36, 0, '#ff4d6d'], ['a', 0, 36, '#3ddc84']];
      for (const [b, dx, dy, col] of fb) {
        c.fillStyle = s[b] ? col : 'rgba(255,255,255,0.15)'; c.beginPath(); c.arc(x + 210 + dx, y + 170 + dy, 18, 0, 7); c.fill();
        drawText(c, b.toUpperCase(), x + 210 + dx, y + 177 + dy, 18, '#fff', 'center', false);
      }
      const extra = ['l', 'r', 'start', 'select'].filter((b) => s[b]).map((b) => b.toUpperCase()).join(' ');
      drawText(c, extra, x + 142, y + 270, 22, '#ffd23f', 'center');
    }
    panel(c, 40, 500, 1200, 140);
    const lines = [
      'A = Jump / Confirm      B = Back      X / Y = extra notes in Samba Beat      START = Pause',
      'Left Stick or D-Pad = Move.  In menus, any controller can navigate.  Players join in the lobby with A.',
      'Keyboard: Arrows/WASD move, Space/J = A, Backspace/K = B, Esc/P = Pause.',
    ];
    lines.forEach((l, k) => drawText(c, l, 640, 545 + k * 36, 21, '#fff', 'center', false));
    drawText(c, Input.lastSource === 'touch' ? 'Tap here to go back' : 'Press B to go back', 640, 690, 22, '#ffd23f', 'center');
  }
}
