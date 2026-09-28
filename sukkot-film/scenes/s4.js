// Scene 4: Inside the sukkah at night.
// Warm lamplit interior, swaying decorations, a festive table; the camera tilts up
// through the schach to the starry sky where the names of the seven ushpizin glow.
(function () {
  const S = (window.SUKKOT = window.SUKKOT || { scenes: {} });

  const W = 1920, H = 1080;
  const WALL_TOP = -820;   // world y of the top of the wall canvas (beam)
  const SCH_TOP = -1480;   // world y of the top of the schach canvas
  const SCH_H = 810;
  const TBL_TOP = 240;     // world y of the top of the table canvas
  const TBL_H = 940;
  const SKY_H = 1640;
  const BEAM_Y = -790;     // where decorations hang from
  const CAM_PAN = 1990;
  const CAM_END = CAM_PAN + 3.2 * 19;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  const smooth = (a, b, x) => { x = clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  // camera vertical offset (world units; negative = looking higher)
  function camY(t) {
    const u = clamp((t - 0.8) / 14.7, 0, 1);
    const e = 0.5 - 0.5 * Math.cos(Math.PI * u);
    return -(CAM_PAN * e + 3.2 * t);
  }
  const skyShift = (cy) => 0.28 * (-cy) - 0.28 * CAM_END;

  const NAMES = ['אברהם', 'יצחק', 'יעקב', 'משה', 'אהרן', 'יוסף', 'דוד'];
  const FONT = "'Frank Ruhl Libre', 'David Libre', serif";

  let R = null;

  // ---------------------------------------------------------------- sky
  function buildSky(rnd) {
    const c = mk(W, SKY_H), g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, SKY_H);
    gr.addColorStop(0, '#02040f');
    gr.addColorStop(0.35, '#060b24');
    gr.addColorStop(0.75, '#0d1336');
    gr.addColorStop(1, '#171a3c');
    g.fillStyle = gr; g.fillRect(0, 0, W, SKY_H);

    // milky way band (diagonal)
    g.save();
    g.translate(W * 0.55, SKY_H * 0.42); g.rotate(-0.42);
    const mw = g.createRadialGradient(0, 0, 0, 0, 0, 1);
    mw.addColorStop(0, 'rgba(120,130,190,0.16)');
    mw.addColorStop(0.5, 'rgba(90,100,170,0.07)');
    mw.addColorStop(1, 'rgba(60,70,140,0)');
    g.save(); g.scale(1400, 260); g.fillStyle = mw; g.beginPath(); g.arc(0, 0, 1, 0, Math.PI * 2); g.fill(); g.restore();
    for (let i = 0; i < 2600; i++) {
      const x = (rnd() - 0.5) * 2600;
      const y = (rnd() + rnd() + rnd() - 1.5) * 170;
      g.fillStyle = 'rgba(210,215,255,' + (0.05 + rnd() * 0.22).toFixed(3) + ')';
      const s = rnd() < 0.9 ? 1 : 1.6;
      g.fillRect(x, y, s, s);
    }
    // dark dust lanes
    for (let i = 0; i < 18; i++) {
      const x = (rnd() - 0.5) * 2200, y = (rnd() - 0.5) * 120;
      const rg = g.createRadialGradient(x, y, 0, x, y, 60 + rnd() * 90);
      rg.addColorStop(0, 'rgba(4,6,20,0.35)'); rg.addColorStop(1, 'rgba(4,6,20,0)');
      g.fillStyle = rg; g.fillRect(x - 160, y - 160, 320, 320);
    }
    g.restore();

    // stars
    const cols = ['255,255,255', '210,225,255', '255,236,205', '190,210,255'];
    for (let i = 0; i < 1100; i++) {
      const x = rnd() * W, y = rnd() * SKY_H;
      const r = 0.45 + Math.pow(rnd(), 7) * 2.4;
      const a = 0.35 + rnd() * 0.65;
      const col = cols[(rnd() * cols.length) | 0];
      if (r > 1.4) {
        const rg = g.createRadialGradient(x, y, 0, x, y, r * 6);
        rg.addColorStop(0, 'rgba(' + col + ',' + (a * 0.5).toFixed(3) + ')');
        rg.addColorStop(1, 'rgba(' + col + ',0)');
        g.fillStyle = rg; g.fillRect(x - r * 6, y - r * 6, r * 12, r * 12);
      }
      g.fillStyle = 'rgba(' + col + ',' + a.toFixed(3) + ')';
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    // warm haze rising from the sukkah at the bottom of the sky
    const hz = g.createLinearGradient(0, SKY_H - 520, 0, SKY_H);
    hz.addColorStop(0, 'rgba(120,70,40,0)');
    hz.addColorStop(1, 'rgba(120,70,40,0.22)');
    g.fillStyle = hz; g.fillRect(0, SKY_H - 520, W, 520);

    const tw = [];
    for (let i = 0; i < 70; i++) {
      tw.push({ x: rnd() * W, y: rnd() * SKY_H, r: 1.1 + rnd() * 1.6, w: 1.2 + rnd() * 2.6, p: rnd() * 6.28 });
    }
    return { c, tw };
  }

  // ---------------------------------------------------------------- walls
  function buildWall(rnd) {
    const hgt = 1080 - WALL_TOP + 80;
    const c = mk(W, hgt), g = c.getContext('2d');
    const Y = (wy) => wy - WALL_TOP;
    const L = 250, Rr = 1670;

    const gr = g.createLinearGradient(0, 0, 0, hgt);
    gr.addColorStop(0, '#1c110a');
    gr.addColorStop(Y(-300) / hgt, '#4a3220');
    gr.addColorStop(Y(250) / hgt, '#7d5a37');
    gr.addColorStop(Y(700) / hgt, '#86613b');
    gr.addColorStop(1, '#4a321d');
    g.fillStyle = gr; g.fillRect(0, 0, W, hgt);

    // fabric folds on the back wall
    let x = L;
    while (x < Rr) {
      const w = 34 + rnd() * 52;
      const lg = g.createLinearGradient(x, 0, x + w, 0);
      lg.addColorStop(0, 'rgba(40,20,8,0.16)');
      lg.addColorStop(0.35, 'rgba(255,228,180,0.10)');
      lg.addColorStop(0.6, 'rgba(255,228,180,0.03)');
      lg.addColorStop(1, 'rgba(40,20,8,0.18)');
      g.fillStyle = lg; g.fillRect(x, 0, w, hgt);
      x += w;
    }
    // gathered top of the cloth (scallops under the beam)
    g.fillStyle = 'rgba(20,10,4,0.35)';
    for (let sx = L; sx < Rr; sx += 60) {
      g.beginPath(); g.ellipse(sx + 30, Y(-770), 30, 14, 0, 0, Math.PI); g.fill();
    }

    // side walls in perspective
    function side(x0, x1) {
      const lg = g.createLinearGradient(x0, 0, x1, 0);
      lg.addColorStop(0, 'rgba(12,6,2,0.78)');
      lg.addColorStop(1, 'rgba(30,16,6,0.28)');
      g.fillStyle = lg; g.fillRect(Math.min(x0, x1), 0, Math.abs(x1 - x0), hgt);
      const dir = Math.sign(x1 - x0);
      for (let k = 0; k < 9; k++) {
        const xx = x0 + dir * (k + rnd() * 0.6) * Math.abs(x1 - x0) / 9;
        g.fillStyle = 'rgba(255,220,170,' + (0.03 + rnd() * 0.04).toFixed(3) + ')';
        g.fillRect(xx, 0, 6 + rnd() * 10, hgt);
      }
    }
    side(0, L); side(W, Rr);

    // decorative woven band
    const by = Y(110);
    g.fillStyle = '#1d2f5a'; g.fillRect(L, by, Rr - L, 34);
    g.fillStyle = '#c99a3e'; g.fillRect(L, by, Rr - L, 4); g.fillRect(L, by + 30, Rr - L, 4);
    g.fillStyle = '#d8ad55';
    for (let bx = L + 14; bx < Rr - 10; bx += 28) {
      g.beginPath(); g.moveTo(bx, by + 9); g.lineTo(bx + 8, by + 17); g.lineTo(bx, by + 25); g.lineTo(bx - 8, by + 17); g.closePath(); g.fill();
    }
    g.fillStyle = 'rgba(120,20,30,0.9)';
    for (let bx = L + 28; bx < Rr - 10; bx += 28) g.fillRect(bx - 2, by + 15, 4, 4);
    // band on side walls (darker)
    g.fillStyle = 'rgba(20,30,60,0.6)'; g.fillRect(0, by + 6, L, 26); g.fillRect(Rr, by + 6, W - Rr, 26);

    // framed pictures
    function frame(cx, cy, fw, fh, painter) {
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(cx - fw / 2 + 8, cy - fh / 2 + 12, fw, fh);
      const fg = g.createLinearGradient(cx - fw / 2, cy - fh / 2, cx + fw / 2, cy + fh / 2);
      fg.addColorStop(0, '#caa156'); fg.addColorStop(0.5, '#7d5a24'); fg.addColorStop(1, '#b88c40');
      g.fillStyle = fg; g.fillRect(cx - fw / 2, cy - fh / 2, fw, fh);
      g.save();
      g.beginPath(); g.rect(cx - fw / 2 + 14, cy - fh / 2 + 14, fw - 28, fh - 28); g.clip();
      g.translate(cx - fw / 2 + 14, cy - fh / 2 + 14);
      painter(fw - 28, fh - 28);
      g.restore();
      g.strokeStyle = 'rgba(255,230,170,0.35)'; g.lineWidth = 2;
      g.strokeRect(cx - fw / 2 + 3, cy - fh / 2 + 3, fw - 6, fh - 6);
    }
    frame(560, Y(-330), 300, 214, (w, h) => {
      const sg = g.createLinearGradient(0, 0, 0, h);
      sg.addColorStop(0, '#1b1f4a'); sg.addColorStop(1, '#6e4a3a');
      g.fillStyle = sg; g.fillRect(0, 0, w, h);
      g.fillStyle = '#f3dfa8'; g.beginPath(); g.arc(w * 0.78, h * 0.25, 13, 0, 7); g.fill();
      // city wall with towers
      g.fillStyle = '#d9c29a';
      g.fillRect(0, h * 0.62, w, h);
      for (let k = 0; k < w; k += 12) g.fillRect(k, h * 0.62 - 7, 7, 8);
      const towers = [[20, 40, 0.42], [110, 46, 0.36], [205, 38, 0.46]];
      for (const [tx, tw2, th] of towers) {
        g.fillRect(tx, h * th, tw2, h);
        for (let k = 0; k < tw2; k += 10) g.fillRect(tx + k, h * th - 7, 6, 8);
      }
      g.fillStyle = 'rgba(90,60,40,0.55)';
      for (let k = 0; k < 14; k++) g.fillRect(8 + k * 19, h * 0.72 + (k % 2) * 12, 4, 7);
      g.fillStyle = '#3a2618'; g.beginPath(); g.arc(w / 2 + 3, h * 0.9, 16, Math.PI, 0); g.fill();
    });
    frame(1360, Y(-330), 250, 214, (w, h) => {
      g.fillStyle = '#4a0f1a'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#e0b85a'; g.lineWidth = 5; g.lineCap = 'round';
      const cx = w / 2, base = h * 0.66;
      for (let k = 1; k <= 3; k++) {
        const r = k * 26;
        g.beginPath(); g.arc(cx, base - 40, r, 0, Math.PI); g.stroke();
        g.beginPath(); g.moveTo(cx - r, base - 40); g.lineTo(cx - r, base - 100); g.stroke();
        g.beginPath(); g.moveTo(cx + r, base - 40); g.lineTo(cx + r, base - 100); g.stroke();
      }
      g.beginPath(); g.moveTo(cx, base - 100); g.lineTo(cx, base + 14); g.stroke();
      g.beginPath(); g.moveTo(cx - 30, base + 30); g.lineTo(cx + 30, base + 30); g.lineTo(cx + 16, base + 14); g.lineTo(cx - 16, base + 14); g.closePath();
      g.fillStyle = '#e0b85a'; g.fill();
      g.fillStyle = '#ffd98a';
      for (let k = -3; k <= 3; k++) {
        g.beginPath(); g.ellipse(cx + k * 26, base - 110, 4, 8, 0, 0, 7); g.fill();
      }
    });

    // warm lamplight pool and dark ceiling edge
    g.globalCompositeOperation = 'lighter';
    const lp = g.createRadialGradient(960, Y(380), 0, 960, Y(380), 1100);
    lp.addColorStop(0, 'rgba(255,165,70,0.30)');
    lp.addColorStop(0.5, 'rgba(200,110,40,0.12)');
    lp.addColorStop(1, 'rgba(160,80,30,0)');
    g.fillStyle = lp; g.fillRect(0, 0, W, hgt);
    g.globalCompositeOperation = 'source-over';
    const dk = g.createLinearGradient(0, 0, 0, Y(-250));
    dk.addColorStop(0, 'rgba(8,4,2,0.75)'); dk.addColorStop(1, 'rgba(8,4,2,0)');
    g.fillStyle = dk; g.fillRect(0, 0, W, Y(-250));

    // corner posts
    for (const px of [L, Rr]) {
      const pg = g.createLinearGradient(px - 16, 0, px + 16, 0);
      pg.addColorStop(0, '#1c1008'); pg.addColorStop(0.45, '#6b4724'); pg.addColorStop(1, '#241408');
      g.fillStyle = pg; g.fillRect(px - 16, 0, 32, hgt);
    }
    // top beam
    const bg = g.createLinearGradient(0, 0, 0, 40);
    bg.addColorStop(0, '#1a0e06'); bg.addColorStop(0.6, '#4a2f16'); bg.addColorStop(1, '#6b4522');
    g.fillStyle = bg; g.fillRect(0, 0, W, 40);
    return c;
  }

  // ---------------------------------------------------------------- schach
  function buildSchach(rnd) {
    const Y = (wy) => wy - SCH_TOP;
    const mkLeaves = (count, seedR) => {
      const c = mk(W, SCH_H), g = c.getContext('2d');
      for (let b = 0; b < count; b++) {
        const kind = seedR() < 0.45 ? 0 : 1; // 0 palm frond, 1 leafy bough
        const x = -150 + seedR() * (W + 300);
        const up = b % 6 === 0;
        const y = Y(up ? -1275 + seedR() * 70 : -1290 + seedR() * 480);
        const ang = up ? -Math.PI / 2 + (seedR() < 0.5 ? -1 : 1) * (0.45 + seedR() * 0.55) : (seedR() < 0.5 ? 0 : Math.PI) + (seedR() - 0.5) * 0.9;
        const len = up ? 90 + seedR() * 150 : 220 + seedR() * 330;
        const bend = (seedR() - 0.5) * 0.5;
        const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
        const qx = (x + x2) / 2 - Math.sin(ang) * len * bend, qy = (y + y2) / 2 + Math.cos(ang) * len * bend;
        const hue = kind === 0 ? 70 + seedR() * 20 : 85 + seedR() * 30;
        const lit = 11 + seedR() * 12;
        g.strokeStyle = 'hsl(' + (hue - 20) + ',30%,' + (lit - 2) + '%)';
        g.lineWidth = kind === 0 ? 4 : 2.5;
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(qx, qy, x2, y2); g.stroke();
        const n = Math.floor(len / (kind === 0 ? 12 : 18));
        for (let i = 1; i <= n; i++) {
          const s = i / (n + 1);
          const px = (1 - s) * (1 - s) * x + 2 * (1 - s) * s * qx + s * s * x2;
          const py = (1 - s) * (1 - s) * y + 2 * (1 - s) * s * qy + s * s * y2;
          const tx = 2 * (1 - s) * (qx - x) + 2 * s * (x2 - qx);
          const ty = 2 * (1 - s) * (qy - y) + 2 * s * (y2 - qy);
          const ta = Math.atan2(ty, tx);
          for (const side of [-1, 1]) {
            const la = ta + side * (kind === 0 ? 0.75 : 0.6) + (seedR() - 0.5) * 0.3;
            const ll = kind === 0 ? (58 * (1 - 0.55 * s) + seedR() * 10) : (18 + seedR() * 12);
            const lw = kind === 0 ? 3.2 : 7 + seedR() * 3;
            const l2 = lit + (seedR() - 0.5) * 8;
            g.fillStyle = 'hsl(' + (hue + (seedR() - 0.5) * 12).toFixed(0) + ',' + (32 + seedR() * 20).toFixed(0) + '%,' + l2.toFixed(1) + '%)';
            const ca = Math.cos(la), sa = Math.sin(la);
            const tx2 = px + ca * ll, ty2 = py + sa * ll;
            const mx = px + ca * ll * 0.45, my = py + sa * ll * 0.45;
            g.beginPath();
            g.moveTo(px, py);
            g.quadraticCurveTo(mx - sa * lw * 1.3, my + ca * lw * 1.3, tx2, ty2);
            g.quadraticCurveTo(mx + sa * lw * 1.3, my - ca * lw * 1.3, px, py);
            g.fill();
          }
        }
      }
      return c;
    };
    const l1 = mkLeaves(120, rnd);
    const l2 = mkLeaves(40, rnd);
    // gaps so the stars are visible
    const gaps = [];
    for (let i = 0; i < 70; i++) {
      const gx = rnd() * W, gy = Y(-1250 + rnd() * 400);
      const k = 2 + ((rnd() * 3) | 0);
      for (let j = 0; j < k; j++) gaps.push([gx + (rnd() - 0.5) * 60, gy + (rnd() - 0.5) * 30, 14 + rnd() * 30, 9 + rnd() * 18, rnd() * 3]);
    }
    for (const lc of [l1, l2]) {
      const g = lc.getContext('2d');
      g.globalCompositeOperation = 'destination-out';
      g.fillStyle = '#000';
      for (const gp of gaps) { g.beginPath(); g.ellipse(gp[0], gp[1], gp[2], gp[3], gp[4], 0, 7); g.fill(); }
    }

    const c = mk(W, SCH_H), g = c.getContext('2d');
    g.drawImage(l1, 0, 0);
    // bamboo lattice
    function bamboo(x1, y1, x2, y2, w) {
      const a = Math.atan2(y2 - y1, x2 - x1), len = Math.hypot(x2 - x1, y2 - y1);
      g.save(); g.translate(x1, y1); g.rotate(a);
      const bg = g.createLinearGradient(0, -w / 2, 0, w / 2);
      bg.addColorStop(0, '#3b3419'); bg.addColorStop(0.3, '#a8975a'); bg.addColorStop(0.55, '#7d6e3c'); bg.addColorStop(1, '#2a2410');
      g.fillStyle = bg;
      g.beginPath(); g.roundRect ? g.roundRect(0, -w / 2, len, w, w / 2) : g.rect(0, -w / 2, len, w); g.fill();
      g.fillStyle = 'rgba(30,24,8,0.8)';
      for (let k = 60 + rnd() * 60; k < len - 10; k += 95 + rnd() * 40) {
        g.fillRect(k, -w / 2, 3, w);
        g.fillStyle = 'rgba(210,190,120,0.35)'; g.fillRect(k + 3, -w / 2 + 2, 2, w - 4); g.fillStyle = 'rgba(30,24,8,0.8)';
      }
      g.restore();
    }
    for (let x = 60; x < W; x += 170 + rnd() * 40) {
      const xt = 960 + (x - 960) * 0.86;
      bamboo(xt, Y(-1300), x, Y(-800), 16);
    }
    for (const wy of [-1230, -1100, -975, -860]) bamboo(-40, Y(wy + (rnd() - 0.5) * 20), W + 40, Y(wy + (rnd() - 0.5) * 20), 22);
    g.drawImage(l2, 0, 0);
    // lighting: warm from below, cold/dark above
    g.globalCompositeOperation = 'source-atop';
    const lg = g.createLinearGradient(0, 0, 0, SCH_H);
    lg.addColorStop(0, 'rgba(3,5,16,0.55)');
    lg.addColorStop(0.45, 'rgba(20,14,10,0.1)');
    lg.addColorStop(0.8, 'rgba(255,150,70,0.18)');
    lg.addColorStop(1, 'rgba(255,160,80,0.30)');
    g.fillStyle = lg; g.fillRect(0, 0, W, SCH_H);
    g.globalCompositeOperation = 'source-over';
    return c;
  }

  // ---------------------------------------------------------------- sprites
  function buildSprites(rnd) {
    const pom = mk(80, 90), p = pom.getContext('2d');
    {
      const rg = p.createRadialGradient(30, 44, 3, 40, 52, 34);
      rg.addColorStop(0, '#f06a6a'); rg.addColorStop(0.45, '#b51d2e'); rg.addColorStop(1, '#4a0610');
      p.fillStyle = '#7a1020';
      p.beginPath(); p.moveTo(31, 18); p.lineTo(33, 8); p.lineTo(37, 16); p.lineTo(40, 6); p.lineTo(43, 16); p.lineTo(47, 8); p.lineTo(49, 18); p.closePath(); p.fill();
      p.fillStyle = rg; p.beginPath(); p.arc(40, 52, 30, 0, 7); p.fill();
      p.fillStyle = 'rgba(255,220,200,0.35)'; p.beginPath(); p.ellipse(30, 40, 8, 5, -0.6, 0, 7); p.fill();
    }
    function grapes(c1, c2, seed) {
      const r2 = mulberry32(seed);
      const cv = mk(90, 130), q = cv.getContext('2d');
      q.strokeStyle = '#5a4020'; q.lineWidth = 3;
      q.beginPath(); q.moveTo(45, 0); q.quadraticCurveTo(48, 10, 45, 22); q.stroke();
      q.fillStyle = '#3f6a24';
      q.beginPath(); q.moveTo(46, 14); q.quadraticCurveTo(80, 0, 84, 26); q.quadraticCurveTo(66, 30, 46, 14); q.fill();
      const rows = [5, 4, 4, 3, 2, 1];
      let y = 30;
      for (let ri = 0; ri < rows.length; ri++) {
        const n = rows[ri];
        for (let k = 0; k < n; k++) {
          const x = 45 + (k - (n - 1) / 2) * 15 + (r2() - 0.5) * 3;
          const yy = y + (r2() - 0.5) * 3;
          const gg = q.createRadialGradient(x - 3, yy - 3, 1, x, yy, 10);
          gg.addColorStop(0, c1); gg.addColorStop(1, c2);
          q.fillStyle = gg; q.beginPath(); q.arc(x, yy, 9, 0, 7); q.fill();
          q.fillStyle = 'rgba(255,255,255,0.35)'; q.beginPath(); q.arc(x - 3, yy - 3, 2, 0, 7); q.fill();
        }
        y += 13;
      }
      return cv;
    }
    const grP = grapes('#9a6ac0', '#2e1040', 11);
    const grG = grapes('#dfe89a', '#56701e', 12);

    const lan = mk(70, 120), l = lan.getContext('2d');
    {
      l.strokeStyle = '#8a6a2a'; l.lineWidth = 3;
      l.beginPath(); l.arc(35, 10, 7, 0, 7); l.stroke();
      const mg = l.createLinearGradient(12, 0, 58, 0);
      mg.addColorStop(0, '#5a3e14'); mg.addColorStop(0.4, '#e6c26a'); mg.addColorStop(1, '#5a3e14');
      l.fillStyle = mg;
      l.beginPath(); l.moveTo(35, 16); l.lineTo(58, 36); l.lineTo(12, 36); l.closePath(); l.fill();
      const gl = l.createLinearGradient(0, 36, 0, 92);
      gl.addColorStop(0, '#ffcf6a'); gl.addColorStop(0.5, '#fff0b0'); gl.addColorStop(1, '#ff9a30');
      l.fillStyle = gl; l.fillRect(16, 36, 38, 56);
      l.fillStyle = mg;
      for (const fx of [14, 33, 52]) l.fillRect(fx, 36, 4, 56);
      l.fillStyle = 'rgba(90,50,10,0.6)';
      for (let yy = 42; yy < 90; yy += 9) { l.fillRect(22, yy, 3, 3); l.fillRect(43, yy + 4, 3, 3); }
      l.fillStyle = mg;
      l.fillRect(10, 90, 50, 7);
      l.beginPath(); l.moveTo(18, 97); l.lineTo(52, 97); l.lineTo(35, 112); l.closePath(); l.fill();
    }
    return { pom, grP, grG, lan };
  }

  // ---------------------------------------------------------------- table
  function buildTable(rnd, spr) {
    const c = mk(W, TBL_H), g = c.getContext('2d');
    const Y = (wy) => wy - TBL_TOP;
    // front drop of the tablecloth
    const fd = g.createLinearGradient(0, Y(800), 0, Y(1160));
    fd.addColorStop(0, '#e2d2b3'); fd.addColorStop(0.35, '#a8977a'); fd.addColorStop(1, '#3a3024');
    g.fillStyle = fd;
    g.beginPath(); g.moveTo(150, Y(800)); g.lineTo(1770, Y(800)); g.lineTo(1800, Y(1175)); g.lineTo(120, Y(1175)); g.closePath(); g.fill();
    for (let x = 150; x < 1770; x += 50 + rnd() * 50) {
      const w = 30 + rnd() * 40;
      const lg = g.createLinearGradient(x, 0, x + w, 0);
      lg.addColorStop(0, 'rgba(60,40,20,0)'); lg.addColorStop(0.5, 'rgba(60,40,20,0.16)'); lg.addColorStop(1, 'rgba(60,40,20,0)');
      g.fillStyle = lg; g.fillRect(x, Y(806), w, 400);
    }
    // embroidered hem band on the front drop
    {
      const hy = Y(846);
      g.fillStyle = 'rgba(40,55,110,0.55)';
      g.beginPath(); g.moveTo(153, hy); g.lineTo(1767, hy); g.lineTo(1769, hy + 26); g.lineTo(151, hy + 26); g.closePath(); g.fill();
      g.fillStyle = 'rgba(214,170,80,0.85)';
      g.fillRect(152, hy - 2, 1616, 3); g.fillRect(151, hy + 26, 1618, 3);
      for (let x = 170; x < 1760; x += 34) {
        g.beginPath(); g.moveTo(x, hy + 13); g.lineTo(x + 8, hy + 5); g.lineTo(x + 16, hy + 13); g.lineTo(x + 8, hy + 21); g.closePath(); g.fill();
      }
      // lace scallops along the tabletop edge
      g.fillStyle = 'rgba(255,248,232,0.55)';
      for (let x = 156; x < 1766; x += 22) { g.beginPath(); g.arc(x + 11, Y(803), 10, 0, Math.PI); g.fill(); }
    }
    // tabletop
    const tg = g.createLinearGradient(0, Y(640), 0, Y(800));
    tg.addColorStop(0, '#d9c8a8'); tg.addColorStop(1, '#f7ecd6');
    g.fillStyle = tg;
    g.beginPath(); g.moveTo(330, Y(640)); g.lineTo(1590, Y(640)); g.lineTo(1770, Y(800)); g.lineTo(150, Y(800)); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(190,150,70,0.55)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(190, Y(784)); g.lineTo(1730, Y(784)); g.stroke();
    g.strokeStyle = 'rgba(60,80,140,0.35)';
    g.beginPath(); g.moveTo(180, Y(792)); g.lineTo(1740, Y(792)); g.stroke();
    // edge highlight
    g.fillStyle = 'rgba(255,248,230,0.8)'; g.fillRect(150, Y(799), 1620, 3);

    const shadow = (x, y, rx, ry, a) => {
      const sg = g.createRadialGradient(x, y, 0, x, y, rx);
      sg.addColorStop(0, 'rgba(60,35,15,' + a + ')'); sg.addColorStop(1, 'rgba(60,35,15,0)');
      g.save(); g.translate(x, y); g.scale(1, ry / rx); g.translate(-x, -y);
      g.fillStyle = sg; g.beginPath(); g.arc(x, y, rx, 0, 7); g.fill(); g.restore();
    };
    const silver = (x0, x1) => {
      const sg = g.createLinearGradient(x0, 0, x1, 0);
      sg.addColorStop(0, '#3b3a3c'); sg.addColorStop(0.22, '#b9b4ac'); sg.addColorStop(0.36, '#fff4dc');
      sg.addColorStop(0.5, '#a7a39c'); sg.addColorStop(0.8, '#5c5956'); sg.addColorStop(1, '#2a2826');
      return sg;
    };

    // --- challah board + challot + cover
    shadow(960, Y(720), 300, 34, 0.45);
    g.fillStyle = '#6a4222';
    g.beginPath(); g.moveTo(720, Y(680)); g.lineTo(1200, Y(680)); g.lineTo(1225, Y(722)); g.lineTo(695, Y(722)); g.closePath(); g.fill();
    g.fillStyle = '#4a2c14'; g.fillRect(695, Y(722), 530, 9);
    g.fillStyle = 'rgba(255,200,140,0.18)'; g.fillRect(720, Y(681), 480, 3);
    for (const cx of [848, 1072]) {
      const cy = Y(690);
      const lg = g.createRadialGradient(cx - 30, cy - 70, 10, cx, cy - 30, 130);
      lg.addColorStop(0, '#f2bf6a'); lg.addColorStop(0.5, '#c07a2c'); lg.addColorStop(1, '#6a3810');
      g.fillStyle = lg;
      g.beginPath(); g.ellipse(cx, cy, 118, 92, 0, Math.PI, 0); g.lineTo(cx + 118, cy); g.ellipse(cx, cy, 118, 12, 0, 0, Math.PI); g.fill();
      // braid bumps near the bottom edge
      for (let k = -5; k <= 5; k++) {
        const bx = cx + k * 20, by = cy - 14 - Math.abs(k) * 1.2;
        const bg = g.createRadialGradient(bx - 4, by - 6, 1, bx, by, 16);
        bg.addColorStop(0, '#ffd88a'); bg.addColorStop(0.6, '#c27b2a'); bg.addColorStop(1, 'rgba(90,45,12,0.9)');
        g.fillStyle = bg; g.beginPath(); g.ellipse(bx, by, 13, 16, 0.5, 0, 7); g.fill();
      }
    }
    // cover (deep burgundy velvet with gold embroidery)
    const cover = new Path2D();
    cover.moveTo(704, Y(700));
    cover.bezierCurveTo(716, Y(640), 740, Y(596), 850, Y(588));
    cover.bezierCurveTo(920, Y(584), 942, Y(612), 960, Y(616));
    cover.bezierCurveTo(978, Y(612), 1000, Y(584), 1070, Y(588));
    cover.bezierCurveTo(1180, Y(596), 1204, Y(640), 1216, Y(700));
    cover.bezierCurveTo(1170, Y(690), 1130, Y(672), 1060, Y(674));
    cover.bezierCurveTo(1010, Y(676), 990, Y(684), 960, Y(684));
    cover.bezierCurveTo(930, Y(684), 910, Y(676), 860, Y(674));
    cover.bezierCurveTo(790, Y(672), 750, Y(690), 704, Y(700));
    cover.closePath();
    const cg = g.createLinearGradient(700, Y(580), 1220, Y(700));
    cg.addColorStop(0, '#3a0812'); cg.addColorStop(0.3, '#7d1a2c'); cg.addColorStop(0.45, '#a8354a');
    cg.addColorStop(0.6, '#6a1424'); cg.addColorStop(1, '#2a050c');
    g.fillStyle = cg; g.fill(cover);
    g.save(); g.clip(cover);
    const sh = g.createRadialGradient(840, Y(600), 5, 840, Y(620), 120);
    sh.addColorStop(0, 'rgba(255,190,190,0.25)'); sh.addColorStop(1, 'rgba(255,190,190,0)');
    g.fillStyle = sh; g.fillRect(700, Y(560), 520, 160);
    g.restore();
    g.strokeStyle = '#d9ad4e'; g.lineWidth = 3;
    g.save(); g.clip(cover);
    g.setLineDash([]);
    g.lineWidth = 4; g.strokeStyle = 'rgba(230,185,80,0.95)';
    g.beginPath();
    g.moveTo(712, Y(690)); g.bezierCurveTo(760, Y(678), 800, Y(662), 860, Y(662));
    g.bezierCurveTo(910, Y(664), 935, Y(672), 960, Y(672));
    g.bezierCurveTo(985, Y(672), 1010, Y(664), 1060, Y(662));
    g.bezierCurveTo(1120, Y(662), 1160, Y(678), 1208, Y(690)); g.stroke();
    g.restore();
    // embroidered rosettes
    for (const [rx, ry] of [[860, 625], [1060, 625]]) {
      g.strokeStyle = 'rgba(235,190,90,0.9)'; g.lineWidth = 2;
      for (let k = 0; k < 8; k++) {
        const a = k * Math.PI / 4;
        g.beginPath(); g.ellipse(rx + Math.cos(a) * 11, Y(ry) + Math.sin(a) * 6, 8, 4, a, 0, 7); g.stroke();
      }
      g.fillStyle = '#f0c870'; g.beginPath(); g.arc(rx, Y(ry), 4, 0, 7); g.fill();
    }
    // gold fringe
    g.strokeStyle = 'rgba(225,180,80,0.9)'; g.lineWidth = 2;
    for (let s = 0; s <= 1; s += 0.012) {
      const x = 704 + s * 512;
      const d = Math.abs(x - 960) / 256;
      const y = Y(684) - 6 * (1 - d) + 18 * d * d + (x < 860 || x > 1060 ? 4 : 0);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + 1, y + 12); g.stroke();
    }

    // --- kiddush cup on a saucer
    const kx = 1215;
    shadow(kx, Y(742), 90, 18, 0.45);
    g.fillStyle = silver(kx - 80, kx + 80);
    g.beginPath(); g.ellipse(kx, Y(738), 78, 17, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(40,40,40,0.35)'; g.beginPath(); g.ellipse(kx, Y(735), 60, 11, 0, 0, 7); g.fill();
    const cupS = silver(kx - 56, kx + 56);
    g.fillStyle = cupS;
    g.beginPath();
    g.moveTo(kx - 44, Y(736)); g.quadraticCurveTo(kx - 40, Y(716), kx - 10, Y(708));
    g.lineTo(kx - 7, Y(668)); g.quadraticCurveTo(kx - 18, Y(662), kx - 16, Y(652));
    g.bezierCurveTo(kx - 44, Y(640), kx - 56, Y(600), kx - 54, Y(560));
    g.lineTo(kx + 54, Y(560));
    g.bezierCurveTo(kx + 56, Y(600), kx + 44, Y(640), kx + 16, Y(652));
    g.quadraticCurveTo(kx + 18, Y(662), kx + 7, Y(668));
    g.lineTo(kx + 10, Y(708)); g.quadraticCurveTo(kx + 40, Y(716), kx + 44, Y(736));
    g.closePath(); g.fill();
    g.fillStyle = cupS; g.beginPath(); g.ellipse(kx, Y(690), 13, 6, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(40,36,30,0.55)'; g.lineWidth = 2;
    for (const yy of [578, 620]) { g.beginPath(); g.ellipse(kx, Y(yy), 53 - (yy - 578) * 0.22, 5, 0, 0.1, Math.PI - 0.1); g.stroke(); }
    // engraved vine pattern on the bowl
    g.strokeStyle = 'rgba(60,54,44,0.45)'; g.lineWidth = 1.5;
    g.beginPath();
    for (let x = -44; x <= 44; x += 2) { const yy = 598 + Math.sin(x * 0.2) * 5; x === -44 ? g.moveTo(kx + x, Y(yy)) : g.lineTo(kx + x, Y(yy)); }
    g.stroke();
    g.fillStyle = 'rgba(255,190,110,0.22)'; g.fillRect(kx - 30, Y(566), 5, 70);
    // rim and wine
    g.fillStyle = '#d8d2c6'; g.beginPath(); g.ellipse(kx, Y(560), 55, 11, 0, 0, 7); g.fill();
    const wg = g.createRadialGradient(kx - 14, Y(558), 2, kx, Y(561), 52);
    wg.addColorStop(0, '#c0243a'); wg.addColorStop(0.5, '#6a0716'); wg.addColorStop(1, '#2e0208');
    g.fillStyle = wg; g.beginPath(); g.ellipse(kx, Y(561), 50, 9, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,200,170,0.5)'; g.beginPath(); g.ellipse(kx - 18, Y(559), 12, 2, 0, 0, 7); g.fill();

    // --- candlesticks
    const candles = [];
    for (const cx of [600, 1350]) {
      shadow(cx, Y(752), 80, 18, 0.5);
      const sg = silver(cx - 60, cx + 60);
      g.fillStyle = sg;
      g.beginPath(); g.ellipse(cx, Y(746), 58, 13, 0, 0, 7); g.fill();
      g.beginPath();
      g.moveTo(cx - 56, Y(744)); g.bezierCurveTo(cx - 50, Y(716), cx - 20, Y(716), cx - 14, Y(700));
      g.lineTo(cx + 14, Y(700)); g.bezierCurveTo(cx + 20, Y(716), cx + 50, Y(716), cx + 56, Y(744)); g.closePath(); g.fill();
      const knob = (y, rx, ry) => { g.fillStyle = sg; g.beginPath(); g.ellipse(cx, Y(y), rx, ry, 0, 0, 7); g.fill(); };
      knob(698, 22, 10);
      g.fillStyle = sg;
      g.beginPath(); g.moveTo(cx - 10, Y(698)); g.lineTo(cx - 7, Y(470)); g.lineTo(cx + 7, Y(470)); g.lineTo(cx + 10, Y(698)); g.closePath(); g.fill();
      knob(640, 16, 9); knob(560, 19, 12); knob(505, 13, 7);
      // drip pan and socket
      knob(468, 38, 9);
      g.fillStyle = sg; g.fillRect(cx - 15, Y(466), 30, -24);
      knob(442, 17, 5);
      // candle
      const cg2 = g.createLinearGradient(cx - 12, 0, cx + 12, 0);
      cg2.addColorStop(0, '#b8a888'); cg2.addColorStop(0.35, '#fff8ea'); cg2.addColorStop(1, '#a89878');
      g.fillStyle = cg2;
      g.fillRect(cx - 12, Y(442), 24, -118);
      g.fillStyle = '#fffdf4'; g.beginPath(); g.ellipse(cx, Y(324), 12, 4, 0, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,250,235,0.9)';
      g.beginPath(); g.moveTo(cx + 6, Y(326)); g.quadraticCurveTo(cx + 12, Y(345), cx + 9, Y(360)); g.lineTo(cx + 5, Y(345)); g.closePath(); g.fill();
      g.strokeStyle = '#2a1a10'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, Y(324)); g.lineTo(cx + 1, Y(314)); g.stroke();
      candles.push({ x: cx, y: 316 });
    }

    // --- decanter of wine
    {
      const dx = 1520, dy = 752;
      shadow(dx, Y(dy), 70, 15, 0.4);
      const body = new Path2D();
      body.moveTo(dx - 12, Y(dy - 190));
      body.lineTo(dx - 12, Y(dy - 140));
      body.bezierCurveTo(dx - 70, Y(dy - 110), dx - 66, Y(dy - 6), dx - 40, Y(dy));
      body.lineTo(dx + 40, Y(dy));
      body.bezierCurveTo(dx + 66, Y(dy - 6), dx + 70, Y(dy - 110), dx + 12, Y(dy - 140));
      body.lineTo(dx + 12, Y(dy - 190)); body.closePath();
      g.fillStyle = 'rgba(200,190,170,0.25)'; g.fill(body);
      g.save(); g.clip(body);
      const wg2 = g.createLinearGradient(dx - 60, 0, dx + 60, 0);
      wg2.addColorStop(0, '#2a0208'); wg2.addColorStop(0.35, '#8a1024'); wg2.addColorStop(0.6, '#5a0614'); wg2.addColorStop(1, '#1e0106');
      g.fillStyle = wg2; g.fillRect(dx - 70, Y(dy - 92), 140, 100);
      g.fillStyle = 'rgba(255,120,120,0.25)'; g.fillRect(dx - 70, Y(dy - 92), 140, 3);
      g.restore();
      g.strokeStyle = 'rgba(255,240,215,0.55)'; g.lineWidth = 2; g.stroke(body);
      g.fillStyle = 'rgba(255,245,230,0.55)'; g.fillRect(dx - 44, Y(dy - 90), 5, 70);
      g.fillStyle = 'rgba(255,245,230,0.35)'; g.fillRect(dx - 8, Y(dy - 186), 3, 40);
      g.fillStyle = silver(dx - 16, dx + 16);
      g.beginPath(); g.ellipse(dx, Y(dy - 196), 15, 5, 0, 0, 7); g.fill();
      g.beginPath(); g.arc(dx, Y(dy - 212), 11, 0, 7); g.fill();
    }

    // --- fruit bowl: pomegranates and grapes
    {
      const bx = 380, by = 760;
      shadow(bx, Y(by + 4), 110, 20, 0.45);
      g.drawImage(spr.grG, bx - 110, Y(by - 108), 81, 117);
      g.drawImage(spr.grP, bx + 26, Y(by - 104), 76, 110);
      g.drawImage(spr.pom, bx - 70, Y(by - 118), 80, 90);
      g.drawImage(spr.pom, bx - 6, Y(by - 112), 72, 81);
      g.drawImage(spr.pom, bx - 40, Y(by - 90), 80, 90);
      const bg2 = silver(bx - 110, bx + 110);
      g.fillStyle = bg2;
      g.beginPath(); g.moveTo(bx - 108, Y(by - 44)); g.bezierCurveTo(bx - 96, Y(by - 6), bx - 50, Y(by - 2), bx - 22, Y(by - 2));
      g.lineTo(bx + 22, Y(by - 2)); g.bezierCurveTo(bx + 50, Y(by - 2), bx + 96, Y(by - 6), bx + 108, Y(by - 44)); g.closePath(); g.fill();
      g.beginPath(); g.ellipse(bx, Y(by), 34, 7, 0, 0, 7); g.fill();
      g.strokeStyle = 'rgba(255,240,210,0.6)'; g.lineWidth = 2;
      g.beginPath(); g.ellipse(bx, Y(by - 44), 108, 10, 0, 0, Math.PI); g.stroke();
    }

    // warm light on the cloth
    g.globalCompositeOperation = 'source-atop';
    for (const cd of candles) {
      const lg = g.createRadialGradient(cd.x, Y(720), 0, cd.x, Y(720), 520);
      lg.addColorStop(0, 'rgba(255,170,80,0.18)'); lg.addColorStop(1, 'rgba(255,170,80,0)');
      g.fillStyle = lg; g.fillRect(0, 0, W, TBL_H);
    }
    g.globalCompositeOperation = 'source-over';
    return { c, candles };
  }

  // ---------------------------------------------------------------- decorations
  function buildDecor(rnd) {
    const chains = [];
    const pal = ['#c8323c', '#e3ac34', '#2f8f5a', '#2f63ad', '#8a3fa0', '#e06a2a'];
    let x = -120;
    while (x < W + 60) {
      const span = 340 + rnd() * 160;
      chains.push({ x1: x, x2: x + span, y: BEAM_Y + 6, sag: 110 + rnd() * 90, ph: rnd() * 6.28, w: 0.6 + rnd() * 0.4, c0: (rnd() * 6) | 0, dim: 0.85 });
      x += span * (0.55 + rnd() * 0.2);
    }
    for (const ch of chains) ch.pal = pal;
    const items = [];
    const xs = [150, 330, 470, 700, 840, 1010, 1120, 1290, 1470, 1600, 1780, 250, 560, 900, 1210, 1540, 1720, 400];
    const types = ['lan', 'pom', 'grP', 'lan', 'pom', 'grG', 'lan', 'pom', 'grP', 'lan', 'pom', 'grG', 'grP', 'pom', 'lan', 'grG', 'lan', 'pom'];
    for (let i = 0; i < xs.length; i++) {
      const long = i < 11;
      let L = long ? 560 + rnd() * 330 : 260 + rnd() * 200;
      // keep clear of the candle flames
      if (Math.abs(xs[i] - 600) < 90 || Math.abs(xs[i] - 1350) < 90) L = Math.min(L, 620);
      items.push({
        x: xs[i] + (rnd() - 0.5) * 30, L, type: types[i],
        s: long ? 1.0 + rnd() * 0.25 : 0.75 + rnd() * 0.2,
        a1: 0.025 + rnd() * 0.03, w1: 0.55 + rnd() * 0.4, p1: rnd() * 6.28,
        a2: 0.01 + rnd() * 0.012, w2: 1.3 + rnd() * 0.8, p2: rnd() * 6.28,
      });
    }
    items.sort((a, b) => a.s - b.s);
    return { chains, items };
  }

  // ---------------------------------------------------------------- post
  function buildPost(rnd) {
    const v = mk(W, H), g = v.getContext('2d');
    const rg = g.createRadialGradient(960, 520, 380, 960, 560, 1250);
    rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(0.6, 'rgba(4,2,6,0.28)'); rg.addColorStop(1, 'rgba(2,1,4,0.78)');
    g.fillStyle = rg; g.fillRect(0, 0, W, H);
    const bg = g.createLinearGradient(0, H * 0.7, 0, H);
    bg.addColorStop(0, 'rgba(3,2,6,0)'); bg.addColorStop(0.45, 'rgba(3,2,6,0.38)'); bg.addColorStop(1, 'rgba(3,2,6,0.7)');
    g.fillStyle = bg; g.fillRect(0, H * 0.7, W, H * 0.3);
    // one grain plate larger than the frame; each frame blits it at a different offset
    const grain = mk(W + 256, H + 256), q = grain.getContext('2d');
    const id = q.createImageData(grain.width, grain.height);
    const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const v2 = rnd() < 0.5 ? 255 : 0;
      d[i] = v2; d[i + 1] = v2; d[i + 2] = v2;
      d[i + 3] = (rnd() * 22) | 0;
    }
    q.putImageData(id, 0, 0);
    return { v, grain };
  }

  // ---------------------------------------------------------------- glow sprites
  // glow sprites are pre-rendered at the exact size they are drawn (unscaled blits are cheap)
  function glowSprite(r, stops, sx, sy) {
    sx = sx || 1; sy = sy || 1;
    const c = mk(Math.ceil(2 * r * sx), Math.ceil(2 * r * sy)), g = c.getContext('2d');
    g.translate(c.width / 2, c.height / 2); g.scale(sx, sy);
    const rg = g.createRadialGradient(0, 0, 0, 0, 0, r);
    for (const [o, col] of stops) rg.addColorStop(o, col);
    g.fillStyle = rg; g.fillRect(-r, -r, 2 * r, 2 * r);
    return c;
  }
  function buildGlows() {
    const warm = [[0, 'rgba(255,190,105,1)'], [0.3, 'rgba(255,140,55,0.33)'], [1, 'rgba(255,110,40,0)']];
    return {
      big: glowSprite(470, [[0, 'rgba(255,160,75,1)'], [0.25, 'rgba(255,120,45,0.34)'], [0.6, 'rgba(230,95,35,0.08)'], [1, 'rgba(200,80,30,0)']]),
      lan: glowSprite(170, warm),
      core: glowSprite(95, warm),
      halo: glowSprite(200, warm),
      band: glowSprite(200, warm, 4.6, 0.9),
    };
  }
  function blit(ctx, img, dy, dx) {
    dx = dx || 0;
    const s0 = Math.max(0, Math.floor(-80 - dy)), s1 = Math.min(img.height, Math.ceil(H + 80 - dy));
    if (s1 - s0 <= 0) return;
    ctx.drawImage(img, 0, s0, img.width, s1 - s0, dx, dy + s0, img.width, s1 - s0);
  }

  // name sprites are rendered lazily (the web font may arrive after init)
  function nameSprites() {
    let ok = true;
    try { ok = !document.fonts || document.fonts.check("700 80px 'Frank Ruhl Libre'"); } catch (e) { ok = true; }
    if (R.names && (R.namesOk || !ok)) return R.names;
    const out = [];
    for (const nm of NAMES) {
      const c = mk(560, 240), g = c.getContext('2d');
      g.font = '700 84px ' + FONT;
      g.direction = 'rtl'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.shadowColor = 'rgba(255,165,55,0.95)';
      g.shadowBlur = 38;
      g.fillStyle = 'rgba(255,214,140,1)';
      g.fillText(nm, 280, 124);
      g.shadowBlur = 14; g.shadowColor = 'rgba(255,200,110,0.9)';
      g.fillText(nm, 280, 124);
      g.shadowBlur = 0; g.shadowColor = 'rgba(0,0,0,0)';
      const tg = g.createLinearGradient(0, 84, 0, 164);
      tg.addColorStop(0, '#fff6d8'); tg.addColorStop(0.55, '#ffd98c'); tg.addColorStop(1, '#e8a94a');
      g.fillStyle = tg;
      g.fillText(nm, 280, 124);
      out.push(c);
    }
    R.names = out; R.namesOk = ok;
    return out;
  }

  // ---------------------------------------------------------------- draw helpers
  function flick(t, i) {
    return 1 + 0.07 * Math.sin(t * 8.3 + i * 1.7) + 0.05 * Math.sin(t * 13.1 + i * 2.9) +
      0.035 * Math.sin(t * 21.7 + i * 0.6) + 0.02 * Math.sin(t * 31.3 + i * 4.1);
  }

  // all paper chains, batched into one path per colour and link type
  function drawChains(ctx, chains, t, oy) {
    const n = chains[0].pal.length;
    const rings = [], bars = [];
    for (let c = 0; c < n; c++) { rings.push(new Path2D()); bars.push(new Path2D()); }
    let any = false;
    for (const ch of chains) {
      const sway = Math.sin(t * ch.w + ch.ph);
      const sag = ch.sag * (1 + 0.05 * sway);
      const lat = 7 * Math.sin(t * ch.w * 0.8 + ch.ph + 1);
      const span = ch.x2 - ch.x1;
      const m = Math.floor(span / 24);
      const y0 = ch.y + oy;
      if (y0 + sag + 20 < 0 || y0 - 20 > H) continue;
      any = true;
      for (let k = 0; k <= m; k++) {
        const s = k / m;
        const bump = 4 * s * (1 - s);
        const x = ch.x1 + span * s + lat * bump;
        const y = y0 + sag * bump;
        const a = Math.atan(sag * 4 * (1 - 2 * s) / span);
        const ci = (ch.c0 + k) % n;
        if (k % 2 === 0) {
          const P = rings[ci];
          P.moveTo(x + Math.cos(a) * 15, y + Math.sin(a) * 15);
          P.ellipse(x, y, 15, 8, a, 0, Math.PI * 2);
        } else {
          const P = bars[ci];
          P.moveTo(x - Math.cos(a) * 14, y - Math.sin(a) * 14);
          P.lineTo(x + Math.cos(a) * 14, y + Math.sin(a) * 14);
        }
      }
    }
    if (!any) return;
    ctx.lineCap = 'round';
    for (let c = 0; c < n; c++) {
      ctx.strokeStyle = chains[0].pal[c];
      ctx.lineWidth = 5; ctx.stroke(rings[c]);
      ctx.lineWidth = 6; ctx.stroke(bars[c]);
    }
    ctx.lineCap = 'butt';
  }

  function glow(ctx, spr, x, y, a) {
    if (a <= 0.004) return;
    ctx.globalAlpha = a > 1 ? 1 : a;
    ctx.drawImage(spr, Math.round(x - spr.width / 2), Math.round(y - spr.height / 2));
  }

  S.scenes[4] = {
    duration: 19,
    init(env) {
      if (R) return;
      const rnd = mulberry32(40404);
      const sky = buildSky(rnd);
      const wall = buildWall(rnd);
      const schach = buildSchach(rnd);
      const spr = buildSprites(rnd);
      const table = buildTable(rnd, spr);
      const decor = buildDecor(rnd);
      const post = buildPost(rnd);
      const glows = buildGlows();
      const motes = [];
      for (let i = 0; i < 46; i++) motes.push({ x: 150 + rnd() * 1620, y: rnd(), sp: 0.015 + rnd() * 0.03, r: 1 + rnd() * 2, p: rnd() * 6.28 });
      R = { sky, wall, schach, spr, table, decor, post, glows, motes, names: null, namesOk: false };
    },

    draw(ctx, t) {
      if (!R) this.init();
      const G = R.glows;
      const cy = camY(t);
      const zoom = 1 + 0.075 * (1 - smooth(0, 11, t));

      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#05060f';
      ctx.fillRect(0, 0, W, H);

      ctx.translate(960, 560); ctx.scale(zoom, zoom); ctx.translate(-960, -560);

      // ---- sky (only once the wall no longer covers the frame)
      const sy = skyShift(cy);
      if (WALL_TOP - cy > -60) {
        blit(ctx, R.sky.c, Math.round(sy - 20));
        ctx.fillStyle = '#fff';
        for (const s of R.sky.tw) {
          const yy = s.y + sy - 20;
          if (yy < -10 || yy > H + 10) continue;
          ctx.globalAlpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.w + s.p));
          ctx.fillRect(s.x - s.r, yy - 0.6, s.r * 2, 1.2);
          ctx.fillRect(s.x - 0.6, yy - s.r, 1.2, s.r * 2);
        }
        ctx.globalAlpha = 1;

        // ---- the seven ushpizin, one after another, in a gentle arc (right to left)
        const nameT0 = 10.2, step = 0.9;
        if (t > nameT0) {
          const sprites = nameSprites();
          const reveal = smooth(nameT0, nameT0 + 6 * step + 1.5, t);
          ctx.globalCompositeOperation = 'lighter';
          // soft golden haze band behind the arc
          glow(ctx, G.band, 960, 262 + sy, 0.16 * reveal);
          // drifting golden motes
          ctx.fillStyle = 'rgb(255,210,130)';
          for (const m of R.motes) {
            const a = reveal * (0.28 + 0.25 * Math.sin(t * 1.7 + m.p));
            if (a <= 0.01) continue;
            ctx.globalAlpha = a;
            const yy = 470 - ((m.y + t * m.sp) % 1) * 430 + sy;
            ctx.fillRect(m.x + 10 * Math.sin(t * 0.5 + m.p) - m.r / 2, yy - m.r / 2, m.r, m.r);
          }
          for (let i = 0; i < 7; i++) {
            const st = nameT0 + i * step;
            const a = smooth(st, st + 1.4, t);
            if (a <= 0) continue;
            const flash = Math.exp(-Math.pow((t - st - 1.3) / 0.9, 2));
            const breathe = 0.9 + 0.1 * Math.sin(t * 1.3 + i * 0.9);
            const k = (i - 3) / 3;
            const nx = 960 + (3 - i) * 238;          // Avraham on the right, David on the left
            const ny = 215 + 88 * k * k + sy + (1 - a) * 18;
            const alpha = a * (0.84 * breathe + 0.16 * flash);
            glow(ctx, G.halo, nx, ny, (0.2 + 0.08 * flash) * alpha);
            ctx.globalCompositeOperation = 'source-over';
            const sp = sprites[i];
            const px = Math.round(nx - sp.width / 2), py = Math.round(ny - sp.height / 2);
            ctx.globalAlpha = alpha;
            ctx.drawImage(sp, px, py);
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.45 * a * flash;
            if (ctx.globalAlpha > 0.01) ctx.drawImage(sp, px, py);
          }
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'source-over';
        }
      }

      // ---- walls
      const wy = WALL_TOP - cy;
      if (wy < H) blit(ctx, R.wall, wy);

      // ---- schach
      const schY = SCH_TOP - cy;
      if (schY < H && schY + SCH_H > 0) blit(ctx, R.schach, schY, Math.round(4 * Math.sin(t * 0.35)));

      // ---- paper chains
      drawChains(ctx, R.decor.chains, t, -cy);

      // ---- hanging pomegranates, grapes and lanterns (pendulum sway)
      const lanterns = [];
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(210,180,120,0.55)';
      for (let i = 0; i < R.decor.items.length; i++) {
        const it = R.decor.items[i];
        const ay = BEAM_Y - cy;
        const sp = R.spr[it.type];
        const sh = sp.height * it.s * 0.9, sw = sp.width * it.s * 0.9;
        if (ay > H || ay + it.L + sh < 0) continue;
        const th = it.a1 * Math.sin(t * it.w1 + it.p1) + it.a2 * Math.sin(t * it.w2 + it.p2);
        const c = Math.cos(th), s = Math.sin(th);
        ctx.save();
        ctx.translate(it.x, ay); ctx.rotate(th);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, it.L + 4); ctx.stroke();
        ctx.drawImage(sp, -sw / 2, it.L, sw, sh);
        ctx.restore();
        if (it.type === 'lan') lanterns.push({ x: it.x - s * (it.L + sh * 0.55), y: ay + c * (it.L + sh * 0.55), s: it.s, i });
      }

      // ---- table (nearer: moves faster)
      const ty = TBL_TOP - cy * 1.25;
      if (ty < H + 40) blit(ctx, R.table.c, ty);

      // ---- light (additive)
      ctx.globalCompositeOperation = 'lighter';
      for (const L of lanterns) {
        const f = 0.92 + 0.08 * flick(t, L.i + 7);
        glow(ctx, G.lan, L.x, L.y, 0.42 * f * L.s);
      }
      if (ty < H + 700) {
        for (let i = 0; i < R.table.candles.length; i++) {
          const cd = R.table.candles[i];
          const f = flick(t, i);
          const lean = 2.4 * Math.sin(t * 2.1 + i * 1.3) + 1.3 * Math.sin(t * 5.3 + i * 2.2) + 0.6 * Math.sin(t * 11.7 + i);
          const fx = cd.x, fy = cd.y + ty - TBL_TOP;
          glow(ctx, G.big, fx, fy - 20, 0.34 * f);
          // flame
          ctx.globalAlpha = 1;
          const h = 46 * f, w = 9.5 + 12 * (f - 1);
          const tipX = fx + lean, tipY = fy - h;
          const fg = ctx.createRadialGradient(fx, fy - h * 0.3, 1, fx, fy - h * 0.35, h * 0.75);
          fg.addColorStop(0, 'rgba(255,255,235,1)');
          fg.addColorStop(0.35, 'rgba(255,220,120,0.95)');
          fg.addColorStop(0.75, 'rgba(255,140,40,0.6)');
          fg.addColorStop(1, 'rgba(200,60,10,0)');
          ctx.fillStyle = fg;
          ctx.beginPath();
          ctx.moveTo(tipX, tipY);
          ctx.bezierCurveTo(fx + w * 0.9 + lean * 0.4, fy - h * 0.55, fx + w, fy - 4, fx, fy + 2);
          ctx.bezierCurveTo(fx - w, fy - 4, fx - w * 0.9 + lean * 0.4, fy - h * 0.55, tipX, tipY);
          ctx.fill();
          ctx.fillStyle = 'rgba(90,110,255,0.3)';
          ctx.beginPath(); ctx.ellipse(fx, fy - 3, 3.5, 6, 0, 0, 6.283); ctx.fill();
          glow(ctx, G.core, fx + lean * 0.3, fy - h * 0.4, 0.5 * f);
        }
      }
      // warm uplight on the schach from the lamps below
      const up = smooth(-500, -1500, cy);
      if (up > 0) {
        const ug = ctx.createLinearGradient(0, H + 20, 0, H * 0.45);
        ug.addColorStop(0, 'rgba(255,135,55,' + (0.17 * up).toFixed(3) + ')');
        ug.addColorStop(0.5, 'rgba(255,135,55,' + (0.05 * up).toFixed(3) + ')');
        ug.addColorStop(1, 'rgba(255,135,55,0)');
        ctx.fillStyle = ug; ctx.fillRect(0, H * 0.45, W, H * 0.57);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();

      // ---- post: vignette, caption-safe darkening, grain
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.drawImage(R.post.v, 0, 0);
      const fi = Math.floor(t * 24);
      const ox = (fi * 97) % 256, oy = (fi * 57) % 256;
      ctx.drawImage(R.post.grain, ox, oy, W, H, 0, 0, W, H);
      ctx.restore();
    },
  };
})();
