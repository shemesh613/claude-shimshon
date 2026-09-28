// Beat 2 (film 12-25 s, local t 0..13): the Camp of Israel forms from above, dusk falls,
// and the Clouds of Glory gather around it.
//
// END STATE (H2, held stable for t = 11..13, only slow drift):
//   camera  = WORLD.CAM_CAMP exactly ({x:0, y:0, zoom:1.45}), static from t = 6.8.
//   camp    = WORLD.drawCamp(ctx, CAM_CAMP, { appear: () => 1, night: 1, glow: 0.5 }, env)
//   ground  = the day sand texture, multiplied by rgb(74,82,150) and then covered with
//             #12143a at alpha 0.42 (a deep, cool moonlit indigo on which the ripples still read).
//             Beat 3 can draw exactly this ground at any camera with
//             MIDBAR.beats[2].scene.ground(ctx, cam, env, 1)
//   light   = warm pillar glow on the ground at the Mishkan (screen 540,960), ~60 tiny flickering
//             campfire glows in the lanes between blocks, and a pearl light pool under the cloud ring.
//   clouds  = pearl-white/gold luminous clouds on a rounded-square ring (superellipse p=3,
//             radius ~480 x 505 px around 540,960), larger dim clouds beyond it, a thin
//             translucent canopy over the camp and the pillar vortex over the Mishkan.
//             Beat 3 can draw the same clouds with
//             MIDBAR.beats[2].scene.clouds(ctx, t, env, alpha)   (t = b2 local time, e.g. 13 + s)
//   grains  = sparkling fine structure: 70% trace the ring clouds, 16% spiral in the pillar,
//             14% sit in the canopy; w 0.3..0.7 twinkling.
(function () {
  const S = (window.MIDBAR = window.MIDBAR || { beats: {} });

  let fx, WD, W, H, N;
  // sand texture in world space
  const SX0 = -440, SY0 = -770, SK = 1.8;
  let sand = null;
  // clouds
  let sprites = [], blobs = [], cloudLayer = null, cctx = null;
  const CL = 0.5; // cloud layer resolution factor
  // camp
  let tStart, blocks, fires, inkItems, tentPoly;
  // grains
  let G = null;
  // cached night camp (only when everything is static)
  const campCache = { key: '', c: null };

  const CX = 540, CY = 960;
  const RX = 560, RY = 600, SP = 3.2;

  // ---------------- timing ----------------
  const nightK = (t) => fx.smooth(fx.range(t, 6.4, 10.9));
  const glowK = (t) => 0.5 * fx.smooth(fx.range(t, 8.0, 10.9));

  function camAt(t) {
    const C = WD.CAM_CAMP;
    const u = fx.range(t, 0, 6.8);
    const k = 0.4 * fx.ease.out(u) + 0.6 * fx.ease.inOutSine(u);
    const z0 = 3.1;
    return {
      x: C.x + (1 - k) * 18,
      y: C.y + (1 - k) * 34,
      zoom: z0 * Math.pow(C.zoom / z0, k),
    };
  }

  const lerp3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  function keyed(keys, t) {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) {
        const k = fx.smooth((t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]));
        return lerp3(keys[i - 1][1], keys[i][1], k);
      }
    }
    return keys[keys.length - 1][1];
  }
  // ground multiply colour through the afternoon -> night
  const GROUND_MUL = [
    [0, [255, 252, 244]], [3.5, [255, 246, 228]], [6.4, [250, 226, 200]],
    [8.4, [170, 144, 186]], [10.9, [88, 98, 172]],
  ];
  // grade over everything (camp included); identity again by t = 10.9
  const GRADE = [
    [0, [255, 255, 255]], [3.5, [255, 250, 240]], [6.4, [255, 234, 214]],
    [8.2, [214, 184, 214]], [9.6, [222, 214, 240]], [10.9, [255, 255, 255]],
  ];

  // ---------------- init helpers ----------------
  function makeSand() {
    const w = Math.round(-2 * SX0 * SK), h = Math.round(-2 * SY0 * SK);
    const c = fx.canvas(w, h);
    const g = c.getContext('2d');
    const img = g.createImageData(w, h);
    const d = img.data;
    // coarse low-frequency fields, bilinear-sampled
    const step = 8, gw = Math.ceil(w / step) + 2, gh = Math.ceil(h / step) + 2;
    const low = new Float32Array(gw * gh), warp = new Float32Array(gw * gh), amp = new Float32Array(gw * gh);
    for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
      const wx = SX0 + (gx * step) / SK, wy = SY0 + (gy * step) / SK;
      const q = gy * gw + gx;
      low[q] = fx.fbm(wx / 240 + 3.1, wy / 240 - 1.7, 4);
      warp[q] = fx.fbm(wx / 70 + 9.3, wy / 70 + 2.2, 3) * 11 + low[q] * 26;
      amp[q] = 0.55 + 0.45 * fx.noise(wx / 55 - 4.2, wy / 55 + 7.7);
    }
    const samp = (arr, fx_, fy_) => {
      const x0 = fx_ | 0, y0 = fy_ | 0, ax = fx_ - x0, ay = fy_ - y0, q = y0 * gw + x0;
      const a = arr[q], b = arr[q + 1], cc = arr[q + gw], dd = arr[q + gw + 1];
      return a + (b - a) * ax + (cc - a) * ay + (a - b - cc + dd) * ax * ay;
    };
    const dark = [184, 128, 66], light = [246, 208, 146];
    let seed = 12345;
    for (let py = 0; py < h; py++) {
      const wy = SY0 + py / SK, fy_ = py / step;
      for (let px = 0; px < w; px++) {
        const wx = SX0 + px / SK, fx_ = px / step;
        const L = samp(low, fx_, fy_), Wp = samp(warp, fx_, fy_), A = samp(amp, fx_, fy_);
        // wind ripples: crests roughly horizontal (wind from the north-west), asymmetric profile
        const ph = (wx * 0.26 + wy * 0.965 + Wp) / 6.2;
        const f = ph - Math.floor(ph);
        const rip = f < 0.72 ? f / 0.72 : (1 - f) / 0.28;
        const lee = f > 0.72 && f < 0.8 ? 1 : 0;
        seed = (Math.imul(seed, 1103515245) + 12345) | 0;
        const sp = ((seed >>> 16) & 255) / 255 - 0.5;
        let k = 0.52 + L * 0.42 + (rip - 0.5) * 0.2 * A - lee * 0.07 * A + sp * 0.07;
        k = k < 0 ? 0 : k > 1 ? 1 : k;
        const o = 4 * (py * w + px);
        d[o] = dark[0] + (light[0] - dark[0]) * k;
        d[o + 1] = dark[1] + (light[1] - dark[1]) * k;
        d[o + 2] = dark[2] + (light[2] - dark[2]) * k;
        d[o + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  // Soft billowed cloud sprite, lit from local +y (so rot = a + PI/2 lights the side facing the centre).
  function makeCloudSprite(seed, size, pal) {
    const c = fx.canvas(size, size);
    const g = c.getContext('2d');
    const img = g.createImageData(size, size);
    const d = img.data;
    const r = fx.rng(seed * 7919 + 13);
    const lobes = [[0, 0, 0.3], [0.3, 0.04, 0.24], [-0.32, -0.02, 0.24]];
    const nl = 12 + ((r() * 6) | 0);
    for (let i = 0; i < nl; i++) {
      const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * 0.66;
      lobes.push([Math.cos(a) * rr, Math.sin(a) * rr * 0.55, 0.09 + r() * 0.15]);
    }
    const den = new Float32Array(size * size);
    const ox = r() * 100, oy = r() * 100;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const u = (x / (size - 1)) * 2 - 1, v = (y / (size - 1)) * 2 - 1;
      let m = 0;
      for (const [lx, ly, lr] of lobes) {
        const q = ((u - lx) * (u - lx) + (v - ly) * (v - ly)) / (lr * lr);
        if (q < 9) m += Math.exp(-q * 1.4);
      }
      const n = fx.fbm(u * 3.4 + ox, v * 3.4 + oy, 5);
      const edge = fx.smooth((1 - Math.hypot(u, v * 1.15)) / 0.3);
      den[y * size + x] = Math.max(0, m * (0.85 + 0.45 * n) + n * 0.2 - 0.16) * edge;
    }
    const lit = pal.lit, shade = pal.shade, gold = pal.gold;
    const hgt = new Float32Array(size * size);
    for (let q = 0; q < size * size; q++) hgt[q] = 1 - Math.exp(-1.7 * den[q]);
    const D = (x, y) => hgt[Math.min(size - 1, Math.max(0, y)) * size + Math.min(size - 1, Math.max(0, x))];
    const o1 = Math.max(2, Math.round(size / 48)), o2 = Math.round(size / 16);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const dv = den[y * size + x];
      const o = 4 * (y * size + x);
      if (dv <= 0.001) { d[o + 3] = 0; continue; }
      // light from +y: lit where density falls off toward +y (two scales: billows + body)
      const g1 = D(x, y + o1) - D(x, y - o1), g2 = D(x, y + o2) - D(x, y - o2);
      const hi = fx.fbm(x * 0.09 + ox, y * 0.09 + oy, 3);
      const hv = hgt[y * size + x];
      const sh = fx.smooth(0.52 - g1 * 4.2 - g2 * 1.8 + hi * 0.3 + (hv - 0.6) * 0.25);
      let col = lerp3(shade, lit, sh);
      col = lerp3(col, gold, fx.smooth((dv - 0.5) / 1.2) * pal.g);
      d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2];
      d[o + 3] = 255 * Math.pow(fx.smooth(dv / 1.25), 0.85) * pal.a;
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  // superellipse radius at angle a
  function ringR(a) {
    const c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
    return 1 / Math.pow(Math.pow(c, SP) + Math.pow(s, SP), 1 / SP);
  }

  function buildClouds() {
    const r = fx.rng(2025);
    blobs = [];
    // outer, larger, dimmer clouds (depth)
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2 + (r() - 0.5) * 0.3;
      blobs.push({ kind: 0, a, rf: 1.3 + r() * 0.25, size: 230 + r() * 100, spr: 6 + ((r() * 4) | 0),
        rot: a - Math.PI / 2 + (r() - 0.5) * 0.5, alpha: 0.34 + r() * 0.14, d: r() * 1.0, drift: 0.006 + r() * 0.004, ph: r() * 6.28 });
    }
    // the ring itself: a deeper back layer, then the bright front layer
    const nB = 24;
    for (let k = 0; k < nB; k++) {
      const a = ((k + 0.5) / nB) * Math.PI * 2 + (r() - 0.5) * 0.1;
      blobs.push({ kind: 1, a, rf: 1.06 + (r() - 0.5) * 0.08, size: 150 + r() * 70, spr: 6 + ((r() * 4) | 0),
        rot: a - Math.PI / 2 + (r() - 0.5) * 0.4, alpha: 0.7 + r() * 0.2, d: r() * 1.1,
        drift: 0.008 + r() * 0.003, ph: r() * 6.28, inner: false });
    }
    const nR = 34;
    for (let k = 0; k < nR; k++) {
      const a = (k / nR) * Math.PI * 2 + (r() - 0.5) * 0.1;
      const inner = r() < 0.7;
      blobs.push({ kind: 1, a, rf: 0.97 + (r() - 0.5) * 0.08, size: 115 + r() * 65, spr: (r() * 6) | 0,
        rot: (inner ? a + Math.PI / 2 : a - Math.PI / 2) + (r() - 0.5) * 0.35, alpha: 0.78 + r() * 0.2, d: r() * 1.3,
        drift: 0.009 + r() * 0.004, ph: r() * 6.28, inner });
    }
    // canopy over the camp: luminous veils
    for (let k = 0; k < 7; k++) {
      const a = r() * Math.PI * 2, rr = 120 + Math.sqrt(r()) * 260;
      blobs.push({ kind: 2, x: CX + Math.cos(a) * rr, y: CY + Math.sin(a) * rr * 1.1, size: 300 + r() * 140,
        spr: (r() * 6) | 0, rot: r() * 6.28, alpha: 0.035 + r() * 0.03, d: r() * 1.2,
        vx: (r() - 0.5) * 8, vy: (r() - 0.5) * 6, ph: r() * 6.28 });
    }
    // the pillar vortex over the Mishkan
    for (let k = 0; k < 10; k++) {
      const ring = k < 4 ? 0 : 1;
      blobs.push({ kind: 3, a: (k / (ring ? 6 : 4)) * Math.PI * 2 + r() * 0.5, rr: ring ? 58 + r() * 22 : 22 + r() * 10,
        size: ring ? 80 + r() * 30 : 55 + r() * 20, spr: (r() * 6) | 0, rot: r() * 6.28,
        alpha: ring ? 0.22 : 0.32, w: ring ? 0.07 : 0.12, ph: r() * 6.28 });
    }
  }
  const RING_IDX = () => blobs.map((b, i) => (b.kind === 1 ? i : -1)).filter((i) => i >= 0);
  let ringIdx = [], canopyIdx = [];

  // position of blob b at local time t in screen coords: [x, y, size, alpha, rot]
  function blobAt(b, t, out) {
    if (b.kind === 0 || b.kind === 1) {
      // clouds condense in place, drifting gently inward as they gather
      const g = fx.ease.inOut(fx.range(t, 5.7 + b.d, 9.4 + b.d));
      const a = b.a + b.drift * (t - 11) + 0.015 * Math.sin(0.35 * t + b.ph) - (1 - g) * 0.18;
      const rad = ringR(a) * b.rf * (1 + (1 - g) * 0.16) * (1 + 0.012 * Math.sin(0.5 * t + b.ph));
      out[0] = CX + Math.cos(a) * rad * RX;
      out[1] = CY + Math.sin(a) * rad * RY;
      out[2] = b.size * (0.55 + 0.45 * g);
      out[3] = b.alpha * g;
      out[4] = b.rot + b.drift * (t - 11) - (1 - g) * 0.18;
    } else if (b.kind === 2) {
      const g = fx.ease.inOut(fx.range(t, 7.8 + b.d, 10.6 + b.d * 0.3));
      out[0] = b.x + b.vx * (t - 11);
      out[1] = b.y + b.vy * (t - 11);
      out[2] = b.size * (0.85 + 0.15 * g);
      out[3] = b.alpha * g;
      out[4] = b.rot + 0.01 * (t - 11);
    } else {
      const g = fx.ease.inOut(fx.range(t, 7.0, 10.4));
      const a = b.a + b.w * (t - 11) * 3 + (1 - g) * 1.2;
      const rr = b.rr * (0.6 + 0.4 * g);
      out[0] = CX + Math.cos(a) * rr;
      out[1] = CY + Math.sin(a) * rr;
      out[2] = b.size * (0.7 + 0.3 * g);
      out[3] = b.alpha * g;
      out[4] = a + Math.PI / 2;
    }
    return out;
  }

  function buildCamp() {
    const T = WD.TENTS;
    N = T.length;
    const r = fx.rng(777);
    tStart = new Float32Array(N);
    const sideOf = (t) => {
      const ax = Math.abs(t.x), ay = Math.abs(t.y);
      if (ay >= ax) return t.y < 0 ? 0 : 2; // east (up) : west (down)
      return t.x > 0 ? 1 : 3; // south (right) : north (left)
    };
    for (let i = 0; i < N; i++) {
      const t = T[i];
      const d = Math.hypot(t.x, t.y);
      if (t.ring === 0) tStart[i] = 2.35 + ((d - 55) / 45) * 0.35 + sideOf(t) * 0.12 + r() * 0.18;
      else tStart[i] = 3.25 + sideOf(t) * 0.22 + ((d - 150) / 230) * 2.25 + r() * 0.22;
    }
    // block bounding boxes per tribe
    const map = new Map();
    T.forEach((t, i) => {
      let b = map.get(t.tribe);
      if (!b) { b = { tribe: t.tribe, ring: t.ring, x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9, s: 1e9 }; map.set(t.tribe, b); }
      const e = Math.max(t.w, t.h) * 0.5;
      b.x0 = Math.min(b.x0, t.x - e); b.x1 = Math.max(b.x1, t.x + e);
      b.y0 = Math.min(b.y0, t.y - e); b.y1 = Math.max(b.y1, t.y + e);
      b.s = Math.min(b.s, tStart[i]);
    });
    blocks = [...map.values()];
    // ink construction drawing
    const M = WD.MISHKAN;
    inkItems = [
      { k: 'l', x1: 0, y1: -330, x2: 0, y2: 330, t0: 0.0, t1: 2.2, a: 0.16 },
      { k: 'l', x1: -330, y1: 0, x2: 330, y2: 0, t0: 0.3, t1: 2.4, a: 0.16 },
      { k: 'c', x: 0, y: 0, r: 118, t0: 0.5, t1: 2.6, a: 0.14 },
      { k: 'c', x: 0, y: 0, r: 318, t0: 0.8, t1: 3.6, a: 0.12 },
      { k: 'r', x: -98, y: -98, w: 196, h: 196, t0: 1.9, t1: 3.0, a: 0.28 },
      { k: 'r', x: -286, y: -286, w: 572, h: 572, t0: 0.2, t1: 3.2, a: 0.1 },
      { k: 'r', x: M.x, y: M.y, w: M.w, h: M.h, t0: 1.2, t1: 2.3, a: 0.85, top: 1 },
      { k: 'r', x: M.x + 8, y: M.y + 6, w: M.w - 16, h: M.h * 0.42, t0: 1.9, t1: 2.6, a: 0.7, top: 1 },
    ];
    for (const b of blocks) {
      const m = 4;
      inkItems.push({ k: 'r', x: b.x0 - m, y: b.y0 - m, w: b.x1 - b.x0 + 2 * m, h: b.y1 - b.y0 + 2 * m,
        t0: b.s - 0.9, t1: b.s + 0.1, a: b.ring ? 0.34 : 0.3 });
    }
    // campfires in the lanes around the blocks
    fires = [];
    for (const b of blocks) {
      const n = b.ring ? 5 : 3;
      for (let k = 0; k < n; k++) {
        const side = (r() * 4) | 0, u = 0.15 + r() * 0.7, off = 5 + r() * 4;
        let x, y;
        if (side === 0) { x = fx.lerp(b.x0, b.x1, u); y = b.y0 - off; }
        else if (side === 1) { x = fx.lerp(b.x0, b.x1, u); y = b.y1 + off; }
        else if (side === 2) { x = b.x0 - off; y = fx.lerp(b.y0, b.y1, u); }
        else { x = b.x1 + off; y = fx.lerp(b.y0, b.y1, u); }
        fires.push({ x, y, ph: r() * 100, s: 0.7 + r() * 0.6, d: r() * 1.6 });
      }
    }
    // shadow geometry: tent rect corners in world coords
    tentPoly = new Float32Array(N * 8);
    T.forEach((t, i) => {
      const c = Math.cos(t.rot), s = Math.sin(t.rot);
      const P = [[-t.w / 2, -t.h / 2], [t.w / 2, -t.h / 2], [t.w / 2, t.h / 2], [-t.w / 2, t.h / 2]];
      P.forEach(([x, y], k) => { tentPoly[i * 8 + 2 * k] = t.x + x * c - y * s; tentPoly[i * 8 + 2 * k + 1] = t.y + x * s + y * c; });
    });
  }

  function buildGrains(env) {
    const n = env.GRAINS, T = WD.TENTS;
    const r = fx.rng(4242);
    G = {
      tent: new Uint16Array(n), ox: new Float32Array(n), oy: new Float32Array(n),
      spin: new Float32Array(n), kind: new Uint8Array(n), blob: new Uint16Array(n),
      bx: new Float32Array(n), by: new Float32Array(n), tw: new Float32Array(n), tp: new Float32Array(n),
      rise: new Float32Array(n), arc: new Float32Array(n), jit: new Float32Array(n),
    };
    const gauss = () => { let s = 0; for (let k = 0; k < 4; k++) s += r(); return (s - 2) / 1.15; };
    for (let i = 0; i < n; i++) {
      const j = i % T.length, t = T[j];
      G.tent[i] = j;
      // point on the tent outline (full size), world offset from centre
      const per = 2 * (t.w + t.h);
      let p = ((i * 0.61803398875 + j * 0.137) % 1) * per;
      let lx, ly;
      if (p < t.w) { lx = -t.w / 2 + p; ly = -t.h / 2; }
      else if ((p -= t.w) < t.h) { lx = t.w / 2; ly = -t.h / 2 + p; }
      else if ((p -= t.h) < t.w) { lx = t.w / 2 - p; ly = t.h / 2; }
      else { p -= t.w; lx = -t.w / 2; ly = t.h / 2 - p; }
      const c = Math.cos(t.rot), s = Math.sin(t.rot);
      G.ox[i] = lx * c - ly * s; G.oy[i] = lx * s + ly * c;
      G.spin[i] = (r() < 0.5 ? -1 : 1) * (0.8 + r() * 0.6);
      const q = r();
      G.kind[i] = q < 0.78 ? 0 : q < 0.87 ? 1 : 2;
      if (G.kind[i] === 0) G.blob[i] = ringIdx[(r() * ringIdx.length) | 0];
      else if (G.kind[i] === 2) G.blob[i] = canopyIdx[(r() * canopyIdx.length) | 0];
      if (G.kind[i] === 1) { G.bx[i] = 8 + Math.pow(r(), 0.9) * 130; G.by[i] = r() * Math.PI * 2; }
      else { G.bx[i] = gauss() * 0.24; G.by[i] = gauss() * 0.2; }
      G.tw[i] = 1.2 + r() * 3.2; G.tp[i] = r() * 6.28;
      G.rise[i] = 6.9 + r() * 2.7 + (G.kind[i] === 1 ? 0.3 : 0);
      G.arc[i] = (r() - 0.5) * 2;
      G.jit[i] = r();
    }
  }

  // ---------------- drawing pieces ----------------
  function drawGround(ctx, cam, env, t, nightOverride) {
    ctx.save();
    WD.applyCam(ctx, cam, env);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(sand, SX0, SY0, sand.width / SK, sand.height / SK);
    ctx.restore();
    const mul = nightOverride != null ? lerp3([255, 255, 255], [88, 98, 172], nightOverride) : keyed(GROUND_MUL, t);
    const ind = nightOverride != null ? 0.36 * nightOverride : 0.36 * nightK(t);
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = fx.rgba(mul, 1);
    ctx.fillRect(0, 0, env.W, env.H);
    ctx.globalCompositeOperation = 'source-over';
    if (ind > 0.002) { ctx.fillStyle = `rgba(18,20,58,${ind})`; ctx.fillRect(0, 0, env.W, env.H); }
    ctx.restore();
  }

  function strokeInk(ctx, it, p, lw) {
    ctx.lineWidth = lw;
    ctx.beginPath();
    let len;
    if (it.k === 'l') { ctx.moveTo(it.x1, it.y1); ctx.lineTo(it.x2, it.y2); len = Math.hypot(it.x2 - it.x1, it.y2 - it.y1); }
    else if (it.k === 'c') { ctx.arc(it.x, it.y, it.r, -Math.PI / 2, Math.PI * 1.5); len = Math.PI * 2 * it.r; }
    else { ctx.rect(it.x, it.y, it.w, it.h); len = 2 * (it.w + it.h); }
    if (p < 0.999) ctx.setLineDash([len * p, len * 2]); else ctx.setLineDash([]);
    ctx.stroke();
  }

  function drawInk(ctx, cam, env, t, night, top) {
    const fade = 1 - 0.85 * night;
    if (fade <= 0.01) return;
    ctx.save();
    WD.applyCam(ctx, cam, env);
    ctx.strokeStyle = 'rgb(59,38,22)';
    ctx.lineCap = 'round';
    for (const it of inkItems) {
      const p = fx.ease.inOut(fx.range(t, it.t0, it.t1));
      if (p <= 0 || !it.top !== !top) continue;
      ctx.globalAlpha = it.a * fade;
      strokeInk(ctx, it, p, 1.05 / cam.zoom);
    }
    ctx.setLineDash([]);
    if (top) { ctx.restore(); return; }
    // tents: an ink footprint sketched just before each tent rises
    const T = WD.TENTS;
    const buckets = [new Path2D(), new Path2D(), new Path2D()];
    let any = false;
    for (let i = 0; i < N; i++) {
      const s = tStart[i];
      if (t < s - 0.55 || t > s + 1.4) continue;
      const a = t < s ? (t - (s - 0.55)) / 0.55 : 1 - (t - s) / 1.4;
      const bk = a > 0.66 ? 2 : a > 0.33 ? 1 : 0;
      const P = buckets[bk], o = i * 8;
      P.moveTo(tentPoly[o], tentPoly[o + 1]);
      P.lineTo(tentPoly[o + 2], tentPoly[o + 3]); P.lineTo(tentPoly[o + 4], tentPoly[o + 5]);
      P.lineTo(tentPoly[o + 6], tentPoly[o + 7]); P.closePath();
      any = true;
    }
    if (any) {
      ctx.lineWidth = 0.8 / cam.zoom;
      buckets.forEach((P, k) => { ctx.globalAlpha = (0.2 + 0.25 * k) * fade; ctx.stroke(P); });
    }
    ctx.restore();
  }

  function drawShadows(ctx, cam, env, t, appear) {
    const sun = 1 - fx.smooth(fx.range(t, 6.0, 8.6));
    if (sun <= 0.01) return;
    // low western sun (bottom of frame): shadows reach east (up), lengthening toward sunset
    const L = 7 + 13 * fx.smooth(fx.range(t, 0, 7.5));
    const vx = 0.22 * L, vy = -L;
    const P = new Path2D();
    for (let i = 0; i < N; i++) {
      const a = appear(i);
      if (a < 0.05) continue;
      const o = i * 8, k = a * a;
      const T = WD.TENTS[i];
      // ridge (tent top) projected; hull approx: rect + projected ridge ends
      const mx1 = (tentPoly[o] + tentPoly[o + 6]) / 2, my1 = (tentPoly[o + 1] + tentPoly[o + 7]) / 2;
      const mx2 = (tentPoly[o + 2] + tentPoly[o + 4]) / 2, my2 = (tentPoly[o + 3] + tentPoly[o + 5]) / 2;
      P.moveTo(tentPoly[o], tentPoly[o + 1]);
      P.lineTo(tentPoly[o + 2], tentPoly[o + 3]);
      P.lineTo(mx2 + vx * k, my2 + vy * k);
      P.lineTo(mx1 + vx * k, my1 + vy * k);
      P.closePath();
      P.moveTo(tentPoly[o + 6], tentPoly[o + 7]);
      P.lineTo(tentPoly[o + 4], tentPoly[o + 5]);
      P.lineTo(mx2 + vx * k, my2 + vy * k);
      P.lineTo(mx1 + vx * k, my1 + vy * k);
      P.closePath();
      void T;
    }
    // Mishkan hangings
    const M = WD.MISHKAN, ms = fx.smooth(fx.range(t, 2.2, 3.0)) * 0.55;
    ctx.save();
    WD.applyCam(ctx, cam, env);
    ctx.fillStyle = `rgba(92,52,40,${0.26 * sun})`;
    ctx.fill(P, 'nonzero');
    if (ms > 0) {
      ctx.fillStyle = `rgba(92,52,40,${0.22 * sun * ms})`;
      ctx.beginPath();
      ctx.moveTo(M.x, M.y); ctx.lineTo(M.x + vx * 0.5, M.y + vy * 0.5);
      ctx.lineTo(M.x + M.w + vx * 0.5, M.y + vy * 0.5); ctx.lineTo(M.x + M.w, M.y);
      ctx.lineTo(M.x + M.w, M.y + M.h); ctx.lineTo(M.x, M.y + M.h); ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // cover the (always-drawn) Mishkan with sand until its ink drawing is washed in
  function coverMishkan(ctx, cam, env, t) {
    const fill = fx.smooth(fx.range(t, 2.15, 3.1));
    if (fill >= 1) return;
    const M = WD.MISHKAN;
    ctx.save();
    WD.applyCam(ctx, cam, env);
    ctx.beginPath(); ctx.rect(M.x - 1, M.y - 1, M.w + 2, M.h + 2); ctx.clip();
    ctx.globalAlpha = 1 - fill;
    ctx.drawImage(sand, SX0, SY0, sand.width / SK, sand.height / SK);
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = fx.rgba(keyed(GROUND_MUL, t), 1);
    ctx.fillRect(M.x - 2, M.y - 2, M.w + 4, M.h + 4);
    ctx.restore();
  }

  // tribe banners (degalim): tiny pennants in muted stone colours, on the side facing the Mishkan
  const BANNER = {
    reuben: [168, 58, 46], simeon: [70, 120, 78], judah: [66, 128, 150], issachar: [42, 52, 96],
    zebulun: [236, 230, 214], dan: [64, 92, 150], naphtali: [128, 52, 70], gad: [120, 120, 118],
    asher: [196, 180, 120], ephraim: [34, 32, 34], manasseh: [34, 32, 34], benjamin: [150, 100, 150],
  };
  function drawBanners(ctx, cam, env, t, night) {
    ctx.save();
    WD.applyCam(ctx, cam, env);
    for (const b of blocks) {
      const col = BANNER[b.tribe];
      if (!col) continue;
      const a = fx.smooth(fx.range(t, b.s + 0.3, b.s + 1.1));
      if (a <= 0) continue;
      const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
      // inner edge, toward the Mishkan
      let px, py;
      if (Math.abs(cy) > Math.abs(cx)) { px = cx; py = cy > 0 ? b.y0 - 6 : b.y1 + 6; }
      else { py = cy; px = cx > 0 ? b.x0 - 6 : b.x1 + 6; }
      const wave = Math.sin(t * 3.2 + cx * 0.05) * 0.8;
      const c = lerp3(col, [60, 62, 96], night * 0.55);
      ctx.globalAlpha = a;
      // shadow of pole + flag (sun from the west)
      ctx.fillStyle = `rgba(40,20,10,${0.28 * (1 - night)})`;
      ctx.fillRect(px - 0.4, py - 9 * (1 - night * 0.8), 0.8, 9 * (1 - night * 0.8));
      // flag
      ctx.fillStyle = fx.rgba(c, 0.92);
      ctx.beginPath();
      ctx.moveTo(px, py - 1.2);
      ctx.quadraticCurveTo(px + 3.5, py - 1.2 + wave, px + 7.5, py - 0.6 + wave * 0.6);
      ctx.lineTo(px + 7.5, py + 3.6 + wave * 0.6);
      ctx.quadraticCurveTo(px + 3.5, py + 3.8 + wave, px, py + 3.8);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = `rgba(59,38,22,${0.7 * (1 - night * 0.6)})`;
      ctx.lineWidth = 0.35; ctx.stroke();
      // pole top
      ctx.fillStyle = `rgba(240,214,160,${1 - night * 0.4})`;
      ctx.beginPath(); ctx.arc(px, py - 1.2, 0.9, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawGrade(ctx, env, t) {
    const g = keyed(GRADE, t);
    if (g[0] > 254.5 && g[1] > 254.5 && g[2] > 254.5) return;
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    // warm from the west (bottom), cooler toward the east (top)
    const gr = ctx.createLinearGradient(0, env.H, 0, 0);
    gr.addColorStop(0, fx.rgba(g, 1));
    gr.addColorStop(1, fx.rgba(lerp3(g, [255, 255, 255], 0.25), 1));
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, env.W, env.H);
    ctx.restore();
    // a soft golden sun wash from the west during the golden hour
    const sw = fx.smooth(fx.range(t, 2.5, 6.0)) * (1 - fx.smooth(fx.range(t, 6.8, 8.8)));
    if (sw > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const gr2 = ctx.createLinearGradient(0, env.H, 0, env.H * 0.35);
      gr2.addColorStop(0, `rgba(255,186,100,${0.12 * sw})`);
      gr2.addColorStop(1, 'rgba(255,186,100,0)');
      ctx.fillStyle = gr2; ctx.fillRect(0, 0, env.W, env.H);
      ctx.restore();
    }
  }

  function drawLights(ctx, cam, env, t, alphaMul) {
    const fl = fx.smooth(fx.range(t, 8.0, 10.6)) * alphaMul;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (fl > 0.01) {
      const spr = fx.glow(18, [255, 170, 80]);
      const core = fx.glow(4, [255, 214, 150]);
      for (const f of fires) {
        const a = fx.smooth(fx.range(t, 8.0 + f.d, 9.2 + f.d)) * alphaMul;
        if (a <= 0.01) continue;
        const [x, y] = WD.toScreen(cam, f.x, f.y, env);
        const fk = 0.75 + 0.25 * fx.noise(t * 5 + f.ph, f.ph);
        const r = 16 * f.s * fk * cam.zoom / 1.45;
        ctx.globalAlpha = 0.55 * a;
        ctx.drawImage(spr, x - r, y - r, 2 * r, 2 * r);
        ctx.globalAlpha = 0.8 * a * fk;
        ctx.drawImage(core, x - 3, y - 3, 6, 6);
      }
    }
    // pillar light on the ground over the Mishkan
    const pg = fx.ease.inOut(fx.range(t, 7.0, 10.4)) * alphaMul;
    if (pg > 0.01) {
      const [x, y] = WD.toScreen(cam, 0, 0, env);
      const br = 1 + 0.04 * Math.sin(t * 0.9);
      let s = fx.glow(300, [255, 196, 120]);
      ctx.globalAlpha = 0.34 * pg;
      ctx.drawImage(s, x - 300 * br, y - 300 * br, 600 * br, 600 * br);
      s = fx.glow(110, [255, 236, 200]);
      ctx.globalAlpha = 0.42 * pg;
      ctx.drawImage(s, x - 110, y - 110, 220, 220);
    }
    ctx.restore();
  }

  const tmp = [0, 0, 0, 0, 0];
  function drawClouds(ctx, t, env, alphaMul) {
    alphaMul = alphaMul == null ? 1 : alphaMul;
    if (t < 5.75) return;
    const c = cctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;
    c.clearRect(0, 0, cloudLayer.width, cloudLayer.height);
    c.setTransform(CL, 0, 0, CL, 0, 0);
    const night = nightK(t);
    // light pool beneath the ring (clouds lighting the ground and each other from within)
    const lg = fx.glow(160, [220, 214, 255]);
    const gg = fx.glow(120, [255, 206, 140]);
    for (const b of blobs) {
      blobAt(b, t, tmp);
      const [x, y, s, a, rot] = tmp;
      if (a <= 0.01) continue;
      if (x < -s || x > env.W + s || y < -s || y > env.H + s) continue;
      if (b.kind === 1 && b.inner) {
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = 0.22 * a * (0.4 + 0.6 * night);
        c.drawImage(gg, x - s * 0.9, y - s * 0.9, s * 1.8, s * 1.8);
      } else if (b.kind === 1) {
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = 0.14 * a * night;
        c.drawImage(lg, x - s, y - s, s * 2, s * 2);
      }
      c.globalCompositeOperation = b.kind >= 2 ? 'lighter' : 'source-over';
      c.globalAlpha = a;
      c.save();
      c.translate(x, y); c.rotate(rot);
      const spr = sprites[b.spr];
      c.drawImage(spr, -s, -s * 0.66, 2 * s, 1.32 * s);
      c.restore();
    }
    // pillar core: a bright soft eye at the heart of the vortex
    const pg = fx.ease.inOut(fx.range(t, 7.0, 10.4));
    if (pg > 0.01) {
      c.globalCompositeOperation = 'lighter';
      const e = fx.glow(60, [255, 240, 214]);
      c.globalAlpha = 0.4 * pg;
      c.drawImage(e, CX - 60, CY - 60, 120, 120);
      const e2 = fx.glow(170, [255, 210, 150]);
      c.globalAlpha = 0.2 * pg;
      c.drawImage(e2, CX - 170, CY - 170, 340, 340);
    }
    // time-of-day tint of the cloud forms: rose-gold at sunset, pearl at night
    const warm = 1 - night;
    if (warm > 0.02) {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalCompositeOperation = 'source-atop';
      c.globalAlpha = 0.42 * warm;
      c.fillStyle = 'rgb(255,178,130)';
      c.fillRect(0, 0, cloudLayer.width, cloudLayer.height);
    }
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;
    c.setTransform(1, 0, 0, 1, 0, 0);

    ctx.save();
    ctx.globalAlpha = alphaMul;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(cloudLayer, 0, 0, env.W, env.H);
    // soft bloom: the clouds glow from within
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.12 * alphaMul * (0.3 + 0.7 * night);
    ctx.drawImage(cloudLayer, 0, 0, env.W, env.H);
    ctx.restore();
  }

  function camOpts(t) {
    return {
      appear: (i) => fx.smooth((t - tStart[i]) / 0.6),
      night: nightK(t),
      glow: glowK(t),
    };
  }

  function drawCampCached(ctx, cam, opts, env, t) {
    // Static end state: reuse one rendering of the camp (pixel-identical to drawCamp).
    const tr = ctx.getTransform();
    const staticCam = cam.x === WD.CAM_CAMP.x && cam.y === WD.CAM_CAMP.y && cam.zoom === WD.CAM_CAMP.zoom;
    if (!staticCam || t < 7.4) { WD.drawCamp(ctx, cam, opts, env); return; }
    const key = [tr.a, tr.d, opts.night.toFixed(4), opts.glow.toFixed(4)].join('|');
    // only cache when night/glow have settled (t >= 10.9); otherwise draw live
    if (t < 10.9) { WD.drawCamp(ctx, cam, opts, env); return; }
    if (campCache.key !== key) {
      const pw = Math.round(env.W * tr.a), ph = Math.round(env.H * tr.d);
      if (!campCache.c || campCache.c.width !== pw || campCache.c.height !== ph) campCache.c = fx.canvas(pw, ph);
      const g = campCache.c.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, pw, ph);
      g.setTransform(tr.a, 0, 0, tr.d, 0, 0);
      WD.drawCamp(g, cam, opts, env);
      campCache.key = key;
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(campCache.c, 0, 0);
    ctx.restore();
  }

  S.beats[2] = {
    init(env) {
      fx = env.fx; WD = env.world; W = env.W; H = env.H;
      sand = makeSand();
      const bright = { lit: [252, 250, 255], shade: [170, 168, 210], gold: [255, 224, 172], g: 0.5, a: 0.94 };
      const deep = { lit: [236, 222, 236], shade: [104, 100, 150], gold: [255, 200, 140], g: 0.3, a: 0.8 };
      sprites = [0, 1, 2, 3, 4, 5].map((k) => makeCloudSprite(k + 1, 192, bright))
        .concat([0, 1, 2, 3].map((k) => makeCloudSprite(k + 21, 192, deep)));
      buildClouds();
      ringIdx = RING_IDX();
      canopyIdx = blobs.map((b, i) => (b.kind === 2 ? i : -1)).filter((i) => i >= 0);
      cloudLayer = fx.canvas(Math.round(W * CL), Math.round(H * CL));
      cctx = cloudLayer.getContext('2d');
      buildCamp();
      buildGrains(env);
    },

    draw(ctx, t, env) {
      const cam = camAt(t);
      const opts = camOpts(t);
      const late = t >= 10.9;
      const endOpts = late ? { appear: () => 1, night: 1, glow: 0.5 } : opts;
      const SK_ = window.B2SKIP || {}, TM_ = window.B2TIME || {};
      const tm = (k, f) => { if (SK_[k]) return; const a = performance.now(); f(); TM_[k] = (TM_[k] || 0) + performance.now() - a; };
      ctx.fillStyle = '#16193a';
      ctx.fillRect(0, 0, env.W, env.H);
      tm('ground', () => drawGround(ctx, cam, env, t));
      tm('ink', () => drawInk(ctx, cam, env, t, opts.night));
      tm('shadows', () => drawShadows(ctx, cam, env, t, opts.appear));
      tm('camp', () => drawCampCached(ctx, cam, endOpts, env, t));
      tm('cover', () => coverMishkan(ctx, cam, env, t));
      tm('ink2', () => drawInk(ctx, cam, env, t, opts.night, true));
      tm('banners', () => drawBanners(ctx, cam, env, t, opts.night));
      tm('grade', () => drawGrade(ctx, env, t));
      tm('lights', () => drawLights(ctx, cam, env, t, 1));
      tm('clouds', () => drawClouds(ctx, t, env, 1));
    },

    grains(t, out, env) {
      const n = env.GRAINS, T = WD.TENTS;
      const cam = camAt(t);
      const z = cam.zoom, hx = env.W / 2, hy = env.H / 2;
      for (let i = 0; i < n; i++) {
        const j = G.tent[i], tt = T[j];
        const s = tStart[j];
        // 1) on the sand along the tent outline; 2) swirl up into the outline as the tent rises
        let ox = G.ox[i], oy = G.oy[i], w = 0.4;
        const u = fx.range(t, s - 0.75, s + 0.45);
        if (u > 0 && u < 1) {
          const e = Math.sin(Math.PI * u);
          const th = G.spin[i] * Math.PI * 2 * fx.ease.inOut(u);
          const c = Math.cos(th), sn = Math.sin(th), rf = 1 + 1.5 * e;
          const nx = (ox * c - oy * sn) * rf, ny = (ox * sn + oy * c) * rf;
          ox = nx; oy = ny;
          w = 0.4 + 0.45 * e;
        } else if (u >= 1) {
          w = 0.3 + 0.08 * Math.sin(t * G.tw[i] + G.tp[i]);
        }
        let x = (tt.x + ox - cam.x) * z + hx;
        let y = (tt.y + oy - cam.y) * z + hy;
        // 3) rise into the clouds of glory
        const rk = fx.range(t, G.rise[i], G.rise[i] + 1.7);
        if (rk > 0) {
          let tx, ty;
          const kd = G.kind[i];
          if (kd === 1) {
            const g = fx.ease.inOut(fx.range(t, 7.0, 10.4));
            const rr = G.bx[i] * (0.6 + 0.4 * g);
            const a = G.by[i] + t * (0.22 + 9 / (G.bx[i] + 12));
            tx = CX + Math.cos(a) * rr; ty = CY + Math.sin(a) * rr;
          } else {
            const b = blobs[G.blob[i]];
            blobAt(b, t, tmp);
            const c = Math.cos(tmp[4]), sn = Math.sin(tmp[4]);
            const dx = G.bx[i] * tmp[2] * 2, dy = G.by[i] * tmp[2] * 1.6;
            tx = tmp[0] + dx * c - dy * sn; ty = tmp[1] + dx * sn + dy * c;
          }
          const e = fx.ease.inOut(rk);
          const ddx = tx - x, ddy = ty - y;
          const arc = Math.sin(Math.PI * e) * 0.28 * G.arc[i];
          x = x + ddx * e - ddy * arc;
          y = y + ddy * e + ddx * arc;
          const tw = 0.5 + 0.5 * Math.sin(t * G.tw[i] + G.tp[i]);
          const wc = kd === 0 ? 0.3 + 0.4 * tw : 0.2 + 0.3 * tw;
          w = w + (wc - w) * e + 0.25 * Math.sin(Math.PI * e);
        }
        out[3 * i] = x; out[3 * i + 1] = y; out[3 * i + 2] = w;
      }
    },

    tint: (t) => {
      const k = fx ? fx.smooth(fx.range(t, 7, 11)) : 0;
      return [255, 216 + 22 * k, 154 + 64 * k];
    },

    // Shared with beat 3 (read-only helpers): the end-state look at any camera / time.
    _dbg: () => sprites,
    scene: {
      ground: (ctx, cam, env, night) => drawGround(ctx, cam, env, 13, night == null ? 1 : night),
      lights: (ctx, cam, env, t, a) => drawLights(ctx, cam, env, t == null ? 13 : t, a == null ? 1 : a),
      clouds: (ctx, t, env, a) => drawClouds(ctx, t == null ? 13 : t, env, a),
      campOpts: { night: 1, glow: 0.5 },
    },
  };
})();
