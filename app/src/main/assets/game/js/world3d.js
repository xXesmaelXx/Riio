'use strict';
// 3D environments (Three.js) rendered on a canvas underneath the 2D gameplay layer.
// Everything is low-poly and toon shaded to match the cartoon art style.

const World3D = (() => {
  const T = window.THREE;
  const api = { ok: false };
  if (!T) { api.request = () => false; api.render = () => {}; api.init = () => {}; return api; }

  let r = null, cv = null, want = null, wScroll = 0, wOpts = {}, shown = false;
  const envs = {};

  // ---------- shared resources ----------
  const grad = (() => {
    const d = new Uint8Array([120, 120, 120, 255, 200, 200, 200, 255, 255, 255, 255, 255]);
    const t = new T.DataTexture(d, 3, 1, T.RGBAFormat);
    t.minFilter = t.magFilter = T.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
    return t;
  })();
  const mats = {};
  function M(color, extra) {
    if (!extra) {
      if (!mats[color]) mats[color] = new T.MeshToonMaterial({ color, gradientMap: grad });
      return mats[color];
    }
    if (extra.flatShading) return new T.MeshPhongMaterial(Object.assign({ color, shininess: 8, specular: 0x111111 }, extra));
    return new T.MeshToonMaterial(Object.assign({ color, gradientMap: grad }, extra));
  }
  const basic = (color, extra) => new T.MeshBasicMaterial(Object.assign({ color }, extra || {}));
  const G3 = {
    sphere: new T.SphereGeometry(1, 16, 12),
    lowSphere: new T.SphereGeometry(1, 9, 6),
    box: new T.BoxGeometry(1, 1, 1),
    cyl: new T.CylinderGeometry(1, 1, 1, 12),
    cone: new T.ConeGeometry(1, 1, 12),
    tri: new T.ConeGeometry(1, 1, 3),
    dodec: new T.DodecahedronGeometry(1, 0),
  };
  function mesh(geo, mat, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, shadow = true) {
    const m = new T.Mesh(geo, mat);
    m.position.set(x, y, z); m.scale.set(sx, sy, sz);
    if (shadow) { m.castShadow = true; m.receiveShadow = true; }
    return m;
  }
  function canvasTex(w, h, draw, repeat) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c);
    if (repeat) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
    return t;
  }
  const skyTex = (stops) => canvasTex(4, 256, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    stops.forEach(([p, col]) => g.addColorStop(p, col));
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  });
  const stripes = (cols, n = 8) => canvasTex(128, 8, (c, w, h) => {
    for (let i = 0; i < n; i++) { c.fillStyle = cols[i % cols.length]; c.fillRect(i * w / n, 0, w / n + 1, h); }
  });
  const windowTex = (cols, rows, lit) => canvasTex(64, 64, (c, w, h) => {
    c.fillStyle = lit ? '#000' : '#fff'; c.fillRect(0, 0, w, h);
    const cw = w / cols, rh = h / rows;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      c.fillStyle = lit ? (Math.random() < 0.8 ? '#ffd27a' : '#000') : '#2b3a66';
      c.fillRect(i * cw + cw * 0.25, j * rh + rh * 0.22, cw * 0.5, rh * 0.5);
      if (!lit) { c.fillStyle = '#fff'; c.fillRect(i * cw + cw * 0.22, j * rh + rh * 0.72, cw * 0.56, rh * 0.06); }
    }
  });
  const WIN = { a: null, b: null, la: null, lb: null };
  function winTex(tall, lit) {
    const k = (lit ? 'l' : '') + (tall ? 'b' : 'a');
    if (!WIN[k]) WIN[k] = windowTex(tall ? 3 : 2, tall ? 4 : 3, lit);
    return WIN[k];
  }

  // ---------- props ----------
  function palm(s = 1) {
    const g = new T.Group();
    let x = 0, y = 0;
    const trunk = M('#a0703f'), ring = M('#7d5330');
    for (let i = 0; i < 7; i++) {
      const seg = mesh(G3.cyl, i % 2 ? trunk : ring, x, y + 0.32 * s, 0, 0.2 * s * (1 - i * 0.05), 0.66 * s, 0.2 * s * (1 - i * 0.05));
      seg.rotation.z = -0.05 * i;
      g.add(seg);
      x += 0.035 * i * s; y += 0.62 * s;
    }
    const crown = new T.Group(); crown.position.set(x, y, 0); g.add(crown);
    for (let k = 0; k < 8; k++) {
      const pv = new T.Group(); pv.rotation.y = k / 8 * Math.PI * 2;
      const leaf = mesh(G3.sphere, M(k % 2 ? '#34b553' : '#228a3e'), 1.35 * s, -0.3 * s, 0, 1.55 * s, 0.1 * s, 0.4 * s);
      leaf.rotation.z = -0.38 - (k % 3) * 0.08;
      pv.add(leaf); crown.add(pv);
    }
    for (let k = 0; k < 3; k++) crown.add(mesh(G3.sphere, M('#6b4226'), Math.cos(k * 2.1) * 0.22 * s, -0.25 * s, Math.sin(k * 2.1) * 0.22 * s, 0.18 * s, 0.18 * s, 0.18 * s));
    g.userData.crown = crown;
    return g;
  }
  function swayPalms(list, t) { list.forEach((p, i) => { const c = p.userData.crown; c.rotation.z = Math.sin(t * 1.2 + i) * 0.06; c.rotation.x = Math.cos(t * 0.9 + i) * 0.04; }); }

  function umbrella(s, cols) {
    const g = new T.Group();
    g.add(mesh(G3.cyl, M('#f4f1ea'), 0, 1.1 * s, 0, 0.05 * s, 2.2 * s, 0.05 * s));
    const can = new T.Mesh(new T.ConeGeometry(1.6 * s, 0.6 * s, 16, 1, true), M('#ffffff', { map: stripes(cols, 12), side: T.DoubleSide }));
    can.position.y = 2.25 * s; can.castShadow = true; g.add(can);
    g.add(mesh(G3.sphere, M(cols[0]), 0, 2.58 * s, 0, 0.1 * s, 0.1 * s, 0.1 * s));
    return g;
  }
  let ballTex = null;
  function beachBall(rad) {
    if (!ballTex) ballTex = stripes(['#ff4d4d', '#ffffff', '#2f8cff', '#ffffff', '#ffc93c', '#ffffff'], 6);
    return mesh(G3.sphere, M('#ffffff', { map: ballTex }), 0, rad, 0, rad, rad, rad);
  }
  function house(w, h, d, color, lit) {
    const g = new T.Group();
    const tall = h / w > 1.6;
    const mat = lit ? M(color, { map: winTex(tall, false), emissive: '#ffcc66', emissiveMap: winTex(tall, true), emissiveIntensity: 0.9 })
      : M(color, { map: winTex(tall, false) });
    g.add(mesh(G3.box, mat, 0, h / 2, 0, w, h, d));
    g.add(mesh(G3.box, M(lit ? '#3a2350' : '#c0583a'), 0, h + 0.15, 0, w + 0.3, 0.3, d + 0.3));
    return g;
  }
  function cloud(s) {
    const g = new T.Group();
    const m = M('#ffffff');
    [[0, 0, 0, 1.2], [1.2, 0.3, 0, 1.4], [2.5, 0, 0.2, 1.1], [1.1, -0.3, 0.5, 1.1], [-1, -0.2, 0.2, 0.9]].forEach(([x, y, z, r]) => g.add(mesh(G3.sphere, m, x * s, y * s, z * s, r * s, r * 0.85 * s, r * s, false)));
    return g;
  }
  function peak(h, rad, color) {
    const m = new T.Mesh(G3.lowSphere, M(color, { flatShading: true }));
    m.scale.set(rad, h, rad * 0.8); m.receiveShadow = true;
    return m;
  }
  function tree(s, col) {
    const g = new T.Group();
    g.add(mesh(G3.cyl, M('#7a4a2a'), 0, 1.2 * s, 0, 0.22 * s, 2.4 * s, 0.22 * s));
    const c = M(col || '#2f9e44');
    [[0, 3, 0, 1.3], [0.8, 2.6, 0.3, 1], [-0.8, 2.6, -0.2, 1], [0, 3.8, 0, 0.9]].forEach(([x, y, z, r]) => g.add(mesh(G3.sphere, c, x * s, y * s, z * s, r * s, r * s, r * s)));
    return g;
  }
  function stringOf(x0, x1, y, z, sag, n, colors, size, kind) {
    const g = new T.Group();
    const pts = [];
    for (let i = 0; i <= 24; i++) { const k = i / 24; pts.push(new T.Vector3(lerp(x0, x1, k), y - sag * 4 * k * (1 - k), z)); }
    g.add(new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: kind === 'lights' ? 0x2a1c3a : 0x5a4630 })));
    for (let i = 0; i < n; i++) {
      const k = (i + 0.5) / n, x = lerp(x0, x1, k), yy = y - sag * 4 * k * (1 - k);
      if (kind === 'lights') g.add(mesh(G3.sphere, basic(colors[i % colors.length]), x, yy - size, z, size, size, size, false));
      else { const f = mesh(G3.tri, M(colors[i % colors.length]), x, yy - size * 0.8, z, size, size * 1.6, size * 0.15, false); f.rotation.x = Math.PI; g.add(f); }
    }
    return g;
  }
  function makeSea(w, d, sx, sz, color, amp, freq) {
    const geo = new T.PlaneGeometry(w, d, sx, sz);
    geo.rotateX(-Math.PI / 2);
    const m = new T.Mesh(geo, M(color, { flatShading: true }));
    m.receiveShadow = true;
    const pos = geo.attributes.position;
    const base = Float32Array.from(pos.array);
    m.userData.wave = (t) => {
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3], z = base[i * 3 + 2];
        pos.array[i * 3 + 1] = amp * (Math.sin(x * freq + t * 1.6) + Math.cos(z * freq * 1.3 + t * 1.2));
      }
      pos.needsUpdate = true; geo.computeVertexNormals();
    };
    return m;
  }
  function lights(scene, o) {
    scene.add(new T.HemisphereLight(o.sky || 0xbfe6ff, o.ground || 0xf0d9a0, o.hemi != null ? o.hemi : 0.55));
    const d = new T.DirectionalLight(o.sun || 0xfff1d0, o.sunI != null ? o.sunI : 0.62);
    d.position.set(...(o.dir || [-30, 50, 30]));
    d.castShadow = true;
    d.shadow.mapSize.set(1024, 1024);
    const b = o.box || 30;
    Object.assign(d.shadow.camera, { left: -b, right: b, top: b, bottom: -b, near: 0.5, far: o.far || 200 });
    d.shadow.bias = -0.0015;
    if (o.target) { d.target.position.set(...o.target); scene.add(d.target); }
    scene.add(d);
    return d;
  }
  function persp(fov, pos, look) {
    const c = new T.PerspectiveCamera(fov, W / H, 0.1, 1200);
    c.position.set(...pos); c.lookAt(...look);
    c.userData.base = { pos: pos.slice(), look: look.slice() };
    return c;
  }
  // Orthographic tilted camera in "screen pixel" units: ground point (x,0,z) appears at
  // screen x = 640 + x, y = 360 + (z - Tz) * sinT, so 2D gameplay lines up with the 3D floor.
  function ortho(sinT, originY) {
    const c = new T.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, 1, 9000);
    const th = Math.asin(sinT), Tz = (360 - originY) / sinT;
    c.position.set(0, Math.sin(th) * 4000, Tz + Math.cos(th) * 4000);
    c.lookAt(0, 0, Tz);
    c.userData.ground = (sx, sy) => ({ x: sx - 640, z: Tz + (sy - 360) / sinT });
    return c;
  }
  const wrap = (v, span) => ((v % span) + span) % span - span / 2;

  // ---------- environments ----------
  const builders = {};

  builders.beach = () => {
    const scene = new T.Scene();
    scene.background = skyTex([[0, '#1677ea'], [0.55, '#5cc2ff'], [1, '#dff6ff']]);
    scene.fog = new T.Fog(0xcfeeff, 120, 520);
    lights(scene, { box: 22, dir: [-25, 40, 25] });
    const camera = persp(38, [0, 2.6, 13], [0, 1.9, 0]);
    // sun
    const sun = mesh(G3.sphere, basic('#fffbe0', { fog: false }), 90, 70, -380, 16, 16, 16, false); scene.add(sun);
    const glow = mesh(G3.sphere, basic('#fff2b0', { transparent: true, opacity: 0.25, fog: false }), 90, 70, -385, 34, 34, 34, false); scene.add(glow);
    // sea and far land
    const sea = makeSea(600, 340, 60, 34, '#0f86dc', 0.18, 0.35); sea.position.set(0, -0.05, -175); scene.add(sea);
    const farLand = [[-120, -170, 38, 34, '#5f9e7c'], [-60, -200, 70, 30, '#6aa98a'], [10, -230, 50, 40, '#5f9e7c'], [80, -190, 62, 28, '#6aa98a'], [140, -210, 40, 38, '#5f9e7c'], [-170, -230, 55, 45, '#6aa98a']];
    farLand.forEach(([x, z, h, rr, col]) => { const p = peak(h, rr, col); p.position.set(x, -2, z); scene.add(p); });
    const rng = seeded(4);
    for (let i = 0; i < 70; i++) {
      const w = 2 + rng() * 3, h = 2 + rng() * 9;
      scene.add(mesh(G3.box, M(['#fff4e0', '#f6d6c8', '#d8e8f0', '#f8e3a8', '#e9c6d8'][i % 5]), -110 + i * 3.2, h / 2, -150 - rng() * 12, w, h, 3, false));
    }
    // sand and foam
    const sand = mesh(G3.box, M('#f2c97f'), 0, -0.5, 7, 200, 1, 26, false); sand.receiveShadow = true; scene.add(sand);
    const wet = mesh(G3.box, M('#d9ad66'), 0, -0.49, -5.4, 200, 1, 1.4, false); scene.add(wet);
    const foam = mesh(G3.box, basic('#ffffff', { transparent: true, opacity: 0.85 }), 0, 0.03, -6.2, 200, 0.05, 0.6, false); scene.add(foam);
    // props
    const palms = [];
    [[-9.6, 2.5, 1.25], [10, 1.5, 1.35], [-14, -2.5, 1.1], [14.5, -3, 1.15], [-5.5, -3.8, 0.9]].forEach(([x, z, s], i) => { const p = palm(s); p.position.set(x, 0, z); p.rotation.y = i * 1.3; scene.add(p); palms.push(p); });
    const u1 = umbrella(1, ['#ff4d6d', '#ffffff']); u1.position.set(-3.8, 0, -1.5); u1.rotation.z = 0.08; scene.add(u1);
    const u2 = umbrella(0.9, ['#2f8cff', '#ffd23f']); u2.position.set(5, 0, -2.8); u2.rotation.z = -0.1; scene.add(u2);
    const u3 = umbrella(0.8, ['#3ddc84', '#ffffff']); u3.position.set(-11, 0, -4.5); scene.add(u3);
    scene.add(mesh(G3.box, M('#ff8c42', { map: stripes(['#ff8c42', '#ffffff'], 6) }), -3.2, 0.03, 0.2, 1.1, 0.05, 2.2));
    scene.add(mesh(G3.box, M('#7a5cff', { map: stripes(['#7a5cff', '#ffd23f'], 6) }), 5.6, 0.03, -1.2, 1, 0.05, 2));
    const ball = beachBall(0.38); ball.position.x = 2.4; ball.position.z = -0.6; scene.add(ball);
    scene.add(mesh(G3.box, M('#d06a3a'), 7.4, 0.35, 0.8, 0.7, 0.7, 0.7)); // cooler
    scene.add(mesh(G3.box, M('#ffffff'), 7.4, 0.73, 0.8, 0.74, 0.08, 0.74));
    // boat
    const boat = new T.Group();
    boat.add(mesh(G3.box, M('#ffffff'), 0, 0.3, 0, 4, 0.8, 1.4));
    boat.add(mesh(G3.box, M('#2f8cff'), 0, -0.05, 0, 4.1, 0.25, 1.45));
    const sail = mesh(G3.tri, M('#ff5d8f'), 0.2, 2.6, 0, 1.4, 3.6, 0.1); sail.rotation.y = Math.PI / 2; boat.add(sail);
    boat.position.set(-30, 0, -70); scene.add(boat);
    const clouds = [];
    for (let i = 0; i < 8; i++) { const cl = cloud(2.5 + (i % 3)); cl.position.set(-150 + i * 45, 28 + (i % 3) * 9, -170 - (i % 2) * 40); scene.add(cl); clouds.push(cl); }
    return {
      scene, camera,
      update(t, scroll, o) {
        sea.userData.wave(t);
        foam.position.z = -6.2 + Math.sin(t * 1.4) * 0.35; foam.material.opacity = 0.6 + Math.sin(t * 1.4) * 0.25;
        swayPalms(palms, t);
        boat.position.x = -30 + ((t * 1.5) % 80); boat.position.y = Math.sin(t * 2) * 0.2; boat.rotation.z = Math.sin(t * 1.7) * 0.05;
        ball.rotation.y = t * 0.4;
        clouds.forEach((cl, i) => { cl.position.x = wrap(-150 + i * 45 + t * 1.2, 380); });
        const b = camera.userData.base;
        const sway = o.menu ? Math.sin(t * 0.25) * 1.6 : 0;
        camera.position.set(b.pos[0] + sway + scroll * 0.004, b.pos[1] + (o.menu ? 0.6 : 0), b.pos[2]);
        camera.lookAt(b.look[0] + sway * 0.6 + scroll * 0.004, b.look[1] + (o.menu ? 0.5 : 0), b.look[2]);
      },
    };
  };

  builders.market = () => {
    const scene = new T.Scene();
    scene.background = skyTex([[0, '#ff9a5a'], [0.6, '#ffd08a'], [1, '#fff1cf']]);
    scene.fog = new T.Fog(0xffe0b0, 40, 160);
    lights(scene, { sky: 0xffe2c0, ground: 0xc99a6b, sun: 0xffe0b0, dir: [30, 40, 25], box: 25 });
    const camera = persp(42, [0, 2.3, 13], [0, 3.2, 0]);
    const floor = mesh(G3.box, M('#d9a873', { map: canvasTex(64, 64, (c) => { c.fillStyle = '#e2b583'; c.fillRect(0, 0, 64, 64); c.strokeStyle = '#b98a5c'; c.lineWidth = 2; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) c.strokeRect(i * 16 + (j % 2) * 8, j * 16, 16, 16); }, [30, 12]) }), 0, -0.5, 0, 120, 1, 60, false);
    floor.receiveShadow = true; scene.add(floor);
    const cols = ['#ff8c42', '#ffd23f', '#3bceac', '#ff5d8f', '#7aa7ff', '#b967ff', '#f25f5c', '#70c1b3'];
    const rng = seeded(12);
    let x = -24;
    while (x < 24) { const w = 2.6 + rng() * 1.6, h = 4.5 + rng() * 5; const hs = house(w, h, 4, cols[Math.floor(rng() * 8)]); hs.position.set(x + w / 2, 0, -9); scene.add(hs); x += w + 0.05; }
    x = -40;
    while (x < 40) { const w = 3 + rng() * 2, h = 8 + rng() * 9; const hs = house(w, h, 4, cols[Math.floor(rng() * 8)]); hs.position.set(x + w / 2, 0, -22); scene.add(hs); x += w + 0.3; }
    const hillBack = peak(40, 70, '#8bb07a'); hillBack.position.set(10, -6, -90); scene.add(hillBack);
    // market stalls with striped awnings
    [[-7, -4.2, ['#ff4d6d', '#fff']], [-1.5, -4.6, ['#2f8cff', '#fff']], [5, -4.2, ['#3ddc84', '#ffd23f']], [10.5, -4.6, ['#ff8c42', '#fff']]].forEach(([sx, sz, sc]) => {
      const g = new T.Group();
      g.add(mesh(G3.box, M('#a0703f'), 0, 0.5, 0, 2.6, 1, 1.2));
      for (let k = 0; k < 5; k++) g.add(mesh(G3.sphere, M(['#ffb030', '#e8322f', '#ffd93b', '#8e44ad', '#3aa14a'][k]), -1 + k * 0.5, 1.12, 0, 0.2, 0.2, 0.2));
      [-1.2, 1.2].forEach((px) => g.add(mesh(G3.cyl, M('#7a4a2a'), px, 1.3, 0.5, 0.05, 2.6, 0.05)));
      const aw = new T.Mesh(new T.CylinderGeometry(0.9, 0.9, 2.8, 12, 1, true, 0, Math.PI), M('#fff', { map: stripes(sc, 10), side: T.DoubleSide }));
      aw.rotation.z = Math.PI / 2; aw.position.set(0, 2.6, 0.3); aw.castShadow = true; g.add(aw);
      g.position.set(sx, 0, sz); scene.add(g);
    });
    scene.add(stringOf(-16, 16, 8.5, -2, 1.6, 26, cols, 0.32, 'flags'));
    scene.add(stringOf(-16, 16, 9.5, 3, 2, 26, cols, 0.32, 'flags'));
    const fountain = new T.Group();
    fountain.add(mesh(G3.cyl, M('#d8d0c0'), 0, 0.35, 0, 1.8, 0.7, 1.8));
    fountain.add(mesh(G3.cyl, M('#4fc3f7'), 0, 0.72, 0, 1.6, 0.05, 1.6));
    fountain.add(mesh(G3.cyl, M('#d8d0c0'), 0, 1.3, 0, 0.25, 1.5, 0.25));
    const spray = mesh(G3.sphere, M('#bfefff', { transparent: true, opacity: 0.7 }), 0, 2.2, 0, 0.5, 0.5, 0.5, false); fountain.add(spray);
    fountain.position.set(0, 0, -1); scene.add(fountain);
    const palms = [palm(1.1), palm(1)]; palms[0].position.set(-12, 0, 1); palms[1].position.set(13, 0, 0); palms.forEach((p) => scene.add(p));
    return {
      scene, camera,
      update(t, scroll) {
        swayPalms(palms, t);
        spray.scale.setScalar(0.45 + Math.sin(t * 6) * 0.06);
        const b = camera.userData.base;
        camera.position.x = Math.sin(t * 0.2) * 0.8 + scroll * 0.003;
        camera.lookAt(b.look[0] + camera.position.x * 0.5, b.look[1], b.look[2]);
      },
    };
  };

  builders.sky = () => {
    const scene = new T.Scene();
    scene.background = skyTex([[0, '#0f6fe0'], [0.6, '#5ec0ff'], [1, '#e2f7ff']]);
    scene.fog = new T.Fog(0xd6f1ff, 60, 260);
    const sunL = lights(scene, { box: 60, dir: [-30, 60, 30], far: 300 });
    const camera = persp(48, [0, 16, 24], [0, 9, -20]);
    scene.add(sunL.target);
    const span = 240;
    const ground = mesh(G3.box, M('#5cb85c'), 0, -1, -60, 900, 2, 200, false); ground.receiveShadow = true; scene.add(ground);
    const items = [];
    const rng = seeded(9);
    for (let i = 0; i < 14; i++) { const h = mesh(G3.lowSphere, M(i % 2 ? '#4fa860' : '#6cc174', { flatShading: true }), 0, -2, -15 - rng() * 30, 14 + rng() * 10, 5 + rng() * 5, 10, true); items.push([h, rng() * span]); }
    for (let i = 0; i < 9; i++) { const p = peak(26 + rng() * 30, 10 + rng() * 6, i % 2 ? '#6f9fa0' : '#7fb0a0'); p.position.set(0, -2, -110 - rng() * 60); items.push([p, rng() * span]); }
    for (let i = 0; i < 12; i++) { const tr = tree(0.9 + rng() * 0.6, '#2f9e44'); tr.position.set(0, 0, -6 - rng() * 14); items.push([tr, rng() * span]); }
    const clouds = [];
    for (let i = 0; i < 14; i++) { const cl = cloud(1.5 + rng() * 2); cl.position.set(0, 8 + rng() * 16, -10 - rng() * 70); items.push([cl, rng() * span]); clouds.push(cl); }
    items.forEach(([o]) => scene.add(o));
    const farSea = mesh(G3.box, M('#3aa0e0'), 0, -1.5, -200, 1200, 1, 120, false); scene.add(farSea);
    return {
      scene, camera,
      update(t, scroll) {
        const cx = scroll * 0.018;
        camera.position.set(cx, 16 + Math.sin(t * 0.7) * 0.3, 24);
        camera.lookAt(cx, 9, -20);
        items.forEach(([o, bx]) => { o.position.x = cx + wrap(bx - cx, span); });
        ground.position.x = cx; farSea.position.x = cx;
        sunL.position.set(cx - 30, 60, 30); sunL.target.position.set(cx, 0, -20);
      },
    };
  };

  builders.jungle = () => {
    const scene = new T.Scene();
    scene.background = skyTex([[0, '#2c8c4a'], [0.6, '#7fd38a'], [1, '#d8f5c8']]);
    scene.fog = new T.Fog(0x9fdba0, 18, 80);
    lights(scene, { sky: 0xd8ffd0, ground: 0x2f5a2a, sun: 0xfff2c0, dir: [10, 40, 20], box: 25 });
    const camera = persp(44, [0, 2.4, 13], [0, 3.6, 0]);
    const floor = mesh(G3.box, M('#4f9a3c'), 0, -0.5, 0, 140, 1, 80, false); floor.receiveShadow = true; scene.add(floor);
    const pond = mesh(G3.cyl, M('#2fb5d6'), 1, 0.02, -3, 7, 0.05, 3, false); scene.add(pond);
    // waterfall between rocks
    const fallTex = canvasTex(32, 64, (c) => { c.fillStyle = '#7fd8ff'; c.fillRect(0, 0, 32, 64); c.fillStyle = 'rgba(255,255,255,0.7)'; for (let i = 0; i < 10; i++) c.fillRect(Math.random() * 30, Math.random() * 60, 2, 12); }, [2, 2]);
    const fall = mesh(G3.box, M('#9be7ff', { map: fallTex }), 1, 5, -12, 4, 10, 0.2, false); scene.add(fall);
    [[-2.6, 5, -12, 2.4, 6], [4.6, 5, -12, 2.6, 6.5], [1, 10.5, -12.5, 5, 1.6]].forEach(([x, y, z, sx, sy]) => { const rk = mesh(G3.dodec, M('#7d8a80', { flatShading: true }), x, y, z, sx, sy, 1.8); scene.add(rk); });
    const rng = seeded(3);
    for (let i = 0; i < 22; i++) {
      const side = i % 2 ? 1 : -1;
      const tr = tree(1.2 + rng() * 0.9, ['#1f7a3a', '#2f9e44', '#3fae55'][i % 3]);
      tr.position.set(side * (5 + rng() * 14), 0, -4 - rng() * 22); scene.add(tr);
    }
    const leaves = [];
    for (let i = 0; i < 8; i++) {
      const side = i % 2 ? 1 : -1;
      const l = mesh(G3.sphere, M(i % 3 ? '#2a8f3e' : '#1f7a33'), side * (7 + (i % 3)), 1.6 + (i % 4) * 0.9, 4 - (i % 3), 2.6, 0.15, 0.9);
      l.rotation.z = side * -0.5; l.rotation.y = side * 0.4; scene.add(l); leaves.push(l);
    }
    const vines = [];
    for (let i = 0; i < 7; i++) { const v = mesh(G3.cyl, M('#3d7a2a'), -9 + i * 3, 9, -3 - (i % 3) * 3, 0.06, 6 + (i % 3) * 2, 0.06, false); scene.add(v); vines.push(v); }
    for (let i = 0; i < 4; i++) {
      const ray = mesh(G3.box, basic('#fffbd0', { transparent: true, opacity: 0.12, depthWrite: false }), -6 + i * 4.5, 7, -6, 1.2, 18, 0.1, false);
      ray.rotation.z = -0.35; scene.add(ray);
    }
    for (let i = 0; i < 10; i++) scene.add(mesh(G3.sphere, M(['#ff5d8f', '#ffd23f', '#b967ff'][i % 3]), -8 + i * 1.8, 0.3, 1 - (i % 3), 0.2, 0.2, 0.2));
    return {
      scene, camera,
      update(t, scroll) {
        fallTex.offset.y = -t * 1.2;
        leaves.forEach((l, i) => { l.rotation.x = Math.sin(t * 1.5 + i) * 0.08; });
        vines.forEach((v, i) => { v.rotation.z = Math.sin(t * 0.8 + i) * 0.05; });
        const b = camera.userData.base;
        camera.position.x = Math.sin(t * 0.18) * 0.8 + scroll * 0.003;
        camera.lookAt(b.look[0] + camera.position.x * 0.4, b.look[1], b.look[2]);
      },
    };
  };

  function fireworks(scene, n) {
    const list = [];
    for (let k = 0; k < n; k++) {
      const cnt = 40, geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.BufferAttribute(new Float32Array(cnt * 3), 3));
      const mat = new T.PointsMaterial({ color: ['#ffd23f', '#ff5d8f', '#3ddc84', '#7aa7ff'][k % 4], size: 0.6, transparent: true, fog: false });
      const p = new T.Points(geo, mat); scene.add(p);
      const dirs = []; for (let i = 0; i < cnt; i++) { const a = Math.random() * Math.PI * 2, b = Math.acos(Math.random() * 2 - 1); dirs.push([Math.sin(b) * Math.cos(a), Math.cos(b), Math.sin(b) * Math.sin(a)]); }
      list.push({ p, dirs, x: -20 + k * 14, y: 20 + (k % 2) * 6, z: -45, ph: k * 0.37 });
    }
    return (t) => list.forEach((f) => {
      const k = (t * 0.45 + f.ph) % 1, pos = f.p.geometry.attributes.position;
      f.dirs.forEach((d, i) => { pos.array[i * 3] = f.x + d[0] * k * 9; pos.array[i * 3 + 1] = f.y + d[1] * k * 9 - k * k * 3; pos.array[i * 3 + 2] = f.z + d[2] * k * 9; });
      pos.needsUpdate = true; f.p.material.opacity = 1 - k;
    });
  }

  builders.carnival = () => {
    const scene = new T.Scene();
    scene.background = skyTex([[0, '#120a33'], [0.6, '#40207a'], [1, '#8a3fa0']]);
    scene.fog = new T.Fog(0x3a1f6a, 40, 150);
    lights(scene, { sky: 0x8a6cff, ground: 0x2a1040, hemi: 0.65, sun: 0xb0a0ff, sunI: 0.45, dir: [-20, 40, 30], box: 25 });
    [[-8, 6, 2, 0xff5d8f], [8, 6, 2, 0x3ddc84], [0, 7, -6, 0xffd23f]].forEach(([x, y, z, c]) => { const pl = new T.PointLight(c, 0.9, 30); pl.position.set(x, y, z); scene.add(pl); });
    const camera = persp(44, [0, 2.6, 14], [0, 3.8, 0]);
    const street = mesh(G3.box, M('#3a2560', { map: stripes(['#3a2560', '#46306e'], 16) }), 0, -0.5, 0, 120, 1, 60, false); street.receiveShadow = true; scene.add(street);
    const cols = ['#ff8c42', '#ffd23f', '#3bceac', '#ff5d8f', '#7aa7ff', '#b967ff'];
    const rng = seeded(21);
    let x = -30;
    while (x < 30) { const w = 3 + rng() * 2, h = 6 + rng() * 8; const hs = house(w, h, 4, cols[Math.floor(rng() * 6)], true); hs.position.set(x + w / 2, 0, -12); scene.add(hs); x += w + 0.1; }
    // parade float with a golden drum
    const fl = new T.Group();
    fl.add(mesh(G3.box, M('#ff5d8f'), 0, 0.7, 0, 7, 1.4, 3));
    fl.add(mesh(G3.box, M('#ffd23f'), 0, 1.45, 0, 7.2, 0.15, 3.2));
    fl.add(mesh(G3.cyl, M('#ffcc33', { emissive: '#664400' }), 0, 2.6, 0, 1.2, 2, 1.2));
    fl.add(mesh(G3.cyl, M('#fff3a8'), 0, 3.62, 0, 1.15, 0.06, 1.15));
    for (let i = 0; i < 6; i++) { const f = mesh(G3.sphere, M(cols[i]), -3 + i * 1.2, 2, 1.4, 0.22, 1.2, 0.22); f.rotation.z = (i - 2.5) * 0.15; fl.add(f); }
    fl.position.set(0, 0, -6); scene.add(fl);
    for (let r = 0; r < 3; r++) scene.add(stringOf(-18, 18, 9 + r * 0.8, -4 + r * 4, 1.6, 34, ['#ffd23f', '#ff5d8f', '#3bceac', '#7aa7ff'], 0.14, 'lights'));
    [[-10, 1], [10, 1]].forEach(([lx, lz]) => {
      scene.add(mesh(G3.cyl, M('#2a1c3a'), lx, 2.5, lz, 0.12, 5, 0.12));
      scene.add(mesh(G3.sphere, basic('#fff2b0'), lx, 5.2, lz, 0.45, 0.45, 0.45, false));
    });
    const fw = fireworks(scene, 4);
    return {
      scene, camera,
      update(t, scroll) {
        fw(t);
        fl.position.y = Math.abs(Math.sin(t * 4)) * 0.08;
        const b = camera.userData.base;
        camera.position.x = Math.sin(t * 0.22) * 1 + scroll * 0.003;
        camera.lookAt(b.look[0] + camera.position.x * 0.5, b.look[1], b.look[2]);
      },
    };
  };

  // Beach Bump island: orthographic, lines up with the 2D sandbar physics.
  builders.island = () => {
    const scene = new T.Scene();
    scene.background = new T.Color('#1a8fd8');
    const camera = ortho(0.62, 420);
    lights(scene, { box: 900, dir: [-600, 1200, 500], far: 4000 });
    const sea = makeSea(2600, 2600, 50, 50, '#1e9ee8', 6, 0.012); sea.position.y = -30; scene.add(sea);
    const isl = new T.Group();
    const top = mesh(G3.cyl, M('#f7d794'), 0, -20, 0, 300, 40, 300); isl.add(top);
    const shade = mesh(new T.CylinderGeometry(1, 1.12, 1, 48), M('#d9b46a'), 0, -48, 0, 300, 24, 300, false); isl.add(shade);
    scene.add(isl);
    const foam = new T.Mesh(new T.RingGeometry(1, 1.15, 48), basic('#ffffff', { transparent: true, opacity: 0.6, side: T.DoubleSide }));
    foam.rotation.x = -Math.PI / 2; foam.position.y = -26; scene.add(foam);
    [[-560, -330], [560, -300], [-600, 380], [600, 360], [-450, 520]].forEach(([x, z], i) => scene.add(mesh(G3.dodec, M('#7d8a95', { flatShading: true }), x, -20, z, 40 + i * 6, 30, 36)));
    const buoys = [[-480, 120], [500, 80]].map(([x, z]) => {
      const b = new T.Group();
      b.add(mesh(G3.cyl, M('#ff4d4d'), 0, 0, 0, 16, 30, 16)); b.add(mesh(G3.cyl, M('#ffffff'), 0, 18, 0, 16.5, 8, 16.5));
      b.position.set(x, -20, z); scene.add(b); return b;
    });
    const islet = new T.Group();
    islet.add(mesh(G3.cyl, M('#f7d794'), 0, -22, 0, 90, 20, 70));
    const p = palm(55); islet.add(p);
    islet.position.set(560, 0, 520); scene.add(islet);
    return {
      scene, camera,
      update(t, scroll, o) {
        sea.userData.wave(t);
        const k = (o.R || 300) / 300;
        isl.scale.set(k, 1, k);
        foam.scale.set(300 * k * (1.02 + Math.sin(t * 2) * 0.02), 300 * k * (1.02 + Math.sin(t * 2) * 0.02), 1);
        buoys.forEach((b, i) => { b.position.y = -20 + Math.sin(t * 2 + i) * 5; b.rotation.z = Math.sin(t * 1.5 + i) * 0.1; });
        swayPalms([p], t);
      },
    };
  };

  // Rapid River: orthographic top-down channel matching the 2D river (screen x 250..1030).
  builders.river = () => {
    const scene = new T.Scene();
    scene.background = new T.Color('#2f7d3a');
    const S = 0.8;
    const camera = ortho(S, 360);
    lights(scene, { sky: 0xe0ffe0, ground: 0x3a6a30, box: 900, dir: [-500, 1200, 400], far: 4000 });
    const waterTex = canvasTex(64, 128, (c) => {
      const g = c.createLinearGradient(0, 0, 64, 0); g.addColorStop(0, '#118aa0'); g.addColorStop(0.5, '#2cc0dc'); g.addColorStop(1, '#118aa0');
      c.fillStyle = g; c.fillRect(0, 0, 64, 128);
      c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 2;
      for (let i = 0; i < 9; i++) { const x = 6 + (i * 23) % 52, y = (i * 41) % 128; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 3, y + 7, x, y + 14); c.stroke(); }
    }, [1, 6]);
    const water = new T.Mesh(new T.PlaneGeometry(780, 2400), M('#ffffff', { map: waterTex }));
    water.rotation.x = -Math.PI / 2; water.position.y = -14; water.receiveShadow = true; scene.add(water);
    const grassTop = M('#4caf50'), dirt = M('#8a6b3d');
    const left = new T.Mesh(G3.box, [dirt, dirt, grassTop, dirt, dirt, dirt]); left.scale.set(900, 40, 2400); left.position.set(-390 - 450, 0, 0); left.receiveShadow = true; scene.add(left);
    const right = new T.Mesh(G3.box, [dirt, dirt, grassTop, dirt, dirt, dirt]); right.scale.set(900, 40, 2400); right.position.set(390 + 450, 0, 0); right.receiveShadow = true; scene.add(right);
    const deco = [];
    const rng = seeded(5);
    for (let i = 0; i < 26; i++) {
      const side = i % 2 ? 1 : -1;
      const tr = tree(28 + rng() * 22, ['#1f7a3a', '#2f9e44', '#3fae55'][i % 3]);
      tr.position.set(side * (450 + rng() * 170), 20, 0); scene.add(tr); deco.push([tr, rng() * 1400]);
    }
    for (let i = 0; i < 18; i++) {
      const side = i % 2 ? 1 : -1;
      const b = mesh(G3.sphere, M(i % 3 ? '#2a8f3e' : '#ff5d8f'), side * (410 + rng() * 40), 26, 0, i % 3 ? 26 : 9, i % 3 ? 16 : 9, i % 3 ? 22 : 9);
      scene.add(b); deco.push([b, rng() * 1400]);
    }
    for (let i = 0; i < 10; i++) {
      const side = i % 2 ? 1 : -1;
      const lp = mesh(G3.cyl, M('#3ddc84'), side * (350 - rng() * 30), -12, 0, 22, 2, 22, false);
      scene.add(lp); deco.push([lp, rng() * 1400]);
    }
    return {
      scene, camera,
      update(t, scroll, o) {
        const flow = o.flow || 0;
        const dz = flow / S;
        waterTex.offset.y = dz / 400;
        deco.forEach(([m, z0]) => { m.position.z = wrap(z0 + dz, 1400); });
      },
    };
  };

  // Crow Clash arena: night plaza, orthographic so the 2D arena lines up.
  builders.arena = () => {
    const scene = new T.Scene();
    scene.background = skyTex([[0, '#120a33'], [1, '#4b2a73']]);
    const camera = ortho(0.7, 460);
    lights(scene, { sky: 0x9a80ff, ground: 0x2a1040, hemi: 0.7, sun: 0xd0c0ff, sunI: 0.5, box: 900, dir: [-400, 1200, 600], far: 4000 });
    const tile = canvasTex(64, 64, (c) => { c.fillStyle = '#5a2d88'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#6f3aa3'; c.fillRect(0, 0, 32, 32); c.fillRect(32, 32, 32, 32); }, [12, 8]);
    const floor = mesh(G3.box, M('#ffffff', { map: tile }), 0, -15, -5, 1260, 30, 800); scene.add(floor);
    const trim = mesh(G3.box, M('#ffd23f'), 0, -20, -5, 1290, 28, 830, false); scene.add(trim);
    const cols = ['#ff8c42', '#ffd23f', '#3bceac', '#ff5d8f', '#7aa7ff', '#b967ff'];
    const rng = seeded(31);
    let x = -760;
    while (x < 760) { const w = 120 + rng() * 80, h = 220 + rng() * 200; const hs = house(w, h, 120, cols[Math.floor(rng() * 6)], true); hs.position.set(x + w / 2, -30, -560); scene.add(hs); x += w + 6; }
    const ground = mesh(G3.box, M('#2a1845'), 0, -40, 0, 4000, 10, 3000, false); scene.add(ground);
    for (let r = 0; r < 2; r++) scene.add(stringOf(-700, 700, 260 + r * 40, -430 + r * 60, 60, 40, ['#ffd23f', '#ff5d8f', '#3bceac', '#7aa7ff'], 8, 'lights'));
    const lamps = [];
    [[-620, -400], [620, -400], [-620, 400], [620, 400]].forEach(([lx, lz]) => {
      scene.add(mesh(G3.cyl, M('#20142e'), lx, 90, lz, 8, 200, 8));
      const bulb = mesh(G3.sphere, basic('#fff2b0'), lx, 200, lz, 22, 22, 22, false); scene.add(bulb); lamps.push(bulb);
    });
    return {
      scene, camera,
      update(t) { lamps.forEach((l, i) => l.scale.setScalar(20 + Math.sin(t * 3 + i) * 2)); },
    };
  };

  // Adventure map island; landmarks sit just above each 2D chapter node.
  builders.map = () => {
    const scene = new T.Scene();
    scene.background = new T.Color('#1a8fd8');
    const S = 0.62;
    const camera = ortho(S, 460);
    const gnd = camera.userData.ground;
    lights(scene, { box: 1000, dir: [-500, 1300, 600], far: 4000 });
    const sea = makeSea(2800, 2800, 50, 50, '#1e9ee8', 6, 0.01); sea.position.y = -40; scene.add(sea);
    const rz = 250 / S;
    scene.add(mesh(new T.CylinderGeometry(1, 1.08, 1, 64), M('#f7d794'), 0, -30, 0, 640, 40, rz + 20));
    scene.add(mesh(new T.CylinderGeometry(1, 1.04, 1, 64), M('#6cc164'), 0, -6, -10, 590, 12, rz - 30));
    const L = (sx, sy) => { const g = gnd(sx, sy); return [g.x, g.z]; };
    const put = (obj, sx, sy, y = 0) => { const [gx, gz] = L(sx, sy); obj.position.set(gx, y, gz); scene.add(obj); return obj; };
    const palms = [];
    // 1 Sunny Shore
    palms.push(put(palm(32), 110, 420)); palms.push(put(palm(26), 240, 450));
    put(umbrella(30, ['#ff4d6d', '#fff']), 175, 430);
    put(beachBall(14), 60, 470);
    // 2 Old Town
    [[340, 290, '#ff8c42', 70], [395, 280, '#3bceac', 90], [450, 292, '#ff5d8f', 60], [380, 315, '#ffd23f', 50]].forEach(([sx, sy, col, h]) => put(house(46, h, 46, col), sx, sy));
    // 3 Cloud Hills
    [[590, 430, 140, 60], [660, 420, 180, 70], [720, 440, 110, 50]].forEach(([sx, sy, h, rr], i) => { const pk = peak(h, rr, i % 2 ? '#7fae9a' : '#6a9e88'); put(pk, sx, sy, -10); });
    const cl = put(cloud(26), 640, 300, 160);
    // 4 Jungle River
    for (let i = 0; i < 7; i++) put(tree(16 + (i % 3) * 4, ['#1f7a3a', '#2f9e44', '#3fae55'][i % 3]), 810 + (i % 4) * 45, 270 + Math.floor(i / 4) * 40 + (i % 2) * 10);
    const riv = mesh(G3.box, M('#2fb5d6'), 0, -4, 0, 40, 4, 300, false); put(riv, 960, 330, -2); riv.rotation.y = 0.6;
    // 5 Grand Parade
    const tent = new T.Group();
    tent.add(mesh(G3.cyl, M('#ffffff', { map: stripes(['#ff4d6d', '#ffffff'], 12) }), 0, 30, 0, 60, 60, 60));
    tent.add(mesh(G3.cone, M('#ffffff', { map: stripes(['#ffd23f', '#b967ff'], 12) }), 0, 95, 0, 70, 70, 70));
    tent.add(mesh(G3.tri, M('#ff5d8f'), 0, 145, 0, 10, 30, 2));
    put(tent, 1110, 390);
    palms.push(put(palm(28), 1210, 470));
    // boats
    const boats = [[60, 640], [1180, 250]].map(([sx, sy], i) => {
      const b = new T.Group();
      b.add(mesh(G3.box, M('#ffffff'), 0, 0, 0, 80, 18, 30)); b.add(mesh(G3.tri, M(i ? '#3ddc84' : '#ff5d8f'), 0, 60, 0, 30, 90, 3));
      return put(b, sx, sy, -30);
    });
    return {
      scene, camera,
      update(t) {
        sea.userData.wave(t);
        swayPalms(palms, t);
        boats.forEach((b, i) => { b.position.y = -30 + Math.sin(t * 2 + i) * 4; b.rotation.z = Math.sin(t * 1.4 + i) * 0.06; });
        cl.position.x = L(640, 300)[0] + Math.sin(t * 0.3) * 40;
      },
    };
  };

  // ---------- public API ----------
  api.init = () => {
    try {
      cv = document.getElementById('c3d');
      r = new T.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
      r.shadowMap.enabled = true;
      r.shadowMap.type = T.PCFSoftShadowMap;
      r.setClearColor(0x000000, 1);
      r.autoClear = false;
      api.ok = true;
      api.resize();
      window.addEventListener('resize', api.resize);
      cv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); api.ok = false; });
    } catch (e) { api.ok = false; }
  };
  api.resize = () => {
    if (!r) return;
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    r.setSize(window.innerWidth, window.innerHeight, false);
    cv.style.width = window.innerWidth + 'px'; cv.style.height = window.innerHeight + 'px';
  };
  api.enabled = () => api.ok && Save.data && Save.data.opts.gfx3d !== false;
  // Called by drawBackground / games; returns true if the 3D layer will draw this background.
  api.request = (theme, scroll = 0, opts = {}) => {
    if (!api.enabled()) return false;
    const map = { menu: 'beach', rooftops: 'market' };
    const id = map[theme] || theme;
    if (!builders[id]) return false;
    want = id; wScroll = scroll; wOpts = theme === 'menu' ? Object.assign({ menu: true }, opts) : opts;
    return true;
  };
  api.env = (id) => {
    if (!envs[id]) envs[id] = builders[id]();
    return envs[id];
  };
  api.render = () => {
    if (!api.ok) return;
    if (!want) {
      if (shown) { r.setScissorTest(false); r.clear(); shown = false; cv.style.visibility = 'hidden'; }
      return;
    }
    if (!shown) { cv.style.visibility = 'visible'; shown = true; }
    const env = api.env(want);
    env.update(G.t, wScroll, wOpts || {});
    r.setScissorTest(false); r.clear();
    r.setViewport(view.cox, view.coy, W * view.css, H * view.css);
    r.setScissor(view.cox, view.coy, W * view.css, H * view.css);
    r.setScissorTest(true);
    r.render(env.scene, env.camera);
    want = null;
  };
  return api;
})();
