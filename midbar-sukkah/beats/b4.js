// Beat 4 (film 31-38 s): inside the sukkah at night.
// Looking up at the schach (stars and moonlight between the fronds, amber light from below),
// a slow eased tilt down past hanging decorations to the table, settling on a calm centre.
(function () {
  const S = (window.MIDBAR = window.MIDBAR || { beats: {} });
  const W = 1080, H = 1920, TAU = Math.PI * 2;
  const SCH_W = 1200, SCH_H = 1400;       // schach canvas (drawn at x = -60)
  const WALL_H = 1300, TABLE_H = 1020, NEAR_H = 1120, SKY_H = 1500;
  const TABLE_LINE = 320;                  // table top line inside the table canvas
  const CX = 540, CY = 960;                // the calm centre (species appear here in B5)

  let C = null; // cached assets and per-grain parameters

  // ---------- camera ----------
  function camAt(fx, t) {
    return 0.03 * (t / 7) + 0.97 * fx.ease.inOutSine(fx.range(t, 0.9, 6.3));
  }
  function layout(fx, t) {
    const c = camAt(fx, t);
    const u = 1 - c;
    const wallTop = 40 + 1110 * u;
    return {
      c,
      wallTop,
      schAnchor: wallTop + 44,
      schSy: fx.lerp(1, 0.26, c),
      skyOff: -520 * c,
      tableTop: 910 + 1250 * u,          // top of the table canvas
      nearTop: -620 + 1520 * u,
      roomOff: -1180 * c,                // for dust motes (room space)
      zoom: 1,
    };
  }
  const flick = (fx, t, k) =>
    1 + 0.055 * Math.sin(t * 11.3 + k * 1.7) + 0.035 * Math.sin(t * 23.1 + k * 4.1) + 0.05 * fx.noise(t * 5.3 + k * 13, k * 7.1);

  // ---------- small geometry helpers ----------
  const qp = (a, b, c, s) => (1 - s) * (1 - s) * a + 2 * (1 - s) * s * b + s * s * c;
  const qd = (a, b, c, s) => 2 * (1 - s) * (b - a) + 2 * s * (c - b);
  const col = (rgb, a = 1) => `rgba(${rgb[0] | 0},${rgb[1] | 0},${rgb[2] | 0},${a})`;

  // ---------- init: build every static layer ----------
  function init(env) {
    const fx = env.fx;
    const mix = fx.mixRGB;
    C = {};

    // ---- sky (behind the schach) ----
    {
      const r = fx.rng(4101);
      const sky = fx.canvas(W, SKY_H), g = sky.getContext('2d');
      const gr = g.createLinearGradient(0, 0, 0, SKY_H);
      gr.addColorStop(0, '#0a0c1e'); gr.addColorStop(0.5, '#141838'); gr.addColorStop(1, '#221f3e');
      g.fillStyle = gr; g.fillRect(0, 0, W, SKY_H);
      // moon glow (upper right)
      const mx = 720, my = 440;
      let rg = g.createRadialGradient(mx, my, 0, mx, my, 620);
      rg.addColorStop(0, 'rgba(210,220,255,0.55)'); rg.addColorStop(0.08, 'rgba(190,205,250,0.35)');
      rg.addColorStop(0.3, 'rgba(120,135,200,0.12)'); rg.addColorStop(1, 'rgba(60,70,130,0)');
      g.fillStyle = rg; g.fillRect(0, 0, W, SKY_H);
      g.fillStyle = '#eef1ff'; g.beginPath(); g.arc(mx, my, 44, 0, TAU); g.fill();
      g.fillStyle = 'rgba(180,190,225,0.35)';
      for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(mx - 20 + r() * 40, my - 20 + r() * 40, 4 + r() * 8, 0, TAU); g.fill(); }
      // stars
      for (let i = 0; i < 520; i++) {
        const x = r() * W, y = r() * SKY_H * 0.9, s = r();
        g.fillStyle = `rgba(235,238,255,${0.25 + s * 0.6})`;
        g.beginPath(); g.arc(x, y, 0.6 + s * s * 1.8, 0, TAU); g.fill();
      }
      C.sky = sky;
      // luminous cloud sprite (pre-blurred)
      const cl = fx.canvas(520, 240), cg = cl.getContext('2d');
      cg.filter = 'blur(18px)';
      for (let i = 0; i < 14; i++) {
        const x = 90 + r() * 340, y = 110 + (r() - 0.5) * 70, rr = 40 + r() * 50;
        const gg = cg.createRadialGradient(x, y, 0, x, y, rr);
        gg.addColorStop(0, 'rgba(233,238,252,0.5)'); gg.addColorStop(1, 'rgba(233,238,252,0)');
        cg.fillStyle = gg; cg.beginPath(); cg.arc(x, y, rr, 0, TAU); cg.fill();
      }
      cg.filter = 'none';
      C.cloud = cl;
    }

    // ---- schach ----
    {
      const r = fx.rng(4202);
      const sch = fx.canvas(SCH_W, SCH_H), g = sch.getContext('2d');
      g.lineCap = 'round'; g.lineJoin = 'round';
      const depth = (y) => fx.lerp(1.45, 0.62, fx.clamp(y / SCH_H)); // top = overhead (near), bottom = far
      const warmth = (y) => 0.25 + 0.75 * fx.clamp(y / SCH_H);
      const OLIVE = [66, 84, 46], DRY = [120, 92, 52], GOLD = [226, 176, 104];

      function pole(x0, y0, x1, y1) {
        const sc = depth((y0 + y1) / 2), w = 20 * sc;
        g.strokeStyle = '#1a120c'; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
        const k = warmth((y0 + y1) / 2);
        g.strokeStyle = col(mix([70, 46, 26], [196, 136, 72], k)); g.lineWidth = w * 0.42;
        g.beginPath(); g.moveTo(x0, y0 + w * 0.22); g.lineTo(x1, y1 + w * 0.22); g.stroke();
        g.strokeStyle = 'rgba(20,12,8,0.8)'; g.lineWidth = 2.2 * sc;
        const len = Math.hypot(x1 - x0, y1 - y0), n = Math.floor(len / (150 * sc));
        const nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
        for (let i = 1; i < n; i++) {
          const s = i / n + (r() - 0.5) * 0.03, px = x0 + (x1 - x0) * s, py = y0 + (y1 - y0) * s;
          g.beginPath(); g.moveTo(px - nx * w * 0.5, py - ny * w * 0.5); g.lineTo(px + nx * w * 0.5, py + ny * w * 0.5); g.stroke();
        }
      }

      function frond(x, y, ang, len, layerK) {
        const sc = depth(y) * (0.8 + r() * 0.4);
        const bend = (r() - 0.5) * 0.9;
        const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
        const nx = -Math.sin(ang), ny = Math.cos(ang);
        const cx = (x + ex) / 2 + nx * len * bend * 0.35, cy = (y + ey) / 2 + ny * len * bend * 0.35;
        const leaves = new Path2D(), rib = new Path2D();
        rib.moveTo(x, y); rib.quadraticCurveTo(cx, cy, ex, ey);
        const n = Math.max(10, Math.floor(len / (13 * sc)));
        const L0 = (78 + r() * 44) * sc, spread = 0.42 + r() * 0.3;
        for (let i = 1; i <= n; i++) {
          const s = i / n;
          if (s < 0.1) continue;
          const px = qp(x, cx, ex, s), py = qp(y, cy, ey, s);
          const ta = Math.atan2(qd(y, cy, ey, s), qd(x, cx, ex, s));
          const ll = L0 * (0.25 + 0.75 * Math.sin(Math.PI * Math.min(1, (s - 0.05) * 1.02))) * (0.85 + r() * 0.3);
          for (let side = -1; side <= 1; side += 2) {
            if (r() < 0.07) continue;
            const a = ta + side * spread * (1 - 0.25 * s) + (r() - 0.5) * 0.14;
            const e2x = px + Math.cos(a) * ll, e2y = py + Math.sin(a) * ll;
            const ca = a + side * 0.12;
            leaves.moveTo(px, py);
            leaves.quadraticCurveTo(px + Math.cos(ca) * ll * 0.55, py + Math.sin(ca) * ll * 0.55, e2x, e2y);
          }
        }
        const k = warmth(y) * layerK * (0.7 + 0.3 * r());
        const base = r() < 0.55 ? OLIVE : DRY;
        g.strokeStyle = `rgba(16,11,8,${0.9})`;
        g.lineWidth = 5.2 * sc; g.stroke(leaves); g.lineWidth = 5.5 * sc; g.stroke(rib);
        g.save(); g.translate(0, 1.3 * sc);
        g.strokeStyle = col(mix(base, GOLD, k)); g.lineWidth = 2.8 * sc; g.stroke(leaves);
        g.lineWidth = 2.6 * sc; g.stroke(rib);
        g.restore();
        if (r() < 0.6) { // moonlit rim on the upper edge
          g.save(); g.translate(0, -1.3 * sc);
          g.strokeStyle = 'rgba(195,208,255,0.2)'; g.lineWidth = 0.9 * sc; g.stroke(leaves); g.restore();
        }
      }

      function branch(x, y, ang, len) {
        const sc = depth(y) * (0.8 + r() * 0.3);
        const k = warmth(y);
        const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
        g.strokeStyle = '#1a120c'; g.lineWidth = 3 * sc;
        g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.stroke();
        const n = Math.floor(len / (16 * sc));
        const leafD = new Path2D(), leafL = new Path2D();
        for (let i = 1; i < n; i++) {
          const s = i / n, px = x + (ex - x) * s, py = y + (ey - y) * s;
          for (let side = -1; side <= 1; side += 2) {
            if (r() < 0.2) continue;
            const a = ang + side * (0.6 + r() * 0.4), l = (16 + r() * 10) * sc, wdt = (4.5 + r() * 2) * sc;
            const lx = px + Math.cos(a) * l * 0.5, ly = py + Math.sin(a) * l * 0.5;
            leafD.moveTo(lx + Math.cos(a) * l * 0.5, ly + Math.sin(a) * l * 0.5);
            leafD.ellipse(lx, ly, l * 0.5, wdt, a, 0, TAU);
            leafL.moveTo(lx + Math.cos(a) * l * 0.4, ly + 1 * sc + Math.sin(a) * l * 0.4);
            leafL.ellipse(lx, ly + 1 * sc, l * 0.4, wdt * 0.55, a, 0, TAU);
          }
        }
        g.fillStyle = '#17110b'; g.fill(leafD);
        g.fillStyle = col(mix([60, 80, 44], [196, 170, 100], k * 0.85)); g.fill(leafL);
      }

      // back layer: dim fronds
      for (let i = 0; i < 26; i++) {
        const y = r() * SCH_H * 1.05 - 40, x = r() * SCH_W;
        frond(x - 200, y, (r() - 0.5) * 0.9 + (r() < 0.5 ? 0 : Math.PI), 380 + r() * 380, 0.45);
      }
      // poles (perspective: closer together toward the far/bottom edge)
      const poleY = [1340, 1180, 980, 720, 390];
      for (const py of poleY) pole(-40, py + (r() - 0.5) * 40, SCH_W + 40, py + (r() - 0.5) * 60);
      // mid layer
      for (let i = 0; i < 30; i++) {
        const y = r() * SCH_H * 1.05 - 30, x = r() * SCH_W;
        const a = (r() - 0.5) * 1.1 + (r() < 0.5 ? 0 : Math.PI);
        frond(x - Math.cos(a) * 250, y, a, 380 + r() * 420, 0.8);
      }
      for (let i = 0; i < 12; i++) {
        const y = r() * SCH_H, x = r() * SCH_W;
        branch(x, y, r() * TAU, 140 + r() * 180);
      }
      // front layer: few large fronds
      for (let i = 0; i < 12; i++) {
        const y = r() * SCH_H * 0.85, x = r() * SCH_W;
        const a = (r() - 0.5) * 1.3 + (r() < 0.5 ? 0 : Math.PI);
        frond(x - Math.cos(a) * 300, y, a, 480 + r() * 380, 1.0);
      }
      // fringe hanging over the wall beam at the bottom
      for (let i = 0; i < 14; i++) {
        const x = r() * SCH_W;
        frond(x, SCH_H - 90 - r() * 60, Math.PI / 2 + (r() - 0.5) * 1.6, 110 + r() * 90, 1.0);
      }
      C.sch = sch;

      // sample gaps (for star grains) and lit frond points (for glints)
      const img = g.getImageData(0, 0, SCH_W, SCH_H).data;
      const gaps = [], lit = [];
      for (let tries = 0; tries < 60000 && (gaps.length < 1400 || lit.length < 900); tries++) {
        const x = 60 + Math.floor(r() * W), y = Math.floor(r() * (SCH_H - 60));
        const p = (y * SCH_W + x) * 4;
        const a = img[p + 3], lum = img[p] + img[p + 1];
        if (a < 20 && gaps.length < 1400) gaps.push(x, y);
        else if (a > 200 && lum > 260 && lit.length < 900) lit.push(x, y);
      }
      C.gaps = gaps; C.lit = lit;
    }

    // ---- wall (back wall, beam, posts, paper chains, hanging fruit, plaques) ----
    const wallGlints = [];
    {
      const r = fx.rng(4303);
      const wall = fx.canvas(W, WALL_H), g = wall.getContext('2d');
      let gr = g.createLinearGradient(0, 0, 0, WALL_H);
      gr.addColorStop(0, '#24170f'); gr.addColorStop(0.3, '#4a2f1d'); gr.addColorStop(0.65, '#8c5a32'); gr.addColorStop(1, '#bf8550');
      g.fillStyle = gr; g.fillRect(0, 0, W, WALL_H);
      // fabric panels with soft folds
      const pw = 190;
      for (let x0 = 64 - 30; x0 < W; x0 += pw) {
        const pg = g.createLinearGradient(x0, 0, x0 + pw, 0);
        pg.addColorStop(0, 'rgba(20,10,5,0.28)'); pg.addColorStop(0.25, 'rgba(255,220,170,0.06)');
        pg.addColorStop(0.5, 'rgba(20,10,5,0.1)'); pg.addColorStop(0.72, 'rgba(255,220,170,0.08)'); pg.addColorStop(1, 'rgba(20,10,5,0.3)');
        g.fillStyle = pg; g.fillRect(x0, 50, pw, WALL_H);
        g.strokeStyle = 'rgba(30,16,8,0.35)'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(x0, 50); g.lineTo(x0 + 3, WALL_H); g.stroke();
        // scalloped sag between ties under the beam
        g.fillStyle = 'rgba(18,10,6,0.45)';
        g.beginPath(); g.moveTo(x0, 50); g.quadraticCurveTo(x0 + pw / 2, 86, x0 + pw, 50); g.lineTo(x0 + pw, 50); g.closePath(); g.fill();
      }
      // watercolor mottling
      const nz = fx.canvas(135, 163), ng = nz.getContext('2d');
      const id = ng.createImageData(135, 163);
      for (let y = 0; y < 163; y++) for (let x = 0; x < 135; x++) {
        const v = fx.fbm(x * 0.07, y * 0.07, 4), p = (y * 135 + x) * 4;
        id.data[p] = 30; id.data[p + 1] = 16; id.data[p + 2] = 8; id.data[p + 3] = fx.clamp(0.5 + v * 0.9) * 55;
      }
      ng.putImageData(id, 0, 0);
      g.drawImage(nz, 0, 0, W, WALL_H);
      // beam
      gr = g.createLinearGradient(0, 0, 0, 56);
      gr.addColorStop(0, '#1a100a'); gr.addColorStop(0.6, '#4b2e1a'); gr.addColorStop(1, '#8a5a32');
      g.fillStyle = gr; g.fillRect(0, 0, W, 56);
      g.strokeStyle = 'rgba(20,10,6,0.5)'; g.lineWidth = 1.2;
      for (let i = 0; i < 7; i++) { const y = 8 + r() * 42; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(300, y + (r() - 0.5) * 8, 700, y + (r() - 0.5) * 8, W, y + (r() - 0.5) * 6); g.stroke(); }
      // corner posts
      for (const px of [0, W - 64]) {
        gr = g.createLinearGradient(px, 0, px + 64, 0);
        gr.addColorStop(0, '#140c07'); gr.addColorStop(px ? 0.3 : 0.7, '#6b4426'); gr.addColorStop(1, '#1c110a');
        g.fillStyle = gr; g.fillRect(px, 0, 64, WALL_H);
        // rope lashing
        g.strokeStyle = 'rgba(200,160,100,0.55)'; g.lineWidth = 3;
        for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(px - 4, 20 + k * 9); g.lineTo(px + 68, 30 + k * 9); g.stroke(); }
      }

      // paper chains (muted colours), two rows of swags
      const CH = [[176, 96, 84], [120, 138, 86], [214, 166, 96], [110, 124, 160], [186, 150, 120]];
      function chain(x0, x1, y0, sag, size, colOff) {
        const n = Math.floor((x1 - x0) / (size * 1.05));
        for (let i = 0; i <= n; i++) {
          const s = i / n, x = x0 + (x1 - x0) * s, y = y0 + sag * 4 * s * (1 - s);
          const slope = Math.atan2(sag * 4 * (1 - 2 * s), x1 - x0);
          const c = CH[(i + colOff) % CH.length];
          const light = 0.55 + 0.45 * fx.clamp((y - 40) / 300);
          g.save(); g.translate(x, y); g.rotate(slope);
          g.lineWidth = size * 0.28;
          if (i % 2 === 0) { g.strokeStyle = col(c.map((v) => v * light)); g.beginPath(); g.ellipse(0, 0, size * 0.62, size * 0.4, 0, 0, TAU); g.stroke(); }
          else { g.strokeStyle = col(c.map((v) => v * light * 0.8)); g.beginPath(); g.moveTo(-size * 0.62, 0); g.lineTo(size * 0.62, 0); g.lineWidth = size * 0.3; g.stroke(); }
          g.restore();
          if (i % 5 === 2) wallGlints.push(x, y + size * 0.3);
        }
      }
      chain(70, 540, 56, 170, 22, 0);
      chain(540, 1010, 56, 170, 22, 2);
      chain(70, 1010, 60, 110, 16, 1);

      function stringTo(x, y0, y1) {
        g.strokeStyle = 'rgba(210,180,130,0.55)'; g.lineWidth = 1.4;
        g.beginPath(); g.moveTo(x, y0); g.lineTo(x + 1, y1); g.stroke();
      }
      function pomegranate(x, y, R) {
        stringTo(x, 50, y - R);
        const pg = g.createRadialGradient(x - R * 0.2, y + R * 0.45, R * 0.1, x, y, R * 1.1);
        pg.addColorStop(0, '#d8704c'); pg.addColorStop(0.45, '#9a3226'); pg.addColorStop(1, '#3d120e');
        g.fillStyle = pg; g.beginPath(); g.ellipse(x, y, R, R * 0.96, 0, 0, TAU); g.fill();
        // crown at the bottom
        g.fillStyle = '#5e1a14';
        g.beginPath();
        for (let k = 0; k <= 6; k++) {
          const a = Math.PI * (0.2 + 0.6 * k / 6), rr = k % 2 ? R * 0.2 : R * 0.36;
          const px = x + Math.cos(a) * rr * 1.2 - R * 0.0, py = y + R * 0.86 + Math.sin(a) * rr * 0.8;
          k ? g.lineTo(px, py) : g.moveTo(px, py);
        }
        g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,200,140,0.35)'; g.beginPath(); g.ellipse(x - R * 0.35, y + R * 0.35, R * 0.18, R * 0.1, -0.6, 0, TAU); g.fill();
        wallGlints.push(x - R * 0.35, y + R * 0.35, x + R * 0.3, y + R * 0.5);
      }
      function driedFruit(x, y0, n, gap) {
        stringTo(x, 50, y0 + n * gap);
        for (let k = 0; k < n; k++) {
          const y = y0 + k * gap, R = 9 + r() * 3;
          const c = k % 2 ? [184, 110, 48] : [150, 80, 40];
          const fg = g.createRadialGradient(x - 2, y + 3, 1, x, y, R);
          fg.addColorStop(0, col(c.map((v) => Math.min(255, v * 1.35)))); fg.addColorStop(1, col(c.map((v) => v * 0.45)));
          g.fillStyle = fg; g.beginPath(); g.ellipse(x, y, R * 0.85, R, 0, 0, TAU); g.fill();
          if (k % 2 === 0) wallGlints.push(x - 2, y + 4);
        }
      }
      pomegranate(165, 430, 34);
      driedFruit(250, 250, 7, 26);
      pomegranate(415, 205, 22);
      pomegranate(668, 240, 24);
      driedFruit(830, 230, 6, 26);
      pomegranate(930, 470, 36);

      // hanging plaques with abstract ornament (no text)
      function plaque(x, y, w, h, kind) {
        g.strokeStyle = 'rgba(210,180,130,0.5)'; g.lineWidth = 1.3;
        g.beginPath(); g.moveTo(x + w * 0.15, y); g.lineTo(x + w / 2, y - 70); g.lineTo(x + w * 0.85, y); g.stroke();
        g.fillStyle = 'rgba(10,6,3,0.35)'; g.fillRect(x + 6, y + 8, w, h);
        // arched frame
        const arch = (inset) => {
          g.beginPath();
          g.moveTo(x + inset, y + h - inset); g.lineTo(x + inset, y + w / 2);
          g.arc(x + w / 2, y + w / 2, w / 2 - inset, Math.PI, 0);
          g.lineTo(x + w - inset, y + h - inset); g.closePath();
        };
        arch(0); g.fillStyle = '#5a3a1f'; g.fill();
        arch(8);
        const pg = g.createLinearGradient(0, y, 0, y + h);
        pg.addColorStop(0, '#9c7c56'); pg.addColorStop(1, '#e2c796');
        g.fillStyle = pg; g.fill();
        arch(14); g.strokeStyle = 'rgba(120,60,30,0.7)'; g.lineWidth = 2; g.stroke();
        // dotted border
        g.fillStyle = 'rgba(150,50,36,0.8)';
        for (let k = 0; k < 18; k++) { const yy = y + w / 2 + (h - w / 2 - 24) * k / 17; g.beginPath(); g.arc(x + 20, yy, 2, 0, TAU); g.arc(x + w - 20, yy, 2, 0, TAU); g.fill(); }
        const cx = x + w / 2, cy = y + h * 0.52;
        if (kind === 0) {
          // rosette
          for (let k = 0; k < 12; k++) {
            const a = k * TAU / 12;
            g.fillStyle = k % 2 ? 'rgba(79,107,58,0.85)' : 'rgba(170,70,48,0.85)';
            g.beginPath(); g.ellipse(cx + Math.cos(a) * 26, cy + Math.sin(a) * 26, 16, 6, a, 0, TAU); g.fill();
          }
          g.strokeStyle = 'rgba(160,110,40,0.9)'; g.lineWidth = 2;
          g.beginPath(); g.arc(cx, cy, 46, 0, TAU); g.stroke();
          g.fillStyle = '#c8962e'; g.beginPath(); g.arc(cx, cy, 9, 0, TAU); g.fill();
          for (let k = 0; k < 24; k++) { const a = k * TAU / 24; g.beginPath(); g.arc(cx + Math.cos(a) * 54, cy + Math.sin(a) * 54, 1.8, 0, TAU); g.fill(); }
        } else {
          // symmetric vine with pomegranates
          g.strokeStyle = 'rgba(79,107,58,0.9)'; g.lineWidth = 2.4;
          g.beginPath(); g.moveTo(cx, cy + 70); g.lineTo(cx, cy - 60); g.stroke();
          for (let k = 0; k < 3; k++) {
            const yy = cy + 40 - k * 42;
            for (const sd of [-1, 1]) {
              g.beginPath(); g.moveTo(cx, yy); g.quadraticCurveTo(cx + sd * 30, yy - 30, cx + sd * 44, yy - 10); g.stroke();
              g.fillStyle = 'rgba(160,56,40,0.9)'; g.beginPath(); g.arc(cx + sd * 46, yy - 6, 7, 0, TAU); g.fill();
              g.fillStyle = 'rgba(79,107,58,0.85)'; g.beginPath(); g.ellipse(cx + sd * 16, yy - 14, 8, 3.5, sd * -0.7, 0, TAU); g.fill();
            }
          }
          g.fillStyle = '#c8962e'; g.beginPath(); g.arc(cx, cy - 66, 6, 0, TAU); g.fill();
        }
        wallGlints.push(cx, cy, x + 10, y + h - 10, x + w - 10, y + w / 2);
      }
      plaque(120, 520, 150, 220, 0);
      plaque(810, 540, 150, 220, 1);

      // warm lamplight baked from below, darker corners
      const lg = g.createRadialGradient(540, WALL_H + 150, 50, 540, WALL_H + 150, 1250);
      lg.addColorStop(0, 'rgba(255,170,90,0.35)'); lg.addColorStop(0.5, 'rgba(255,150,70,0.1)'); lg.addColorStop(1, 'rgba(255,150,70,0)');
      g.globalCompositeOperation = 'lighter'; g.fillStyle = lg; g.fillRect(0, 0, W, WALL_H);
      g.globalCompositeOperation = 'source-over';
      C.wall = wall;
      C.wallGlints = wallGlints;
    }

    // ---- table with cloth, candles, oil lamp, kiddush cup, covered challah ----
    const flames = [];      // [x, y (table canvas), size]
    const tableGlints = [];
    {
      const r = fx.rng(4404);
      const tb = fx.canvas(W, TABLE_H), g = tb.getContext('2d');
      const T0 = TABLE_LINE;
      // floor and the foot of the wall around the table
      let gr = g.createLinearGradient(0, T0 - 70, 0, TABLE_H);
      gr.addColorStop(0, 'rgba(10,5,2,0)'); gr.addColorStop(0.07, 'rgba(12,7,4,0.6)'); gr.addColorStop(0.1, '#1e130b'); gr.addColorStop(1, '#0c0705');
      g.fillStyle = gr; g.fillRect(0, T0 - 70, W, TABLE_H - T0 + 70);
      // table top: a trapezoid in perspective
      const BL = 105, BR = 975, FY = T0 + 440, FL = -60, FR = W + 60;
      const top = new Path2D();
      top.moveTo(BL, T0); top.lineTo(BR, T0); top.lineTo(FR, FY); top.lineTo(FL, FY); top.closePath();
      gr = g.createLinearGradient(0, T0, 0, FY);
      gr.addColorStop(0, '#a58a64'); gr.addColorStop(0.3, '#bea47c'); gr.addColorStop(1, '#7a6246');
      g.fillStyle = gr; g.fill(top);
      // front drape with folds
      gr = g.createLinearGradient(0, FY, 0, TABLE_H);
      gr.addColorStop(0, '#9c7f5a'); gr.addColorStop(1, '#4a3622');
      g.fillStyle = gr; g.fillRect(-20, FY, W + 40, TABLE_H - FY);
      for (let x = -20; x < W + 20; x += 70) {
        const fg = g.createLinearGradient(x, 0, x + 70, 0);
        fg.addColorStop(0, 'rgba(30,18,10,0.25)'); fg.addColorStop(0.5, 'rgba(255,230,190,0.08)'); fg.addColorStop(1, 'rgba(30,18,10,0.25)');
        g.fillStyle = fg; g.fillRect(x, FY, 70, TABLE_H - FY);
      }
      g.strokeStyle = 'rgba(255,238,205,0.55)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(-20, FY); g.lineTo(W + 20, FY); g.stroke();
      g.fillStyle = 'rgba(190,140,60,0.5)'; g.fillRect(-20, FY + 24, W + 40, 6);
      g.save(); g.clip(top);
      g.strokeStyle = 'rgba(255,245,225,0.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(BL, T0 + 1); g.lineTo(BR, T0 + 1); g.stroke();
      // woven border bands following the edges
      g.strokeStyle = 'rgba(176,126,52,0.45)'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(BL + 14, T0 + 16); g.lineTo(BR - 14, T0 + 16); g.lineTo(FR - 50, FY - 26); g.moveTo(BL + 14, T0 + 16); g.lineTo(FL + 50, FY - 26); g.stroke();
      // creases converging toward the back
      g.strokeStyle = 'rgba(110,80,50,0.13)'; g.lineWidth = 3;
      for (let k = 0; k < 9; k++) {
        const xb = 100 + k * 110 + (r() - 0.5) * 40;
        g.beginPath(); g.moveTo(540 + (xb - 540) * 0.8, T0 + 20); g.lineTo(540 + (xb - 540) * 1.35, FY); g.stroke();
      }
      g.restore();
      // lamplight on the cloth
      g.globalCompositeOperation = 'lighter';
      for (const [x, y, rr, a] of [[280, T0 + 260, 380, 0.22], [360, T0 + 40, 300, 0.2], [720, T0 + 40, 300, 0.2]]) {
        const lg = g.createRadialGradient(x, y, 0, x, y, rr);
        lg.addColorStop(0, `rgba(255,190,110,${a})`); lg.addColorStop(1, 'rgba(255,170,90,0)');
        g.fillStyle = lg; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
      }
      g.globalCompositeOperation = 'source-over';
      const shadow = (x, y, rx, ry, a = 0.35) => {
        const sg = g.createRadialGradient(x, y, 0, x, y, rx);
        sg.addColorStop(0, `rgba(60,36,18,${a})`); sg.addColorStop(1, 'rgba(60,36,18,0)');
        g.save(); g.translate(x, y); g.scale(1, ry / rx); g.translate(-x, -y);
        g.fillStyle = sg; g.beginPath(); g.arc(x, y, rx, 0, TAU); g.fill(); g.restore();
      };
      const metal = (x0, x1, dark, mid, hi) => {
        const mg = g.createLinearGradient(x0, 0, x1, 0);
        mg.addColorStop(0, dark); mg.addColorStop(0.35, hi); mg.addColorStop(0.55, mid); mg.addColorStop(1, dark);
        return mg;
      };

      // covered challah (back left): an embroidered cloth draped over two loaves on a board
      {
        const x = 225, y = T0 + 105;
        shadow(x + 12, y + 10, 165, 22, 0.5);
        // wooden board
        g.fillStyle = '#3a2210'; g.beginPath(); g.ellipse(x, y + 6, 150, 13, 0, 0, TAU); g.fill();
        g.fillStyle = '#6a4222'; g.beginPath(); g.ellipse(x, y + 2, 148, 11, 0, 0, TAU); g.fill();
        const cover = new Path2D();
        cover.moveTo(x - 146, y + 14);                                // left hanging corner
        cover.bezierCurveTo(x - 136, y - 10, x - 128, y - 40, x - 112, y - 50);
        cover.bezierCurveTo(x - 90, y - 72, x - 40, y - 72, x - 14, y - 56);  // first loaf
        cover.bezierCurveTo(x + 10, y - 72, x + 80, y - 74, x + 108, y - 50); // second loaf
        cover.bezierCurveTo(x + 126, y - 40, x + 136, y - 10, x + 148, y + 16); // right hanging corner
        cover.lineTo(x + 116, y + 2);
        cover.bezierCurveTo(x + 50, y + 8, x - 50, y + 8, x - 114, y);
        cover.closePath();
        const vg = g.createLinearGradient(0, y - 76, 0, y + 14);
        vg.addColorStop(0, '#34456e'); vg.addColorStop(0.5, '#1f2a4a'); vg.addColorStop(1, '#121833');
        g.fillStyle = vg; g.fill(cover);
        // soft highlights on the loaves, drape folds toward the corners
        g.strokeStyle = 'rgba(255,200,150,0.25)'; g.lineWidth = 4;
        g.beginPath(); g.moveTo(x - 104, y - 54); g.quadraticCurveTo(x - 64, y - 74, x - 24, y - 60); g.stroke();
        g.beginPath(); g.moveTo(x + 4, y - 62); g.quadraticCurveTo(x + 56, y - 76, x + 100, y - 52); g.stroke();
        g.strokeStyle = 'rgba(5,5,15,0.4)'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(x - 118, y - 40); g.quadraticCurveTo(x - 128, y - 12, x - 134, y + 10); g.stroke();
        g.beginPath(); g.moveTo(x + 116, y - 40); g.quadraticCurveTo(x + 128, y - 12, x + 138, y + 12); g.stroke();
        g.beginPath(); g.moveTo(x - 14, y - 56); g.quadraticCurveTo(x - 10, y - 26, x - 12, y + 4); g.stroke();
        // gold embroidered band (zig-zag + dots) across the front, fringe on the hem
        g.strokeStyle = 'rgba(226,182,98,0.9)'; g.lineWidth = 1.6;
        g.beginPath();
        for (let k = 0; k <= 22; k++) {
          const s2 = k / 22, px = x - 110 + 220 * s2, py = y - 18 + 4 * Math.sin(s2 * Math.PI) + (k % 2 ? -6 : 0);
          k ? g.lineTo(px, py) : g.moveTo(px, py);
        }
        g.stroke();
        g.lineWidth = 2.2;
        g.beginPath(); g.moveTo(x - 114, y - 4); g.bezierCurveTo(x - 50, y + 4, x + 50, y + 4, x + 116, y - 2); g.stroke();
        g.beginPath(); g.moveTo(x - 112, y - 30); g.bezierCurveTo(x - 50, y - 24, x + 50, y - 24, x + 112, y - 30); g.stroke();
        g.strokeStyle = 'rgba(226,182,98,0.7)'; g.lineWidth = 1.2;
        g.beginPath();
        for (let k = 0; k <= 30; k++) { const s2 = k / 30, px = x - 112 + 226 * s2, py = y + 1 + 4 * Math.sin(s2 * Math.PI); g.moveTo(px, py); g.lineTo(px, py + 7); }
        g.stroke();
        g.fillStyle = 'rgba(232,190,104,0.95)';
        for (const [tx, ty] of [[x - 146, y + 14], [x + 148, y + 16]]) { g.beginPath(); g.moveTo(tx - 4, ty); g.lineTo(tx + 4, ty); g.lineTo(tx, ty + 14); g.fill(); }
        tableGlints.push(x - 90, y - 4, x + 40, y + 2, x, y - 20, x + 148, y + 26);
      }

      // candlesticks (silver) with white candles
      function candlestick(x, baseY, hgt) {
        shadow(x + 6, baseY + 4, 60, 12, 0.45);
        const top = baseY - hgt;
        g.fillStyle = metal(x - 36, x + 36, '#3c3a3e', '#8d8a90', '#e8e4e8');
        g.beginPath(); g.ellipse(x, baseY - 6, 36, 10, 0, 0, TAU); g.fill();
        g.beginPath(); g.moveTo(x - 30, baseY - 8); g.quadraticCurveTo(x - 8, baseY - 24, x - 7, baseY - 40); g.lineTo(x + 7, baseY - 40); g.quadraticCurveTo(x + 8, baseY - 24, x + 30, baseY - 8); g.fill();
        g.fillStyle = metal(x - 9, x + 9, '#3c3a3e', '#8d8a90', '#f1edf1');
        g.fillRect(x - 6, top + 34, 12, hgt - 70);
        for (const ky of [baseY - 44, top + 90, top + 40]) { g.beginPath(); g.ellipse(x, ky, 12, 6, 0, 0, TAU); g.fill(); }
        g.fillStyle = metal(x - 22, x + 22, '#3c3a3e', '#8d8a90', '#f1edf1');
        g.beginPath(); g.moveTo(x - 22, top + 22); g.lineTo(x + 22, top + 22); g.lineTo(x + 8, top + 38); g.lineTo(x - 8, top + 38); g.fill();
        g.beginPath(); g.ellipse(x, top + 22, 22, 5, 0, 0, TAU); g.fill();
        // candle
        const cg = g.createLinearGradient(x - 11, 0, x + 11, 0);
        cg.addColorStop(0, '#b8a078'); cg.addColorStop(0.4, '#fff4dc'); cg.addColorStop(1, '#c4ab82');
        g.fillStyle = cg; g.fillRect(x - 11, top - 110, 22, 132);
        g.fillStyle = 'rgba(255,230,180,0.9)'; g.beginPath(); g.ellipse(x, top - 110, 11, 3.5, 0, 0, TAU); g.fill();
        g.strokeStyle = '#2a1a10'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, top - 110); g.lineTo(x + 1, top - 118); g.stroke();
        flames.push([x + 1, top - 120, 1]);
        tableGlints.push(x - 12, baseY - 8, x - 3, top + 40, x - 8, top + 22);
      }
      candlestick(365, T0 + 50, 230);
      candlestick(715, T0 + 50, 230);

      // oil lamp (front left): a simple round clay lamp with a short nozzle
      {
        const x = 175, y = T0 + 300;
        shadow(x + 16, y + 20, 120, 18, 0.5);
        const cg = g.createLinearGradient(x - 70, y - 40, x + 60, y + 20);
        cg.addColorStop(0, '#5a2a14'); cg.addColorStop(0.45, '#b8683a'); cg.addColorStop(1, '#3c1a0c');
        g.fillStyle = cg;
        // body (low dome) and nozzle
        g.beginPath();
        g.moveTo(x - 68, y);
        g.bezierCurveTo(x - 70, y - 44, x + 40, y - 48, x + 62, y - 22);
        g.bezierCurveTo(x + 80, y - 26, x + 104, y - 26, x + 110, y - 14);
        g.bezierCurveTo(x + 112, y - 4, x + 90, y + 2, x + 60, y + 4);
        g.bezierCurveTo(x + 30, y + 16, x - 60, y + 18, x - 68, y);
        g.fill();
        // top disc and filling hole
        g.fillStyle = 'rgba(40,16,6,0.55)'; g.beginPath(); g.ellipse(x - 6, y - 28, 36, 9, 0, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(255,190,130,0.35)'; g.lineWidth = 2; g.beginPath(); g.ellipse(x - 6, y - 28, 38, 10, 0, Math.PI * 0.1, Math.PI * 0.95); g.stroke();
        g.fillStyle = '#1a0a04'; g.beginPath(); g.ellipse(x - 6, y - 29, 9, 3, 0, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,200,140,0.45)'; g.beginPath(); g.ellipse(x + 70, y - 18, 26, 3.5, -0.1, 0, TAU); g.fill();
        // wick
        g.strokeStyle = '#2a1a10'; g.lineWidth = 3; g.beginPath(); g.moveTo(x + 102, y - 20); g.lineTo(x + 106, y - 30); g.stroke();
        flames.push([x + 107, y - 36, 1.35]);
        tableGlints.push(x + 70, y - 18, x - 30, y - 34, x + 20, y - 36);
      }

      // kiddush cup (silver) with wine
      {
        const x = 870, y = T0 + 200;
        shadow(x + 12, y + 8, 70, 13, 0.45);
        g.fillStyle = metal(x - 44, x + 44, '#3a383c', '#8f8b92', '#f4f0f4');
        g.beginPath(); g.ellipse(x, y, 44, 12, 0, 0, TAU); g.fill();
        g.beginPath(); g.moveTo(x - 40, y - 2); g.quadraticCurveTo(x - 10, y - 16, x - 7, y - 60); g.lineTo(x + 7, y - 60); g.quadraticCurveTo(x + 10, y - 16, x + 40, y - 2); g.fill();
        g.fillStyle = metal(x - 10, x + 10, '#3a383c', '#8f8b92', '#f4f0f4');
        g.fillRect(x - 5, y - 110, 10, 52);
        g.beginPath(); g.ellipse(x, y - 84, 11, 7, 0, 0, TAU); g.fill();
        g.fillStyle = metal(x - 52, x + 52, '#38363a', '#8f8b92', '#fbf7fb');
        g.beginPath(); g.moveTo(x - 50, y - 200); g.lineTo(x + 50, y - 200); g.bezierCurveTo(x + 50, y - 140, x + 20, y - 112, x, y - 110); g.bezierCurveTo(x - 20, y - 112, x - 50, y - 140, x - 50, y - 200); g.fill();
        // engraved bands (ornament only)
        g.strokeStyle = 'rgba(60,56,64,0.6)'; g.lineWidth = 1.3;
        g.beginPath(); g.moveTo(x - 49, y - 186); g.quadraticCurveTo(x, y - 180, x + 49, y - 186); g.stroke();
        g.beginPath(); g.moveTo(x - 47, y - 162); g.quadraticCurveTo(x, y - 156, x + 47, y - 162); g.stroke();
        for (let k = 0; k < 9; k++) { const px = x - 40 + k * 10; g.beginPath(); g.arc(px, y - 174 + Math.abs(k - 4) * 0.4, 2, 0, TAU); g.stroke(); }
        g.fillStyle = '#6a2030'; g.beginPath(); g.ellipse(x, y - 200, 50, 9, 0, 0, TAU); g.fill();
        g.fillStyle = '#3a0c18'; g.beginPath(); g.ellipse(x, y - 199, 44, 6.5, 0, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,190,120,0.55)'; g.beginPath(); g.ellipse(x - 14, y - 200, 12, 2, 0, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,236,200,0.7)'; g.fillRect(x - 30, y - 194, 4, 60);
        tableGlints.push(x - 28, y - 190, x - 28, y - 160, x + 30, y - 198, x - 20, y - 4);
      }
      C.table = tb; C.flames = flames; C.tableGlints = tableGlints;
      C.lampY = flames.reduce((a, f) => a + f[1], 0) / flames.length;
    }

    // ---- near decorations (pre-blurred for depth of field) ----
    const nearBokeh = [];
    {
      const r = fx.rng(4505);
      const sharp = fx.canvas(W, NEAR_H), g = sharp.getContext('2d');
      function pom(x, y, R) {
        g.strokeStyle = 'rgba(200,160,110,0.7)'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, y - R); g.stroke();
        const pg = g.createRadialGradient(x - R * 0.25, y + R * 0.5, R * 0.1, x, y, R * 1.1);
        pg.addColorStop(0, '#e0784e'); pg.addColorStop(0.45, '#8e2c22'); pg.addColorStop(1, '#2a0b08');
        g.fillStyle = pg; g.beginPath(); g.arc(x, y, R, 0, TAU); g.fill();
        g.fillStyle = '#4a130e'; g.beginPath(); g.moveTo(x - R * 0.3, y + R * 0.85); g.lineTo(x, y + R * 1.18); g.lineTo(x + R * 0.3, y + R * 0.85); g.fill();
        nearBokeh.push(x - R * 0.3, y + R * 0.45, R * 0.9);
      }
      function chainNear(x0, y0, x1, y1, sag, size) {
        const CH = [[176, 96, 84], [120, 138, 86], [214, 166, 96], [110, 124, 160]];
        const n = Math.floor(Math.hypot(x1 - x0, y1 - y0) / (size * 1.05));
        for (let i = 0; i <= n; i++) {
          const s = i / n, x = x0 + (x1 - x0) * s, y = y0 + (y1 - y0) * s + sag * 4 * s * (1 - s);
          g.save(); g.translate(x, y); g.rotate(Math.atan2(y1 - y0 + sag * 4 * (1 - 2 * s), x1 - x0));
          g.strokeStyle = col(CH[i % 4].map((v) => v * 0.8)); g.lineWidth = size * 0.3;
          if (i % 2 === 0) { g.beginPath(); g.ellipse(0, 0, size * 0.62, size * 0.42, 0, 0, TAU); g.stroke(); }
          else { g.beginPath(); g.moveTo(-size * 0.6, 0); g.lineTo(size * 0.6, 0); g.stroke(); }
          g.restore();
          if (i % 4 === 1) nearBokeh.push(x, y + size * 0.3, size * 0.8);
        }
      }
      chainNear(560, 640, 1140, 700, 150, 46);
      chainNear(-60, 600, 300, 640, 120, 46);
      pom(92, 930, 80);
      pom(1000, 1010, 62);
      // dried-fruit strand near the right edge
      g.strokeStyle = 'rgba(200,160,110,0.7)'; g.lineWidth = 3; g.beginPath(); g.moveTo(1040, 0); g.lineTo(1040, 870); g.stroke();
      for (let k = 0; k < 5; k++) {
        const y = 700 + k * 44, R = 18;
        const fg = g.createRadialGradient(1036, y + 6, 2, 1040, y, R);
        fg.addColorStop(0, '#e0a060'); fg.addColorStop(1, '#5a2c12');
        g.fillStyle = fg; g.beginPath(); g.ellipse(1040, y, R * 0.85, R, 0, 0, TAU); g.fill();
      }
      const near = fx.canvas(W, NEAR_H), ng = near.getContext('2d');
      ng.filter = 'blur(10px)'; ng.drawImage(sharp, 0, 0); ng.filter = 'none';
      C.near = near; C.nearBokeh = nearBokeh;
    }

    // ---- light: dapple, shaft, bokeh disc, flame sprite, vignette ----
    {
      const dw = 216, dh = 460; // covers wall + table (world 1080 x 2300)
      const dp = fx.canvas(dw, dh), g = dp.getContext('2d');
      const id = g.createImageData(dw, dh);
      for (let y = 0; y < dh; y++) for (let x = 0; x < dw; x++) {
        const v = fx.fbm(x * 0.3 + 3.1, y * 0.22 + 7.7, 3);
        const a = fx.smooth((v - 0.2) / 0.1) * 0.9;
        const p = (y * dw + x) * 4;
        id.data[p] = 225; id.data[p + 1] = 222; id.data[p + 2] = 240; id.data[p + 3] = a * 255;
      }
      g.putImageData(id, 0, 0);
      const d2 = fx.canvas(W + 80, 2300), g2 = d2.getContext('2d');
      g2.filter = 'blur(2px)'; g2.drawImage(dp, 0, 0, W + 80, 2300); g2.filter = 'none';
      // bake the moonlight dapple into the wall and the table (world-locked, like the schach above)
      const wgc = C.wall.getContext('2d');
      wgc.globalCompositeOperation = 'lighter'; wgc.globalAlpha = 0.06;
      wgc.drawImage(d2, -40, 60); wgc.globalAlpha = 1; wgc.globalCompositeOperation = 'source-over';
      const tgc = C.table.getContext('2d');
      tgc.globalCompositeOperation = 'source-atop'; tgc.globalAlpha = 0.05;
      tgc.drawImage(d2, -40, 60 - 870); tgc.globalAlpha = 1; tgc.globalCompositeOperation = 'source-over';
      // keep the lower UI band quiet (baked at the table's final position)
      const bgr2 = tgc.createLinearGradient(0, 1480 - 910, 0, TABLE_H);
      bgr2.addColorStop(0, 'rgba(12,7,4,0)'); bgr2.addColorStop(1, 'rgba(12,7,4,0.55)');
      tgc.globalCompositeOperation = 'source-atop'; tgc.fillStyle = bgr2; tgc.fillRect(0, 1480 - 910, W, TABLE_H);
      tgc.globalCompositeOperation = 'source-over';

      const sh = fx.canvas(128, 512), sg = sh.getContext('2d');
      const hg = sg.createLinearGradient(0, 0, 128, 0);
      hg.addColorStop(0, 'rgba(210,220,255,0)'); hg.addColorStop(0.5, 'rgba(210,220,255,1)'); hg.addColorStop(1, 'rgba(210,220,255,0)');
      sg.fillStyle = hg; sg.fillRect(0, 0, 128, 512);
      sg.globalCompositeOperation = 'destination-in';
      const vg = sg.createLinearGradient(0, 0, 0, 512);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(0.12, 'rgba(0,0,0,1)'); vg.addColorStop(0.6, 'rgba(0,0,0,0.6)'); vg.addColorStop(1, 'rgba(0,0,0,0)');
      sg.fillStyle = vg; sg.fillRect(0, 0, 128, 512);
      C.shaft = sh;
      // shafts: anchor x in schach canvas, angle, width
      const rs = fx.rng(4606);
      C.shafts = [];
      for (let i = 0; i < 4; i++) C.shafts.push([230 + i * 230 + (rs() - 0.5) * 80, 0.16 + (rs() - 0.5) * 0.08, 50 + rs() * 70, 0.5 + rs() * 0.5, rs() * TAU]);

      const bk = fx.canvas(128, 128), bg = bk.getContext('2d');
      const bgr = bg.createRadialGradient(64, 64, 0, 64, 64, 62);
      bgr.addColorStop(0, 'rgba(255,200,140,0.55)'); bgr.addColorStop(0.8, 'rgba(255,200,140,0.7)');
      bgr.addColorStop(0.92, 'rgba(255,215,160,0.9)'); bgr.addColorStop(1, 'rgba(255,200,140,0)');
      bg.fillStyle = bgr; bg.beginPath(); bg.arc(64, 64, 63, 0, TAU); bg.fill();
      C.bokeh = bk;

      const fl = fx.canvas(64, 128), fg = fl.getContext('2d');
      fg.filter = 'blur(1.5px)';
      const fgr = fg.createRadialGradient(32, 94, 1, 32, 84, 64);
      fgr.addColorStop(0, 'rgba(255,252,235,1)'); fgr.addColorStop(0.14, 'rgba(255,230,150,1)');
      fgr.addColorStop(0.38, 'rgba(255,168,60,0.95)'); fgr.addColorStop(0.75, 'rgba(230,100,30,0.6)'); fgr.addColorStop(1, 'rgba(200,80,20,0)');
      fg.fillStyle = fgr;
      fg.beginPath(); fg.moveTo(32, 8); fg.bezierCurveTo(44, 50, 50, 80, 32, 110); fg.bezierCurveTo(14, 80, 20, 50, 32, 8); fg.fill();
      fg.filter = 'none';
      C.flame = fl;

    }

    // ---- per-grain parameters ----
    {
      const N = env.GRAINS, r = fx.rng(4707);
      const P = {
        kind: new Uint8Array(N), ax: new Float32Array(N), ay: new Float32Array(N),
        w0: new Float32Array(N), ph: new Float32Array(N), fr: new Float32Array(N),
        rel: new Float32Array(N), vx: new Float32Array(N), vy: new Float32Array(N),
        join: new Float32Array(N), ca: new Float32Array(N), cr: new Float32Array(N), cw: new Float32Array(N),
      };
      const gaps = C.gaps, lit = C.lit;
      const wallG = C.wallGlints, tabG = C.tableGlints;
      for (let i = 0; i < N; i++) {
        P.ph[i] = r() * TAU; P.fr[i] = 0.5 + r() * 1.5;
        P.vx[i] = (r() - 0.5) * 30; P.vy[i] = 25 + r() * 45;
        let kind;
        if (i < 1100) kind = 0;          // stars between fronds -> falling motes
        else if (i < 1600) kind = 1;     // glints on the schach -> falling motes
        else if (i < 3400) kind = 2;     // room dust motes
        else kind = 3;                   // glints on decorations / table
        P.kind[i] = kind;
        if (kind === 0) {
          const k = (Math.floor(r() * (gaps.length / 2))) * 2;
          P.ax[i] = gaps[k] - 60 + (r() - 0.5) * 3; P.ay[i] = gaps[k + 1];
          P.w0[i] = 0.3 + 0.6 * Math.pow(r(), 2.2); P.rel[i] = 0.7 + r() * 2.6;
        } else if (kind === 1) {
          const k = (Math.floor(r() * (lit.length / 2))) * 2;
          P.ax[i] = lit[k] - 60; P.ay[i] = lit[k + 1];
          P.w0[i] = 0.2 + 0.4 * r(); P.rel[i] = 1.2 + r() * 2.6;
        } else if (kind === 2) {
          // room space: frame coords at c = 1 (+1180 below), biased toward the lamplight
          P.ax[i] = r() * W; P.ay[i] = -150 + Math.pow(r(), 0.8) * 2600;
          P.w0[i] = 0.08 + 0.3 * Math.pow(r(), 1.6); P.rel[i] = 0;
        } else {
          const useTable = r() < 0.35;
          const src = useTable ? tabG : wallG;
          const k = (Math.floor(r() * (src.length / 2))) * 2;
          P.ax[i] = src[k] + (r() - 0.5) * 10; P.ay[i] = src[k + 1] + (r() - 0.5) * 8;
          P.rel[i] = useTable ? 1 : 0; // reuse: 1 = on table layer
          P.w0[i] = 0.25 + 0.55 * r();
        }
        // centre cloud membership
        const joins = kind === 3 ? r() < 0.25 : kind === 2 ? r() < 0.55 : r() < 0.85;
        P.join[i] = joins ? 3.9 + r() * 1.7 : 99;
        P.ca[i] = r() * TAU;
        const g1 = Math.sqrt(-2 * Math.log(1 - r() * 0.995));
        P.cr[i] = Math.min(1.6, g1 * 0.55) * (0.85 + r() * 0.3);
        P.cw[i] = 0.25 + 0.55 * Math.exp(-P.cr[i] * P.cr[i] * 1.4) + r() * 0.15;
      }
      C.P = P;
    }
  }

  // ---------- draw ----------
  function draw(ctx, t, env) {
    const fx = env.fx;
    const Lc = layout(fx, t), c = Lc.c;
    // (sky, wall and table layers always cover the whole frame between them)
    ctx.save();

    // sky + luminous drifting clouds
    const skyVisible = Lc.schAnchor > 0;
    if (skyVisible) {
      const sy0 = Math.round(Lc.skyOff - 40), vis = Math.min(SKY_H, Math.ceil(Lc.schAnchor - sy0));
      if (vis > 0) ctx.drawImage(C.sky, 0, 0, W, vis, 0, sy0, W, vis);
      ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 2; k++) {
        const x = ((k * 700 + t * (14 + k * 5)) % 1500) - 450, y = Lc.skyOff + 120 + k * 260;
        ctx.globalAlpha = 0.28 + 0.1 * Math.sin(t * 0.7 + k);
        ctx.drawImage(C.cloud, x, y, 620, 280);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }

    // flicker per flame
    const fl = C.flames.map((f, k) => flick(fx, t, k));
    const lampF = (fl[0] + fl[1] + fl[2]) / 3;

    // wall
    const wt = Math.round(Lc.wallTop);
    if (wt < H) ctx.drawImage(C.wall, 0, wt);

    // schach: anchored at the beam, foreshortening as the camera tilts down
    const sh = SCH_H * Lc.schSy, sTop = Lc.schAnchor - sh;
    if (Lc.schAnchor > 0) {
      if (sTop >= 0) ctx.drawImage(C.sch, -60, sTop, SCH_W, sh);
      else { // only the visible rows
        const cut = -sTop / Lc.schSy;
        ctx.drawImage(C.sch, 0, cut, SCH_W, SCH_H - cut, -60, 0, SCH_W, Lc.schAnchor);
      }
      // as the schach foreshortens overhead, let it sink into shadow
      const dk = fx.smooth(fx.range(c, 0.45, 0.95));
      if (dk > 0) {
        const h2 = Math.min(Lc.schAnchor, 700);
        const dg = ctx.createLinearGradient(0, Lc.schAnchor - h2, 0, Lc.schAnchor);
        dg.addColorStop(0, `rgba(10,8,18,${0.75 * dk})`); dg.addColorStop(1, `rgba(10,8,18,${0.35 * dk})`);
        ctx.fillStyle = dg; ctx.fillRect(0, Lc.schAnchor - h2, W, h2);
      }
    }

    // amber uplight from the lamps below while we look up
    const up = 1 - fx.smooth(fx.range(c, 0, 0.55));
    if (up > 0.01) {
      const ug2 = ctx.createLinearGradient(0, H, 0, H * 0.35);
      ug2.addColorStop(0, `rgba(255,150,64,${0.42 * up * lampF})`); ug2.addColorStop(0.5, `rgba(255,140,60,${0.12 * up * lampF})`); ug2.addColorStop(1, 'rgba(255,140,60,0)');
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = ug2; ctx.fillRect(0, H * 0.35, W, H * 0.65);
      const bgw = fx.glow(520, [255, 170, 90]);
      ctx.globalAlpha = 0.55 * up * lampF;
      ctx.drawImage(bgw, CX - 520, H + 120 - 520 + Math.round(600 * c));
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }

    const cloudLight = 0.75 + 0.25 * Math.sin(t * 0.8 + 1.2) * Math.sin(t * 0.33);

    // table
    const tt = Math.round(Lc.tableTop);
    if (tt < H) ctx.drawImage(C.table, 0, tt);

    // light shafts from schach gaps (moonlight)
    ctx.globalCompositeOperation = 'lighter';
    for (const [ax, ang, wdt, str, ph] of C.shafts) {
      const x = ax - 60, y = Lc.schAnchor - 380 * Lc.schSy;
      const a = (0.07 + 0.035 * Math.sin(t * 0.6 + ph)) * str * cloudLight;
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      ctx.globalAlpha = a;
      ctx.drawImage(C.shaft, -wdt / 2, 0, wdt, 1350);
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    ctx.globalCompositeOperation = 'source-over';

    // lamplight: big warm glows (reach up from below when looking up)
    ctx.globalCompositeOperation = 'lighter';
    {
      const y = tt + C.lampY;
      if (y < H + 1100) {
        const big = fx.glow(700, [255, 150, 70]);
        ctx.globalAlpha = Math.min(1, 0.5 * lampF);
        ctx.drawImage(big, CX - 700, Math.round(y) - 700);
      }
    }
    for (let k = 0; k < C.flames.length; k++) {
      const [fxp, fyp, s] = C.flames[k];
      const x = fxp, y = tt + fyp, f = fl[k];
      if (y < H + 200) {
        const g2 = fx.glow(170 * s, [255, 190, 110]);
        ctx.globalAlpha = (s > 1.2 ? 0.3 : 0.5) * f;
        ctx.drawImage(g2, x - 170 * s, y - 170 * s + 6);
        const g3 = fx.glow(40 * s, [255, 200, 120]);
        ctx.globalAlpha = 0.45 * f;
        ctx.drawImage(g3, x - 40 * s, y - 40 * s + 4);
      }
    }
    ctx.globalAlpha = 1;
    // flames
    for (let k = 0; k < C.flames.length; k++) {
      const [fxp, fyp, s] = C.flames[k];
      const x = fxp, y = tt + fyp;
      if (y > H + 60) continue;
      const f = fl[k], sway = Math.sin(t * 7.1 + k * 2) * 0.05 + fx.noise(t * 4 + k * 9, 1) * 0.06;
      ctx.save(); ctx.translate(x, y + 8 * s); ctx.rotate(sway); ctx.scale(s * (0.95 + (f - 1) * 0.5), s * f);
      ctx.drawImage(C.flame, -16, -58, 32, 64);
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35;
      ctx.drawImage(C.flame, -16, -58, 32, 64); ctx.globalAlpha = 1;
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'source-over';

    // near decorations (blurred, depth of field) and their bokeh
    const nt = Math.round(Lc.nearTop);
    ctx.globalCompositeOperation = 'source-over';
    if (nt < H) ctx.drawImage(C.near, 0, nt);
    ctx.globalCompositeOperation = 'lighter';
    const nb = C.nearBokeh;
    for (let i = 0; i < nb.length; i += 3) {
      const y = nt + nb[i + 1];
      if (y < -120 || y > H + 120) continue;
      const rr = nb[i + 2] * 0.7 + 14;
      ctx.globalAlpha = (0.1 + 0.08 * Math.sin(t * 1.3 + i)) * lampF;
      ctx.drawImage(C.bokeh, nb[i] - rr, y - rr, rr * 2, rr * 2);
    }
    // foreground bokeh near the bottom (out-of-focus lamp reflections)
    for (let k = 0; k < 6; k++) {
      const x = 90 + k * 190 + Math.sin(k * 3.1) * 50, y = tt + 1050 + Math.sin(k * 1.7) * 90;
      if (y > H + 120) continue;
      const rr = 50 + (k % 3) * 22;
      ctx.globalAlpha = 0.07 * lampF;
      ctx.drawImage(C.bokeh, x - rr, y - rr, rr * 2, rr * 2);
    }
    // a soft warm haze gathering over the calm centre at the end
    const hz = fx.smooth(fx.range(t, 3.8, 6.8));
    if (hz > 0) {
      const gz = fx.glow(420, [255, 196, 120]);
      ctx.globalAlpha = 0.16 * hz * lampF;
      ctx.drawImage(gz, CX - 420, CY - 420);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.restore();


  }

  // ---------- grains ----------
  function grains(t, out, env) {
    const fx = env.fx, N = env.GRAINS, P = C.P;
    const Lc = layout(fx, t);
    const sy = Lc.schSy, anchor = Lc.schAnchor, wt = Math.round(Lc.wallTop), tt = Math.round(Lc.tableTop);
    const z = Lc.zoom;
    const cloudRot = t * 0.13;
    for (let i = 0; i < N; i++) {
      const kind = P.kind[i], ph = P.ph[i], fr = P.fr[i];
      let x, y, w;
      if (kind <= 1) {
        // attached to the schach
        const stY = (yy) => yy;
        const sx = P.ax[i], sY = anchor - (SCH_H - P.ay[i]) * sy;
        const tw = kind === 0 ? 0.7 + 0.3 * Math.sin(t * 3 * fr + ph) : Math.pow(0.5 + 0.5 * Math.sin(t * 2.2 * fr + ph), 3);
        const rel = P.rel[i];
        if (t <= rel) { x = sx; y = stY(sY); w = P.w0[i] * tw; }
        else {
          // released: drift down as a mote through the light
          const L0 = layout(fx, rel);
          const rx = P.ax[i], ry = L0.schAnchor - (SCH_H - P.ay[i]) * L0.schSy;
          const d = t - rel;
          const mx = rx + P.vx[i] * d + Math.sin(t * 0.9 * fr + ph) * 14;
          const my = ry + P.vy[i] * d + (Lc.roomOff - L0.roomOff) + Math.sin(t * 0.7 + ph) * 8;
          const k = fx.smooth(d / 1.3);
          x = fx.lerp(sx, mx, k); y = fx.lerp(sY, my, k);
          const wm = 0.18 + 0.25 * P.w0[i];
          w = fx.lerp(P.w0[i] * tw, wm * (0.75 + 0.25 * Math.sin(t * 2 * fr + ph)), k);
        }
      } else if (kind === 2) {
        x = P.ax[i] + Math.sin(t * 0.35 * fr + ph) * 30 + t * 4;
        y = P.ay[i] + Lc.roomOff + 1180 - t * (4 + 6 * fr) + Math.sin(t * 0.5 * fr + ph * 2) * 16;
        // brighter in the warm light lower in the frame
        const lightK = fx.clamp((y - 200) / 1100);
        w = P.w0[i] * (0.4 + 0.6 * lightK) * (0.7 + 0.3 * Math.sin(t * 1.7 * fr + ph));
      } else {
        const onTable = P.rel[i] > 0.5;
        x = P.ax[i]; y = P.ay[i] + (onTable ? tt : wt);
        const sp = Math.pow(0.5 + 0.5 * Math.sin(t * 1.6 * fr + ph), 6);
        const settle = fx.smooth(fx.range(t, 1.2 + (ph / TAU) * 2.5, 2.4 + (ph / TAU) * 2.5));
        w = P.w0[i] * (0.15 + 0.85 * sp) * settle;
      }
      // apply the draw-time zoom around the centre
      x = CX + (x - CX) * z; y = CY + (y - CY) * z;
      // gather into the calm centre
      const j = P.join[i];
      if (t > j) {
        const k = fx.ease.inOut(fx.clamp((t - j) / 1.6));
        const a = P.ca[i] + cloudRot * (1.2 - 0.5 * P.cr[i]);
        const rr = P.cr[i];
        const cx = CX + Math.cos(a) * rr * 250 + Math.sin(t * 0.8 + ph) * 6;
        const cy = CY - 10 + Math.sin(a) * rr * 330 + Math.sin(t * 0.6 * fr + ph) * 9;
        const cw = P.cw[i] * (0.8 + 0.2 * Math.sin(t * 2.1 * fr + ph));
        x = fx.lerp(x, cx, k); y = fx.lerp(y, cy, k); w = fx.lerp(w, cw, k);
      }
      out[3 * i] = x; out[3 * i + 1] = y; out[3 * i + 2] = w;
    }
  }

  const TINT_A = [236, 228, 222], TINT_B = [255, 200, 130];
  S.beats[4] = {
    init,
    draw,
    grains,
    tint(t) {
      const k = Math.min(1, Math.max(0, (t - 0.5) / 2.5));
      const s = k * k * (3 - 2 * k);
      return [TINT_A[0] + (TINT_B[0] - TINT_A[0]) * s, TINT_A[1] + (TINT_B[1] - TINT_A[1]) * s, TINT_A[2] + (TINT_B[2] - TINT_A[2]) * s];
    },
  };
})();
