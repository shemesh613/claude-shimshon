// Final-frame material: colour grade, watercolour edge, parchment fibres, film grain.
// S.post = { init(env), apply(ctx, T, env) }.
//
// Cost model (software raster): an upscaled or soft-light full-frame draw costs 8-15 ms at
// 1080 px, while a 1:1 blit on whole pixels costs 1.5-3 ms. So every layer is baked once per
// output resolution into device-sized canvases, and apply() is exactly two integer-aligned blits:
//   1) 'multiply'    : warm grade x watercolour edge wash x parchment fibres (drifts slowly)
//   2) 'source-over' : a faint indigo veil with film grain in it (alpha ~5%): lifts the blacks
//                      toward indigo and lays grain everywhere; one of 3 tiles per film frame,
//                      jittered by a hash of floor(T*24).
// Everything is deterministic; every drift is periodic in the film length so the loop is seamless.
(function () {
  'use strict';
  const S = (window.MIDBAR = window.MIDBAR || { beats: {} });

  const LOOP = 54;
  const PAD = 40;            // logical px of paper overscan for the drift
  const GPAD = 96;           // device px of grain overscan for the jitter
  const GRAIN_TILES = 3;
  const VEIL_ALPHA = 0.055;  // source-over alpha of the veil
  const VEIL = [100, 110, 232]; // veil colour: lift = VEIL * alpha = ~(5.5, 6, 12.8)
  const GRAIN_AMP = 60;      // +-veil units -> ~+-3 levels in the frame

  let W = 1080, H = 1920, fx = null;
  let gradeSmall = null, paperHalf = null, grainSeed = 0;
  let baked = null; // { dw, dh, p, mul, veil: [] }

  function init(env) {
    fx = env.fx;
    W = env.W; H = env.H;
    const rnd = fx.rng(0x9a9e7);
    grainSeed = (rnd() * 4294967296) >>> 0;

    // --- grade + watercolour edge (multiply colours), small: it is all low frequency ---
    {
      const w = 180, h = 320, pw = PAD * w / W, ph = PAD * h / H;
      const cw = Math.round(w + 2 * pw), ch = Math.round(h + 2 * ph);
      const c = fx.canvas(cw, ch), g = c.getContext('2d');
      const img = g.createImageData(cw, ch), d = img.data;
      for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {
          const u = ((x - pw + 0.5) / w) * 2 - 1, v = ((y - ph + 0.5) / h) * 2 - 1;
          // soft rounded-rect distance to the frame edge
          let e = Math.sqrt(Math.pow(Math.abs(u), 3.2) + Math.pow(Math.abs(v), 3.6));
          // watercolour: pigment pools irregularly toward the edge
          const n = fx.fbm(x * 0.045 + 3.1, y * 0.045 - 7.4, 4);
          const n2 = fx.fbm(x * 0.13 - 1.3, y * 0.13 + 2.2, 2);
          e = e * (1 + 0.22 * n) + 0.04 * n2 * e;
          const k = Math.min(0.4, fx.smooth(fx.clamp((e - 0.5) / 0.9)) * 0.42);
          // a darker rim where the wash dried (the "tide line" of watercolour), very faint
          const rim = 0.05 * Math.exp(-Math.pow((e - 1.02) / 0.06, 2));
          // centre: highlights warmed (blue/green held back); edge: toward ink-brown #3b2616
          const kk = Math.min(0.46, k + rim);
          const i = 4 * (y * cw + x);
          d[i] = 255 * (1 - kk) + 128 * kk;
          d[i + 1] = 247 * (1 - kk) + 98 * kk;
          d[i + 2] = 230 * (1 - kk) + 74 * kk;
          d[i + 3] = 255;
        }
      }
      g.putImageData(img, 0, 0);
      gradeSmall = c;
    }

    // --- parchment fibres as a multiply map around ~0.975 (half logical resolution) ---
    {
      const sc = 0.5;
      const w = Math.round((W + PAD * 2) * sc), h = Math.round((H + PAD * 2) * sc);
      const c = fx.canvas(w, h), g = c.getContext('2d');
      const img = g.createImageData(w, h), d = img.data;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const cloud = fx.fbm(x * 0.011, y * 0.011, 3) * 7 + fx.noise(x * 0.06 + 9, y * 0.06) * 3;
          const v = 251 + cloud + (rnd() - 0.5) * 5;
          const i = 4 * (y * w + x);
          d[i] = v; d[i + 1] = v - 0.5; d[i + 2] = v - 2; d[i + 3] = 255;
        }
      }
      g.putImageData(img, 0, 0);
      // fibres: thin curved strokes, mostly near-horizontal like laid paper
      g.lineCap = 'round';
      for (let f = 0; f < 1100; f++) {
        const x = rnd() * w, y = rnd() * h;
        const len = 5 + rnd() * 30;
        const ang = (rnd() - 0.5) * 1.3 + (rnd() < 0.3 ? Math.PI / 2 : 0);
        const bend = (rnd() - 0.5) * 9;
        const light = rnd() < 0.5;
        g.strokeStyle = light ? `rgba(255,255,252,${0.1 + rnd() * 0.2})` : `rgba(150,120,90,${0.03 + rnd() * 0.05})`;
        g.lineWidth = 0.4 + rnd() * 0.7;
        const cx = Math.cos(ang), cy = Math.sin(ang);
        g.beginPath();
        g.moveTo(x - (cx * len) / 2, y - (cy * len) / 2);
        g.quadraticCurveTo(x - cy * bend, y + cx * bend, x + (cx * len) / 2, y + (cy * len) / 2);
        g.stroke();
      }
      // laid lines: very faint horizontal banding
      for (let y = 0; y < h; y += 7) {
        g.fillStyle = `rgba(90,70,50,${0.006 + 0.008 * rnd()})`;
        g.fillRect(0, y, w, 1);
      }
      paperHalf = c;
    }
    baked = null;
  }

  // Bake the device-resolution layers (once per output size).
  function bake(dw, dh, sc) {
    const p = Math.round(PAD * sc);
    const mul = fx.canvas(dw + 2 * p, dh + 2 * p);
    const g = mul.getContext('2d');
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(gradeSmall, 0, 0, mul.width, mul.height);
    g.globalCompositeOperation = 'multiply';
    g.drawImage(paperHalf, 0, 0, mul.width, mul.height);

    const veil = [];
    const vw = dw + GPAD, vh = dh + GPAD;
    const r = fx.rng(grainSeed);
    for (let t = 0; t < GRAIN_TILES; t++) {
      const c = fx.canvas(vw, vh), cg = c.getContext('2d');
      const img = cg.createImageData(vw, vh), d = img.data;
      const a = Math.round(VEIL_ALPHA * 255);
      for (let i = 0, o = 0; i < vw * vh; i++, o += 4) {
        // roughly gaussian (sum of 3 uniforms), slightly warm in the positive swing
        const n = (r() + r() + r() - 1.5) * GRAIN_AMP;
        d[o] = VEIL[0] + n; d[o + 1] = VEIL[1] + n * 0.95; d[o + 2] = VEIL[2] + n * 0.8; d[o + 3] = a;
      }
      cg.putImageData(img, 0, 0);
      veil.push(c);
    }
    baked = { dw, dh, p, mul, veil };
  }

  function hash(n) {
    n = Math.imul(n ^ 0x27d4eb2d, 0x165667b1);
    n = Math.imul(n ^ (n >>> 15), 0x85ebca6b);
    return ((n ^ (n >>> 13)) >>> 0) / 4294967296;
  }

  function apply(ctx, T, env) {
    if (!gradeSmall) init(env);
    const tr = ctx.getTransform();
    const sc = tr.a || 1;
    const dw = Math.round(W * sc), dh = Math.round(H * sc);
    if (!baked || baked.dw !== dw || baked.dh !== dh) bake(dw, dh, sc);
    const { p, mul, veil } = baked;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;

    // 1) grade x watercolour edge x parchment, drifting on a closed loop (whole pixels only)
    const ph = (T / LOOP) * Math.PI * 2;
    const ox = Math.round(-p + Math.sin(ph) * p * 0.8);
    const oy = Math.round(-p + Math.sin(ph * 2 + 1.1) * p * 0.4);
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(mul, ox, oy);

    // 2) indigo veil + film grain: one tile per film frame (24 fps), jittered
    const f = Math.floor(T * 24);
    const tile = veil[((f % GRAIN_TILES) + GRAIN_TILES) % GRAIN_TILES];
    const jx = Math.floor(hash(f) * GPAD), jy = Math.floor(hash(f + 7919) * GPAD);
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(tile, -jx, -jy);

    ctx.restore();
  }

  S.post = { init, apply };
})();
