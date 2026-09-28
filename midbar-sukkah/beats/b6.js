// Beat 6 (film 43–54 s): the finale. From the warm light of the united species we pull back out of
// one glowing sukkah to a hillside town of many sukkot at night under a soft band of cloud; the
// engine writes the verse; then the lights rise as grains, spiral into the cloud and collapse into
// the single grain at ORIGIN on near-black indigo (the loop).
(function () {
  const S = (window.MIDBAR = window.MIDBAR || { beats: {} });

  const P = [545, 1190];      // pivot of the pull-back: the hero sukkah (final screen position)
  const Z0 = 5;               // starting zoom (inside the hero sukkah's glow)
  const OY0 = -250;           // at Z0 the hero sits near the frame centre ("out and up")
  const LP = [0, 0.08, 0.3, 0.6, 1, 1.3]; // parallax: sky, cloud, hills, far town, mid, near
  const AMBER = [255, 179, 71];
  const NIGHT = '#07081a';
  const SOLO_W = 0.8;         // the lone grain of the loop frame (grain 0)

  let fx = null, C = null;

  // ---------------------------------------------------------------- camera
  function zoomAt(t) {
    const e = fx.ease.inOutSine(fx.range(t, -0.9, 4.9));
    return 1 + (Z0 - 1) * (1 - e) - 0.035 * fx.smooth(fx.range(t, 3.2, 10.5));
  }
  function xf(Z, p) {
    return [Math.pow(Z, p), OY0 * ((Z - 1) / (Z0 - 1)) * p];
  }

  // ---------------------------------------------------------------- cached layers
  function layer(x0, y0, w, h, res, paint) {
    const c = fx.canvas(Math.ceil(w * res), Math.ceil(h * res));
    const g = c.getContext('2d');
    g.scale(res, res);
    g.translate(-x0, -y0);
    paint(g);
    let lo = null; // a 1x copy for the held wide shot (cheaper than resampling the hi-res one)
    if (res > 1) {
      lo = fx.canvas(Math.ceil(w), Math.ceil(h));
      lo.getContext('2d').drawImage(c, 0, 0, lo.width, lo.height);
    }
    return { c, lo, x0, y0, w, h };
  }
  function drawLayer(ctx, L, s, oy, alpha, dx) {
    ctx.save();
    if (alpha !== undefined) ctx.globalAlpha = alpha;
    ctx.translate(P[0], P[1] + oy);
    ctx.scale(s, s);
    ctx.translate(-P[0] + (dx || 0), -P[1]);
    ctx.drawImage(L.lo && s < 1.35 ? L.lo : L.c, L.x0, L.y0, L.w, L.h);
    ctx.restore();
  }

  const lerp = (a, b, k) => a + (b - a) * k;
  const col = (rgb, a) => `rgba(${rgb[0] | 0},${rgb[1] | 0},${rgb[2] | 0},${a})`;
  const mix = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

  function radial(g, x, y, r, rgb, a, op) {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, col(rgb, a));
    gr.addColorStop(0.35, col(rgb, a * 0.45));
    gr.addColorStop(1, col(rgb, 0));
    g.save();
    if (op) g.globalCompositeOperation = op;
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);
    g.restore();
  }

  // ---------------------------------------------------------------- the sukkah
  // sk = {x, y (roof level), w, h, side (+1 back face to the right), seed, man}
  function sukkahGeom(sk) {
    const dx = sk.side * sk.w * 0.2, dy = sk.w * 0.2;
    return { dx, dy, top: sk.y - sk.h };
  }
  function drawSukkah(g, sk, k, detail, haloK) {
    const R = fx.rng(sk.seed);
    const { x, y, w, h } = sk;
    const { dx, dy, top } = sukkahGeom(sk);
    const cx = x + w / 2 + dx / 2;
    // halo of lamplight around it
    const hk = haloK === undefined ? 1 : haloK;
    if (hk > 0.001) radial(g, cx, top + h * 0.2, w * 1.5, [255, 170, 80], 0.32 * k * hk, 'lighter');

    // side face (the fabric wall seen at an angle)
    const sx = dx > 0 ? x + w : x;
    g.fillStyle = col([196, 118, 52], 0.95);
    g.beginPath();
    g.moveTo(sx, top); g.lineTo(sx + dx, top - dy); g.lineTo(sx + dx, y - dy); g.lineTo(sx, y);
    g.closePath(); g.fill();

    // front wall: canvas lit from within
    const fg = g.createLinearGradient(0, top, 0, y);
    fg.addColorStop(0, col([255, 218, 150], 1));
    fg.addColorStop(0.55, col([247, 178, 92], 1));
    fg.addColorStop(1, col([206, 128, 58], 1));
    g.fillStyle = fg;
    g.fillRect(x, top, w, h);
    // the lamp inside: a brighter core
    radial(g, x + w * (0.4 + R() * 0.2), top + h * 0.45, w * 0.55, [255, 240, 200], 0.55 * k, 'lighter');
    // cloth folds
    g.strokeStyle = col([150, 80, 30], 0.18);
    g.lineWidth = Math.max(0.5, w * 0.008);
    const folds = detail ? 9 : 4;
    for (let i = 1; i < folds; i++) {
      const fx0 = x + (w * i) / folds + (R() - 0.5) * w * 0.04;
      g.beginPath(); g.moveTo(fx0, top + h * 0.06); g.lineTo(fx0 + (R() - 0.5) * w * 0.02, y); g.stroke();
    }
    // the shadow of a seated man on the glowing wall (no features, a soft silhouette)
    if (sk.man) {
      const mx = x + w * sk.man, my = y - h * 0.08, u = h * 0.5;
      g.fillStyle = col([110, 55, 22], 0.42);
      g.beginPath();
      g.moveTo(mx - u * 0.32, my);
      g.quadraticCurveTo(mx - u * 0.34, my - u * 0.62, mx - u * 0.12, my - u * 0.7);
      g.lineTo(mx + u * 0.14, my - u * 0.7);
      g.quadraticCurveTo(mx + u * 0.3, my - u * 0.6, mx + u * 0.3, my);
      g.closePath(); g.fill();
      g.beginPath(); g.ellipse(mx, my - u * 0.84, u * 0.12, u * 0.14, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(mx, my - u * 0.95, u * 0.22, u * 0.035, 0, 0, Math.PI * 2); g.fill(); // hat brim
      g.fillRect(mx - u * 0.1, my - u * 1.08, u * 0.2, u * 0.13);
    }
    // poles and beams (ink)
    g.strokeStyle = col([52, 32, 18], 0.9);
    g.lineWidth = Math.max(0.6, w * 0.022);
    g.beginPath();
    g.moveTo(x, y); g.lineTo(x, top);
    g.moveTo(x + w, y); g.lineTo(x + w, top);
    g.moveTo(sx + dx, y - dy); g.lineTo(sx + dx, top - dy);
    if (detail) { g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, top); }
    g.moveTo(x - w * 0.02, top); g.lineTo(x + w * 1.02, top);
    g.stroke();

    // s'chach: the top face, lit from below through the gaps
    const q = [[x, top], [x + w, top], [x + w + dx, top - dy], [x + dx, top - dy]];
    g.fillStyle = col([255, 196, 110], 1);
    g.beginPath(); g.moveTo(q[0][0], q[0][1]);
    for (let i = 1; i < 4; i++) g.lineTo(q[i][0], q[i][1]);
    g.closePath(); g.fill();
    const lg = g.createLinearGradient(0, top - dy, 0, top);
    lg.addColorStop(0, col([150, 90, 40], 0.35)); lg.addColorStop(1, col([255, 230, 170], 0.25));
    g.fillStyle = lg; g.fill();
    // fronds across it (kept on the roof, with a little overhang)
    g.save();
    g.beginPath();
    g.moveTo(x - w * 0.06, top + h * 0.12); g.lineTo(x + w * 1.06, top + h * 0.12);
    g.lineTo(x + w * 1.06 + dx, top - dy * 1.25); g.lineTo(x - w * 0.06 + dx, top - dy * 1.25);
    g.closePath(); g.clip();
    const nF = detail ? 34 : Math.max(6, Math.round(w / 5));
    g.lineCap = 'round';
    for (let i = 0; i < nF; i++) {
      const u0 = R() * 1.1 - 0.05, v0 = R();
      const ang = (R() - 0.5) * 0.9;
      const len = w * (0.25 + R() * 0.35);
      const ax = x + u0 * w + v0 * dx, ay = top - v0 * dy;
      const bx = ax + Math.cos(ang) * len, by = ay + Math.sin(ang) * len * 0.25 - (R() - 0.3) * dy * 0.4;
      g.strokeStyle = col(R() < 0.5 ? [44, 42, 22] : [62, 56, 28], 0.85);
      g.lineWidth = Math.max(0.5, w * (0.012 + R() * 0.012));
      g.beginPath(); g.moveTo(ax, ay);
      g.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 - dy * 0.15, bx, by); g.stroke();
      if (detail) { // leaflets
        g.lineWidth = Math.max(0.4, w * 0.006);
        for (let j = 1; j < 6; j++) {
          const f = j / 6, px = lerp(ax, bx, f), py = lerp(ay, by, f) - dy * 0.1 * Math.sin(f * Math.PI);
          const ll = w * 0.03;
          g.beginPath(); g.moveTo(px, py); g.lineTo(px + ll * 0.6, py - ll * 0.7);
          g.moveTo(px, py); g.lineTo(px + ll * 0.6, py + ll * 0.5); g.stroke();
        }
      }
    }
    // overhanging fronds on the front edge
    for (let i = 0; i < (detail ? 12 : 3); i++) {
      const ax = x + R() * w;
      g.strokeStyle = col([40, 38, 20], 0.8);
      g.lineWidth = Math.max(0.5, w * 0.01);
      g.beginPath(); g.moveTo(ax, top - dy * 0.1);
      g.quadraticCurveTo(ax + w * 0.03, top + h * 0.03, ax + w * (0.02 + R() * 0.05), top + h * (0.05 + R() * 0.08));
      g.stroke();
    }
    g.restore();
    // light leaking up through the gaps
    g.save();
    g.globalCompositeOperation = 'lighter';
    const up = g.createLinearGradient(0, top - dy - h * 0.9, 0, top);
    up.addColorStop(0, col([255, 190, 110], 0));
    up.addColorStop(1, col([255, 190, 110], (detail ? 0.2 : 0.1) * k));
    g.fillStyle = up;
    g.beginPath();
    g.moveTo(x - w * 0.05, top); g.lineTo(x + w * 1.05, top);
    g.lineTo(x + w * 0.95 + dx, top - dy - h * 0.9); g.lineTo(x + w * 0.05 + dx, top - dy - h * 0.9);
    g.closePath(); g.fill();
    g.restore();
  }
  // a point on the s'chach top face (for the grains)
  function schachPoint(sk, u, v) {
    const { dx, dy, top } = sukkahGeom(sk);
    return [sk.x + u * sk.w + v * dx, top - v * dy];
  }

  // ---------------------------------------------------------------- stone buildings
  function building(g, R, b, atmos) {
    const { x, y, w } = b, h = b.h || 900;
    const tone = 0.85 + 0.3 * R();
    const lit = mix([54, 49, 76], [80, 75, 110], atmos).map((v) => v * tone);
    const dark = mix([18, 16, 32], [46, 42, 72], atmos).map((v) => v * tone);
    const gr = g.createLinearGradient(0, y, 0, y + Math.min(h, 360));
    gr.addColorStop(0, col(lit, 1));
    gr.addColorStop(1, col(dark, 1));
    g.fillStyle = gr;
    g.fillRect(x, y, w, h);
    // watercolor wash
    for (let i = 0; i < 3; i++) {
      radial(g, x + R() * w, y + R() * Math.min(h, 300), w * (0.3 + R() * 0.4),
        R() < 0.5 ? [140, 120, 150] : [40, 30, 60], 0.12, null);
    }
    // volume: one side in shadow
    const sg = g.createLinearGradient(x, 0, x + w, 0);
    const shL = x + w / 2 > 545;
    sg.addColorStop(0, `rgba(8,6,20,${shL ? 0.35 : 0})`);
    sg.addColorStop(0.25, 'rgba(8,6,20,0)');
    sg.addColorStop(0.75, 'rgba(8,6,20,0)');
    sg.addColorStop(1, `rgba(8,6,20,${shL ? 0 : 0.35})`);
    g.fillStyle = sg; g.fillRect(x, y, w, h);
    // warm spill from the sukkah on the roof
    if (b.sk) radial(g, b.sk.x + b.sk.w / 2, y, b.sk.w * 1.3, [255, 160, 80], 0.35, 'lighter');
    // parapet / roof edge
    g.fillStyle = col(mix([150, 138, 160], [150, 145, 175], atmos), 0.55);
    g.fillRect(x - 2, y - 3, w + 4, 4);
    g.fillStyle = col([20, 14, 26], 0.5);
    g.fillRect(x - 2, y + 1, w + 4, 2);
    // ink courses of Jerusalem stone
    const course = b.course || 13;
    g.strokeStyle = col([28, 20, 30], 0.28 * (1 - atmos * 0.5));
    g.lineWidth = 0.7;
    g.beginPath();
    const yEnd = y + Math.min(h, b.inkDepth || 420);
    let row = 0;
    for (let yy = y + course; yy < yEnd; yy += course, row++) {
      g.moveTo(x, yy + (R() - 0.5)); g.lineTo(x + w, yy + (R() - 0.5));
      let xx = x + (row % 2 ? course * 0.9 : 0) + R() * 6;
      while (xx < x + w) {
        g.moveTo(xx, yy); g.lineTo(xx + (R() - 0.5), yy - course);
        xx += course * (1.6 + R() * 1.4);
      }
    }
    g.stroke();
    // arched windows and doors
    const nWin = Math.max(1, Math.floor(w / (b.winGap || 46)));
    for (let r = 0; r < (b.winRows || 2); r++) {
      for (let i = 0; i < nWin; i++) {
        if (R() < 0.25) continue;
        const ww = b.winW || 12, wh = ww * 1.8;
        const wx = x + ((i + 0.5) * w) / nWin - ww / 2, wy = y + 28 + r * (wh + 30);
        const on = R() < (b.lit ?? 0.35);
        g.fillStyle = on ? col([255, 176, 84], 0.9) : col([16, 12, 26], 0.8);
        g.beginPath();
        g.moveTo(wx, wy + wh); g.lineTo(wx, wy + ww / 2);
        g.arc(wx + ww / 2, wy + ww / 2, ww / 2, Math.PI, 0);
        g.lineTo(wx + ww, wy + wh); g.closePath(); g.fill();
        if (on) radial(g, wx + ww / 2, wy + wh / 2, ww * 2.4, [255, 170, 80], 0.3, 'lighter');
        g.strokeStyle = col([24, 16, 22], 0.55); g.lineWidth = 0.8; g.stroke();
      }
    }
  }

  function cypress(g, x, base, top, wd, rim) {
    g.fillStyle = '#0e0d1c';
    g.beginPath();
    g.moveTo(x, top);
    g.bezierCurveTo(x + wd * 0.7, top + (base - top) * 0.25, x + wd * 0.6, base - (base - top) * 0.2, x + wd * 0.25, base);
    g.lineTo(x - wd * 0.25, base);
    g.bezierCurveTo(x - wd * 0.6, base - (base - top) * 0.2, x - wd * 0.7, top + (base - top) * 0.25, x, top);
    g.fill();
    if (rim) {
      g.strokeStyle = col([255, 170, 90], rim);
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(x, top);
      g.bezierCurveTo(x + wd * 0.7, top + (base - top) * 0.25, x + wd * 0.6, base - (base - top) * 0.2, x + wd * 0.25, base);
      g.stroke();
    }
  }

  function manSil(g, x, y, s) { // a tiny distant standing man: hat, coat, no features
    g.fillStyle = '#0c0a14';
    g.beginPath();
    g.moveTo(x - s * 0.22, y); g.lineTo(x - s * 0.2, y - s * 0.62); g.lineTo(x + s * 0.2, y - s * 0.62); g.lineTo(x + s * 0.24, y);
    g.fill();
    g.beginPath(); g.arc(x, y - s * 0.72, s * 0.11, 0, Math.PI * 2); g.fill();
    g.fillRect(x - s * 0.2, y - s * 0.84, s * 0.4, s * 0.05);
    g.fillRect(x - s * 0.11, y - s * 0.96, s * 0.22, s * 0.13);
  }

  // ---------------------------------------------------------------- init
  function init(env) {
    fx = env.fx;
    const R = fx.rng(6006);
    const W = env.W;
    const SK = []; // {layer, sk}

    // SKY ---------------------------------------------------------
    const sky = layer(-60, -80, W + 120, 1300, 1, (g) => {
      const gr = g.createLinearGradient(0, -80, 0, 1220);
      gr.addColorStop(0, '#04051a');
      gr.addColorStop(0.3, '#0a0c24');
      gr.addColorStop(0.55, '#121539');
      gr.addColorStop(0.72, '#1c1b40');
      gr.addColorStop(0.8, '#2c2446');
      gr.addColorStop(0.86, '#3a2b4a');
      gr.addColorStop(1, '#2a203c');
      g.fillStyle = gr; g.fillRect(-60, -80, W + 120, 1300);
      for (let i = 0; i < 420; i++) {
        const x = -60 + R() * (W + 120), y = -80 + Math.pow(R(), 1.2) * 980;
        let a = 0.15 + R() * 0.55;
        if (y > 500 && y < 800 && x > 60 && x < 1020) a *= 0.3;
        if (y > 780) a *= 0.5;
        const r = 0.5 + R() * R() * 1.3;
        g.fillStyle = col([235, 232, 255], a);
        g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
        if (R() < 0.05 && !(y > 480 && y < 820)) radial(g, x, y, 7, [220, 225, 255], 0.3 * a, 'lighter');
      }
    });

    // CLOUD BAND: the memory of the Clouds of Glory ------------------
    const CLOUD_Y = (x) => 300 + 50 * fx.noise(x * 0.004 + 3, 1.7) + 20 * fx.noise(x * 0.013, 5.1);
    const cloud = layer(-260, 60, W + 520, 520, 0.75, (g) => {
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 300; i++) {
        const x = -260 + R() * (W + 520);
        const y = CLOUD_Y(x) + (R() + R() + R() - 1.5) * 70;
        const r = 30 + R() * 90;
        const warm = y > 330 && R() < 0.4;
        radial(g, x, y, r * 1.6, warm ? [255, 205, 160] : [233, 238, 252], 0.035 + R() * 0.05, null);
      }
      // fine wisps
      g.lineCap = 'round';
      for (let i = 0; i < 90; i++) {
        const x = -260 + R() * (W + 520), y = CLOUD_Y(x) + (R() - 0.5) * 120;
        const len = 60 + R() * 200;
        g.strokeStyle = col([240, 242, 255], 0.03 + R() * 0.04);
        g.lineWidth = 2 + R() * 6;
        g.beginPath(); g.moveTo(x, y);
        g.quadraticCurveTo(x + len / 2, y - 8 + R() * 16, x + len, y + (R() - 0.5) * 20); g.stroke();
      }
      // fade top and bottom so the text zone (y > 520) stays dark
      g.globalCompositeOperation = 'destination-in';
      const m = g.createLinearGradient(0, 60, 0, 580);
      m.addColorStop(0, 'rgba(0,0,0,0)');
      m.addColorStop(0.2, 'rgba(0,0,0,0.8)');
      m.addColorStop(0.5, 'rgba(0,0,0,1)');
      m.addColorStop(0.72, 'rgba(0,0,0,0.5)');
      m.addColorStop(0.86, 'rgba(0,0,0,0.05)');
      m.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = m; g.fillRect(-260, 60, W + 520, 520);
    });

    // HILLS -------------------------------------------------------
    const hills = layer(-160, 760, W + 320, 360, 1, (g) => {
      const ridge = (x, base, amp, sd) => base - amp * (0.6 + 0.5 * fx.fbm(x * 0.0035 + sd, sd, 4)) -
        60 * Math.exp(-Math.pow((x - 220 - sd * 40) / 260, 2));
      const band = (base, amp, sd, top, bot, rim) => {
        g.beginPath(); g.moveTo(-160, 1120);
        for (let x = -160; x <= W + 160; x += 8) g.lineTo(x, ridge(x, base, amp, sd));
        g.lineTo(W + 160, 1120); g.closePath();
        const gr = g.createLinearGradient(0, base - amp - 60, 0, base + 80);
        gr.addColorStop(0, top); gr.addColorStop(1, bot);
        g.fillStyle = gr; g.fill();
        g.strokeStyle = col([190, 160, 200], rim); g.lineWidth = 1.2;
        g.beginPath();
        for (let x = -160; x <= W + 160; x += 8) { const y = ridge(x, base, amp, sd); x === -160 ? g.moveTo(x, y) : g.lineTo(x, y); }
        g.stroke();
      };
      band(930, 50, 1.3, '#2e2a4c', '#221e3c', 0.22);
      // distant lights on the far ridge
      for (let i = 0; i < 70; i++) {
        const x = -100 + R() * (W + 200), y = ridge(x, 930, 50, 1.3) + 6 + R() * 26;
        g.fillStyle = col([255, 190, 110], 0.35 + R() * 0.4);
        g.fillRect(x, y, 1 + R(), 1 + R());
      }
      band(975, 40, 4.7, '#1f1b38', '#17142c', 0.15);
      for (let i = 0; i < 50; i++) {
        const x = -100 + R() * (W + 200), y = ridge(x, 975, 40, 4.7) + 6 + R() * 30;
        g.fillStyle = col([255, 180, 100], 0.35 + R() * 0.4);
        g.fillRect(x, y, 1.2 + R(), 1.2 + R());
        if (R() < 0.2) radial(g, x, y, 6, [255, 170, 90], 0.25, 'lighter');
      }
    });

    // FAR TOWN on the slopes (terraces of stone and tiny sukkot) ---
    const baseY = (x) => 1000 - 90 * Math.pow((x - 545) / 640, 2) + 10 * fx.noise(x * 0.02, 9);
    const far = layer(-160, 860, W + 320, 360, 1.5, (g) => {
      for (let row = 0; row < 6; row++) {
        let x = -160 + R() * 20;
        while (x < W + 160) {
          const bw = 16 + R() * 28;
          const y = baseY(x + bw / 2) + row * 22 + (R() - 0.5) * 8;
          const atm = 0.55 - row * 0.07;
          const c = mix([46, 42, 72], [78, 74, 108], atm + R() * 0.15);
          g.fillStyle = col(c, 1);
          g.fillRect(x, y, bw, 60);
          g.fillStyle = col([150, 140, 175], 0.35);
          g.fillRect(x, y, bw, 1.2);
          g.strokeStyle = col([20, 16, 30], 0.35); g.lineWidth = 0.6;
          g.strokeRect(x, y, bw, 60);
          for (let k = 0; k < 2; k++) if (R() < 0.3) {
            g.fillStyle = col([255, 180, 90], 0.75);
            g.fillRect(x + 3 + R() * (bw - 6), y + 6 + R() * 10, 1.6, 2.6);
          }
          if (R() < 0.4) {
            const sw = 7 + R() * 7, sh = 5 + R() * 3;
            const sk = { x: x + R() * (bw - sw), y, w: sw, h: sh, side: x < 545 ? 1 : -1, seed: (R() * 1e9) | 0 };
            radial(g, sk.x + sw / 2, y - sh / 2, sw * 2.2, [255, 170, 80], 0.35, 'lighter');
            g.fillStyle = col([255, 196, 110], 0.95);
            g.fillRect(sk.x, y - sh, sw, sh);
            g.fillStyle = col([255, 228, 160], 0.9);
            g.fillRect(sk.x, y - sh - 1.5, sw, 1.8);
            g.fillStyle = col([50, 40, 22], 0.7);
            for (let k = 0; k < 3; k++) g.fillRect(sk.x + R() * sw, y - sh - 1.5, 1.4, 0.8);
            SK.push({ L: 3, sk });
          }
          if (R() < 0.05) cypress(g, x, y, y - 20 - R() * 12, 5, 0);
          x += bw + R() * 3;
        }
      }
    });

    // MID TOWN: rooftops with sukkot, the hero's roof in the centre ---
    const MIDB = [];
    const rowA = [], rowB = [], rowC = [];
    { let x = -80; while (x < W + 80) { const w = 120 + R() * 90; rowA.push({ x, y: 1112 + (R() - 0.5) * 36, w, h: 600 }); x += w + 4 + R() * 20; } }
    rowB.push({ x: -80, y: 1262, w: 220, h: 700 }, { x: 150, y: 1216, w: 225, h: 700 },
      { x: 392, y: 1242, w: 316, h: 700, hero: true }, { x: 722, y: 1222, w: 196, h: 700 }, { x: 928, y: 1255, w: 240, h: 700 });
    rowC.push({ x: -80, y: 1425, w: 400, h: 600 }, { x: 770, y: 1405, w: 400, h: 600 });
    const HERO = { x: 470, y: 1242, w: 150, h: 104, side: 1, seed: 777, man: 0.3 };
    const mkSk = (b, fw, man, dScale) => {
      const w = Math.min(b.w * 0.7, fw);
      const sk = { x: b.x + (b.w - w) * (0.2 + R() * 0.6), y: b.y, w, h: w * (0.6 + R() * 0.12),
        side: b.x + b.w / 2 < 545 ? 1 : -1, seed: (R() * 1e9) | 0, man };
      b.sk = sk; SK.push({ L: 4, sk, d: dScale });
    };
    rowA.forEach((b) => { if (R() < 0.75) mkSk(b, 42 + R() * 22, 0, 0); });
    rowB.forEach((b) => { if (b.hero) { b.sk = HERO; return; } mkSk(b, 80 + R() * 25, R() < 0.5 ? 0.3 + R() * 0.4 : 0, 1); });
    rowC.forEach((b) => mkSk(b, 140, R() < 0.6 ? 0.6 : 0, 1));
    rowC[0].sk.x = 70; rowC[1].sk.x = 880;
    MIDB.push(rowA, rowB, rowC);

    const mid = layer(-100, 1010, W + 200, 910, 2, (g) => {
      // row A (more atmospheric)
      rowA.forEach((b) => building(g, R, Object.assign(b, { course: 9, winGap: 40, winW: 8, winRows: 2, lit: 0.3, inkDepth: 150 }), 0.45));
      rowA.forEach((b) => { if (b.sk) drawSukkah(g, b.sk, 0.9, false); });
      // atmospheric haze between rows
      const hz = g.createLinearGradient(0, 1100, 0, 1260);
      hz.addColorStop(0, 'rgba(60,44,80,0)'); hz.addColorStop(1, 'rgba(60,44,80,0.35)');
      g.fillStyle = hz; g.fillRect(-100, 1100, W + 200, 160);
      // cypresses behind row B
      cypress(g, 385, 1250, 1068, 26, 0.25);
      cypress(g, 924, 1262, 1080, 24, 0.2);
      cypress(g, 120, 1230, 1110, 18, 0.18);
      // row B
      rowB.forEach((b) => building(g, R, Object.assign(b, { course: 12, winGap: 52, winW: 11, winRows: 3, lit: 0.35, inkDepth: 260 }), 0.12));
      rowB.forEach((b) => { if (b.sk && !b.hero) drawSukkah(g, b.sk, 1, false); });
      // two tiny men walking in the lane between the rows, towards the lights
      manSil(g, 716, 1254, 15); manSil(g, 732, 1256, 13);
      // row C (nearest, darker)
      rowC.forEach((b) => building(g, R, Object.assign(b, { course: 15, winGap: 70, winW: 14, winRows: 3, lit: 0.4, inkDepth: 360 }), 0));
      rowC.forEach((b) => drawSukkah(g, b.sk, 1, true));
      // the lane / courtyard between row C buildings
      const cg = g.createLinearGradient(0, 1300, 0, 1920);
      cg.addColorStop(0, 'rgba(22,18,40,0)'); cg.addColorStop(0.35, 'rgba(22,18,40,0.75)'); cg.addColorStop(1, 'rgba(10,8,22,1)');
      g.fillStyle = cg; g.fillRect(320, 1300, 450, 620);
      // courtyard wall with a lit arched gate
      building(g, R, { x: 320, y: 1520, w: 450, h: 400, course: 14, winGap: 999, winRows: 0, inkDepth: 300 }, 0);
      g.fillStyle = col([255, 176, 84], 0.85);
      g.beginPath(); g.moveTo(520, 1640); g.lineTo(520, 1590); g.arc(545, 1590, 25, Math.PI, 0); g.lineTo(570, 1640); g.fill();
      radial(g, 545, 1600, 110, [255, 160, 80], 0.35, 'lighter');
      manSil(g, 536, 1640, 30);
      // darken the bottom (UI band) gently
      const bg = g.createLinearGradient(0, 1500, 0, 1920);
      bg.addColorStop(0, 'rgba(8,8,22,0)'); bg.addColorStop(1, 'rgba(8,8,22,0.7)');
      g.fillStyle = bg; g.fillRect(-100, 1500, W + 200, 420);
    });

    // NEAR: parapet, a cypress and olive branches framing the view ---
    const near = layer(-200, 820, W + 400, 1100, 1, (g) => {
      // olive tree at right
      g.strokeStyle = '#0b0a16'; g.lineCap = 'round';
      const branch = (x, y, a, len, wd, d) => {
        if (d > 5 || len < 8) return;
        const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
        g.lineWidth = wd;
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo((x + x2) / 2 + (R() - 0.5) * len * 0.3, (y + y2) / 2, x2, y2); g.stroke();
        if (d >= 2) {
          for (let k = 0; k < 7; k++) {
            const lx = x2 + (R() - 0.5) * len * 0.8, ly = y2 + (R() - 0.5) * len * 0.6;
            g.fillStyle = R() < 0.25 ? col([120, 110, 70], 0.55) : '#0c0b18';
            g.beginPath(); g.ellipse(lx, ly, 7 + R() * 5, 2.4, R() * Math.PI, 0, Math.PI * 2); g.fill();
          }
        }
        branch(x2, y2, a - 0.4 - R() * 0.3, len * 0.72, wd * 0.62, d + 1);
        branch(x2, y2, a + 0.3 + R() * 0.3, len * 0.7, wd * 0.62, d + 1);
      };
      branch(1180, 1920, -2.0, 180, 26, 0);
      branch(1150, 1760, -2.5, 140, 16, 1);
      // tall cypress at left
      cypress(g, 28, 1920, 1000, 88, 0.12);
      // near parapet (UI band) with ink joints and a warm top edge
      const pg = g.createLinearGradient(0, 1770, 0, 1920);
      pg.addColorStop(0, '#2a2338'); pg.addColorStop(1, '#0d0b18');
      g.fillStyle = pg; g.fillRect(-200, 1770, W + 400, 150);
      g.fillStyle = col([255, 170, 90], 0.25); g.fillRect(-200, 1768, W + 400, 3);
      g.strokeStyle = col([10, 8, 16], 0.5); g.lineWidth = 1;
      g.beginPath();
      for (let yy = 1800, r = 0; yy < 1920; yy += 30, r++) {
        g.moveTo(-200, yy); g.lineTo(W + 200, yy);
        for (let xx = -200 + (r % 2) * 40; xx < W + 200; xx += 80 + R() * 20) { g.moveTo(xx, yy); g.lineTo(xx, yy - 30); }
      }
      g.stroke();
    });

    C = { sky, cloud, hills, far, mid, near, HERO, SK };

    // ---------------------------------------------------------- grain homes
    const N = env.GRAINS;
    const G = {
      L: new Uint8Array(N), x: new Float32Array(N), y: new Float32Array(N), w: new Float32Array(N),
      ph: new Float32Array(N), fr: new Float32Array(N), kind: new Uint8Array(N),
      a: new Float32Array(N), sr: new Float32Array(N), r1: new Float32Array(N), r2: new Float32Array(N),
      cx: new Float32Array(N), cy: new Float32Array(N), spin: new Float32Array(N),
    };
    const Rg = fx.rng(606);
    // weights for sukkah picking: area-ish, the hero gets its own group
    const pool = [];
    SK.forEach((s, i) => { const n = Math.max(1, Math.round(s.sk.w / 6)); for (let k = 0; k < n; k++) pool.push(i); });
    for (let i = 0; i < N; i++) {
      G.ph[i] = Rg() * Math.PI * 2; G.fr[i] = 1.5 + Rg() * 4;
      G.a[i] = Rg() * Math.PI * 2; G.sr[i] = 0.55 + Rg() * 0.45;
      G.r1[i] = Rg(); G.r2[i] = Rg(); G.spin[i] = 2.4 + Rg() * 3.6;
      if (i < 1700) { // s'chach twinkles over the town
        const s = SK[pool[(Rg() * pool.length) | 0]];
        const [px, py] = schachPoint(s.sk, Rg(), Rg());
        G.kind[i] = 0; G.L[i] = s.L; G.x[i] = px; G.y[i] = py;
        G.w[i] = s.L === 3 ? 0.18 + Rg() * 0.15 : 0.25 + Rg() * 0.3;
      } else if (i < 2000) { // the hero sukkah's s'chach
        const [px, py] = schachPoint(HERO, Rg(), Rg());
        G.kind[i] = 0; G.L[i] = 4; G.x[i] = px; G.y[i] = py; G.w[i] = 0.3 + Rg() * 0.35;
      } else if (i < 2400) { // lamplight haze motes above the roofs
        G.kind[i] = 1; G.L[i] = 4; G.x[i] = -60 + Rg() * (W + 120); G.y[i] = 1040 + Rg() * 380; G.w[i] = 0.06 + Rg() * 0.1;
      } else if (i < 3400) { // fine structure of the cloud band
        const x = -200 + Rg() * (W + 400);
        G.kind[i] = 2; G.L[i] = 1; G.x[i] = x; G.y[i] = CLOUD_Y(x) + (Rg() + Rg() + Rg() - 1.5) * 60; G.w[i] = 0.08 + Rg() * 0.16;
      } else { // stars
        let x, y;
        do { x = -40 + Rg() * (W + 80); y = -40 + Rg() * 900; } while (y > 480 && y < 820 && x > 40 && x < 1040 && Rg() < 0.9);
        G.kind[i] = 3; G.L[i] = 0; G.x[i] = x; G.y[i] = y;
        G.w[i] = (y > 480 && y < 820) ? 0.06 + Rg() * 0.06 : 0.08 + Rg() * 0.22;
      }
      // where it rises to in the cloud band at the end
      const hx0 = G.x[i];
      G.cx[i] = lerp(hx0, 540, 0.25) + (Rg() - 0.5) * 120;
      G.cy[i] = 250 + Rg() * 160;
    }
    C.G = G;
  }

  // ---------------------------------------------------------------- draw
  function draw(ctx, t, env) {
    const W = env.W, H = env.H;
    ctx.fillStyle = '#0a0b20';
    ctx.fillRect(0, 0, W, H);
    const Z = zoomAt(t);
    const T = LP.map((p) => xf(Z, p));
    const endK = fx.smooth(fx.range(t, 8.6, 10.35));   // fade to the dark
    const dimK = fx.smooth(fx.range(t, 8.3, 9.8));     // the lights leave the sukkot

    if (endK < 1) {
      drawLayer(ctx, C.sky, T[0][0], T[0][1]);
      // the cloud band drifts; it gathers the rising lights near the end
      const gather = Math.sin(Math.PI * fx.range(t, 8.8, 10.3));
      drawLayer(ctx, C.cloud, T[1][0], T[1][1], 0.7 + 0.35 * gather, -t * 7);
      // dusk remnant on the horizon, fading into night
      const dusk = 1 - 0.8 * fx.smooth(fx.range(t, 1, 8));
      ctx.save();
      ctx.translate(0, T[2][1]);
      const dg = ctx.createLinearGradient(0, 780, 0, 1000);
      dg.addColorStop(0, 'rgba(160,90,90,0)');
      dg.addColorStop(1, `rgba(200,120,90,${0.28 * dusk})`);
      ctx.fillStyle = dg; ctx.fillRect(0, 780, W, 220);
      ctx.restore();
      drawLayer(ctx, C.hills, T[2][0], T[2][1]);
      drawLayer(ctx, C.far, T[3][0], T[3][1]);
      drawLayer(ctx, C.mid, T[4][0], T[4][1]);

      // the hero sukkah, drawn live so it stays crisp in the pull-back
      ctx.save();
      ctx.translate(P[0], P[1] + T[4][1]);
      ctx.scale(T[4][0], T[4][0]);
      ctx.translate(-P[0], -P[1]);
      // (its big halo is hidden under the opening wave while we are close, so it fades in with the pull-back)
      drawSukkah(ctx, C.HERO, 1, true, fx.smooth(fx.range(Z, 3.3, 2.5)));
      // living flicker of lamplight over the sukkot (mid layer)
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < C.SK.length; i++) {
        const s = C.SK[i];
        if (s.L !== 4) continue;
        const sk = s.sk;
        const f = 0.75 + 0.25 * Math.sin(t * (2.1 + (i % 5) * 0.37) + i * 1.7) * Math.sin(t * 3.3 + i);
        const r = sk.w * 1.1;
        const gx = sk.x + sk.w / 2, gy = sk.y - sk.h + r * 0.4, ss = T[4][0];
        const scx = (gx - P[0]) * ss + P[0], scy = (gy - P[1]) * ss + P[1] + T[4][1], sr = r * ss;
        if (scx + sr < 0 || scx - sr > W || scy + sr < 0 || scy - sr > H) continue;
        ctx.globalAlpha = 0.22 * f * (1 - dimK);
        ctx.drawImage(fx.glow(64, [255, 176, 90]), sk.x + sk.w / 2 - r, sk.y - sk.h - r * 0.6, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();

      if (T[5][0] < 2) drawLayer(ctx, C.near, T[5][0], T[5][1]); // wholly off-frame when closer

      // lamplight haze over the whole town
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5 * (1 - dimK);
      const hg = ctx.createLinearGradient(0, 980, 0, 1500);
      hg.addColorStop(0, 'rgba(255,150,70,0)');
      hg.addColorStop(0.4, 'rgba(255,150,70,0.07)');
      hg.addColorStop(1, 'rgba(255,150,70,0)');
      ctx.fillStyle = hg; ctx.fillRect(0, 980, W, 520);
      ctx.restore();
    }

    // opening: the wave of warm light from the united species, resolving into the sukkah's glow
    const wave = 1 - fx.smooth(fx.range(t, 0.2, 3.0));
    if (wave > 0.001) {
      ctx.save();
      const cy = P[1] + T[4][1] - 40;
      const rg = ctx.createRadialGradient(540, cy, 0, 540, cy, 1250);
      rg.addColorStop(0, 'rgb(255,240,200)');
      rg.addColorStop(0.3, 'rgb(255,208,130)');
      rg.addColorStop(0.7, 'rgb(226,150,66)');
      rg.addColorStop(1, 'rgb(150,84,40)');
      ctx.globalAlpha = Math.pow(wave, 0.7) * 0.94;
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.35 * wave;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // closing: dim the lights, then everything sinks into near-black indigo
    if (dimK > 0) {
      ctx.fillStyle = `rgba(7,8,26,${0.45 * dimK})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (endK > 0) {
      ctx.fillStyle = endK >= 1 ? NIGHT : `rgba(7,8,26,${endK})`;
      ctx.fillRect(0, 0, W, H);
    }
    // a faint halo around the gathering point that dies away before the loop
    const halo = Math.sin(Math.PI * fx.range(t, 9.6, 10.9));
    if (halo > 0.001) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.35 * halo;
      ctx.drawImage(fx.glow(90, [255, 200, 130]), env.ORIGIN[0] - 90, env.ORIGIN[1] - 90);
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------- grains
  function grains(t, out, env) {
    const G = C.G, N = env.GRAINS;
    const OX = env.ORIGIN[0], OYo = env.ORIGIN[1];
    const Z = zoomAt(t);
    const T = LP.map((p) => xf(Z, p));
    const shellE = fx.ease.out(fx.range(t, -0.9, 2.4));
    const endAll = 10.35;

    if (t >= endAll) { // the single grain, breathing in the dark
      // every grain on ORIGIN; only grain 0 is lit (the renderer gives a lone grain its full glow).
      // One slow breath, exactly SOLO_W at t = 11.
      const w = SOLO_W * (1 + 0.3 * Math.sin((Math.PI * (t - endAll)) / (11 - endAll)));
      for (let i = 0; i < N; i++) { out[3 * i] = OX; out[3 * i + 1] = OYo; out[3 * i + 2] = i === 0 ? w : 0; }
      return;
    }

    for (let i = 0; i < N; i++) {
      const L = G.L[i], s = T[L][0], oy = T[L][1];
      let hx = G.x[i], hy = G.y[i];
      const kind = G.kind[i];
      let w = G.w[i];
      const ph = G.ph[i], fr = G.fr[i];
      if (kind === 0) { // s'chach twinkle
        const tw = 0.5 + 0.5 * Math.sin(t * fr + ph);
        w *= 0.35 + 0.9 * tw * tw;
        hy -= 1.5 * Math.sin(t * 0.7 + ph);
      } else if (kind === 1) { // haze motes drift up
        hy -= 10 * t; hx += 8 * Math.sin(t * 0.5 + ph);
        w *= 0.6 + 0.4 * Math.sin(t * fr * 0.5 + ph);
      } else if (kind === 2) { // cloud fine structure
        hx -= 7 * t; hy += 4 * Math.sin(t * 0.4 + ph);
        w *= 0.7 + 0.3 * Math.sin(t * 0.9 + ph);
      } else { // stars
        const tw = 0.5 + 0.5 * Math.sin(t * fr * 0.8 + ph);
        w *= 0.45 + 0.55 * tw;
      }
      let x = (hx - P[0]) * s + P[0];
      let y = (hy - P[1]) * s + P[1] + oy;

      // opening: an expanding shell of warm light settles onto the town
      if (t < 4) {
        const r = (80 + 1250 * shellE) * G.sr[i];
        const a = G.a[i] + 0.25 * t;
        const sx = 540 + Math.cos(a) * r, sy = 960 + Math.sin(a) * r * 1.6;
        const k = fx.ease.inOut(fx.range(t, 0.8 + 0.9 * G.r1[i], 2.4 + 1.4 * G.r1[i]));
        x = lerp(sx, x, k); y = lerp(sy, y, k);
        w = lerp(0.75 * (1 - 0.3 * shellE), w, k);
      }

      // closing: rise into the cloud band, then spiral into the single grain
      if (t > 8.2) {
        const t0 = 8.25 + 0.9 * G.r1[i];
        const u1 = fx.ease.inOut(fx.range(t, t0, t0 + 1.35));
        const bx = lerp(x, G.cx[i] - 7 * t, u1), by = lerp(y, G.cy[i], u1);
        const ts = 9.0 + 0.55 * G.r2[i];
        const u2 = fx.range(t, ts, endAll);
        const e2 = u2 * u2 * (3 - 2 * u2);
        const dx = bx - OX, dy = by - OYo;
        const rr = Math.hypot(dx, dy) * (1 - e2);
        const aa = Math.atan2(dy, dx) + e2 * G.spin[i];
        x = OX + Math.cos(aa) * rr;
        y = OYo + Math.sin(aa) * rr;
        const wr = lerp(w, kind === 0 ? 0.55 : 0.4, u1);
        // as they arrive they merge: all but grain 0 fade out in the last stretch
        const merge = fx.smooth(fx.range(e2, 0.75, 1));
        w = i === 0 ? lerp(wr, SOLO_W, e2) : lerp(wr, 0.3, e2) * (1 - merge);
      }
      out[3 * i] = x; out[3 * i + 1] = y; out[3 * i + 2] = w;
    }
  }

  S.beats[6] = {
    init,
    draw,
    grains,
    tint: (t) => (t < 3 ? [255, 214, 150] : [255, 206, 140]),
  };
})();
