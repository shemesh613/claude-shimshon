/* Beat 3: THE TRANSFORMATION, camp -> sukkah. Film 23-33 s (local t 0..10).
 *
 * One continuous 3D camera (pinhole, focal F = 960 px, eased monotone-cubic keyframes) flies from
 * the top-down overview of the camp (exactly WORLD.CAM_CAMP until t 1.4; until t 1.2 the camp is
 * drawn with WORLD.drawCamp over beat 2's own night sand, lane fires and cloud ring) down through
 * the Clouds of Glory (beat 2's ring treated as a layer 150 units up: it swells past the frame),
 * rotating slightly, then swings into a 3/4 view of the hero sukkah (WORLD.HERO, corner of the front
 * row of Judah), dollies at eye level through its doorway (the door faces west, toward the
 * Mishkan) and tilts up. Every tent turns into a sukkah in a wave spreading out from the Mishkan:
 * a pulse of gold light, gold construction lines drawing the footprint, posts, beams and
 * diagonals, the goat-hair cloth folding up from the flat tent into walls, green schach growing
 * across the top and a lamp lit inside. The clouds part around the hero as we descend.
 *
 * END LOOK (t 8.5-10: gentle drift only, the tilt and height settle with zero velocity at t 10):
 * INSIDE the hero sukkah at night, seated eye height just inside the door, looking east and
 * tilted up ~39 degrees. The top ~56% of the frame (y < ~1080) is the schach: palm fronds laid
 * left-right with dense leaflets (olive-gold, warm where the lamp lights their undersides) over
 * dark wooden lathes, with deep indigo night sky, stars, long pearl cloud wisps and the full moon
 * at about (714, 375) between them. Below it the back wall of goat-hair cloth (warm brown,
 * horizontal seams), lit amber from below by a clay oil lamp on a small stool at the foot of the
 * back wall (bottom centre, mostly below y 1800); faint corner posts at the frame edges.
 * Grains at the end: ~40% stars and moonlight between the fronds (chosen in the gaps of the
 * schach), ~25% moonlight flecks on the leaflets, ~35% warm dust motes in the lamplight.
 */
(function () {
  'use strict';
  const S = (window.MIDBAR = window.MIDBAR || { beats: {} });
  const W = 1080, H = 1920, CX = 540, CY = 960;
  const F = 960, NEAR = 0.08;
  const DEG = Math.PI / 180;

  let fx, WD, G = null;

  // ---------------------------------------------------------------- helpers
  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, k) => a + (b - a) * k;
  const sm = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
  const rgb = (c, a) => (a === undefined ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`);
  const mix = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

  // Monotone cubic (Fritsch-Carlson) through [t, v] keys; zero slope at both ends. C1, no overshoot.
  function pchip(keys) {
    const n = keys.length, xs = keys.map((k) => k[0]), ys = keys.map((k) => k[1]);
    const h = [], d = [], m = new Array(n).fill(0);
    for (let i = 0; i < n - 1; i++) { h[i] = xs[i + 1] - xs[i]; d[i] = (ys[i + 1] - ys[i]) / h[i]; }
    for (let i = 1; i < n - 1; i++) {
      if (d[i - 1] * d[i] <= 0) m[i] = 0;
      else { const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1]; m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]); }
    }
    return (t) => {
      if (t <= xs[0]) return ys[0];
      if (t >= xs[n - 1]) return ys[n - 1];
      let i = 0; while (t > xs[i + 1]) i++;
      const s = (t - xs[i]) / h[i], s2 = s * s, s3 = s2 * s;
      return (2 * s3 - 3 * s2 + 1) * ys[i] + (s3 - 2 * s2 + s) * h[i] * m[i] + (-2 * s3 + 3 * s2) * ys[i + 1] + (s3 - s2) * h[i] * m[i + 1];
    };
  }

  // ---------------------------------------------------------------- camera
  // World: x,y = camp ground plane (east = -y, up on screen at top-down), z = up. Units = camp units.
  const C = { px: 0, py: 0, pz: 0, rx: 1, ry: 0, fx: 0, fy: 0, fz: -1, ux: 0, uy: -1, uz: 0, th: 0, hx: 0, hy: -1 };
  let kZ, kTH, kPS, kB, Z0, ZEND, HC;

  function setCam(t) {
    const z = Math.exp(kZ(t)), th = kTH(t) * DEG, ps = kPS(t), b = kB(t);
    const u = clamp(Math.log(Z0 / z) / Math.log(Z0 / ZEND));
    const k = (1 - u) * (z / Z0);
    const c0 = WD.CAM_CAMP;
    const tx = HC.x + (c0.x - HC.x) * k, ty = HC.y + (c0.y - HC.y) * k;
    const hx = Math.sin(ps), hy = -Math.cos(ps);
    C.hx = hx; C.hy = hy;
    C.rx = Math.cos(ps); C.ry = Math.sin(ps);
    C.px = tx - b * hx; C.py = ty - b * hy; C.pz = z;
    const st = Math.sin(th), ct = Math.cos(th);
    C.fx = st * hx; C.fy = st * hy; C.fz = -ct;
    C.ux = ct * hx; C.uy = ct * hy; C.uz = st;
    C.th = th;
    return C;
  }

  // projection scratch
  let SX = 0, SY = 0;
  function pr(X, Y, Z) {
    const dx = X - C.px, dy = Y - C.py, dz = Z - C.pz;
    const d = dx * C.fx + dy * C.fy + dz * C.fz;
    const inv = F / (d > 1e-4 ? d : 1e-4);
    SX = CX + (dx * C.rx + dy * C.ry) * inv;
    SY = CY - (dx * C.ux + dy * C.uy + dz * C.uz) * inv;
    return d;
  }
  function depth(X, Y, Z) { return (X - C.px) * C.fx + (Y - C.py) * C.fy + (Z - C.pz) * C.fz; }

  // polygon with near-plane clipping, emitted with a consistent screen winding (so unions stay solid)
  const PA = new Float64Array(3 * 24), PB = new Float64Array(3 * 24), PSC = new Float64Array(2 * 24);
  function poly(ctx, pts, n) {
    let allIn = true, anyIn = false;
    for (let i = 0; i < n; i++) {
      const dx = pts[3 * i] - C.px, dy = pts[3 * i + 1] - C.py, dz = pts[3 * i + 2] - C.pz;
      const a = dx * C.rx + dy * C.ry, b = dx * C.ux + dy * C.uy + dz * C.uz, c = dx * C.fx + dy * C.fy + dz * C.fz;
      PA[3 * i] = a; PA[3 * i + 1] = b; PA[3 * i + 2] = c;
      if (c < NEAR) allIn = false; else anyIn = true;
    }
    if (!anyIn) return;
    let src = PA, m = n;
    if (!allIn) {
      m = 0;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const ai = 3 * i, aj = 3 * j;
        const ci = PA[ai + 2], cj = PA[aj + 2];
        const inI = ci >= NEAR, inJ = cj >= NEAR;
        if (inI) { PB[3 * m] = PA[ai]; PB[3 * m + 1] = PA[ai + 1]; PB[3 * m + 2] = ci; m++; }
        if (inI !== inJ) {
          const s = (NEAR - ci) / (cj - ci);
          PB[3 * m] = PA[ai] + (PA[aj] - PA[ai]) * s; PB[3 * m + 1] = PA[ai + 1] + (PA[aj + 1] - PA[ai + 1]) * s; PB[3 * m + 2] = NEAR; m++;
        }
      }
      if (m < 3) return;
      src = PB;
    }
    let area = 0;
    for (let i = 0; i < m; i++) {
      const inv = F / src[3 * i + 2];
      PSC[2 * i] = CX + src[3 * i] * inv; PSC[2 * i + 1] = CY - src[3 * i + 1] * inv;
    }
    for (let i = 0; i < m; i++) { const j = (i + 1) % m; area += PSC[2 * i] * PSC[2 * j + 1] - PSC[2 * j] * PSC[2 * i + 1]; }
    if (area >= 0) { ctx.moveTo(PSC[0], PSC[1]); for (let i = 1; i < m; i++) ctx.lineTo(PSC[2 * i], PSC[2 * i + 1]); }
    else { ctx.moveTo(PSC[2 * (m - 1)], PSC[2 * (m - 1) + 1]); for (let i = m - 2; i >= 0; i--) ctx.lineTo(PSC[2 * i], PSC[2 * i + 1]); }
    ctx.closePath();
  }
  const Q = new Float64Array(3 * 8);
  function quad(ctx, ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz) {
    Q[0] = ax; Q[1] = ay; Q[2] = az; Q[3] = bx; Q[4] = by; Q[5] = bz; Q[6] = cx; Q[7] = cy; Q[8] = cz; Q[9] = dx; Q[10] = dy; Q[11] = dz;
    poly(ctx, Q, 4);
  }

  // clipped segment -> screen (returns false if invisible); results in L0x.. L1x..
  let L0x = 0, L0y = 0, L0d = 0, L1x = 0, L1y = 0, L1d = 0;
  function clipSeg(ax, ay, az, bx, by, bz) {
    let dx = ax - C.px, dy = ay - C.py, dz = az - C.pz;
    let a1 = dx * C.rx + dy * C.ry, b1 = dx * C.ux + dy * C.uy + dz * C.uz, c1 = dx * C.fx + dy * C.fy + dz * C.fz;
    dx = bx - C.px; dy = by - C.py; dz = bz - C.pz;
    let a2 = dx * C.rx + dy * C.ry, b2 = dx * C.ux + dy * C.uy + dz * C.uz, c2 = dx * C.fx + dy * C.fy + dz * C.fz;
    if (c1 < NEAR && c2 < NEAR) return false;
    if (c1 < NEAR) { const s = (NEAR - c1) / (c2 - c1); a1 += (a2 - a1) * s; b1 += (b2 - b1) * s; c1 = NEAR; }
    else if (c2 < NEAR) { const s = (NEAR - c2) / (c1 - c2); a2 += (a1 - a2) * s; b2 += (b1 - b2) * s; c2 = NEAR; }
    L0x = CX + a1 * F / c1; L0y = CY - b1 * F / c1; L0d = c1;
    L1x = CX + a2 * F / c2; L1y = CY - b2 * F / c2; L1d = c2;
    return true;
  }
  function seg(ctx, ax, ay, az, bx, by, bz) {
    if (!clipSeg(ax, ay, az, bx, by, bz)) return;
    ctx.moveTo(L0x, L0y); ctx.lineTo(L1x, L1y);
  }
  // a world-width strip (pole, beam, spine) as a screen quad whose width follows perspective
  function strip(ctx, ax, ay, az, bx, by, bz, wd, minPx) {
    if (!clipSeg(ax, ay, az, bx, by, bz)) return;
    let ex = L1x - L0x, ey = L1y - L0y; const l = Math.hypot(ex, ey) || 1;
    ex /= l; ey /= l;
    const w0 = Math.max(minPx, 0.5 * F * wd / L0d), w1 = Math.max(minPx, 0.5 * F * wd / L1d);
    ctx.moveTo(L0x - ey * w0, L0y + ex * w0); ctx.lineTo(L1x - ey * w1, L1y + ex * w1);
    ctx.lineTo(L1x + ey * w1, L1y - ex * w1); ctx.lineTo(L0x + ey * w0, L0y - ex * w0); ctx.closePath();
  }

  // Re-home a canvas that was painted with canvas ops into a plain pixel copy: in the headless
  // exporter this makes it several times cheaper to draw from.
  function freeze(c) {
    const n = fx.canvas(c.width, c.height);
    n.getContext('2d').putImageData(c.getContext('2d').getImageData(0, 0, c.width, c.height), 0, 0);
    return n;
  }

  // ---------------------------------------------------------------- scene data
  function build(env) {
    const R = fx.rng(3303);
    const T = WD.TENTS, hero = WD.HERO;
    const m = WD.MISHKAN, mcx = m.x + m.w / 2, mcy = m.y + m.h / 2;
    let dmax = 0;
    for (const t of T) dmax = Math.max(dmax, Math.hypot(t.x - mcx, t.y - mcy));

    // sukkot (one per tent)
    const SK = T.map((t, i) => {
      const ax = Math.cos(t.rot), ay = Math.sin(t.rot);
      const bx = -Math.sin(t.rot), by = Math.cos(t.rot);
      const isHero = i === hero;
      const d = Math.hypot(t.x - mcx, t.y - mcy) / dmax;
      const s = {
        i, x: t.x, y: t.y, ax, ay, bx, by, w2: t.w / 2, h2: t.h / 2, hero: isHero,
        Hs: isHero ? 7.2 : Math.min(t.w, t.h) * 0.8,
        t0: isHero ? 2.2 : 1.25 + 2.7 * d + (R() - 0.5) * 0.35,
        dur: isHero ? 2.9 : 1.7 + R() * 0.4,
        str: [],
      };
      // schach strokes for ordinary sukkot: branches laid across the short axis
      const n = 7;
      for (let k = 0; k < n; k++) {
        const u = -0.9 + 1.8 * (k + 0.5) / n + (R() - 0.5) * 0.12;
        const tilt = (R() - 0.5) * 0.5;
        s.str.push({ u0: u - tilt * 0.3, u1: u + tilt * 0.3, lean: (R() - 0.5) * 0.4, leaf: R() });
      }
      return s;
    });

    // hero local helpers
    const h = SK[hero];
    const L = (lx, ly) => [h.x + h.ax * lx + h.bx * ly, h.y + h.ay * lx + h.by * ly];
    HC = { x: h.x, y: h.y };

    // hero fronds: palm fronds laid across the roof (along x, left-right as seen from the door),
    // resting on lathes; stems alternate sides, some lie at an angle.
    const fronds = [];
    const NF = 18;
    for (let k = 0; k < NF; k++) {
      const along = -h.h2 + 0.1 + (2 * h.h2 - 0.2) * ((k + 0.5) / NF) + (R() - 0.5) * 0.35;
      const flip = R() < 0.5 ? 1 : -1; // which end is the stem
      const skew = (R() - 0.5) * 3.2;
      const x0 = flip * (h.w2 + 0.4 + R() * 0.5), x1 = -flip * (h.w2 + 0.1 + R() * 0.9);
      const y0 = along - skew / 2, y1 = along + skew / 2;
      const bend = (R() - 0.5) * 0.9;
      const zb = h.Hs + 0.28 + (k % 3) * 0.07 + R() * 0.08;
      const spine = [];
      const NS = 12;
      for (let j = 0; j <= NS; j++) {
        const s = j / NS;
        const ly = lerp(y0, y1, s) + bend * Math.sin(Math.PI * s);
        const lx = lerp(x0, x1, s);
        const zz = zb - 0.22 * Math.sin(Math.PI * s) - 0.45 * Math.pow(Math.max(0, s - 0.75) / 0.25, 2) * 0.6; // sag, drooping tip
        const p = L(lx, ly);
        spine.push(p[0], p[1], zz);
      }
      const leaves = [];
      const NL = 50;
      for (let j = 0; j < NL; j++) {
        const s = 0.06 + 0.92 * (j / (NL - 1)) + (R() - 0.5) * 0.006;
        for (const side of [-1, 1]) {
          const len = (0.95 - 0.45 * s) * (0.85 + R() * 0.3);
          const ang = (38 + R() * 14) * DEG;
          // palm leaflets stand in a shallow V along the rib: alternate ones lift, the rest droop
          leaves.push({ k: j, s, side, len, ang, lift: (j % 2) * 0.12, droop: 0.12 + R() * 0.2, tw: (R() - 0.5) * 0.16 });
        }
      }
      fronds.push({ spine, NS, leaves, start: 0.46 + 0.4 * (k / NF) + (R() - 0.5) * 0.06, tone: R() });
    }
    // order fronds randomly for layering
    for (let i = fronds.length - 1; i > 0; i--) { const j = (R() * (i + 1)) | 0; const q = fronds[i]; fronds[i] = fronds[j]; fronds[j] = q; }

    // lathes (support slats across the width, at several depths)
    const lathes = [];
    for (let k = 0; k < 3; k++) {
      const ly = -h.h2 + (2 * h.h2) * ((k + 0.5) / 3);
      lathes.push([...L(-h.w2 - 0.35, ly), h.Hs + 0.1, ...L(h.w2 + 0.35, ly), h.Hs + 0.1]);
    }

    // lamp and stool, at the foot of the back wall (back = -y local = east)
    const lampL = L(0, -h.h2 + 0.9);
    const lamp = [lampL[0], lampL[1], 2.35];

    // stars: directions on the dome
    const stars = [];
    for (let i = 0; i < 520; i++) {
      const az = R() * Math.PI * 2, el = Math.asin(0.05 + 0.95 * R());
      const ce = Math.cos(el);
      stars.push([Math.cos(az) * ce, Math.sin(az) * ce, Math.sin(el), 0.25 + R() * R() * 0.75, R() * 6.28]);
    }
    // the full moon of the 15th of Tishrei: east, a little south, high
    // placed where beat 4 shows it (x 714, y 375) at the end of the shot
    setCam(10);
    const mvx = (714 - CX) / F, mvy = -(375 - CY) / F;
    const moon = [C.fx + mvx * C.rx + mvy * C.ux, C.fy + mvx * C.ry + mvy * C.uy, C.fz + mvy * C.uz];
    { const l = Math.hypot(moon[0], moon[1], moon[2]); moon[0] /= l; moon[1] /= l; moon[2] /= l; }

    // clouds of glory: a ring around the camp and a thin luminous roof
    const puffs = [];
    for (let i = 0; i < 90; i++) {
      const a = (i / 90) * Math.PI * 2 + (R() - 0.5) * 0.08;
      const rad = 305 + R() * 50;
      puffs.push({ x: Math.cos(a) * rad * 0.95, y: Math.sin(a) * rad * 1.02, z: 20 + R() * 150, r: 24 + R() * 22, a: 0.4 + R() * 0.3, spr: i % 10, ring: 1, ph: R() * 6.28, rot: a + Math.PI / 2 + (R() - 0.5) * 0.3 });
    }
    for (let i = 0; i < 52; i++) {
      const a = R() * Math.PI * 2, rad = Math.sqrt(R()) * 340;
      puffs.push({ x: Math.cos(a) * rad, y: Math.sin(a) * rad, z: 115 + R() * 90, r: 26 + R() * 22, a: 0.2 + R() * 0.2, spr: i % 10, ring: 0, ph: R() * 6.28, rot: a + Math.PI / 2 + (R() - 0.5) * 0.7 });
    }

    // sprites
    const glow = fx.canvas(128, 128);
    {
      const g = glow.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, 'rgba(255,255,255,0.5)');
      gr.addColorStop(0.5, 'rgba(255,255,255,0.13)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    }
    const tintSprite = (col) => {
      const c = fx.canvas(128, 128), g = c.getContext('2d');
      g.drawImage(glow, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = rgb(col); g.fillRect(0, 0, 128, 128);
      return c;
    };
    const amberGlow = freeze(tintSprite([255, 170, 80]));
    const pearlGlow = freeze(tintSprite([220, 226, 255]));
    const goldGlow = freeze(tintSprite([255, 214, 150]));
    const cloudSpr = [];
    for (let v = 0; v < 4; v++) {
      const c = fx.canvas(256, 256), g = c.getContext('2d');
      const rr = fx.rng(77 + v * 13);
      for (let k = 0; k < 16; k++) {
        const a = rr() * Math.PI * 2, d = Math.pow(rr(), 0.7) * 62;
        const x = 128 + Math.cos(a) * d, y = 128 + Math.sin(a) * d * 0.8, r = 34 + rr() * 42;
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        const warm = rr();
        const col = mix([236, 240, 255], [255, 226, 176], warm * 0.6);
        gr.addColorStop(0, rgb(col, 0.5)); gr.addColorStop(0.55, rgb(col, 0.22)); gr.addColorStop(1, rgb(col, 0));
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      }
      cloudSpr.push(freeze(c));
    }
    // prefer beat 2's lit cloud sprites so the Clouds of Glory keep one look
    try { const b2s = S.beats[2] && S.beats[2]._dbg && S.beats[2]._dbg(); if (b2s && b2s.length >= 4) { cloudSpr.length = 0; cloudSpr.push(...b2s.map(freeze)); } } catch (e) { /* keep ours */ }

    // beat 2's night sand (world space, its own resolution) and its end-state clouds, baked once
    let sand = null, b2clouds = null, puffLayer = fx.canvas(540, 960);
    const B2 = S.beats[2] && S.beats[2].scene;
    if (B2) {
      try {
        // at the overview zoom (1 texel per screen px at t = 0): cheaper to sample than beat 2's 1.8/unit
        const zs = WD.CAM_CAMP.zoom;
        sand = fx.canvas(Math.round(880 * zs), Math.round(1540 * zs));
        B2.ground(sand.getContext('2d'), { x: 0, y: 0, zoom: zs }, { W: sand.width, H: sand.height }, 1);
        sand = freeze(sand);
        b2clouds = fx.canvas(540, 960);
        const g2 = b2clouds.getContext('2d'); g2.scale(0.5, 0.5);
        B2.clouds(g2, 12, { W, H }, 1);
        b2clouds = freeze(b2clouds);
      } catch (e) { sand = null; b2clouds = null; }
    }
    G = { sand, b2clouds, puffLayer, SK, hero, h, L, fronds, lathes, lamp, stars, moon, puffs, glow, amberGlow, pearlGlow, goldGlow, cloudSpr, mcx, mcy };
    buildGrains(env, R);
    buildStarMask(env);
  }

  // per-sukkah morph state
  function morph(s, t) { return clamp((t - s.t0) / s.dur); }

  // ---------------------------------------------------------------- drawing: sky & ground
  // affine map of the plane z = zp at the current (near top-down) camera, composed onto `base`
  function planeTransform(ctx, base, zp) {
    pr(0, 0, zp); const ox = SX, oy = SY;
    pr(100, 0, zp); const exx = (SX - ox) / 100, exy = (SY - oy) / 100;
    pr(0, 100, zp); const eyx = (SX - ox) / 100, eyy = (SY - oy) / 100;
    ctx.setTransform(base);
    ctx.transform(exx, exy, eyx, eyy, ox, oy);
  }
  const GROUND = [52, 47, 72];
  function insideHero() {
    const h = G.h, dx = C.px - h.x, dy = C.py - h.y;
    const lx = dx * h.ax + dy * h.ay, ly = dx * h.bx + dy * h.by;
    return C.pz < h.Hs && Math.abs(lx) < h.w2 - 0.05 && Math.abs(ly) < h.h2 - 0.05;
  }
  function drawBackground(ctx, t, base) {
    const th = C.th;
    const st = Math.sin(th), ct = Math.cos(th);
    const yh = st > 0.02 ? CY - F * ct / st : -1e5;
    const sandOK = !!G.sand && !insideHero();
    if (yh > 0) {
      // sky above the horizon
      const yTop = Math.min(yh, H);
      const eAt = (e) => { const a = e - (th - Math.PI / 2); return a < Math.PI / 2 - 0.01 ? CY - F * Math.tan(a) : -1e5; };
      const y60 = eAt(65 * DEG);
      const g = ctx.createLinearGradient(0, yh, 0, Math.max(-4000, Math.min(yh - 10, y60)));
      g.addColorStop(0, 'rgb(70,62,104)'); g.addColorStop(0.15, 'rgb(40,38,82)'); g.addColorStop(0.6, 'rgb(20,22,54)'); g.addColorStop(1, 'rgb(11,13,31)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, yTop);
    }
    if (yh >= H) return;
    const y0 = Math.max(0, yh);
    if (!sandOK && G.sand) { ctx.fillStyle = rgb(GROUND); ctx.fillRect(0, y0, W, H - y0); return; } // inside: walls cover it
    // beat 2's sand only while we look down on it; at a glancing angle at night it reads as flat ground
    const sandA = sandOK ? 1 - sm(14 * DEG, 26 * DEG, th) : 0;
    if (sandA < 1) { ctx.fillStyle = rgb(GROUND); ctx.fillRect(0, y0, W, H - y0); }
    if (sandA <= 0.01) { hazeBand(ctx, yh, y0); return; }
    if (yh > -420) {
      // far desert beyond the sand texture, hazy toward the horizon
      const gg = ctx.createLinearGradient(0, yh, 0, yh + 420);
      gg.addColorStop(0, 'rgb(74,66,100)'); gg.addColorStop(1, rgb(GROUND));
      ctx.fillStyle = gg; ctx.fillRect(0, y0, W, Math.min(H, yh + 420) - y0);
    }
    // beat 2's moonlit sand, laid on the ground plane in perspective (piecewise-affine strips)
    ctx.globalAlpha = sandA;
    tm(ctx, 'bg.sand', () => drawSandPersp(ctx, base, yh));
    ctx.globalAlpha = 1;
    const B2 = S.beats[2] && S.beats[2].scene;
    const la = 1 - sm(1.0, 1.9, t);
    if (B2 && la > 0.01) {
      const z0 = WD.CAM_CAMP.zoom;
      ctx.save(); ctx.globalAlpha = la;
      planeTransform(ctx, base, 0); ctx.scale(1 / z0, 1 / z0); ctx.translate(-CX, -CY);
      tm(ctx, 'bg.lights', () => { try { B2.lights(ctx, { x: 0, y: 0, zoom: z0 }, { W, H }, 11 + t, 1); } catch (e) { /* optional */ } });
      ctx.restore();
    }
    hazeBand(ctx, yh, y0);
  }
  function hazeBand(ctx, yh, y0) {
    if (yh > -380) {
      const gg = ctx.createLinearGradient(0, yh, 0, yh + 380);
      gg.addColorStop(0, 'rgba(78,70,106,1)'); gg.addColorStop(0.35, 'rgba(66,60,94,0.55)'); gg.addColorStop(1, 'rgba(60,54,86,0)');
      ctx.fillStyle = gg; ctx.fillRect(0, y0, W, Math.min(H, yh + 380) - y0);
    }
  }



  // screen point -> ground (z = 0); returns false above the horizon
  let GX = 0, GY = 0;
  function unproj(sx, sy) {
    const vx = (sx - CX) / F, vy = -(sy - CY) / F;
    const dx = C.fx + vx * C.rx + vy * C.ux, dy = C.fy + vx * C.ry + vy * C.uy, dz = C.fz + vy * C.uz;
    if (dz > -1e-4) return false;
    const k = -C.pz / dz;
    GX = C.px + dx * k; GY = C.py + dy * k;
    return true;
  }
  const SAND_ENV = { W: 2400, H: 2400 };
  function drawSandPersp(ctx, base, yh) {
    const y0 = Math.max(0, yh + 1);
    if (y0 >= H) return;
    const nearTop = yh < -H * 3; // effectively top-down: one affine piece is exact enough
    const N = nearTop ? 1 : 24;
    // one sampling mode for the whole floor (mixed modes show as seams): nearest while it minifies
    const smooth = F / Math.max(1, C.pz) * Math.sqrt(base.a * base.d) / WD.CAM_CAMP.zoom > 2.2;
    let ya = y0;
    for (let k = 1; k <= N; k++) {
      const yb = k === N ? H : y0 + (H - y0) * Math.pow(k / N, 1.7);
      const ym = (ya + yb) / 2;
      if (!unproj(0, ym)) { ya = yb; continue; }
      const g1x = GX, g1y = GY;
      if (!unproj(W, ym)) { ya = yb; continue; }
      const g2x = GX, g2y = GY;
      if (!unproj(0, yb + 1)) { ya = yb; continue; }
      const g3x = GX, g3y = GY;
      // affine ground->screen through the three correspondences
      const a11 = g2x - g1x, a12 = g3x - g1x, a21 = g2y - g1y, a22 = g3y - g1y;
      const det = a11 * a22 - a12 * a21;
      if (Math.abs(det) < 1e-9) { ya = yb; continue; }
      const i11 = a22 / det, i12 = -a12 / det, i21 = -a21 / det, i22 = a11 / det;
      const s11 = W, s12 = 0, s21 = 0, s22 = yb + 1 - ym; // screen deltas
      const ma = s11 * i11 + s12 * i21, mc = s11 * i12 + s12 * i22;
      const mb = s21 * i11 + s22 * i21, md = s21 * i12 + s22 * i22;
      const e = 0 - (ma * g1x + mc * g1y), f = ym - (mb * g1x + md * g1y);
      ctx.save();
      ctx.setTransform(base);
      ctx.beginPath(); ctx.rect(0, Math.floor(ya), W, Math.ceil(yb) - Math.floor(ya) + 1); ctx.clip();
      ctx.transform(ma, mb, mc, md, e, f);
      // dest px per sand texel: nearest sampling is 4x cheaper and invisible while minifying
      ctx.imageSmoothingEnabled = smooth;
      ctx.drawImage(G.sand, -440, -770, 880, 1540);
      ctx.restore();
      ya = yb;
    }
  }

  // beat 2's Clouds of Glory, treated as a layer at height ZL (so we descend through it)
  const ZL = 150;



  function drawSky(ctx, t) {
    const vis = sm(48 * DEG, 95 * DEG, C.th);
    if (vis <= 0.01) return;
    ctx.save();
    ctx.fillStyle = '#fff';
    for (const s of G.stars) {
      const d = s[0] * C.fx + s[1] * C.fy + s[2] * C.fz;
      if (d <= 0.05) continue;
      const x = CX + (s[0] * C.rx + s[1] * C.ry) * F / d, y = CY - (s[0] * C.ux + s[1] * C.uy + s[2] * C.uz) * F / d;
      if (x < -5 || x > W + 5 || y < -5 || y > H + 5) continue;
      const tw = 0.7 + 0.3 * Math.sin(t * 2.3 + s[4]);
      ctx.globalAlpha = vis * s[3] * tw * sm(0.0, 0.25, s[2]);
      const sz = 1 + s[3] * 1.6;
      ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
    }
    // the moon
    const m = G.moon, d = m[0] * C.fx + m[1] * C.fy + m[2] * C.fz;
    if (d > 0.05) {
      const x = CX + (m[0] * C.rx + m[1] * C.ry) * F / d, y = CY - (m[0] * C.ux + m[1] * C.uy + m[2] * C.uz) * F / d;
      ctx.globalAlpha = vis;
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(G.pearlGlow, x - 260, y - 260, 520, 520);
      ctx.globalAlpha = vis * 0.5;
      ctx.drawImage(G.pearlGlow, x - 90, y - 90, 180, 180);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = vis;
      const g = ctx.createRadialGradient(x - 4, y - 4, 2, x, y, 19);
      g.addColorStop(0, '#fbf6e8'); g.addColorStop(1, '#e2dcc8');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 19, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(170,165,160,0.18)';
      ctx.beginPath(); ctx.arc(x + 5, y - 3, 6, 0, 7); ctx.arc(x - 6, y + 5, 4, 0, 7); ctx.fill();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- clouds of glory
  function puffPos(p, t) {
    // the roof parts around the hero as the camera descends through it
    const part = sm(2.6, 4.6, t);
    let x = p.x + 6 * Math.sin(t * 0.25 + p.ph), y = p.y + 5 * Math.cos(t * 0.2 + p.ph);
    if (!p.ring && part > 0) {
      const dx = x - HC.x, dy = y - HC.y, d = Math.hypot(dx, dy) + 1e-3;
      const push = part * 170 * Math.exp(-d / 190);
      x += dx / d * push; y += dy / d * push;
    }
    return [x, y, p.z];
  }
  // clouds are soft: draw them into a half-resolution layer, then composite once
  function drawPuffs(ctx, t, which, heroDepth, withB2) {
    const lum = sm(2.5, 3.4, t);
    const b2a = withB2 && G.b2clouds && C.pz > ZL + 20 ? 1 - sm(1.8, 2.7, t) : 0;
    if (lum <= 0.01 && b2a <= 0.01) return;
    const L = G.puffLayer, direct = false;
    let g = ctx;
    if (direct) ctx.save();
    else { g = L.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, L.width, L.height); }
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    if (b2a > 0.01) {
      // beat 2's cloud ring as a layer at height ZL: it swells past the frame as we descend
      const k = (Z0 - ZL) / F, c0 = WD.CAM_CAMP;
      pr(c0.x, c0.y, ZL); const ox = SX, oy = SY;
      pr(c0.x + 100 * k, c0.y, ZL); const ax = (SX - ox) / 100, ay = (SY - oy) / 100;
      pr(c0.x, c0.y + 100 * k, ZL); const bx = (SX - ox) / 100, by = (SY - oy) / 100;
      g.setTransform(0.5 * ax, 0.5 * ay, 0.5 * bx, 0.5 * by, 0.5 * (ox - ax * CX - bx * CY), 0.5 * (oy - ay * CX - by * CY));
      g.globalAlpha = b2a;
      g.drawImage(G.b2clouds, 0, 0, W, H);
      g.globalAlpha = 1;
      x0 = 0; y0 = 0; x1 = W; y1 = H;
    }
    if (!direct) g.setTransform(0.5, 0, 0, 0.5, 0, 0);
    if (lum > 0.01) for (const p of G.puffs) {
      const [x, y, z] = puffPos(p, t);
      const d = pr(x, y, z);
      if (d < 4) continue;
      const near = d < heroDepth;
      if (near !== which) continue;
      const r = F * p.r / d;
      if (r > 1700) continue;
      if (SX + r < 0 || SX - r > W || SY + r < 0 || SY - r > H) continue;
      const a = p.a * lum * sm(4, 40, d) * (1 - sm(900, 1700, r));
      if (a <= 0.01) continue;
      g.globalAlpha = a;
      {
        // the clouds are long luminous wisps circling the camp
        const cx0 = SX, cy0 = SY, L = p.r * (p.ring ? 1.8 : 2.2);
        const d2 = pr(x + Math.cos(p.rot) * L, y + Math.sin(p.rot) * L, z);
        if (d2 < 4) continue;
        const ang = Math.atan2(SY - cy0, SX - cx0), len = Math.min(3400, Math.hypot(SX - cx0, SY - cy0));
        g.save(); g.translate(cx0, cy0); g.rotate(ang);
        g.drawImage(G.cloudSpr[p.spr % G.cloudSpr.length], -len, -r * 0.55, 2 * len, 1.1 * r);
        g.restore();
        SX = cx0; SY = cy0;
      }
      if (!direct) {
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha = a * 0.25;
        g.drawImage(G.goldGlow, SX - r * 0.8, SY - r * 0.6, 1.6 * r, 1.2 * r);
        g.globalCompositeOperation = 'source-over';
      }
      x0 = Math.min(x0, SX - r); x1 = Math.max(x1, SX + r); y0 = Math.min(y0, SY - r * 0.66); y1 = Math.max(y1, SY + r * 0.66);
    }
    if (direct) { ctx.restore(); return; }
    if (x1 < x0) return;
    const bx0 = Math.max(0, Math.floor(x0 / 2)), by0 = Math.max(0, Math.floor(y0 / 2));
    const bx1 = Math.min(L.width, Math.ceil(x1 / 2)), by1 = Math.min(L.height, Math.ceil(y1 / 2));
    if (bx1 <= bx0 || by1 <= by0) return;
    ctx.drawImage(L, bx0, by0, bx1 - bx0, by1 - by0, bx0 * 2, by0 * 2, (bx1 - bx0) * 2, (by1 - by0) * 2);
  }


  // pillar of cloud/fire above the Mishkan and the cloud-light falling on the hero
  function drawPillar(ctx, t) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const pa = sm(2.0, 3.0, t);
    for (let k = 0; k < 7 && pa > 0.01; k++) {
      const z = k * 40;
      const d = pr(G.mcx, G.mcy, z);
      if (d < 5) continue;
      const r = F * (34 + k * 2) / d;
      if (r > 1200) continue;
      ctx.globalAlpha = pa * 0.22 * (1 - k / 8);
      ctx.drawImage(G.goldGlow, SX - r, SY - r, 2 * r, 2 * r);
    }
    const d0 = pr(G.mcx, G.mcy, 4);
    if (d0 > 5 && pa > 0.01) { const r = F * 70 / d0; ctx.globalAlpha = 0.45 * pa; ctx.drawImage(G.pearlGlow, SX - r, SY - r, 2 * r, 2 * r); }
    // a soft shaft of cloud-light through the parted roof onto the hero sukkah
    const sh = sm(2.8, 5.0, t) * (1 - sm(7.6, 8.8, t));
    if (sh > 0.01) {
      for (let k = 1; k < 5; k++) {
        const z = 9 + k * k * 7;
        const d = pr(HC.x, HC.y, z);
        if (d < 3) continue;
        const r = F * (6 + k * 4) / d;
        if (r > 700) continue;
        ctx.globalAlpha = sh * 0.14 * (1 - sm(400, 700, r));
        ctx.drawImage(G.pearlGlow, SX - r, SY - r, 2 * r, 2 * r);
      }
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- the Mishkan (flat, as in drawCamp)
  function drawMishkan(ctx) {
    const m = WD.MISHKAN;
    const r = (x, y, w, h) => quad(ctx, x, y, 0, x + w, y, 0, x + w, y + h, 0, x, y + h, 0);
    ctx.beginPath(); r(m.x, m.y, m.w, m.h);
    ctx.fillStyle = rgb(fx.mixRGB([243, 230, 200], [150, 150, 175], 0.7), 0.95); ctx.fill();
    ctx.beginPath(); r(m.x + 3, m.y + 3, m.w - 6, m.h - 6);
    ctx.fillStyle = rgb([214, 196, 160], 0.7); ctx.fill();
    ctx.beginPath(); r(m.x + 8, m.y + m.h - 6 - m.h * 0.42, m.w - 16, m.h * 0.42);
    ctx.fillStyle = rgb([60, 40, 60]); ctx.fill();
  }

  // ---------------------------------------------------------------- ordinary sukkot
  const CLOTH = [38, 30, 44], RIDGE = [96, 84, 110];
  const INK = 'rgba(255,214,150,';
  // wall corner helper: base A->B with inward normal n, fold angle phi, height Hs
  function wallQuad(ctx, ax, ay, bx, by, nx, ny, phi, Hs) {
    const c = Math.cos(phi) * Hs, s = Math.sin(phi) * Hs;
    quad(ctx, ax, ay, 0, bx, by, 0, bx + nx * c, by + ny * c, s, ax + nx * c, ay + ny * c, s);
  }
  // corners in world space for sukkah s: (sx, sy) in {-1, 1}
  function cx_(s, sx, sy) { return s.x + s.ax * sx * s.w2 + s.bx * sy * s.h2; }
  function cy_(s, sx, sy) { return s.y + s.ay * sx * s.w2 + s.by * sy * s.h2; }

  // 5 wall panels: back, right, front-right, front-left, left. Returns via callback.
  function eachWall(s, fn) {
    const door = 0.22; // half door as a fraction of the width
    fn(-1, -1, 1, -1, 0, 1);      // back (east), inward +b
    fn(1, -1, 1, 1, -1, 0);       // right, inward -a
    fn(1, 1, door, 1, 0, -1);     // front right, inward -b
    fn(-door, 1, -1, 1, 0, -1);   // front left
    fn(-1, 1, -1, -1, 1, 0);      // left, inward +a
  }
  function wallPath(ctx, s, phi, a0, b0, a1, b1, ni, nj) {
    const ax = s.x + s.ax * a0 * s.w2 + s.bx * b0 * s.h2, ay = s.y + s.ay * a0 * s.w2 + s.by * b0 * s.h2;
    const bx = s.x + s.ax * a1 * s.w2 + s.bx * b1 * s.h2, by = s.y + s.ay * a1 * s.w2 + s.by * b1 * s.h2;
    const nx = s.ax * ni + s.bx * nj, ny = s.ay * ni + s.by * nj;
    wallQuad(ctx, ax, ay, bx, by, nx, ny, phi, s.Hs);
  }
  function stages(m) {
    return {
      line: clamp(m / 0.45), fold: fx.ease.inOut(clamp((m - 0.22) / 0.5)), sch: clamp((m - 0.55) / 0.45), lamp: sm(0.35, 0.9, m),
    };
  }
  // construction lines of an ordinary sukkah (footprint, posts, beams), partially drawn
  function linesPath(ctx, s, p) {
    const fp = clamp(p / 0.35), po = clamp((p - 0.2) / 0.45), be = clamp((p - 0.5) / 0.5);
    const cs = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (let k = 0; k < 4; k++) {
      const a = cs[k], b = cs[(k + 1) % 4];
      const ax = cx_(s, a[0], a[1]), ay = cy_(s, a[0], a[1]), bx = cx_(s, b[0], b[1]), by = cy_(s, b[0], b[1]);
      if (fp > 0) seg(ctx, ax, ay, 0, lerp(ax, bx, fp), lerp(ay, by, fp), 0);
      if (po > 0) seg(ctx, ax, ay, 0, ax, ay, s.Hs * po);
      if (be > 0) seg(ctx, ax, ay, s.Hs, lerp(ax, bx, be), lerp(ay, by, be), s.Hs);
    }
  }
  function schachPath(ctx, s, p, ticks) {
    if (p <= 0) return;
    const z = s.Hs + 0.15;
    for (let k = 0; k < s.str.length; k++) {
      const st = s.str[k];
      const q = clamp(p * 1.6 - k * 0.12);
      if (q <= 0) continue;
      // across the short (b) axis
      const ax = s.x + s.ax * st.u0 * s.w2 - s.bx * s.h2 * 1.1, ay = s.y + s.ay * st.u0 * s.w2 - s.by * s.h2 * 1.1;
      const bx = s.x + s.ax * st.u1 * s.w2 + s.bx * s.h2 * 1.1, by = s.y + s.ay * st.u1 * s.w2 + s.by * s.h2 * 1.1;
      const ex = lerp(ax, bx, q), ey = lerp(ay, by, q);
      seg(ctx, ax, ay, z, ex, ey, z);
      if (ticks) {
        for (let j = 1; j < 6; j++) {
          const u = j / 6; if (u > q) break;
          const px = lerp(ax, bx, u), py = lerp(ay, by, u);
          const l = 0.9 * (1 - u * 0.5);
          seg(ctx, px, py, z, px + s.ax * l + (bx - ax) * 0.06, py + s.ay * l + (by - ay) * 0.06, z - 0.1);
          seg(ctx, px, py, z, px - s.ax * l + (bx - ax) * 0.06, py - s.ay * l + (by - ay) * 0.06, z - 0.1);
        }
      }
    }
  }

  // which side of a wall the camera sees: true = exterior
  function wallFacing(s, a0, b0, a1, b1, ni, nj) {
    const mx = s.x + s.ax * (a0 + a1) / 2 * s.w2 + s.bx * (b0 + b1) / 2 * s.h2, my = s.y + s.ay * (a0 + a1) / 2 * s.w2 + s.by * (b0 + b1) / 2 * s.h2;
    const nx = -(s.ax * ni + s.bx * nj), ny = -(s.ay * ni + s.by * nj);
    return (C.px - mx) * nx + (C.py - my) * ny > 0;
  }
  const EXT = 'rgb(42,32,36)', INT = 'rgb(128,76,42)', FLOOR = 'rgb(214,150,80)', RIM = 'rgba(190,184,226,0.35)';
  const SCH = 'rgba(146,168,92,0.95)';

  // Canvas paths get quadratically slower with many subpaths, so big batches flush every ~160.
  class Batch {
    constructor(ctx, fill, style, lw) { this.ctx = ctx; this.fill = fill; this.style = style; this.lw = lw; this.p = new Path2D(); this.n = 0; }
    moveTo(x, y) { if (this.n >= 160) this.flush(); this.n++; this.p.moveTo(x, y); }
    lineTo(x, y) { this.p.lineTo(x, y); }
    closePath() { this.p.closePath(); }
    flush() {
      if (!this.n) return;
      const c = this.ctx;
      if (this.fill) { c.fillStyle = this.style; c.fill(this.p); } else { c.strokeStyle = this.style; c.lineWidth = this.lw; c.stroke(this.p); }
      this.p = new Path2D(); this.n = 0;
    }
  }

  // far sukkot: batched by style (drawn small, overlap order irrelevant)
  const FLAT = 'rgb(66,49,53)'; // CLOTH + drawCamp's 'lighter' amber glow at 0.11 (glow 0.5)
  function drawSukkotBatched(ctx, list, t, zoomPx) {
    const lw = clamp(zoomPx * 0.12, 0.5, 2.0);
    const n = list.length;
    const ms = new Float32Array(n), fo = new Float32Array(n);
    for (let k = 0; k < n; k++) { ms[k] = morph(list[k], t); fo[k] = stages(ms[k]).fold; }
    // shadows (slide under as the walls rise)
    let B = new Batch(ctx, true, 'rgba(20,12,8,0.14)');
    for (let k = 0; k < n; k++) {
      const s = list[k], o = 2.5 * (1 - fo[k]);
      if (o < 0.05) continue;
      quad(B, cx_(s, -1, -1) + o, cy_(s, -1, -1) + o, 0, cx_(s, 1, -1) + o, cy_(s, 1, -1) + o, 0, cx_(s, 1, 1) + o, cy_(s, 1, 1) + o, 0, cx_(s, -1, 1) + o, cy_(s, -1, 1) + o, 0);
    }
    B.flush();
    // lamp-lit floors
    B = new Batch(ctx, true, FLOOR);
    for (let k = 0; k < n; k++) {
      const s = list[k];
      if (ms[k] < 0.22) continue;
      quad(B, cx_(s, -1, -1), cy_(s, -1, -1), 0, cx_(s, 1, -1), cy_(s, 1, -1), 0, cx_(s, 1, 1), cy_(s, 1, 1), 0, cx_(s, -1, 1), cy_(s, -1, 1), 0);
    }
    B.flush();
    // cloth: flat tent -> walls. Inner faces (lamp-lit) first, then outer faces and flat cloth.
    const bIn = new Batch(ctx, true, INT), bOut = new Batch(ctx, true, EXT), bFlat = new Batch(ctx, true, FLAT);
    const bRim = new Batch(ctx, false, RIM, Math.max(0.6, lw * 0.7));
    for (let k = 0; k < n; k++) {
      const s = list[k], fold = fo[k], phi = fold * Math.PI / 2;
      if (fold < 0.35) { // the lying flaps still cover the whole footprint: one quad
        quad(bFlat, cx_(s, -1, -1), cy_(s, -1, -1), 0, cx_(s, 1, -1), cy_(s, 1, -1), 0, cx_(s, 1, 1), cy_(s, 1, 1), 0, cx_(s, -1, 1), cy_(s, -1, 1), 0);
        continue;
      }
      eachWall(s, (a0, b0, a1, b1, ni, nj) => {
        const out = wallFacing(s, a0, b0, a1, b1, ni, nj);
        wallPath(out ? bOut : bIn, s, phi, a0, b0, a1, b1, ni, nj);
        if (fold > 0.9) seg(bRim, cx_(s, a0, b0), cy_(s, a0, b0), s.Hs, cx_(s, a1, b1), cy_(s, a1, b1), s.Hs);
      });
    }
    bIn.flush(); bOut.flush(); bFlat.flush(); bRim.flush();
    // tent ridge, shrinking away
    B = new Batch(ctx, false, rgb(RIDGE, 0.9), clamp(1.1 * zoomPx / 1.45, 0.6, 1.6));
    for (let k = 0; k < n; k++) {
      const s = list[k], q = 1 - clamp(fo[k] / 0.4);
      if (q <= 0) continue;
      seg(B, s.x - s.ax * s.w2 * q, s.y - s.ay * s.w2 * q, 0.01, s.x + s.ax * s.w2 * q, s.y + s.ay * s.w2 * q, 0.01);
    }
    B.flush();
    // schach
    B = new Batch(ctx, false, SCH, lw * 1.2);
    for (let k = 0; k < n; k++) if (ms[k] > 0.55) schachPath(B, list[k], stages(ms[k]).sch, zoomPx > 5);
    B.flush();
    // gold construction drawing: bright while it is being drawn, then it settles into the wood
    const ink = [0, 1, 2].map((b) => new Batch(ctx, false, INK + (0.3 + 0.32 * b) + ')', lw));
    for (let k = 0; k < n; k++) {
      const m = ms[k];
      if (m <= 0 || m >= 1) continue;
      const fade = 1 - sm(0.6, 1, m);
      linesPath(ink[fade > 0.66 ? 2 : fade > 0.33 ? 1 : 0], list[k], stages(m).line);
    }
    ink.forEach((b) => b.flush());
  }

  // near sukkot: individually, in depth order, with facing-aware walls
  function drawSukkahNear(ctx, s, t) {
    const m = morph(s, t), st = stages(m), phi = st.fold * Math.PI / 2;
    const above = C.pz > s.Hs;
    ctx.beginPath();
    quad(ctx, cx_(s, -1, -1), cy_(s, -1, -1), 0, cx_(s, 1, -1), cy_(s, 1, -1), 0, cx_(s, 1, 1), cy_(s, 1, 1), 0, cx_(s, -1, 1), cy_(s, -1, 1), 0);
    ctx.fillStyle = m > 0.22 ? FLOOR : FLAT; ctx.fill();
    const inner = [], outer = [];
    eachWall(s, (a0, b0, a1, b1, ni, nj) => {
      (wallFacing(s, a0, b0, a1, b1, ni, nj) && phi > 0.5 ? outer : inner).push([a0, b0, a1, b1, ni, nj]);
    });
    ctx.beginPath(); for (const w of inner) wallPath(ctx, s, phi, ...w);
    ctx.fillStyle = phi > 0.5 ? INT : FLAT; ctx.fill();
    const wood = sm(0.45, 0.75, m);
    const posts = () => {
      if (wood <= 0) return;
      ctx.beginPath();
      for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const x = cx_(s, a, b), y = cy_(s, a, b); strip(ctx, x, y, 0, x, y, s.Hs + 0.25, 0.28, 0.7); }
      ctx.fillStyle = rgb([96, 66, 42], wood); ctx.fill();
    };
    const sch = () => {
      if (m < 1) { ctx.beginPath(); linesPath(ctx, s, st.line); ctx.strokeStyle = INK + (0.8 * (1 - sm(0.6, 1, m))) + ')'; ctx.lineWidth = 1.4; ctx.stroke(); }
      if (st.sch > 0) {
        ctx.beginPath(); schachPath(ctx, s, st.sch, true); ctx.strokeStyle = 'rgba(96,120,62,0.95)'; ctx.lineWidth = 2.6; ctx.stroke();
        ctx.beginPath(); schachPath(ctx, s, st.sch * 0.97, true); ctx.strokeStyle = 'rgba(176,184,110,0.8)'; ctx.lineWidth = 1.1; ctx.stroke();
      }
    };
    if (!above) sch();
    if (outer.length) {
      ctx.beginPath(); for (const w of outer) wallPath(ctx, s, phi, ...w);
      ctx.fillStyle = EXT; ctx.fill();
      if (pr(s.x, s.y, 3) > 0 && F * s.w2 / Math.max(1, depth(s.x, s.y, 3)) > 60) for (const w of outer) wallSeams(ctx, s, phi, w, 'rgba(104,84,78,0.5)');
      if (phi > 1.4) {
        ctx.beginPath();
        for (const w of outer) seg(ctx, cx_(s, w[0], w[1]), cy_(s, w[0], w[1]), s.Hs, cx_(s, w[2], w[3]), cy_(s, w[2], w[3]), s.Hs);
        ctx.strokeStyle = RIM; ctx.lineWidth = 1.2; ctx.stroke();
      }
    }
    posts();
    if (above) sch();
  }


  function lampGlows(ctx, list, t) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const s of list) {
      const m = morph(s, t);
      const a = stages(m).lamp, pulse = m > 0 && m < 1 ? Math.sin(Math.PI * clamp((m - 0.05) / 0.7)) : 0;
      if (a <= 0.01 && pulse <= 0.01) continue;
      const d = pr(s.x, s.y, s.Hs * 0.6);
      if (d < 2) continue;
      const r = F * 7 / d;
      if (r < 1.5 || (r < 10 && pulse < 0.05)) continue;
      const q = r * (1 + 1.2 * pulse), al = Math.min(0.75, 0.42 * a + 0.55 * pulse);
      ctx.globalAlpha = al;
      ctx.drawImage(pulse > a ? G.goldGlow : G.amberGlow, SX - q, SY - q, 2 * q, 2 * q);
    }
    ctx.restore();
  }


  // ---------------------------------------------------------------- the hero sukkah
  function heroLampGradient(ctx) {
    const l = G.lamp;
    const d = pr(l[0], l[1], l[2]);
    let x = SX, y = SY;
    if (d < 0.3) { x = CX; y = H * 1.3; }
    const r = F * 10 / Math.max(d, 0.5);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    return { g, x, y, r, d };
  }

  function drawHero(ctx, t, mask) {
    const s = G.SK[G.hero], h = G.h;
    const m = morph(s, t), st = stages(m), phi = st.fold * Math.PI / 2;
    const above = C.pz > s.Hs;
    const lampOn = sm(0.4, 0.8, m);
    const LG = heroLampGradient(ctx);
    const warm = (c0, c1, c2) => {
      const g = ctx.createRadialGradient(LG.x, LG.y, 0, LG.x, LG.y, LG.r);
      g.addColorStop(0, rgb(mix(c2, c0, lampOn))); g.addColorStop(0.35, rgb(mix(c2, c1, lampOn))); g.addColorStop(1, rgb(c2));
      return g;
    };
    const K = mask ? '#000' : null;

    // shadow while it is still a tent
    const o = 2.5 * (1 - st.fold);
    if (o > 0.05 && !mask) {
      ctx.beginPath();
      quad(ctx, cx_(s, -1, -1) + o, cy_(s, -1, -1) + o, 0, cx_(s, 1, -1) + o, cy_(s, 1, -1) + o, 0, cx_(s, 1, 1) + o, cy_(s, 1, 1) + o, 0, cx_(s, -1, 1) + o, cy_(s, -1, 1) + o, 0);
      ctx.fillStyle = 'rgba(20,12,8,0.14)'; ctx.fill();
    }
    // light spilling out of the door onto the sand
    if (!mask && lampOn > 0) {
      const dx = cx_(s, 0, 1.6), dy = cy_(s, 0, 1.6);
      const d = pr(dx, dy, 0.2);
      if (d > 1) {
        const r = F * 6 / d;
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35 * lampOn;
        ctx.drawImage(G.amberGlow, SX - r, SY - r * 0.6, 2 * r, 1.2 * r); ctx.restore();
      }
    }
    // floor
    ctx.beginPath();
    quad(ctx, cx_(s, -1, -1), cy_(s, -1, -1), 0, cx_(s, 1, -1), cy_(s, 1, -1), 0, cx_(s, 1, 1), cy_(s, 1, 1), 0, cx_(s, -1, 1), cy_(s, -1, 1), 0);
    ctx.fillStyle = K || warm([230, 170, 100], [150, 96, 52], [58, 40, 34]); ctx.fill();

    // walls split by facing
    const inner = [], outer = [];
    eachWall(s, (a0, b0, a1, b1, ni, nj) => {
      const mx = s.x + s.ax * (a0 + a1) / 2 * s.w2 + s.bx * (b0 + b1) / 2 * s.h2, my = s.y + s.ay * (a0 + a1) / 2 * s.w2 + s.by * (b0 + b1) / 2 * s.h2;
      const nx = -(s.ax * ni + s.bx * nj), ny = -(s.ay * ni + s.by * nj);
      const facing = (C.px - mx) * nx + (C.py - my) * ny > 0;
      (facing && phi > 0.5 ? outer : inner).push([a0, b0, a1, b1, ni, nj, depth(mx, my, 3)]);
    });
    inner.sort((a, b) => b[6] - a[6]);
    const interiorFill = K || (phi > 0.5 ? warm([168, 106, 60], [98, 60, 40], [34, 25, 32]) : rgb(CLOTH));
    tm(ctx, 'h.inner', () => { for (const w of inner) {
      ctx.beginPath(); wallPath(ctx, s, phi, w[0], w[1], w[2], w[3], w[4], w[5]);
      ctx.fillStyle = interiorFill; ctx.fill();
      if (!mask) wallSeams(ctx, s, phi, w, phi > 0.5 ? 'rgba(40,22,14,0.5)' : rgb(RIDGE, 0.25));
    } });
    // tent ridge
    const rk = 1 - clamp(st.fold / 0.4);
    if (rk > 0 && !mask) {
      ctx.beginPath(); seg(ctx, s.x - s.ax * s.w2 * rk, s.y - s.ay * s.w2 * rk, 0.01, s.x + s.ax * s.w2 * rk, s.y + s.ay * s.w2 * rk, 0.01);
      ctx.strokeStyle = rgb(RIDGE, 0.9); ctx.lineWidth = 1.2; ctx.stroke();
    }
    if (!mask && lampOn > 0) tm(ctx, 'h.lamp', () => drawLamp(ctx, t, lampOn));

    const roof = () => { tm(ctx, 'h.frame', () => drawHeroFrame(ctx, s, st, m, mask, true)); tm(ctx, 'h.fronds', () => drawFronds(ctx, t, m, mask)); };
    if (!above) roof();
    for (const w of outer) {
      ctx.beginPath(); wallPath(ctx, s, phi, w[0], w[1], w[2], w[3], w[4], w[5]);
      ctx.fillStyle = K || EXT; ctx.fill();
      if (!mask) wallSeams(ctx, s, phi, w, 'rgba(110,90,84,0.55)');
    }
    drawHeroFrame(ctx, s, st, m, mask, false);
    if (above) roof();
  }

  function wallSeams(ctx, s, phi, w, col) {
    // goat-hair cloth is woven in long strips sewn edge to edge: horizontal seams, a hem at the top
    const [a0, b0, a1, b1, ni, nj] = w;
    const ax = s.x + s.ax * a0 * s.w2 + s.bx * b0 * s.h2, ay = s.y + s.ay * a0 * s.w2 + s.by * b0 * s.h2;
    const bx = s.x + s.ax * a1 * s.w2 + s.bx * b1 * s.h2, by = s.y + s.ay * a1 * s.w2 + s.by * b1 * s.h2;
    const nx = s.ax * ni + s.bx * nj, ny = s.ay * ni + s.by * nj;
    const c = Math.cos(phi) * s.Hs, z = Math.sin(phi) * s.Hs;
    ctx.beginPath();
    for (const f of [0.17, 0.36, 0.55, 0.74, 0.93]) {
      strip(ctx, ax + nx * c * f, ay + ny * c * f, z * f, bx + nx * c * f, by + ny * c * f, z * f, f > 0.9 ? 0.16 : 0.07, 0.6);
    }
    ctx.fillStyle = col; ctx.fill();
  }


  function drawHeroFrame(ctx, s, st, m, mask, top) {
    const cs = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    const wood = sm(0.35, 0.6, m);
    const Hs = s.Hs;
    if (!top) {
      // posts: wood strips, with the gold construction line drawn first
      if (wood > 0) {
        ctx.beginPath();
        for (const c of cs) { const x = cx_(s, c[0], c[1]), y = cy_(s, c[0], c[1]); strip(ctx, x, y, 0, x, y, Hs + 0.2, 0.32, 0.8); }
        // door posts
        for (const sx of [-0.22, 0.22]) { const x = cx_(s, sx, 1), y = cy_(s, sx, 1); strip(ctx, x, y, 0, x, y, Hs, 0.22, 0.6); }
        ctx.fillStyle = mask ? '#000' : rgb([92, 64, 42], wood); ctx.fill();
      }
      if (!mask) {
        const p = st.line, po = clamp((p - 0.2) / 0.45), fp = clamp(p / 0.35);
        const ia = 0.95 * (1 - sm(0.55, 0.9, m));
        if (ia > 0.01) {
          ctx.beginPath();
          const dg = clamp((p - 0.3) / 0.5);
          for (let k = 0; k < 4; k++) {
            const a = cs[k], b = cs[(k + 1) % 4];
            const ax = cx_(s, a[0], a[1]), ay = cy_(s, a[0], a[1]), bx = cx_(s, b[0], b[1]), by = cy_(s, b[0], b[1]);
            if (fp > 0) seg(ctx, ax, ay, 0.02, lerp(ax, bx, fp), lerp(ay, by, fp), 0.02);
            if (po > 0) seg(ctx, ax, ay, 0, ax, ay, Hs * po);
            // construction diagonals, measured out and then let go
            if (dg > 0) seg(ctx, ax, ay, 0, lerp(ax, bx, dg), lerp(ay, by, dg), Hs * dg);
          }
          ctx.strokeStyle = INK + ia + ')'; ctx.lineWidth = 1.5; ctx.stroke();
        }
        // joints
        if (po > 0 && wood < 1) {
          ctx.fillStyle = INK + (0.9 * (1 - wood)) + ')';
          for (const c of cs) { const x = cx_(s, c[0], c[1]), y = cy_(s, c[0], c[1]); if (pr(x, y, 0) > 1) { ctx.beginPath(); ctx.arc(SX, SY, 3, 0, 7); ctx.fill(); } }
        }
      }
      return;
    }
    // top: beams and lathes
    const be = clamp((st.line - 0.5) / 0.5);
    if (be > 0) {
      ctx.beginPath();
      for (let k = 0; k < 4; k++) {
        const a = cs[k], b = cs[(k + 1) % 4];
        const ax = cx_(s, a[0], a[1]), ay = cy_(s, a[0], a[1]), bx = cx_(s, b[0], b[1]), by = cy_(s, b[0], b[1]);
        if (wood > 0) strip(ctx, ax, ay, Hs, lerp(ax, bx, be), lerp(ay, by, be), Hs, 0.26, 0.7);
      }
      const la = sm(0.45, 0.62, m);
      if (la > 0) for (const l of G.lathes) strip(ctx, l[0], l[1], l[2], lerp(l[0], l[3], la), lerp(l[1], l[4], la), l[5], 0.16, 0.6);
      ctx.fillStyle = mask ? '#000' : rgb([84, 58, 38], Math.max(wood, 0.001)); ctx.fill();
      if (!mask) {
        ctx.beginPath();
        for (let k = 0; k < 4; k++) {
          const a = cs[k], b = cs[(k + 1) % 4];
          const ax = cx_(s, a[0], a[1]), ay = cy_(s, a[0], a[1]), bx = cx_(s, b[0], b[1]), by = cy_(s, b[0], b[1]);
          seg(ctx, ax, ay, Hs, lerp(ax, bx, be), lerp(ay, by, be), Hs);
        }
        ctx.strokeStyle = INK + (0.95 * (1 - sm(0.55, 0.9, m))) + ')'; ctx.lineWidth = 1.5; ctx.stroke();
      }
    }
  }

  // palm fronds: spine strips + leaflet quads in world space, coloured by light buckets
  // leaflets are stroked lines (base -> bent middle -> tip), bucketed by perspective width and lamp light
  const LW = [1.2, 2.2, 3.6, 5.6];
  function drawFronds(ctx, t, m, mask) {
    const below = sm(G.h.Hs + 1.5, G.h.Hs - 0.5, C.pz); // 1 when seen from below
    const l = G.lamp;
    const aboveCols = [[92, 116, 62], [124, 144, 78], [160, 172, 104]];
    const belowCols = [[50, 56, 32], [106, 108, 58], [176, 158, 86]];
    const bat = [];
    for (let c = 0; c < 3; c++) for (let w = 0; w < 4; w++) {
      bat.push(new Batch(ctx, false, mask ? '#000' : rgb(mix(aboveCols[c], belowCols[c], below)), LW[w]));
    }
    const spines = new Batch(ctx, true, mask ? '#000' : rgb(mix([120, 132, 76], [92, 74, 42], below)));
    const sway = 0.035 * Math.sin(t * 0.9);
    // in the last stretch of the cross-fade into beat 4 (which draws its own schach on top) the
    // leaflets thin out one by one: unseen under the dissolve, and it keeps those frames affordable
    const thin = t > 8.6 ? 0.75 * sm(8.6, 9.9, t) : 0;
    for (const fr of G.fronds) {
      const g = clamp((m - fr.start) / 0.22);
      if (g <= 0) continue;
      const sp = fr.spine, NS = fr.NS;
      const gl = g * NS;
      for (let j = 0; j < NS; j++) {
        if (j >= gl) break;
        const k = Math.min(1, gl - j);
        const a = 3 * j, c = 3 * (j + 1);
        strip(spines, sp[a], sp[a + 1], sp[a + 2], lerp(sp[a], sp[c], k), lerp(sp[a + 1], sp[c + 1], k), lerp(sp[a + 2], sp[c + 2], k), 0.06 * (1 - j / NS * 0.6), 0.6);
      }
      for (const lf of fr.leaves) {
        const grow = clamp((g - lf.s) * 4 + 0.3);
        if (grow <= 0) continue;
        if (thin > 0) { const hh = Math.sin(lf.tw * 9173.1 + lf.droop * 1731.7 + lf.k * 12.9) * 43758.5; if (hh - Math.floor(hh) < thin) continue; }
        const f = lf.s * NS, j = Math.min(NS - 1, Math.floor(f)), u = f - j;
        const a = 3 * j, c = 3 * (j + 1);
        const bx = lerp(sp[a], sp[c], u), by = lerp(sp[a + 1], sp[c + 1], u), bz = lerp(sp[a + 2], sp[c + 2], u);
        let tx = sp[c] - sp[a], ty = sp[c + 1] - sp[a + 1];
        const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
        const ang = lf.ang + lf.tw + sway * lf.side;
        const ca = Math.cos(ang), sa = Math.sin(ang) * lf.side;
        const dx = tx * ca - ty * sa, dy = tx * sa + ty * ca;
        const len = lf.len * grow;
        const mx = bx + dx * len * 0.5, my = by + dy * len * 0.5, mz = bz + lf.lift * grow - lf.droop * 0.25 * grow;
        const ex = bx + dx * len, ey = by + dy * len, ez = bz + lf.lift * grow - lf.droop * grow;
        const dm = depth(mx, my, mz);
        if (dm < NEAR || (dm > 8 && (lf.k & 1))) continue;
        const wpx = F * 0.03 / dm;
        const wb = wpx > 4.6 ? 3 : wpx > 2.9 ? 2 : wpx > 1.7 ? 1 : 0;
        let cb;
        if (below > 0.5) { const dl = Math.hypot(bx - l[0], by - l[1], bz - l[2]); cb = dl < 5.9 ? 2 : dl < 7.4 ? 1 : 0; }
        else cb = (fr.tone * 3) | 0;
        const B = bat[cb * 4 + wb];
        if (dm < 6.5) {
          if (clipSeg(bx, by, bz, mx, my, mz)) { B.moveTo(L0x, L0y); B.lineTo(L1x, L1y); }
          if (clipSeg(mx, my, mz, ex, ey, ez)) { B.moveTo(L0x, L0y); B.lineTo(L1x, L1y); }
        } else if (clipSeg(bx, by, bz, ex, ey, ez)) { B.moveTo(L0x, L0y); B.lineTo(L1x, L1y); }
      }
    }
    for (const B of bat) B.flush();
    spines.flush();
  }


  function drawLamp(ctx, t, on) {
    const s = G.SK[G.hero];
    const l = G.lamp;
    // stool: a small wooden box
    const L = G.L, h = G.h;
    const x0 = -0.55, x1 = 0.55, y0 = -h.h2 + 0.35, y1 = -h.h2 + 1.45, z1 = 2.2;
    const P = (lx, ly, z) => { const p = L(lx, ly); return [p[0], p[1], z]; };
    const faces = [
      [P(x0, y1, 0), P(x1, y1, 0), P(x1, y1, z1), P(x0, y1, z1)],
      [P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)],
      [P(x1, y0, 0), P(x1, y1, 0), P(x1, y1, z1), P(x1, y0, z1)],
      [P(x0, y0, 0), P(x0, y1, 0), P(x0, y1, z1), P(x0, y0, z1)],
    ];
    const cols = ['rgb(92,58,34)', 'rgb(150,100,56)', 'rgb(70,44,28)', 'rgb(70,44,28)'];
    faces.forEach((f, k) => { ctx.beginPath(); quad(ctx, ...f[0], ...f[1], ...f[2], ...f[3]); ctx.fillStyle = cols[k]; ctx.fill(); });
    // clay lamp
    const d = pr(l[0], l[1], l[2]);
    if (d < 0.2) return;
    const r = F * 0.42 / d, x = SX, y = SY;
    ctx.fillStyle = 'rgb(120,70,40)';
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.42, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgb(160,100,58)';
    ctx.beginPath(); ctx.ellipse(x - r * 0.1, y - r * 0.12, r * 0.7, r * 0.22, 0, 0, Math.PI * 2); ctx.fill();
    // flame at the nozzle
    const fl = 1 + 0.08 * Math.sin(t * 13) + 0.05 * Math.sin(t * 29 + 1);
    const fx_ = x + r * 0.85, fy = y - r * 0.3;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = on;
    const R1 = Math.min(700, F * 2.2 / d);
    ctx.drawImage(G.amberGlow, fx_ - R1, fy - R1, 2 * R1, 2 * R1);
    const R2 = F * 0.8 / d;
    ctx.drawImage(G.goldGlow, fx_ - R2, fy - R2 * 1.2, 2 * R2, 2 * R2);
    ctx.fillStyle = 'rgba(255,236,190,0.95)';
    const fh = r * 0.75 * fl;
    ctx.beginPath(); ctx.moveTo(fx_, fy - fh); ctx.quadraticCurveTo(fx_ + r * 0.22, fy - fh * 0.2, fx_, fy); ctx.quadraticCurveTo(fx_ - r * 0.22, fy - fh * 0.2, fx_, fy - fh); ctx.fill();
    ctx.restore();
  }

  // ---------------------------------------------------------------- frame
  // stage wrapper (kept as a seam for profiling; it never changes the image)
  function tm(ctx, k, f) { return f(); }
  function draw(ctx, t) {
    setCam(t);
    const base = ctx.getTransform();
    const zoomPx = F / C.pz;
    tm(ctx, 'bg', () => drawBackground(ctx, t, base));
    tm(ctx, 'sky', () => drawSky(ctx, t));
    const hs = G.SK[G.hero];
    const heroDepth = depth(hs.x, hs.y, 3);
    tm(ctx, 'puffs', () => drawPuffs(ctx, t, false, heroDepth));
    const inside = insideHero();
    if (!inside) tm(ctx, 'pillar', () => drawPillar(ctx, t));
    // the seam with beat 2: until the wave of change begins, the camp is exactly WORLD.drawCamp
    if (t < 1.2) {
      ctx.save(); planeTransform(ctx, base, 0); ctx.scale(1 / zoomPx, 1 / zoomPx); ctx.translate(-CX, -CY);
      WD.drawCamp(ctx, { x: 0, y: 0, zoom: zoomPx }, { night: 1, glow: 0.5 }, { W, H });
      ctx.restore();
      tm(ctx, 'puffs2', () => drawPuffs(ctx, t, true, heroDepth, true));
      return;
    }
    tm(ctx, 'mish', () => drawMishkan(ctx));

    // cull & sort
    const vis = [];
    for (const s of G.SK) {
      if (s.hero || inside) continue;
      const d = pr(s.x, s.y, s.Hs * 0.5);
      if (d < 0.5) continue;
      const r = F * 8 / d;
      if (SX < -r || SX > W + r || SY < -r || SY > H + r) continue;
      vis.push([d, s, r]);
    }
    vis.sort((a, b) => b[0] - a[0]);
    let nearN = 0;
    if (C.pz < 120) for (let i = vis.length - 1; i >= 0 && nearN < 14 && vis[i][2] > 80; i--) nearN++;
    const far = vis.slice(0, Math.max(0, vis.length - nearN)).map((v) => v[1]);
    const near = vis.slice(Math.max(0, vis.length - nearN));
    tm(ctx, 'batch', () => drawSukkotBatched(ctx, far, t, zoomPx));
    tm(ctx, 'glowsFar', () => lampGlows(ctx, far, t));
    let heroDone = false;
    for (const [d, s, rr] of near) {
      if (!heroDone && d < heroDepth) { tm(ctx, 'hero', () => drawHero(ctx, t, false)); heroDone = true; }
      tm(ctx, 'near', () => drawSukkahNear(ctx, s, t));
      lampGlows(ctx, [s], t);
    }
    if (!heroDone) tm(ctx, 'hero', () => drawHero(ctx, t, false));
    tm(ctx, 'puffs2', () => drawPuffs(ctx, t, true, heroDepth, true));
  }

  // ---------------------------------------------------------------- grains
  let GR = null;
  function buildGrains(env, R) {
    const N = env.GRAINS;
    const SK = G.SK, h = G.SK[G.hero];
    const A = new Float32Array(N * 3);   // start: sparkle inside the cloud ring/roof (puff index + offset)
    const Bp = new Float32Array(N * 3);  // target on a sukkah (3D)
    const Ta = new Float32Array(N);      // arrival time
    const Cp = new Float32Array(N * 3);  // point on the hero sukkah (3D)
    const Tg = new Float32Array(N);      // gather time
    const Dk = new Uint8Array(N);        // end kind 0 star 1 fleck 2 mote
    const Dp = new Float32Array(N * 3);  // end data
    const Tf = new Float32Array(N);
    const Ph = new Float32Array(N);
    const heroPts = heroPoints(R, 1400);
    const NH = 800;
    const others = SK.filter((s) => !s.hero);
    for (let i = 0; i < N; i++) {
      Ph[i] = R() * 6.28;
      // start in a cloud puff
      // start where beat 2 leaves them: sparkling in its cloud ring, canopy and pillar vortex
      // (t0 screen coords), lifted onto the cloud plane at height ZL so they swell away with it
      let px, py;
      const q = R();
      if (q < 0.72) {
        const a = R() * Math.PI * 2, c = Math.abs(Math.cos(a)), sn = Math.abs(Math.sin(a));
        const rr = (1 / Math.pow(Math.pow(c, 3.2) + Math.pow(sn, 3.2), 1 / 3.2)) * (0.93 + R() * 0.12);
        px = CX + Math.cos(a) * rr * 560 + (R() - 0.5) * 50; py = CY + Math.sin(a) * rr * 600 + (R() - 0.5) * 50;
      } else if (q < 0.86) { const a = R() * 6.28, rr = 8 + Math.pow(R(), 0.9) * 130; px = CX + Math.cos(a) * rr; py = CY + Math.sin(a) * rr; }
      else { const a = R() * 6.28, rr = 120 + Math.sqrt(R()) * 300; px = CX + Math.cos(a) * rr; py = CY + Math.sin(a) * rr * 1.1; }
      const kk = (Z0 - ZL) / F;
      A[3 * i] = WD.CAM_CAMP.x + (px - CX) * kk; A[3 * i + 1] = WD.CAM_CAMP.y + (py - CY) * kk; A[3 * i + 2] = ZL + (R() - 0.5) * 6;
      let s;
      if (i < NH) s = h; else s = others[(R() * others.length) | 0];
      // element on that sukkah
      const e = R(), cs = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
      const c = cs[(R() * 4) | 0], c2 = cs[(cs.indexOf(c) + 1) % 4];
      let x, y, z, when;
      const u = R();
      if (s.hero && i < 520) {
        const hp = heroPoints.pick(heroPts, i);
        x = hp[0]; y = hp[1]; z = hp[2]; when = hp[3];
      } else if (e < 0.3) { // footprint edge
        x = lerp(cx_(s, c[0], c[1]), cx_(s, c2[0], c2[1]), u); y = lerp(cy_(s, c[0], c[1]), cy_(s, c2[0], c2[1]), u); z = 0; when = 0.35 * 0.45 * u;
      } else if (e < 0.55) { // post
        x = cx_(s, c[0], c[1]); y = cy_(s, c[0], c[1]); z = s.Hs * u; when = 0.45 * (0.2 + 0.45 * u);
      } else if (e < 0.75) { // beam
        x = lerp(cx_(s, c[0], c[1]), cx_(s, c2[0], c2[1]), u); y = lerp(cy_(s, c[0], c[1]), cy_(s, c2[0], c2[1]), u); z = s.Hs; when = 0.45 * (0.5 + 0.5 * u);
      } else { // schach stroke
        const st = s.str[(R() * s.str.length) | 0];
        const ax = s.x + s.ax * st.u0 * s.w2 - s.bx * s.h2 * 1.1, ay = s.y + s.ay * st.u0 * s.w2 - s.by * s.h2 * 1.1;
        const bx = s.x + s.ax * st.u1 * s.w2 + s.bx * s.h2 * 1.1, by = s.y + s.ay * st.u1 * s.w2 + s.by * s.h2 * 1.1;
        x = lerp(ax, bx, u); y = lerp(ay, by, u); z = s.Hs + 0.15; when = 0.55 + 0.45 * u / 1.6;
      }
      Bp[3 * i] = x; Bp[3 * i + 1] = y; Bp[3 * i + 2] = z;
      Ta[i] = s.t0 + when * s.dur;
      // gather onto the hero
      const hp = heroPts[(R() * heroPts.length) | 0];
      if (s.hero && i < 520) { Cp[3 * i] = x; Cp[3 * i + 1] = y; Cp[3 * i + 2] = z; Tg[i] = 99; }
      else { Cp[3 * i] = hp[0]; Cp[3 * i + 1] = hp[1]; Cp[3 * i + 2] = hp[2]; Tg[i] = Math.max(Ta[i] + 0.4, 4.3 + R() * 1.9); }
      // end state
      const k = R();
      Tf[i] = 7.0 + R() * 1.4;
      if (k < 0.4) { Dk[i] = 0; }
      else if (k < 0.65) {
        Dk[i] = 1;
        const fp = heroPts.fleck[(R() * heroPts.fleck.length) | 0];
        Dp[3 * i] = fp[0]; Dp[3 * i + 1] = fp[1]; Dp[3 * i + 2] = fp[2];
      } else {
        Dk[i] = 2;
        const q = G.L((R() * 2 - 1) * (h.w2 - 0.6), -h.h2 + 0.6 + R() * 5.5);
        Dp[3 * i] = q[0]; Dp[3 * i + 1] = q[1]; Dp[3 * i + 2] = 1.2 + R() * 5.0;
      }
    }
    GR = { A, Bp, Ta, Cp, Tg, Dk, Dp, Tf, Ph, starDir: new Float32Array(N * 3) };
  }

  // points along the hero structure (with the morph time at which each is drawn) and frond flecks
  function heroPoints(R, n) {
    const s = G.SK[G.hero], pts = [], fleck = [];
    const cs = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (let i = 0; i < n; i++) {
      const e = R(), u = R(), c = cs[(R() * 4) | 0], c2 = cs[(cs.indexOf(c) + 1) % 4];
      const fc = R() < 0.5 ? -1 : 1; // front corners only: the grains trace what the eye can see
      if (e < 0.08) pts.push([lerp(cx_(s, -1, 1), cx_(s, 1, 1), u), lerp(cy_(s, -1, 1), cy_(s, 1, 1), u), 0, 0.45 * 0.35 * u]);
      else if (e < 0.2) pts.push([cx_(s, fc, 1), cy_(s, fc, 1), s.Hs * u, 0.45 * (0.2 + 0.45 * u)]);
      else if (e < 0.34) pts.push([lerp(cx_(s, c[0], c[1]), cx_(s, c2[0], c2[1]), u), lerp(cy_(s, c[0], c[1]), cy_(s, c2[0], c2[1]), u), s.Hs, 0.45 * (0.5 + 0.5 * u)]);
      else {
        const fr = G.fronds[(R() * G.fronds.length) | 0], sp = fr.spine;
        const f = u * fr.NS, j = Math.min(fr.NS - 1, Math.floor(f)), v = f - j;
        const p = [lerp(sp[3 * j], sp[3 * j + 3], v), lerp(sp[3 * j + 1], sp[3 * j + 4], v), lerp(sp[3 * j + 2], sp[3 * j + 5], v) - 0.05];
        pts.push([p[0], p[1], p[2], fr.start + 0.22 * u]);
      }
    }
    // flecks: leaflet tips and edges of fronds
    for (const fr of G.fronds) {
      const sp = fr.spine;
      for (const lf of fr.leaves) {
        if (R() < 0.6) continue;
        const f = lf.s * fr.NS, j = Math.min(fr.NS - 1, Math.floor(f)), v = f - j;
        const bx = lerp(sp[3 * j], sp[3 * j + 3], v), by = lerp(sp[3 * j + 1], sp[3 * j + 4], v), bz = lerp(sp[3 * j + 2], sp[3 * j + 5], v);
        let tx = sp[3 * j + 3] - sp[3 * j], ty = sp[3 * j + 4] - sp[3 * j + 1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
        const ca = Math.cos(lf.ang), sa = Math.sin(lf.ang) * lf.side;
        const dx = tx * ca - ty * sa, dy = tx * sa + ty * ca, q = 0.4 + R() * 0.6;
        fleck.push([bx + dx * lf.len * q, by + dy * lf.len * q, bz - lf.droop * q - 0.03]);
      }
    }
    pts.fleck = fleck;
    return pts;
  }
  heroPoints.pick = (pts, i) => pts[i % pts.length];

  // choose star directions that fall in the gaps of the schach at the end camera
  function buildStarMask(env) {
    const N = env.GRAINS, mw = 270, mh = 480, sc = mw / W;
    const c = fx.canvas(mw, mh), g = c.getContext('2d');
    const test = [];
    for (const tt of [8.6, 9.4, 10]) {
      setCam(tt);
      g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#fff'; g.fillRect(0, 0, mw, mh);
      g.setTransform(sc, 0, 0, sc, 0, 0);
      drawHero(g, tt, true);
      test.push({ cam: Object.assign({}, C), data: g.getImageData(0, 0, mw, mh).data });
    }
    const R = fx.rng(909);
    const sd = GR.starDir;
    for (let i = 0; i < N; i++) {
      if (GR.Dk[i] !== 0) continue;
      let ok = false, dx = 0, dy = 0, dz = 1;
      for (let tries = 0; tries < 40 && !ok; tries++) {
        // sample a direction inside the end view
        const cam = test[2].cam;
        const sx = (R() - 0.5) * W * 1.05, sy = (0.03 + R() * 0.55) * H;
        const vx = sx / F, vy = (CY - sy) / F;
        dx = cam.rx * vx + cam.ux * vy + cam.fx; dy = cam.ry * vx + cam.uy * vy + cam.fy; dz = cam.uz * vy + cam.fz;
        const l = Math.hypot(dx, dy, dz); dx /= l; dy /= l; dz /= l;
        if (dz < 0.12) continue;
        ok = true;
        for (const tc of test) {
          const d = dx * tc.cam.fx + dy * tc.cam.fy + dz * tc.cam.fz;
          const x = (CX + (dx * tc.cam.rx + dy * tc.cam.ry) * F / d) * sc, y = (CY - (dx * tc.cam.ux + dy * tc.cam.uy + dz * tc.cam.uz) * F / d) * sc;
          const xi = x | 0, yi = y | 0;
          if (xi < 0 || yi < 0 || xi >= mw || yi >= mh || tc.data[4 * (yi * mw + xi)] < 200) { ok = false; break; }
        }
      }
      if (!ok) { GR.Dk[i] = 2; const q = G.L((R() * 2 - 1) * (G.h.w2 - 0.6), -G.h.h2 + 0.8 + R() * 5); GR.Dp[3 * i] = q[0]; GR.Dp[3 * i + 1] = q[1]; GR.Dp[3 * i + 2] = 1.2 + R() * 5; continue; }
      sd[3 * i] = dx; sd[3 * i + 1] = dy; sd[3 * i + 2] = dz;
    }
  }

  // project helper for grains: returns false if behind the camera
  function gp(X, Y, Z) { const d = pr(X, Y, Z); return d > NEAR; }

  function grains(t, out, env) {
    setCam(t);
    const N = env.GRAINS, g = GR;
    for (let i = 0; i < N; i++) {
      const o = 3 * i, ph = g.Ph[i];
      let x = 0, y = 0, w = 0;
      // stage A: sparkle in the clouds
      const ta = g.Ta[i], tg = g.Tg[i], tf = g.Tf[i];
      const ax = g.A[o] + 2.5 * Math.sin(t * 0.7 + ph), ay = g.A[o + 1] + 2.5 * Math.cos(t * 0.6 + ph), az = g.A[o + 2];
      const tw = 0.5 + 0.5 * Math.sin(t * 3.1 + ph * 3);
      if (t < ta - 0.9) {
        const ok = gp(ax, ay, az); x = SX; y = SY; w = ok ? 0.3 + 0.35 * tw : 0;
      } else if (t < ta) {
        const k = fx.ease.inOut((t - (ta - 0.9)) / 0.9);
        let ok1 = gp(ax, ay, az), x1 = SX, y1 = SY;
        const ok2 = gp(g.Bp[o], g.Bp[o + 1], g.Bp[o + 2]), x2 = SX, y2 = SY;
        if (!ok1 || Math.abs(x1 - CX) > 1400 || Math.abs(y1 - CY) > 1800) {
          // the cloud plane is behind us by now: let the grain drift down from just above its mark
          ok1 = gp(g.Bp[o] + 3 * Math.sin(ph), g.Bp[o + 1] + 3 * Math.cos(ph), g.Bp[o + 2] + 18); x1 = SX; y1 = SY;
        }
        const arc = Math.sin(Math.PI * k) * 60 * Math.sin(ph);
        const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1;
        x = lerp(x1, x2, k) - dy / l * arc; y = lerp(y1, y2, k) + dx / l * arc;
        w = ok1 && ok2 ? 0.45 + 0.4 * k : 0;
      } else if (t < tg || tg > 50) {
        // on the structure, glinting
        const ok = gp(g.Bp[o], g.Bp[o + 1], g.Bp[o + 2]); x = SX; y = SY;
        const flash = Math.exp(-(t - ta) * 2.2);
        w = ok ? 0.34 + 0.5 * flash + 0.1 * tw : 0;
        if (t >= tf) { /* hero grains go on to the end state below */ }
      } else if (t < tg + 1.1) {
        const k = fx.ease.inOut((t - tg) / 1.1);
        const ok1 = gp(g.Bp[o], g.Bp[o + 1], g.Bp[o + 2]), x1 = SX, y1 = SY, d1 = ok1;
        const ok2 = gp(g.Cp[o], g.Cp[o + 1], g.Cp[o + 2]), x2 = SX, y2 = SY;
        x = d1 ? lerp(x1, x2, k) : x2; y = d1 ? lerp(y1, y2, k) : y2;
        w = ok2 ? (d1 ? 0.5 - 0.1 * k : 0.45 * k) : 0;
      } else {
        const ok = gp(g.Cp[o], g.Cp[o + 1], g.Cp[o + 2]); x = SX; y = SY; w = ok ? 0.34 + 0.2 * tw : 0;
      }
      // stage D: the end state
      if (t > tf) {
        const k = fx.ease.inOut((t - tf) / 1.4);
        let ex, ey, ew;
        const kind = g.Dk[i];
        if (kind === 0) {
          const dx = g.starDir[o], dy = g.starDir[o + 1], dz = g.starDir[o + 2];
          const d = dx * C.fx + dy * C.fy + dz * C.fz;
          if (d > 0.05) { ex = CX + (dx * C.rx + dy * C.ry) * F / d; ey = CY - (dx * C.ux + dy * C.uy + dz * C.uz) * F / d; } else { ex = x; ey = -50; }
          ew = 0.3 + 0.6 * (0.5 + 0.5 * Math.sin(t * 2.4 + ph * 5)) * (0.4 + 0.6 * ((ph * 7.3) % 1));
        } else if (kind === 1) {
          const ok = gp(g.Dp[o], g.Dp[o + 1], g.Dp[o + 2]); ex = SX; ey = SY; ew = ok ? 0.35 + 0.2 * tw : 0;
        } else {
          const mx = g.Dp[o] + 0.35 * Math.sin(t * 0.35 + ph), my = g.Dp[o + 1] + 0.35 * Math.cos(t * 0.3 + ph * 1.7), mz = g.Dp[o + 2] + 0.25 * Math.sin(t * 0.5 + ph * 2.3) + 0.12 * t;
          const ok = gp(mx, my, mz); ex = SX; ey = SY; ew = ok ? 0.3 + 0.4 * (0.5 + 0.5 * Math.sin(t * 1.3 + ph * 4)) : 0;
        }
        const arc = Math.sin(Math.PI * k) * 40 * Math.cos(ph);
        x = lerp(x, ex, k) + arc; y = lerp(y, ey, k); w = lerp(w, ew, k);
      }
      if (!(x > -400 && x < W + 400 && y > -400 && y < H + 400)) { x = clamp(x, -400, W + 400); y = clamp(y, -400, H + 400); w = 0; }
      out[o] = x; out[o + 1] = y; out[o + 2] = w;
    }
  }

  // ---------------------------------------------------------------- module
  S.beats[3] = {
    init(env) {
      fx = env.fx; WD = env.world;
      const hero = WD.TENTS[WD.HERO];
      Z0 = F / WD.CAM_CAMP.zoom;
      ZEND = 3.75;
      HC = { x: hero.x, y: hero.y };
      kZ = pchip([[0, Math.log(Z0)], [1.4, Math.log(Z0 * 0.992)], [2.4, Math.log(480)], [3.3, Math.log(230)], [4.3, Math.log(92)], [5.4, Math.log(36)], [6.5, Math.log(14)], [7.4, Math.log(7.2)], [8.2, Math.log(4.7)], [9.0, Math.log(3.95)], [10, Math.log(ZEND)]]);
      kTH = pchip([[0, 0], [3.0, 0], [4.0, 8], [5.0, 30], [6.0, 55], [7.0, 77], [7.8, 95], [8.6, 115], [9.3, 125], [10, 129]]);
      kPS = pchip([[0, 0], [1.5, 0], [4.8, 0.3], [7.5, hero.rot + 0.1], [10, hero.rot + 0.08]]);
      // back offset: aim the view at the hero (height ~3) while we swing down, then dolly in through the door
      const bk = [[0, 0]];
      for (let t = 3.0; t <= 6.41; t += 0.35) {
        const z = Math.exp(kZ(t)), th = kTH(t) * DEG;
        bk.push([t, Math.max(0, (z - 3.2) * Math.tan(th) - 14 * Math.sin(th))]);
      }
      bk.push([7.3, 11.5], [8.0, 3.6], [8.7, 2.6], [9.4, 2.25], [10, 2.15]);
      kB = pchip(bk);
      build(env);
    },
    draw(ctx, t, env) { draw(ctx, t); },
    grains(t, out, env) { grains(t, out, env); },
    tint: (t) => fx.mixRGB([255, 216, 154], [255, 226, 186], fx.smooth((t - 7) / 3)),
  };
})();
