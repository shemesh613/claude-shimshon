// Scene 6: Hoshana Rabbah -> Shemini Atzeret. Aravot at dawn, the prayer for rain,
// the land of Israel turns green, clouds break into light and a rainbow.
(function () {
  const S = (window.SUKKOT = window.SUKKOT || { scenes: {} });
  const W = 1920, H = 1080;

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
  const sm = (a, b, t) => { const x = clamp((t - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
  const easeIO = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const lerp = (a, b, k) => a + (b - a) * k;
  const mix = (c1, c2, k) => [lerp(c1[0], c2[0], k), lerp(c1[1], c2[1], k), lerp(c1[2], c2[2], k)];
  const rgb = (c, a) => a === undefined
    ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`
    : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  // Landscape layer canvases cover world x in [-LX, W+LX], y in [LY0, LY1]
  const LX = 100, LY0 = 300, LY1 = 1460;
  const LW = W + 2 * LX, LH = LY1 - LY0;

  // Layer definitions, far (0) to near (4)
  const LAYERS = [
    { base: 540, amps: [16, 10, 6], bumps: [[1380, 60, 170], [520, 30, 260], [900, 18, 200]],
      terr: 7, trees: 0, parY: 50, pan: 1.2, haze: 0.42,
      dry: [[214, 188, 148], [196, 168, 128]], green: [[168, 186, 150], [146, 166, 130]] },
    { base: 600, amps: [22, 12, 7], bumps: [[260, 55, 240], [1700, 45, 260], [1100, 20, 180]],
      terr: 11, trees: 5, parY: 100, pan: 2.2, haze: 0.28,
      dry: [[208, 172, 118], [184, 148, 100]], green: [[146, 174, 108], [124, 154, 92]] },
    { base: 668, amps: [20, 12, 6], bumps: [[700, 50, 260], [1560, 30, 220]],
      terr: 17, trees: 9, parY: 170, pan: 3.6, haze: 0.16,
      dry: [[200, 160, 100], [168, 128, 78]], green: [[128, 164, 86], [100, 138, 68]] },
    { base: 735, amps: [10, 6, 4], bumps: [[1560, 26, 300], [300, 30, 300]],
      terr: 26, trees: 15, parY: 250, pan: 5.2, haze: 0.06,
      dry: [[190, 150, 92], [150, 112, 66]], green: [[112, 152, 74], [82, 118, 54]] },
    { base: 930, amps: [8, 6, 3], bumps: [[80, 230, 330], [1880, 190, 330], [1500, 60, 260]],
      terr: 0, trees: 0, parY: 360, pan: 7.5, haze: 0.0,
      dry: [[124, 94, 58], [52, 40, 28]], green: [[70, 98, 50], [28, 40, 24]] },
  ];

  // Wadi centre line (world coords, lives in layer 3), far -> near
  const WADI = [[1250, 748], [1170, 762], [1080, 778], [1020, 800], [1060, 826], [990, 852],
    [880, 884], [760, 925], [640, 980], [520, 1050], [420, 1140], [340, 1260]];

  let R = null;

  function ridgeFn(L, rnd) {
    const ph = [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28];
    const fr = [0.0021 + rnd() * 0.001, 0.0055 + rnd() * 0.002, 0.013 + rnd() * 0.004];
    return function (x) {
      let y = L.base;
      for (let k = 0; k < 3; k++) y += L.amps[k] * Math.sin(x * fr[k] + ph[k]);
      for (const b of L.bumps) { const d = (x - b[0]) / b[2]; y -= b[1] * Math.exp(-d * d); }
      return y;
    };
  }

  function catmull(pts, per) {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (let j = 0; j < per; j++) {
        const u = j / per, u2 = u * u, u3 = u2 * u;
        out.push([
          0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * u + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * u3),
          0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3),
        ]);
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }

  function oliveTree(c, x, y, r, rnd, pal, green) {
    // ground shadow
    c.fillStyle = 'rgba(30,22,12,0.22)';
    c.beginPath(); c.ellipse(x + r * 0.5, y + r * 0.12, r * 1.2, r * 0.28, 0, 0, 6.283); c.fill();
    // trunk
    c.strokeStyle = 'rgb(58,46,34)'; c.lineWidth = Math.max(1, r * 0.22); c.lineCap = 'round';
    c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x - r * 0.2, y - r * 0.5, x + r * 0.05, y - r * 0.85); c.stroke();
    // canopy: silvery grey-green clumps
    const base = green ? [96, 118, 78] : [104, 114, 80];
    const n = 7;
    for (let i = 0; i < n; i++) {
      const a = rnd() * 6.283, d = rnd() * r * 0.55;
      const cx = x + Math.cos(a) * d * 1.3, cy = y - r * 1.15 + Math.sin(a) * d * 0.7;
      const rr = r * (0.42 + rnd() * 0.3);
      const k = 0.75 + (cy < y - r * 1.2 ? 0.25 : 0) + rnd() * 0.12;
      c.fillStyle = rgb([base[0] * k, base[1] * k, base[2] * k]);
      c.beginPath(); c.ellipse(cx, cy, rr, rr * 0.8, 0, 0, 6.283); c.fill();
    }
    c.fillStyle = 'rgba(190,200,165,0.35)';
    c.beginPath(); c.ellipse(x - r * 0.25, y - r * 1.45, r * 0.45, r * 0.25, 0, 0, 6.283); c.fill();
  }

  function buildLayer(i, green) {
    const L = LAYERS[i];
    const ridge = L.ridge;
    const top = L.top, bot = L.bot;
    const cv = mk(LW, bot - top), c = cv.getContext('2d');
    c.translate(LX, -top);
    const rnd = mulberry32(1000 + i * 77);
    const pal = green ? L.green : L.dry;
    const xs = [];
    for (let x = -LX; x <= W + LX; x += 6) xs.push([x, ridge(x)]);
    let minY = 1e9; for (const p of xs) minY = Math.min(minY, p[1]);
    const shape = () => {
      c.beginPath(); c.moveTo(-LX, LY1);
      for (const p of xs) c.lineTo(p[0], p[1]);
      c.lineTo(W + LX, LY1); c.closePath();
    };
    shape();
    const g = c.createLinearGradient(0, minY, 0, i === 4 ? 1100 : minY + 380);
    g.addColorStop(0, rgb(pal[0])); g.addColorStop(1, rgb(pal[1].map((v) => v * 0.86)));
    c.fillStyle = g; c.fill();
    // sunlit crest
    c.beginPath(); for (const p of xs) c.lineTo(p[0], p[1] + 1.5);
    c.strokeStyle = green ? 'rgba(220,240,170,0.35)' : 'rgba(255,236,190,0.4)'; c.lineWidth = 2 + i; c.stroke();
    c.save(); shape(); c.clip();

    // broad light/shadow modulation on slopes (sun from the right)
    for (let k = 0; k < 10; k++) {
      const bx = -LX + rnd() * (LW), by = minY + rnd() * 260, br = 180 + rnd() * 320;
      const rg = c.createRadialGradient(bx, by, 0, bx, by, br);
      const lite = rnd() < 0.5;
      rg.addColorStop(0, lite ? (green ? 'rgba(230,240,150,0.16)' : 'rgba(255,240,200,0.12)') : (green ? 'rgba(20,50,20,0.18)' : 'rgba(60,40,20,0.14)'));
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = rg; c.fillRect(bx - br, by - br, br * 2, br * 2);
    }

    // wadi bed in layer 3
    if (i === 3) {
      const pts = catmull(WADI, 8);
      for (let pass = 0; pass < 2; pass++) {
        for (let j = 0; j < pts.length - 1; j++) {
          const u = j / (pts.length - 1);
          const w = lerp(10, 90, u * u) * (pass ? 0.55 : 1);
          c.strokeStyle = pass ? (green ? 'rgb(170,160,130)' : 'rgb(206,184,140)') : (green ? 'rgba(52,70,36,0.55)' : 'rgba(96,72,44,0.5)');
          c.lineWidth = w; c.lineCap = 'round';
          c.beginPath(); c.moveTo(pts[j][0], pts[j][1]); c.lineTo(pts[j + 1][0], pts[j + 1][1]); c.stroke();
        }
      }
      // pebbles
      const rr = mulberry32(4242);
      for (let j = 0; j < 160; j++) {
        const q = pts[(rr() * (pts.length - 1)) | 0];
        const u = q[1] / 1100;
        const s = 1 + u * 4;
        c.fillStyle = rr() < 0.5 ? 'rgba(235,222,190,0.7)' : 'rgba(110,92,66,0.5)';
        c.beginPath(); c.ellipse(q[0] + (rr() - 0.5) * 40 * u, q[1] + (rr() - 0.5) * 8 * u, s, s * 0.6, 0, 0, 6.283); c.fill();
      }
    }

    // terraces: dry-stone walls following the contours
    if (L.terr) {
      const sp = L.terr;
      const wallLite = green ? 'rgba(226,222,196,0.40)' : 'rgba(238,222,186,0.45)';
      const wallDark = 'rgba(50,36,20,0.28)';
      const band = green ? 'rgba(40,70,20,0.10)' : 'rgba(90,60,20,0.08)';
      const pk = rnd() * 6.28;
      for (let k = 1; k < 60; k++) {
        const off = k * sp * (1 + k * 0.04);
        if (minY + off > 1150) break;
        const path = () => {
          c.beginPath();
          for (let x = -LX; x <= W + LX; x += 12) {
            const y = ridge(x) * 0.7 + (minY + 30) * 0.3 + off + Math.sin(x * 0.006 + k * 1.7 + pk) * sp * 0.25;
            if (x === -LX) c.moveTo(x, y); else c.lineTo(x, y);
          }
        };
        path(); c.lineTo(W + LX, 2000); c.lineTo(-LX, 2000); c.closePath();
        if (k % 2) { c.fillStyle = band; c.fill(); }
        path();
        c.lineWidth = Math.max(1, sp * 0.16); c.strokeStyle = wallDark;
        c.save(); c.translate(0, sp * 0.14); c.stroke(); c.restore();
        c.lineWidth = Math.max(0.8, sp * 0.07); c.strokeStyle = wallLite; c.stroke();
      }
    }

    // scrub / grass flecks
    const nScrub = [260, 420, 520, 520, 0][i];
    for (let k = 0; k < nScrub; k++) {
      const x = -LX + rnd() * LW, y = ridge(x) + 6 + rnd() * (500 - i * 40);
      const s = (0.8 + rnd() * 1.4) * (1 + i * 0.7);
      const v = rnd();
      c.fillStyle = green ? rgb([60 + v * 40, 96 + v * 50, 40 + v * 20], 0.55) : rgb([120 + v * 40, 96 + v * 30, 56], 0.45);
      c.beginPath(); c.ellipse(x, y, s * 1.5, s * 0.8, 0, 0, 6.283); c.fill();
    }

    // olive trees in rows along terraces
    if (L.trees) {
      const tr = mulberry32(900 + i);
      const r = L.trees;
      const rows = i === 1 ? 6 : i === 2 ? 5 : 4;
      for (let row = 0; row < rows; row++) {
        const off = (row + 0.6) * (L.terr || 20) * 1.9 + 10;
        const x0 = -LX + tr() * 300;
        const gapBig = tr() * LW;
        for (let x = x0; x < W + LX; x += r * (3.2 + tr() * 2.2)) {
          if (Math.abs(x - gapBig) < 300 || tr() < 0.25) continue;
          if (i === 3) { // keep the wadi clear
            let near = false;
            for (const p of WADI) if (Math.abs(p[0] - x) < 90 && Math.abs(p[1] - (ridge(x) + off)) < 60) near = true;
            if (near) continue;
          }
          const y = ridge(x) + off + Math.sin(x * 0.006) * 6;
          oliveTree(c, x, y, r * (0.8 + tr() * 0.4), tr, pal, green);
        }
      }
    }

    // stone village on the far hilltop
    if (i === 0) {
      const vr = mulberry32(77);
      const cx = 1380;
      const houses = [];
      for (let k = 0; k < 34; k++) {
        const x = cx + (vr() - 0.5) * 300 * (0.4 + vr() * 0.6);
        houses.push([x, ridge(x) + 4 + vr() * 16, 8 + vr() * 12, 6 + vr() * 8]);
      }
      houses.sort((a, b) => a[1] - b[1]);
      for (const hh of houses) {
        const [x, y, w, h] = hh;
        c.fillStyle = 'rgb(236,224,198)'; c.fillRect(x, y - h, w, h);
        c.fillStyle = 'rgb(190,172,142)'; c.fillRect(x + w * 0.62, y - h, w * 0.38, h);
        c.fillStyle = 'rgba(80,66,50,0.7)';
        if (w > 11) c.fillRect(x + w * 0.2, y - h * 0.6, 2, 2.5);
        if (h > 9) c.fillRect(x + w * 0.42, y - h * 0.62, 2, 2.5);
      }
      // cypress trees among the houses
      for (let k = 0; k < 7; k++) {
        const x = cx + (vr() - 0.5) * 320, y = ridge(x) + 10;
        c.fillStyle = 'rgb(70,84,60)';
        c.beginPath(); c.ellipse(x, y - 11, 2.6, 11, 0, 0, 6.283); c.fill();
      }
    }

    // foreground details: rocks and grass tufts
    if (i === 4) {
      const fr = mulberry32(555);
      for (let k = 0; k < 40; k++) {
        const x = -LX + fr() * LW, y = ridge(x) + 20 + fr() * 200;
        const s = 6 + fr() * 16;
        const pts = [];
        for (let q = 0; q < 7; q++) { const a = Math.PI + (q / 6) * Math.PI; const rr = s * (0.7 + fr() * 0.5); pts.push([x + Math.cos(a) * rr * 1.3, y + Math.sin(a) * rr * 0.7]); }
        c.fillStyle = 'rgba(30,22,14,0.3)';
        c.beginPath(); c.ellipse(x + s * 0.3, y + 2, s * 1.4, s * 0.25, 0, 0, 6.283); c.fill();
        c.fillStyle = 'rgba(128,114,92,0.6)';
        c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const p of pts) c.lineTo(p[0], p[1]); c.closePath(); c.fill();
        c.fillStyle = 'rgba(210,196,160,0.25)';
        c.beginPath(); c.ellipse(x - s * 0.3, y - s * 0.4, s * 0.6, s * 0.2, -0.2, 0, 6.283); c.fill();
      }
      c.lineCap = 'round';
      for (let k = 0; k < 420; k++) {
        const x = -LX + fr() * LW, y = ridge(x) + 4 + fr() * 260;
        const hgt = 10 + fr() * 26, lean = (fr() - 0.5) * 14;
        const v = fr();
        c.strokeStyle = green ? rgb([70 + v * 60, 120 + v * 60, 50 + v * 20], 0.8) : rgb([170 + v * 50, 140 + v * 40, 80 + v * 20], 0.7);
        c.lineWidth = 1.5 + fr() * 1.5;
        c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + lean * 0.3, y - hgt * 0.6, x + lean, y - hgt); c.stroke();
      }
      // framing olive trees at the edges
      const big = mulberry32(31);
      oliveTree(c, 120, ridge(120) + 30, 120, big, pal, green);
      oliveTree(c, 1820, ridge(1820) + 40, 100, big, pal, green);
    }
    c.restore();

    // atmospheric haze
    if (L.haze > 0) {
      c.globalCompositeOperation = 'source-atop';
      const hg = c.createLinearGradient(0, minY, 0, minY + 300);
      const hc = green ? [196, 206, 196] : [226, 208, 176];
      hg.addColorStop(0, rgb(hc, L.haze)); hg.addColorStop(1, rgb(hc, L.haze * 0.35));
      c.fillStyle = hg; c.fillRect(-LX, top, LW, bot - top);
      c.globalCompositeOperation = 'source-over';
    }
    return { cv, top };
  }

  function cloudSprite(seed, tint) {
    const cw = 1000, ch = 380;
    const cv = mk(cw, ch), c = cv.getContext('2d');
    const r = mulberry32(seed);
    const puffs = [];
    for (let k = 0; k < 46; k++) {
      const u = r();
      const x = cw * 0.12 + u * cw * 0.76;
      const hump = Math.sin(u * Math.PI);
      const rr = 50 + r() * 70 * (0.5 + hump);
      const y = ch * 0.78 - rr * 0.5 - r() * hump * 110;
      puffs.push([x, y, rr]);
    }
    puffs.sort((a, b) => b[1] - a[1]);
    for (const p of puffs) {
      const [x, y, rr] = p;
      const k = clamp((ch * 0.8 - y) / (ch * 0.7), 0, 1);
      const col = mix(tint[1], tint[0], k);
      const g = c.createRadialGradient(x - rr * 0.2, y - rr * 0.3, rr * 0.1, x, y, rr);
      g.addColorStop(0, rgb(mix(col, tint[2], 0.5), 0.95));
      g.addColorStop(0.6, rgb(col, 0.8));
      g.addColorStop(1, rgb(col, 0));
      c.fillStyle = g;
      c.beginPath(); c.arc(x, y, rr, 0, 6.283); c.fill();
    }
    return cv;
  }

  function buildAravot() {
    // static dawn background
    const bg = mk(W, H), c = bg.getContext('2d');
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgb(40,50,68)'); g.addColorStop(0.55, 'rgb(96,108,126)'); g.addColorStop(1, 'rgb(62,68,80)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const rg = c.createRadialGradient(1500, 760, 0, 1500, 760, 900);
    rg.addColorStop(0, 'rgba(226,190,160,0.42)'); rg.addColorStop(0.5, 'rgba(180,150,140,0.15)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = rg; c.fillRect(0, 0, W, H);
    // soft distant hills, out of focus
    c.filter = 'blur(14px)';
    c.fillStyle = 'rgba(58,64,78,0.85)';
    c.beginPath(); c.moveTo(0, H);
    for (let x = 0; x <= W; x += 20) c.lineTo(x, 760 + Math.sin(x * 0.003 + 1) * 40 + Math.sin(x * 0.011) * 12);
    c.lineTo(W, H); c.fill();
    c.filter = 'none';
    // bokeh
    const r = mulberry32(99);
    c.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 26; k++) {
      const x = r() * W, y = 150 + r() * 700, rr = 20 + r() * 60;
      const bg2 = c.createRadialGradient(x, y, rr * 0.6, x, y, rr);
      const a = 0.03 + r() * 0.05;
      bg2.addColorStop(0, `rgba(210,200,200,${a})`); bg2.addColorStop(0.9, `rgba(210,200,200,${a * 0.8})`); bg2.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = bg2; c.beginPath(); c.arc(x, y, rr, 0, 6.283); c.fill();
    }
    c.globalCompositeOperation = 'source-over';

    // branches
    const br = mulberry32(2024);
    const specs = [
      { bx: 930, tx: 600, ty: 170, depth: 0 },
      { bx: 990, tx: 1340, ty: 120, depth: 0 },
      { bx: 950, tx: 800, ty: 40, depth: 1 },
      { bx: 975, tx: 1140, ty: 70, depth: 1 },
      { bx: 962, tx: 960, ty: -20, depth: 2 },
    ];
    const branches = specs.map((s, bi) => {
      const P0 = [s.bx, 1180], P2 = [s.tx, s.ty];
      const P1 = [(P0[0] + P2[0]) / 2 + (s.tx < 960 ? 60 : -60), (P0[1] + P2[1]) / 2];
      const pt = (u) => [
        (1 - u) * (1 - u) * P0[0] + 2 * (1 - u) * u * P1[0] + u * u * P2[0],
        (1 - u) * (1 - u) * P0[1] + 2 * (1 - u) * u * P1[1] + u * u * P2[1]];
      const tan = (u) => Math.atan2(
        2 * (1 - u) * (P1[1] - P0[1]) + 2 * u * (P2[1] - P1[1]),
        2 * (1 - u) * (P1[0] - P0[0]) + 2 * u * (P2[0] - P1[0]));
      const leaves = [];
      const n = 38;
      for (let k = 0; k < n; k++) {
        const u = 0.16 + (k / n) * 0.84 + br() * 0.01;
        const p = pt(u), th = tan(u);
        const side = k % 2 ? 1 : -1;
        const a = th + side * (0.3 + br() * 0.22);
        const len = (110 + br() * 45) * (1 - u * 0.4);
        const wid = 9 + br() * 4;
        const bend = Math.sign(Math.cos(a)) * (6 + br() * 10) * (Math.cos(a) === 0 ? 1 : 1);
        const shade = 0.82 + br() * 0.3;
        leaves.push({ x: p[0], y: p[1], a, len, wid, bend, shade, under: br() < 0.3 });
      }
      return { P0, P1, P2, leaves, depth: s.depth, ph: br() * 6.28 };
    });
    // falling leaves (detach from branches)
    const fr = mulberry32(3131);
    const fall = [];
    for (let k = 0; k < 13; k++) {
      const bi = (fr() * 5) | 0;
      const li = 8 + ((fr() * 20) | 0);
      if (fall.some((f) => f.bi === bi && f.li === li)) continue;
      fall.push({ bi, li, td: -2.5 + k * 0.62 + fr() * 0.4, drift: -20 - fr() * 30, amp: 25 + fr() * 35,
        om: 1.6 + fr() * 1.2, ph: fr() * 6.28, spin: (fr() - 0.5) * 0.8, vt: 95 + fr() * 50 });
    }
    return { bg, branches, fall };
  }

  function init() {
    if (R) return;
    R = {};
    R.dry = []; R.green = [];
    for (let i = 0; i < LAYERS.length; i++) {
      const L = LAYERS[i];
      L.ridge = ridgeFn(L, mulberry32(50 + i * 13));
      let mn = 1e9;
      for (let x = -LX; x <= W + LX; x += 6) mn = Math.min(mn, L.ridge(x));
      L.top = Math.floor(mn - 40);
    }
    for (let i = 0; i < LAYERS.length; i++) {
      const L = LAYERS[i];
      if (i === LAYERS.length - 1) { L.bot = LY1; continue; }
      const N = LAYERS[i + 1];
      let mx = -1e9;
      for (let x = -LX; x <= W + LX; x += 6) mx = Math.max(mx, N.ridge(x));
      L.bot = Math.ceil(mx + 40);
    }
    for (let i = 0; i < LAYERS.length; i++) {
      R.dry.push(buildLayer(i, false));
      R.green.push(buildLayer(i, true));
    }
    // cloud sprites: [top, bottom, highlight] tints for dawn, storm, bright
    const tints = {
      dawn: [[150, 150, 168], [104, 108, 126], [196, 180, 180]],
      storm: [[112, 118, 132], [34, 38, 48], [150, 156, 170]],
      bright: [[252, 248, 240], [176, 184, 198], [255, 244, 220]],
    };
    R.clouds = [];
    for (let k = 0; k < 4; k++) {
      R.clouds.push({ dawn: cloudSprite(500 + k, tints.dawn), storm: cloudSprite(500 + k, tints.storm), bright: cloudSprite(500 + k, tints.bright) });
    }
    const cr = mulberry32(8080);
    R.cloudInst = [];
    for (let k = 0; k < 14; k++) {
      const band = k % 3;
      const hx = -250 + (k / 14) * 2300 + (cr() - 0.5) * 200;
      R.cloudInst.push({ spr: k % 4, hx, y: [-40, 70, 190][band] + cr() * 70, sc: [1.6, 1.25, 0.95][band] * (0.85 + cr() * 0.3),
        drift: 4 + cr() * 6, par: [0.4, 0.7, 1][band] });
    }
    R.cloudInst.sort((a, b) => a.sc < b.sc ? -1 : 1).reverse();

    // rain layers
    const rr = mulberry32(6060);
    R.rain = [
      { n: 320, len: [16, 26], w: 1, sp: 1000, a: 0.22, slant: 0.28, col: '200,212,228' },
      { n: 200, len: [34, 54], w: 1.5, sp: 1500, a: 0.28, slant: 0.3, col: '210,220,236' },
      { n: 90, len: [80, 130], w: 2.3, sp: 2300, a: 0.3, slant: 0.32, col: '220,228,240' },
    ].map((L) => {
      L.drops = [];
      for (let k = 0; k < L.n; k++) L.drops.push([rr() * (W + 500), rr() * (H + 300), lerp(L.len[0], L.len[1], rr()), 0.8 + rr() * 0.4]);
      return L;
    });

    // wadi stream samples
    R.stream = catmull(WADI, 8);
    const sr = mulberry32(7070);
    R.glints = [];
    for (let k = 0; k < 60; k++) R.glints.push([sr(), sr() * 6.28, 0.6 + sr() * 1.4, (sr() - 0.5)]);

    R.aravot = buildAravot();
    R.sky = mk(W / 2, H / 2);

    // vignette
    R.vig = mk(W, H);
    {
      const c = R.vig.getContext('2d');
      const g = c.createRadialGradient(W / 2, H * 0.45, H * 0.35, W / 2, H * 0.5, H * 1.05);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.7, 'rgba(8,10,16,0.25)'); g.addColorStop(1, 'rgba(6,8,12,0.7)');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      const b = c.createLinearGradient(0, H * 0.7, 0, H);
      b.addColorStop(0, 'rgba(6,8,12,0)'); b.addColorStop(0.4, 'rgba(6,8,12,0.35)'); b.addColorStop(1, 'rgba(6,8,12,0.62)');
      c.fillStyle = b; c.fillRect(0, H * 0.7, W, H * 0.3);
    }
    // grain tiles
    R.grain = [];
    const gr = mulberry32(1313);
    for (let k = 0; k < 4; k++) {
      const cv = mk(256, 256), c = cv.getContext('2d');
      const im = c.createImageData(256, 256);
      for (let p = 0; p < im.data.length; p += 4) {
        const v = gr();
        im.data[p] = im.data[p + 1] = im.data[p + 2] = v > 0.5 ? 255 : 0;
        im.data[p + 3] = Math.abs(v - 0.5) * 2 * 30;
      }
      c.putImageData(im, 0, 0);
      R.grain.push(cv);
    }
    R.grainPat = null;
  }

  // ---------- drawing ----------
  function drawLeaf(ctx, len, wid, bend) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len * 0.45, -wid + bend * 0.3, len, bend);
    ctx.quadraticCurveTo(len * 0.45, wid + bend * 0.3, 0, 0);
    ctx.fill();
  }

  function drawAravot(ctx, t) {
    const A = R.aravot;
    // camera: slow push-in, then rise/pull back
    const tr = easeIO(sm(3.4, 6.8, t));
    const push = 1 + 0.05 * sm(0, 5, t);
    const sc = push * lerp(1, 0.9, tr);
    const dy = tr * 950 - t * 6;
    ctx.save();
    ctx.drawImage(A.bg, -20 + t * 3, -30 + tr * 120 - t * 2, W + 60, H + 60);
    ctx.translate(960, 520 + dy);
    ctx.scale(sc, sc);
    ctx.translate(-960, -520);
    const hidden = new Set();
    for (const f of A.fall) if (t >= f.td) hidden.add(f.bi * 100 + f.li);

    const leafCols = [
      [[62, 82, 70], [96, 112, 100]],
      [[76, 104, 74], [128, 146, 124]],
      [[88, 120, 80], [150, 168, 142]],
    ];
    const stemCols = ['rgb(80,48,46)', 'rgb(104,52,44)', 'rgb(122,56,42)'];
    const order = [0, 1, 2, 3, 4];
    for (const bi of order) {
      const b = A.branches[bi];
      const sway = 0.012 * Math.sin(0.55 * t + b.ph) + 0.006 * Math.sin(1.3 * t + b.ph * 2);
      ctx.save();
      ctx.translate(b.P0[0], b.P0[1]); ctx.rotate(sway); ctx.translate(-b.P0[0], -b.P0[1]);
      // stem
      ctx.strokeStyle = stemCols[b.depth]; ctx.lineWidth = 5 + b.depth; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(b.P0[0], b.P0[1]); ctx.quadraticCurveTo(b.P1[0], b.P1[1], b.P2[0], b.P2[1]); ctx.stroke();
      ctx.strokeStyle = 'rgba(220,150,120,0.18)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(b.P0[0] + 2, b.P0[1]); ctx.quadraticCurveTo(b.P1[0] + 2, b.P1[1], b.P2[0] + 1, b.P2[1]); ctx.stroke();
      const lc = leafCols[b.depth];
      for (let li = 0; li < b.leaves.length; li++) {
        if (hidden.has(bi * 100 + li)) continue;
        const L = b.leaves[li];
        const flut = 0.03 * Math.sin(1.7 * t + li * 0.9 + b.ph);
        ctx.save();
        ctx.translate(L.x, L.y); ctx.rotate(L.a + flut);
        const col = L.under ? lc[1] : lc[0];
        ctx.fillStyle = rgb([col[0] * L.shade, col[1] * L.shade, col[2] * L.shade]);
        drawLeaf(ctx, L.len, L.wid, L.bend);
        ctx.strokeStyle = 'rgba(210,225,200,0.28)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(2, 0); ctx.quadraticCurveTo(L.len * 0.5, L.bend * 0.3, L.len * 0.95, L.bend * 0.95); ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }
    // woven palm-leaf binding at the base of the bundle
    for (let k = 0; k < 5; k++) {
      const y = 985 + k * 9;
      ctx.fillStyle = k % 2 ? 'rgb(128,120,70)' : 'rgb(150,140,84)';
      ctx.beginPath(); ctx.moveTo(918, y); ctx.lineTo(1008, y + 5); ctx.lineTo(1008, y + 12); ctx.lineTo(918, y + 7); ctx.closePath(); ctx.fill();
    }

    // falling leaves
    for (const f of A.fall) {
      if (t < f.td) continue;
      const b = A.branches[f.bi], L = b.leaves[f.li];
      const sw = 0.012 * Math.sin(0.55 * f.td + b.ph) + 0.006 * Math.sin(1.3 * f.td + b.ph * 2);
      const cs = Math.cos(sw), sn = Math.sin(sw);
      const lx = L.x - b.P0[0], ly = L.y - b.P0[1];
      const x0 = b.P0[0] + lx * cs - ly * sn, y0 = b.P0[1] + lx * sn + ly * cs;
      const tau = t - f.td;
      const y = y0 + f.vt * (tau - 0.7 * (1 - Math.exp(-tau / 0.7)));
      const ramp = 1 - Math.exp(-tau / 0.8);
      const x = x0 + f.drift * tau + f.amp * ramp * Math.sin(f.om * tau + f.ph);
      const rot = L.a + sw + ramp * (0.7 * Math.sin(f.om * tau + f.ph + 1.2) + f.spin * tau);
      const flip = Math.cos(f.om * 0.9 * tau + f.ph);
      if (y > 1250) continue;
      ctx.save();
      ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1, lerp(1, flip, ramp));
      const lc = leafCols[b.depth];
      ctx.fillStyle = rgb(flip * ramp < 0 ? lc[1] : lc[0]);
      drawLeaf(ctx, L.len, L.wid, L.bend * (1 - ramp * 0.6));
      ctx.restore();
    }
    ctx.restore();
    // cool dawn light from the right
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const lg = ctx.createRadialGradient(1500, 700, 0, 1500, 700, 800);
    lg.addColorStop(0, 'rgba(120,96,80,0.18)'); lg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  function drawRain(ctx, L, r, t) {
    const n = Math.floor(L.n * clamp(r * 1.3, 0, 1));
    if (n <= 0) return;
    ctx.strokeStyle = `rgba(${L.col},${(L.a * r).toFixed(3)})`;
    ctx.lineWidth = L.w;
    ctx.beginPath();
    const HH = H + 300, WW = W + 500;
    for (let k = 0; k < n; k++) {
      const d = L.drops[k];
      const y = ((d[1] + L.sp * d[3] * t) % HH) - 150;
      let x = (d[0] - y * L.slant) % WW; if (x < 0) x += WW; x -= 250;
      ctx.moveTo(x, y); ctx.lineTo(x + L.slant * d[2], y - d[2]);
    }
    ctx.stroke();
  }

  function drawLandscape(mainCtx, t) {
    // sky and clouds are soft: render them at half resolution
    let ctx = R.sky.getContext('2d');
    let camBase = new DOMMatrix([0.5, 0, 0, 0.5, 0, 0]);
    // timeline
    const cam = easeIO(sm(3.6, 8.2, t));
    const gather = sm(4.2, 10.5, t);
    const storm = sm(6.8, 10, t) * (1 - sm(13.6, 16.6, t));
    const rain = sm(8.2, 9.8, t) * (1 - sm(13.4, 15.8, t));
    const brk = easeIO(sm(13.8, 18, t));
    const bright = sm(14, 17, t);
    const dawn = 1 - sm(4.5, 9, t);

    // camera
    const zoom = lerp(1.1, 1.0, cam) * (1 + 0.035 * sm(8, 18, t));
    const setCam = (par, pan, parY) => {
      ctx.setTransform(camBase);
      ctx.translate(960, 560); ctx.scale(zoom, zoom); ctx.translate(-960, -560);
      ctx.translate(-(t - 9) * pan, -(1 - cam) * parY);
    };

    // ---- sky ----
    setCam(0, 0.4, 30);
    const skyTop = mix(mix([46, 58, 80], [34, 38, 48], storm), [70, 124, 176], bright);
    const skyMid = mix(mix([132, 136, 150], [70, 76, 88], storm), [156, 190, 214], bright);
    const skyHor = mix(mix([214, 182, 156], [98, 102, 110], storm), [246, 232, 200], bright);
    const sg = ctx.createLinearGradient(0, -120, 0, 760);
    sg.addColorStop(0, rgb(skyTop)); sg.addColorStop(0.6, rgb(skyMid)); sg.addColorStop(1, rgb(skyHor));
    ctx.fillStyle = sg; ctx.fillRect(-200, -300, W + 400, 1500);

    // sun glow behind the breaking clouds
    const sunX = 1320, sunY = -60;
    if (bright > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 700);
      g.addColorStop(0, `rgba(255,236,190,${0.55 * bright})`); g.addColorStop(0.25, `rgba(255,220,160,${0.22 * bright})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(sunX - 700, sunY - 700, 1400, 1400);
      ctx.restore();
    }

    // ---- clouds ----
    const cloudA = lerp(0.35, 1, gather) * (1 - brk * 0.3);
    for (const ci of R.cloudInst) {
      const spr = R.clouds[ci.spr];
      const dir = ci.hx < 960 ? -1 : 1;
      const dsun = Math.abs(ci.hx - sunX);
      const away = brk * (dsun < 520 ? 700 : 260);
      const x = ci.hx + dir * (1 - gather) * 900 + dir * away + t * ci.drift - 60;
      const y = ci.y - brk * 190 * ci.par;
      const w = 1000 * ci.sc, h = 380 * ci.sc;
      const a = cloudA;
      // tint cross-fade: dawn -> storm -> bright
      const wStorm = storm, wBright = bright * (1 - storm);
      const wDawn = Math.max(0, 1 - wStorm - wBright);
      ctx.globalAlpha = a * (wDawn + wStorm + wBright > 0 ? 1 : 0);
      const first = wDawn >= wStorm && wDawn >= wBright ? spr.dawn : wStorm >= wBright ? spr.storm : spr.bright;
      ctx.drawImage(first, x - w / 2, y, w, h);
      // overlay the other significant tints
      const layers = [[spr.dawn, wDawn], [spr.storm, wStorm], [spr.bright, wBright]];
      for (const [img, wv] of layers) {
        if (img === first || wv < 0.02) continue;
        ctx.globalAlpha = a * wv;
        ctx.drawImage(img, x - w / 2, y, w, h);
      }
    }
    ctx.globalAlpha = 1;
    // rainbow (in front of the thinning clouds, behind the hills)
    const rbA = sm(14.6, 17.4, t);
    if (rbA > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const cx = 860, cy = 1060, r0 = 600, r1 = 690;
      const inner = ctx.createRadialGradient(cx, cy, 0, cx, cy, r0);
      inner.addColorStop(0, 'rgba(0,0,0,0)'); inner.addColorStop(0.8, 'rgba(0,0,0,0)'); inner.addColorStop(1, `rgba(90,90,90,${0.12 * rbA})`);
      ctx.fillStyle = inner; ctx.beginPath(); ctx.arc(cx, cy, r0, Math.PI, 2 * Math.PI); ctx.fill();
      const g = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1);
      const a = rbA * 0.8;
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.12, `rgba(110,70,190,${0.55 * a})`);
      g.addColorStop(0.28, `rgba(60,110,230,${0.7 * a})`);
      g.addColorStop(0.44, `rgba(70,190,110,${0.75 * a})`);
      g.addColorStop(0.6, `rgba(245,225,80,${0.85 * a})`);
      g.addColorStop(0.74, `rgba(250,150,50,${0.8 * a})`);
      g.addColorStop(0.88, `rgba(230,60,50,${0.65 * a})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, r1, Math.PI, 2 * Math.PI); ctx.arc(cx, cy, r0, 2 * Math.PI, Math.PI, true); ctx.fill();
      ctx.restore();
    }

    // overcast deck
    if (storm > 0) {
      const g = ctx.createLinearGradient(0, -200, 0, 560);
      g.addColorStop(0, `rgba(26,30,38,${0.7 * storm})`); g.addColorStop(0.6, `rgba(50,56,66,${0.3 * storm})`); g.addColorStop(1, 'rgba(60,66,76,0)');
      ctx.fillStyle = g; ctx.fillRect(-200, -300, W + 400, 860);
    }
    // composite the sky buffer, then continue at full resolution
    camBase = mainCtx.__s6base || new DOMMatrix();
    ctx = mainCtx;
    ctx.setTransform(camBase);
    ctx.drawImage(R.sky, 0, 0, W, H);

    // ---- land layers, far to near, greening as a wave from front to back ----
    for (let i = 0; i < LAYERS.length; i++) {
      const L = LAYERS[i];
      setCam(0, L.pan, L.parY);
      const gv = sm(9.4 + (4 - i) * 1.0, 11.8 + (4 - i) * 1.0, t);
      if (gv < 1) ctx.drawImage(R.dry[i].cv, -LX, L.top);
      if (gv > 0) { ctx.globalAlpha = gv; ctx.drawImage(R.green[i].cv, -LX, L.top); ctx.globalAlpha = 1; }
      if (i === 3) drawStream(ctx, t, storm, bright);
      if (i === 1 && rain > 0) { setCam(0, 0, 0); drawRain(ctx, R.rain[0], rain, t); }
      if (i === 2 && storm > 0) {
        // rain mist between the hills
        const mg = ctx.createLinearGradient(0, 560, 0, 760);
        mg.addColorStop(0, 'rgba(120,128,140,0)'); mg.addColorStop(0.5, `rgba(120,128,140,${0.28 * storm})`); mg.addColorStop(1, 'rgba(120,128,140,0)');
        ctx.fillStyle = mg; ctx.fillRect(-200, 560, W + 400, 200);
      }
      if (i === 3 && rain > 0) { setCam(0, 0, 0); drawRain(ctx, R.rain[1], rain, t); }
    }

    // ---- grading on the land ----
    setCam(0, 0, 0);
    ctx.save();
    if (dawn > 0) {
      ctx.globalCompositeOperation = 'multiply';
      const g = ctx.createLinearGradient(0, 300, 0, 560);
      g.addColorStop(0, rgb([150, 162, 196], dawn * 0.25)); g.addColorStop(1, rgb([150, 162, 196], dawn * 0.75));
      ctx.fillStyle = g;
      ctx.fillRect(-200, -300, W + 400, 1800);
    }
    if (storm > 0) {
      ctx.globalCompositeOperation = 'multiply';
      const g = ctx.createLinearGradient(0, 380, 0, 520);
      g.addColorStop(0, 'rgba(96,104,122,0)'); g.addColorStop(1, `rgba(96,104,122,${0.8 * storm})`);
      ctx.fillStyle = g; ctx.fillRect(-200, 380, W + 400, 1100);
    }
    ctx.restore();

    // near rain + shimmer
    if (rain > 0) {
      drawRain(ctx, R.rain[2], rain, t);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const sh = 0.05 + 0.02 * Math.sin(t * 5.3) * Math.sin(t * 2.1);
      const g = ctx.createLinearGradient(0, 300, 0, 900);
      g.addColorStop(0, 'rgba(160,176,200,0)'); g.addColorStop(0.5, `rgba(160,176,200,${sh * rain})`); g.addColorStop(1, 'rgba(160,176,200,0)');
      ctx.fillStyle = g; ctx.fillRect(-200, 300, W + 400, 600);
      ctx.restore();
    }

    // ---- god rays and warm light ----
    if (bright > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 8; k++) {
        const ang = 1.9 + (k - 3.5) * 0.14 + 0.015 * Math.sin(t * 0.4 + k);
        const half = 0.025 + 0.02 * ((k * 7) % 3) / 2;
        const len = 1400;
        const a = bright * (0.03 + 0.022 * Math.sin(t * 0.6 + k * 1.7)) * (k % 3 === 1 ? 1.3 : 1);
        const ex = Math.cos(ang), ey = Math.sin(ang);
        const g = ctx.createLinearGradient(sunX, sunY, sunX + ex * len, sunY + ey * len);
        g.addColorStop(0, `rgba(255,236,196,${a.toFixed(3)})`); g.addColorStop(0.6, `rgba(255,230,180,${(a * 0.5).toFixed(3)})`); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(sunX, sunY);
        ctx.lineTo(sunX + Math.cos(ang - half) * len, sunY + Math.sin(ang - half) * len);
        ctx.lineTo(sunX + Math.cos(ang + half) * len, sunY + Math.sin(ang + half) * len);
        ctx.closePath(); ctx.fill();
      }
      ctx.globalCompositeOperation = 'screen';
      const wg = ctx.createRadialGradient(sunX, 300, 0, sunX, 300, 1400);
      wg.addColorStop(0, `rgba(255,214,150,${0.16 * bright})`); wg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = wg; ctx.fillRect(-200, -200, W + 400, H + 400);
      ctx.restore();
    }
  }

  function drawStream(ctx, t, storm, bright) {
    const fill = sm(10, 13.6, t);
    if (fill <= 0) return;
    const wgrow = sm(10, 14.5, t);
    const pts = R.stream, N = pts.length - 1;
    const col = mix(mix([150, 170, 188], [104, 118, 136], storm), [190, 220, 238], bright);
    ctx.save();
    ctx.lineCap = 'round';
    for (let j = 0; j < N; j++) {
      const u = j / N;
      if (u > fill) break;
      const edge = clamp((fill - u) / 0.08, 0, 1);
      const w = lerp(4, 46, u * u) * (0.35 + 0.65 * wgrow) * edge;
      ctx.strokeStyle = rgb(mix(col, [60, 80, 96], 0.25 + 0.3 * u), 0.9);
      ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(pts[j][0], pts[j][1]); ctx.lineTo(pts[j + 1][0], pts[j + 1][1]); ctx.stroke();
    }
    // sky-reflection highlight line
    ctx.strokeStyle = rgb(mix(col, [255, 255, 255], 0.35), 0.5);
    for (let j = 0; j < N; j++) {
      const u = j / N;
      if (u > fill - 0.02) break;
      ctx.lineWidth = lerp(1, 10, u * u) * (0.3 + 0.7 * wgrow);
      ctx.beginPath(); ctx.moveTo(pts[j][0] - 2, pts[j][1] - 1); ctx.lineTo(pts[j + 1][0] - 2, pts[j + 1][1] - 1); ctx.stroke();
    }
    // glints flowing downstream
    ctx.globalCompositeOperation = 'lighter';
    for (const gl of R.glints) {
      const u = (gl[0] + t * 0.03 * gl[2]) % 1;
      if (u > fill) continue;
      const fi = u * N, j = Math.min(N - 1, fi | 0), f = fi - j;
      const x = lerp(pts[j][0], pts[j + 1][0], f), y = lerp(pts[j][1], pts[j + 1][1], f);
      const w = lerp(4, 46, u * u) * (0.35 + 0.65 * wgrow);
      const tw = Math.max(0, Math.sin(t * 3 * gl[2] + gl[1]));
      const a = tw * tw * (0.35 + 0.5 * bright) * wgrow;
      if (a < 0.02) continue;
      const s = 1 + u * 3;
      ctx.fillStyle = `rgba(255,250,235,${a.toFixed(3)})`;
      ctx.fillRect(x + gl[3] * w * 0.6 - s * 2, y - s * 0.4, s * 4, s * 0.8);
    }
    ctx.restore();
  }

  S.scenes[6] = {
    duration: 18,
    init(env) { init(); },
    draw(ctx, t, env) {
      if (!R) init();
      ctx.save();
      const base = ctx.getTransform();
      ctx.__s6base = base;
      const aravA = 1 - easeIO(sm(3.6, 6.4, t));
      // opaque base
      ctx.fillStyle = 'rgb(40,48,62)'; ctx.fillRect(0, 0, W, H);
      if (aravA < 1) drawLandscape(ctx, t);
      ctx.setTransform(base);
      if (aravA >= 1) {
        drawAravot(ctx, t);
      } else if (aravA > 0) {
        // fade the close-up out directly (no offscreen pass)
        ctx.globalAlpha = aravA;
        drawAravot(ctx, t);
        ctx.globalAlpha = 1;
      }
      // vignette + caption band
      ctx.drawImage(R.vig, 0, 0);
      // grain
      const fi = Math.floor(t * 24);
      const tile = R.grain[fi % 4];
      if (!R.grainPat || R.grainPat.tile !== tile) {
        R.grainPat = { tile, pat: ctx.createPattern(tile, 'repeat') };
      }
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.translate(-((fi * 73) % 256), -((fi * 151) % 256));
      ctx.fillStyle = R.grainPat.pat;
      ctx.fillRect(0, 0, W + 256, H + 256);
      ctx.restore();
      delete ctx.__s6base;
      ctx.restore();
    },
  };
})();
