'use strict';
// 3D birds: toon-shaded models with outlines, rendered to cached sprites and drawn
// through drawBird(), so every scene and minigame shows them without other changes.

const Bird3D = (() => {
  const T = window.THREE;
  const api = { ok: false, draw: () => false, warm: () => {}, frame: () => {} };
  if (!T) return api;

  const U = 24;                       // 2D local units per model unit
  const FX = -80, FY = -90, FS = 160; // sprite frame in drawBird local units
  const MAXSZ = 512;
  let r = null, cv = null, scene = null, cam = null, budget = 0;
  const models = {};
  const cache = new Map();

  const grad = (() => {
    const d = new Uint8Array([105, 105, 105, 255, 190, 190, 190, 255, 255, 255, 255, 255]);
    const t = new T.DataTexture(d, 3, 1, T.RGBAFormat);
    t.minFilter = t.magFilter = T.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
    return t;
  })();
  const mats = {};
  const toon = (col) => mats['t' + col] || (mats['t' + col] = new T.MeshToonMaterial({ color: col, gradientMap: grad }));
  const flat = (col) => mats['b' + col] || (mats['b' + col] = new T.MeshBasicMaterial({ color: col }));
  const lineMat = (col) => mats['o' + col] || (mats['o' + col] = new T.MeshBasicMaterial({ color: shade(col, -0.65), side: T.BackSide }));
  const GEO = {
    sphere: new T.SphereGeometry(1, 20, 14),
    cone: new T.ConeGeometry(1, 1, 16),
    cyl: new T.CylinderGeometry(1, 1, 1, 14),
    box: new T.BoxGeometry(1, 1, 1),
    half: new T.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    torus: new T.TorusGeometry(1, 0.18, 8, 24, Math.PI),
    ring: new T.TorusGeometry(1, 0.12, 8, 24),
  };
  // A toon part with an inverted-hull outline.
  function part(parent, geo, col, pos, scl, rot, outline = 0.045) {
    const m = new T.Mesh(geo, toon(col));
    m.position.set(...pos); m.scale.set(...scl);
    if (rot) m.rotation.set(...rot);
    parent.add(m);
    if (outline) {
      const o = new T.Mesh(geo, lineMat(col));
      o.position.copy(m.position); o.rotation.copy(m.rotation);
      o.scale.set(scl[0] + outline, scl[1] + outline, scl[2] + outline);
      parent.add(o);
      m.userData.outline = o;
    }
    return m;
  }
  const show = (m, v) => { m.visible = v; if (m.userData.outline) m.userData.outline.visible = v; };

  // ---------- hats (head-local units, head radius 0.7) ----------
  const stripeTex = {};
  function stripes(a, b) {
    const k = a + b;
    if (!stripeTex[k]) {
      const c = document.createElement('canvas'); c.width = 64; c.height = 8;
      const x = c.getContext('2d');
      for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? b : a; x.fillRect(i * 8, 0, 8, 8); }
      stripeTex[k] = new T.CanvasTexture(c);
    }
    return stripeTex[k];
  }
  function buildHat(id) {
    const g = new T.Group();
    switch (id) {
      case 'party': {
        const cone = new T.Mesh(GEO.cone, new T.MeshToonMaterial({ color: '#ffffff', map: stripes('#ff5d8f', '#ffd23f'), gradientMap: grad }));
        cone.scale.set(0.32, 0.8, 0.32); cone.position.y = 0.4; g.add(cone);
        const o = new T.Mesh(GEO.cone, lineMat('#ff5d8f')); o.scale.set(0.36, 0.86, 0.36); o.position.y = 0.4; g.add(o);
        part(g, GEO.sphere, '#3bceac', [0, 0.84, 0], [0.12, 0.12, 0.12]);
        g.rotation.z = -0.25;
        break;
      }
      case 'bow':
        part(g, GEO.cone, '#ff5d8f', [-0.2, 0.05, 0], [0.18, 0.36, 0.1], [0, 0, Math.PI / 2]);
        part(g, GEO.cone, '#ff5d8f', [0.2, 0.05, 0], [0.18, 0.36, 0.1], [0, 0, -Math.PI / 2]);
        part(g, GEO.sphere, '#ff9ebd', [0, 0.05, 0], [0.1, 0.1, 0.1]);
        g.rotation.y = Math.PI / 2; g.position.x = -0.15;
        break;
      case 'flowers':
        for (let i = 0; i < 7; i++) {
          const a = i / 7 * Math.PI * 2;
          part(g, GEO.sphere, ['#ff5d8f', '#ffd23f', '#ff8c42', '#b967ff'][i % 4], [Math.cos(a) * 0.48, -0.05, Math.sin(a) * 0.48], [0.13, 0.09, 0.13]);
          part(g, GEO.sphere, '#fff6b0', [Math.cos(a) * 0.48, 0.03, Math.sin(a) * 0.48], [0.05, 0.04, 0.05], null, 0);
        }
        break;
      case 'straw':
        part(g, GEO.cyl, '#e8c66a', [0, 0, 0], [0.95, 0.05, 0.95]);
        part(g, GEO.cyl, '#d9b04f', [0, 0.2, 0], [0.45, 0.38, 0.45]);
        part(g, GEO.cyl, '#e8322f', [0, 0.1, 0], [0.47, 0.1, 0.47], null, 0);
        break;
      case 'tophat':
        part(g, GEO.cyl, '#1b1b25', [0, 0, 0], [0.7, 0.05, 0.7]);
        part(g, GEO.cyl, '#1b1b25', [0, 0.38, 0], [0.42, 0.75, 0.42]);
        part(g, GEO.cyl, '#b967ff', [0, 0.1, 0], [0.43, 0.12, 0.43], null, 0);
        break;
      case 'feathers':
        ['#ff3b6b', '#ffd23f', '#3bceac', '#4d7cff', '#b967ff'].forEach((col, i) => {
          part(g, GEO.sphere, col, [0, 0.55, 0], [0.11, 0.55, 0.06], [0, 0, (i - 2) * 0.35]).position.set(-(i - 2) * 0.17, 0.5 - Math.abs(i - 2) * 0.06, 0);
        });
        part(g, GEO.cyl, '#ffd23f', [0, 0.02, 0], [0.62, 0.12, 0.62]);
        part(g, GEO.sphere, '#ff3b6b', [0.6, 0.05, 0], [0.1, 0.1, 0.1]);
        g.rotation.y = Math.PI / 2;
        break;
      case 'crown':
        part(g, GEO.cyl, '#ffd23f', [0, 0.1, 0], [0.48, 0.24, 0.48]);
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; part(g, GEO.cone, '#ffd23f', [Math.cos(a) * 0.42, 0.33, Math.sin(a) * 0.42], [0.1, 0.24, 0.1]); }
        part(g, GEO.sphere, '#e8322f', [0.48, 0.12, 0], [0.08, 0.08, 0.06]);
        break;
      case 'headphones': {
        const band = part(g, GEO.torus, '#2b2b36', [0, -0.05, 0], [0.72, 0.72, 0.72], [0, Math.PI / 2, 0], 0.03);
        band.rotation.set(0, Math.PI / 2, 0);
        part(g, GEO.cyl, '#ff5d8f', [0, -0.5, 0.68], [0.22, 0.12, 0.22], [Math.PI / 2, 0, 0]);
        part(g, GEO.cyl, '#ff5d8f', [0, -0.5, -0.68], [0.22, 0.12, 0.22], [Math.PI / 2, 0, 0]);
        break;
      }
      case 'captain':
        part(g, GEO.sphere, '#2a1d10', [0, 0.1, 0], [0.85, 0.3, 0.6]);
        part(g, GEO.sphere, '#2a1d10', [0, 0.28, 0], [0.45, 0.25, 0.42]);
        part(g, GEO.sphere, '#ffffff', [0.35, 0.28, 0.25], [0.1, 0.1, 0.06], null, 0);
        break;
      case 'sombrero':
        part(g, GEO.cyl, '#e07a2a', [0, 0, 0], [1.2, 0.05, 1.2]);
        part(g, GEO.cone, '#c45e18', [0, 0.32, 0], [0.45, 0.62, 0.45]);
        part(g, GEO.cyl, '#3bceac', [0, 0.1, 0], [0.42, 0.08, 0.42], null, 0);
        break;
    }
    return g;
  }

  // ---------- bird model ----------
  function buildBird(ch) {
    const sp = ch.species;
    const root = new T.Group();
    const bird = new T.Group();
    root.add(bird);
    bird.rotation.set(0.16, -0.5, 0);
    const parts = { hats: {} };

    // legs
    const legCol = ch.legs || '#e8a24a';
    const legLen = sp === 'spoonbill' ? 1.25 : 0.55;
    parts.legs = [-1, 1].map((side) => {
      const lg = new T.Group(); lg.position.set(0.05, -0.62, side * 0.28);
      part(lg, GEO.cyl, legCol, [0, -legLen / 2, 0], [0.07, legLen, 0.07], null, 0.03);
      for (let k = -1; k <= 1; k++) part(lg, GEO.box, legCol, [0.13, -legLen, k * 0.08], [0.28, 0.06, 0.06], [0, k * 0.4, 0], 0.03);
      bird.add(lg); return lg;
    });
    // tail
    const tails = ch.tail || [ch.wing];
    const tlen = sp === 'parrot' ? 1.25 : sp === 'hummingbird' ? 0.55 : sp === 'crow' ? 0.85 : 0.75;
    const tail = new T.Group(); tail.position.set(-0.8, -0.05, 0); tail.rotation.z = 0.38; bird.add(tail);
    tails.forEach((col, i) => {
      for (let k = -1; k <= 1; k++) {
        const len = tlen - Math.abs(k) * 0.15 - i * 0.12;
        part(tail, GEO.sphere, col, [-len * 0.8, -i * 0.05, k * 0.17], [len, 0.07, 0.15], [0, k * 0.25, 0], 0.035);
      }
    });
    // body + belly
    part(bird, GEO.sphere, ch.body, [0, 0, 0], [1.08, 0.95, 0.88]);
    part(bird, GEO.sphere, ch.belly, [0.42, -0.2, 0.18], [0.66, 0.66, 0.66], null, 0);
    // wings (near +z, far -z)
    parts.wings = [1, -1].map((side) => {
      const pv = new T.Group(); pv.position.set(-0.05, 0.28, side * 0.74);
      const wingCol = ch.wing, tip = ch.wingTip || shade(ch.wing, -0.25);
      for (let k = 0; k < 3; k++) part(pv, GEO.sphere, tip, [-1.0 - k * 0.12, -0.12 - k * 0.1, 0], [0.42, 0.14, 0.09], [0, 0, 0.25 + k * 0.15], 0.035);
      part(pv, GEO.sphere, wingCol, [-0.48, -0.06, 0], [0.75, 0.32, 0.12], [0, 0, 0.18]);
      if (sp === 'hummingbird') pv.children.forEach((m) => { if (m.material.isMeshToonMaterial) { m.material = m.material.clone(); m.material.transparent = true; m.material.opacity = 0.8; } });
      bird.add(pv); pv.userData.side = side; return pv;
    });
    // head
    const head = new T.Group();
    const headCol = ch.head || ch.body;
    part(head, GEO.sphere, headCol, [0, 0, 0], [0.72, 0.7, 0.7]);
    // crest / tuft
    const crestCol = ch.crest || headCol;
    const nCrest = ch.crest ? 4 : sp === 'crow' ? 3 : 2;
    for (let i = 0; i < nCrest; i++) part(head, GEO.sphere, crestCol, [-0.25 - i * 0.12, 0.62 - i * 0.04, 0], [0.09, ch.crest ? 0.32 : 0.2, 0.07], [0, 0, 0.5 + i * 0.35], 0.03);
    if (ch.cheek) part(head, GEO.sphere, ch.cheek, [0.36, -0.18, 0.42], [0.26, 0.2, 0.1], [0, 0.6, 0], 0);
    part(head, GEO.sphere, '#ff8fab', [0.48, -0.2, 0.42], [0.11, 0.06, 0.05], [0, 0.7, 0], 0);
    // beak
    const bk = ch.beak;
    switch (sp) {
      case 'toucan':
        part(head, GEO.sphere, '#ffc93c', [1.05, -0.05, 0], [0.75, 0.27, 0.23]);
        part(head, GEO.sphere, '#ff7a1a', [1.42, -0.06, 0], [0.38, 0.2, 0.18], null, 0);
        part(head, GEO.sphere, '#e0341f', [1.72, -0.08, 0], [0.13, 0.1, 0.1], null, 0);
        part(head, GEO.box, '#3a2010', [1.15, -0.08, 0.02], [1.1, 0.02, 0.4], null, 0);
        break;
      case 'hummingbird':
        part(head, GEO.cone, bk, [1.15, -0.04, 0], [0.06, 1.0, 0.06], [0, 0, -Math.PI / 2], 0.02);
        break;
      case 'spoonbill':
        part(head, GEO.cyl, bk, [1.05, -0.05, 0], [0.08, 0.85, 0.08], [0, 0, Math.PI / 2], 0.025);
        part(head, GEO.sphere, bk, [1.5, -0.06, 0], [0.18, 0.07, 0.16]);
        break;
      case 'crow':
        part(head, GEO.cone, bk, [0.88, -0.08, 0], [0.17, 0.62, 0.15], [0, 0, -Math.PI / 2 - 0.12]);
        break;
      default:
        part(head, GEO.sphere, bk, [0.68, -0.02, 0], [0.24, 0.26, 0.2]);
        part(head, GEO.cone, bk, [0.86, -0.18, 0], [0.16, 0.48, 0.15], [0, 0, -Math.PI / 2 - 0.85]);
        part(head, GEO.sphere, shade(bk, -0.55), [0.66, -0.24, 0], [0.16, 0.12, 0.14], null, 0);
    }
    // eyes
    parts.eyes = [1, -1].map((side) => {
      const dir = new T.Vector3(0.5, 0.22, side * 0.72).normalize();
      const eg = new T.Group();
      eg.position.copy(dir.clone().multiplyScalar(0.58));
      head.add(eg);
      eg.lookAt(dir.clone().multiplyScalar(3));
      if (ch.eyeRing) part(eg, GEO.sphere, ch.eyeRing, [0, 0, -0.02], [0.4, 0.46, 0.09], null, 0);
      const e = {};
      e.white = part(eg, GEO.sphere, '#ffffff', [0, 0, 0], [0.29, 0.36, 0.13], null, 0.035);
      e.iris = part(eg, GEO.sphere, ch.iris || '#6b4a2a', [0.05 * side, -0.02, 0.095], [0.19, 0.21, 0.06], null, 0);
      e.pupil = part(eg, GEO.sphere, '#120a18', [0.055 * side, -0.02, 0.135], [0.105, 0.12, 0.035], null, 0);
      e.hl = new T.Mesh(GEO.sphere, flat('#ffffff')); e.hl.position.set(0.1 * side, 0.08, 0.165); e.hl.scale.set(0.05, 0.055, 0.02); eg.add(e.hl);
      e.lid = part(eg, GEO.half, headCol, [0, 0, 0.005], [0.305, 0.375, 0.145], null, 0);
      e.blink = part(eg, GEO.sphere, headCol, [0, 0, 0.005], [0.305, 0.375, 0.145], null, 0);
      e.ko = new T.Group(); eg.add(e.ko);
      part(e.ko, GEO.box, '#1a1020', [0, 0, 0.13], [0.4, 0.05, 0.02], [0, 0, 0.7], 0);
      part(e.ko, GEO.box, '#1a1020', [0, 0, 0.13], [0.4, 0.05, 0.02], [0, 0, -0.7], 0);
      e.brow = part(eg, GEO.box, shade(headCol, -0.6), [0, 0.46, 0.06], [0.36, 0.06, 0.05], null, 0);
      e.shades = new T.Group(); eg.add(e.shades);
      part(e.shades, GEO.box, '#111118', [0, 0, 0.17], [0.42, 0.3, 0.04], null, 0.02);
      part(e.shades, GEO.box, '#78c8ff', [-0.08, 0.06, 0.195], [0.12, 0.05, 0.01], null, 0);
      if (side > 0) part(e.shades, GEO.box, '#111118', [-0.28 * side, 0.02, 0.17], [0.22, 0.05, 0.04], null, 0);
      e.side = side;
      return e;
    });
    head.position.set(0.62, 0.8, 0);
    bird.add(head);
    parts.head = head;
    // hats are built lazily and attached at the top of the head
    parts.hatAnchor = new T.Group(); parts.hatAnchor.position.set(-0.04, 0.62, 0); parts.hatAnchor.rotation.z = 0.12; head.add(parts.hatAnchor);
    return { root, parts };
  }

  function pose(m, o) {
    const p = m.parts;
    const flap = o.flapQ / 5;
    p.wings.forEach((w) => { w.rotation.set(-w.userData.side * (0.15 + flap * 1.0), 0, -flap * 1.1); });
    p.legs.forEach((lg, i) => { show(lg, o.legs); lg.visible = o.legs; lg.rotation.z = o.walk * (i ? -0.45 : 0.45); });
    const mood = o.mood;
    p.eyes.forEach((e) => {
      const ko = mood === 'ko';
      e.ko.visible = ko;
      e.iris.visible = e.pupil.visible = e.hl.visible = !ko && !o.blink;
      e.blink.visible = !!o.blink && !ko;
      const angry = mood === 'angry';
      e.lid.visible = angry && !o.blink && !ko;
      if (angry) { e.lid.rotation.set(0, 0, e.side * -0.45); e.lid.position.y = 0.09; }
      e.brow.position.y = angry ? 0.36 : mood === 'happy' ? 0.5 : 0.46;
      e.brow.rotation.z = angry ? e.side * -0.55 : mood === 'happy' ? e.side * 0.25 : e.side * 0.12;
    });
    p.eyes.forEach((e) => { e.shades.visible = o.hat === 'shades'; });
    for (const id in p.hats) p.hats[id].visible = false;
    if (o.hat && o.hat !== 'none' && o.hat !== 'shades') {
      if (!p.hats[o.hat]) { p.hats[o.hat] = buildHat(o.hat); p.hatAnchor.add(p.hats[o.hat]); }
      p.hats[o.hat].visible = true;
    }
  }

  function render(ch, o, sz) {
    if (!models[ch.id]) models[ch.id] = buildBird(ch);
    const m = models[ch.id];
    pose(m, o);
    scene.add(m.root);
    r.setViewport(0, 0, sz, sz);
    r.setScissor(0, 0, sz, sz);
    r.setScissorTest(true);
    r.clear();
    r.render(scene, cam);
    scene.remove(m.root);
    const out = document.createElement('canvas'); out.width = sz; out.height = sz;
    out.getContext('2d').drawImage(cv, 0, MAXSZ - sz, sz, sz, 0, 0, sz, sz);
    return out;
  }

  api.init = () => {
    try {
      cv = document.createElement('canvas'); cv.width = MAXSZ; cv.height = MAXSZ;
      r = new T.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, preserveDrawingBuffer: true, premultipliedAlpha: false });
      r.setPixelRatio(1); r.setSize(MAXSZ, MAXSZ, false); r.setClearColor(0x000000, 0); r.autoClear = false;
      scene = new T.Scene();
      scene.add(new T.HemisphereLight(0xffffff, 0x9a7a6a, 0.6));
      const d = new T.DirectionalLight(0xffffff, 0.65); d.position.set(-2, 4, 5); scene.add(d);
      // orthographic frame matching drawBird's local box (x -80..80, y -90..70, y down)
      cam = new T.OrthographicCamera(FX / U, (FX + FS) / U, -FY / U, -(FY + FS) / U, 0.1, 50);
      cam.position.set(0, 0, 20); cam.lookAt(0, 0, 0);
      api.ok = true;
    } catch (e) { api.ok = false; }
  };
  api.enabled = () => api.ok && Save.data && Save.data.opts.gfx3d !== false;
  api.frame = () => { budget = 6; };
  function key(ch, o, sz) { return ch.id + '|' + (o.hat || 'none') + '|' + o.flapQ + '|' + (o.legs ? o.walk + 2 : 0) + '|' + (o.mood || '') + '|' + (o.blink ? 1 : 0) + '|' + sz; }
  function sprite(ch, o, sz, force) {
    const k = key(ch, o, sz);
    let img = cache.get(k);
    if (img) { cache.delete(k); cache.set(k, img); return img; }
    if (!force && budget <= 0) return null;
    budget--;
    img = render(ch, o, sz);
    cache.set(k, img);
    if (cache.size > 280) cache.delete(cache.keys().next().value);
    return img;
  }
  function params(ch, o, t, flap) {
    const blink = o.mood !== 'ko' && ((t * 0.7) % 4 < 0.12);
    const walk = o.walk ? Math.round(Math.sin(t * 16)) : 0;
    return { hat: o.hat || 'none', flapQ: Math.round(clamp(flap, 0, 1) * 5), legs: o.legs !== false, walk, mood: o.mood || (ch.brow ? 'angry' : null), blink };
  }
  function tier(s) {
    const px = FS * Math.abs(s) * view.s;
    return px <= 150 ? 128 : px <= 300 ? 256 : 512;
  }
  // Returns true when the 3D sprite was drawn.
  api.draw = (c, x, y, s, ch, o, face, flap, t) => {
    if (!ch.id || !api.enabled()) return false;
    const p = params(ch, o, t, flap);
    const img = sprite(ch, p, tier(s), false);
    if (!img) return false;
    c.save();
    c.translate(x, y);
    if (o.rot) c.rotate(o.rot);
    c.scale(s * face, s * (o.squash || 1));
    if (o.alpha != null) c.globalAlpha *= o.alpha;
    c.drawImage(img, FX, FY, FS, FS);
    c.restore();
    return true;
  };
  // Pre-render the common poses for a set of birds (used when a minigame loads).
  api.warm = (list, s = 1.1) => {
    if (!api.enabled()) return;
    const sz = tier(s);
    for (const [id, hat] of list) {
      const ch = CHARS[id]; if (!ch) continue;
      for (let f = 0; f <= 5; f++) sprite(ch, { hat: hat || 'none', flapQ: f, legs: true, walk: 0, mood: ch.brow ? 'angry' : null, blink: false }, sz, true);
    }
  };
  return api;
})();
