/* Scene 2 — Building the sukkah: a Jerusalem stone rooftop courtyard at golden-hour
 * dusk. A magical time-lapse: the frame rises, the cloth walls unroll, the schach is
 * laid, and a warm lantern glows inside. Pure function of t; all randomness is seeded
 * in init. */
(function () {
  const S = (window.SUKKOT = window.SUKKOT || { scenes: {} });
  const W = 1920, H = 1080, DUR = 18;
  const PI = Math.PI;

  // ---------- helpers ----------
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, u) => a + (b - a) * u;
  const sm = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
  const eOutCubic = (u) => 1 - Math.pow(1 - u, 3);
  const eInOutCubic = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  const eInOutSine = (u) => -(Math.cos(PI * u) - 1) / 2;
  const eOutBack = (u, s) => { const c3 = s + 1; return 1 + c3 * Math.pow(u - 1, 3) + s * Math.pow(u - 1, 2); };
  const prog = (t, s, d) => clamp((t - s) / d, 0, 1);
  const mix = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
  const rgb = (c, a) => (a === undefined
    ? 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')'
    : 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a.toFixed(3) + ')');
  const scl = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
  function keyed(keys, u) {
    if (u <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) {
      if (u <= keys[i + 1][0]) {
        const v = (u - keys[i][0]) / (keys[i + 1][0] - keys[i][0]);
        return mix(keys[i][1], keys[i + 1][1], eInOutSine(v));
      }
    }
    return keys[keys.length - 1][1];
  }
  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  // ---------- palette keys (u = t/DUR) ----------
  const SKY_TOP = [[0, [64, 70, 122]], [0.5, [40, 38, 92]], [1, [13, 15, 42]]];
  const SKY_MID = [[0, [228, 158, 112]], [0.5, [200, 108, 112]], [1, [74, 48, 94]]];
  const SKY_HOR = [[0, [255, 208, 134]], [0.5, [250, 162, 112]], [1, [196, 104, 92]]];
  const CLOUD = [[0, [255, 206, 160]], [0.5, [244, 146, 134]], [1, [112, 72, 112]]];
  const GRADE = [[0, [255, 249, 240]], [0.5, [226, 210, 218]], [1, [150, 138, 184]]];

  // ---------- geometry ----------
  const SK = { hw: 1.5, hd: 1.2, h: 2.3 };
  const SUN_AZ = [-0.55, 0.835];
  const BG_W = 2600, BG_HZ = 300;

  const POSTS = [
    [-1.5, 1.2], [1.5, 1.2], [-1.5, -1.2], [1.5, -1.2], [-1.5, 0], [1.5, 0],
  ].map((p, i) => ({ x: p[0], z: p[1], s: 0.25 + i * 0.55, d: 1.25 }));
  const BEAMS = [
    { a: [-1.62, 1.2], b: [1.62, 1.2] },
    { a: [-1.5, -1.32], b: [-1.5, 1.32] },
    { a: [1.5, -1.32], b: [1.5, 1.32] },
    { a: [-1.62, -1.2], b: [1.62, -1.2] },
    { a: [-1.5, 0], b: [1.5, 0] },
  ].map((b, i) => Object.assign(b, { s: 3.5 + i * 0.5, d: 1.0 }));
  const WALLS = [
    { ax: -1.46, az: 1.16, bx: 1.46, bz: 1.16, nx: 0, nz: 1, s: 6.3, ph: 0.3 },
    { ax: -1.46, az: -1.16, bx: -1.46, bz: 1.16, nx: -1, nz: 0, s: 7.1, ph: 1.7 },
    { ax: 1.46, az: -1.16, bx: 1.46, bz: 1.16, nx: 1, nz: 0, s: 7.9, ph: 2.9 },
    { ax: -1.46, az: -1.16, bx: -0.82, bz: -1.16, nx: 0, nz: -1, s: 8.8, ph: 4.1 },
    { ax: 0.82, az: -1.16, bx: 1.46, bz: -1.16, nx: 0, nz: -1, s: 9.0, ph: 5.2 },
  ];
  const WALL_D = 2.2;
  const POLES = [];
  for (let i = 0; i < 7; i++) POLES.push({ x: -1.29 + i * 0.43, s: 10.1 + i * 0.3, d: 1.1, tilt: (i % 2 ? 1 : -1) });

  let L = null; // cached layers & data

  // ---------- camera ----------
  function camera(t) {
    const u = eInOutSine(clamp(t / DUR, 0, 1));
    const yaw = lerp(0.44, 0.17, u);
    const dist = lerp(10.6, 7.7, u);
    const h = lerp(3.9, 3.45, u);
    const ty = 1.3;
    const pitch = Math.atan2(h - ty, dist);
    return {
      px: Math.sin(yaw) * dist, py: h, pz: -Math.cos(yaw) * dist,
      cyw: Math.cos(yaw), syw: Math.sin(yaw), cp: Math.cos(pitch), sp: Math.sin(pitch),
      f: 1250, cx: 960, cy: 600, yaw: yaw,
    };
  }
  function P(c, x, y, z) {
    const dx = x - c.px, dy = y - c.py, dz = z - c.pz;
    const rx = dx * c.cyw + dz * c.syw;
    const rz = -dx * c.syw + dz * c.cyw;
    const ry = dy * c.cp + rz * c.sp;
    let zz = rz * c.cp - dy * c.sp;
    if (zz < 0.08) zz = 0.08;
    const k = c.f / zz;
    return [c.cx + rx * k, c.cy - ry * k, zz, k];
  }
  function PD(c, x, y, z) { // direction at infinity
    const rx = x * c.cyw + z * c.syw;
    const rz = -x * c.syw + z * c.cyw;
    const ry = y * c.cp + rz * c.sp;
    const zz = rz * c.cp - y * c.sp;
    return [c.cx + rx * c.f / zz, c.cy - ry * c.f / zz];
  }
  function poly(ctx, pts) {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
  }

  // ---------- init builders ----------
  function noise1(rng, n) {
    const ph = [], fr = [], am = [];
    for (let i = 0; i < n; i++) { ph.push(rng() * 7); fr.push(0.002 * Math.pow(2.1, i) * (0.8 + rng() * 0.4)); am.push(1 / Math.pow(1.9, i)); }
    return (x) => { let s = 0; for (let i = 0; i < n; i++) s += Math.sin(x * fr[i] + ph[i]) * am[i]; return s; };
  }

  function buildHills(rng) {
    const c = mk(BG_W, 460), g = c.getContext('2d');
    const n1 = noise1(rng, 5), n2 = noise1(rng, 5);
    const ridge = (fn, base, amp, col, col2) => {
      const gr = g.createLinearGradient(0, base - amp * 2, 0, 460);
      gr.addColorStop(0, col); gr.addColorStop(1, col2);
      g.fillStyle = gr; g.beginPath(); g.moveTo(0, 460);
      for (let x = 0; x <= BG_W; x += 8) g.lineTo(x, base - amp * (0.6 + 0.4 * fn(x)));
      g.lineTo(BG_W, 460); g.closePath(); g.fill();
    };
    ridge(n1, BG_HZ - 30, 70, 'rgb(186,138,150)', 'rgb(214,160,150)');
    ridge(n2, BG_HZ + 10, 55, 'rgb(196,142,128)', 'rgb(222,168,140)');
    // tiny distant roofs on the near ridge
    g.fillStyle = 'rgba(170,118,112,0.8)';
    for (let i = 0; i < 90; i++) {
      const x = rng() * BG_W, y = BG_HZ + 10 - 55 * (0.6 + 0.4 * n2(x));
      const w = 4 + rng() * 10, h = 3 + rng() * 7;
      g.fillRect(x, y - h + 3, w, h);
    }
    return c;
  }

  function archPath(g, x, y, w, h) { // arched window, (x,y)=bottom-left
    const r = w / 2;
    g.moveTo(x, y); g.lineTo(x, y - h + r); g.arc(x + r, y - h + r, r, PI, 0); g.lineTo(x + w, y); g.closePath();
  }

  function buildCity(rng) {
    const CH = 820;
    const c = mk(BG_W, CH), g = c.getContext('2d');
    const lc = mk(BG_W, CH), gl = lc.getContext('2d');
    const bases = [BG_HZ + 14, BG_HZ + 90, BG_HZ + 190, BG_HZ + 310, BG_HZ + 450];
    const scs = [0.55, 0.75, 1.0, 1.3, 1.65];
    for (let r = 0; r < bases.length; r++) {
      const sc = scs[r], base = bases[r];
      let x = -30 - rng() * 60;
      while (x < BG_W + 20) {
        const w = (46 + rng() * 96) * sc;
        const h = (r === 0 ? 40 + rng() * 120 : 34 + rng() * 90) * sc;
        const top = base - h;
        const tone = 0.9 + rng() * 0.14;
        const lit = scl([246, 214, 164], tone), mid = scl([222, 184, 140], tone), shd = scl([184, 146, 118], tone);
        const gr = g.createLinearGradient(x, 0, x + w, 0);
        gr.addColorStop(0, rgb(lit)); gr.addColorStop(0.25, rgb(mid)); gr.addColorStop(1, rgb(shd));
        g.fillStyle = gr; g.fillRect(x, top, w, CH - top);
        // roof top plane (seen from above for buildings below eye level)
        if (top > BG_HZ + 4) {
          const rd = 2 + (top - BG_HZ) * 0.07;
          g.fillStyle = rgb(scl([250, 226, 186], tone));
          g.beginPath(); g.moveTo(x, top); g.lineTo(x + w, top); g.lineTo(x + w - rd * 0.6, top - rd); g.lineTo(x + rd * 0.3, top - rd); g.closePath(); g.fill();
          if (rng() < 0.4) { // solar water heater
            const sx = x + w * (0.2 + rng() * 0.5), s2 = sc * 7;
            g.fillStyle = 'rgba(70,72,92,0.9)'; g.fillRect(sx, top - rd - s2 * 0.9, s2 * 1.6, s2 * 0.9);
            g.fillStyle = 'rgb(236,226,210)'; g.fillRect(sx + s2 * 0.2, top - rd - s2 * 1.6, s2 * 1.2, s2 * 0.6);
          }
        }
        // top ledge
        g.fillStyle = rgb(scl([255, 232, 190], tone)); g.fillRect(x, top, w, Math.max(1, 2 * sc));
        g.fillStyle = 'rgba(120,80,60,0.35)'; g.fillRect(x, top + 2 * sc, w, Math.max(1, 1.5 * sc));
        // arched windows
        const ww = 8 * sc, wh = 15 * sc, sx = 22 * sc, sy = 30 * sc;
        const cols = Math.max(1, Math.floor((w - 12 * sc) / sx));
        const ox = x + (w - (cols - 1) * sx - ww) / 2;
        for (let wy = top + 12 * sc + wh; wy < base + 60 * sc; wy += sy) {
          for (let ci = 0; ci < cols; ci++) {
            if (rng() < 0.18) continue;
            const wx = ox + ci * sx;
            g.fillStyle = 'rgb(92,64,52)'; g.beginPath(); archPath(g, wx, wy, ww, wh); g.fill();
            g.fillStyle = 'rgba(255,236,200,0.5)'; g.fillRect(wx - 1, wy, ww + 2, Math.max(1, sc * 1.5));
            if (rng() < 0.28) { gl.fillStyle = rng() < 0.5 ? 'rgb(255,196,110)' : 'rgb(255,170,90)'; gl.beginPath(); archPath(gl, wx, wy, ww, wh); gl.fill(); }
          }
        }
        // dome
        if (r <= 2 && rng() < 0.16) {
          const dw = w * (0.35 + rng() * 0.2), dx = x + w / 2, dy = top;
          g.fillStyle = rgb(scl([226, 192, 150], tone)); g.fillRect(dx - dw * 0.55, dy - dw * 0.28, dw * 1.1, dw * 0.28);
          const dg = g.createLinearGradient(dx - dw / 2, 0, dx + dw / 2, 0);
          const lead = rng() < 0.5;
          dg.addColorStop(0, lead ? 'rgb(200,196,204)' : 'rgb(250,222,176)');
          dg.addColorStop(1, lead ? 'rgb(120,116,134)' : 'rgb(190,150,120)');
          g.fillStyle = dg; g.beginPath(); g.ellipse(dx, dy - dw * 0.28, dw / 2, dw * 0.5, 0, PI, 0); g.fill();
        }
        // cypress
        if (rng() < 0.3) {
          const cx = x + w * rng(), ch = (60 + rng() * 80) * sc, cw = (9 + rng() * 6) * sc;
          const cb = base + 10 * sc;
          g.fillStyle = 'rgb(46,58,36)';
          g.beginPath(); g.moveTo(cx, cb - ch);
          g.quadraticCurveTo(cx + cw * 0.9, cb - ch * 0.55, cx + cw * 0.45, cb);
          g.lineTo(cx - cw * 0.45, cb);
          g.quadraticCurveTo(cx - cw * 0.9, cb - ch * 0.55, cx, cb - ch); g.fill();
          g.strokeStyle = 'rgba(160,150,80,0.5)'; g.lineWidth = Math.max(1, sc);
          g.beginPath(); g.moveTo(cx, cb - ch); g.quadraticCurveTo(cx - cw * 0.9, cb - ch * 0.55, cx - cw * 0.45, cb); g.stroke();
        }
        x += w * (0.72 + rng() * 0.32);
      }
      // atmospheric haze accumulates on farther rows
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = 'rgba(236,184,150,' + (r < bases.length - 1 ? 0.24 : 0.1) + ')';
      g.fillRect(0, 0, BG_W, CH);
      g.globalCompositeOperation = 'source-over';
    }
    return { city: c, lights: lc };
  }

  function buildOlive(rng) {
    const c = mk(260, 380), g = c.getContext('2d');
    // pot
    const pg = g.createLinearGradient(80, 0, 180, 0);
    pg.addColorStop(0, 'rgb(214,132,86)'); pg.addColorStop(0.5, 'rgb(170,92,58)'); pg.addColorStop(1, 'rgb(96,50,36)');
    g.fillStyle = pg; g.beginPath(); g.moveTo(78, 280); g.lineTo(182, 280); g.lineTo(168, 378); g.lineTo(92, 378); g.closePath(); g.fill();
    g.fillStyle = 'rgb(200,120,78)'; g.fillRect(72, 270, 116, 14);
    // trunk
    g.strokeStyle = 'rgb(84,66,52)'; g.lineWidth = 9; g.lineCap = 'round';
    g.beginPath(); g.moveTo(130, 272); g.bezierCurveTo(122, 220, 142, 190, 128, 140); g.stroke();
    g.lineWidth = 5; g.beginPath(); g.moveTo(131, 200); g.quadraticCurveTo(160, 170, 170, 130); g.stroke();
    // foliage
    for (let i = 0; i < 260; i++) {
      const a = rng() * PI * 2, rr = Math.sqrt(rng());
      const x = 130 + Math.cos(a) * rr * 105, y = 110 + Math.sin(a) * rr * 80;
      const sh = (x - 130) / 105;
      const base = sh < -0.3 && y < 120 ? [150, 160, 110] : [70 + rng() * 30, 86 + rng() * 26, 50];
      g.fillStyle = rgb(scl(base, 0.85 + rng() * 0.2), 0.9);
      g.beginPath(); g.ellipse(x, y, 8 + rng() * 6, 3 + rng() * 2, rng() * PI, 0, PI * 2); g.fill();
    }
    return c;
  }

  function buildFronds(rng) {
    const out = [];
    const n = 12;
    for (let i = 0; i < n; i++) {
      const palm = i % 3 !== 2;
      const len = palm ? 3.3 + rng() * 0.5 : 2.4 + rng() * 0.5;
      const segs = [];
      const dirSign = rng() < 0.5 ? 1 : -1;
      const x0 = -len / 2, x1 = len / 2;
      const rib = [];
      for (let k = 0; k <= 10; k++) { const s = k / 10; rib.push([lerp(x0, x1, s) * dirSign, 0.05 * Math.sin(PI * s), 0.04 * Math.sin(PI * s * 1.3 + i)]); }
      if (palm) {
        for (let k = 0; k < 22; k++) {
          const s = 0.08 + 0.92 * (k / 21);
          const bx = lerp(x0, x1, s) * dirSign, by = 0.05 * Math.sin(PI * s), bz = 0.04 * Math.sin(PI * s * 1.3 + i);
          const ll = 0.46 * Math.pow(Math.sin(PI * (0.12 + 0.88 * s)), 0.7) * (1 - 0.35 * s) + 0.05;
          for (const side of [-1, 1]) {
            const ang = 0.75 + rng() * 0.2;
            segs.push([bx, by, bz, bx + Math.cos(ang) * ll * dirSign, by - 0.05, bz + side * Math.sin(ang) * ll]);
          }
        }
      } else {
        for (let k = 0; k < 46; k++) {
          const s = rng();
          const bx = lerp(x0, x1, s) * dirSign, bz = (rng() - 0.5) * 0.5 * Math.sin(PI * s) ;
          const a = rng() * PI * 2, ll = 0.08 + rng() * 0.06;
          segs.push([bx, 0.04, bz, bx + Math.cos(a) * ll, 0.02, bz + Math.sin(a) * ll]);
        }
      }
      out.push({
        palm, rib, segs,
        z: -1.02 + i * (2.04 / (n - 1)) + (rng() - 0.5) * 0.08,
        x: (rng() - 0.5) * 0.3,
        rot: (rng() - 0.5) * 0.22,
        y: SK.h + 0.1 + i * 0.006,
        s: 11.4 + i * 0.36, d: 1.7,
        ph: rng() * 6,
        col: palm ? [92 + rng() * 20, 112 + rng() * 16, 50] : [110, 140, 60],
      });
    }
    return out;
  }

  // ---------- drawing pieces ----------
  function woodLine(ctx, a, b, w, alpha) {
    ctx.globalAlpha = alpha;
    ctx.lineCap = 'butt';
    ctx.strokeStyle = 'rgb(104,68,42)'; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    const o = w * 0.16;
    ctx.strokeStyle = 'rgb(168,116,68)'; ctx.lineWidth = w * 0.55;
    ctx.beginPath(); ctx.moveTo(a[0] - o, a[1] - o); ctx.lineTo(b[0] - o, b[1] - o); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,206,140,0.75)'; ctx.lineWidth = Math.max(1, w * 0.13);
    const o2 = w * 0.36;
    ctx.beginPath(); ctx.moveTo(a[0] - o2, a[1] - o2); ctx.lineTo(b[0] - o2, b[1] - o2); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function postTop(p, t) {
    const pr = prog(t, p.s, p.d);
    const phi = (PI / 2) * (1 - eOutBack(pr, 1.25));
    let ox = p.x, oz = p.z; const ol = Math.hypot(ox, oz); ox /= ol; oz /= ol;
    return [p.x + SK.h * Math.sin(phi) * ox, 0.06 + (SK.h - 0.06) * Math.cos(phi), p.z + SK.h * Math.sin(phi) * oz];
  }

  function drawWall(ctx, c, t, w, sunH) {
    const p = prog(t, w.s, WALL_D);
    if (t < w.s - 0.5) return;
    const appear = sm(w.s - 0.5, w.s, t);
    const e = eInOutCubic(p);
    const Hs = SK.h;
    const yb = lerp(Hs - 0.1, 0.03, e);
    const N = 8;
    const swing = (0.1 * (1 - e) * sm(0, 0.1, p)) * Math.sin(t * 4.3 + w.ph);
    const TP = [], BP = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const x = lerp(w.ax, w.bx, u), z = lerp(w.az, w.bz, u);
      const bil = Math.sin(PI * u) * (0.035 + 0.025 * Math.sin(t * 1.25 + w.ph + u * 3)) * e + swing;
      TP.push(P(c, x, Hs - 0.02, z));
      BP.push(P(c, x + w.nx * bil, yb, z + w.nz * bil));
    }
    const mc = P(c, (w.ax + w.bx) / 2, (Hs + yb) / 2, (w.az + w.bz) / 2);
    const k = mc[3];
    // lighting
    const cmx = (w.ax + w.bx) / 2, cmz = (w.az + w.bz) / 2;
    const extVis = w.nx * (c.px - cmx) + w.nz * (c.pz - cmz) > 0;
    const sunlit = w.nx * sunH[0] + w.nz * sunH[1] > 0;
    const shade = extVis ? (sunlit ? 1.0 : 0.7) : (sunlit ? 0.9 : 0.64);
    const base = mix([246, 238, 222], [255, 212, 162], sunlit ? 0.35 : 0.12);
    ctx.globalAlpha = appear;
    if (p > 0) {
      const tm = P(c, cmx, Hs, cmz), bm = P(c, cmx, yb, cmz);
      const gr = ctx.createLinearGradient(tm[0], tm[1], bm[0], bm[1]);
      gr.addColorStop(0, rgb(scl(base, shade * 1.02)));
      gr.addColorStop(1, rgb(scl(base, shade * (sunlit && !extVis ? 0.92 : 0.8))));
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.moveTo(TP[0][0], TP[0][1]);
      for (let i = 1; i <= N; i++) ctx.lineTo(TP[i][0], TP[i][1]);
      for (let i = N; i >= 0; i--) ctx.lineTo(BP[i][0], BP[i][1]);
      ctx.closePath(); ctx.fill();
      // subtle vertical stripes
      const NS = Math.round(Math.hypot(w.bx - w.ax, w.bz - w.az) / 0.2);
      ctx.strokeStyle = 'rgba(150,118,92,0.22)'; ctx.lineWidth = Math.max(1, 0.045 * k);
      ctx.beginPath();
      for (let s = 0; s < NS; s++) {
        const u = (s + 0.5) / NS * N, i0 = Math.min(N - 1, Math.floor(u)), fr = u - i0;
        ctx.moveTo(lerp(TP[i0][0], TP[i0 + 1][0], fr), lerp(TP[i0][1], TP[i0 + 1][1], fr));
        ctx.lineTo(lerp(BP[i0][0], BP[i0 + 1][0], fr), lerp(BP[i0][1], BP[i0 + 1][1], fr));
      }
      ctx.stroke();
      // decorative band near the top (indigo + gold)
      const bandVis = sm(Hs - 0.2, Hs - 0.45, yb);
      if (bandVis > 0) {
        const b1a = P(c, w.ax, Hs - 0.2, w.az), b1b = P(c, w.bx, Hs - 0.2, w.bz);
        const b2a = P(c, w.ax, Hs - 0.28, w.az), b2b = P(c, w.bx, Hs - 0.28, w.bz);
        ctx.globalAlpha = appear * bandVis;
        ctx.lineWidth = Math.max(1, 0.05 * k); ctx.strokeStyle = rgb(scl([52, 62, 118], shade * 1.1), 0.75);
        ctx.beginPath(); ctx.moveTo(b1a[0], b1a[1]); ctx.lineTo(b1b[0], b1b[1]); ctx.stroke();
        ctx.lineWidth = Math.max(1, 0.025 * k); ctx.strokeStyle = rgb(scl([214, 160, 70], shade * 1.1), 0.85);
        ctx.beginPath(); ctx.moveTo(b2a[0], b2a[1]); ctx.lineTo(b2b[0], b2b[1]); ctx.stroke();
        ctx.globalAlpha = appear;
      }
    }
    // the roll of cloth travelling down
    const rad = 0.025 + 0.075 * (1 - e);
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgb(scl(base, shade * 0.82)); ctx.lineWidth = Math.max(1.5, rad * 2 * k);
    ctx.beginPath(); ctx.moveTo(BP[0][0], BP[0][1]);
    for (let i = 1; i <= N; i++) ctx.lineTo(BP[i][0], BP[i][1]);
    ctx.stroke();
    if (p < 1) {
      ctx.strokeStyle = rgb(scl(base, Math.min(1.1, shade * 1.12))); ctx.lineWidth = Math.max(1, rad * 0.8 * k);
      ctx.beginPath(); ctx.moveTo(BP[0][0], BP[0][1] - rad * 0.4 * k);
      for (let i = 1; i <= N; i++) ctx.lineTo(BP[i][0], BP[i][1] - rad * 0.4 * k);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawFrond(ctx, c, fd, t) {
    const pr = prog(t, fd.s, fd.d);
    if (t < fd.s - 0.2) return;
    const e = eOutCubic(pr);
    const settle = pr >= 1 ? 0 : 1 - e;
    const y = fd.y + 2.6 * settle + 0.03 * Math.sin(pr * PI * 3) * (1 - pr);
    const sway = 0.45 * settle * Math.sin(t * 2.4 + fd.ph);
    const rot = fd.rot + 0.7 * settle * Math.sin(t * 1.6 + fd.ph);
    const cr = Math.cos(rot), sr = Math.sin(rot);
    const cx = fd.x + sway * 0.4, cz = fd.z + sway;
    const tilt = 0.25 * settle * Math.sin(t * 3.1 + fd.ph);
    const tf = (px, py, pz) => P(c, cx + px * cr - pz * sr, y + py + px * tilt, cz + px * sr + pz * cr);
    const k = tf(0, 0, 0)[3];
    const alpha = sm(fd.s - 0.2, fd.s + 0.15, t);
    ctx.globalAlpha = alpha;
    ctx.lineCap = 'round';
    const segPts = fd.segs.map((s) => [tf(s[0], s[1], s[2]), tf(s[3], s[4], s[5])]);
    const ribPts = fd.rib.map((r) => tf(r[0], r[1], r[2]));
    const stroke = (col, lw, ox, oy) => {
      ctx.strokeStyle = col; ctx.lineWidth = lw;
      ctx.beginPath();
      for (const sg of segPts) { ctx.moveTo(sg[0][0] + ox, sg[0][1] + oy); ctx.lineTo(sg[1][0] + ox, sg[1][1] + oy); }
      ctx.stroke();
    };
    const lw = fd.palm ? 0.035 * k : 0.07 * k;
    stroke(rgb(scl(fd.col, 0.55)), Math.max(1, lw * 1.25), 0, 0.6);
    stroke(rgb(fd.col), Math.max(1, lw), 0, 0);
    stroke('rgba(226,214,130,0.55)', Math.max(0.8, lw * 0.35), -lw * 0.25, -lw * 0.3);
    ctx.strokeStyle = rgb(scl(fd.col, 1.2)); ctx.lineWidth = Math.max(1, 0.03 * k);
    ctx.beginPath(); ctx.moveTo(ribPts[0][0], ribPts[0][1]);
    for (let i = 1; i < ribPts.length; i++) ctx.lineTo(ribPts[i][0], ribPts[i][1]);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawPole(ctx, c, pl, t) {
    if (t < pl.s - 0.2) return;
    const pr = prog(t, pl.s, pl.d);
    const e = eOutBack(pr, 1.1);
    const lift = 2.2 * (1 - e);
    const tl = 0.35 * (1 - eOutCubic(pr)) * pl.tilt;
    const y = SK.h + 0.06;
    const a = P(c, pl.x, y + lift + tl, -1.42), b = P(c, pl.x, y + lift - tl, 1.42);
    const k = (a[3] + b[3]) / 2;
    ctx.globalAlpha = sm(pl.s - 0.2, pl.s + 0.1, t);
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgb(128,110,54)'; ctx.lineWidth = Math.max(1.5, 0.07 * k);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    ctx.strokeStyle = 'rgb(206,184,104)'; ctx.lineWidth = Math.max(1, 0.035 * k);
    ctx.beginPath(); ctx.moveTo(a[0] - 0.01 * k, a[1] - 0.015 * k); ctx.lineTo(b[0] - 0.01 * k, b[1] - 0.015 * k); ctx.stroke();
    ctx.setLineDash([Math.max(1, 0.03 * k), 0.4 * k]);
    ctx.strokeStyle = 'rgba(80,64,30,0.8)'; ctx.lineWidth = Math.max(1.5, 0.075 * k); ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  // ---------- scene ----------
  S.scenes[2] = {
    duration: DUR,
    init(env) {
      const rng = mulberry32(0x5c2a11);
      const hills = buildHills(rng);
      const cc = buildCity(rng);
      const olive = buildOlive(rng);
      const fronds = buildFronds(rng);
      // grain
      const grain = [];
      for (let i = 0; i < 3; i++) {
        const g = mk(256, 256), gx = g.getContext('2d');
        const id = gx.createImageData(256, 256);
        for (let j = 0; j < id.data.length; j += 4) {
          const v = rng() < 0.5 ? 0 : 255;
          id.data[j] = id.data[j + 1] = id.data[j + 2] = v; id.data[j + 3] = (rng() * 22) | 0;
        }
        gx.putImageData(id, 0, 0); grain.push(g);
      }
      // vignette + caption darkening
      const vg = mk(W, H), vx = vg.getContext('2d');
      const rg = vx.createRadialGradient(W / 2, H * 0.45, H * 0.35, W / 2, H * 0.5, H * 1.05);
      rg.addColorStop(0, 'rgba(8,5,18,0)'); rg.addColorStop(1, 'rgba(8,5,18,0.72)');
      vx.fillStyle = rg; vx.fillRect(0, 0, W, H);
      const lg = vx.createLinearGradient(0, H * 0.7, 0, H);
      lg.addColorStop(0, 'rgba(10,6,16,0)'); lg.addColorStop(0.45, 'rgba(10,6,16,0.38)'); lg.addColorStop(1, 'rgba(10,6,16,0.66)');
      vx.fillStyle = lg; vx.fillRect(0, H * 0.7, W, H * 0.3);
      // sky bits
      const clouds = [];
      for (let i = 0; i < 7; i++) {
        const puffs = [];
        const len = 180 + rng() * 380;
        for (let j = 0; j < 6; j++) puffs.push([(rng() - 0.5) * len, (rng() - 0.5) * 10, len * (0.18 + rng() * 0.22), 6 + rng() * 12]);
        clouds.push({ x: 100 + rng() * (BG_W - 200), y: -90 - rng() * 230, puffs, v: 3 + rng() * 5 });
      }
      const stars = [];
      for (let i = 0; i < 70; i++) stars.push({ x: rng() * BG_W, y: rng() * 300, r: 0.6 + rng() * 1.3, ph: rng() * 6, w: 1 + rng() * 3 });
      const motes = [];
      for (let i = 0; i < 80; i++) motes.push({ x: rng() * W, y: 220 + rng() * 600, vx: 6 + rng() * 14, vy: 2 + rng() * 6, w: 0.3 + rng() * 0.6, ph: rng() * 6, r: 0.8 + rng() * 2.2, tw: 1 + rng() * 3 });
      const flocks = [
        { t0: -1, t1: 10, x0: -150, x1: 2100, y0: 200, y1: 150, n: 6, sz: 9 },
        { t0: 6.5, t1: 17.5, x0: 2150, x1: -150, y0: 120, y1: 190, n: 5, sz: 7 },
        { t0: 12, t1: 21, x0: -150, x1: 2100, y0: 250, y1: 210, n: 3, sz: 6 },
      ].map((f) => {
        f.b = []; for (let i = 0; i < f.n; i++) { const row = Math.ceil(i / 2), side = i % 2 ? 1 : -1; f.b.push([-row * 26 * (f.x1 > f.x0 ? 1 : -1) + rng() * 8, side * row * 14 + rng() * 6, rng() * 6]); }
        return f;
      });
      const dust = [];
      for (let i = 0; i < 12; i++) dust.push([rng() * PI * 2, 0.3 + rng() * 0.7, rng()]);
      // pre-rendered gradient sprites (gradient fills are costly per frame)
      const radial = (stops) => {
        const s = mk(256, 256), sx = s.getContext('2d');
        const gg = sx.createRadialGradient(128, 128, 0, 128, 128, 128);
        for (const st of stops) gg.addColorStop(st[0], st[1]);
        sx.fillStyle = gg; sx.fillRect(0, 0, 256, 256); return s;
      };
      const soft = (r, g, b) => radial([[0, `rgba(${r},${g},${b},1)`], [0.2, `rgba(${r},${g},${b},0.62)`], [0.45, `rgba(${r},${g},${b},0.25)`], [0.7, `rgba(${r},${g},${b},0.07)`], [1, `rgba(${r},${g},${b},0)`]]);
      const sprGold = soft(255, 214, 150), sprRose = soft(246, 136, 110), sprAmber = soft(255, 160, 80);
      const sprHot = radial([[0, 'rgba(255,250,230,1)'], [0.25, 'rgba(255,226,160,0.7)'], [0.6, 'rgba(255,180,100,0.15)'], [1, 'rgba(255,160,80,0)']]);
      const strip = (stops) => {
        const s = mk(4, 256), sx = s.getContext('2d');
        const gg = sx.createLinearGradient(0, 0, 0, 256);
        for (const st of stops) gg.addColorStop(st[0], st[1]);
        sx.fillStyle = gg; sx.fillRect(0, 0, 4, 256); return s;
      };
      const stripHaze = strip([[0, 'rgba(240,172,132,0)'], [0.3, 'rgba(240,172,132,0.3)'], [1, 'rgba(200,140,130,0.12)']]);
      const stripNight = strip([[0, 'rgba(26,20,56,0)'], [0.3, 'rgba(26,20,56,0.7)'], [0.55, 'rgba(26,20,56,1)'], [1, 'rgba(26,20,56,1)']]);
      const stripFloor = strip([[0, 'rgba(150,100,80,0)'], [0.35, 'rgba(150,104,80,0.45)'], [1, 'rgba(78,54,50,0.96)']]);
      // sky: one column per moment of the scene
      const SKN = 72, sky = mk(SKN * 4, 1200), skx = sky.getContext('2d');
      for (let i = 0; i < SKN; i++) {
        const uu = i / (SKN - 1);
        const gg = skx.createLinearGradient(0, 0, 0, 600);
        gg.addColorStop(0, rgb(keyed(SKY_TOP, uu))); gg.addColorStop(0.62, rgb(keyed(SKY_MID, uu))); gg.addColorStop(1, rgb(keyed(SKY_HOR, uu)));
        skx.fillStyle = gg; skx.fillRect(i * 4, 0, 4, 1200);
      }
      // sun-ray fan
      const rays = mk(1024, 1024), rx = rays.getContext('2d');
      const rgR = rx.createRadialGradient(512, 512, 10, 512, 512, 512);
      rgR.addColorStop(0, 'rgba(255,220,160,1)'); rgR.addColorStop(0.4, 'rgba(255,200,140,0.45)'); rgR.addColorStop(1, 'rgba(255,190,120,0)');
      rx.fillStyle = rgR; rx.beginPath();
      for (let i = 0; i < 11; i++) {
        const a = -0.35 + i * 0.17 + (rng() - 0.5) * 0.06, hw = 0.012 + rng() * 0.022;
        rx.moveTo(512, 512);
        rx.lineTo(512 + Math.cos(a - hw) * 520, 512 + Math.sin(a - hw) * 520);
        rx.lineTo(512 + Math.cos(a + hw) * 520, 512 + Math.sin(a + hw) * 520);
        rx.closePath();
      }
      rx.fill();
      L = { hills, city: cc.city, lights: cc.lights, olive, fronds, grain, vg, clouds, stars, motes, flocks, dust,
        sprGold, sprRose, sprAmber, sprHot, stripHaze, stripNight, stripFloor, sky, SKN, rays };
      // parallax anchor: screen x of the +z direction at mid-orbit
      const cm = camera(DUR / 2);
      L.anchor = PD(cm, 0, 0, 1)[0];
    },

    draw(ctx, t, env) {
      if (!L) this.init(env);
      const u = clamp(t / DUR, 0, 1);
      const c = camera(t);
      const HZOFF = 125; // the distant city sits a little lower than the true horizon (more sky)
      const hz = c.cy - c.f * c.sp / c.cp + HZOFF;
      const bgx = PD(c, 0, 0, 1)[0] - L.anchor - (BG_W - W) / 2;
      const bgy = hz - BG_HZ;
      const spr = (img, x, y, r, a, sy) => {
        if (a <= 0.002) return;
        ctx.globalAlpha = Math.min(1, a);
        ctx.drawImage(img, x - r, y - r * (sy || 1), 2 * r, 2 * r * (sy || 1));
      };

      // sun
      const el = lerp(0.135, -0.01, eInOutSine(u));
      const sunDir = [SUN_AZ[0] * Math.cos(el), Math.sin(el), SUN_AZ[1] * Math.cos(el)];
      const sp = PD(c, sunDir[0], sunDir[1], sunDir[2]); sp[1] += HZOFF;
      const sunStr = sm(0.035, 0.11, el);

      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;

      // ---- sky (pre-rendered columns, cross-blended) ----
      const sf = u * (L.SKN - 1), si = Math.min(L.SKN - 2, Math.floor(sf)), sfr = sf - si;
      ctx.fillStyle = rgb(keyed(SKY_TOP, u)); ctx.fillRect(0, 0, W, Math.max(0, hz - 598));
      ctx.drawImage(L.sky, si * 4 + 1, 0, 2, 1200, 0, hz - 600, W, 1200);
      if (sfr > 0.01) { ctx.globalAlpha = sfr; ctx.drawImage(L.sky, si * 4 + 5, 0, 2, 1200, 0, hz - 600, W, 1200); ctx.globalAlpha = 1; }

      // stars as dusk deepens
      const sa = sm(10, 17.5, t);
      if (sa > 0) {
        ctx.fillStyle = 'rgb(255,244,220)';
        for (const s of L.stars) {
          const y = s.y + bgy - 120; if (y > hz - 200) continue;
          ctx.globalAlpha = sa * (0.45 + 0.4 * Math.sin(t * s.w + s.ph)) * clamp((hz - 200 - y) / 160, 0, 1);
          ctx.fillRect(s.x + bgx, y, s.r * 1.5, s.r * 1.5);
        }
        ctx.globalAlpha = 1;
      }

      // sun halo & disc
      const haloA = 0.55 * (0.35 + 0.65 * sunStr);
      spr(L.sprGold, sp[0], sp[1], 560, haloA * (1 - u));
      spr(L.sprRose, sp[0], sp[1], 620, haloA * (0.3 + u));
      ctx.globalAlpha = 1;
      if (el > -0.03) {
        const dg = ctx.createRadialGradient(sp[0], sp[1], 0, sp[0], sp[1], 40);
        dg.addColorStop(0, 'rgb(255,250,226)'); dg.addColorStop(0.7, rgb(mix([255, 232, 170], [255, 170, 110], u)));
        dg.addColorStop(1, rgb(mix([255, 210, 140], [250, 140, 100], u), 0));
        ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(sp[0], sp[1], 40, 0, PI * 2); ctx.fill();
      }

      // clouds: thin lit streaks
      const cc = keyed(CLOUD, u);
      const cA = rgb(scl(cc, 0.86), 0.26), cB = rgb(cc, 0.3);
      for (const cl of L.clouds) {
        const x = cl.x + bgx + cl.v * t, y = cl.y + hz - 40;
        for (const p of cl.puffs) {
          ctx.fillStyle = cA;
          ctx.beginPath(); ctx.ellipse(x + p[0], y + p[1], p[2], p[3], 0, 0, PI * 2); ctx.fill();
          ctx.fillStyle = cB;
          ctx.beginPath(); ctx.ellipse(x + p[0] - p[2] * 0.1, y + p[1] + p[3] * 0.45, p[2] * 0.8, p[3] * 0.35, 0, 0, PI * 2); ctx.fill();
        }
      }

      // birds
      ctx.strokeStyle = 'rgba(46,32,48,0.85)'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const f of L.flocks) {
        const fp = (t - f.t0) / (f.t1 - f.t0); if (fp < 0 || fp > 1) continue;
        const fx = lerp(f.x0, f.x1, fp) + bgx * 0.5, fy = lerp(f.y0, f.y1, fp) + (hz - 330) + 10 * Math.sin(t * 0.9);
        ctx.lineWidth = f.sz * 0.28;
        ctx.beginPath();
        for (const b of f.b) {
          const x = fx + b[0], y = fy + b[1] + 3 * Math.sin(t * 1.3 + b[2]);
          const fl = Math.sin(t * 8.5 + b[2] * 3);
          const s = f.sz;
          ctx.moveTo(x - s, y - s * 0.55 * fl); ctx.quadraticCurveTo(x - s * 0.4, y - s * 0.3 * fl - 1, x, y);
          ctx.quadraticCurveTo(x + s * 0.4, y - s * 0.3 * fl - 1, x + s, y - s * 0.55 * fl);
        }
        ctx.stroke();
      }

      // ---- distant hills and the city ----
      ctx.drawImage(L.hills, bgx * 0.97, bgy);
      ctx.drawImage(L.city, bgx, bgy);
      const night = sm(4, 18, t);
      ctx.globalAlpha = 0.62 * night; ctx.drawImage(L.stripNight, 0, hz - 170, W, 700);
      ctx.globalAlpha = 1;
      const la = sm(6.5, 15, t);
      if (la > 0) {
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = la * 0.9;
        ctx.drawImage(L.lights, bgx, bgy);
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.globalAlpha = 1 - 0.5 * u; ctx.drawImage(L.stripHaze, 0, hz - 140, W, 560);
      ctx.globalAlpha = 1;

      // ---- rooftop courtyard ----
      const sunH = [SUN_AZ[0], SUN_AZ[1]];
      const shLen = Math.min(3.2, 1 / Math.tan(Math.max(el, 0.05))) * 0.8;
      const sdx = -SUN_AZ[0] * shLen, sdz = -SUN_AZ[1] * shLen;
      const shA = 0.42 * sm(0.0, 0.1, el) + 0.08;

      const FZ0 = -6.8, FZ1 = 6.2, FX0 = -6.6, FX1 = 7.5;
      const fl = [P(c, FX0, 0, FZ0), P(c, FX1, 0, FZ0), P(c, FX1, 0, FZ1), P(c, FX0, 0, FZ1)];
      const pb = P(c, 0, 0, FZ1);
      ctx.save(); poly(ctx, fl); ctx.clip();
      ctx.fillStyle = 'rgb(222,180,134)'; ctx.fillRect(0, pb[1] - 60, W, H - pb[1] + 60);
      ctx.drawImage(L.stripFloor, 0, pb[1] - 10, W, H - pb[1] + 10);
      // warm sheen toward the sun
      const shn = P(c, -2.5, 0, 4.5);
      spr(L.sprGold, shn[0], shn[1], 1000, 0.4 * sunStr, 0.45);
      ctx.globalAlpha = 1;
      // stone slabs (running bond)
      ctx.strokeStyle = 'rgba(110,72,52,0.3)'; ctx.lineWidth = 1.3;
      ctx.beginPath();
      let row = 0;
      for (let z = FZ0; z <= FZ1 + 0.01; z += 0.72, row++) {
        const a = P(c, FX0, 0, z), b = P(c, FX1, 0, z);
        ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
        if (z + 0.72 > FZ1 + 0.01) break;
        for (let x = FX0 + (row % 2) * 0.5; x < FX1; x += 1.0) {
          const q1 = P(c, x, 0, z), q2 = P(c, x, 0, z + 0.72);
          ctx.moveTo(q1[0], q1[1]); ctx.lineTo(q2[0], q2[1]);
        }
      }
      ctx.stroke();

      // shadows on the floor
      ctx.fillStyle = 'rgba(58,30,52,' + shA.toFixed(3) + ')';
      ctx.strokeStyle = 'rgba(58,30,52,' + (shA * 0.4).toFixed(3) + ')';
      const G = (x, z, h) => P(c, x + sdx * h, 0, z + sdz * h);
      // back parapet shadow
      ctx.beginPath();
      { const a = G(FX0, FZ1 - 0.35, 0), b = G(FX1, FZ1 - 0.35, 0), b2 = G(FX1, FZ1 - 0.35, 0.65), a2 = G(FX0, FZ1 - 0.35, 0.65);
        ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(b2[0], b2[1]); ctx.lineTo(a2[0], a2[1]); ctx.closePath(); }
      ctx.fill();
      // sukkah shadows
      ctx.beginPath();
      for (const p of POSTS) {
        const tp = postTop(p, t);
        const a = G(p.x, p.z, 0), b = G(tp[0], tp[2], tp[1]);
        const k = a[3];
        const nx = -(b[1] - a[1]), ny = b[0] - a[0], nl = Math.hypot(nx, ny) || 1, hw = 0.06 * k;
        ctx.moveTo(a[0] + nx / nl * hw, a[1] + ny / nl * hw); ctx.lineTo(b[0] + nx / nl * hw, b[1] + ny / nl * hw);
        ctx.lineTo(b[0] - nx / nl * hw, b[1] - ny / nl * hw); ctx.lineTo(a[0] - nx / nl * hw, a[1] - ny / nl * hw); ctx.closePath();
      }
      for (const w of WALLS) {
        const pr = prog(t, w.s, WALL_D); if (pr <= 0) continue;
        const yb = lerp(SK.h - 0.1, 0.03, eInOutCubic(pr));
        const a = G(w.ax, w.az, yb), b = G(w.bx, w.bz, yb), b2 = G(w.bx, w.bz, SK.h), a2 = G(w.ax, w.az, SK.h);
        ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(b2[0], b2[1]); ctx.lineTo(a2[0], a2[1]); ctx.closePath();
      }
      ctx.fill('nonzero'); ctx.lineWidth = 8; ctx.stroke();
      // dappled schach shadow
      const schA = sm(10.2, 16, t);
      if (schA > 0) {
        ctx.fillStyle = 'rgba(58,30,52,' + (shA * 0.55 * schA).toFixed(3) + ')';
        const q = [G(-1.6, -1.3, SK.h), G(1.6, -1.3, SK.h), G(1.6, 1.3, SK.h), G(-1.6, 1.3, SK.h)];
        poly(ctx, q); ctx.fill();
      }
      ctx.restore();

      // back parapet (Jerusalem stone, low wall with coping)
      {
        const z = FZ1 - 0.35, hP = 0.65;
        const a = P(c, FX0, 0, z), b = P(c, FX1, 0, z), b2 = P(c, FX1, hP, z), a2 = P(c, FX0, hP, z);
        const pg = ctx.createLinearGradient(0, a2[1], 0, a[1]);
        pg.addColorStop(0, 'rgb(206,166,124)'); pg.addColorStop(1, 'rgb(150,112,90)');
        ctx.fillStyle = pg; poly(ctx, [a, b, b2, a2]); ctx.fill();
        const t1 = P(c, FX0, hP + 0.06, z + 0.4), t2 = P(c, FX1, hP + 0.06, z + 0.4), t3 = P(c, FX1, hP + 0.06, z - 0.05), t4 = P(c, FX0, hP + 0.06, z - 0.05);
        ctx.fillStyle = 'rgb(236,200,150)'; poly(ctx, [t4, t3, t2, t1]); ctx.fill();
        ctx.strokeStyle = 'rgba(255,224,170,' + (0.5 + 0.4 * sunStr).toFixed(3) + ')'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(t1[0], t1[1]); ctx.lineTo(t2[0], t2[1]); ctx.stroke();
        ctx.fillStyle = 'rgba(120,80,64,0.8)'; poly(ctx, [t4, t3, b2, a2]); ctx.fill();
        ctx.strokeStyle = 'rgba(110,76,58,0.4)'; ctx.lineWidth = 1;
        ctx.beginPath();
        const m1 = P(c, FX0, hP * 0.5, z), m2 = P(c, FX1, hP * 0.5, z);
        ctx.moveTo(m1[0], m1[1]); ctx.lineTo(m2[0], m2[1]);
        for (let x = FX0; x < FX1; x += 0.6) {
          const off = (Math.round((x - FX0) / 0.6) % 2) * 0.3;
          const q1 = P(c, x + off, 0, z), q2 = P(c, x + off, hP * 0.5, z), q3 = P(c, x, hP * 0.5, z), q4 = P(c, x, hP, z);
          ctx.moveTo(q1[0], q1[1]); ctx.lineTo(q2[0], q2[1]); ctx.moveTo(q3[0], q3[1]); ctx.lineTo(q4[0], q4[1]);
        }
        ctx.stroke();
      }
      // potted olive trees
      for (const pt of [[-4.6, 5.0], [4.9, 4.6], [6.2, 2.4]]) {
        const b = P(c, pt[0], 0, pt[1]); const s = b[3] * 1.9 / 380;
        const gA = G(pt[0], pt[1], 0), gB = G(pt[0], pt[1], 1.6);
        ctx.fillStyle = 'rgba(58,30,52,' + (shA * 0.8).toFixed(3) + ')';
        ctx.beginPath(); ctx.ellipse((gA[0] + gB[0]) / 2, (gA[1] + gB[1]) / 2, Math.hypot(gB[0] - gA[0], gB[1] - gA[1]) / 2 + 20 * s, 40 * s, Math.atan2(gB[1] - gA[1], gB[0] - gA[0]), 0, PI * 2); ctx.fill();
        ctx.drawImage(L.olive, b[0] - 130 * s, b[1] - 378 * s, 260 * s, 380 * s);
      }

      // ---- the sukkah ----
      const items = [];
      for (const w of WALLS) {
        const mc = P(c, (w.ax + w.bx) / 2, 1.15, (w.az + w.bz) / 2);
        items.push({ z: mc[2], fn: () => drawWall(ctx, c, t, w, sunH) });
      }
      for (const p of POSTS) {
        const tp = postTop(p, t);
        const mc = P(c, (p.x + tp[0]) / 2, tp[1] / 2, (p.z + tp[2]) / 2);
        items.push({ z: mc[2] - 0.05, fn: () => {
          const a = P(c, p.x, 0, p.z), b = P(c, tp[0], tp[1], tp[2]);
          woodLine(ctx, a, b, Math.max(2, 0.12 * mc[3]), 1);
        } });
      }
      for (const bm of BEAMS) {
        const pr = prog(t, bm.s, bm.d);
        if (t < bm.s - 0.3) continue;
        const y = SK.h + 1.8 * (1 - eOutBack(pr, 1.3));
        const mc = P(c, (bm.a[0] + bm.b[0]) / 2, y, (bm.a[1] + bm.b[1]) / 2);
        items.push({ z: mc[2] - 0.08, fn: () => {
          const a = P(c, bm.a[0], y, bm.a[1]), b = P(c, bm.b[0], y, bm.b[1]);
          woodLine(ctx, a, b, Math.max(2, 0.12 * mc[3]), sm(bm.s - 0.3, bm.s + 0.15, t));
        } });
      }
      const glow = sm(13.6, 16.8, t);
      const flick = 1 + 0.05 * Math.sin(t * 13.1) + 0.035 * Math.sin(t * 7.7 + 1.3) + 0.02 * Math.sin(t * 23.3);
      const lanPos = [0.0, SK.h - 0.62, 0.05];
      const lanShow = sm(12.4, 13.4, t);
      // table with a white cloth
      {
        const tc = P(c, 0, 0.5, 0.15);
        items.push({ z: tc[2], fn: () => {
          const x0 = -0.62, x1 = 0.62, z0 = -0.3, z1 = 0.55, ty = 0.74, dy = 0.42;
          const A = P(c, x0, ty, z0), B = P(c, x1, ty, z0), C = P(c, x1, ty, z1), D = P(c, x0, ty, z1);
          const A2 = P(c, x0, dy, z0), B2 = P(c, x1, dy, z0), C2 = P(c, x1, dy, z1);
          ctx.fillStyle = 'rgba(40,24,30,0.45)';
          const l0 = P(c, x0 + 0.05, 0, z0 + 0.05), l1 = P(c, x1 - 0.05, 0, z0 + 0.05), l2 = P(c, x1 - 0.05, 0, z1), l3 = P(c, x0 + 0.05, 0, z1);
          poly(ctx, [l0, l1, l2, l3]); ctx.fill();
          ctx.strokeStyle = 'rgb(70,46,32)'; ctx.lineWidth = Math.max(1, 0.05 * tc[3]);
          ctx.beginPath();
          for (const lp of [[x0 + 0.08, z0 + 0.08], [x1 - 0.08, z0 + 0.08], [x1 - 0.08, z1 - 0.08]]) {
            const q1 = P(c, lp[0], dy, lp[1]), q2 = P(c, lp[0], 0, lp[1]);
            ctx.moveTo(q1[0], q1[1]); ctx.lineTo(q2[0], q2[1]);
          }
          ctx.stroke();
          ctx.fillStyle = 'rgb(214,206,196)'; poly(ctx, [A, B, B2, A2]); ctx.fill();
          ctx.fillStyle = 'rgb(190,180,172)'; poly(ctx, [B, C, C2, B2]); ctx.fill();
          ctx.fillStyle = 'rgb(246,240,230)'; poly(ctx, [A, B, C, D]); ctx.fill();
          // two small brass candlesticks
          for (const cxp of [-0.18, 0.18]) {
            const q1 = P(c, cxp, ty, 0.12), q2 = P(c, cxp, ty + 0.22, 0.12);
            ctx.strokeStyle = 'rgb(196,150,70)'; ctx.lineWidth = Math.max(1, 0.025 * tc[3]);
            ctx.beginPath(); ctx.moveTo(q1[0], q1[1]); ctx.lineTo(q2[0], q2[1]); ctx.stroke();
          }
        } });
      }
      // hanging lantern
      {
        const lc = P(c, lanPos[0], lanPos[1], lanPos[2]);
        items.push({ z: lc[2] - 0.02, fn: () => {
          if (lanShow <= 0) return;
          const top = P(c, lanPos[0], SK.h, lanPos[2]);
          const k = lc[3], s = 0.1 * k;
          ctx.globalAlpha = lanShow;
          ctx.strokeStyle = 'rgba(60,40,30,0.9)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(top[0], top[1]); ctx.lineTo(lc[0], lc[1] - s * 1.2); ctx.stroke();
          const body = mix([120, 80, 50], [255, 206, 120], glow);
          ctx.fillStyle = rgb(body);
          ctx.beginPath();
          ctx.moveTo(lc[0], lc[1] - s * 1.25); ctx.lineTo(lc[0] + s * 0.7, lc[1] - s * 0.55); ctx.lineTo(lc[0] + s * 0.7, lc[1] + s * 0.6);
          ctx.lineTo(lc[0], lc[1] + s * 1.1); ctx.lineTo(lc[0] - s * 0.7, lc[1] + s * 0.6); ctx.lineTo(lc[0] - s * 0.7, lc[1] - s * 0.55); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = 'rgb(150,104,52)'; ctx.lineWidth = Math.max(1, s * 0.12); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(lc[0], lc[1] - s * 1.25); ctx.lineTo(lc[0], lc[1] + s * 1.1); ctx.stroke();
          ctx.globalAlpha = 1;
        } });
      }
      items.sort((a, b) => b.z - a.z);
      for (const it of items) it.fn();

      // schach: bamboo, then palm fronds and branches
      for (const pl of POLES) drawPole(ctx, c, pl, t);
      for (const fd of L.fronds) drawFrond(ctx, c, fd, t);

      // ---- colour grade: dusk settles over everything ----
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = rgb(keyed(GRADE, u)); ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';

      // sun bloom and rays
      const bloomA = 0.5 * sunStr + 0.14 * (1 - sm(14, 18, t));
      spr(L.sprGold, sp[0], sp[1], 700, bloomA * (1 - u) * 0.8);
      spr(L.sprRose, sp[0], sp[1], 760, bloomA * (0.25 + u) * 0.7);
      if (sunStr > 0.02) {
        ctx.save(); ctx.translate(sp[0], sp[1]); ctx.rotate(0.05 * Math.sin(t * 0.21) + 0.12 * u);
        ctx.globalAlpha = 0.2 * sunStr; ctx.drawImage(L.rays, -1800, -1800, 3600, 3600);
        ctx.rotate(0.07 + 0.03 * Math.sin(t * 0.33));
        ctx.globalAlpha = 0.1 * sunStr; ctx.drawImage(L.rays, -1400, -1400, 2800, 2800);
        ctx.restore();
      }

      // "lock" glints when beams seat, dust puffs when posts land
      for (const bm of BEAMS) {
        const tl = bm.s + bm.d * 0.45, dt = t - tl;
        if (dt < 0 || dt > 1.2) continue;
        const a = Math.exp(-dt * 4) * 0.9;
        for (const e of [bm.a, bm.b]) {
          const q = P(c, e[0], SK.h, e[1]);
          spr(L.sprHot, q[0], q[1], 0.4 * q[3], a);
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      for (const p of POSTS) {
        const tl = p.s + p.d * 0.5, dt = t - tl;
        if (dt < 0 || dt > 1.6) continue;
        const q = P(c, p.x, 0, p.z);
        ctx.fillStyle = 'rgba(236,206,166,' + (0.35 * (1 - dt / 1.6)).toFixed(3) + ')';
        ctx.beginPath();
        for (const d of L.dust) {
          const rr = (0.1 + 0.5 * d[1] * eOutCubic(dt / 1.6)), ang = d[0];
          const x = q[0] + Math.cos(ang) * rr * q[3], y = q[1] + Math.sin(ang) * rr * q[3] * 0.35 - dt * 0.15 * q[3] * d[2];
          const rad = (0.04 + 0.08 * dt) * q[3];
          ctx.moveTo(x + rad, y); ctx.arc(x, y, rad, 0, PI * 2);
        }
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'lighter';

      // warm light inside the finished sukkah
      if (glow > 0) {
        const lc = P(c, lanPos[0], lanPos[1], lanPos[2]);
        const g1 = glow * flick;
        spr(L.sprAmber, lc[0], lc[1] + 0.3 * lc[3], 2.6 * lc[3], 0.5 * g1);
        spr(L.sprGold, lc[0], lc[1], 1.1 * lc[3], 0.4 * g1);
        spr(L.sprHot, lc[0], lc[1], 0.22 * lc[3], 0.95 * g1);
        // light spilling onto the stones through the open side
        const fp = P(c, 0.1, 0, -1.7);
        spr(L.sprAmber, fp[0], fp[1], 2.4 * fp[3], 0.3 * g1, 0.3);
        ctx.globalAlpha = 1;
      }

      // dust motes drifting in the low sun
      const ma = 0.6 * (0.35 + 0.65 * sunStr) + 0.25 * glow;
      for (const m of L.motes) {
        const x = ((m.x + t * m.vx + 30 * Math.sin(t * m.w + m.ph)) % (W + 40) + W + 40) % (W + 40) - 20;
        const y = m.y - t * m.vy + 14 * Math.sin(t * m.w * 0.8 + m.ph * 2);
        const a = ma * (0.35 + 0.65 * Math.max(0, Math.sin(t * m.tw + m.ph))) * (y > 800 ? 0.3 : 1);
        if (a < 0.02) continue;
        ctx.fillStyle = 'rgba(255,220,160,' + a.toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(x, y, m.r, 0, PI * 2); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';

      // vignette, caption band, grain
      ctx.drawImage(L.vg, 0, 0);
      const gi = L.grain[Math.floor(t * 24) % 3];
      const go = (Math.floor(t * 24) * 97) % 256;
      for (let y = -go; y < H; y += 256) for (let x = -((go * 3) % 256); x < W; x += 256) ctx.drawImage(gi, x, y);

      ctx.restore();
    },
  };
})();
