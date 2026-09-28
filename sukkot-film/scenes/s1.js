// Scene 1: "The wilderness" - the camp of Israel at night in the Sinai desert,
// surrounded by the clouds of glory (ananei hakavod). Opening establishing shot.
(function () {
  const S = (window.SUKKOT = window.SUKKOT || { scenes: {} });

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
  const smooth = (a, b, x) => { x = clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
  const easeIO = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const lerp = (a, b, k) => a + (b - a) * k;
  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function valueNoise(rng, n) {
    const v = []; for (let i = 0; i < n; i++) v.push(rng());
    return (x) => {
      const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
      const a = v[((i % n) + n) % n], b = v[(((i + 1) % n) + n) % n];
      return a + (b - a) * u;
    };
  }
  function gauss(rng) { return (rng() + rng() + rng() + rng() - 2) / 2; }

  const F = { x: 960, y: 700 };          // camera focus (world)
  const DUR = 19;

  // ground-plane projection for the camp (u across -1..1, v depth 0 far .. 1 near)
  function proj(u, v) {
    return { x: 960 + u * (380 + v * 460), y: 630 + v * 170, s: 0.55 + v * 0.75 };
  }

  let R = null; // prebuilt resources

  function build() {
    const rng = mulberry32(0x5eed01);
    const r = {};

    // ---------- sprites ----------
    function lumpy(core, edge, lumps, alpha, flat) {
      const c = mk(256, 256), g = c.getContext('2d');
      for (let k = 0; k < lumps; k++) {
        const br = 40 + rng() * 28;
        const bx = 128 + (rng() - 0.5) * 110;
        const by = 136 + (rng() - 0.5) * 70 * flat;
        const gr = g.createRadialGradient(bx, by, 0, bx, by, br);
        gr.addColorStop(0, `rgba(${core},${alpha})`);
        gr.addColorStop(0.55, `rgba(${edge},${alpha * 0.45})`);
        gr.addColorStop(1, `rgba(${edge},0)`);
        g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
      }
      return c;
    }
    r.body = []; r.glowW = [];
    for (let i = 0; i < 4; i++) {
      r.body.push(lumpy('112,110,150', '58,56,92', 14, 0.34, 0.8));
      r.glowW.push(lumpy('255,251,238', '190,200,255', 9, 0.30, 0.7));
          }
    function radialSprite(size, stops) {
      const c = mk(size, size), g = c.getContext('2d'), h = size / 2;
      const gr = g.createRadialGradient(h, h, 0, h, h, h);
      stops.forEach(([o, col]) => gr.addColorStop(o, col));
      g.fillStyle = gr; g.fillRect(0, 0, size, size);
      return c;
    }
    r.fire = radialSprite(64, [[0, 'rgba(255,236,180,1)'], [0.2, 'rgba(255,170,70,0.75)'], [0.55, 'rgba(230,90,30,0.22)'], [1, 'rgba(200,60,20,0)']]);
    r.star = radialSprite(32, [[0, 'rgba(255,255,255,1)'], [0.15, 'rgba(220,230,255,0.6)'], [1, 'rgba(160,180,255,0)']]);
    r.soft = radialSprite(128, [[0, 'rgba(255,255,255,1)'], [0.4, 'rgba(255,255,255,0.35)'], [1, 'rgba(255,255,255,0)']]);

    // soft vertical light columns: pillar of fire, and the cloud over the Mishkan
    function column(c0, c1, c2, wTop, wBot, amp) {
      const c = mk(240, 640), g = c.getContext('2d');
      g.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 80; k++) {
        const y = 30 + (k / 79) * 590, q = y / 640, wv = lerp(wTop, wBot, q);
        const gr = g.createRadialGradient(120, y, 0, 120, y, wv);
        const a = amp * (0.25 + 0.75 * q) * smooth(0, 0.35, q);
        gr.addColorStop(0, `rgba(${c0},${a * 1.6})`);
        gr.addColorStop(0.35, `rgba(${c1},${a})`);
        gr.addColorStop(1, `rgba(${c2},0)`);
        g.fillStyle = gr; g.fillRect(0, 0, 240, 640);
      }
      return c;
    }
    r.pillar = column('255,205,130', '255,130,50', '200,60,20', 90, 60, 0.05);
    r.beamW = column('255,250,235', '215,215,255', '160,170,255', 110, 34, 0.04);
    r.beamG = column('255,230,170', '255,190,110', '255,140,60', 110, 34, 0.04);

    // ---------- sky + stars ----------
    r.SKY = { x: -80, y: -300, w: 2080, h: 1400 };
    {
      const K = r.SKY, c = mk(K.w, K.h), g = c.getContext('2d');
      g.translate(-K.x, -K.y);
      const gr = g.createLinearGradient(0, K.y, 0, K.y + K.h);
      const Y = (y) => (y - K.y) / K.h;
      gr.addColorStop(0, '#03041a');
      gr.addColorStop(Y(120), '#080c2e');
      gr.addColorStop(Y(380), '#141a48');
      gr.addColorStop(Y(520), '#2a2458');
      gr.addColorStop(Y(610), '#4d3060');
      gr.addColorStop(Y(700), '#5e3858');
      gr.addColorStop(1, '#3a2240');
      g.fillStyle = gr; g.fillRect(K.x, K.y, K.w, K.h);
      // milky way band (lower-left to upper-right)
      const ax = -80, ay = 520, bx = 2000, by = -280;
      const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
      g.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 90; k++) {
        const q = rng(), off = gauss(rng) * 110;
        const x = ax + dx * q + nx * off, y = ay + dy * q + ny * off, rr = 70 + rng() * 170;
        const gg = g.createRadialGradient(x, y, 0, x, y, rr);
        const warm = rng() < 0.3;
        gg.addColorStop(0, warm ? 'rgba(170,140,150,0.05)' : 'rgba(130,140,210,0.05)');
        gg.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gg; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
      }
      for (let k = 0; k < 4200; k++) {
        const q = rng(), off = gauss(rng) * 130;
        const x = ax + dx * q + nx * off, y = ay + dy * q + ny * off;
        const a = (0.15 + rng() * 0.45) * smooth(640, 380, y);
        g.fillStyle = `rgba(215,220,255,${a})`;
        g.fillRect(x, y, rng() < 0.9 ? 1 : 1.6, rng() < 0.9 ? 1 : 1.6);
      }
      g.globalCompositeOperation = 'source-over';
      // dust lanes
      for (let k = 0; k < 50; k++) {
        const q = rng(), off = gauss(rng) * 40;
        const x = ax + dx * q + nx * off, y = ay + dy * q + ny * off, rr = 30 + rng() * 80;
        const gg = g.createRadialGradient(x, y, 0, x, y, rr);
        gg.addColorStop(0, 'rgba(6,8,30,0.22)'); gg.addColorStop(1, 'rgba(6,8,30,0)');
        g.fillStyle = gg; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
      }
      // field stars
      g.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 3000; k++) {
        const x = K.x + rng() * K.w, y = K.y + rng() * (K.h - 500);
        const fade = smooth(660, 360, y);
        const m = rng();
        const sz = m < 0.72 ? 1 : m < 0.95 ? 1.5 : 2.2;
        const a = (m < 0.72 ? 0.25 + rng() * 0.35 : 0.5 + rng() * 0.5) * fade;
        const tint = rng();
        const col = tint < 0.2 ? '255,225,190' : tint < 0.5 ? '200,215,255' : '240,242,255';
        g.fillStyle = `rgba(${col},${a})`;
        g.fillRect(x, y, sz, sz);
      }
      r.sky = c;
      // twinkling stars (drawn live)
      r.tw = [];
      for (let k = 0; k < 110; k++) {
        const y = K.y + 20 + rng() * 780;
        r.tw.push({ x: rng() * 1920, y, s: 5 + rng() * 9, f: 1.2 + rng() * 2.8, p: rng() * 6.283, a: (0.45 + rng() * 0.55) * smooth(560, 330, y) });
      }
    }

    // ---------- mountains ----------
    function mountains(K, baseY, peakAmp, scales, top, bottom, rimCol, crags, seedShift) {
      const c = mk(K.w, K.h), g = c.getContext('2d');
      g.translate(-K.x, -K.y);
      const n1 = valueNoise(rng, 64), n2 = valueNoise(rng, 64), n3 = valueNoise(rng, 64);
      const pts = [];
      for (let x = K.x; x <= K.x + K.w; x += 4) {
        const a = Math.pow(n1(x / scales[0] + seedShift), 1.5);
        const b = 1 - Math.abs(2 * n2(x / scales[1]) - 1);
        const d = n3(x / scales[2]);
        pts.push([x, baseY - peakAmp * (0.62 * a + 0.28 * b + 0.1 * d)]);
      }
      g.beginPath(); g.moveTo(K.x, K.y + K.h);
      pts.forEach((p) => g.lineTo(p[0], p[1]));
      g.lineTo(K.x + K.w, K.y + K.h); g.closePath();
      const gr = g.createLinearGradient(0, baseY - peakAmp, 0, baseY + 60);
      gr.addColorStop(0, top); gr.addColorStop(1, bottom);
      g.fillStyle = gr; g.fill();
      g.globalCompositeOperation = 'source-atop';
      // crags / strata
      for (let k = 0; k < crags; k++) {
        const x = K.x + rng() * K.w, y = baseY - rng() * peakAmp;
        const l = 10 + rng() * 40, sl = (rng() < 0.5 ? -1 : 1) * (0.6 + rng() * 0.8);
        g.strokeStyle = rng() < 0.5 ? 'rgba(10,4,14,0.18)' : 'rgba(200,120,100,0.06)';
        g.lineWidth = 1 + rng() * 2;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + l * sl * 0.5, y + l); g.stroke();
      }
      // warm light from the camp glow
      const lg = g.createRadialGradient(960, baseY + 80, 0, 960, baseY + 80, 1100);
      lg.addColorStop(0, 'rgba(230,140,100,0.2)'); lg.addColorStop(1, 'rgba(230,150,110,0)');
      g.fillStyle = lg; g.fillRect(K.x, K.y, K.w, K.h);
      // atmospheric haze at the base
      const hz = g.createLinearGradient(0, baseY - peakAmp * 0.5, 0, baseY + 20);
      hz.addColorStop(0, 'rgba(90,60,100,0)'); hz.addColorStop(1, 'rgba(80,50,90,0.4)');
      g.fillStyle = hz; g.fillRect(K.x, K.y, K.w, K.h);
      g.globalCompositeOperation = 'source-over';
      // rim light along the ridge
      g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
      const rg = g.createLinearGradient(K.x, 0, K.x + K.w, 0);
      rg.addColorStop(0, `rgba(${rimCol},0.05)`); rg.addColorStop(0.5, `rgba(${rimCol},0.45)`); rg.addColorStop(1, `rgba(${rimCol},0.05)`);
      g.strokeStyle = rg; g.lineWidth = 1.5; g.stroke();
      return c;
    }
    r.MF = { x: -120, y: 220, w: 2160, h: 560 };
    r.mtnFar = mountains(r.MF, 560, 250, [420, 160, 45], '#57283a', '#2c1a36', '225,150,130', 500, 3.3);
    r.MN = { x: -120, y: 380, w: 2160, h: 400 };
    r.mtnNear = mountains(r.MN, 612, 120, [300, 110, 35], '#2a121c', '#150c1a', '245,170,110', 400, 7.1);

    // ---------- camp ----------
    r.CP = { x: -120, y: 560, w: 2160, h: 560 };
    {
      const K = r.CP, c = mk(K.w, K.h), g = c.getContext('2d');
      g.translate(-K.x, -K.y);
      const gr = g.createLinearGradient(0, 585, 0, K.y + K.h);
      gr.addColorStop(0, 'rgba(70,48,70,0)');
      gr.addColorStop(0.07, 'rgb(64,44,62)');
      gr.addColorStop(0.3, 'rgb(58,40,52)');
      gr.addColorStop(1, 'rgb(28,18,26)');
      g.fillStyle = gr; g.fillRect(K.x, 585, K.w, K.y + K.h - 585);
      // central warm glow on the valley floor
      g.save(); g.translate(960, 715); g.scale(1, 0.22);
      g.globalCompositeOperation = 'lighter';
      const cg = g.createRadialGradient(0, 0, 0, 0, 0, 900);
      cg.addColorStop(0, 'rgba(255,200,140,0.22)'); cg.addColorStop(0.6, 'rgba(200,130,110,0.08)'); cg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = cg; g.fillRect(-1000, -1000, 2000, 2000);
      g.restore();
      // faint sand ripples
      for (let k = 0; k < 260; k++) {
        const y = 640 + rng() * 380, x = K.x + rng() * K.w, l = 30 + rng() * 90;
        g.strokeStyle = `rgba(${rng() < 0.5 ? '120,90,100' : '20,10,20'},0.08)`;
        g.lineWidth = 1;
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - 2, x + l, y); g.stroke();
      }

      // tribal blocks
      const blocks = [];
      [-0.42, 0, 0.42].forEach((u) => blocks.push({ u, v: 0.1, cols: 7, rows: 3 }));
      [-0.42, 0, 0.42].forEach((u) => blocks.push({ u, v: 0.87, cols: 7, rows: 3 }));
      [0.28, 0.5, 0.72].forEach((v) => blocks.push({ u: -0.74, v, cols: 5, rows: 3 }));
      [0.28, 0.5, 0.72].forEach((v) => blocks.push({ u: 0.74, v, cols: 5, rows: 3 }));
      const colors = ['#b8322e', '#2f8a55', '#d8b640', '#2f55a8', '#7a3f96', '#d07a2e', '#e6e0d0', '#3c9a9a', '#9a2a60', '#8aa8c8', '#6a8a2a', '#c0506a'];
      const tents = [], fires = [], flags = [];
      blocks.forEach((b, bi) => {
        const bf = [];
        for (let k = 0; k < 3; k++) {
          const u = b.u + (rng() - 0.5) * b.cols * 0.03, v = b.v + (rng() - 0.5) * b.rows * 0.04;
          const p = proj(u, v); bf.push(p); fires.push({ x: p.x, y: p.y, s: p.s, f: 5 + rng() * 5, ph: rng() * 6.28 });
        }
        for (let i = 0; i < b.cols; i++) for (let j = 0; j < b.rows; j++) {
          if (rng() < 0.07) continue;
          const u = b.u + (i - (b.cols - 1) / 2) * 0.036 + (rng() - 0.5) * 0.008;
          const v = b.v + (j - (b.rows - 1) / 2) * 0.046 + (rng() - 0.5) * 0.01;
          const p = proj(u, v);
          let L = 0; bf.forEach((f) => { const d2 = (f.x - p.x) ** 2 + ((f.y - p.y) * 2.5) ** 2; L += Math.exp(-d2 / (2 * 28 * 28)); });
          tents.push({ ...p, v, L: Math.min(1, L), k: rng() });
        }
        const pc = proj(b.u, b.v - b.rows * 0.023 - 0.012);
        flags.push({ x: pc.x, y: pc.y, s: pc.s, col: colors[bi], ph: rng() * 6.28 });
      });
      // Levites around the Mishkan
      for (let k = 0; k < 28; k++) {
        const a = (k / 28) * Math.PI * 2;
        const u = Math.cos(a) * 0.23, v = 0.48 + Math.sin(a) * 0.17;
        const p = proj(u, v);
        tents.push({ ...p, v, L: 0.35, k: rng() });
      }
      // baked fire light on the ground
      g.globalCompositeOperation = 'lighter';
      fires.forEach((f) => {
        g.save(); g.translate(f.x, f.y); g.scale(1, 0.4);
        const rr = 40 * f.s;
        const fg = g.createRadialGradient(0, 0, 0, 0, 0, rr);
        fg.addColorStop(0, 'rgba(255,150,70,0.35)'); fg.addColorStop(1, 'rgba(255,120,50,0)');
        g.fillStyle = fg; g.fillRect(-rr, -rr, rr * 2, rr * 2); g.restore();
      });
      g.globalCompositeOperation = 'source-over';

      // Mishkan courtyard
      const mc = [proj(-0.09, 0.43), proj(0.09, 0.43), proj(0.09, 0.53), proj(-0.09, 0.53)];
      g.fillStyle = 'rgba(210,180,140,0.14)';
      g.beginPath(); mc.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.closePath(); g.fill();
      // linen fence (back sides first, then front)
      function fence(a, b, col) {
        const h = 4.5 * (a.s + b.s) / 2;
        g.fillStyle = col;
        g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(b.x, b.y - h); g.lineTo(a.x, a.y - h); g.closePath(); g.fill();
      }
      fence(mc[0], mc[1], 'rgba(220,205,175,0.75)');
      fence(mc[3], mc[0], 'rgba(170,150,130,0.8)');
      fence(mc[1], mc[2], 'rgba(200,185,160,0.8)');
      // the Mishkan structure (west end = back) and altar
      {
        const p = proj(0, 0.455), w = 26 * p.s, h = 13 * p.s, d = 9 * p.s;
        g.fillStyle = '#5a3e2c'; g.fillRect(p.x - w / 2, p.y - h, w, h);
        g.fillStyle = '#b89350'; g.fillRect(p.x - w / 2, p.y - h, w, 2.2 * p.s);
        g.fillStyle = '#3a2a24';
        g.beginPath(); g.moveTo(p.x + w / 2, p.y); g.lineTo(p.x + w / 2 + d * 0.6, p.y - d * 0.3); g.lineTo(p.x + w / 2 + d * 0.6, p.y - h - d * 0.3); g.lineTo(p.x + w / 2, p.y - h); g.fill();
        g.fillStyle = '#e8d2a0'; g.fillRect(p.x - 2.5 * p.s, p.y - h * 0.8, 5 * p.s, h * 0.8);
        const q = proj(0, 0.505);
        g.fillStyle = '#7a5a3a'; g.fillRect(q.x - 5 * q.s, q.y - 5 * q.s, 10 * q.s, 5 * q.s);
        r.mishkan = { x: p.x, y: p.y - h, s: p.s, ax: q.x, ay: q.y - 5 * q.s };
      }
      fence(mc[2], mc[3], 'rgba(230,215,185,0.85)');

      // tents, back to front
      tents.sort((a, b) => a.y - b.y);
      tents.forEach((tn) => {
        const s = tn.s * (0.9 + tn.k * 0.3), w = 15 * s, h = 9 * s, x = tn.x, y = tn.y;
        // ground shadow
        g.fillStyle = 'rgba(10,6,14,0.35)';
        g.beginPath(); g.ellipse(x + w * 0.15, y + 0.5, w * 0.62, 1.8 * s, 0, 0, 6.283); g.fill();
        const A = [x - w * 0.24, y - h], B = [x + w * 0.26, y - h * 0.96];
        const FL = [x - w * 0.55, y], FR = [x + w * 0.06, y], BR = [x + w * 0.56, y - h * 0.08];
        // roof side (dark, faintly lit by the clouds)
        const rb = 44 + tn.L * 30;
        g.fillStyle = `rgb(${rb + 10},${rb * 0.72 | 0},${rb * 0.78 | 0})`;
        g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.lineTo(BR[0], BR[1]); g.lineTo(FR[0], FR[1]); g.closePath(); g.fill();
        // front face lit by fire + cloud glow
        const l = 0.45 + 0.75 * tn.L;
        const cr = Math.min(255, (150 + tn.k * 30) * l) | 0, cgc = Math.min(255, (104 + tn.k * 20) * l) | 0, cb = Math.min(255, (80 + tn.k * 10) * l * 0.9) | 0;
        g.fillStyle = `rgb(${cr},${cgc},${cb})`;
        g.beginPath(); g.moveTo(FL[0], FL[1]); g.lineTo(A[0], A[1]); g.lineTo(FR[0], FR[1]); g.closePath(); g.fill();
        // doorway
        g.fillStyle = tn.L > 0.4 ? 'rgba(70,30,15,0.9)' : 'rgba(20,12,16,0.9)';
        g.beginPath(); g.moveTo(x - w * 0.3, y); g.lineTo(x - w * 0.24, y - h * 0.5); g.lineTo(x - w * 0.18, y); g.closePath(); g.fill();
        // ridge highlight
        g.strokeStyle = `rgba(255,220,170,${0.12 + tn.L * 0.25})`; g.lineWidth = 0.8;
        g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.stroke();
      });
      r.camp = c; r.fires = fires; r.flags = flags;
    }

    // ---------- foreground dunes ----------
    r.FG = { x: -140, y: 660, w: 2200, h: 560 };
    {
      const K = r.FG, c = mk(K.w, K.h), g = c.getContext('2d'), c2 = mk(K.w, K.h), g2 = c2.getContext('2d');
      g.translate(-K.x, -K.y); g2.translate(-K.x, -K.y);
      const nz = valueNoise(rng, 32);
      const yB = (x) => 800 + 115 * (1 - smooth(820, 1850, x)) * smooth(-200, 700, x) + 12 * (nz(x / 90) - 0.5) + (x < 700 ? 60 * (1 - smooth(-200, 700, x)) : 0);
      const yA = (x) => 745 + 175 * smooth(180, 1350, x) + 10 * (nz(x / 70 + 9) - 0.5) + (x < 180 ? 25 * (1 - smooth(-140, 180, x)) : 0);
      function dune(fn, top, bot, rimA) {
        const pts = [];
        for (let x = K.x; x <= K.x + K.w; x += 6) pts.push([x, fn(x)]);
        g.beginPath(); g.moveTo(K.x, K.y + K.h); pts.forEach((p) => g.lineTo(p[0], p[1])); g.lineTo(K.x + K.w, K.y + K.h); g.closePath();
        const gr = g.createLinearGradient(0, 760, 0, 1100);
        gr.addColorStop(0, top); gr.addColorStop(1, bot);
        g.fillStyle = gr; g.fill();
        // soft lit band under crest
        g.save(); g.clip();
        g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1] + 8) : g.moveTo(p[0], p[1] + 8)));
        g.strokeStyle = 'rgba(160,100,90,0.10)'; g.lineWidth = 18; g.stroke();
        for (let k = 0; k < 70; k++) {
          const x = K.x + rng() * K.w, y = fn(x) + 20 + rng() * 200, l = 40 + rng() * 140;
          g.strokeStyle = 'rgba(0,0,0,0.10)'; g.lineWidth = 1.2;
          g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - 6, x + l, y + 2); g.stroke();
        }
        g.restore();
        // rim light, strongest toward the centre (facing the glow)
        const rg = g.createLinearGradient(K.x, 0, K.x + K.w, 0);
        rg.addColorStop(0, 'rgba(230,170,120,0.05)'); rg.addColorStop(0.5, `rgba(240,190,130,${rimA})`); rg.addColorStop(1, 'rgba(230,170,120,0.05)');
        g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
        g.strokeStyle = rg; g.lineWidth = 1.6; g.stroke();
        // warm rim for the golden finale (separate layer)
        g2.globalCompositeOperation = 'destination-out';
        g2.beginPath(); g2.moveTo(K.x, K.y + K.h); pts.forEach((p) => g2.lineTo(p[0], p[1] + 1.5)); g2.lineTo(K.x + K.w, K.y + K.h); g2.closePath();
        g2.fillStyle = '#000'; g2.fill();
        g2.globalCompositeOperation = 'source-over';
        const rg2 = g2.createLinearGradient(K.x, 0, K.x + K.w, 0);
        rg2.addColorStop(0, 'rgba(255,190,110,0.1)'); rg2.addColorStop(0.5, 'rgba(255,200,120,0.75)'); rg2.addColorStop(1, 'rgba(255,190,110,0.1)');
        g2.beginPath(); pts.forEach((p, i) => (i ? g2.lineTo(p[0], p[1]) : g2.moveTo(p[0], p[1])));
        g2.strokeStyle = rg2; g2.lineWidth = 2.2; g2.stroke();
        g2.strokeStyle = 'rgba(255,180,100,0.08)'; g2.lineWidth = 16; g2.stroke();
      }
      dune(yB, '#2e1d26', '#0e0912', 0.35);
      dune(yA, '#26171f', '#0a070d', 0.45);
      r.fg = c; r.fgRim = c2;
    }

    // ---------- clouds of glory ----------
    r.ring = [];
    for (let i = 0; i < 80; i++) {
      r.ring.push({
        a0: (i / 80) * Math.PI * 2 + (rng() - 0.5) * 0.1,
        elev: 5 + rng() * 110, rad: 78 + rng() * 90,
        bobA: 5 + rng() * 10, bobF: 0.15 + rng() * 0.25, ph: rng() * 6.283,
        sp: (rng() * 4) | 0, w: 0.9 + rng() * 0.6,
      });
    }
    r.CB = { x: -160, y: 160, w: 2240, h: 860 };
    r.cbuf = [0, 1, 2, 3].map(() => mk(r.CB.w / 2, r.CB.h / 2));
    r.canopy = [];
    for (let k = 0; k < 24; k++) {
      const q = k / 23;
      r.canopy.push({
        x: 330 + q * 1260 + (rng() - 0.5) * 40,
        y: 560 - 150 * Math.sin(Math.PI * q) + (rng() - 0.5) * 40,
        rad: 110 + rng() * 90, ph: rng() * 6.283, f: 0.08 + rng() * 0.1, sp: (rng() * 4) | 0,
      });
    }

    // ---------- sand particles ----------
    r.sand = [];
    for (let k = 0; k < 170; k++) {
      r.sand.push({ x: rng() * 2000, y: 420 + rng() * 620, vx: 18 + rng() * 45, ph: rng() * 6.283, f: 0.4 + rng() * 0.8, sz: 0.8 + rng() * 1.6, a: 0.12 + rng() * 0.3 });
    }

    // ---------- vignette + grain ----------
    {
      const c = mk(1920, 1080), g = c.getContext('2d');
      const vg = g.createRadialGradient(960, 520, 380, 960, 560, 1250);
      vg.addColorStop(0, 'rgba(3,2,12,0)'); vg.addColorStop(0.6, 'rgba(3,2,12,0.28)'); vg.addColorStop(1, 'rgba(3,2,12,0.8)');
      g.fillStyle = vg; g.fillRect(0, 0, 1920, 1080);
      const bg = g.createLinearGradient(0, 780, 0, 1080);
      bg.addColorStop(0, 'rgba(4,3,10,0)'); bg.addColorStop(1, 'rgba(4,3,10,0.6)');
      g.fillStyle = bg; g.fillRect(0, 780, 1920, 300);
      r.vig = c;
    }
    r.grain = [];
    for (let k = 0; k < 4; k++) {
      const c = mk(256, 256), g = c.getContext('2d'), id = g.createImageData(256, 256);
      for (let i = 0; i < id.data.length; i += 4) {
        const v = rng() < 0.5 ? 0 : 255;
        id.data[i] = v; id.data[i + 1] = v; id.data[i + 2] = v; id.data[i + 3] = (rng() * 20) | 0;
      }
      g.putImageData(id, 0, 0);
      r.grain.push(c);
    }
    r.grainPat = null; // patterns are made lazily per context
    return r;
  }

  // ---------- camera ----------
  function camera(t) {
    const x = clamp(t / 15.5, 0, 1);
    const u = 0.35 * x + 0.65 * easeIO(x);
    return {
      camY: 480 * (1 - u),
      zoom: 1 + 0.085 * u + 0.003 * t,
      panX: 50 * (1 - u) + 5 * Math.sin(t * 0.27),
    };
  }
  function layer(ctx, p, c) {
    ctx.save();
    const s = 1 + (c.zoom - 1) * p;
    ctx.translate(F.x + c.panX * p, F.y + c.camY * p);
    ctx.scale(s, s);
    ctx.translate(-F.x, -F.y);
  }

  // cloud puff: cool body + warm/white inner glow
  function puffBody(ctx, sp, x, y, rad, a) {
    ctx.globalAlpha = a;
    ctx.drawImage(R.body[sp], x - rad * 1.25, y - rad * 0.8, rad * 2.5, rad * 1.6);
  }
  function puffGlow(ctx, sp, x, y, rad, a, w) {
    const gw = 1.9 * rad, gh = 1.2 * rad;
    ctx.globalAlpha = a; ctx.drawImage(R.glowW[sp], x - gw / 2, y - gh / 2 - rad * 0.08, gw, gh);
  }

  function ringPuffs(t) {
    const out = [];
    for (const p of R.ring) {
      const a = p.a0 + 0.016 * t;
      const ex = Math.cos(a), ey = Math.sin(a), d = (ey + 1) / 2, sc = 0.62 + 0.62 * d;
      out.push({
        x: 960 + 830 * ex + Math.sin(t * p.bobF + p.ph) * p.bobA * 1.6,
        y: 718 + 128 * ey - p.elev * (1 - 0.55 * d) * sc + Math.cos(t * p.bobF * 0.8 + p.ph) * p.bobA * 0.5,
        rad: p.rad * sc, ey, d, p,
      });
    }
    out.sort((a, b) => a.ey - b.ey);
    return out;
  }

  S.scenes[1] = {
    duration: DUR,
    init(env) { if (!R) R = build(); },
    draw(ctx, t, env) {
      if (!R) R = build();
      const W = (env && env.W) || 1920, H = (env && env.H) || 1080;
      const c = camera(t);
      const w = smooth(10.5, 18.5, t);           // warmth toward gold for the hand-off
      const glowI = 0.82 + 0.3 * w;

      ctx.save();
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#05061a'; ctx.fillRect(0, 0, W, H);

      // --- sky ---
      layer(ctx, 0.18, c);
      ctx.drawImage(R.sky, R.SKY.x, R.SKY.y);
      ctx.globalCompositeOperation = 'lighter';
      for (const s of R.tw) {
        const k = 0.55 + 0.45 * Math.sin(t * s.f + s.p) * Math.sin(t * s.f * 0.37 + s.p * 2);
        ctx.globalAlpha = s.a * k * (1 - 0.35 * w);
        ctx.drawImage(R.star, s.x - s.s, s.y - s.s, s.s * 2, s.s * 2);
      }
      // a single slow meteor early in the shot
      if (t > 2.4 && t < 3.6) {
        const q = (t - 2.4) / 1.2, e = smooth(0, 1, q);
        const x0 = 1450 - 360 * e, y0 = -120 + 170 * e;
        const gr = ctx.createLinearGradient(x0, y0, x0 + 150, y0 - 70);
        gr.addColorStop(0, `rgba(255,250,235,${0.8 * Math.sin(Math.PI * q)})`); gr.addColorStop(1, 'rgba(255,250,235,0)');
        ctx.globalAlpha = 1; ctx.strokeStyle = gr; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + 150, y0 - 70); ctx.stroke();
      }
      ctx.restore();

      // --- horizon glow from the clouds of glory (sky only) ---
      layer(ctx, 0.4, c);
      ctx.globalCompositeOperation = 'lighter';
      ctx.translate(960, 600); ctx.scale(1, 0.5);
      {
        const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, 1050);
        const cr = lerp(120, 235, w) | 0, cg = lerp(80, 150, w) | 0, cb = lerp(135, 80, w) | 0;
        gr.addColorStop(0, `rgba(${cr},${cg},${cb},${0.4 + 0.2 * w})`);
        gr.addColorStop(0.5, `rgba(${cr},${cg},${cb},${0.12 + 0.08 * w})`);
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gr; ctx.fillRect(-1100, -1100, 2200, 2200);
      }
      ctx.restore();

      // --- far mountains ---
      layer(ctx, 0.4, c);
      ctx.drawImage(R.mtnFar, R.MF.x, R.MF.y);
      ctx.restore();

      // --- pillar of fire, far on the horizon ---
      layer(ctx, 0.47, c);
      ctx.globalCompositeOperation = 'lighter';
      {
        const px = 1640, base = 600, fl = 0.85 + 0.1 * Math.sin(t * 3.1) + 0.05 * Math.sin(t * 7.3);
        ctx.globalAlpha = 0.8 * fl;
        ctx.drawImage(R.pillar, px - 120, base - 560, 240, 560);
        for (let k = 0; k < 18; k++) {
          const q = ((t * 0.12 + k / 18) % 1);
          const y = base - 30 - q * 480, s = 16 + 18 * q;
          ctx.globalAlpha = 0.16 * Math.sin(Math.PI * q) * fl;
          ctx.drawImage(R.fire, px - s + Math.sin(t * 1.1 + k * 2.1) * 6, y - s * 2, s * 2, s * 4);
        }
        ctx.globalAlpha = 0.5 * fl;
        ctx.drawImage(R.soft, px - 70, base - 40, 140, 60);
      }
      ctx.restore();

      // --- nearer ridges ---
      layer(ctx, 0.55, c);
      ctx.drawImage(R.mtnNear, R.MN.x, R.MN.y);
      ctx.restore();

      // --- clouds of glory: rendered at half resolution into 4 buffers
      // (far bodies, far glow, near bodies, near glow), then composited. ---
      const puffs = ringPuffs(t);
      const CB = R.CB, bufs = R.cbuf.map((b) => {
        const g = b.getContext('2d');
        g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        g.clearRect(0, 0, b.width, b.height);
        g.setTransform(0.5, 0, 0, 0.5, -CB.x * 0.5, -CB.y * 0.5);
        return g;
      });
      bufs[1].globalCompositeOperation = 'lighter'; bufs[3].globalCompositeOperation = 'lighter';
      for (const p of R.canopy) {
        const x = p.x + Math.sin(t * p.f + p.ph) * 26, y = p.y + Math.cos(t * p.f * 0.7 + p.ph) * 8;
        puffBody(bufs[0], p.sp, x, y, p.rad * 1.2, 0.2);
        puffGlow(bufs[1], p.sp, x, y, p.rad * 1.35, 0.16 * glowI, w);
      }
      for (const q of puffs) {
        const k = q.ey < 0 ? 0 : 2;
        puffBody(bufs[k], q.p.sp, q.x, q.y, q.rad * q.p.w, 0.5 + 0.2 * q.d);
        puffGlow(bufs[k + 1], q.p.sp, q.x, q.y, q.rad * q.p.w * 1.05, (0.36 + 0.1 * (1 - q.d)) * glowI, w);
      }
      // warm the whole cloud mass toward gold for the hand-off (one tint per buffer)
      if (w > 0.001) {
        bufs.forEach((g, i) => {
          g.globalCompositeOperation = 'source-atop';
          g.globalAlpha = i % 2 ? 0.8 * w : 0.45 * w;
          g.fillStyle = i % 2 ? 'rgb(255,196,118)' : 'rgb(132,96,92)';
          g.fillRect(CB.x, CB.y, CB.w, CB.h);
        });
      }
      layer(ctx, 0.85, c);
      function drawPuffs(k) {
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(R.cbuf[k], CB.x, CB.y, CB.w, CB.h);
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(R.cbuf[k + 1], CB.x, CB.y, CB.w, CB.h);
      }
      drawPuffs(0);

      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      ctx.drawImage(R.camp, R.CP.x, R.CP.y);

      // cloud resting over the Mishkan: a soft column of light
      ctx.globalCompositeOperation = 'lighter';
      {
        const m = R.mishkan, pul = 0.85 + 0.15 * Math.sin(t * 0.9);
        const top = 380, bh = m.y + 10 - top;
        ctx.globalAlpha = 0.9 * pul * glowI * (1 - w);
        if (w < 0.999) ctx.drawImage(R.beamW, m.x - 80, top, 160, bh);
        ctx.globalAlpha = 0.9 * pul * glowI * w;
        if (w > 0.001) ctx.drawImage(R.beamG, m.x - 80, top, 160, bh);
        ctx.globalAlpha = 0.55 * pul * glowI;
        ctx.drawImage(R.soft, m.x - 55, m.y - 30, 110, 60);
        ctx.globalAlpha = 0.5 + 0.2 * Math.sin(t * 5.1);
        ctx.drawImage(R.fire, m.ax - 9, m.ay - 12, 18, 18);
      }
      // campfires
      for (const f of R.fires) {
        const fl = 0.75 + 0.15 * Math.sin(t * f.f + f.ph) + 0.1 * Math.sin(t * f.f * 2.3 + f.ph * 3);
        const s = 11 * f.s * fl;
        ctx.globalAlpha = 0.9;
        ctx.drawImage(R.fire, f.x - s, f.y - s * 1.35, s * 2, s * 2);
        ctx.globalAlpha = 0.25 * fl;
        ctx.drawImage(R.fire, f.x - s * 3, f.y - s * 2.2, s * 6, s * 4);
      }
      // tribal banners
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      for (const fg of R.flags) {
        const s = fg.s, ph = t * 2.2 + fg.ph, x = fg.x, y = fg.y, top = y - 20 * s;
        ctx.strokeStyle = 'rgba(40,28,24,0.95)'; ctx.lineWidth = Math.max(1, 1.1 * s);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, top); ctx.stroke();
        const fw = 10 * s, fh = 6 * s, w1 = Math.sin(ph) * 1.3 * s, w2 = Math.sin(ph + 1.4) * 1.6 * s;
        ctx.fillStyle = fg.col;
        ctx.beginPath(); ctx.moveTo(x, top);
        ctx.quadraticCurveTo(x + fw * 0.5, top + w1, x + fw, top + w2);
        ctx.lineTo(x + fw, top + fh + w2);
        ctx.quadraticCurveTo(x + fw * 0.5, top + fh + w1, x, top + fh);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.moveTo(x + fw * 0.5, top + w1 * 0.5); ctx.lineTo(x + fw, top + w2); ctx.lineTo(x + fw, top + fh + w2); ctx.lineTo(x + fw * 0.5, top + fh + w1 * 0.5); ctx.closePath(); ctx.fill();
      }
      drawPuffs(2);
      ctx.restore();

      // --- foreground dunes ---
      layer(ctx, 1.0, c);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      ctx.drawImage(R.fg, R.FG.x, R.FG.y);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.25 + 0.75 * w;
      ctx.drawImage(R.fgRim, R.FG.x, R.FG.y);
      ctx.restore();

      // --- drifting sand (screen space, nearest layer) ---
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgb(235,195,150)';
      for (const p of R.sand) {
        const x = ((p.x + p.vx * t) % 2000) - 40;
        const y = p.y + Math.sin(t * p.f + p.ph) * 14 - c.camY * 0.3;
        ctx.globalAlpha = p.a * (0.6 + 0.4 * Math.sin(t * p.f * 1.7 + p.ph));
        ctx.fillRect(x, y, p.sz, p.sz * 0.8);
      }
      // warm grade for the golden hand-off
      if (w > 0.001) {
        const gr = ctx.createRadialGradient(960, 620, 0, 960, 620, 1000);
        gr.addColorStop(0, `rgba(255,180,95,${0.14 * w})`); gr.addColorStop(1, 'rgba(255,150,80,0)');
        ctx.globalAlpha = 1; ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      }
      ctx.restore();

      // --- vignette + grain ---
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      ctx.drawImage(R.vig, 0, 0, W, H);
      const fi = Math.floor(t * 12);
      if (!R.grainPat || R.grainCtx !== ctx) { R.grainPat = R.grain.map((g) => ctx.createPattern(g, 'repeat')); R.grainCtx = ctx; }
      const ox = (fi * 97) % 256, oy = (fi * 61) % 256;
      ctx.translate(-ox, -oy);
      ctx.fillStyle = R.grainPat[fi % 4];
      ctx.fillRect(ox, oy, W, H);
      ctx.restore();
    },
  };
})();
