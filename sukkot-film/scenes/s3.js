/* Scene 3 - The four species (arba'at haminim).
 * A premium still-life "product" shot: lulav, hadasim, aravot and etrog enter one by
 * one in a warm spotlight, the etrog settles on silk in an open silver box, the three
 * branches are bound together with woven palm rings, and a shine sweeps across them.
 * Pure function of t: all randomness and all heavy rendering (blur filters) happen in init.
 */
(function () {
  const S = (window.SUKKOT = window.SUKKOT || { scenes: {} });

  const W = 1920, H = 1080;
  const R = 1.3; // sprite supersampling (camera pushes in up to ~1.1x)
  const DUR = 17;

  // ---------- helpers ----------
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const lerp = (a, b, k) => a + (b - a) * k;
  const eOC = (k) => 1 - Math.pow(1 - k, 3);
  const eOQ = (k) => 1 - Math.pow(1 - k, 5);
  const eIOC = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  const eIOS = (k) => 0.5 - 0.5 * Math.cos(Math.PI * k);
  const smooth = (k) => k * k * (3 - 2 * k);

  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    return c;
  }
  // sprite: world-size w x h, local origin at (ox, oy) from its top-left
  function sprite(w, h, ox, oy, fn, res) {
    res = res || R;
    const c = canvas(w * res, h * res);
    const g = c.getContext('2d');
    g.setTransform(res, 0, 0, res, ox * res, oy * res);
    fn(g);
    return { c, w, h, ox, oy, res };
  }
  function blurred(sp, px) {
    const c = canvas(sp.c.width, sp.c.height);
    const g = c.getContext('2d');
    g.filter = 'blur(' + (px * sp.res).toFixed(1) + 'px)';
    g.drawImage(sp.c, 0, 0);
    return { c, w: sp.w, h: sp.h, ox: sp.ox, oy: sp.oy, res: sp.res };
  }
  function tinted(sp, color) {
    const c = canvas(sp.c.width, sp.c.height);
    const g = c.getContext('2d');
    g.drawImage(sp.c, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = color;
    g.fillRect(0, 0, c.width, c.height);
    return { c, w: sp.w, h: sp.h, ox: sp.ox, oy: sp.oy, res: sp.res };
  }
  function drawSp(ctx, sp, x, y, a, alpha, sx, sy) {
    if (alpha <= 0.003) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(x, y);
    if (a) ctx.rotate(a);
    if (sx !== undefined) ctx.scale(sx, sy === undefined ? 1 : sy);
    ctx.drawImage(sp.c, -sp.ox, -sp.oy, sp.w, sp.h);
    ctx.restore();
  }
  // generic leaf outline pointing up (-y) from (0,0)
  function leafPath(g, len, w, c1x, c1y, c2x, c2y, curve) {
    const cv = curve || 0;
    g.beginPath();
    g.moveTo(0, 0);
    g.bezierCurveTo(w * c1x + cv * 0.5, -len * c1y, w * c2x + cv * 1.6, -len * c2y, cv * 2.4, -len);
    g.bezierCurveTo(-w * c2x + cv * 1.6, -len * c2y, -w * c1x + cv * 0.5, -len * c1y, 0, 0);
    g.closePath();
  }

  // ---------- LULAV ----------
  const LA = -140, LT = -730; // leafy part from LA up to tip LT (base of stem at 0)
  function lulavU(y) { return (LA - y) / (LA - LT); }
  function lulavHW(u) {
    u = clamp(u);
    const k = clamp(u / 0.07);
    const base = 10 + 10 * (1 - (1 - k) * (1 - k));
    return base * Math.pow(1 - u, 0.55) + 2.2 * u;
  }
  function drawLulav(g, rng) {
    // short stiff lowest leaflets (spread slightly), under the body
    for (let i = 0; i < 4; i++) {
      for (const s of [-1, 1]) {
        const y = LA + 12 - i * 10;
        g.save();
        g.translate(s * 6, y);
        g.rotate(s * (0.22 - i * 0.03));
        leafPath(g, 34 + i * 10, 3.2, 1.2, 0.2, 0.5, 0.7, 0);
        const gr = g.createLinearGradient(-4, 0, 4, 0);
        gr.addColorStop(0, '#1f3812'); gr.addColorStop(0.5, '#6f8f3a'); gr.addColorStop(1, '#223d14');
        g.fillStyle = gr; g.fill();
        g.strokeStyle = 'rgba(10,20,5,0.6)'; g.lineWidth = 0.6; g.stroke();
        g.restore();
      }
    }
    // stem (the bare lower part)
    g.beginPath();
    g.moveTo(-7, 0); g.lineTo(-9.5, LA + 18); g.lineTo(9.5, LA + 18); g.lineTo(7, 0); g.closePath();
    let gr = g.createLinearGradient(-10, 0, 10, 0);
    gr.addColorStop(0, '#2b2a14'); gr.addColorStop(0.25, '#6a6634'); gr.addColorStop(0.42, '#c6bf80');
    gr.addColorStop(0.6, '#9d9658'); gr.addColorStop(1, '#2a2913');
    g.fillStyle = gr; g.fill();
    g.save(); g.clip();
    for (let i = 0; i < 9; i++) {
      const x = -8 + i * 2 + (rng() - 0.5);
      g.strokeStyle = 'rgba(40,35,10,' + (0.08 + rng() * 0.1).toFixed(3) + ')';
      g.lineWidth = 0.6;
      g.beginPath(); g.moveTo(x * 0.8, 0); g.lineTo(x, LA + 18); g.stroke();
    }
    g.restore();
    // cut end
    g.beginPath(); g.ellipse(0, 0, 7, 2.4, 0, 0, Math.PI * 2);
    g.fillStyle = '#d6cc96'; g.fill(); g.strokeStyle = 'rgba(70,60,25,0.8)'; g.lineWidth = 0.8; g.stroke();

    // leafy body silhouette
    const N = 80;
    const body = new Path2D();
    body.moveTo(-9, LA + 16);
    for (let i = 0; i <= N; i++) { const u = i / N; body.lineTo(-lulavHW(u), LA + (LT - LA) * u); }
    body.lineTo(0, LT - 12);
    for (let i = N; i >= 0; i--) { const u = i / N; body.lineTo(lulavHW(u), LA + (LT - LA) * u); }
    body.lineTo(9, LA + 16);
    body.closePath();
    gr = g.createLinearGradient(-21, 0, 21, 0);
    gr.addColorStop(0, '#11260b'); gr.addColorStop(0.18, '#2d5219'); gr.addColorStop(0.38, '#6f9a3c');
    gr.addColorStop(0.47, '#a5b85a'); gr.addColorStop(0.55, '#5f8a30'); gr.addColorStop(0.8, '#2a4c17');
    gr.addColorStop(1, '#0e2008');
    g.fillStyle = gr; g.fill(body);

    g.save(); g.clip(body);
    // leaflet edges: herringbone chevrons of the tightly closed leaflets
    for (let yb = LA + 6; yb > LT + 22; yb -= 8.2) {
      for (const s of [-1, 1]) {
        const ub = lulavU(yb);
        const len = 20 + 16 * (1 - ub) + (rng() - 0.5) * 3;
        const ye = yb - len;
        const ue = lulavU(ye);
        const ex = s * lulavHW(ue) * 1.03;
        const y0 = yb + (rng() - 0.5) * 1.5 + (s > 0 ? 4 : 0);
        g.beginPath();
        g.moveTo(s * 1.0, y0 + 1.3);
        g.quadraticCurveTo(s * lulavHW(ue) * 0.75, y0 - len * 0.4 + 1.3, ex, ye + 1.3);
        g.strokeStyle = 'rgba(215,228,150,0.20)'; g.lineWidth = 1.1; g.stroke();
        g.beginPath();
        g.moveTo(s * 1.0, y0);
        g.quadraticCurveTo(s * lulavHW(ue) * 0.75, y0 - len * 0.4, ex, ye);
        g.strokeStyle = 'rgba(8,22,4,0.55)'; g.lineWidth = 1.0; g.stroke();
      }
    }
    // longitudinal veins
    for (const s of [-1, 1]) {
      for (const k of [0.28, 0.5, 0.7, 0.88]) {
        g.beginPath();
        for (let i = 0; i <= 40; i++) {
          const u = i / 40; const y = LA + (LT - LA) * u;
          const x = s * lulavHW(u) * k;
          if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.strokeStyle = 'rgba(20,40,10,0.16)'; g.lineWidth = 0.6; g.stroke();
      }
    }
    // sheen band and golden tone toward the top
    gr = g.createLinearGradient(-20, 0, 20, 0);
    gr.addColorStop(0, 'rgba(255,236,170,0)'); gr.addColorStop(0.36, 'rgba(255,236,170,0.20)');
    gr.addColorStop(0.44, 'rgba(255,236,170,0)'); gr.addColorStop(1, 'rgba(255,236,170,0)');
    g.fillStyle = gr; g.fillRect(-25, LT - 20, 50, LA - LT + 40);
    gr = g.createLinearGradient(0, LA, 0, LT);
    gr.addColorStop(0, 'rgba(0,0,0,0.22)'); gr.addColorStop(0.3, 'rgba(0,0,0,0)');
    gr.addColorStop(0.75, 'rgba(210,190,90,0.10)'); gr.addColorStop(1, 'rgba(220,200,110,0.22)');
    g.fillStyle = gr; g.fillRect(-25, LT - 20, 50, LA - LT + 40);
    g.restore();

    // central spine (shidra)
    g.beginPath();
    const SN = 40;
    for (let i = 0; i <= SN; i++) { const u = i / SN; g.lineTo(-(2.6 * (1 - u) + 0.5), LA + 10 + (LT + 18 - LA - 10) * u); }
    for (let i = SN; i >= 0; i--) { const u = i / SN; g.lineTo(2.6 * (1 - u) + 0.5, LA + 10 + (LT + 18 - LA - 10) * u); }
    g.closePath();
    gr = g.createLinearGradient(-3, 0, 3, 0);
    gr.addColorStop(0, 'rgba(30,50,15,0.9)'); gr.addColorStop(0.4, 'rgba(215,220,150,0.95)');
    gr.addColorStop(0.7, 'rgba(120,140,60,0.9)'); gr.addColorStop(1, 'rgba(25,45,12,0.9)');
    g.fillStyle = gr; g.fill();

    g.strokeStyle = 'rgba(6,16,3,0.75)'; g.lineWidth = 1; g.stroke(body);

    // the very tip: two leaflet points barely apart (closed, intact)
    for (const s of [-1, 1]) {
      g.save(); g.translate(s * 0.8, LT + 6); g.rotate(s * 0.07);
      leafPath(g, 20, 1.6, 1.0, 0.2, 0.6, 0.7, 0);
      g.fillStyle = '#6a8a34'; g.fill(); g.strokeStyle = 'rgba(10,25,5,0.6)'; g.lineWidth = 0.5; g.stroke();
      g.restore();
    }
  }

  // ---------- HADASIM (myrtle, leaves in whorls of three) ----------
  function hadasLeaf(g, x, y, ang, len, w, tone, back) {
    g.save(); g.translate(x, y); g.rotate(ang);
    leafPath(g, len, w, 1.35, 0.22, 0.85, 0.72, 0);
    const gr = g.createLinearGradient(-w, 0, w, 0);
    const l = back ? -5 : 0;
    gr.addColorStop(0, 'hsl(118,48%,' + (9 + tone + l) + '%)');
    gr.addColorStop(0.42, 'hsl(112,46%,' + (21 + tone + l) + '%)');
    gr.addColorStop(0.6, 'hsl(100,42%,' + (31 + tone + l) + '%)');
    gr.addColorStop(1, 'hsl(118,48%,' + (11 + tone + l) + '%)');
    g.fillStyle = gr; g.fill();
    g.lineWidth = 0.7; g.strokeStyle = 'rgba(4,16,4,0.75)'; g.stroke();
    g.beginPath(); g.moveTo(0, -1); g.quadraticCurveTo(0.4, -len * 0.5, 0, -len * 0.86);
    g.strokeStyle = 'rgba(150,190,110,0.35)'; g.lineWidth = 0.55; g.stroke();
    if (!back) {
      g.beginPath(); g.ellipse(-w * 0.28, -len * 0.42, w * 0.22, len * 0.2, 0, 0, Math.PI * 2);
      g.fillStyle = 'rgba(225,255,205,0.13)'; g.fill();
    }
    g.restore();
  }
  function hadasBranch(g, bx, by, ang, L, rng) {
    const bend = (rng() - 0.5) * 16;
    const dx = Math.sin(ang), dy = -Math.cos(ang);
    const px = -dy, py = dx;
    const P = (s) => {
      const k = s / L, off = bend * Math.sin(Math.PI * k);
      return [bx + dx * s + px * off, by + dy * s + py * off];
    };
    const A = (s) => ang + (bend * Math.PI / L) * Math.cos(Math.PI * s / L);
    // woody stem
    for (let s = 0; s < L; s += 10) {
      const a = P(s), b = P(Math.min(L, s + 11));
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]);
      g.strokeStyle = '#3a2c16'; g.lineWidth = 3.6 - 2 * (s / L); g.lineCap = 'round'; g.stroke();
      g.beginPath(); g.moveTo(a[0] - 0.6, a[1]); g.lineTo(b[0] - 0.6, b[1]);
      g.strokeStyle = 'rgba(160,130,80,0.5)'; g.lineWidth = 0.8; g.stroke();
    }
    const nodes = [];
    for (let s = 95, i = 0; s < L - 14; s += 15.5, i++) nodes.push([s, i]);
    // top to bottom so lower leaves shingle over the upper ones
    for (let n = nodes.length - 1; n >= 0; n--) {
      const [s, i] = nodes[n];
      const k = s / L;
      const f = 1 - 0.5 * Math.pow(k, 2.4);
      const len = 27 * f, w = 9.5 * f;
      const p = P(s), a = A(s);
      const tone = (rng() - 0.5) * 5;
      const j = () => (rng() - 0.5) * 0.12;
      if (i % 2 === 0) {
        hadasLeaf(g, p[0], p[1], a - 0.72 + j(), len, w, tone - 2, false);
        hadasLeaf(g, p[0], p[1], a + 0.72 + j(), len, w, tone, false);
        hadasLeaf(g, p[0], p[1], a + j(), len * 0.86, w * 0.95, tone + 3, false);
      } else {
        hadasLeaf(g, p[0], p[1], a + j() * 0.5, len * 0.95, w * 0.8, tone - 3, true);
        hadasLeaf(g, p[0], p[1], a - 0.4 + j(), len * 0.95, w * 0.78, tone, false);
        hadasLeaf(g, p[0], p[1], a + 0.4 + j(), len * 0.95, w * 0.78, tone + 2, false);
      }
    }
    // terminal bud cluster
    const p = P(L - 4), a = A(L);
    hadasLeaf(g, p[0], p[1], a - 0.35, 12, 4.5, 2, false);
    hadasLeaf(g, p[0], p[1], a + 0.35, 12, 4.5, 3, false);
    hadasLeaf(g, p[0], p[1], a, 14, 4.2, 6, false);
  }

  // ---------- ARAVOT (willow) ----------
  function aravaLeaf(g, x, y, ang, len, w, curve, under, tone) {
    g.save(); g.translate(x, y); g.rotate(ang);
    // petiole
    g.beginPath(); g.moveTo(0, 0); g.lineTo(curve * 0.2, -4);
    g.strokeStyle = '#8a3a22'; g.lineWidth = 1.1; g.stroke();
    g.translate(curve * 0.2, -4);
    leafPath(g, len, w, 1.25, 0.25, 0.55, 0.72, curve);
    const gr = g.createLinearGradient(-w, 0, w, 0);
    if (under) {
      gr.addColorStop(0, '#5f7a52'); gr.addColorStop(0.5, '#a9bf96'); gr.addColorStop(1, '#6a8660');
    } else {
      gr.addColorStop(0, 'hsl(100,50%,' + (15 + tone) + '%)');
      gr.addColorStop(0.45, 'hsl(96,46%,' + (33 + tone) + '%)');
      gr.addColorStop(0.62, 'hsl(90,44%,' + (44 + tone) + '%)');
      gr.addColorStop(1, 'hsl(100,50%,' + (18 + tone) + '%)');
    }
    g.fillStyle = gr; g.fill();
    g.lineWidth = 0.6; g.strokeStyle = 'rgba(12,30,8,0.7)'; g.stroke();
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(curve * 1.0, -len * 0.5, curve * 2.3, -len * 0.95);
    g.strokeStyle = under ? 'rgba(235,240,215,0.6)' : 'rgba(225,235,170,0.45)'; g.lineWidth = 0.6; g.stroke();
    g.restore();
  }
  function aravaBranch(g, bx, by, ang, L, rng) {
    const bend = (rng() - 0.5) * 18;
    const dx = Math.sin(ang), dy = -Math.cos(ang);
    const px = -dy, py = dx;
    const P = (s) => { const k = s / L, off = bend * Math.sin(Math.PI * k); return [bx + dx * s + px * off, by + dy * s + py * off]; };
    const A = (s) => ang + (bend * Math.PI / L) * Math.cos(Math.PI * s / L);
    for (let s = 0; s < L; s += 10) {
      const a = P(s), b = P(Math.min(L, s + 11));
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]);
      g.strokeStyle = '#7a2a1a'; g.lineWidth = 3.4 - 1.9 * (s / L); g.lineCap = 'round'; g.stroke();
      g.beginPath(); g.moveTo(a[0] - 0.6, a[1]); g.lineTo(b[0] - 0.6, b[1]);
      g.strokeStyle = 'rgba(215,110,70,0.55)'; g.lineWidth = 0.8; g.stroke();
    }
    let side = rng() < 0.5 ? -1 : 1;
    for (let s = 105; s < L - 12; s += 19 + rng() * 5) {
      const k = s / L;
      let len = 80 - 18 * k + (rng() - 0.5) * 10;
      if (k > 0.84) len *= lerp(1, 0.5, (k - 0.84) / 0.16);
      const w = 3.2 + 2.2 * (len / 80);
      const p = P(s), a = A(s);
      const ang2 = a + side * (0.26 + rng() * 0.14);
      aravaLeaf(g, p[0], p[1], ang2, len, w, side * (1 + rng() * 1.5), rng() < 0.22, (rng() - 0.5) * 6);
      side = -side;
    }
    // intact tip: young narrow leaves converging
    const p = P(L - 6), a = A(L);
    aravaLeaf(g, p[0], p[1], a - 0.12, 30, 2.6, -0.4, false, 6);
    aravaLeaf(g, p[0], p[1], a + 0.12, 27, 2.6, 0.4, false, 8);
    aravaLeaf(g, p[0], p[1], a + 0.02, 34, 2.4, 0, false, 10);
  }

  // ---------- ETROG ----------
  const ETROG_REST_A = -1.38;
  function etrogOutline(g) {
    const N = 180;
    g.beginPath();
    for (let i = 0; i <= N; i++) {
      const th = (i / N) * Math.PI * 2;
      const c = Math.cos(th), s = Math.sin(th);
      let x = 80 * c, y = 104 * s;
      if (s < 0) { x *= 1 - 0.2 * -s; y *= 1 + 0.1 * Math.pow(-s, 5); } else { y *= 0.95; }
      const r = 1 + 0.012 * Math.sin(7 * th + 1) + 0.008 * Math.sin(13 * th + 2) + 0.005 * Math.sin(23 * th + 0.5);
      x *= r; y *= r;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath();
  }
  function drawEtrog(g, rng) {
    // light direction in sprite space, correct for the rest pose
    const Lw = [-0.45, -0.89];
    const ca = Math.cos(-ETROG_REST_A), sa = Math.sin(-ETROG_REST_A);
    const Lx = Lw[0] * ca - Lw[1] * sa, Ly = Lw[0] * sa + Lw[1] * ca;
    const hx = Lx * 0.42 * 80, hy = Ly * 0.42 * 104;

    // stem button at the bottom (oketz)
    g.beginPath(); g.ellipse(0, 98, 7, 4, 0, 0, Math.PI * 2);
    g.fillStyle = '#5b5a24'; g.fill();

    etrogOutline(g);
    let gr = g.createRadialGradient(hx, hy, 4, hx * 0.4, hy * 0.4, 150);
    gr.addColorStop(0, '#fff5b0'); gr.addColorStop(0.2, '#ffe16a'); gr.addColorStop(0.5, '#f0bd2c');
    gr.addColorStop(0.78, '#c68912'); gr.addColorStop(1, '#6b4208');
    g.fillStyle = gr; g.fill();
    g.save(); etrogOutline(g); g.clip();
    // soft green-lime patches, esp. near pitam and stem
    const blob = (x, y, r, col) => {
      const gg = g.createRadialGradient(x, y, 0, x, y, r);
      gg.addColorStop(0, col); gg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gg; g.fillRect(x - r, y - r, 2 * r, 2 * r);
    };
    blob(0, -108, 46, 'rgba(140,150,30,0.45)');
    blob(0, 100, 34, 'rgba(130,140,30,0.35)');
    for (let i = 0; i < 6; i++) blob((rng() - 0.5) * 120, (rng() - 0.5) * 160, 20 + rng() * 30, 'rgba(170,165,40,0.12)');
    // bumpy peel
    for (let i = 0; i < 1500; i++) {
      const a = rng() * Math.PI * 2, rr = Math.sqrt(rng());
      const x = Math.cos(a) * rr * 84, y = Math.sin(a) * rr * 112;
      const d = rr;
      const r = (2.2 + rng() * 3.6) * (1 - 0.4 * d * d);
      const fade = 1 - Math.pow(d, 4);
      g.beginPath(); g.arc(x - Lx * r * 0.35, y - Ly * r * 0.35, r, 0, Math.PI * 2);
      g.fillStyle = 'rgba(110,60,0,' + (0.16 * fade).toFixed(3) + ')'; g.fill();
      g.beginPath(); g.arc(x + Lx * r * 0.3, y + Ly * r * 0.3, r * 0.7, 0, Math.PI * 2);
      g.fillStyle = 'rgba(255,248,200,' + (0.17 * fade).toFixed(3) + ')'; g.fill();
    }
    // oil-gland pores
    for (let i = 0; i < 2400; i++) {
      const a = rng() * Math.PI * 2, rr = Math.sqrt(rng());
      g.beginPath(); g.arc(Math.cos(a) * rr * 84, Math.sin(a) * rr * 112, 0.5 + rng() * 0.6, 0, Math.PI * 2);
      g.fillStyle = 'rgba(120,70,0,0.2)'; g.fill();
    }
    // form shading (terminator opposite the light)
    gr = g.createRadialGradient(hx * 0.9, hy * 0.9, 40, hx * 0.3, hy * 0.3, 140);
    gr.addColorStop(0, 'rgba(60,30,0,0)'); gr.addColorStop(0.6, 'rgba(60,30,0,0.18)'); gr.addColorStop(1, 'rgba(40,18,0,0.7)');
    g.fillStyle = gr; g.fillRect(-120, -150, 240, 280);
    // specular highlight
    g.save(); g.translate(hx, hy); g.rotate(Math.atan2(Ly, Lx) + Math.PI / 2);
    gr = g.createRadialGradient(0, 0, 0, 0, 0, 30);
    gr.addColorStop(0, 'rgba(255,255,245,0.85)'); gr.addColorStop(0.25, 'rgba(255,252,225,0.45)'); gr.addColorStop(1, 'rgba(255,250,220,0)');
    g.scale(1.3, 0.75); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 30, 0, Math.PI * 2); g.fill();
    g.restore();
    // rim bounce light on the far side
    gr = g.createRadialGradient(-hx * 1.6, -hy * 1.6, 20, -hx * 1.6, -hy * 1.6, 70);
    gr.addColorStop(0, 'rgba(255,190,110,0.22)'); gr.addColorStop(1, 'rgba(255,190,110,0)');
    g.fillStyle = gr; g.fillRect(-120, -150, 240, 280);
    g.restore();
    etrogOutline(g); g.strokeStyle = 'rgba(80,45,0,0.5)'; g.lineWidth = 1; g.stroke();

    // pitam: a slender dry style with a small stigma knob
    g.beginPath(); g.ellipse(0, -113, 7, 3.5, 0, 0, Math.PI * 2); g.fillStyle = 'rgba(120,120,30,0.9)'; g.fill();
    g.beginPath();
    g.moveTo(-2.6, -113); g.quadraticCurveTo(-2.2, -122, -1.6, -129); g.lineTo(1.6, -129); g.quadraticCurveTo(2.2, -122, 2.6, -113);
    g.closePath();
    gr = g.createLinearGradient(-3, 0, 3, 0);
    gr.addColorStop(0, '#4a3814'); gr.addColorStop(0.45, '#a88a4a'); gr.addColorStop(1, '#3e2d10');
    g.fillStyle = gr; g.fill();
    g.beginPath(); g.ellipse(0, -131, 3.8, 3.2, 0, 0, Math.PI * 2);
    gr = g.createRadialGradient(-1, -132.5, 0.3, 0, -131, 4);
    gr.addColorStop(0, '#b08a55'); gr.addColorStop(0.5, '#5a3a1a'); gr.addColorStop(1, '#2d1c0a');
    g.fillStyle = gr; g.fill();
    return { hx, hy };
  }

  // ---------- WOVEN PALM RINGS (koishiklach) ----------
  function drawWeave(g, w, h, rng) {
    const rrect = () => {
      const r = Math.min(4, h * 0.3);
      g.beginPath();
      g.moveTo(-w / 2 + r, -h / 2); g.lineTo(w / 2 - r, -h / 2); g.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
      g.lineTo(w / 2, h / 2 - r); g.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
      g.lineTo(-w / 2 + r, h / 2); g.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
      g.lineTo(-w / 2, -h / 2 + r); g.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2); g.closePath();
    };
    g.save(); rrect(); g.clip();
    g.fillStyle = '#5e5424'; g.fillRect(-w, -h, 2 * w, 2 * h);
    const cell = h > 30 ? 7 : 5;
    for (let i = -30; i <= 30; i++) {
      for (let j = -30; j <= 30; j++) {
        const u = i * cell, v = j * cell;
        const x = (u - v) * 0.7071, y = (u + v) * 0.7071;
        if (Math.abs(x) > w / 2 + cell || Math.abs(y) > h / 2 + cell) continue;
        const odd = (i + j) & 1;
        const hc = cell * 0.66;
        g.beginPath(); g.moveTo(x, y - hc); g.lineTo(x + hc, y); g.lineTo(x, y + hc); g.lineTo(x - hc, y); g.closePath();
        const t = rng() * 8;
        g.fillStyle = odd ? 'hsl(50,45%,' + (52 + t) + '%)' : 'hsl(58,40%,' + (38 + t) + '%)';
        g.fill();
        g.beginPath();
        if (odd) { g.moveTo(x - hc * 0.5, y - hc * 0.5); g.lineTo(x + hc * 0.5, y + hc * 0.5); }
        else { g.moveTo(x - hc * 0.5, y + hc * 0.5); g.lineTo(x + hc * 0.5, y - hc * 0.5); }
        g.strokeStyle = 'rgba(255,250,210,0.28)'; g.lineWidth = 0.6; g.stroke();
      }
    }
    const gr = g.createLinearGradient(-w / 2, 0, w / 2, 0);
    gr.addColorStop(0, 'rgba(10,8,0,0.75)'); gr.addColorStop(0.22, 'rgba(10,8,0,0.15)');
    gr.addColorStop(0.38, 'rgba(255,240,190,0.22)'); gr.addColorStop(0.55, 'rgba(0,0,0,0)');
    gr.addColorStop(1, 'rgba(10,8,0,0.8)');
    g.fillStyle = gr; g.fillRect(-w, -h, 2 * w, 2 * h);
    g.restore();
    // rolled rims
    for (const yy of [-h / 2, h / 2]) {
      g.beginPath(); g.moveTo(-w / 2, yy); g.quadraticCurveTo(0, yy + (yy < 0 ? 2.5 : 2.5), w / 2, yy);
      g.strokeStyle = 'rgba(200,180,100,0.9)'; g.lineWidth = h > 30 ? 3 : 1.6; g.stroke();
      g.strokeStyle = 'rgba(40,30,5,0.6)'; g.lineWidth = 0.6; g.stroke();
    }
    rrect(); g.strokeStyle = 'rgba(20,15,0,0.6)'; g.lineWidth = 0.8; g.stroke();
  }

  // ---------- SILVER ETROG BOX ----------
  const FL = 1135, FR = 1445, FT = 700, FB = 795;
  const BL = 1114, BR = 1387, BT = 652;
  const FOOT = 808;
  const LIDY = 548;
  function silverGrad(g, x0, y0, x1, y1, k) {
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    k = k || 1;
    gr.addColorStop(0, 'rgb(' + [245, 238, 222].map((v) => Math.round(v * k)).join(',') + ')');
    gr.addColorStop(0.1, 'rgb(' + [185, 178, 160].map((v) => Math.round(v * k)).join(',') + ')');
    gr.addColorStop(0.5, 'rgb(' + [118, 112, 100].map((v) => Math.round(v * k)).join(',') + ')');
    gr.addColorStop(0.85, 'rgb(' + [62, 58, 50].map((v) => Math.round(v * k)).join(',') + ')');
    gr.addColorStop(1, 'rgb(' + [34, 32, 28].map((v) => Math.round(v * k)).join(',') + ')');
    return gr;
  }
  function drawBoxBack(g, rng) {
    // lid (open, leaning back), inner face visible
    g.beginPath(); g.moveTo(BL, BT); g.lineTo(BR, BT); g.lineTo(1380, LIDY); g.lineTo(1121, LIDY); g.closePath();
    g.fillStyle = silverGrad(g, 0, LIDY, 0, BT, 0.85); g.fill();
    g.strokeStyle = 'rgba(20,18,14,0.8)'; g.lineWidth = 1; g.stroke();
    // lid top edge thickness
    g.beginPath(); g.moveTo(1121, LIDY); g.lineTo(1380, LIDY); g.lineTo(1378, LIDY - 7); g.lineTo(1123, LIDY - 7); g.closePath();
    g.fillStyle = '#d9d2bf'; g.fill();
    // velvet panel inside the lid
    g.beginPath(); g.moveTo(BL + 12, BT - 4); g.lineTo(BR - 12, BT - 4); g.lineTo(1368, LIDY + 10); g.lineTo(1133, LIDY + 10); g.closePath();
    let gr = g.createLinearGradient(0, LIDY, 0, BT);
    gr.addColorStop(0, '#5a1a1c'); gr.addColorStop(1, '#2a0a0c');
    g.fillStyle = gr; g.fill();
    g.strokeStyle = 'rgba(210,170,90,0.55)'; g.lineWidth = 1; g.stroke();
    // interior (velvet lined)
    g.beginPath(); g.moveTo(FL, FT); g.lineTo(FR, FT); g.lineTo(BR, BT); g.lineTo(BL, BT); g.closePath();
    gr = g.createLinearGradient(0, BT, 0, FT);
    gr.addColorStop(0, '#1e0708'); gr.addColorStop(1, '#4a1416');
    g.fillStyle = gr; g.fill();
    // back rim
    g.beginPath(); g.moveTo(BL, BT); g.lineTo(BR, BT); g.strokeStyle = '#cfc7b2'; g.lineWidth = 2.5; g.stroke();
    // right wall inner edge
    g.beginPath(); g.moveTo(FR, FT); g.lineTo(BR, BT); g.strokeStyle = '#8e887a'; g.lineWidth = 3; g.stroke();
    // folded silk cushion
    const silk = new Path2D();
    silk.moveTo(FL + 4, FT);
    silk.lineTo(BL + 12, 676);
    silk.bezierCurveTo(1150, 660, 1180, 672, 1205, 664);
    silk.bezierCurveTo(1240, 654, 1270, 670, 1300, 662);
    silk.bezierCurveTo(1330, 655, 1360, 668, BR - 8, 666);
    silk.lineTo(FR - 4, FT);
    silk.closePath();
    gr = g.createLinearGradient(1130, 660, 1450, 700);
    gr.addColorStop(0, '#c9ae70'); gr.addColorStop(0.3, '#f2e2b2'); gr.addColorStop(0.55, '#b89556');
    gr.addColorStop(0.8, '#ecd8a0'); gr.addColorStop(1, '#8a6a34');
    g.fillStyle = gr; g.fill(silk);
    g.save(); g.clip(silk);
    for (let i = 0; i < 9; i++) {
      const x = 1140 + i * 36 + rng() * 14;
      g.beginPath(); g.moveTo(x, 700); g.bezierCurveTo(x + 8, 690, x - 10, 675, x + 6, 660);
      g.strokeStyle = 'rgba(95,65,20,0.35)'; g.lineWidth = 5; g.stroke();
      g.beginPath(); g.moveTo(x + 7, 700); g.bezierCurveTo(x + 15, 690, x - 3, 675, x + 13, 660);
      g.strokeStyle = 'rgba(255,248,220,0.45)'; g.lineWidth = 2; g.stroke();
    }
    g.restore();
  }
  function drawBoxFront(g, rng) {
    // left outer side face
    g.beginPath(); g.moveTo(FL, FT); g.lineTo(BL, BT); g.lineTo(BL, BT + 90); g.lineTo(FL, FB); g.closePath();
    let gr = g.createLinearGradient(BL, 0, FL, 0);
    gr.addColorStop(0, '#2a2824'); gr.addColorStop(1, '#6e695e');
    g.fillStyle = gr; g.fill();
    // front face
    g.fillStyle = silverGrad(g, 0, FT, 0, FB, 1);
    g.fillRect(FL, FT, FR - FL, FB - FT);
    // horizontal reflection streaks
    gr = g.createLinearGradient(FL, 0, FR, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.2, 'rgba(255,245,220,0.22)');
    gr.addColorStop(0.3, 'rgba(255,255,255,0)'); gr.addColorStop(0.72, 'rgba(0,0,0,0.12)');
    gr.addColorStop(0.85, 'rgba(255,240,210,0.18)'); gr.addColorStop(1, 'rgba(0,0,0,0.2)');
    g.fillStyle = gr; g.fillRect(FL, FT, FR - FL, FB - FT);
    // engraved border
    const eng = (fn) => {
      g.save(); g.translate(0.8, 0.8); fn(); g.strokeStyle = 'rgba(255,250,235,0.35)'; g.lineWidth = 0.9; g.stroke(); g.restore();
      fn(); g.strokeStyle = 'rgba(30,26,18,0.55)'; g.lineWidth = 0.9; g.stroke();
    };
    eng(() => { g.beginPath(); g.rect(FL + 7, FT + 10, FR - FL - 14, FB - FT - 17); });
    eng(() => { g.beginPath(); g.rect(FL + 10, FT + 13, FR - FL - 20, FB - FT - 23); });
    // scrolling vine
    eng(() => {
      g.beginPath();
      for (let x = FL + 16; x <= FR - 16; x += 2) {
        const y = 748 + 13 * Math.sin((x - FL) / 17);
        if (x === FL + 16) g.moveTo(x, y); else g.lineTo(x, y);
      }
    });
    for (let x = FL + 16 + 17 * Math.PI / 2; x < FR - 20; x += 17 * Math.PI) {
      for (const s of [1, -1]) {
        const xx = x + (s < 0 ? 17 * Math.PI : 0);
        if (xx > FR - 24) continue;
        const yy = 748 + 13 * s;
        eng(() => { g.beginPath(); g.arc(xx + 5, yy - s * 6, 5, 0, Math.PI * 1.6); });
        eng(() => { g.beginPath(); g.ellipse(xx - 6, yy - s * 4, 4, 2, 0.6 * s, 0, Math.PI * 2); });
      }
    }
    // medallion
    g.beginPath(); g.ellipse(1372, 748, 30, 22, 0, 0, Math.PI * 2);
    g.fillStyle = silverGrad(g, 0, 726, 0, 770, 1.08); g.fill();
    eng(() => { g.beginPath(); g.ellipse(1372, 748, 30, 22, 0, 0, Math.PI * 2); });
    eng(() => { g.beginPath(); g.ellipse(1372, 748, 25, 17, 0, 0, Math.PI * 2); });
    // small engraved pomegranate in the medallion
    eng(() => { g.beginPath(); g.arc(1372, 751, 8, 0, Math.PI * 2); });
    eng(() => { g.beginPath(); g.moveTo(1368, 743); g.lineTo(1369, 738); g.lineTo(1372, 741); g.lineTo(1375, 738); g.lineTo(1376, 743); });
    // top rim
    gr = g.createLinearGradient(0, FT - 5, 0, FT + 5);
    gr.addColorStop(0, '#fffaf0'); gr.addColorStop(0.5, '#bdb5a2'); gr.addColorStop(1, '#4a463c');
    g.fillStyle = gr; g.fillRect(FL - 3, FT - 4, FR - FL + 6, 9);
    g.beginPath(); g.moveTo(FL - 2, FT - 3); g.lineTo(BL - 1, BT); g.strokeStyle = '#e8e0cc'; g.lineWidth = 3; g.stroke();
    // bottom molding
    g.fillStyle = silverGrad(g, 0, FB - 3, 0, FB + 5, 0.9); g.fillRect(FL - 4, FB - 3, FR - FL + 8, 8);
    // ball feet
    for (const fx of [FL + 16, FR - 16]) {
      g.beginPath(); g.ellipse(fx, FB + 7, 8, 6.5, 0, 0, Math.PI * 2);
      gr = g.createRadialGradient(fx - 3, FB + 4, 1, fx, FB + 7, 9);
      gr.addColorStop(0, '#f8f2e4'); gr.addColorStop(0.5, '#8d877a'); gr.addColorStop(1, '#2c2a24');
      g.fillStyle = gr; g.fill();
    }
    // silk flap draped over the front wall
    const flap = new Path2D();
    flap.moveTo(1150, FT - 6);
    flap.bezierCurveTo(1200, FT - 12, 1250, FT - 4, 1296, FT - 8);
    flap.bezierCurveTo(1290, 725, 1270, 745, 1262, 768);
    flap.bezierCurveTo(1245, 772, 1230, 786, 1214, 790);
    flap.bezierCurveTo(1198, 780, 1180, 776, 1168, 760);
    flap.bezierCurveTo(1160, 740, 1150, 720, 1150, FT - 6);
    flap.closePath();
    gr = g.createLinearGradient(1150, 0, 1296, 0);
    gr.addColorStop(0, '#8a6a34'); gr.addColorStop(0.18, '#e8d6a2'); gr.addColorStop(0.35, '#a9884a');
    gr.addColorStop(0.55, '#f6e8bf'); gr.addColorStop(0.75, '#b59352'); gr.addColorStop(1, '#6e5226');
    g.fillStyle = gr; g.fill(flap);
    g.save(); g.clip(flap);
    gr = g.createLinearGradient(0, FT, 0, 792);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(40,25,5,0.5)');
    g.fillStyle = gr; g.fillRect(1140, FT - 12, 170, 110);
    for (const [x0, x1] of [[1175, 1190], [1212, 1214], [1250, 1238]]) {
      g.beginPath(); g.moveTo(x0, FT - 6); g.quadraticCurveTo((x0 + x1) / 2 + 4, 740, x1, 790);
      g.strokeStyle = 'rgba(90,60,15,0.35)'; g.lineWidth = 4; g.stroke();
      g.beginPath(); g.moveTo(x0 + 6, FT - 6); g.quadraticCurveTo((x0 + x1) / 2 + 10, 740, x1 + 6, 790);
      g.strokeStyle = 'rgba(255,248,222,0.4)'; g.lineWidth = 1.6; g.stroke();
    }
    g.restore();
    // fringe tassels at the tip of the flap
    for (let i = 0; i < 7; i++) {
      const x = 1200 + i * 4;
      g.beginPath(); g.moveTo(x, 786 + Math.abs(i - 3)); g.lineTo(x + 0.5, 796 + Math.abs(i - 3));
      g.strokeStyle = 'rgba(220,190,120,0.8)'; g.lineWidth = 1; g.stroke();
    }
  }

  // ---------- layout / timeline ----------
  const BASE = [780, 806];                  // bundle / lulav base
  const OFF_A = [-20, -6, -0.055];          // aravot offset in bundle frame
  const OFF_H = [20, -26, 0.06];            // hadasim offset in bundle frame
  const SOLO_H = [1010, 800, 0.1];
  const SOLO_A = [548, 806, -0.1];
  const ETROG_REST = [1268, 648];
  const RING_Y = [-80, -330, -480];

  function camera(t) {
    const p = t / DUR;
    const s = 1 + 0.1 * (0.55 * p + 0.45 * smooth(p));
    return { s, fx: 960 - 30 * eIOS(p), fy: 470, cx: 960, cy: 470 };
  }
  function bundleFrame(t) {
    return { x: BASE[0], y: BASE[1] + 4 * Math.sin(0.8 * t), a: 0.012 * Math.sin(0.55 * t + 0.4) };
  }
  function inBundle(B, off) {
    const c = Math.cos(B.a), s = Math.sin(B.a);
    return [B.x + off[0] * c - off[1] * s, B.y + off[0] * s + off[1] * c, B.a + off[2]];
  }

  let A = null; // assets

  S.scenes[3] = {
    duration: DUR,

    init(env) {
      if (A) return;
      const rng = mulberry32(0x5eed3);
      A = {};

      // --- species sprites ---
      A.lulav = sprite(80, 770, 40, 745, (g) => drawLulav(g, rng));
      A.hadas = sprite(170, 540, 85, 520, (g) => {
        hadasBranch(g, -7, 0, -0.07, 470, rng);
        hadasBranch(g, 7, 2, 0.08, 455, rng);
        hadasBranch(g, 0, 0, 0.0, 492, rng);
      });
      A.arava = sprite(190, 540, 95, 520, (g) => {
        aravaBranch(g, -5, 0, -0.06, 468, rng);
        aravaBranch(g, 6, 1, 0.07, 452, rng);
      });
      let hl = null;
      A.etrog = sprite(210, 280, 105, 150, (g) => { hl = drawEtrog(g, rng); });
      A.etrogHL = hl;
      A.lulavB = blurred(A.lulav, 6);
      A.hadasB = blurred(A.hadas, 6);
      A.aravaB = blurred(A.arava, 6);
      A.etrogB = blurred(A.etrog, 6);

      // rings
      A.holder = sprite(76, 70, 38, 35, (g) => drawWeave(g, 68, 60, rng));
      A.ring1 = sprite(46, 20, 23, 10, (g) => drawWeave(g, 2 * lulavHW(lulavU(RING_Y[1])) + 7, 13, rng));
      A.ring2 = sprite(40, 20, 20, 10, (g) => drawWeave(g, 2 * lulavHW(lulavU(RING_Y[2])) + 7, 13, rng));

      // bundle highlight sprite (for the light sweep)
      const hlCol = 'rgba(255,238,195,0.92)';
      const lH = tinted(A.lulav, hlCol), hH = tinted(A.hadas, hlCol), aH = tinted(A.arava, hlCol);
      const r0H = tinted(A.holder, hlCol), r1H = tinted(A.ring1, hlCol), r2H = tinted(A.ring2, hlCol);
      A.bundleHL = sprite(320, 820, 160, 790, (g) => {
        const put = (sp, x, y, a) => { g.save(); g.translate(x, y); g.rotate(a); g.drawImage(sp.c, -sp.ox, -sp.oy, sp.w, sp.h); g.restore(); };
        put(aH, OFF_A[0], OFF_A[1], OFF_A[2]);
        put(hH, OFF_H[0], OFF_H[1], OFF_H[2]);
        put(lH, 0, 0, 0);
        put(r0H, 0, RING_Y[0], 0); put(r1H, 0, RING_Y[1], 0); put(r2H, 0, RING_Y[2], 0);
      });
      A.scratch = canvas(A.bundleHL.c.width, A.bundleHL.c.height);
      A.scratchG = A.scratch.getContext('2d');

      // box
      A.boxBack = sprite(400, 330, -1070, -500, (g) => drawBoxBack(g, rng));
      A.boxFront = sprite(400, 330, -1070, -500, (g) => drawBoxFront(g, rng));
      A.boxRefl = sprite(400, 130, -1070, -800, (g) => {
        g.save(); g.translate(0, 2 * FOOT + 2); g.scale(1, -1);
        g.drawImage(A.boxFront.c, 1070, 500, 400, 330);
        g.restore();
        g.globalCompositeOperation = 'destination-in';
        const gr = g.createLinearGradient(0, FOOT, 0, FOOT + 70);
        gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.fillRect(1070, 800, 400, 130);
      });

      // soft shadow blob
      A.shadow = sprite(200, 60, 100, 30, (g) => {
        g.scale(1, 0.25);
        const gr = g.createRadialGradient(0, 0, 0, 0, 0, 100);
        gr.addColorStop(0, 'rgba(0,0,0,0.9)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 100, 0, Math.PI * 2); g.fill();
      }, 1);

      // --- background (half resolution, blurred = depth of field) ---
      const BW = 2080, BH = 1200, BX = -80, BY = -60; // world rect covered
      const bgRaw = canvas(BW / 2, BH / 2);
      {
        const g = bgRaw.getContext('2d');
        g.scale(0.5, 0.5); g.translate(-BX, -BY);
        let gr = g.createLinearGradient(0, BY, 0, 730);
        gr.addColorStop(0, '#0a0905'); gr.addColorStop(0.55, '#1c170b'); gr.addColorStop(1, '#2a2210');
        g.fillStyle = gr; g.fillRect(BX, BY, BW, 800);
        // drape folds
        for (let i = 0; i < 70; i++) {
          const x = BX + i * 31 + rng() * 10, w = 26 + rng() * 30;
          const gg = g.createLinearGradient(x, 0, x + w, 0);
          const a = 0.05 + rng() * 0.08;
          gg.addColorStop(0, 'rgba(110,88,40,0)'); gg.addColorStop(0.5, 'rgba(110,88,40,' + a.toFixed(3) + ')'); gg.addColorStop(1, 'rgba(110,88,40,0)');
          g.fillStyle = gg; g.fillRect(x, BY, w, 790);
        }
        g.globalCompositeOperation = 'lighter';
        // spotlight wash and halos behind the subjects
        const glow = (x, y, r, col) => {
          const gg = g.createRadialGradient(x, y, 0, x, y, r);
          gg.addColorStop(0, col); gg.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = gg; g.fillRect(x - r, y - r, 2 * r, 2 * r);
        };
        glow(900, 360, 760, 'rgba(120,85,35,0.55)');
        glow(780, 420, 360, 'rgba(150,105,45,0.35)');
        glow(1270, 560, 300, 'rgba(130,90,40,0.3)');
        // light cone from above
        g.beginPath(); g.moveTo(820, BY); g.lineTo(1080, BY); g.lineTo(1600, 760); g.lineTo(300, 760); g.closePath();
        gr = g.createLinearGradient(0, BY, 0, 760);
        gr.addColorStop(0, 'rgba(255,215,140,0.10)'); gr.addColorStop(1, 'rgba(255,200,120,0.02)');
        g.fillStyle = gr; g.fill();
        // bokeh
        for (let i = 0; i < 34; i++) {
          const x = BX + 80 + rng() * (BW - 160), y = 40 + rng() * 560, r = 10 + rng() * 38;
          const a = 0.05 + rng() * 0.12;
          const gg = g.createRadialGradient(x, y, 0, x, y, r);
          gg.addColorStop(0, 'rgba(255,200,120,' + (a * 0.6).toFixed(3) + ')');
          gg.addColorStop(0.85, 'rgba(255,205,130,' + a.toFixed(3) + ')');
          gg.addColorStop(1, 'rgba(255,205,130,0)');
          g.fillStyle = gg; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
        }
        g.globalCompositeOperation = 'source-over';
        // table surface (dark polished wood)
        gr = g.createLinearGradient(0, 725, 0, BY + BH);
        gr.addColorStop(0, '#3b2c15'); gr.addColorStop(0.15, '#21180b'); gr.addColorStop(0.5, '#0e0b06'); gr.addColorStop(1, '#070504');
        g.fillStyle = gr; g.fillRect(BX, 725, BW, BY + BH - 725);
        for (let i = 0; i < 40; i++) {
          const y = 730 + Math.pow(rng(), 1.6) * 360;
          g.fillStyle = 'rgba(' + (rng() < 0.5 ? '90,65,30' : '10,6,2') + ',' + (0.08 + rng() * 0.1).toFixed(3) + ')';
          g.fillRect(BX, y, BW, 1 + rng() * 3);
        }
        g.globalCompositeOperation = 'lighter';
        g.save(); g.translate(1000, 800); g.scale(1, 0.18);
        const pool = g.createRadialGradient(0, 0, 0, 0, 0, 760);
        pool.addColorStop(0, 'rgba(255,190,100,0.28)'); pool.addColorStop(1, 'rgba(255,190,100,0)');
        g.fillStyle = pool; g.fillRect(-760, -760, 1520, 1520);
        g.restore();
        g.fillStyle = 'rgba(255,215,150,0.10)'; g.fillRect(BX, 724, BW, 3);
        g.globalCompositeOperation = 'source-over';
      }
      A.bg = canvas(BW / 2, BH / 2);
      {
        const g = A.bg.getContext('2d');
        g.drawImage(bgRaw, 0, 0);
        g.filter = 'blur(5px)';
        g.drawImage(bgRaw, 0, 0);
        g.filter = 'none';
      }
      A.bgRect = [BX, BY, BW, BH];

      // --- particles ---
      const dot = (r, blur, fn) => {
        const size = Math.ceil(r * 2 + blur * 4 + 4);
        const c = canvas(size, size);
        const g = c.getContext('2d');
        if (blur) g.filter = 'blur(' + blur + 'px)';
        fn(g, size / 2, r);
        return c;
      };
      A.dotSharp = dot(6, 0, (g, c, r) => {
        const gr = g.createRadialGradient(c, c, 0, c, c, r);
        gr.addColorStop(0, 'rgba(255,245,210,1)'); gr.addColorStop(0.35, 'rgba(255,210,130,0.5)'); gr.addColorStop(1, 'rgba(255,190,100,0)');
        g.fillStyle = gr; g.fillRect(0, 0, 2 * c, 2 * c);
      });
      A.dotBokeh = dot(24, 3, (g, c, r) => {
        g.fillStyle = 'rgba(255,210,140,0.55)'; g.beginPath(); g.arc(c, c, r, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(255,225,170,0.6)'; g.lineWidth = 2.5; g.stroke();
      });
      A.dust = [];
      for (let i = 0; i < 160; i++) {
        const z = 0.35 + rng() * 1.2;
        A.dust.push({
          x: 260 + rng() * 1400, y: rng() * 900, z,
          v: 5 + rng() * 14, ax: 8 + rng() * 34, f: 0.12 + rng() * 0.35, ph: rng() * 6.283,
          tw: 0.6 + rng() * 2.2, a: 0.25 + rng() * 0.6, big: z > 1.35,
        });
      }
      A.orbs = [
        [110, 200, 120, 0.09], [1800, 150, 95, 0.08], [1740, 560, 140, 0.07],
        [230, 640, 85, 0.06], [1520, 80, 60, 0.07], [60, 430, 70, 0.06], [1880, 380, 60, 0.05],
      ].map((o) => ({ x: o[0], y: o[1], r: o[2], a: o[3], ph: rng() * 6.283 }));
      A.orb = dot(64, 10, (g, c, r) => {
        const gr = g.createRadialGradient(c, c, 0, c, c, r);
        gr.addColorStop(0, 'rgba(255,200,120,0.6)'); gr.addColorStop(0.8, 'rgba(255,205,130,0.8)'); gr.addColorStop(1, 'rgba(255,205,130,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(c, c, r, 0, Math.PI * 2); g.fill();
      });
      A.glint = dot(32, 0, (g, c, r) => {
        const gr = g.createRadialGradient(c, c, 0, c, c, r);
        gr.addColorStop(0, 'rgba(255,255,245,1)'); gr.addColorStop(0.2, 'rgba(255,240,200,0.6)'); gr.addColorStop(1, 'rgba(255,220,160,0)');
        g.fillStyle = gr; g.fillRect(0, 0, 2 * c, 2 * c);
      });

      // --- vignette + calm caption band ---
      A.vig = canvas(W, H);
      {
        const g = A.vig.getContext('2d');
        let gr = g.createRadialGradient(960, 460, 380, 960, 520, 1250);
        gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.6, 'rgba(4,3,1,0.45)'); gr.addColorStop(1, 'rgba(0,0,0,0.85)');
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
        gr = g.createLinearGradient(0, 770, 0, H);
        gr.addColorStop(0, 'rgba(6,4,2,0)'); gr.addColorStop(0.3, 'rgba(6,4,2,0.5)'); gr.addColorStop(1, 'rgba(4,3,1,0.82)');
        g.fillStyle = gr; g.fillRect(0, 770, W, H - 770);
      }
      // --- grain tile ---
      const gt = canvas(256, 256);
      {
        const g = gt.getContext('2d');
        const id = g.createImageData(256, 256);
        for (let i = 0; i < 256 * 256; i++) {
          const v = 128 + Math.round((rng() + rng() - 1) * 120);
          id.data[i * 4] = v; id.data[i * 4 + 1] = v; id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255;
        }
        g.putImageData(id, 0, 0);
      }
      A.grainTile = gt;
      A.grainPat = null;
    },

    draw(ctx, t, env) {
      if (!A) this.init(env);
      const cam = camera(t);
      const s = cam.s;

      // ---- background with gentle parallax ----
      ctx.fillStyle = '#0a0805';
      ctx.fillRect(0, 0, W, H);
      const sb = 1 + (s - 1) * 0.35;
      const [BX, BY, BW, BH] = A.bgRect;
      ctx.drawImage(A.bg, cam.cx + (BX - cam.fx) * sb, cam.cy + (BY - cam.fy) * sb, BW * sb, BH * sb);

      // ---- world (focus plane) ----
      ctx.save();
      ctx.translate(cam.cx - cam.fx * s, cam.cy - cam.fy * s);
      ctx.scale(s, s);

      const B = bundleFrame(t);

      // poses
      // lulav: rises into place 0.3..3.4
      const kL = seg(t, 0.3, 3.4), eL = eOQ(kL);
      const lulav = [lerp(BASE[0] + 40, B.x, eL), lerp(B.y + 190, B.y, eL), lerp(0.22, B.a, eOC(kL))];
      const aL = smooth(seg(t, 0.3, 1.6));
      // hadasim: 2.4..5.3 from the right
      const kH = seg(t, 2.4, 5.3), eH = eOQ(kH);
      const hBob = [4 * Math.sin(0.9 * t + 1.3), 0.015 * Math.sin(0.7 * t + 2)];
      let had = [lerp(1330, SOLO_H[0], eH), lerp(640, SOLO_H[1], eH) + hBob[0] * eH, lerp(0.75, SOLO_H[2], eOC(kH)) + hBob[1]];
      const aH = smooth(seg(t, 2.4, 3.5));
      // aravot: 4.2..7.1 from the left
      const kA = seg(t, 4.2, 7.1), eA = eOQ(kA);
      const aBob = [4 * Math.sin(0.85 * t + 4.1), 0.015 * Math.sin(0.65 * t + 0.7)];
      let ara = [lerp(230, SOLO_A[0], eA), lerp(660, SOLO_A[1], eA) + aBob[0] * eA, lerp(-0.75, SOLO_A[2], eOC(kA)) + aBob[1]];
      const aA = smooth(seg(t, 4.2, 5.3));
      // bundling 9.6..12.3
      const kB = eIOC(seg(t, 9.6, 12.3));
      if (kB > 0) {
        const qa = inBundle(B, OFF_A), qh = inBundle(B, OFF_H);
        const arc = Math.sin(Math.PI * kB);
        had = [lerp(had[0], qh[0], kB), lerp(had[1], qh[1], kB) - 36 * arc, lerp(had[2], qh[2], kB) + 0.12 * arc];
        ara = [lerp(ara[0], qa[0], kB), lerp(ara[1], qa[1], kB) - 30 * arc, lerp(ara[2], qa[2], kB) - 0.1 * arc];
      }
      // etrog: 6.6..9.7 descends and turns to lie in the box
      const kE = seg(t, 6.6, 9.7);
      const eEy = eOQ(kE);
      const settle = kE >= 1 ? 0 : 0;
      const etr = [
        lerp(1300, ETROG_REST[0], eOC(kE)),
        lerp(330, ETROG_REST[1], eEy) + settle,
        lerp(-0.25, ETROG_REST_A, eIOC(clamp(kE * 1.15))),
      ];
      const aE = smooth(seg(t, 6.6, 7.6));

      // shadows on the table
      const shadowAt = (x, alpha, w) => drawSp(ctx, A.shadow, x, 826, 0, alpha, w / 200, 1);
      if (aA > 0) shadowAt(ara[0], 0.35 * aA * eA, 110);
      if (aH > 0) shadowAt(had[0], 0.35 * aH * eH, 110);
      shadowAt(lulav[0], 0.4 * aL * eL, 90);
      drawSp(ctx, A.shadow, 1290, 812, 0, 0.75, 2.3, 1.0);

      // box
      drawSp(ctx, A.boxRefl, 0, 0, 0, 0.16);
      drawSp(ctx, A.boxBack, 0, 0, 0, 1);

      // species with focus pull (blurred -> sharp)
      const species = (sp, spB, p, alpha, focus) => {
        if (alpha <= 0) return;
        if (focus < 1) drawSp(ctx, spB, p[0], p[1], p[2], alpha * (1 - focus));
        if (focus > 0) drawSp(ctx, sp, p[0], p[1], p[2], alpha * focus);
      };
      species(A.arava, A.aravaB, ara, aA, smooth(seg(t, 4.6, 6.9)));
      species(A.hadas, A.hadasB, had, aH, smooth(seg(t, 2.8, 5.1)));
      species(A.lulav, A.lulavB, lulav, aL, smooth(seg(t, 0.8, 3.2)));

      // woven rings bind the bundle
      const ringT = [[12.0, 13.0], [12.6, 13.5], [13.0, 13.9]];
      const ringS = [A.holder, A.ring1, A.ring2];
      ctx.save();
      ctx.translate(B.x, B.y); ctx.rotate(B.a);
      for (let i = 0; i < 3; i++) {
        const k = seg(t, ringT[i][0], ringT[i][1]);
        if (k <= 0) continue;
        const e = eOC(k);
        const dy = i === 0 ? 22 * (1 - e) : -22 * (1 - e);
        drawSp(ctx, ringS[i], 0, RING_Y[i] + dy, 0, smooth(clamp(k * 1.6)), 1.3 - 0.3 * e, 1);
      }
      ctx.restore();

      // light sweep across the bound bundle
      const kS = seg(t, 13.7, 15.8);
      if (kS > 0 && kS < 1) {
        const g = A.scratchG, hlS = A.bundleHL;
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.globalCompositeOperation = 'source-over';
        g.clearRect(0, 0, A.scratch.width, A.scratch.height);
        g.drawImage(hlS.c, 0, 0);
        g.globalCompositeOperation = 'destination-in';
        g.setTransform(hlS.res, 0, 0, hlS.res, hlS.ox * hlS.res, hlS.oy * hlS.res);
        const cx = lerp(-420, 420, eIOS(kS)), cy = -380;
        const dx = 0.9, dy = 0.44, hw = 60;
        const gr = g.createLinearGradient(cx - dx * hw, cy - dy * hw, cx + dx * hw, cy + dy * hw);
        gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.fillRect(-hlS.ox, -hlS.oy, hlS.w, hlS.h);
        g.globalCompositeOperation = 'source-over';
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.6 * Math.sin(Math.PI * kS);
        ctx.translate(B.x, B.y); ctx.rotate(B.a);
        ctx.drawImage(A.scratch, -hlS.ox, -hlS.oy, hlS.w, hlS.h);
        ctx.restore();
      }

      // etrog (between box interior and front wall)
      if (aE > 0) {
        const land = eEy;
        drawSp(ctx, A.shadow, ETROG_REST[0], 690, 0, 0.55 * land * land, 1.0 + 0.4 * (1 - land), 0.8);
        species(A.etrog, A.etrogB, etr, aE, smooth(seg(t, 7.0, 9.2)));
      }
      drawSp(ctx, A.boxFront, 0, 0, 0, 1);

      // glint on the etrog highlight
      const kG = seg(t, 15.2, 16.6);
      if (kG > 0 && kG < 1) {
        const c = Math.cos(ETROG_REST_A), sn = Math.sin(ETROG_REST_A);
        const hx = A.etrogHL.hx, hy = A.etrogHL.hy;
        const gx = ETROG_REST[0] + hx * c - hy * sn, gy = ETROG_REST[1] + hx * sn + hy * c;
        const e = Math.sin(Math.PI * kG);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.9 * e;
        const L = 70 * e, r = 16 * e;
        ctx.drawImage(A.glint, gx - r, gy - r, 2 * r, 2 * r);
        ctx.drawImage(A.glint, gx - L, gy - 2, 2 * L, 4);
        ctx.drawImage(A.glint, gx - 2, gy - L * 0.6, 4, 1.2 * L);
        ctx.restore();
      }
      ctx.restore(); // world

      // ---- floating golden dust (screen space with depth parallax) ----
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const dustIn = 0.35 + 0.65 * smooth(seg(t, 0, 2));
      for (let i = 0; i < A.dust.length; i++) {
        const d = A.dust[i];
        const y = ((((d.y - d.v * t) % 920) + 920) % 920) - 40;
        const x = d.x + d.ax * Math.sin(t * d.f + d.ph) + t * 3 * d.z;
        const sd = 1 + (s - 1) * d.z * 1.5;
        const X = cam.cx + (x - cam.fx) * sd, Y = cam.cy + (y - cam.fy) * sd;
        const q = (X - 960) / (360 + 0.5 * Math.max(0, Y));
        const cone = Math.exp(-q * q);
        let a = d.a * (0.5 + 0.5 * Math.sin(t * d.tw + d.ph)) * cone * clamp((820 - Y) / 90) * dustIn;
        if (a < 0.02) continue;
        if (d.big) {
          const r = 9 * d.z;
          ctx.globalAlpha = a * 0.22;
          ctx.drawImage(A.dotBokeh, X - r, Y - r, 2 * r, 2 * r);
        } else {
          const r = 3.2 * d.z + 1;
          ctx.globalAlpha = a;
          ctx.drawImage(A.dotSharp, X - r, Y - r, 2 * r, 2 * r);
        }
      }
      // big out-of-focus foreground orbs
      for (let i = 0; i < A.orbs.length; i++) {
        const o = A.orbs[i];
        const sd = 1 + (s - 1) * 2.2;
        const x = o.x + 30 * Math.sin(t * 0.13 + o.ph), y = o.y + 18 * Math.cos(t * 0.11 + o.ph);
        const X = cam.cx + (x - cam.fx) * sd, Y = cam.cy + (y - cam.fy) * sd;
        ctx.globalAlpha = o.a * (0.75 + 0.25 * Math.sin(t * 0.5 + o.ph));
        const r = o.r * sd;
        ctx.drawImage(A.orb, X - r, Y - r, 2 * r, 2 * r);
      }
      ctx.restore();

      // ---- vignette, caption band ----
      ctx.drawImage(A.vig, 0, 0, W, H);

      // ---- deterministic film grain ----
      if (!A.grainPat) A.grainPat = ctx.createPattern(A.grainTile, 'repeat');
      const fr = Math.floor(t * 24);
      const gx = (fr * 73) % 256, gy = (fr * 151) % 256;
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = 0.07;
      ctx.translate(-gx, -gy);
      ctx.fillStyle = A.grainPat;
      ctx.fillRect(gx, gy, W, H);
      ctx.restore();
    },
  };
})();
