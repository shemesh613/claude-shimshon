// Beat 5 (film 36–45 s, local 0..9): the Four Species, one by one, drawn like a luminous
// botanical engraving inside the warm sukkah; the etrog is formed from the grains; the species
// bind together and a wave of warm light fills the frame (handoff H5).
(function () {
  'use strict';
  const S = (window.MIDBAR = window.MIDBAR || { beats: {} });

  const W = 1080, H = 1920, SS = 2, TAU = Math.PI * 2;
  // timeline (local seconds)
  const T_L0 = 1.5, T_L1 = 3.3;      // lulav drawn base -> tip
  const T_H0 = 2.5, T_H1 = 4.3;      // hadassim unfold
  const T_A0 = 3.4, T_A1 = 5.1;      // aravot flow in
  const T_S0 = 5.55, T_S1 = 6.35;    // etrog solidifies from the grains
  const T_U0 = 6.1, T_U1 = 7.4;      // species come together
  const T_B0 = 6.55, T_B1 = 7.3;     // woven binding
  const T_W0 = 7.0, T_W1 = 9.0;      // wave of light
  const LUL_LEN = 1115;
  const CAM = [540, 960];
  const WC = [545, 950];             // centre of the light wave / ambient halo

  let fx = null;
  const LEAVES = [];                 // lulav leaflets
  const HB = [];                     // hadassim branches
  const AB = [];                     // aravot branches
  const BOKEH = [];
  const SPR = {};
  let HAD_FULL = 0, ARA_FULL = 0;
  // per-grain data
  const GN = 4000;
  let GR = null;

  const INK = 'rgba(38,24,12,0.62)';

  // ---------------------------------------------------------------- helpers
  const cl = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  function hex(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function col(rgb, a = 1) { return `rgba(${rgb[0] | 0},${rgb[1] | 0},${rgb[2] | 0},${a})`; }

  function lulHW(s) {
    if (s < 150) return 8;
    if (s < 330) return 8 + 20 * fx.smooth((s - 150) / 180);
    if (s < 860) return 28 + 1.5 * Math.sin(s * 0.011);
    return Math.max(0, 28 * Math.pow(1 - (s - 860) / 255, 0.85));
  }

  // ---------------------------------------------------------------- state (species transforms)
  let memoT = -1, memo = null;
  function rot(p, piv, a) {
    const c = Math.cos(a), s = Math.sin(a), dx = p.x - piv[0], dy = p.y - piv[1];
    p.x = piv[0] + dx * c - dy * s; p.y = piv[1] + dx * s + dy * c; p.r += a;
  }
  function state(t) {
    if (t === memoT) return memo;
    const { ease, range, smooth, lerp } = fx;
    const u = ease.inOut(range(t, T_U0, T_U1));
    const swK = smooth(range(t, 6.9, 7.9));
    const sw = swK * (0.016 * Math.sin((t - 6.9) * 2.6) + 0.006 * Math.sin((t - 6.9) * 4.1));
    const piv = [540, 1440];
    const lul = { x: 540, y: 1440 + 170 * (1 - ease.out(range(t, 1.2, 3.6))), r: 0, a: smooth(range(t, 1.25, 1.9)) };
    const aIn = ease.out(range(t, T_A0 - 0.4, T_A0 + 1.5));
    const ara = { x: lerp(372, 494, u) - 90 * (1 - aIn), y: lerp(1370, 1374, u) + 40 * (1 - aIn), r: lerp(-0.09, -0.065, u) - 0.12 * (1 - aIn), a: smooth(range(t, T_A0 - 0.4, T_A0 + 0.5)) };
    const had = { x: lerp(708, 586, u), y: lerp(1370, 1374, u), r: lerp(0.08, 0.055, u), a: smooth(range(t, T_H0 - 0.3, T_H0 + 0.25)) };
    const et = { x: lerp(858, 728, u), y: lerp(1115, 1210, u) - 40 * Math.sin(Math.PI * u), r: lerp(0, -0.12, u) };
    for (const p of [lul, ara, had, et]) rot(p, piv, sw);
    const z = 1 + 0.045 * ease.inOut(range(t, 0, 9));
    memo = { u, lul, ara, had, et, z, sw, ara_geom: araGeom(t, u) };
    memoT = t;
    return memo;
  }

  // ---------------------------------------------------------------- lulav
  const LP = new Float32Array(64);
  function lulavLeafPath(c, L, p) {
    const n = 10;
    const x0 = L.side * 2, y0 = -L.s, x1 = L.side * L.ow, y1 = -(L.s + L.len * 0.28);
    const x2 = L.side * L.ow * 0.96, y2 = -(L.s + L.len * 0.7), x3 = L.side * L.tipx, y3 = -(L.s + L.len);
    for (let i = 0; i <= n; i++) {
      const u = i / n, q = u * p, m = 1 - q;
      const px = m * m * m * x0 + 3 * m * m * q * x1 + 3 * m * q * q * x2 + q * q * q * x3;
      const py = m * m * m * y0 + 3 * m * m * q * y1 + 3 * m * q * q * y2 + q * q * q * y3;
      const dx = 3 * m * m * (x1 - x0) + 6 * m * q * (x2 - x1) + 3 * q * q * (x3 - x2);
      const dy = 3 * m * m * (y1 - y0) + 6 * m * q * (y2 - y1) + 3 * q * q * (y3 - y2);
      const dl = Math.hypot(dx, dy) || 1;
      const th = L.th * Math.pow(Math.sin(Math.PI * (0.1 + 0.9 * u)), 0.75) * 0.5;
      LP[i * 4] = px - (dy / dl) * th; LP[i * 4 + 1] = py + (dx / dl) * th;
      LP[i * 4 + 2] = px + (dy / dl) * th; LP[i * 4 + 3] = py - (dx / dl) * th;
    }
    c.beginPath();
    c.moveTo(LP[0], LP[1]);
    for (let i = 1; i <= n; i++) c.lineTo(LP[i * 4], LP[i * 4 + 1]);
    for (let i = n; i >= 0; i--) c.lineTo(LP[i * 4 + 2], LP[i * 4 + 3]);
    c.closePath();
  }
  function drawLulav(c, F) {
    // bare handle (the lower part of the spine)
    const hs = Math.min(F, 170);
    if (hs > 0) {
      c.beginPath();
      c.moveTo(-9.5, 0); c.lineTo(-8, -hs); c.lineTo(8, -hs); c.lineTo(9.5, 0); c.closePath();
      const g = c.createLinearGradient(-10, 0, 10, 0);
      g.addColorStop(0, '#4a4a26'); g.addColorStop(0.45, '#b3a86a'); g.addColorStop(1, '#5a5a2c');
      c.fillStyle = g; c.fill();
      c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
      // cut end
      c.fillStyle = '#d7c996'; c.beginPath(); c.ellipse(0, 0, 9.5, 2.6, 0, 0, TAU); c.fill();
    }
    for (let k = 0; k < LEAVES.length; k++) {
      const L = LEAVES[k];
      if (F <= L.s) break;
      const p = cl((F - L.s) / L.len);
      lulavLeafPath(c, L, p);
      c.fillStyle = L.col; c.fill();
      c.strokeStyle = INK; c.lineWidth = 0.75; c.stroke();
      // the fold of the leaflet (a fine light line) and the warm rim
      c.beginPath();
      for (let i = 1; i <= 9; i++) {
        const x = (LP[i * 4] * 0.35 + LP[i * 4 + 2] * 0.65), y = (LP[i * 4 + 1] * 0.35 + LP[i * 4 + 3] * 0.65);
        i === 1 ? c.moveTo(x, y) : c.lineTo(x, y);
      }
      c.strokeStyle = L.fold; c.lineWidth = 0.7; c.stroke();
      if (L.rim) {
        c.beginPath();
        const o = L.side < 0 ? 0 : 2;
        for (let i = 1; i <= 9; i++) i === 1 ? c.moveTo(LP[i * 4 + o], LP[i * 4 + o + 1]) : c.lineTo(LP[i * 4 + o], LP[i * 4 + o + 1]);
        c.strokeStyle = L.rim; c.lineWidth = 1.1; c.stroke();
      }
    }
    // the spine (shidra) ridge running up the middle, seen from its back
    const rs = Math.min(F, 1010);
    if (rs > 140) {
      c.beginPath();
      const n = 14;
      for (let i = 0; i <= n; i++) { const s = 140 + (rs - 140) * i / n; const w = 6.5 - 5.2 * Math.pow((s - 140) / 870, 0.9); i === 0 ? c.moveTo(-w, -s) : c.lineTo(-w, -s); }
      for (let i = n; i >= 0; i--) { const s = 140 + (rs - 140) * i / n; const w = 6.5 - 5.2 * Math.pow((s - 140) / 870, 0.9); c.lineTo(w, -s); }
      c.closePath();
      c.fillStyle = '#a49b5c'; c.fill();
      c.strokeStyle = 'rgba(50,40,18,0.7)'; c.lineWidth = 0.9; c.stroke();
      c.beginPath(); c.moveTo(-1.2, -140); c.lineTo(-0.4, -rs);
      c.strokeStyle = 'rgba(245,232,180,0.55)'; c.lineWidth = 1; c.stroke();
    }
  }

  // ---------------------------------------------------------------- hadassim (myrtle, leaves in whorls of three)
  function hadNode(b, nd, out) {
    const bend = b.bend * Math.pow(nd.s / b.len, 2) * 14;
    const c = Math.cos(b.phi), s = Math.sin(b.phi);
    out[0] = b.x + bend * c + nd.s * s; out[1] = bend * s - nd.s * c;
    return out;
  }
  function drawHLeaf(c, x, y, az, e, len, wid, phi) {
    const se = Math.sin(e), sx = se * Math.sin(az), cz = se * Math.cos(az), sy = -Math.cos(e);
    const pl = Math.hypot(sx, sy);
    const ang = Math.atan2(sy, sx) + phi;
    const idx = cz > 0.16 ? 2 : cz < -0.16 ? 0 : 1;
    const L = len * Math.max(0.35, pl), Wd = wid * (0.72 + 0.28 * Math.abs(Math.cos(az)));
    const ca = Math.cos(ang), sa = Math.sin(ang);
    c.save();
    c.transform(ca, sa, -sa, ca, x, y);
    c.drawImage(SPR.myrtle[idx], -1, -Wd / 2, L, Wd);
    c.restore();
  }
  const NP = [0, 0];
  function drawHadasBranch(c, b, F) {
    const nodes = b.nodes;
    const open = (nd) => cl((F - nd.s) / 90);
    // back leaves
    for (let k = 0; k < nodes.length; k++) {
      const nd = nodes[k]; const q = open(nd); if (q <= 0) break;
      hadNode(b, nd, NP);
      const e = 0.58 * fx.ease.out(q), sc = fx.ease.out(Math.min(1, q * 1.4));
      for (let j = 0; j < 3; j++) { const az = nd.az + j * TAU / 3; if (Math.cos(az) < 0) drawHLeaf(c, NP[0], NP[1], az, e, nd.len * sc, nd.wid * sc, b.phi); }
    }
    // stem
    const top = Math.min(F, b.len);
    if (top > 0) {
      c.beginPath();
      for (let i = 0; i <= 12; i++) { const s = top * i / 12; hadNode(b, { s }, NP); i === 0 ? c.moveTo(NP[0], NP[1]) : c.lineTo(NP[0], NP[1]); }
      c.strokeStyle = '#4a3a1e'; c.lineWidth = 3.4; c.lineCap = 'round'; c.stroke();
      c.strokeStyle = 'rgba(160,140,90,0.55)'; c.lineWidth = 1; c.stroke();
    }
    // front leaves, top to bottom (each whorl covers the node above it)
    for (let k = nodes.length - 1; k >= 0; k--) {
      const nd = nodes[k]; const q = open(nd); if (q <= 0) continue;
      hadNode(b, nd, NP);
      const e = 0.58 * fx.ease.out(q), sc = fx.ease.out(Math.min(1, q * 1.4));
      for (let j = 0; j < 3; j++) { const az = nd.az + j * TAU / 3; if (Math.cos(az) >= 0) drawHLeaf(c, NP[0], NP[1], az, e, nd.len * sc, nd.wid * sc, b.phi); }
    }
  }
  function drawHadassim(c, F) {
    drawHadasBranch(c, HB[0], F);
    drawHadasBranch(c, HB[2], F);
    drawHadasBranch(c, HB[1], F);
  }

  // ---------------------------------------------------------------- aravot (willow)
  function araGeom(t, u) {
    const out = [];
    const amp = 0.085 * (1 - 0.45 * u);
    for (const b of AB) {
      const n = b.nodes.length;
      const px = new Float32Array(n + 1), py = new Float32Array(n + 1), pa = new Float32Array(n + 1);
      let x = b.x, y = 0;
      px[0] = x; py[0] = 0;
      for (let k = 0; k < n; k++) {
        const s = (k + 1) * b.step, f = s / b.len;
        const a = b.th + b.curv * f + amp * Math.pow(f, 1.4) * Math.sin(1.35 * t - 2.4 * f + b.ph) + 0.02 * Math.sin(0.8 * t + b.ph * 2);
        x += b.step * Math.sin(a); y -= b.step * Math.cos(a);
        px[k + 1] = x; py[k + 1] = y; pa[k + 1] = a;
      }
      pa[0] = pa[1];
      out.push({ px, py, pa });
    }
    return out;
  }
  function leafAngA(b, k, nd, t, g) {
    return g.pa[k + 1] + nd.side * nd.del + 0.09 * Math.sin(2.1 * t - 4 * nd.s / b.len + k * 0.9 + b.ph);
  }
  function drawAravot(c, t, geom, front) {
    for (let bi = 0; bi < AB.length; bi++) {
      const b = AB[bi], g = geom[bi];
      const n = b.nodes.length;
      const top = Math.min(front, b.len);
      const kTop = Math.min(n, Math.floor(top / b.step));
      // reddish stem, tapering
      if (kTop > 0) {
        const chunks = [[0, 0.35, 3.6], [0.35, 0.7, 2.7], [0.7, 1, 1.8]];
        for (const [a0, a1, lw] of chunks) {
          const k0 = Math.floor(a0 * kTop), k1 = Math.ceil(a1 * kTop);
          if (k1 <= k0) continue;
          c.beginPath(); c.moveTo(g.px[k0], g.py[k0]);
          for (let k = k0 + 1; k <= k1; k++) c.lineTo(g.px[k], g.py[k]);
          c.strokeStyle = '#8c3a28'; c.lineWidth = lw; c.lineCap = 'round'; c.stroke();
          c.strokeStyle = 'rgba(230,150,110,0.45)'; c.lineWidth = lw * 0.35; c.stroke();
        }
      }
      for (let k = 0; k < n; k++) {
        const nd = b.nodes[k];
        const q = fx.ease.out(cl((front - nd.s) / 170));
        if (q <= 0) break;
        const a = leafAngA(b, k, nd, t, g) - Math.PI / 2;
        const L = nd.len * q, Wd = nd.wid * (0.6 + 0.4 * q);
        const ca = Math.cos(a), sa = Math.sin(a), x = g.px[k + 1], y = g.py[k + 1];
        c.save();
        c.transform(ca, sa, -sa * nd.side, ca * nd.side, x, y);
        c.globalAlpha *= Math.min(1, q * 1.5);
        c.drawImage(SPR.willow[nd.v], -1, -Wd / 2, L, Wd);
        c.restore();
      }
    }
  }

  // ---------------------------------------------------------------- etrog
  const ET_A = 62, ET_H = 96;
  function etHW(v) { return ET_A * Math.pow(Math.max(0, 1 - v * v), 0.6) * (1 + 0.15 * v - 0.06 * v * v); }
  function etBump(v, side) { return 1 + 0.03 * fx.noise(v * 11 + (side > 0 ? 0 : 40), 3.3) + 0.012 * fx.noise(v * 37 + (side > 0 ? 7 : 70), 1.1); }
  function etrogPath(g, grow = 0) {
    g.beginPath();
    const n = 60;
    for (let i = 0; i <= n; i++) { const v = -1 + 2 * i / n; g[i ? 'lineTo' : 'moveTo']((etHW(v) * etBump(v, 1)) + grow, v * ET_H - (v < -0.9 ? 2 : 0)); }
    for (let i = n; i >= 0; i--) { const v = -1 + 2 * i / n; g.lineTo(-(etHW(v) * etBump(v, -1)) - grow, v * ET_H); }
    g.closePath();
  }
  function makeEtrog() {
    const w = 200, h = 270, ox = 100, oy = 145;
    const cv = fx.canvas(w * SS, h * SS), g = cv.getContext('2d');
    g.scale(SS, SS); g.translate(ox, oy);
    const R = fx.rng(5507);
    // body
    etrogPath(g);
    const gr = g.createRadialGradient(-22, -34, 6, 0, 8, 118);
    gr.addColorStop(0, '#fff3b0'); gr.addColorStop(0.28, '#f7dc4e'); gr.addColorStop(0.6, '#e8c02e');
    gr.addColorStop(0.85, '#c49014'); gr.addColorStop(1, '#7e5a0c');
    g.fillStyle = gr; g.fill();
    g.save(); etrogPath(g); g.clip();
    // bumpy skin: embossed dimples (shadow + highlight pairs) and fine oil-gland stipple
    // large soft lumps
    for (let i = 0; i < 60; i++) {
      const v = R() * 2 - 1, x = (R() * 2 - 1) * etHW(v) * 0.9, y = v * ET_H, r = 8 + R() * 14;
      const lg = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
      lg.addColorStop(0, 'rgba(255,248,200,0.22)'); lg.addColorStop(0.6, 'rgba(255,240,170,0.05)'); lg.addColorStop(1, 'rgba(140,90,0,0.12)');
      g.fillStyle = lg; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
    for (let i = 0; i < 1500; i++) {
      const v = R() * 2 - 1, x = (R() * 2 - 1) * etHW(v), y = v * ET_H;
      const nx = x / ET_A, lit = cl(0.5 - 0.4 * nx - 0.35 * v);
      const r = 1.1 + R() * 1.8;
      g.fillStyle = `rgba(125,78,0,${(0.14 + 0.22 * (1 - lit)).toFixed(3)})`;
      g.beginPath(); g.arc(x + 0.8, y + 0.9, r, 0, TAU); g.fill();
      g.fillStyle = `rgba(255,252,220,${(0.1 + 0.4 * lit * R()).toFixed(3)})`;
      g.beginPath(); g.arc(x - 0.6, y - 0.7, r * 0.55, 0, TAU); g.fill();
    }
    // a touch of green near the pitam and the stem end
    for (const [yy, rr] of [[-ET_H + 10, 26], [ET_H - 6, 22]]) {
      const gg = g.createRadialGradient(0, yy, 0, 0, yy, rr);
      gg.addColorStop(0, 'rgba(150,160,40,0.35)'); gg.addColorStop(1, 'rgba(150,160,40,0)');
      g.fillStyle = gg; g.fillRect(-rr, yy - rr, rr * 2, rr * 2);
    }
    for (let i = 0; i < 1600; i++) {
      const v = R() * 2 - 1, x = (R() * 2 - 1) * etHW(v), y = v * ET_H;
      g.fillStyle = `rgba(110,70,10,${(0.18 + R() * 0.3).toFixed(3)})`;
      g.fillRect(x, y, 0.7, 0.7);
    }
    // soft ridges running lengthwise (engraved hatching)
    g.strokeStyle = 'rgba(140,95,20,0.16)'; g.lineWidth = 0.6;
    for (let k = -5; k <= 5; k++) {
      g.beginPath();
      for (let i = 0; i <= 30; i++) { const v = -0.97 + 1.94 * i / 30; const x = etHW(v) * (k / 6) * (1 + 0.04 * Math.sin(v * 7 + k)); i ? g.lineTo(x, v * ET_H) : g.moveTo(x, v * ET_H); }
      g.stroke();
    }
    // shade on the lower right, warm rim on the left
    const sh = g.createLinearGradient(-60, -80, 70, 90);
    sh.addColorStop(0, 'rgba(255,240,190,0.12)'); sh.addColorStop(0.6, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(90,50,0,0.22)');
    g.fillStyle = sh; g.fillRect(-100, -120, 200, 240);
    g.restore();
    etrogPath(g); g.strokeStyle = 'rgba(90,55,10,0.8)'; g.lineWidth = 1.1; g.stroke();
    // pitam: the dried style on the tip (a small neck and a knob)
    g.fillStyle = '#6b5424';
    g.beginPath(); g.moveTo(-3.2, -ET_H + 1); g.quadraticCurveTo(-2.2, -ET_H - 8, -1.6, -ET_H - 13);
    g.lineTo(1.6, -ET_H - 13); g.quadraticCurveTo(2.2, -ET_H - 8, 3.2, -ET_H + 1); g.closePath(); g.fill();
    g.strokeStyle = INK; g.lineWidth = 0.6; g.stroke();
    g.fillStyle = '#5a3f1c'; g.beginPath(); g.ellipse(0, -ET_H - 15, 3.8, 3.2, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = 'rgba(230,200,140,0.6)'; g.beginPath(); g.arc(-1.2, -ET_H - 16, 1.1, 0, TAU); g.fill();
    // oketz (stem end) at the base
    g.fillStyle = '#5a4a22'; g.beginPath(); g.ellipse(0, ET_H - 1, 4.5, 2.2, 0, 0, TAU); g.fill();
    g.fillStyle = '#4a5a26'; g.fillRect(-1.4, ET_H, 2.8, 6);
    SPR.etrog = { cv, w, h, ox, oy };
    SPR.etrogGlow = { cv: glowOf(cv, 22, [255, 214, 120]), w, h, ox, oy };
  }

  // ---------------------------------------------------------------- binding (koishikel holder + rings)
  function holderShape(g) {
    g.beginPath();
    g.moveTo(-40, -52); g.lineTo(-50, -196); g.quadraticCurveTo(0, -203, 50, -196); g.lineTo(40, -52);
    g.quadraticCurveTo(0, -46, -40, -52); g.closePath();
  }
  function makeHolder() {
    const w = 140, h = 240, ox = 70, oy = 225;
    const cv = fx.canvas(w * SS, h * SS), g = cv.getContext('2d');
    g.scale(SS, SS); g.translate(ox, oy);
    g.save(); holderShape(g); g.fillStyle = '#8a6a36'; g.fill(); g.clip();
    const d = 8.5;
    for (let row = 0; row <= 42; row++) for (let colI = -8; colI <= 8; colI++) {
      const cy = -(44 + row * d * 0.5), cx = colI * d + (row % 2 ? d * 0.5 : 0);
      if (cy < -212 || Math.abs(cx) > 56) continue;
      const lightA = ((row + (row % 2 ? 1 : 0)) / 2 + colI) % 2 === 0;
      g.beginPath(); g.moveTo(cx, cy - d * 0.5); g.lineTo(cx + d * 0.5, cy); g.lineTo(cx, cy + d * 0.5); g.lineTo(cx - d * 0.5, cy); g.closePath();
      const gg = g.createLinearGradient(cx - d * 0.5, cy - d * 0.5, cx + d * 0.5, cy + d * 0.5);
      if (lightA) { gg.addColorStop(0, '#e2c98a'); gg.addColorStop(1, '#a8874c'); }
      else { gg.addColorStop(0, '#c4a262'); gg.addColorStop(1, '#8a6a36'); }
      g.fillStyle = gg; g.fill();
      g.strokeStyle = 'rgba(60,38,14,0.55)'; g.lineWidth = 0.6; g.stroke();
    }
    const sh = g.createLinearGradient(-47, 0, 47, 0);
    sh.addColorStop(0, 'rgba(40,20,5,0.4)'); sh.addColorStop(0.35, 'rgba(255,230,170,0.12)'); sh.addColorStop(1, 'rgba(40,20,5,0.5)');
    g.fillStyle = sh; g.fillRect(-60, -210, 120, 170);
    g.restore();
    holderShape(g); g.strokeStyle = INK; g.lineWidth = 1; g.stroke();
    // rolled rim at the top
    g.beginPath(); g.ellipse(0, -197, 50, 5, 0, 0, TAU);
    g.fillStyle = '#c9a868'; g.fill(); g.strokeStyle = INK; g.lineWidth = 0.8; g.stroke();
    SPR.holder = { cv, w, h, ox, oy };
  }
  function drawRing(c, s, p) {
    const hw = lulHW(s) + 4, hh = 6.5;
    c.save();
    c.beginPath(); c.rect(-hw - 2, -s - hh - 2, (2 * hw + 4) * p, 2 * hh + 4); c.clip();
    c.beginPath(); c.moveTo(-hw, -s - hh); c.quadraticCurveTo(0, -s - hh + 4, hw, -s - hh); c.lineTo(hw, -s + hh); c.quadraticCurveTo(0, -s + hh + 4, -hw, -s + hh); c.closePath();
    const g = c.createLinearGradient(-hw, 0, hw, 0);
    g.addColorStop(0, '#7a5a2a'); g.addColorStop(0.4, '#e0c68a'); g.addColorStop(1, '#8a6a36');
    c.fillStyle = g; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.8; c.stroke();
    c.strokeStyle = 'rgba(70,45,15,0.6)'; c.lineWidth = 0.7;
    c.beginPath();
    for (let x = -hw + 3; x < hw; x += 6) { c.moveTo(x, -s - hh + 2); c.lineTo(x + 4, -s + hh + 1); }
    c.stroke();
    c.restore();
  }

  // ---------------------------------------------------------------- sprites
  function glowOf(src, blur, rgb) {
    // blurred light: a quarter of the sprite's resolution is plenty
    const cv = fx.canvas(Math.ceil(src.width / 4), Math.ceil(src.height / 4)), g = cv.getContext('2d');
    g.filter = `blur(${blur / 4}px)`; g.drawImage(src, 0, 0, cv.width, cv.height); g.filter = 'none';
    g.globalCompositeOperation = 'source-in'; g.fillStyle = col(rgb); g.fillRect(0, 0, cv.width, cv.height);
    return cv;
  }
  function leafSprite(len, wid, droop, cols, rib, ovate) {
    const pad = 3, w = Math.ceil(len + pad * 2), h = Math.ceil(wid + Math.abs(droop) + pad * 2);
    const cv = fx.canvas(w * 2, h * 2), g = cv.getContext('2d');
    g.scale(2, 2); g.translate(pad, h / 2 - droop / 2);
    const n = 24, up = [], dn = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, cx = u * len, cy = droop * u * u;
      const prof = ovate ? Math.pow(Math.sin(Math.PI * Math.pow(u, 0.72)), 0.8) : Math.pow(Math.sin(Math.PI * Math.pow(u, 0.85)), 0.75) * (1 - 0.15 * u);
      const hw = wid * 0.5 * prof;
      up.push([cx, cy - hw]); dn.push([cx, cy + hw]);
    }
    g.beginPath(); g.moveTo(up[0][0], up[0][1]);
    for (const p of up) g.lineTo(p[0], p[1]);
    for (let i = dn.length - 1; i >= 0; i--) g.lineTo(dn[i][0], dn[i][1]);
    g.closePath();
    const gr = g.createLinearGradient(0, -wid / 2, 0, wid / 2 + droop);
    gr.addColorStop(0, cols[0]); gr.addColorStop(0.5, cols[1]); gr.addColorStop(1, cols[2]);
    g.fillStyle = gr; g.fill();
    g.strokeStyle = INK; g.lineWidth = 0.35; g.stroke();
    g.beginPath(); for (let i = 1; i < n - 1; i++) { const u = i / n; i === 1 ? g.moveTo(u * len, droop * u * u) : g.lineTo(u * len, droop * u * u); }
    g.strokeStyle = rib; g.lineWidth = 0.35; g.stroke();
    // gloss
    g.beginPath(); for (let i = 3; i < n - 4; i++) { const u = i / n; const p = up[i]; g[i === 3 ? 'moveTo' : 'lineTo'](p[0], p[1] + wid * 0.14); }
    g.strokeStyle = 'rgba(255,245,200,0.28)'; g.lineWidth = 0.5; g.stroke();
    return cv;
  }

  // The room behind the species: beat 4's final frame, thrown out of focus (a rack focus onto the
  // species). Falls back to a painted interior if beat 4 is missing or fails.
  function bgFromB4(env) {
    const b4 = S.beats[4];
    if (!b4 || !b4.draw) return null;
    try {
      const A = fx.canvas(540, 960), g = A.getContext('2d');
      g.setTransform(0.5, 0, 0, 0.5, 0, 0);
      b4.draw(g, 7, env);
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
      const B = fx.canvas(540, 960), gb = B.getContext('2d');
      gb.drawImage(A, 0, 0);
      gb.filter = 'blur(7px)'; gb.drawImage(A, 0, 0); gb.filter = 'none';
      // settle it back so the species read in front of it
      gb.globalCompositeOperation = 'multiply';
      const gr = gb.createRadialGradient(270, 450, 60, 270, 480, 620);
      gr.addColorStop(0, 'rgb(200,170,140)'); gr.addColorStop(1, 'rgb(150,120,100)');
      gb.fillStyle = gr; gb.fillRect(0, 0, 540, 960);
      gb.globalCompositeOperation = 'lighter'; gb.globalAlpha = 0.3;
      gb.drawImage(fx.glow(280, [255, 180, 100]), 270 - 280, 450 - 336, 560, 672);
      gb.globalCompositeOperation = 'source-over'; gb.globalAlpha = 1;
      return B;
    } catch (err) { console.warn('b5: b4 background unavailable', err); return null; }
  }
  function makeBG() {
    const R = fx.rng(5511);
    const A = fx.canvas(540, 960), g = A.getContext('2d');
    g.scale(0.5, 0.5);
    let gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#140c08'); gr.addColorStop(0.14, '#24160d'); gr.addColorStop(0.45, '#3b2616');
    gr.addColorStop(0.78, '#2e1d10'); gr.addColorStop(1, '#130b06');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // walls: soft vertical drapery / boards at the sides
    for (let i = 0; i < 22; i++) {
      const left = i < 11, x = left ? i * 16 : W - (i - 11) * 16 - 16;
      g.fillStyle = `rgba(${left ? '120,80,45' : '105,70,40'},${(0.08 + 0.1 * R()).toFixed(3)})`;
      g.fillRect(x, 150, 10 + R() * 8, 1400);
    }
    // central warm haze where the species will stand
    gr = g.createRadialGradient(540, 900, 20, 540, 900, 620);
    gr.addColorStop(0, 'rgba(255,196,120,0.30)'); gr.addColorStop(0.5, 'rgba(210,140,70,0.12)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // oil-lamp glow, upper left
    gr = g.createRadialGradient(190, 600, 10, 190, 600, 420);
    gr.addColorStop(0, 'rgba(255,200,120,0.6)'); gr.addColorStop(0.3, 'rgba(255,170,80,0.2)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // the lamp itself on a small shelf
    g.fillStyle = '#2a1a0e'; g.fillRect(90, 650, 200, 12);
    g.fillStyle = '#6a4424'; g.beginPath(); g.ellipse(190, 636, 40, 14, 0, 0, TAU); g.fill();
    g.fillStyle = '#ffe2a0'; g.beginPath(); g.ellipse(222, 612, 6, 16, 0.2, 0, TAU); g.fill();
    // schach at the very top: dark fronds with a few gaps of night
    g.fillStyle = '#0d0a10'; g.fillRect(0, 0, W, 170);
    for (let i = 0; i < 26; i++) {
      const x = R() * W, y = 40 + R() * 150, a = -0.3 + R() * 0.6, len = 160 + R() * 200;
      g.strokeStyle = `rgba(${40 + R() * 30},${45 + R() * 30},${20 + R() * 12},0.9)`; g.lineWidth = 3;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len * 0.3); g.stroke();
      g.lineWidth = 2;
      for (let k = 0; k < 14; k++) {
        const f = k / 14, px = x + Math.cos(a) * len * f, py = y + Math.sin(a) * len * 0.3 * f;
        g.beginPath(); g.moveTo(px, py); g.lineTo(px + 10, py + 26 + R() * 12); g.moveTo(px, py); g.lineTo(px + 10, py - 20 - R() * 10); g.stroke();
      }
    }
    for (let i = 0; i < 14; i++) { g.fillStyle = 'rgba(40,50,95,0.8)'; g.fillRect(R() * W, 10 + R() * 120, 14 + R() * 26, 6 + R() * 10); }
    // paper chains hanging in arcs
    const chains = [[-20, 190, 560, 250, 120], [520, 240, 1100, 180, 130], [80, 330, 1000, 340, 90]];
    const pc = ['#d9a45a', '#8e2b26', '#7e9152', '#f0dcae', '#3a5a8a'];
    chains.forEach(([x0, y0, x1, y1, sag], ci) => {
      const n = 34;
      for (let i = 0; i <= n; i++) {
        const u = i / n, x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u + sag * 4 * u * (1 - u);
        g.strokeStyle = pc[(i + ci) % pc.length]; g.lineWidth = 5;
        g.beginPath(); if (i % 2) g.ellipse(x, y, 5, 13, 0.3, 0, TAU); else g.ellipse(x, y, 14, 9, 0.2, 0, TAU); g.stroke();
      }
    });
    // hanging pomegranates
    for (const [x, y, r] of [[150, 470, 34], [330, 395, 28], [790, 430, 32], [955, 540, 38], [640, 360, 22]]) {
      g.strokeStyle = 'rgba(200,170,120,0.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, 150); g.lineTo(x, y - r); g.stroke();
      const pg = g.createRadialGradient(x - r * 0.35, y - r * 0.35, 2, x, y, r);
      pg.addColorStop(0, '#e0705a'); pg.addColorStop(0.5, '#9a2a22'); pg.addColorStop(1, '#3e0e0a');
      g.fillStyle = pg; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      g.fillStyle = '#5a1a12';
      g.beginPath(); g.moveTo(x - r * 0.3, y + r * 0.85);
      for (let k = 0; k <= 5; k++) g.lineTo(x - r * 0.3 + k * r * 0.12, y + r * (k % 2 ? 1.2 : 0.95));
      g.closePath(); g.fill();
    }
    // table with a white cloth at the bottom
    gr = g.createLinearGradient(0, 1520, 0, H);
    gr.addColorStop(0, '#d8c49a'); gr.addColorStop(0.08, '#b19a6e'); gr.addColorStop(1, '#3a2a18');
    g.fillStyle = gr; g.fillRect(0, 1530, W, H - 1530);
    for (const [x, y] of [[250, 1545], [830, 1560]]) {
      const cg = g.createRadialGradient(x, y - 60, 2, x, y - 60, 160);
      cg.addColorStop(0, 'rgba(255,220,150,0.8)'); cg.addColorStop(0.2, 'rgba(255,180,90,0.25)'); cg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = cg; g.fillRect(x - 170, y - 230, 340, 340);
      g.fillStyle = '#e8dcc0'; g.fillRect(x - 6, y - 60, 12, 55);
      g.fillStyle = '#b09060'; g.fillRect(x - 18, y - 8, 36, 10);
    }
    // blur it into a soft, out-of-focus interior
    const B = fx.canvas(540, 960), gb = B.getContext('2d');
    gb.fillStyle = '#24160d'; gb.fillRect(0, 0, 540, 960);
    gb.filter = 'blur(9px)'; gb.drawImage(A, 0, 0); gb.filter = 'none';
    // watercolor / parchment mottling
    const N = fx.canvas(135, 240), gn = N.getContext('2d'), id = gn.createImageData(135, 240);
    for (let y = 0; y < 240; y++) for (let x = 0; x < 135; x++) {
      const v = fx.fbm(x * 0.05, y * 0.05, 4), o = (y * 135 + x) * 4;
      id.data[o] = 235; id.data[o + 1] = 205; id.data[o + 2] = 150; id.data[o + 3] = Math.max(0, Math.min(255, 40 + v * 90));
    }
    gn.putImageData(id, 0, 0);
    gb.globalCompositeOperation = 'soft-light'; gb.drawImage(N, 0, 0, 540, 960);
    gb.globalCompositeOperation = 'source-over';
    return B;
  }
  function bokehSprite(rgb) {
    const r = 64, cv = fx.canvas(r * 2, r * 2), g = cv.getContext('2d');
    const gr = g.createRadialGradient(r, r, 0, r, r, r);
    gr.addColorStop(0, col(rgb, 0.55)); gr.addColorStop(0.72, col(rgb, 0.62)); gr.addColorStop(0.86, col(rgb, 0.85)); gr.addColorStop(1, col(rgb, 0));
    g.fillStyle = gr; g.fillRect(0, 0, r * 2, r * 2);
    return cv;
  }

  // ---------------------------------------------------------------- init
  function init(env) {
    fx = env.fx;
    const R = fx.rng(5501);
    const greens = [hex('#4f6b3a'), hex('#7e9152'), hex('#5f7c42'), hex('#6d8646')];
    // lulav leaflets
    LEAVES.length = 0;
    for (const side of [-1, 1]) {
      for (let s = 150 + (side > 0 ? 10 : 0); s < 1010; s += 19 + R() * 3) {
        let len = 125 + R() * 55;
        const tipS = Math.min(s + len, 1108 - R() * 22);
        len = Math.max(50, tipS - s);
        const ow = Math.max(5, lulHW(s + 0.4 * len) * (0.85 + 0.22 * R()));
        const c0 = fx.mixRGB(greens[(R() * 4) | 0], [230, 190, 110], 0.06 + R() * 0.14);
        const lum = 0.78 + 0.42 * R();
        LEAVES.push({
          s, side, len, ow, tipx: Math.max(1, lulHW(s + len) * (0.72 + 0.26 * R())), th: (s > 900 ? 6 : 8) + R() * 3,
          col: col([c0[0] * lum, c0[1] * lum, c0[2] * lum]),
          fold: `rgba(235,230,170,${(0.3 + 0.3 * R()).toFixed(2)})`,
          rim: side < 0 && R() < 0.6 ? 'rgba(255,205,130,0.5)' : null,
        });
      }
    }
    // the tiyomet: the central folded leaf forming the tip
    LEAVES.push({ s: 985, side: -1, len: 128, ow: 5, tipx: 0.4, th: 8, col: '#6f8a4a', fold: 'rgba(230,230,170,0.5)', rim: null });
    LEAVES.push({ s: 990, side: 1, len: 124, ow: 4, tipx: 0.4, th: 7, col: '#627f43', fold: 'rgba(230,230,170,0.4)', rim: null });
    LEAVES.sort((a, b) => a.s - b.s);

    // hadassim: three branches, leaves in whorls of three
    HB.length = 0;
    [[-12, -0.075, 690, 0.3, -1], [0, 0.0, 735, 1.1, 0.3], [12, 0.085, 672, 2.0, 1]].forEach(([x, phi, len, ph, bend]) => {
      const nodes = [];
      let k = 0;
      for (let s = 26; s < len - 6; s += 20 + R() * 2.5, k++) {
        const f = s / len;
        const l = 40 * (1 - 0.5 * fx.smooth((f - 0.72) / 0.28)) * (f < 0.1 ? 0.88 : 1) * (0.93 + 0.12 * R());
        nodes.push({ s, len: l, wid: l * 0.5, az: k * Math.PI / 3 + ph + (R() - 0.5) * 0.25 });
      }
      HB.push({ x, phi, len, bend, nodes });
    });
    HAD_FULL = 735 + 95;

    // aravot: two branches, alternate narrow leaves on reddish stems
    AB.length = 0;
    [[-6, -0.035, 748, 0.0, -0.05], [6, 0.045, 705, 1.9, 0.06]].forEach(([x, th, len, ph, curv]) => {
      const step = 21, nodes = [];
      const n = Math.floor(len / step);
      for (let k = 0; k < n; k++) {
        const s = (k + 1) * step, f = s / len;
        nodes.push({
          s, side: k % 2 ? 1 : -1,
          len: 96 * (0.5 + 0.5 * Math.pow(Math.sin(Math.PI * Math.min(1, 0.08 + f * 0.9)), 0.55)) * (0.9 + 0.2 * R()),
          wid: 11 + R() * 2, del: (f > 0.85 ? 0.2 : 0.33) + R() * 0.08, v: (R() * 2) | 0,
        });
      }
      AB.push({ x, th, len, ph, curv, step, nodes });
    });
    ARA_FULL = 748 + 180;

    // sprites
    SPR.myrtle = [
      leafSprite(70, 30, 0, ['#2f4424', '#243619', '#172410'], 'rgba(150,160,100,0.5)', true),
      leafSprite(70, 30, 0, ['#4a6634', '#3a5428', '#26381a'], 'rgba(190,200,130,0.55)', true),
      leafSprite(70, 30, 0, ['#6a8a48', '#557a38', '#3a5626'], 'rgba(220,225,160,0.6)', true),
    ];
    SPR.willow = [
      leafSprite(120, 13, 7, ['#8aa462', '#6a8a48', '#4a6832'], 'rgba(230,230,170,0.7)', false),
      leafSprite(120, 13, 4, ['#9ab06a', '#76924e', '#56703a'], 'rgba(235,235,180,0.7)', false),
    ];
    // lulav sprite (complete) and glow
    {
      const w = 200, h = 1250, ox = 100, oy = 1215;
      const cv = fx.canvas(w * SS, h * SS), g = cv.getContext('2d');
      g.scale(SS, SS); g.translate(ox, oy); drawLulav(g, LUL_LEN + 1);
      SPR.lulav = { cv, w, h, ox, oy };
      SPR.lulavGlow = { cv: glowOf(cv, 26, [255, 210, 130]), w, h, ox, oy };
    }
    {
      const w = 360, h = 860, ox = 180, oy = 810;
      const cv = fx.canvas(w * SS, h * SS), g = cv.getContext('2d');
      g.scale(SS, SS); g.translate(ox, oy); drawHadassim(g, HAD_FULL + 1);
      SPR.hadas = { cv, w, h, ox, oy };
      SPR.hadasGlow = { cv: glowOf(cv, 26, [255, 210, 130]), w, h, ox, oy };
    }
    makeEtrog();
    makeHolder();
    SPR.bg = bgFromB4(env) || makeBG();
    {
      // same light as beat 6's opening frame (H5), cached small
      const cv = fx.canvas(280, 496), g = cv.getContext('2d');
      g.scale(280 / (W + 60), 496 / (H + 60)); g.translate(30, 30);
      const gg = g.createRadialGradient(540, 930, 0, 540, 930, 1250);
      gg.addColorStop(0, 'rgb(255,240,200)'); gg.addColorStop(0.3, 'rgb(255,208,130)');
      gg.addColorStop(0.7, 'rgb(226,150,66)'); gg.addColorStop(1, 'rgb(150,84,40)');
      g.fillStyle = gg; g.fillRect(-30, -30, W + 60, H + 60);
      SPR.gold = cv;
      const wv = fx.canvas(256, 256), gw = wv.getContext('2d');
      const wg = gw.createRadialGradient(128, 128, 0, 128, 128, 128);
      wg.addColorStop(0, 'rgba(255,215,140,0.5)'); wg.addColorStop(0.72, 'rgba(255,190,110,0.3)');
      wg.addColorStop(0.9, 'rgba(255,215,140,0.9)'); wg.addColorStop(1, 'rgba(255,200,120,0)');
      gw.fillStyle = wg; gw.fillRect(0, 0, 256, 256);
      SPR.wave = wv;
    }
    SPR.bokeh = [bokehSprite([255, 190, 110]), bokehSprite([255, 225, 170]), bokehSprite([240, 160, 90])];
    BOKEH.length = 0;
    const RB = fx.rng(5513);
    while (BOKEH.length < 30) {
      const x = RB() * W, y = 180 + RB() * 1450;
      if (x > 300 && x < 780 && y > 380 && y < 1480) continue;
      BOKEH.push({ x, y, r: 14 + RB() * 46, k: (RB() * 3) | 0, a: 0.08 + RB() * 0.2, ph: RB() * TAU, sp: 0.4 + RB() });
    }

    // grains
    GR = [];
    const RG = fx.rng(5519);
    for (let i = 0; i < GN; i++) {
      const g = { grp: i < 700 ? 0 : i < 1300 ? 1 : i < 1800 ? 2 : 3 };
      g.ca = RG() * TAU; g.cr = Math.sqrt(RG()); g.cs = (0.08 + 0.16 * RG()) * (RG() < 0.5 ? -1 : 1);
      g.w0 = 0.3 + 0.3 * RG(); g.ph = RG() * TAU;
      if (g.grp === 0) {
        g.s = 150 + RG() * 950; g.ox = (RG() * 2 - 1) * 0.95;
        g.ta = T_L0 + (g.s / LUL_LEN) * (T_L1 - T_L0);
        g.ts = 4.1 + 0.35 * RG();
      } else if (g.grp === 1) {
        g.b = (RG() * 3) | 0; const b = HB[g.b]; g.k = (RG() * b.nodes.length) | 0; g.j = (RG() * 3) | 0; g.f = 0.45 + 0.55 * RG();
        g.ta = T_H0 + (b.nodes[g.k].s + 60) / HAD_FULL * (T_H1 - T_H0);
        g.ts = 4.3 + 0.35 * RG();
      } else if (g.grp === 2) {
        g.b = (RG() * 2) | 0; const b = AB[g.b]; g.k = (RG() * b.nodes.length) | 0; g.f = 0.2 + 0.8 * RG();
        g.ta = T_A0 + (b.nodes[g.k].s + 100) / ARA_FULL * (T_A1 - T_A0);
        g.ts = 4.6 + 0.3 * RG();
      } else {
        g.ts = 3.95 + 0.65 * RG();
      }
      // etrog target: 55% on the bumpy skin, the rest filling the body, a few on the pitam
      const rr = RG();
      if (rr < 0.02) { g.ex = (RG() - 0.5) * 5; g.ey = -ET_H - 4 - RG() * 12; }
      else if (rr < 0.57) {
        const v = Math.sin((RG() * 2 - 1) * Math.PI / 2), side = RG() < 0.5 ? -1 : 1;
        g.ex = side * etHW(v) * etBump(v, side) * (0.94 + 0.06 * RG()); g.ey = v * ET_H;
      } else {
        const v = (RG() * 2 - 1) * 0.97; g.ex = (RG() * 2 - 1) * etHW(v) * 0.92; g.ey = v * ET_H;
      }
      g.sg = RG() < 0.5 ? -1 : 1;
      g.rd = RG() * 0.35;
      g.aa = RG() * TAU; g.ar = 0.16 + 0.42 * Math.sqrt(RG());
      g.shell = RG() < 0.35;
      g.wr = g.shell ? 1.0 + 0.1 * RG() : g.ar + (1.08 - g.ar) * Math.sqrt(RG());
      GR.push(g);
    }
  }

  // ---------------------------------------------------------------- grains
  function xfPt(p, lx, ly, out) {
    const c = Math.cos(p.r), s = Math.sin(p.r);
    out[0] = p.x + lx * c - ly * s; out[1] = p.y + lx * s + ly * c;
  }
  const TP = [0, 0], NP2 = [0, 0];
  function grains(t, out, env) {
    const st = state(t);
    const { ease, range, smooth, lerp, noise } = fx;
    const solid = smooth(range(t, T_S0, T_S1));
    const z = st.z;
    const Rc0 = 230 + 30 * Math.sin(t * 0.7);
    const spread = smooth(range(t, 1.4, 3.6));
    const aFront = range(t, T_A0, T_A1) * ARA_FULL;
    const hFront = range(t, T_H0, T_H1) * HAD_FULL;
    for (let i = 0; i < GN; i++) {
      const g = GR[i];
      // 1) cloud of motes (grows into a wide dim halo for the grains that are not tracing)
      const Rc = Rc0 + (g.grp === 3 ? 230 * spread : 0);
      const ang = g.ca + t * g.cs;
      let x = 540 + Math.cos(ang) * g.cr * Rc * 0.95 + 16 * noise(i * 0.131, t * 0.6);
      let y = 880 + Math.sin(ang) * g.cr * Rc * 1.3 + 16 * noise(i * 0.173 + 50, t * 0.6);
      let w = g.w0 * (0.8 + 0.2 * Math.sin(t * 2.3 + g.ph));
      if (g.grp === 3) w *= 1 - 0.4 * spread;
      // 2) tracing the species as they are drawn
      if (g.grp < 3 && t > g.ta - 0.6) {
        const k = smooth(range(t, g.ta - 0.6, g.ta));
        let tx, ty;
        if (g.grp === 0) {
          xfPt(st.lul, g.ox * lulHW(g.s), -g.s - 6 * Math.sin(t * 3 + g.ph), TP);
        } else if (g.grp === 1) {
          const b = HB[g.b], nd = b.nodes[g.k];
          hadNode(b, nd, NP2);
          const q = cl((hFront - nd.s) / 90), e = 0.58 * ease.out(q), az = nd.az + g.j * TAU / 3;
          const L = nd.len * g.f * ease.out(Math.min(1, q * 1.4));
          const lx = NP2[0] + (Math.sin(e) * Math.sin(az) * Math.cos(b.phi) + Math.cos(e) * Math.sin(b.phi)) * L;
          const ly = NP2[1] + (Math.sin(e) * Math.sin(az) * Math.sin(b.phi) - Math.cos(e) * Math.cos(b.phi)) * L;
          xfPt(st.had, lx, ly, TP);
        } else {
          const b = AB[g.b], nd = b.nodes[g.k], gm = st.ara_geom[g.b];
          const q = ease.out(cl((aFront - nd.s) / 170));
          const a = leafAngA(b, g.k, nd, t, gm);
          const L = nd.len * g.f * q;
          xfPt(st.ara, gm.px[g.k + 1] + Math.sin(a) * L, gm.py[g.k + 1] - Math.cos(a) * L, TP);
        }
        tx = TP[0]; ty = TP[1];
        const wt = 0.3 + 0.7 * Math.exp(-Math.max(0, t - g.ta) * 2.5);
        x = lerp(x, tx, k); y = lerp(y, ty, k); w = lerp(w, wt, k);
      }
      // 3) everything rushes into the etrog
      if (t > g.ts) {
        const kc = ease.inOut(range(t, g.ts, g.ts + 0.95));
        const sh = (1 - solid) * 1.6;
        xfPt(st.et, g.ex + sh * noise(i * 0.7, t * 4), g.ey + sh * noise(i * 0.7 + 9, t * 4), TP);
        const dx = (x - TP[0]) * (1 - kc), dy = (y - TP[1]) * (1 - kc);
        const a = kc * 1.5 * g.sg, ca = Math.cos(a), sa = Math.sin(a);
        x = TP[0] + dx * ca - dy * sa; y = TP[1] + dx * sa + dy * ca;
        w = lerp(w, 0.95, kc) * (1 - 0.62 * solid);
        // 4) release into a warm halo, then 5) the wave of light carries them outward
        if (t > 6.3) {
          const kr = ease.inOut(range(t, 6.3 + g.rd, 7.0 + g.rd));
          const kw = ease.inOut(range(t, T_W0 + g.rd * 0.8, T_W1));
          const rr = lerp(g.ar, g.wr, kw), aa = g.aa + 0.06 * t;
          const ax = WC[0] + Math.cos(aa) * rr * 640, ay = WC[1] + Math.sin(aa) * rr * 1080;
          x = lerp(x, ax, kr); y = lerp(y, ay, kr);
          const ww = lerp(0.32 + 0.1 * Math.sin(t * 3 + g.ph), g.shell ? 0.95 : 0.6, kw * kw);
          w = lerp(w, ww, kr);
        }
      }
      out[3 * i] = CAM[0] + (x - CAM[0]) * z;
      out[3 * i + 1] = CAM[1] + (y - CAM[1]) * z;
      out[3 * i + 2] = w;
    }
  }

  // ---------------------------------------------------------------- draw
  function place(c, p, spr, a = 1) {
    const cs = Math.cos(p.r), sn = Math.sin(p.r);
    c.save(); c.transform(cs, sn, -sn, cs, p.x, p.y);
    c.globalAlpha *= a;
    c.drawImage(spr.cv, -spr.ox, -spr.oy, spr.w, spr.h);
    c.restore();
  }
  function local(c, p) { const cs = Math.cos(p.r), sn = Math.sin(p.r); c.transform(cs, sn, -sn, cs, p.x, p.y); }

  function draw(c, t, env) {
    const st = state(t);
    const { ease, range, smooth, noise, glow } = fx;
    c.fillStyle = '#24160d'; c.fillRect(0, 0, W, H);
    c.save();
    c.translate(CAM[0], CAM[1]); c.scale(st.z, st.z); c.translate(-CAM[0], -CAM[1]);
    c.drawImage(SPR.bg, -20, -20, W + 40, H + 40);

    // living light of the room: lamp flicker and slow bokeh
    c.globalCompositeOperation = 'lighter';
    const fl = 0.8 + 0.12 * noise(t * 3.1, 1.7) + 0.06 * noise(t * 7.3, 4.1);
    c.globalAlpha = 0.28 * fl; c.drawImage(glow(260, [255, 170, 80]), 190 - 260, 600 - 260);
    for (const b of BOKEH) {
      c.globalAlpha = b.a * (0.7 + 0.3 * Math.sin(t * b.sp + b.ph));
      const r = b.r * (1 + 0.04 * Math.sin(t * 0.5 + b.ph));
      c.drawImage(SPR.bokeh[b.k], b.x - r, b.y - 8 * t * b.sp * 0.3 - r, r * 2, r * 2);
    }
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;

    // the gold that fills the frame at the end (under the species so they stay legible)
    const gold = smooth(range(t, 7.5, 9));
    if (gold > 0) {
      c.globalAlpha = gold * 0.92;
      c.drawImage(SPR.gold, -30, -30, W + 60, H + 60);
      c.globalAlpha = 1;
    }

    // ---- aravot (left)
    const aFront = range(t, T_A0, T_A1) * ARA_FULL;
    if (st.ara.a > 0) {
      c.save(); local(c, st.ara); c.globalAlpha = st.ara.a;
      drawAravot(c, t, st.ara_geom, aFront);
      c.restore();
    }
    // ---- hadassim (right)
    const hFront = range(t, T_H0, T_H1) * HAD_FULL;
    if (st.had.a > 0) {
      if (hFront >= HAD_FULL) place(c, st.had, SPR.hadas, st.had.a);
      else { c.save(); local(c, st.had); c.globalAlpha = st.had.a; drawHadassim(c, hFront); c.restore(); }
    }
    // ---- lulav (centre)
    const lF = range(t, T_L0, T_L1) * (LUL_LEN + 1);
    if (lF > 0) {
      if (lF > LUL_LEN) place(c, st.lul, SPR.lulav, st.lul.a);
      else { c.save(); local(c, st.lul); c.globalAlpha = st.lul.a; drawLulav(c, lF); c.restore(); }
    }
    // ---- binding: the woven holder and two rings
    const bp = ease.inOut(range(t, T_B0, T_B1));
    if (bp > 0) {
      c.save(); local(c, st.lul);
      const hs = SPR.holder;
      const top = 52 + (203 - 52) * bp;
      c.save(); c.beginPath(); c.rect(-70, -top, 140, top); c.clip();
      c.drawImage(hs.cv, -hs.ox, -hs.oy, hs.w, hs.h);
      c.restore();
      drawRing(c, 430, ease.out(range(t, T_B0 + 0.25, T_B1 + 0.1)));
      drawRing(c, 650, ease.out(range(t, T_B0 + 0.4, T_B1 + 0.2)));
      // bright thread at the weaving front
      if (bp < 1) {
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = Math.sin(Math.PI * bp);
        c.drawImage(glow(40, [255, 220, 150]), -40, -top - 40);
      }
      c.restore();
    }

    // ---- the etrog, formed from the grains
    const et = st.et;
    const conv = smooth(range(t, 4.3, 5.6));
    if (conv > 0 && t < 7.6) {
      c.save(); c.globalCompositeOperation = 'lighter';
      c.globalAlpha = conv * (1 - smooth(range(t, T_S1, 7.4))) * 0.75;
      const r = 150 + 40 * (1 - conv);
      c.drawImage(glow(r, [255, 205, 110]), et.x - r, et.y - r * 1.2, r * 2, r * 2.4);
      c.restore();
    }
    if (solid(t) > 0) {
      const s = solid(t);
      place(c, et, SPR.etrog, s);
      c.save(); c.globalCompositeOperation = 'lighter';
      place(c, et, SPR.etrogGlow, 1.6 * s * (1 - s) + 0.15 * s);
      c.restore();
    }

    // ---- glow of the species: a luminous engraving, rising into the final light
    const gl = 0.12 * smooth(range(t, 3.2, 5)) + 0.4 * smooth(range(t, 7.2, 9));
    if (gl > 0) {
      c.save(); c.globalCompositeOperation = 'lighter';
      if (lF > LUL_LEN) place(c, st.lul, SPR.lulavGlow, gl);
      if (hFront >= HAD_FULL) place(c, st.had, SPR.hadasGlow, gl * 0.8);
      if (solid(t) > 0.99) place(c, et, SPR.etrogGlow, gl * 0.8);
      c.restore();
    }

    // ---- the wave of warm light
    if (t > T_W0) {
      const kw = range(t, T_W0, T_W1);
      const Rw = 80 + ease.out(kw) * 1500;
      const a = 0.5 * fx.smooth(kw * 1.6) * (1 - 0.55 * fx.smooth(fx.range(kw, 0.55, 1)));
      c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = a;
      c.drawImage(SPR.wave, WC[0] - Rw, WC[1] - Rw * 1.55, Rw * 2, Rw * 3.1);
      c.restore();
    }
    c.restore();
  }
  function solid(t) { return fx.smooth(fx.range(t, T_S0, T_S1)); }

  S.beats[5] = {
    init,
    draw,
    grains,
    tint(t) {
      const k = fx.smooth(fx.range(t, 4.3, 5.4)) * (1 - fx.smooth(fx.range(t, 6.3, 7.2)));
      return [255, 214 + 6 * k, 150 - 40 * k];
    },
  };
})();
