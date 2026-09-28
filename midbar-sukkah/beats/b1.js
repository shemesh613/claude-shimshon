// Beat 1 (film 0-14 s): one grain in the dark -> a gust unfolds it into a sand-devil of light
// -> the grains lie down along the crests of a moonlit dune sea -> first light, a caravan on a
// ridge, footprints and dust in gold -> the camera cranes up and tilts to look straight down
// on the sand where the camp will stand (H1).
//
// The whole landscape is one procedural heightfield H(x, z) seen through a real pinhole camera
// (height, pitch). It is drawn as painter-ordered horizontal profile strips (far -> near), each
// filled with a lit/shadow gradient, so the tilt from horizon to top-down is one continuous move.
// From t = 12 the camera is exactly beat 2's opening camera (a top-down view of the camp plain),
// and beat 2's sand is laid over the plain so the seam matches.
(function () {
  const S = (window.MIDBAR = window.MIDBAR || { beats: {} });

  const F = 1100;              // focal length (px)
  const DB = 3;                // base row spacing (m)
  const NS = 34;               // samples per row
  const LAM = 105;             // dune wavelength (m)
  const CR = 0.26;             // crest position within a dune period (steep slipface faces the camera)
  const AMP = 26;              // dune amplitude (m)
  const HMAX = 58;             // max terrain height (m)
  const CAMP_A = 2.0;          // metres per camp unit
  const PZ = 1400;             // camp centre in world z (x = 0)
  const DEG = Math.PI / 180;
  const ORIGIN = [540, 1010];

  let fx, WD, env0, W = 1080, H = 1920, N = 4000;

  // ---------------------------------------------------------------- terrain
  function mask(x, z) {
    const dx = x / 720, dz = (z - PZ) / 900;
    const d = Math.sqrt(dx * dx + dz * dz);
    const cx = (x - 5) / 90, cz = (z + 930) / 90; // a low hollow under the opening camera
    const hol = 0.3 + 0.7 * fx.smooth(Math.sqrt(cx * cx + cz * cz) - 0.5);
    return (0.5 + 0.5 * fx.smooth((d - 1) / 0.75)) * hol;
  }
  function warpZ(x, z) {
    return z + 34 * fx.noise(x * 0.0024 + 11.3, z * 0.0032) + 26 * Math.sin(x * 0.0036 + 2 * fx.noise(z * 0.001, 3.3));
  }
  function Ht(x, z) {
    const p = warpZ(x, z) / LAM;
    const n = Math.floor(p), u = p - n;
    let s;
    if (u < CR) { const v = u / CR; s = v * v; }
    else { const w = (u - CR) / (1 - CR); s = (1 - w) * Math.sqrt(1 - w); }
    const a = AMP * (0.55 + 0.45 * fx.noise(n * 1.37 + 0.5, x * 0.0024)) * mask(x, z);
    return a * s + 9 * fx.noise(x * 0.0013 + 5, z * 0.0013) + 9;
  }

  // crest polylines: for dune n, crest z(x) solving warpZ(x, z) = (n + CR) * LAM
  const CX0 = -5000, CSTEP = 25, CNX = 401;
  const N_MIN = -14, N_MAX = 84;
  let CZ, CH, CM; // Float32Array[(n - N_MIN) * CNX + j]
  function crestZ(n, x) {
    const target = (n + CR) * LAM;
    let z = target;
    for (let k = 0; k < 5; k++) z = target - (warpZ(x, z) - z);
    return z;
  }

  // ---------------------------------------------------------------- camera
  const lerp = (a, b, k) => a + (b - a) * k;
  function campCam(t) { // beat 2's camera formula (b2 local time = t - 12), held before
    const C = WD.CAM_CAMP;
    const u = fx.range(t - 12, 0, 6.8);
    const k = 0.4 * fx.ease.out(u) + 0.6 * fx.ease.inOutSine(u);
    return { x: C.x + (1 - k) * 18, y: C.y + (1 - k) * 34, zoom: 3.1 * Math.pow(C.zoom / 3.1, k) };
  }
  function mkCam(x, y, z, pitch) {
    const p = pitch * DEG;
    return { x, y, z, pitch, sp: Math.sin(p), cp: Math.cos(p) };
  }
  function topCam(t) {
    const cc = campCam(t);
    return mkCam(CAMP_A * cc.x, F * CAMP_A / cc.zoom, PZ - CAMP_A * cc.y, 90);
  }
  const T_TOP = 12.25;
  function camAt(t) {
    if (t >= T_TOP) return topCam(t);
    const a = fx.ease.inOutSine(fx.range(t, 0, 9.5));
    const r = fx.ease.inOutSine(fx.range(t, 4.6, 10.2));
    let x = lerp(-20, 30, a);
    let z = lerp(-980, -870, a);
    let h = lerp(56, 100, r);
    let pitch = lerp(7.5, 6, r);
    const tc = topCam(T_TOP);
    const uh = fx.ease.inOutSine(fx.range(t, 8.7, T_TOP));
    const up = fx.ease.inOut(fx.range(t, 9.2, T_TOP));
    const uz = fx.ease.inOutSine(fx.range(t, 9.0, T_TOP));
    h = Math.exp(lerp(Math.log(h), Math.log(tc.y), uh));
    pitch = lerp(pitch, 90, up);
    z = lerp(z, tc.z, uz);
    x = lerp(x, tc.x, uz);
    return mkCam(x, h, z, pitch);
  }

  // projection into scratch
  let PXo = 0, PYo = 0, PZo = 0;
  function proj(c, X, Y, Z) {
    const dx = X - c.x, dy = Y - c.y, dz = Z - c.z;
    const zc = -dy * c.sp + dz * c.cp;
    const yc = dy * c.cp + dz * c.sp;
    PZo = zc;
    if (zc < 0.5) { PXo = -9999; PYo = -9999; return false; }
    PXo = 540 + F * dx / zc; PYo = 960 - F * yc / zc;
    return true;
  }
  function rayZ(c, sy, plane) { // ground z hit by the ray through screen row sy at height plane
    const k = (960 - sy) / F;
    const Dy = -c.sp + k * c.cp, Dz = c.cp + k * c.sp;
    if (Dy >= -1e-4) return Infinity;
    return c.z + ((plane - c.y) / Dy) * Dz;
  }

  // ---------------------------------------------------------------- palette over time
  const P_NIGHT = {
    skyTop: [5, 6, 20], skyMid: [14, 16, 44], skyHor: [38, 40, 84], haze: [34, 37, 78],
    lit: [104, 112, 176], shade: [10, 11, 30], amb: 0.12, L: [0.25, 0.45, 0.86], fogD: 2600,
    ink: [150, 162, 225], inkA: 0.2, crest: [200, 212, 255], crestA: 0.45, sil: [8, 8, 20],
  };
  const P_DAWN = {
    skyTop: [44, 44, 92], skyMid: [150, 104, 128], skyHor: [252, 176, 112], haze: [226, 160, 124],
    lit: [255, 184, 118], shade: [66, 40, 52], amb: 0.16, L: [-0.5, 0.14, 0.86], fogD: 2300,
    ink: [70, 40, 36], inkA: 0.2, crest: [255, 214, 160], crestA: 0.55, sil: [44, 26, 22],
  };
  const P_DAY = {
    skyTop: [112, 140, 180], skyMid: [206, 196, 186], skyHor: [250, 226, 186], haze: [244, 214, 170],
    lit: [252, 214, 150], shade: [140, 84, 50], amb: 0.26, L: [-0.8, 0.45, 0.25], fogD: 3200,
    ink: [59, 38, 22], inkA: 0.2, crest: [255, 240, 210], crestA: 0.5, sil: [59, 38, 22],
  };
  const P_LATE = {
    skyTop: [120, 130, 170], skyMid: [214, 186, 160], skyHor: [250, 214, 160], haze: [240, 204, 150],
    lit: [248, 210, 148], shade: [160, 100, 56], amb: 0.34, L: [-0.35, 0.45, -0.8], fogD: 3600,
    ink: [59, 38, 22], inkA: 0.16, crest: [255, 236, 200], crestA: 0.4, sil: [59, 38, 22],
  };
  const KEYS = [[0, P_NIGHT], [4.9, P_NIGHT], [6.6, P_DAWN], [8.6, P_DAY], [10.2, P_DAY], [12.2, P_LATE]];
  function pal(t) {
    let a = KEYS[0], b = KEYS[0];
    for (let i = 1; i < KEYS.length; i++) { if (t <= KEYS[i][0]) { a = KEYS[i - 1]; b = KEYS[i]; break; } a = b = KEYS[i]; }
    const k = a === b ? 0 : fx.smooth((t - a[0]) / (b[0] - a[0]));
    const o = {};
    for (const key in a[1]) {
      const va = a[1][key], vb = b[1][key];
      o[key] = Array.isArray(va) ? [lerp(va[0], vb[0], k), lerp(va[1], vb[1], k), lerp(va[2], vb[2], k)] : lerp(va, vb, k);
    }
    const L = o.L, l = Math.hypot(L[0], L[1], L[2]);
    o.L = [L[0] / l, L[1] / l, L[2] / l];
    return o;
  }

  // ---------------------------------------------------------------- caravan
  let CAR_N = 0; // dune index of the caravan's ridge
  const MEMBERS = []; // {kind:0 man,1 camel,2 donkey, off (m behind head), ph}
  const CAR_V = 1.7; // m/s
  const headX = (t) => -28 + CAR_V * (t - 5);
  let CAR_LEN = 0;
  function crestAt(n, x, outArr) { // interpolate crest (z, h) at x for dune n
    const f = (x - CX0) / CSTEP;
    const j = Math.max(0, Math.min(CNX - 2, Math.floor(f)));
    const k = f - j, o = (n - N_MIN) * CNX + j;
    outArr[0] = CZ[o] + (CZ[o + 1] - CZ[o]) * k;
    outArr[1] = CH[o] + (CH[o + 1] - CH[o]) * k;
    return outArr;
  }

  // ---------------------------------------------------------------- statics
  let stars = [];
  let rippleTex = null, gridTex = null;
  // grains
  let ROLE, ARM, SPOS, SJ1, SJ2, TS, GX, GY, GZ, GW, STRM, SEED, TX, TY, EST, ARC, FOOTX;
  const SIM_T0 = 1.6;
  // the sand devil: three arms unwinding by differential rotation, lifted and curl-perturbed
  function spiral(i, t, o) {
    const tau = t - SIM_T0;
    const s = SPOS[i];
    const R = 900 * (1 - Math.exp(-tau * 0.75));
    const r = R * (0.03 + 0.97 * s) * (1 + 0.1 * SJ1[i] * s);
    const om = 5.2 * (1 - Math.exp(-tau * 0.9)) / (0.3 + s) + 0.35 * tau;
    const th = ARM[i] + om + SJ1[i] * 0.09 * (1 - s);
    let x = 540 + r * Math.cos(th);
    let y = 1010 + r * Math.sin(th) * 0.36;
    // a rising column at the core, fading as the devil unfolds
    const lift = (1 - s) * (1 - s) * 520 * Math.sin(Math.min(1, tau / 2.6) * Math.PI) * (0.6 + 0.4 * SJ2[i]);
    y -= lift;
    x += Math.sin(y * 0.02 + tau * 3 + SJ2[i] * 6) * 18 * (1 - s) * Math.min(1, tau);
    // curl-noise drift grows with time
    const e = 0.02, nx = x * 0.0035, ny = y * 0.0035 + tau * 0.15;
    const g = Math.min(1, tau / 2.2) * 70;
    x += (fx.noise(nx, ny + e) - fx.noise(nx, ny - e)) / (2 * e) * g;
    y -= (fx.noise(nx + e, ny) - fx.noise(nx - e, ny)) / (2 * e) * g * 0.6;
    o[0] = x; o[1] = y;
    return o;
  }
  const sp2 = [0, 0];

  // ---------------------------------------------------------------- frame computation (memo)
  let memoT = NaN, memo = null;
  function frame(t) {
    if (t === memoT) return memo;
    const c = camAt(t);
    const P = pal(t);
    // visible z range
    let zmin = Math.min(rayZ(c, 1990, 0), rayZ(c, 1990, HMAX));
    if (!isFinite(zmin)) zmin = c.z + 5;
    zmin = Math.max(zmin - 6, c.z + 4);
    let zmax = rayZ(c, -70, 0);
    const zfar = c.z + 9500;
    if (!isFinite(zmax) || zmax > zfar) zmax = zfar;
    zmax += 10;

    // choose rows: LOD walk (world-anchored multiples of DB * 2^L)
    const SPX = 11;
    const ks = [];
    const sgy = (z) => { proj(c, c.x, 0, z); return PYo; };
    let k = Math.ceil(zmin / DB), L = 0;
    const kmax = Math.floor(zmax / DB);
    let guard = 0;
    while (k <= kmax && guard++ < 2000) {
      const s = Math.abs(sgy(k * DB) - sgy((k + 1) * DB)) + 1e-6;
      const want = Math.max(0, Math.min(11, Math.ceil(Math.log2(SPX / s))));
      while (L < want && k % (1 << (L + 1)) === 0) L++;
      while (L > want) L--;
      ks.push(k);
      k += 1 << L;
    }
    // ink rows: every 6 base rows (18 m), faded by projected spacing
    const inkPitch = 1 - fx.smooth((c.pitch - 30) / 35);
    const inkMap = new Map();
    if (inkPitch > 0.01 && P.inkA > 0.01) {
      for (let q = Math.ceil(zmin / (DB * 6)) * 6; q <= kmax; q += 6) {
        const s = Math.abs(sgy(q * DB) - sgy((q + 6) * DB));
        const a = fx.smooth((s - 7) / 26) * inkPitch;
        if (a > 0.02) inkMap.set(q, a);
      }
    }
    for (const q of inkMap.keys()) ks.push(q);
    ks.sort((a, b) => b - a);
    const rows = [];
    let last = null;
    for (const q of ks) {
      if (q === last) continue;
      last = q;
      const z = q * DB, dz = z - c.z;
      const zc0 = c.y * c.sp + dz * c.cp;
      if (zc0 < 3) continue;
      const sx = new Float32Array(NS), sy = new Float32Array(NS), xs = new Float32Array(NS), hs = new Float32Array(NS);
      let ok = true;
      for (let j = 0; j < NS; j++) {
        const px = -40 + j * (1160 / (NS - 1));
        const x = c.x + (px - 540) * zc0 / F;
        const h = Ht(x, z);
        xs[j] = x; hs[j] = h;
        if (!proj(c, x, h, z)) { ok = false; break; }
        sx[j] = PXo; sy[j] = PYo;
      }
      if (!ok) continue;
      rows.push({ z, zc: zc0, sx, sy, xs, hs, ink: inkMap.get(q) || 0 });
    }
    // occlusion: suffix minima of ridge y, nearer rows (rows are far -> near)
    const R = rows.length;
    const occ = new Float32Array((R + 1) * NS);
    for (let j = 0; j < NS; j++) occ[R * NS + j] = 1e9;
    for (let r = R - 1; r >= 0; r--) {
      const o = r * NS, sy = rows[r].sy;
      for (let j = 0; j < NS; j++) occ[o + j] = Math.min(sy[j], occ[o + NS + j]);
    }
    memoT = t;
    memo = { t, c, P, rows, occ, zmin, zmax };
    return memo;
  }
  // visibility (0..1) of a world point already projected to (sx, sy) with world depth z
  function visible(fr, z, sx, sy) {
    const rows = fr.rows;
    // first row index (far -> near) with row.z < z - 1
    let lo = 0, hi = rows.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (rows[m].z < z - 1.5) hi = m; else lo = m + 1; }
    if (lo >= rows.length) return 1;
    const f = (sx + 40) / (1160 / (NS - 1));
    const j = Math.max(0, Math.min(NS - 2, Math.floor(f))), k = Math.max(0, Math.min(1, f - j));
    const o = lo * NS;
    const ym = fr.occ[o + j] + (fr.occ[o + j + 1] - fr.occ[o + j]) * k;
    return fx.clamp((ym - sy + 1) / 5);
  }

  // ---------------------------------------------------------------- drawing
  function shadeColor(P, x, z, h, zc) {
    const e = 1.5;
    const hx = (Ht(x + e, z) - h) / e, hz = (Ht(x, z + e) - h) / e;
    const il = 1 / Math.sqrt(hx * hx + 1 + hz * hz);
    const nx = -hx * il, ny = il, nz = -hz * il;
    let d = nx * P.L[0] + ny * P.L[1] + nz * P.L[2];
    d = d < 0 ? 0 : d;
    let v = P.amb + (1 - P.amb) * d;
    v *= 0.82 + 0.18 * fx.clamp((h - 6) / 26);
    const fog = (1 - Math.exp(-zc / P.fogD)) * 0.92;
    const r = lerp(lerp(P.shade[0], P.lit[0], v), P.haze[0], fog);
    const g = lerp(lerp(P.shade[1], P.lit[1], v), P.haze[1], fog);
    const b = lerp(lerp(P.shade[2], P.lit[2], v), P.haze[2], fog);
    return `rgb(${r | 0},${g | 0},${b | 0})`;
  }
  const STOPS = [0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33];

  function drawSky(ctx, fr, t) {
    const { c, P } = fr;
    const hy = c.pitch < 80 ? 960 - F * Math.tan(c.pitch * DEG) : -1e4;
    if (hy > -50) {
      const g = ctx.createLinearGradient(0, hy - 1150, 0, hy + 2);
      g.addColorStop(0, fx.rgba(P.skyTop, 1));
      g.addColorStop(0.55, fx.rgba(P.skyMid, 1));
      g.addColorStop(1, fx.rgba(P.skyHor, 1));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, Math.min(H, hy + 4));
      ctx.fillStyle = fx.rgba(P.haze, 1);
      if (hy + 4 < H) ctx.fillRect(0, Math.max(0, hy + 2), W, H);
    } else {
      ctx.fillStyle = fx.rgba(P.haze, 1);
      ctx.fillRect(0, 0, W, H);
      return;
    }
    const dirProj = (az, el) => {
      const dx = Math.sin(az * DEG) * Math.cos(el * DEG), dy = Math.sin(el * DEG), dz = Math.cos(az * DEG) * Math.cos(el * DEG);
      const zc = -dy * c.sp + dz * c.cp, yc = dy * c.cp + dz * c.sp;
      if (zc <= 0.05) return null;
      return [540 + F * dx / zc, 960 - F * yc / zc];
    };
    // stars
    const night = 1 - fx.smooth(fx.range(t, 4.8, 6.6));
    if (night > 0.01) {
      ctx.fillStyle = '#e9eefc';
      for (const s of stars) {
        const p = dirProj(s.az, s.el);
        if (!p || p[1] > hy - 6) continue;
        const tw = 0.65 + 0.35 * Math.sin(t * s.f + s.p);
        ctx.globalAlpha = night * s.a * tw * fx.clamp((hy - p[1]) / 140);
        ctx.fillRect(p[0] - s.r / 2, p[1] - s.r / 2, s.r, s.r);
      }
      ctx.globalAlpha = 1;
      // full moon of Tishrei
      const m = dirProj(16, 27);
      if (m) {
        ctx.globalCompositeOperation = 'lighter';
        const gl = fx.glow(300, [120, 130, 200]);
        ctx.globalAlpha = 0.5 * night; ctx.drawImage(gl, m[0] - 300, m[1] - 300);
        const g2 = fx.glow(70, [233, 238, 252]);
        ctx.globalAlpha = 0.7 * night; ctx.drawImage(g2, m[0] - 70, m[1] - 70);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = night;
        const mg = ctx.createRadialGradient(m[0] - 6, m[1] - 6, 2, m[0], m[1], 22);
        mg.addColorStop(0, '#fbfbff'); mg.addColorStop(0.8, '#e2e6f6'); mg.addColorStop(1, '#c6cbe6');
        ctx.fillStyle = mg;
        ctx.beginPath(); ctx.arc(m[0], m[1], 22, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(150,158,200,0.25)';
        ctx.beginPath(); ctx.arc(m[0] + 6, m[1] - 4, 6, 0, Math.PI * 2); ctx.arc(m[0] - 7, m[1] + 6, 4, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    // sun: rises at the left during dawn
    const sunK = fx.smooth(fx.range(t, 4.9, 7.2));
    if (sunK > 0.01) {
      const el = lerp(-3.5, 9, fx.ease.out(fx.range(t, 5.2, 11)));
      const s = dirProj(-30, el);
      if (s) {
        ctx.globalCompositeOperation = 'lighter';
        const g1 = fx.glow(520, [255, 150, 80]);
        ctx.globalAlpha = 0.55 * sunK; ctx.drawImage(g1, s[0] - 520, s[1] - 520);
        const g2 = fx.glow(160, [255, 214, 150]);
        ctx.globalAlpha = 0.8 * sunK; ctx.drawImage(g2, s[0] - 160, s[1] - 160);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = sunK;
        ctx.fillStyle = '#fff4dc';
        ctx.beginPath(); ctx.arc(s[0], s[1], 17, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  }

  function drawRow(ctx, fr, i) {
    const rows = fr.rows, row = rows[i], next = rows[i + 1];
    const { sx, sy, xs, hs } = row;
    const P = fr.P;
    const x0 = sx[0], x1 = sx[NS - 1];
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    for (const j of STOPS) {
      const u = (sx[j] - x0) / (x1 - x0);
      g.addColorStop(u < 0 ? 0 : u > 1 ? 1 : u, shadeColor(P, xs[j], row.z, hs[j], row.zc));
    }
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(sx[0], sy[0]);
    for (let j = 1; j < NS; j++) ctx.lineTo(sx[j], sy[j]);
    if (next) { for (let j = NS - 1; j >= 0; j--) ctx.lineTo(next.sx[j], next.sy[j] + 3); }
    else { ctx.lineTo(1200, 2100); ctx.lineTo(-120, 2100); }
    ctx.closePath();
    ctx.fill();
    if (row.ink > 0) {
      // contour strokes only on the dune faces (where the profile is steep along z)
      const fog = Math.exp(-row.zc / (P.fogD * 0.8));
      ctx.strokeStyle = fx.rgba(P.ink, P.inkA * row.ink * fog);
      ctx.lineWidth = fx.clamp(400 / row.zc, 0.6, 1.5);
      ctx.beginPath();
      let pen = false;
      for (let j = 0; j < NS; j++) {
        const hz = Math.abs(Ht(xs[j], row.z + 2) - hs[j]) / 2;
        if (hz > 0.16) { if (pen) ctx.lineTo(sx[j], sy[j]); else { ctx.moveTo(sx[j], sy[j]); pen = true; } }
        else if (pen) { ctx.lineTo(sx[j], sy[j]); pen = false; }
      }
      ctx.stroke();
    }
  }

  function crestEvents(fr, events) {
    const { c } = fr;
    const nLo = Math.max(N_MIN, Math.floor(fr.zmin / LAM) - 1), nHi = Math.min(N_MAX, Math.ceil(fr.zmax / LAM) + 1);
    for (let n = nLo; n <= nHi; n++) {
      const zm = (n + CR) * LAM;
      const zc0 = c.y * c.sp + (zm - c.z) * c.cp;
      if (zc0 < 8) continue;
      const half = 640 * zc0 / F;
      const jLo = Math.max(0, Math.floor((c.x - half - CX0) / CSTEP));
      const jHi = Math.min(CNX - 1, Math.ceil((c.x + half - CX0) / CSTEP));
      const spacing = CSTEP * F / zc0;
      const stride = Math.max(1, Math.ceil(5 / spacing));
      const o = (n - N_MIN) * CNX;
      const pts = [];
      let key = Infinity;
      for (let j = jLo; j <= jHi; j += stride) {
        const m = CM[o + j];
        const x = CX0 + j * CSTEP;
        if (!proj(c, x, CH[o + j], CZ[o + j]) || PZo < 6) { pts.push(NaN, NaN, 0); continue; }
        pts.push(PXo, PYo, m);
        if (CZ[o + j] < key) key = CZ[o + j];
      }
      if (pts.length >= 6 && key < Infinity) events.push({ z: key - 0.5, type: 1, pts, zc: zc0, n });
    }
  }

  function drawCrest(ctx, fr, ev) {
    const P = fr.P;
    const fog = Math.exp(-ev.zc / (P.fogD * 0.9));
    const a = P.crestA * (0.25 + 0.75 * fog);
    if (a < 0.02) return;
    ctx.lineWidth = fx.clamp(260 / ev.zc, 0.5, 2.2);
    ctx.strokeStyle = fx.rgba(P.crest, a);
    const p = ev.pts;
    ctx.beginPath();
    let pen = false;
    for (let i = 0; i < p.length; i += 3) {
      if (!(p[i + 2] > 0.45) || p[i] !== p[i]) { pen = false; continue; }
      if (!pen) { ctx.moveTo(p[i], p[i + 1]); pen = true; } else ctx.lineTo(p[i], p[i + 1]);
    }
    ctx.stroke();
  }

  // --- caravan
  const tmp2 = [0, 0];
  function memberWorld(m, t, out) {
    const x = headX(t) - m.off;
    crestAt(CAR_N, x, tmp2);
    out[0] = x; out[1] = tmp2[1] - 0.3; out[2] = tmp2[0] - 1.2;
    return out;
  }
  function caravanAlpha(t) { return fx.smooth(fx.range(t, 4.9, 6.4)) * (1 - fx.smooth(fx.range(t, 10.4, 11.4))); }
  const mw = [0, 0, 0];
  function drawCaravan(ctx, fr, t) {
    const a = caravanAlpha(t);
    if (a <= 0.01) return;
    const { c, P } = fr;
    const Lx = P.L[0], Lz = P.L[2], Ly = Math.max(0.12, P.L[1]);
    const shLen = 1.8 / Ly * 0.9;
    const col = fx.rgba(P.sil, 1);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.lineCap = 'round';
    for (const m of MEMBERS) {
      memberWorld(m, t, mw);
      if (!proj(c, mw[0], mw[1], mw[2])) continue;
      const fx0 = PXo, fy0 = PYo, zc = PZo;
      if (fx0 < -40 || fx0 > W + 40) continue;
      const s = (F / zc) * 1.55; // px per metre (stylised)
      // long shadow on the sand, away from the sun
      proj(c, mw[0] - Lx * shLen, mw[1] - 0.4, mw[2] - Lz * shLen);
      ctx.strokeStyle = fx.rgba(P.shade, 0.35);
      ctx.lineWidth = Math.max(1, s * (m.kind ? 0.9 : 0.35));
      ctx.beginPath(); ctx.moveTo(fx0, fy0); ctx.lineTo(PXo, PYo); ctx.stroke();
      const ph = t * (m.kind ? 3.2 : 4.4) + m.ph;
      const bob = Math.abs(Math.sin(ph)) * 0.05 * s;
      ctx.strokeStyle = col; ctx.fillStyle = col;
      if (m.kind === 0) {
        // a man: legs, robe, head-cloth, staff
        const hgt = 1.8 * s, st = Math.sin(ph) * 0.22 * s;
        ctx.lineWidth = Math.max(0.8, 0.13 * s);
        ctx.beginPath();
        ctx.moveTo(fx0 - st, fy0); ctx.lineTo(fx0, fy0 - 0.5 * s - bob);
        ctx.moveTo(fx0 + st, fy0); ctx.lineTo(fx0, fy0 - 0.5 * s - bob);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(fx0 - 0.26 * s, fy0 - 0.35 * s - bob);
        ctx.lineTo(fx0 + 0.24 * s, fy0 - 0.35 * s - bob);
        ctx.lineTo(fx0 + 0.12 * s, fy0 - 1.45 * s - bob);
        ctx.lineTo(fx0 - 0.14 * s, fy0 - 1.45 * s - bob);
        ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.arc(fx0 + 0.02 * s, fy0 - 1.62 * s - bob, 0.17 * s, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); // head cloth falling behind
        ctx.moveTo(fx0 - 0.1 * s, fy0 - 1.7 * s - bob); ctx.lineTo(fx0 - 0.3 * s, fy0 - 1.25 * s - bob); ctx.lineTo(fx0, fy0 - 1.45 * s - bob); ctx.fill();
        if (m.staff) {
          ctx.lineWidth = Math.max(0.6, 0.07 * s);
          ctx.beginPath(); ctx.moveTo(fx0 + 0.45 * s, fy0 + 0.05 * s); ctx.lineTo(fx0 + 0.3 * s, fy0 - hgt - 0.25 * s); ctx.stroke();
        }
      } else {
        // a laden camel (1) or donkey (2), walking right
        const big = m.kind === 1 ? 1 : 0.62;
        const L2 = 1.1 * big * s, hb = 1.35 * big * s;
        ctx.lineWidth = Math.max(0.7, 0.14 * big * s);
        const sw = Math.sin(ph) * 0.25 * big * s;
        ctx.beginPath();
        ctx.moveTo(fx0 - L2 * 0.7 + sw, fy0); ctx.lineTo(fx0 - L2 * 0.6, fy0 - hb - bob);
        ctx.moveTo(fx0 - L2 * 0.4 - sw, fy0); ctx.lineTo(fx0 - L2 * 0.45, fy0 - hb - bob);
        ctx.moveTo(fx0 + L2 * 0.5 - sw, fy0); ctx.lineTo(fx0 + L2 * 0.45, fy0 - hb - bob);
        ctx.moveTo(fx0 + L2 * 0.72 + sw, fy0); ctx.lineTo(fx0 + L2 * 0.6, fy0 - hb - bob);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(fx0, fy0 - hb * 1.12 - bob, L2 * 0.85, hb * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();
        // load
        ctx.beginPath();
        ctx.ellipse(fx0 - L2 * 0.05, fy0 - hb * 1.45 - bob, L2 * 0.45, hb * 0.24, 0, 0, Math.PI * 2);
        ctx.fill();
        // neck + head
        ctx.lineWidth = Math.max(0.8, 0.22 * big * s);
        ctx.beginPath();
        if (m.kind === 1) {
          ctx.moveTo(fx0 + L2 * 0.75, fy0 - hb * 1.15 - bob);
          ctx.quadraticCurveTo(fx0 + L2 * 1.2, fy0 - hb * 1.2 - bob, fx0 + L2 * 1.2, fy0 - hb * 1.75 - bob);
          ctx.lineTo(fx0 + L2 * 1.45, fy0 - hb * 1.7 - bob);
        } else {
          ctx.moveTo(fx0 + L2 * 0.75, fy0 - hb * 1.15 - bob);
          ctx.lineTo(fx0 + L2 * 1.05, fy0 - hb * 1.5 - bob);
          ctx.lineTo(fx0 + L2 * 1.25, fy0 - hb * 1.35 - bob);
          ctx.moveTo(fx0 + L2 * 1.0, fy0 - hb * 1.5 - bob); ctx.lineTo(fx0 + L2 * 0.95, fy0 - hb * 1.8 - bob);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // top-down sand: beat 2's ground if it is available, otherwise our own ripple texture
  function drawTopSand(ctx, fr, t, alpha) {
    const { c } = fr;
    // affine map camp coords -> screen, from three projected ground points around the view centre
    const cc = campCam(Math.max(t, T_TOP));
    const u0x = cc.x, u0y = cc.y;
    const w = (ux, uy) => { proj(c, CAMP_A * ux, 0, PZ - CAMP_A * uy); return [PXo, PYo]; };
    // centre of interest: the camp point under the screen centre ray (approx)
    let gz = rayZ(c, 960, 0);
    if (!isFinite(gz)) return;
    const cy0 = (PZ - gz) / CAMP_A, cx0 = c.x / CAMP_A;
    const d = 40;
    const p0 = w(cx0, cy0), p1 = w(cx0 + d, cy0), p2 = w(cx0, cy0 + d);
    const a = (p1[0] - p0[0]) / d, b = (p1[1] - p0[1]) / d, cq = (p2[0] - p0[0]) / d, dq = (p2[1] - p0[1]) / d;
    const e = p0[0] - a * cx0 - cq * cy0, f = p0[1] - b * cx0 - dq * cy0;
    ctx.save();
    ctx.globalAlpha = alpha;
    let done = false;
    const b2 = S.beats[2];
    if (b2 && b2.scene && typeof b2.scene.ground === 'function') {
      try {
        ctx.transform(a, b, cq, dq, e, f);
        ctx.translate(-W / 2, -H / 2);
        b2.scene.ground(ctx, { x: 0, y: 0, zoom: 1 }, env0, 0);
        done = true;
      } catch (err) { done = false; }
    }
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.transform(a, b, cq, dq, e, f);
    if (!done) ctx.drawImage(rippleTex, -600, -1000, 1200, 2000);
    ctx.restore();
    void u0x; void u0y;
    return [a, b, cq, dq, e, f];
  }

  function drawGrid(ctx, M, alpha) {
    if (!M || alpha <= 0.01) return;
    ctx.save();
    ctx.transform(M[0], M[1], M[2], M[3], M[4], M[5]);
    ctx.globalAlpha = alpha;
    ctx.drawImage(gridTex, -600, -1000, 1200, 2000);
    ctx.restore();
  }

  // ---------------------------------------------------------------- init
  function buildCrests() {
    const nn = N_MAX - N_MIN + 1;
    CZ = new Float32Array(nn * CNX); CH = new Float32Array(nn * CNX); CM = new Float32Array(nn * CNX);
    for (let n = N_MIN; n <= N_MAX; n++) {
      for (let j = 0; j < CNX; j++) {
        const x = CX0 + j * CSTEP;
        const z = crestZ(n, x);
        const o = (n - N_MIN) * CNX + j;
        CZ[o] = z; CH[o] = Ht(x, z); CM[o] = mask(x, z);
      }
    }
  }

  function buildTextures() {
    // fallback ripple sand (camp coords -600..600 x -1000..1000 at 0.9 px/unit)
    const sc = 0.9;
    rippleTex = fx.canvas(1080, 1800);
    const g = rippleTex.getContext('2d');
    g.fillStyle = '#e4b46e'; g.fillRect(0, 0, 1080, 1800);
    const r = fx.rng(77);
    for (let i = 0; i < 90; i++) {
      const x = r() * 1080, y = r() * 1800, rad = 60 + r() * 200;
      const gl = g.createRadialGradient(x, y, 0, x, y, rad);
      const lt = r() < 0.5;
      gl.addColorStop(0, lt ? 'rgba(250,216,160,0.35)' : 'rgba(190,130,70,0.25)');
      gl.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gl; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    for (let y0 = -20; y0 < 1830; y0 += 9) {
      g.beginPath();
      for (let x = -10; x <= 1090; x += 12) {
        const y = y0 + 5 * Math.sin(x * 0.011 + y0 * 0.07) + 9 * fx.noise(x * 0.004, y0 * 0.013);
        if (x === -10) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.strokeStyle = 'rgba(150,94,48,0.22)'; g.lineWidth = 1.1; g.stroke();
      g.translate(0, 1.6); g.strokeStyle = 'rgba(255,236,196,0.25)'; g.lineWidth = 0.9; g.stroke(); g.translate(0, -1.6);
    }
    void sc;
    // faint grid foreshadowing the camp: block outlines and the axes (camp coords, same frame)
    gridTex = fx.canvas(1200, 2000);
    const q = gridTex.getContext('2d');
    q.translate(600, 1000);
    q.strokeStyle = 'rgba(80,50,26,0.55)';
    q.lineWidth = 1.1;
    const blocks = new Map();
    for (const tt of WD.TENTS) {
      let b = blocks.get(tt.tribe);
      if (!b) { b = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 }; blocks.set(tt.tribe, b); }
      b.x0 = Math.min(b.x0, tt.x - 8); b.x1 = Math.max(b.x1, tt.x + 8);
      b.y0 = Math.min(b.y0, tt.y - 8); b.y1 = Math.max(b.y1, tt.y + 8);
    }
    q.setLineDash([6, 7]);
    for (const b of blocks.values()) q.strokeRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
    q.setLineDash([2, 9]);
    q.beginPath();
    q.moveTo(0, -330); q.lineTo(0, 330); q.moveTo(-330, 0); q.lineTo(330, 0);
    q.stroke();
    q.setLineDash([]);
    const m = WD.MISHKAN;
    q.strokeRect(m.x, m.y, m.w, m.h);
  }

  function buildCaravan() {
    // pick the dune whose crest (at x ~ 0) sits ~ 270 m ahead of the camera at t = 7.5
    const c = camAt(7.5);
    let best = 1e9;
    for (let n = N_MIN; n <= N_MAX; n++) {
      const z = CZ[(n - N_MIN) * CNX + Math.round((0 - CX0) / CSTEP)];
      const d = Math.abs(z - (c.z + 280));
      if (d < best) { best = d; CAR_N = n; }
    }
    const r = fx.rng(606);
    const pattern = [0, 0, 1, 0, 2, 0, 0, 1, 1, 0, 0, 2, 0, 1, 0, 0, 0, 1, 2, 0, 0, 1, 0, 0, 2, 0, 1, 0, 0, 0, 1, 0];
    let off = 0;
    for (const kind of pattern) {
      MEMBERS.push({ kind, off, ph: r() * 6.28, staff: r() < 0.7 });
      off += kind === 1 ? 5.2 : kind === 2 ? 3.6 : 2.4 + r() * 1.4;
      if (r() < 0.15) off += 4 + r() * 5; // small gaps between families
    }
    CAR_LEN = off;
  }

  function buildStars() {
    const r = fx.rng(31);
    for (let i = 0; i < 240; i++) {
      stars.push({ az: -32 + r() * 64, el: 2 + Math.pow(r(), 0.8) * 58, r: 0.9 + r() * r() * 2.4, a: 0.3 + 0.7 * r(), f: 1 + r() * 3, p: r() * 6.28 });
    }
  }

  // grains -------------------------------------------------------------
  function buildGrains() {
    const r = fx.rng(1001);
    ROLE = new Uint8Array(N);
    GX = new Float32Array(N); GY = new Float32Array(N); GZ = new Float32Array(N);
    GW = new Float32Array(N); STRM = new Uint8Array(N); SEED = new Float32Array(N);
    TS = new Float32Array(N); TX = new Float32Array(N); TY = new Float32Array(N);
    EST = new Float32Array(N); ARC = new Float32Array(N); FOOTX = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const m = i % 10;
      ROLE[i] = m < 7 ? 0 : m === 7 ? 1 : m === 8 ? 2 : 3; // crest, footprint, dust, sparkle
      SEED[i] = r();
      STRM[i] = ROLE[i] === 0 && r() < 0.22 ? 1 : 0;
      ARC[i] = (r() - 0.5) * 2;
    }
    // night crest targets: sample visible crest length at the night camera
    const t5 = 4.9;
    const fr = frame(t5), c = fr.c;
    const segs = []; let total = 0;
    for (let n = N_MIN; n <= N_MAX; n++) {
      const o = (n - N_MIN) * CNX;
      let prev = null;
      for (let j = 0; j < CNX; j++) {
        const x = CX0 + j * CSTEP;
        const okp = proj(c, x, CH[o + j], CZ[o + j]);
        const sx = PXo, sy = PYo;
        const good = okp && CM[o + j] > 0.5 && sx > -10 && sx < W + 10 && sy > 380 && sy < 1560 && PZo < 2600 &&
          visible(fr, CZ[o + j], sx, sy) > 0.6;
        const cur = good ? { j, sx, sy } : null;
        if (cur && prev) {
          const len = Math.hypot(cur.sx - prev.sx, cur.sy - prev.sy);
          if (len < 80) { segs.push({ n, j: prev.j, len, acc: total }); total += len; }
        }
        prev = cur;
      }
    }
    const crestIdx = [];
    for (let i = 0; i < N; i++) if (ROLE[i] !== 3) crestIdx.push(i);
    const M = crestIdx.length;
    let si = 0;
    for (let q = 0; q < M; q++) {
      const i = crestIdx[q];
      const target = ((q + 0.5) / M) * total;
      while (si < segs.length - 1 && segs[si].acc + segs[si].len < target) si++;
      const s = segs[si];
      const k = fx.clamp((target - s.acc) / s.len);
      const x = CX0 + (s.j + k) * CSTEP;
      crestAt(s.n, x, tmp2);
      GX[i] = x; GZ[i] = tmp2[0]; GY[i] = tmp2[1] + 0.15;
    }
    // sparkles: random ground points in view
    for (let i = 0; i < N; i++) {
      if (ROLE[i] !== 3) continue;
      const sx = r() * W, sy = 820 + r() * 900;
      const gz = rayZ(c, sy, 10);
      const zz = isFinite(gz) ? Math.min(gz, c.z + 2500) : c.z + 600;
      const zc0 = c.y * c.sp + (zz - c.z) * c.cp;
      const x = c.x + (sx - 540) * zc0 / F;
      GX[i] = x; GZ[i] = zz; GY[i] = Ht(x, zz) + 0.2;
    }
    // settle order: from the centre outward (the ridges draw themselves)
    for (let i = 0; i < N; i++) {
      proj(c, GX[i], GY[i], GZ[i]);
      const d = Math.min(1, Math.abs(PXo - 540) / 560 + Math.abs(PYo - 1010) / 1400);
      TS[i] = 2.6 + 2.0 * d + 0.35 * SEED[i];
      GW[i] = ROLE[i] === 3 ? 0.14 + 0.12 * r() : 0.42 + 0.3 * r();
    }
    // footprints: world x along the caravan path
    for (let i = 0; i < N; i++) {
      if (ROLE[i] !== 1) continue;
      FOOTX[i] = headX(5) - CAR_LEN - 60 + r() * (headX(10.5) - headX(5) + CAR_LEN + 60);
    }

    // sand-devil spiral parameters
    ARM = new Float32Array(N); SPOS = new Float32Array(N); SJ1 = new Float32Array(N); SJ2 = new Float32Array(N);
    const gauss = () => { let q = 0; for (let k = 0; k < 4; k++) q += r(); return (q - 2) / 1.15; };
    for (let i = 0; i < N; i++) {
      ARM[i] = ((i * 7) % 3) * (Math.PI * 2 / 3) + gauss() * 0.12;
      SPOS[i] = Math.pow(r(), 0.8);
      SJ1[i] = gauss(); SJ2[i] = r();
    }
  }

  // final (camp) layout: replicate beat 2's opening grain layout on tent outlines
  function campTarget(i, cc, out) {
    const T = WD.TENTS, j = i % T.length, t = T[j];
    const per = 2 * (t.w + t.h);
    let p = ((i * 0.61803398875 + j * 0.137) % 1) * per;
    let lx, ly;
    if (p < t.w) { lx = -t.w / 2 + p; ly = -t.h / 2; }
    else if ((p -= t.w) < t.h) { lx = t.w / 2; ly = -t.h / 2 + p; }
    else if ((p -= t.h) < t.w) { lx = t.w / 2 - p; ly = t.h / 2; }
    else { p -= t.w; lx = -t.w / 2; ly = t.h / 2 - p; }
    const co = Math.cos(t.rot), si = Math.sin(t.rot);
    out[0] = t.x + lx * co - ly * si; out[1] = t.y + lx * si + ly * co;
    return out;
  }

  function buildFinal() {
    // order the camp migration: sweep by position of the grain at t = 9.6
    const cc = campCam(14);
    const pos = new Float32Array(N * 2);
    const tmpg = new Float32Array(N * 3);
    phaseD(9.6, tmpg, frame(9.6));
    let minx = 1e9, maxx = -1e9;
    for (let i = 0; i < N; i++) { minx = Math.min(minx, tmpg[3 * i]); maxx = Math.max(maxx, tmpg[3 * i]); }
    const cp = [0, 0];
    for (let i = 0; i < N; i++) {
      campTarget(i, cc, cp);
      TX[i] = cp[0]; TY[i] = cp[1];
      const xr = fx.clamp((tmpg[3 * i] - minx) / (maxx - minx + 1));
      EST[i] = 9.4 + 1.3 * xr + 0.5 * SEED[i];
      pos[2 * i] = tmpg[3 * i]; pos[2 * i + 1] = tmpg[3 * i + 1];
    }
  }

  // grains in the dunes / journey phase (world anchored), writes screen x, y, w
  const wtmp = [0, 0, 0];
  function phaseD(t, out, fr) {
    const c = fr.c;
    const day = fx.smooth(fx.range(t, 5.2, 8.5));
    for (let i = 0; i < N; i++) {
      let X = GX[i], Y = GY[i], Z = GZ[i];
      let w = GW[i] * (1 - 0.45 * day);
      const role = ROLE[i];
      if (role === 0 && STRM[i]) {
        // sand blowing off the crest, downwind (to the right), looping
        const ph = (t * 0.32 + SEED[i] * 7.3) % 1;
        const on = fx.smooth(fx.range(t, 4.4, 5.6));
        X += ph * 26 * on; Y += (Math.sin(ph * Math.PI) * 3.5 - ph * 2.5) * on; Z += ph * 6 * on;
        w *= 1 - ph * on * 0.9;
      } else if (role === 1 || role === 2) {
        const go = fx.ease.inOut(fx.range(t, 5.3 + SEED[i] * 1.1, 6.9 + SEED[i] * 1.1));
        if (go > 0) {
          let dX, dY, dZ, dw;
          const m = MEMBERS[(i * 7) % MEMBERS.length];
          if (role === 2) {
            memberWorld(m, t, wtmp);
            const ph = (t * 0.45 + SEED[i] * 5.1) % 1;
            dX = wtmp[0] - 1.5 - ph * 7 + Math.sin(t * 1.3 + i) * 0.8;
            dY = wtmp[1] + 0.3 + ph * 3.2;
            dZ = wtmp[2] + (SEED[i] - 0.5) * 3 + ph * 2;
            dw = 0.34 * Math.sin(ph * Math.PI);
          } else {
            const fxp = FOOTX[i];
            const tailX = headX(t) - CAR_LEN;
            // before the tail passes, the grain rides in the dust behind the tail
            const tr = 5 + (fxp + CAR_LEN - (-28)) / CAR_V; // time the tail reaches fxp
            const kf = fx.ease.out(fx.clamp((t - tr) / 0.6));
            crestAt(CAR_N, fxp, tmp2);
            const fX = fxp, fZ = tmp2[0] - 1.6 + (SEED[i] - 0.5) * 1.2, fY = tmp2[1] - 0.25;
            const ph = (t * 0.5 + SEED[i] * 3.3) % 1;
            const ax = Math.min(tailX, fxp + 0) - 2 - ph * 4;
            crestAt(CAR_N, ax, tmp2);
            const aY = tmp2[1] + 0.8 + ph * 2, aZ = tmp2[0];
            dX = lerp(ax, fX, kf); dY = lerp(aY, fY, kf); dZ = lerp(aZ, fZ, kf);
            dw = lerp(0.22, 0.36, kf);
          }
          X = lerp(X, dX, go); Y = lerp(Y, dY, go) + Math.sin(go * Math.PI) * 8; Z = lerp(Z, dZ, go);
          w = lerp(w, dw, go);
        }
      } else if (role === 3) {
        w *= 0.6 + 0.4 * Math.sin(t * (1.5 + SEED[i] * 3) + SEED[i] * 40);
      }
      if (!proj(c, X, Y, Z)) { out[3 * i] = PXo; out[3 * i + 1] = PYo; out[3 * i + 2] = 0; continue; }
      const sx = PXo, sy = PYo;
      const v = visible(fr, Z, sx, sy);
      out[3 * i] = sx; out[3 * i + 1] = sy; out[3 * i + 2] = w * v;
    }
  }

  const ptmp = new Float32Array(4000 * 3);
  function grainsAt(t, out) {
    if (t < SIM_T0) {
      for (let i = 0; i < N; i++) { out[3 * i] = ORIGIN[0]; out[3 * i + 1] = ORIGIN[1]; out[3 * i + 2] = 0; }
      // breathing, exactly 0.8 at t = 0 (matches beat 6's last frame), swelling before the gust
      out[2] = 0.8 + 0.1 * Math.sin(t * 3.4);
      if (t >= 1.2) out[2] = lerp(out[2], 0.95, fx.smooth(fx.range(t, 1.2, 1.6)));
      return;
    }
    const fr = frame(t);
    phaseD(t, ptmp, fr);
    const burstW = fx.smooth(fx.range(t, SIM_T0, SIM_T0 + 0.5));
    const cc = campCam(t);
    const final = t > 9.3;
    for (let i = 0; i < N; i++) {
      let x = ptmp[3 * i], y = ptmp[3 * i + 1], w = ptmp[3 * i + 2];
      if (t < TS[i] + 1.2) {
        spiral(i, t, sp2);
        const qx = sp2[0], qy = sp2[1];
        const k = fx.ease.inOut(fx.range(t, TS[i], TS[i] + 1.2));
        const wb = (i === 0 ? 0.95 : (0.2 + 0.45 * SEED[i]) * (1.25 - 0.5 * SPOS[i]) * burstW);
        if (k <= 0) { x = qx; y = qy; w = wb; }
        else { x = lerp(qx, x, k); y = lerp(qy, y, k); w = lerp(wb, w, k); }
      }
      if (final) {
        const k = fx.ease.inOut(fx.range(t, EST[i], EST[i] + 1.7));
        if (k > 0) {
          // tent outline point: camp coords -> world ground -> screen through the current camera
          proj(fr.c, CAMP_A * TX[i], 0, PZ - CAMP_A * TY[i]);
          let ex = PXo, ey = PYo;
          if (t >= T_TOP) { ex = (TX[i] - cc.x) * cc.zoom + 540; ey = (TY[i] - cc.y) * cc.zoom + 960; }
          const dx = ex - x, dy = ey - y;
          const arc = Math.sin(Math.PI * k) * 0.3 * ARC[i];
          const nx = x + dx * k - dy * arc, ny = y + dy * k + dx * arc - Math.sin(Math.PI * k) * 60;
          x = nx; y = ny;
          const tw = 0.4 + 0.05 * Math.sin(t * 3 + SEED[i] * 30);
          w = lerp(w, tw, k) + 0.25 * Math.sin(Math.PI * k);
        }
      }
      out[3 * i] = x; out[3 * i + 1] = y; out[3 * i + 2] = w;
    }
  }

  // ---------------------------------------------------------------- beat module
  S.beats[1] = {
    init(env) {
      fx = env.fx; WD = env.world; env0 = env; W = env.W; H = env.H; N = env.GRAINS;
      buildCrests();
      buildCaravan();
      buildStars();
      buildTextures();
      buildGrains();
      buildFinal();
      memoT = NaN;
    },

    draw(ctx, t, env) {
      if (t < SIM_T0 - 0.05) {
        ctx.fillStyle = '#07081a'; ctx.fillRect(0, 0, W, H);
        return;
      }
      const fr = frame(t);
      drawSky(ctx, fr, t);
      // painter's list
      const ev = [];
      for (let i = 0; i < fr.rows.length; i++) ev.push({ z: fr.rows[i].z, type: 0, i });
      if (fr.c.pitch < 75) crestEvents(fr, ev);
      if (caravanAlpha(t) > 0.01) {
        let zmin = 1e9;
        for (const m of MEMBERS) { memberWorld(m, t, mw); zmin = Math.min(zmin, mw[2]); }
        ev.push({ z: zmin - 2, type: 2 });
      }
      ev.sort((a, b) => b.z - a.z || a.type - b.type);
      for (const e of ev) {
        if (e.type === 0) drawRow(ctx, fr, e.i);
        else if (e.type === 1) drawCrest(ctx, fr, e);
        else drawCaravan(ctx, fr, t);
      }
      // top-down sand and the grid of the camp-to-be
      const topA = fx.smooth((fr.c.pitch - 62) / 26);
      if (topA > 0.005) {
        const M = drawTopSand(ctx, fr, t, topA);
        drawGrid(ctx, M, 0.22 * fx.smooth(fx.range(t, 11.2, 13.2)));
      }
      // fade up from the dark, as a widening breath around the grain
      const rev = fx.ease.inOut(fx.range(t, SIM_T0, 5.2));
      if (rev < 1) {
        const r1 = 60 + rev * 1900;
        const g = ctx.createRadialGradient(ORIGIN[0], ORIGIN[1], r1 * 0.15, ORIGIN[0], ORIGIN[1], r1);
        g.addColorStop(0, `rgba(7,8,26,${(1 - rev) * 0.55})`);
        g.addColorStop(1, `rgba(7,8,26,${Math.min(1, (1 - rev) * 1.6)})`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }
    },

    grains(t, out, env) { grainsAt(t, out); },

    tint: (t) => (t < 5 ? [255, 214, 150] : [255, 222, 168]),
  };
})();
