// Beat 2 (film 12-25 s, local t 0..13): the Camp of Israel forms from above, dusk falls,
// and the Clouds of Glory gather around it.
//
// END STATE (H2, held stable for t = 11..13; only slow drift):
//   camera  = WORLD.CAM_CAMP exactly ({x:0, y:0, zoom:1.45}); static from t = 6.8.
//   camp    = WORLD.drawCamp(ctx, CAM_CAMP, { appear: () => 1, night: 1, glow: 0.5 }, env)
//             (from t >= 10.9 this is drawn from a cached render of exactly that call).
//   ground  = the day sand texture multiplied by rgb(88,98,172), then #12143a at alpha 0.36:
//             deep, cool, moonlit indigo on which the wind ripples still read. No colour veil.
//             Beat 3 can draw it at any camera: MIDBAR.beats[2].scene.ground(ctx, cam, env, 1)
//   lights  = warm pillar glow on the ground at the Mishkan (screen 540,960), ~60 tiny flickering
//             campfire glows in the lanes between blocks: scene.lights(ctx, cam, env, t, alpha)
//   clouds  = pearl-white/gold luminous clouds on a rounded-square ring (superellipse p=3.2,
//             radii 560 x 600 px around 540,960, so the sides run partly off-frame), a deeper
//             back ring and larger dim clouds beyond it, faint canopy veils over the camp, and
//             the pillar vortex + soft eye over the Mishkan. Everything rotates slowly about
//             (540,960) at 0.01 rad/s. scene.clouds(ctx, t, env, alpha), t = b2 local time (13 + s).
//   grains  = sparkling fine structure: ~78% trace the ring clouds, ~9% spiral in the pillar
//             (r 8..138 px), ~13% in the canopy; w 0.2..0.7, twinkling.
(function () {
  const S = (window.MIDBAR = window.MIDBAR || { beats: {} });

  let fx, WD, W, H, N;
  // sand texture in world space
  const SX0 = -440, SY0 = -760, SK = 1.8, SK2 = 1.45; // SK2 = CAM_CAMP zoom: 1:1 blit at 1080
  let sand = null, sandDay2 = null, sandNight = null;
  // clouds
  let sprites = [], blobs = [], cloudLayer = null, cctx = null;
  const CL = 0.5; // cloud layer resolution factor
  // camp
  let tStart, blocks, fires, inkItems, tentPoly, shQ, blockOf;
  const SHV = [3.4, -15.5]; // shadow vector in world units (toward the east = up)
  // grains
  let G = null;
  // cached night camp (only when everything is static)
  const campCache = {};
  const END_OPTS = { appear: () => 1, night: 1, glow: 0.5 };

  const CX = 540, CY = 960;
  const RX = 560, RY = 600, SP = 3.2;

  // ---------------- timing ----------------
  const nightK = (t) => fx.smooth(fx.range(t, 6.4, 10.9));
  const glowK = (t) => 0.5 * nightK(t);

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
        rot: a - Math.PI / 2 + (r() - 0.5) * 0.5, alpha: 0.34 + r() * 0.14, grp: 0 });
    }
    // the ring itself: a deeper back layer, then the bright front layer
    const nB = 24;
    for (let k = 0; k < nB; k++) {
      const a = ((k + 0.5) / nB) * Math.PI * 2 + (r() - 0.5) * 0.1;
      blobs.push({ kind: 1, a, rf: 1.06 + (r() - 0.5) * 0.08, size: 150 + r() * 70, spr: 6 + ((r() * 4) | 0),
        rot: a - Math.PI / 2 + (r() - 0.5) * 0.4, alpha: 0.7 + r() * 0.2, grp: 0, inner: false });
    }
    const nR = 34;
    for (let k = 0; k < nR; k++) {
      const a = (k / nR) * Math.PI * 2 + (r() - 0.5) * 0.1;
      const inner = r() < 0.7;
      blobs.push({ kind: 1, a, rf: 0.97 + (r() - 0.5) * 0.08, size: 115 + r() * 65, spr: (r() * 6) | 0,
        rot: (inner ? a + Math.PI / 2 : a - Math.PI / 2) + (r() - 0.5) * 0.35, alpha: 0.78 + r() * 0.2,
        grp: 1, inner });
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

  // ring cloud groups: 0 outer, 1 deep back ring, 2-3 bright front ring
  // (group 2 = the canopy veils over the camp)
  const GROUP_D = [0.0, 0.7, -1], OMEGA = 0.01, CANOPY = 2;
  function groupT(k, t) {
    const g = k === CANOPY ? fx.ease.inOut(fx.range(t, 7.8, 10.8)) : fx.ease.inOut(fx.range(t, 5.7 + GROUP_D[k], 9.4 + GROUP_D[k]));
    const sw = k === CANOPY ? 0 : 1 - g;
    const th = OMEGA * (t - 11) - sw * 0.2;
    const s = (1 + sw * 0.14) * (1 + 0.006 * Math.sin(0.5 * t));
    return { g, th, s, c: Math.cos(th), sn: Math.sin(th) };
  }
  const LM = 240; // ring layer margin (logical px)
  let ringLayers = [], ringAll = null;
  function makeRingLayers() {
    const w = Math.round((W + 2 * LM) * CL), h = Math.round((H + 2 * LM) * CL);
    const lg = fx.glow(160, [220, 214, 255]);
    const gg = fx.glow(120, [255, 206, 140]);
    const paint = (c, k) => {
      c.setTransform(CL, 0, 0, CL, LM * CL, LM * CL);
      for (const b of blobs) {
        if (k === CANOPY && b.kind === 2) {
          c.globalCompositeOperation = 'lighter';
          c.globalAlpha = b.alpha;
          c.save();
          c.translate(b.x, b.y); c.rotate(b.rot);
          c.drawImage(sprites[b.spr], -b.size, -b.size * 0.66, 2 * b.size, 1.32 * b.size);
          c.restore();
          continue;
        }
        if ((b.kind !== 0 && b.kind !== 1) || b.grp !== k) continue;
        const rad = ringR(b.a) * b.rf;
        const x = CX + Math.cos(b.a) * rad * RX, y = CY + Math.sin(b.a) * rad * RY, s = b.size;
        if (b.kind === 1) {
          c.globalCompositeOperation = 'lighter';
          c.globalAlpha = b.inner ? 0.22 * b.alpha : 0.14 * b.alpha;
          const sp = b.inner ? gg : lg, e = b.inner ? 0.9 : 1;
          c.drawImage(sp, x - s * e, y - s * e, 2 * s * e, 2 * s * e);
        }
        c.globalCompositeOperation = 'source-over';
        c.globalAlpha = b.alpha;
        c.save();
        c.translate(x, y); c.rotate(b.rot);
        c.drawImage(sprites[b.spr], -s, -s * 0.66, 2 * s, 1.32 * s);
        c.restore();
      }
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    };
    ringLayers = GROUP_D.map((_, k) => { const cv = fx.canvas(w, h); paint(cv.getContext('2d'), k); return cv; });
    ringAll = fx.canvas(w, h);
    const g = ringAll.getContext('2d');
    ringLayers.forEach((cv) => g.drawImage(cv, 0, 0));
  }

  // position of blob b at local time t in screen coords: [x, y, size, alpha, rot]
  function blobAt(b, t, out) {
    if (b.kind === 0 || b.kind === 1) {
      // clouds condense in place in four groups, swirling gently inward as they gather
      const gt = groupT(b.grp, t);
      const rad = ringR(b.a) * b.rf;
      const x0 = Math.cos(b.a) * rad * RX * gt.s, y0 = Math.sin(b.a) * rad * RY * gt.s;
      out[0] = CX + x0 * gt.c - y0 * gt.sn;
      out[1] = CY + x0 * gt.sn + y0 * gt.c;
      out[2] = b.size * gt.s;
      out[3] = b.alpha * gt.g;
      out[4] = b.rot + gt.th;
    } else if (b.kind === 2) {
      const gt = groupT(CANOPY, t);
      const x0 = (b.x - CX) * gt.s, y0 = (b.y - CY) * gt.s;
      out[0] = CX + x0 * gt.c - y0 * gt.sn;
      out[1] = CY + x0 * gt.sn + y0 * gt.c;
      out[2] = b.size * gt.s;
      out[3] = b.alpha * gt.g;
      out[4] = b.rot + gt.th;
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
    // long shadows (low western sun, at the bottom of the frame): the footprint edge facing the
    // shadow direction, extruded to the projected ridge line
    shQ = new Float32Array(N * 8);
    const vl = Math.hypot(SHV[0], SHV[1]), ux = SHV[0] / vl, uy = SHV[1] / vl;
    T.forEach((t, i) => {
      const o = i * 8;
      let best = -1e9, e1 = 0;
      for (let k = 0; k < 4; k++) {
        const ax = tentPoly[o + 2 * k], ay = tentPoly[o + 2 * k + 1];
        const bx = tentPoly[o + ((2 * k + 2) % 8)], by = tentPoly[o + ((2 * k + 3) % 8)];
        const sc = ((ax + bx) / 2 - t.x) * ux + ((ay + by) / 2 - t.y) * uy;
        if (sc > best) { best = sc; e1 = k; }
      }
      const E1x = tentPoly[o + 2 * e1], E1y = tentPoly[o + 2 * e1 + 1];
      const E2x = tentPoly[o + ((2 * e1 + 2) % 8)], E2y = tentPoly[o + ((2 * e1 + 3) % 8)];
      const c = Math.cos(t.rot), s = Math.sin(t.rot);
      let R1x = t.x - (t.w / 2) * c, R1y = t.y - (t.w / 2) * s, R2x = t.x + (t.w / 2) * c, R2y = t.y + (t.w / 2) * s;
      const dx = E2x - E1x, dy = E2y - E1y;
      if ((R1x - R2x) * dx + (R1y - R2y) * dy > 0) { [R1x, R2x] = [R2x, R1x]; [R1y, R2y] = [R2y, R1y]; }
      shQ.set([E1x, E1y, E2x, E2y, R1x, R1y, R2x, R2y], o);
    });
    blockOf = new Uint8Array(N);
    blocks.forEach((b) => { b.end = -1e9; b.tents = []; });
    T.forEach((t, i) => {
      const k = blocks.findIndex((b) => b.tribe === t.tribe);
      blockOf[i] = k; blocks[k].tents.push(i);
      blocks[k].end = Math.max(blocks[k].end, tStart[i] + 0.6);
    });
    blocks.forEach((b) => { b.shadow = new Path2D(); for (const i of b.tents) addShadow(b.shadow, i, 1); });
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
  const isCamp = (cam) => cam.x === WD.CAM_CAMP.x && cam.y === WD.CAM_CAMP.y && cam.zoom === WD.CAM_CAMP.zoom;
  function drawGround(ctx, cam, env, t, nightOverride) {
    const n = nightOverride != null ? nightOverride : nightK(t);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    const tr = ctx.getTransform();
    if (isCamp(cam) && tr.b === 0 && tr.c === 0) {
      // static overview camera: blit the 1.45 px/unit textures (1:1 at a 1080 px render)
      const [x0, y0] = WD.toScreen(cam, SX0, SY0, env);
      const w = -2 * SX0 * cam.zoom, h = -2 * SY0 * cam.zoom;
      if (n < 0.999) ctx.drawImage(sandDay2, x0, y0, w, h);
      if (n > 0.001) { ctx.globalAlpha = n; ctx.drawImage(sandNight, x0, y0, w, h); }
    } else {
      WD.applyCam(ctx, cam, env);
      const x = SX0, y = SY0, w = -2 * SX0, h = -2 * SY0;
      if (n < 0.999) ctx.drawImage(sand, x, y, w, h);
      if (n > 0.001) { ctx.globalAlpha = n; ctx.drawImage(sandNight, x, y, w, h); }
    }
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

  function addShadow(P, i, k) {
    const o = i * 8, vx = SHV[0] * k, vy = SHV[1] * k;
    P.moveTo(shQ[o], shQ[o + 1]);
    P.lineTo(shQ[o + 2], shQ[o + 3]);
    P.lineTo(shQ[o + 6] + vx, shQ[o + 7] + vy);
    P.lineTo(shQ[o + 4] + vx, shQ[o + 5] + vy);
    P.closePath();
  }
  function drawShadows(ctx, cam, env, t, appear) {
    const sun = 1 - fx.smooth(fx.range(t, 6.0, 8.6));
    if (sun <= 0.01) return;
    ctx.save();
    WD.applyCam(ctx, cam, env);
    ctx.fillStyle = `rgba(92,52,40,${0.26 * sun})`;
    for (const b of blocks) {
      if (t < b.s) continue;
      if (t >= b.end) { ctx.fill(b.shadow); continue; }
      const P = new Path2D();
      for (const i of b.tents) { const a = appear(i); if (a > 0.05) addShadow(P, i, a * a); }
      ctx.fill(P);
    }
    // Mishkan hangings
    const M = WD.MISHKAN, ms = fx.smooth(fx.range(t, 2.2, 3.0)) * 0.55;
    if (ms > 0) {
      const vx = SHV[0] * 0.4, vy = SHV[1] * 0.4;
      ctx.fillStyle = `rgba(92,52,40,${0.22 * sun * ms})`;
      ctx.beginPath();
      ctx.moveTo(M.x, M.y); ctx.lineTo(M.x + vx, M.y + vy);
      ctx.lineTo(M.x + M.w + vx, M.y + vy); ctx.lineTo(M.x + M.w, M.y);
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

  // light veil over everything (camp included): gold afternoon -> rose sunset -> violet dusk -> none at night
  const VEIL = [
    // t, bottom (west) rgb, top (east) rgb, alpha
    [0, [255, 206, 130], [255, 214, 150], 0.0],
    [3.5, [255, 180, 90], [255, 206, 140], 0.14],
    [6.4, [255, 120, 40], [236, 120, 100], 0.36],
    [8.2, [130, 64, 120], [70, 56, 120], 0.34],
    [9.6, [50, 46, 110], [36, 36, 96], 0.18],
    [10.9, [30, 32, 90], [30, 32, 90], 0.0],
  ];
  function drawGrade(ctx, env, t) {
    let i = 1;
    while (i < VEIL.length - 1 && t > VEIL[i][0]) i++;
    const A = VEIL[i - 1], B = VEIL[i];
    const k = fx.smooth((t - A[0]) / (B[0] - A[0]));
    const al = fx.lerp(A[3], B[3], k);
    if (al <= 0.003) return;
    const bot = lerp3(A[1], B[1], k), top = lerp3(A[2], B[2], k);
    const gr = ctx.createLinearGradient(0, env.H, 0, 0);
    gr.addColorStop(0, fx.rgba(bot, al));
    gr.addColorStop(1, fx.rgba(top, al * 0.7));
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, env.W, env.H);
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
      ctx.globalAlpha = 0.22 * pg;
      ctx.drawImage(s, x - 110, y - 110, 220, 220);
    }
    ctx.restore();
  }

  const tmp = [0, 0, 0, 0, 0];
  function drawRingLayer(c, cv, gt) {
    c.save();
    c.translate(CX, CY); c.rotate(gt.th); c.scale(gt.s, gt.s); c.translate(-CX, -CY);
    c.drawImage(cv, -LM, -LM, W + 2 * LM, H + 2 * LM);
    c.restore();
  }
  function drawClouds(ctx, t, env, alphaMul) {
    alphaMul = alphaMul == null ? 1 : alphaMul;
    if (t < 5.75) return;
    const night = nightK(t);
    const gts = GROUP_D.map((_, k) => groupT(k, t));
    if (night >= 0.9999 && gts.every((q) => q.g >= 0.9999)) {
      // end state: one direct draw of the gathered ring + canopy
      ctx.save();
      ctx.globalAlpha = alphaMul;
      ctx.imageSmoothingEnabled = true;
      drawRingLayer(ctx, ringAll, gts[0]);
      ctx.restore();
    } else {
      const c = cctx;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalCompositeOperation = 'source-over';
      c.globalAlpha = 1;
      c.clearRect(0, 0, cloudLayer.width, cloudLayer.height);
      c.setTransform(CL, 0, 0, CL, 0, 0);
      gts.forEach((gt, k) => { if (gt.g > 0.002) { c.globalAlpha = gt.g; drawRingLayer(c, ringLayers[k], gt); } });
      // time-of-day tint of the cloud forms: rose-gold at sunset, pearl at night
      const warm = 1 - night;
      if (warm > 0.002) {
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
      ctx.restore();
    }
    // the pillar: a slow vortex of cloud-light over the Mishkan, with a soft bright eye
    const pg = fx.ease.inOut(fx.range(t, 7.0, 10.4));
    if (pg > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const tint = 1 - night;
      for (const b of blobs) {
        if (b.kind !== 3) continue;
        blobAt(b, t, tmp);
        const [x, y, s, a, rot] = tmp;
        ctx.globalAlpha = 0.55 * a * alphaMul * (1 - 0.3 * tint);
        ctx.save();
        ctx.translate(x, y); ctx.rotate(rot);
        ctx.drawImage(sprites[b.spr], -s, -s * 0.66, 2 * s, 1.32 * s);
        ctx.restore();
      }
      const e = fx.glow(60, [255, 240, 214]);
      ctx.globalAlpha = 0.2 * pg * alphaMul;
      ctx.drawImage(e, CX - 60, CY - 60, 120, 120);
      const e2 = fx.glow(170, [255, 210, 150]);
      ctx.globalAlpha = 0.16 * pg * alphaMul;
      ctx.drawImage(e2, CX - 170, CY - 170, 340, 340);
      ctx.restore();
    }
  }

  function camOpts(t) {
    return {
      appear: (i) => fx.smooth((t - tStart[i]) / 0.6),
      night: nightK(t),
      glow: glowK(t),
    };
  }

  // From t = 7 the camera is static and every tent is up; only night/glow change (linearly, glow = night/2).
  // So the camp is a blend of two cached renders: A = day (night 0) and B = the exact end state
  // drawCamp(CAM_CAMP, {appear:1, night:1, glow:0.5}). For t >= 10.9 only B is drawn: pixel-identical.
  function campLayer(which, tr, env) {
    const pw = Math.round(env.W * tr.a), ph = Math.round(env.H * tr.d);
    const key = which + '|' + pw + 'x' + ph;
    if (campCache[which] && campCache[which].key === key) return campCache[which].c;
    const c = fx.canvas(pw, ph);
    const g = c.getContext('2d');
    g.setTransform(tr.a, 0, 0, tr.d, 0, 0);
    WD.drawCamp(g, WD.CAM_CAMP, which === 'A' ? { appear: () => 1, night: 0, glow: 0 } : END_OPTS, env);
    campCache[which] = { key, c };
    return c;
  }
  function drawCampCached(ctx, cam, opts, env, t) {
    const tr = ctx.getTransform();
    if (t < 7.0 || tr.b !== 0 || tr.c !== 0) { WD.drawCamp(ctx, cam, opts, env); return; }
    const m = opts.night;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, tr.e, tr.f);
    if (m < 0.9995) ctx.drawImage(campLayer('A', tr, env), 0, 0);
    if (m > 0.0005) { ctx.globalAlpha = m; ctx.drawImage(campLayer('B', tr, env), 0, 0); }
    ctx.restore();
  }

  S.beats[2] = {
    init(env) {
      fx = env.fx; WD = env.world; W = env.W; H = env.H;
      sand = makeSand();
      const w2 = Math.round(-2 * SX0 * SK2), h2 = Math.round(-2 * SY0 * SK2);
      sandDay2 = fx.canvas(w2, h2);
      sandDay2.getContext('2d').drawImage(sand, 0, 0, w2, h2);
      sandNight = fx.canvas(w2, h2);
      {
        const g = sandNight.getContext('2d');
        g.drawImage(sandDay2, 0, 0);
        g.globalCompositeOperation = 'multiply';
        g.fillStyle = 'rgb(88,98,172)'; g.fillRect(0, 0, w2, h2);
        g.globalCompositeOperation = 'source-over';
        g.fillStyle = 'rgba(18,20,58,0.36)'; g.fillRect(0, 0, w2, h2);
      }
      const bright = { lit: [252, 250, 255], shade: [170, 168, 210], gold: [255, 224, 172], g: 0.5, a: 0.94 };
      const deep = { lit: [236, 222, 236], shade: [104, 100, 150], gold: [255, 200, 140], g: 0.3, a: 0.8 };
      sprites = [0, 1, 2, 3, 4, 5].map((k) => makeCloudSprite(k + 1, 192, bright))
        .concat([0, 1, 2, 3].map((k) => makeCloudSprite(k + 21, 192, deep)));
      buildClouds();
      ringIdx = RING_IDX();
      canopyIdx = blobs.map((b, i) => (b.kind === 2 ? i : -1)).filter((i) => i >= 0);
      cloudLayer = fx.canvas(Math.round(W * CL), Math.round(H * CL));
      makeRingLayers();
      cctx = cloudLayer.getContext('2d');
      buildCamp();
      buildGrains(env);
    },

    draw(ctx, t, env) {
      const cam = camAt(t);
      const opts = camOpts(t);
      ctx.fillStyle = '#16193a';
      ctx.fillRect(0, 0, env.W, env.H);
      drawGround(ctx, cam, env, t);
      drawInk(ctx, cam, env, t, opts.night);
      drawShadows(ctx, cam, env, t, opts.appear);
      drawCampCached(ctx, cam, opts, env, t);
      coverMishkan(ctx, cam, env, t);
      drawInk(ctx, cam, env, t, opts.night, true);
      drawBanners(ctx, cam, env, t, opts.night);
      drawGrade(ctx, env, t);
      drawLights(ctx, cam, env, t, 1);
      drawClouds(ctx, t, env, 1);
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
    scene: {
      ground: (ctx, cam, env, night) => drawGround(ctx, cam, env, 13, night == null ? 1 : night),
      lights: (ctx, cam, env, t, a) => drawLights(ctx, cam, env, t == null ? 13 : t, a == null ? 1 : a),
      clouds: (ctx, t, env, a) => drawClouds(ctx, t == null ? 13 : t, env, a),
      campOpts: { night: 1, glow: 0.5 },
    },
  };
})();
