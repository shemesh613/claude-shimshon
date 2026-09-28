/* Scene 7 - Simchat Torah: the Ark opens, the hakafot, finale "חג שמח". */
(function () {
  'use strict';
  const S = (window.SUKKOT = window.SUKKOT || { scenes: {} });

  const W = 1920, H = 1080, WH = 1560; // world is taller than the frame (camera tilts up)
  const FLOOR = 1250;
  const FONT = "'Frank Ruhl Libre', 'David Libre', serif";
  const TAU = Math.PI * 2;

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
  const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const ss = (a, b, x) => { const u = seg(x, a, b); return u * u * (3 - 2 * u); };
  const eio = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  const eos = (u) => Math.sin((u * Math.PI) / 2);
  const eo = (u) => 1 - Math.pow(1 - u, 3);
  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function rgb(c, a) { return a === undefined ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`; }
  function shade(c, k) { return [c[0] * k, c[1] * k, c[2] * k]; }
  function hash(n) { n = (n ^ 61) ^ (n >>> 16); n = Math.imul(n, 9); n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); n ^= n >>> 15; return n >>> 0; }

  function goldGrad(g, x0, y0, x1, y1) {
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, '#fff0b8'); gr.addColorStop(0.3, '#e9c064'); gr.addColorStop(0.55, '#b98a2e');
    gr.addColorStop(0.75, '#e6bd5c'); gr.addColorStop(1, '#8a5f1c');
    return gr;
  }
  function silverGrad(g, x0, x1) {
    const gr = g.createLinearGradient(x0, 0, x1, 0);
    gr.addColorStop(0, '#6d6f78'); gr.addColorStop(0.35, '#f4f4f8'); gr.addColorStop(0.55, '#c9cad3');
    gr.addColorStop(1, '#5a5c66');
    return gr;
  }
  function star(g, cx, cy, r) { // Magen David outline path (two triangles)
    for (let k = 0; k < 2; k++) {
      const off = k ? Math.PI / 2 : -Math.PI / 2;
      for (let i = 0; i < 3; i++) {
        const a = off + (i * TAU) / 3;
        const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.closePath();
    }
  }
  function crownPath(g, cx, by, w, h) { // simple royal crown, base at by
    const x0 = cx - w / 2;
    g.moveTo(x0, by);
    g.lineTo(x0 - w * 0.04, by - h * 0.7);
    g.lineTo(x0 + w * 0.2, by - h * 0.38);
    g.lineTo(x0 + w * 0.32, by - h * 0.95);
    g.lineTo(cx, by - h * 0.5);
    g.lineTo(x0 + w * 0.68, by - h * 0.95);
    g.lineTo(x0 + w * 0.8, by - h * 0.38);
    g.lineTo(x0 + w * 1.04, by - h * 0.7);
    g.lineTo(x0 + w, by);
    g.closePath();
  }
  function tablet(g, x, y, w, h) { // rounded-top tablet
    g.moveTo(x, y + h);
    g.lineTo(x, y + w / 2);
    g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0);
    g.lineTo(x + w, y + h);
    g.closePath();
  }

  // ---------- Torah scroll (used in the Ark and for the scroll carried in the dance) ----------
  function drawScroll(g, cx, top, h, w, col, crowned, glints) {
    const hx = w * 0.28;
    // wooden handles (atzei chaim)
    g.strokeStyle = '#4a2a14'; g.lineWidth = w * 0.08; g.lineCap = 'round';
    g.beginPath();
    g.moveTo(cx - hx, top - h * 0.1); g.lineTo(cx - hx, top + 4);
    g.moveTo(cx + hx, top - h * 0.1); g.lineTo(cx + hx, top + 4);
    g.moveTo(cx - hx, top + h - 4); g.lineTo(cx - hx, top + h + h * 0.06);
    g.moveTo(cx + hx, top + h - 4); g.lineTo(cx + hx, top + h + h * 0.06);
    g.stroke();
    // mantle
    const bw = w * 1.05, r = w * 0.22;
    g.beginPath();
    g.moveTo(cx - bw / 2, top + h);
    g.lineTo(cx - w / 2, top + r);
    g.quadraticCurveTo(cx - w / 2, top, cx - w / 2 + r, top);
    g.lineTo(cx + w / 2 - r, top);
    g.quadraticCurveTo(cx + w / 2, top, cx + w / 2, top + r);
    g.lineTo(cx + bw / 2, top + h);
    g.closePath();
    const mg = g.createLinearGradient(cx - bw / 2, 0, cx + bw / 2, 0);
    mg.addColorStop(0, rgb(shade(col, 0.35))); mg.addColorStop(0.38, rgb(shade(col, 1.15)));
    mg.addColorStop(0.5, rgb(shade(col, 1.0))); mg.addColorStop(1, rgb(shade(col, 0.3)));
    g.fillStyle = mg; g.fill();
    const vg = g.createLinearGradient(0, top, 0, top + h);
    vg.addColorStop(0, 'rgba(255,230,200,0.10)'); vg.addColorStop(0.5, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.25)');
    g.fillStyle = vg; g.fill();
    // gold embroidery
    const gg = goldGrad(g, cx - w / 2, top, cx + w / 2, top + h);
    g.fillStyle = gg; g.strokeStyle = gg;
    g.fillRect(cx - w / 2 + 1, top + h * 0.06, w - 2, h * 0.025);
    g.fillRect(cx - bw / 2 + 2, top + h * 0.9, bw - 4, h * 0.03);
    g.lineWidth = Math.max(1, w * 0.02);
    g.beginPath();
    g.moveTo(cx - w * 0.4, top + h * 0.13); g.lineTo(cx - w * 0.44, top + h * 0.86);
    g.moveTo(cx + w * 0.4, top + h * 0.13); g.lineTo(cx + w * 0.44, top + h * 0.86);
    g.stroke();
    g.beginPath(); crownPath(g, cx, top + h * 0.3, w * 0.5, h * 0.12); g.fill();
    if (crowned) {
      g.beginPath(); tablet(g, cx - w * 0.2, top + h * 0.36, w * 0.18, h * 0.2); tablet(g, cx + w * 0.02, top + h * 0.36, w * 0.18, h * 0.2); g.fill();
    } else {
      g.beginPath(); star(g, cx, top + h * 0.5, w * 0.2); g.lineWidth = Math.max(1, w * 0.035); g.stroke();
    }
    // fringe
    g.lineWidth = Math.max(0.8, w * 0.015);
    g.beginPath();
    for (let x = cx - bw / 2 + 3; x < cx + bw / 2 - 2; x += Math.max(2.5, w * 0.05)) { g.moveTo(x, top + h * 0.93); g.lineTo(x, top + h); }
    g.stroke();
    // silver
    const sg = silverGrad(g, cx - w * 0.6, cx + w * 0.6);
    g.fillStyle = sg;
    if (crowned) {
      const kb = top - h * 0.03, kh = h * 0.2, kw = w * 1.12;
      g.beginPath();
      g.moveTo(cx - kw / 2, kb);
      g.lineTo(cx - kw * 0.6, kb - kh * 0.75);
      g.quadraticCurveTo(cx - kw * 0.3, kb - kh * 0.35, cx, kb - kh * 0.8);
      g.quadraticCurveTo(cx + kw * 0.3, kb - kh * 0.35, cx + kw * 0.6, kb - kh * 0.75);
      g.lineTo(cx + kw / 2, kb);
      g.closePath(); g.fill();
      g.fillStyle = 'rgba(40,30,30,0.35)';
      g.fillRect(cx - kw / 2, kb - kh * 0.2, kw, kh * 0.08);
      g.fillStyle = sg;
      const pts = [[-0.6, 0.75], [-0.3, 0.62], [0, 0.8], [0.3, 0.62], [0.6, 0.75]];
      for (const p of pts) {
        g.beginPath(); g.arc(cx + p[0] * kw, kb - p[1] * kh - kh * 0.1, w * 0.06, 0, TAU); g.fill();
        if (glints) glints.push([cx + p[0] * kw, kb - p[1] * kh - kh * 0.1]);
      }
      g.beginPath(); g.arc(cx, kb - kh * 1.05, w * 0.09, 0, TAU); g.fill();
      if (glints) glints.push([cx, kb - kh * 1.05]);
      // gems
      g.fillStyle = '#b01e32'; g.beginPath(); g.arc(cx, kb - kh * 0.35, w * 0.05, 0, TAU); g.fill();
      g.fillStyle = '#1e46a8'; g.beginPath(); g.arc(cx - kw * 0.3, kb - kh * 0.25, w * 0.035, 0, TAU); g.arc(cx + kw * 0.3, kb - kh * 0.25, w * 0.035, 0, TAU); g.fill();
      // breastplate (tas)
      g.strokeStyle = 'rgba(210,210,220,0.8)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(cx - w * 0.3, top + h * 0.08); g.lineTo(cx - w * 0.2, top + h * 0.6); g.moveTo(cx + w * 0.3, top + h * 0.08); g.lineTo(cx + w * 0.2, top + h * 0.6); g.stroke();
      g.fillStyle = sg;
      const bx = cx - w * 0.26, by = top + h * 0.6, bwid = w * 0.52, bh = h * 0.2;
      g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + bwid, by); g.lineTo(bx + bwid, by + bh * 0.7); g.quadraticCurveTo(cx, by + bh * 1.3, bx, by + bh * 0.7); g.closePath(); g.fill();
      g.fillStyle = 'rgba(160,110,30,0.9)'; g.beginPath(); star(g, cx, by + bh * 0.45, bwid * 0.22); g.fill();
      if (glints) glints.push([cx + w * 0.1, by + bh * 0.2]);
    } else {
      for (const sx of [-hx, hx]) {
        const x = cx + sx, y = top - h * 0.1;
        g.beginPath();
        g.moveTo(x - w * 0.05, y); g.lineTo(x + w * 0.05, y);
        g.lineTo(x + w * 0.04, y - h * 0.03);
        g.bezierCurveTo(x + w * 0.16, y - h * 0.05, x + w * 0.16, y - h * 0.12, x + w * 0.05, y - h * 0.14);
        g.lineTo(x + w * 0.02, y - h * 0.2); g.lineTo(x - w * 0.02, y - h * 0.2); g.lineTo(x - w * 0.05, y - h * 0.14);
        g.bezierCurveTo(x - w * 0.16, y - h * 0.12, x - w * 0.16, y - h * 0.05, x - w * 0.04, y - h * 0.03);
        g.closePath(); g.fill();
        g.beginPath(); g.arc(x, y - h * 0.215, w * 0.04, 0, TAU); g.fill();
        g.fillStyle = 'rgba(230,190,90,0.9)';
        g.beginPath(); g.arc(x - w * 0.1, y - h * 0.045, w * 0.022, 0, TAU); g.arc(x + w * 0.1, y - h * 0.045, w * 0.022, 0, TAU); g.fill();
        g.fillStyle = sg;
        if (glints) glints.push([x, y - h * 0.215]);
      }
    }
  }

  // ---------- static layers ----------
  function archPath(g, cx, spring, hw, bottom) {
    g.moveTo(cx - hw, bottom); g.lineTo(cx - hw, spring);
    g.arc(cx, spring, hw, Math.PI, 0); g.lineTo(cx + hw, bottom); g.closePath();
  }
  function archRing(g, cx, spring, hw, thick) {
    g.lineWidth = thick; g.strokeStyle = '#c4a172';
    g.beginPath(); g.arc(cx, spring, hw + thick / 2, Math.PI, 0); g.stroke();
    const rg = g.createRadialGradient(cx, spring, hw, cx, spring, hw + thick);
    rg.addColorStop(0, 'rgba(60,35,15,0.35)'); rg.addColorStop(0.25, 'rgba(255,230,190,0.12)'); rg.addColorStop(1, 'rgba(40,22,10,0.3)');
    g.strokeStyle = rg; g.beginPath(); g.arc(cx, spring, hw + thick / 2, Math.PI, 0); g.stroke();
    g.strokeStyle = 'rgba(50,30,15,0.55)'; g.lineWidth = 2;
    const n = Math.round((Math.PI * hw) / 46) | 1;
    g.beginPath();
    for (let i = 1; i < n; i++) {
      const a = Math.PI + (i / n) * Math.PI;
      g.moveTo(cx + hw * Math.cos(a), spring + hw * Math.sin(a));
      g.lineTo(cx + (hw + thick) * Math.cos(a), spring + (hw + thick) * Math.sin(a));
    }
    g.stroke();
    g.beginPath(); g.arc(cx, spring, hw, Math.PI, 0); g.stroke();
    g.beginPath(); g.arc(cx, spring, hw + thick, Math.PI, 0); g.stroke();
    // keystone
    g.fillStyle = '#cfae7e';
    g.beginPath();
    g.moveTo(cx - 16, spring - hw + 2); g.lineTo(cx + 16, spring - hw + 2);
    g.lineTo(cx + 22, spring - hw - thick - 6); g.lineTo(cx - 22, spring - hw - thick - 6); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(50,30,15,0.5)'; g.stroke();
  }
  function pier(g, x, w, top, bottom) {
    const pg = g.createLinearGradient(x, 0, x + w, 0);
    pg.addColorStop(0, '#8d6d4a'); pg.addColorStop(0.3, '#c9a778'); pg.addColorStop(0.7, '#b89566'); pg.addColorStop(1, '#6e5236');
    g.fillStyle = pg; g.fillRect(x, top, w, bottom - top);
    g.strokeStyle = 'rgba(60,35,15,0.35)'; g.lineWidth = 1.5;
    g.beginPath();
    for (let y = top + 40; y < bottom; y += 40) { g.moveTo(x, y); g.lineTo(x + w, y); }
    g.stroke();
    // capital + base
    g.fillStyle = '#d8b988'; g.fillRect(x - 10, top - 4, w + 20, 16);
    g.fillStyle = '#a88660'; g.fillRect(x - 6, top + 12, w + 12, 8);
    g.fillStyle = '#b8966a'; g.fillRect(x - 12, bottom - 30, w + 24, 30);
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x - 12, bottom - 30, w + 24, 5);
  }
  const JEWELS = [[31, 63, 138], [217, 154, 43], [158, 31, 44], [31, 107, 74], [226, 184, 74], [40, 80, 160]];

  function stainedWindow(g, rng, cx, arcY, hw, bottom) {
    g.save();
    g.beginPath(); archPath(g, cx, arcY, hw, bottom); g.clip();
    g.fillStyle = '#10182e'; g.fillRect(cx - hw, arcY - hw, hw * 2, bottom - arcY + hw);
    const s = 30;
    for (let j = 0; j * s * 0.5 < bottom - arcY + hw + s; j++) {
      for (let i = -1; i * s < hw * 2 + s; i++) {
        const x = cx - hw + i * s + (j % 2) * s * 0.5, y = arcY - hw + j * s * 0.5;
        const d = Math.abs(x - cx) / hw;
        let c = JEWELS[(rng() * JEWELS.length) | 0];
        if (d > 0.72) c = (j % 4 < 2) ? JEWELS[1] : JEWELS[4];
        const k = 0.75 + rng() * 0.35;
        g.fillStyle = rgb(shade(c, k));
        g.beginPath(); g.moveTo(x, y - s / 2); g.lineTo(x + s / 2, y); g.lineTo(x, y + s / 2); g.lineTo(x - s / 2, y); g.closePath(); g.fill();
      }
    }
    g.strokeStyle = '#140c06'; g.lineWidth = 3;
    g.beginPath();
    for (let k = -30; k < 60; k++) {
      const x0 = cx - hw - 400 + k * s;
      g.moveTo(x0, arcY - hw); g.lineTo(x0 + 1200, arcY - hw + 1200);
      g.moveTo(x0 + 1200, arcY - hw); g.lineTo(x0, arcY - hw + 1200);
    }
    g.stroke();
    // medallion with Magen David
    const my = (arcY + bottom) / 2 - 20, mr = hw * 0.62;
    g.fillStyle = '#1b2f72'; g.beginPath(); g.arc(cx, my, mr, 0, TAU); g.fill();
    g.fillStyle = '#e9b949'; g.beginPath(); star(g, cx, my, mr * 0.78); g.fill('nonzero');
    g.fillStyle = '#a52233'; g.beginPath(); g.arc(cx, my, mr * 0.28, 0, TAU); g.fill();
    g.strokeStyle = '#140c06'; g.lineWidth = 3;
    g.beginPath(); g.arc(cx, my, mr, 0, TAU); star(g, cx, my, mr * 0.78); g.stroke();
    // backlight bloom
    const bg = g.createRadialGradient(cx, my, 10, cx, my, hw * 2.6);
    bg.addColorStop(0, 'rgba(255,225,170,0.35)'); bg.addColorStop(1, 'rgba(255,200,120,0)');
    g.globalCompositeOperation = 'lighter'; g.fillStyle = bg; g.fillRect(cx - hw, arcY - hw, hw * 2, bottom - arcY + hw);
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = 'rgba(20,10,5,0.18)'; g.fillRect(cx - hw, arcY - hw, hw * 2, bottom - arcY + hw);
    g.restore();
    g.strokeStyle = '#8a6a44'; g.lineWidth = 12;
    g.beginPath(); archPath(g, cx, arcY, hw + 6, bottom + 6); g.stroke();
    g.strokeStyle = '#d6b686'; g.lineWidth = 3;
    g.beginPath(); archPath(g, cx, arcY, hw + 12, bottom + 12); g.stroke();
    g.fillStyle = '#c9a676'; g.fillRect(cx - hw - 24, bottom + 10, hw * 2 + 48, 14);
  }
  function roseWindow(g, cx, cy, r) {
    g.save();
    g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.clip();
    g.fillStyle = '#16244f'; g.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    for (let i = 0; i < 24; i++) {
      const a0 = (i / 24) * TAU, a1 = ((i + 1) / 24) * TAU;
      g.fillStyle = rgb(i % 2 ? [31, 107, 74] : [31, 63, 138]);
      g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, r, a0, a1); g.closePath(); g.fill();
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      g.fillStyle = rgb(i % 2 ? [217, 154, 43] : [158, 31, 44]);
      g.beginPath(); g.ellipse(cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55, r * 0.2, r * 0.1, a, 0, TAU); g.fill();
    }
    g.fillStyle = '#1b2f72'; g.beginPath(); g.arc(cx, cy, r * 0.38, 0, TAU); g.fill();
    g.fillStyle = '#efc257'; g.beginPath(); star(g, cx, cy, r * 0.33); g.fill();
    g.strokeStyle = '#140c06'; g.lineWidth = 3;
    g.beginPath();
    for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU; g.moveTo(cx + Math.cos(a) * r * 0.75, cy + Math.sin(a) * r * 0.75); g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
    g.moveTo(cx + r * 0.75, cy); g.arc(cx, cy, r * 0.75, 0, TAU);
    g.moveTo(cx + r * 0.38, cy); g.arc(cx, cy, r * 0.38, 0, TAU);
    star(g, cx, cy, r * 0.33);
    g.stroke();
    const bg = g.createRadialGradient(cx, cy, 5, cx, cy, r);
    bg.addColorStop(0, 'rgba(255,225,170,0.4)'); bg.addColorStop(1, 'rgba(255,200,120,0.05)');
    g.globalCompositeOperation = 'lighter'; g.fillStyle = bg; g.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    g.restore();
    g.strokeStyle = '#b89366'; g.lineWidth = 18; g.beginPath(); g.arc(cx, cy, r + 9, 0, TAU); g.stroke();
    g.strokeStyle = 'rgba(40,22,10,0.5)'; g.lineWidth = 2;
    g.beginPath(); g.arc(cx, cy, r + 18, 0, TAU); g.stroke();
    g.beginPath();
    for (let i = 0; i < 20; i++) { const a = (i / 20) * TAU; g.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); g.lineTo(cx + Math.cos(a) * (r + 18), cy + Math.sin(a) * (r + 18)); }
    g.stroke();
  }

  function buildBG(rng, glints) {
    const c = mk(W, WH), g = c.getContext('2d');
    // mortar + ashlar courses
    g.fillStyle = '#4a3522'; g.fillRect(0, 0, W, FLOOR);
    for (let y = 0; y < FLOOR; y += 36) {
      let x = -rng() * 90;
      while (x < W) {
        const bw = 80 + rng() * 80, k = 0.82 + rng() * 0.26;
        g.fillStyle = rgb([176 * k, 140 * k, 98 * k]);
        g.fillRect(x + 1.5, y + 1.5, bw - 3, 33);
        g.fillStyle = 'rgba(255,235,200,0.05)'; g.fillRect(x + 1.5, y + 1.5, bw - 3, 4);
        x += bw;
      }
    }
    // upper frieze
    g.fillStyle = '#c6a473'; g.fillRect(0, 330, W, 26);
    g.fillStyle = '#8e6c47'; g.fillRect(0, 356, W, 8);
    g.fillStyle = '#b3905f';
    for (let x = 0; x < W; x += 22) g.fillRect(x, 364, 12, 12);
    // recesses
    g.fillStyle = 'rgba(40,22,10,0.45)'; g.beginPath(); archPath(g, 960, 640, 360, FLOOR); g.fill();
    const rec = g.createRadialGradient(960, 900, 50, 960, 900, 520);
    rec.addColorStop(0, 'rgba(255,190,110,0.12)'); rec.addColorStop(1, 'rgba(20,10,4,0.3)');
    g.fillStyle = rec; g.beginPath(); archPath(g, 960, 640, 360, FLOOR); g.fill();
    for (const cx of [330, 1590]) {
      g.fillStyle = 'rgba(40,22,10,0.35)'; g.beginPath(); archPath(g, cx, 640, 180, FLOOR); g.fill();
      stainedWindow(g, rng, cx, 610, 82, 1010);
      archRing(g, cx, 640, 180, 40);
    }
    archRing(g, 960, 640, 360, 44);
    pier(g, 505, 100, 640, FLOOR); pier(g, 1315, 100, 640, FLOOR);
    pier(g, 100, 60, 640, FLOOR); pier(g, 1760, 60, 640, FLOOR);
    roseWindow(g, 960, 170, 100);
    for (const cx of [330, 1590]) {
      g.save(); g.translate(cx, 230);
      g.fillStyle = '#1b2f72'; g.beginPath(); g.arc(0, 0, 44, 0, TAU); g.fill();
      g.fillStyle = '#e2b84a'; g.beginPath(); star(g, 0, 0, 34); g.fill();
      g.strokeStyle = '#140c06'; g.lineWidth = 3; g.beginPath(); star(g, 0, 0, 34); g.stroke();
      g.strokeStyle = '#b89366'; g.lineWidth = 12; g.beginPath(); g.arc(0, 0, 50, 0, TAU); g.stroke();
      g.restore();
    }

    // floor
    const fg = g.createLinearGradient(0, FLOOR, 0, WH);
    fg.addColorStop(0, '#7a5a3a'); fg.addColorStop(1, '#3a2616');
    g.fillStyle = fg; g.fillRect(0, FLOOR, W, WH - FLOOR);
    g.strokeStyle = 'rgba(30,15,6,0.45)'; g.lineWidth = 2;
    g.beginPath();
    const vpy = 640;
    for (let k = -30; k <= 30; k++) {
      const xb = 960 + k * 140;
      const x0 = 960 + (xb - 960) * (FLOOR - vpy) / (WH - vpy);
      g.moveTo(x0, FLOOR); g.lineTo(xb, WH);
    }
    for (let n = 1; n < 10; n++) { const y = FLOOR + (WH - FLOOR) * Math.pow(n / 9, 1.5); g.moveTo(0, y); g.lineTo(W, y); }
    g.stroke();
    g.fillStyle = 'rgba(20,10,4,0.5)'; g.fillRect(0, FLOOR, W, 6);

    // ---- the Ark (Aron Kodesh) ----
    // platform steps
    for (let k = 3; k >= 0; k--) {
      const y = 1140 + k * 27, w2 = 300 + k * 32;
      g.fillStyle = '#b89d78'; g.fillRect(960 - w2, y, w2 * 2, 27);
      g.fillStyle = 'rgba(255,240,210,0.3)'; g.fillRect(960 - w2, y, w2 * 2, 4);
      g.fillStyle = 'rgba(60,35,15,0.35)'; g.fillRect(960 - w2, y + 20, w2 * 2, 7);
    }
    // cabinet
    const wg = g.createLinearGradient(740, 0, 1180, 0);
    wg.addColorStop(0, '#2c170b'); wg.addColorStop(0.5, '#5a3319'); wg.addColorStop(1, '#2c170b');
    g.fillStyle = wg; g.fillRect(730, 640, 460, 500);
    // interior niche
    const ig = g.createLinearGradient(0, 740, 0, 1110);
    ig.addColorStop(0, '#3a1a0c'); ig.addColorStop(1, '#1e0d06');
    g.fillStyle = ig; g.fillRect(800, 740, 320, 370);
    const ir = g.createRadialGradient(960, 900, 10, 960, 900, 220);
    ir.addColorStop(0, 'rgba(255,200,120,0.55)'); ir.addColorStop(1, 'rgba(255,160,80,0)');
    g.fillStyle = ir; g.fillRect(800, 740, 320, 370);
    // scrolls
    drawScroll(g, 872, 880, 215, 60, [120, 18, 34], false, glints);
    drawScroll(g, 1048, 880, 215, 60, [120, 18, 34], false, glints);
    drawScroll(g, 960, 868, 232, 66, [26, 48, 130], true, glints);
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(800, 1100, 320, 10);
    // gold frame around niche
    g.strokeStyle = goldGrad(g, 800, 740, 1120, 1110); g.lineWidth = 6;
    g.strokeRect(797, 737, 326, 376);
    // columns
    for (const x of [742, 1128]) {
      const cg = g.createLinearGradient(x, 0, x + 50, 0);
      cg.addColorStop(0, '#6b4a1a'); cg.addColorStop(0.35, '#f2d48a'); cg.addColorStop(0.6, '#c89a42'); cg.addColorStop(1, '#5a3a12');
      g.fillStyle = cg; g.fillRect(x, 712, 50, 400);
      g.strokeStyle = 'rgba(70,40,10,0.5)'; g.lineWidth = 1.5;
      g.beginPath(); for (let i = 1; i < 5; i++) { g.moveTo(x + i * 10, 720); g.lineTo(x + i * 10, 1105); } g.stroke();
      g.fillStyle = goldGrad(g, x, 690, x + 50, 715); g.fillRect(x - 8, 692, 66, 22);
      g.fillRect(x - 8, 1108, 66, 32);
    }
    // entablature
    g.fillStyle = '#3e2211'; g.fillRect(722, 640, 476, 54);
    g.fillStyle = goldGrad(g, 722, 640, 1198, 694); g.fillRect(716, 636, 488, 10); g.fillRect(722, 684, 476, 8);
    g.fillStyle = '#c99a42';
    for (let x = 730; x < 1190; x += 18) g.fillRect(x, 650, 9, 8);
    // pediment with the Tablets of the Law
    g.fillStyle = '#4a2814'; g.beginPath(); g.moveTo(740, 636); g.quadraticCurveTo(960, 520, 1180, 636); g.closePath(); g.fill();
    g.strokeStyle = goldGrad(g, 740, 560, 1180, 636); g.lineWidth = 6; g.stroke();
    // volutes
    g.lineWidth = 5;
    for (const sgn of [-1, 1]) {
      g.beginPath();
      g.moveTo(960 + sgn * 70, 600); g.bezierCurveTo(960 + sgn * 120, 560, 960 + sgn * 170, 600, 960 + sgn * 150, 620);
      g.arc(960 + sgn * 140, 612, 10, sgn > 0 ? 0.6 : 2.5, sgn > 0 ? 4.5 : -1.4, sgn < 0);
      g.stroke();
    }
    const tg = g.createLinearGradient(0, 440, 0, 600);
    tg.addColorStop(0, '#f6ecd6'); tg.addColorStop(1, '#cdb58c');
    g.fillStyle = tg; g.beginPath(); tablet(g, 902, 470, 54, 130); tablet(g, 964, 470, 54, 130); g.fill();
    g.strokeStyle = goldGrad(g, 900, 470, 1020, 600); g.lineWidth = 4; g.stroke();
    g.strokeStyle = 'rgba(90,60,20,0.7)'; g.lineWidth = 3;
    g.beginPath();
    for (let i = 0; i < 5; i++) { const y = 512 + i * 17; g.moveTo(912, y); g.lineTo(946, y); g.moveTo(974, y); g.lineTo(1008, y); }
    g.stroke();
    g.fillStyle = goldGrad(g, 920, 400, 1000, 460);
    g.beginPath(); crownPath(g, 960, 466, 84, 52); g.fill();
    glints.push([960, 420], [918, 432], [1002, 432]);

    // ---- baked lighting ----
    const dk = g.createLinearGradient(0, 0, 0, WH);
    dk.addColorStop(0, 'rgba(12,6,3,0.82)'); dk.addColorStop(0.2, 'rgba(12,6,3,0.5)'); dk.addColorStop(0.45, 'rgba(12,6,3,0.18)');
    dk.addColorStop(0.78, 'rgba(12,6,3,0.2)'); dk.addColorStop(1, 'rgba(8,4,2,0.65)');
    g.fillStyle = dk; g.fillRect(0, 0, W, WH);
    const side = g.createLinearGradient(0, 0, W, 0);
    side.addColorStop(0, 'rgba(10,5,2,0.55)'); side.addColorStop(0.3, 'rgba(10,5,2,0)'); side.addColorStop(0.7, 'rgba(10,5,2,0)'); side.addColorStop(1, 'rgba(10,5,2,0.55)');
    g.fillStyle = side; g.fillRect(0, 0, W, WH);
    g.globalCompositeOperation = 'lighter';
    for (const [x, y, r, a] of [[960, 880, 760, 0.22], [420, 640, 520, 0.16], [1500, 640, 520, 0.16], [960, 300, 500, 0.08]]) {
      const lg = g.createRadialGradient(x, y, 0, x, y, r);
      lg.addColorStop(0, `rgba(255,170,80,${a})`); lg.addColorStop(1, 'rgba(255,150,60,0)');
      g.fillStyle = lg; g.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
    g.globalCompositeOperation = 'source-over';
    return c;
  }

  function buildParochet() {
    const w = 320, h = 370, c = mk(w, h), g = c.getContext('2d');
    const bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#6e0c19'); bg.addColorStop(0.5, '#8a1424'); bg.addColorStop(1, '#4e0710');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 10; i++) { // soft velvet folds
      const x = i * 32;
      const fg = g.createLinearGradient(x, 0, x + 32, 0);
      fg.addColorStop(0, 'rgba(0,0,0,0.12)'); fg.addColorStop(0.5, 'rgba(255,140,140,0.06)'); fg.addColorStop(1, 'rgba(0,0,0,0.12)');
      g.fillStyle = fg; g.fillRect(x, 0, 32, h);
    }
    const gg = goldGrad(g, 0, 0, w, h);
    g.strokeStyle = gg; g.fillStyle = gg;
    g.lineWidth = 4; g.strokeRect(12, 30, w - 24, h - 58);
    g.lineWidth = 1.5; g.strokeRect(24, 42, w - 48, h - 82);
    for (let x = 30; x < w - 24; x += 12) { g.beginPath(); g.arc(x, 36, 1.8, 0, TAU); g.arc(x, h - 22, 1.8, 0, TAU); g.fill(); }
    for (let y = 48; y < h - 28; y += 12) { g.beginPath(); g.arc(18, y, 1.8, 0, TAU); g.arc(w - 18, y, 1.8, 0, TAU); g.fill(); }
    // crown
    g.beginPath(); crownPath(g, 160, 128, 104, 66); g.fill();
    g.fillRect(104, 126, 112, 12);
    g.fillStyle = '#1e46a8'; g.beginPath(); g.arc(130, 132, 4, 0, TAU); g.arc(190, 132, 4, 0, TAU); g.fill();
    g.fillStyle = '#f0f0f0'; g.beginPath(); g.arc(160, 132, 4.5, 0, TAU); g.fill();
    // tablets
    g.fillStyle = gg;
    g.beginPath(); tablet(g, 110, 160, 46, 92); tablet(g, 164, 160, 46, 92); g.fill();
    g.strokeStyle = '#6e0c19'; g.lineWidth = 2.5;
    g.beginPath();
    for (let i = 0; i < 5; i++) { const y = 196 + i * 11; g.moveTo(118, y); g.lineTo(148, y); g.moveTo(172, y); g.lineTo(202, y); }
    g.stroke();
    // flourishes / vine band
    g.strokeStyle = gg; g.lineWidth = 2.5;
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(160 + s * 62, 240); g.bezierCurveTo(160 + s * 100, 230, 160 + s * 110, 180, 160 + s * 86, 170);
      g.bezierCurveTo(160 + s * 70, 166, 160 + s * 68, 186, 160 + s * 82, 188);
      g.stroke();
      g.beginPath(); g.arc(160 + s * 100, 250, 6, 0, TAU); g.fill();
    }
    g.lineWidth = 2;
    g.beginPath();
    for (let x = 30; x <= w - 30; x += 2) { const y = 300 + Math.sin(x * 0.12) * 8; if (x === 30) g.moveTo(x, y); else g.lineTo(x, y); }
    g.stroke();
    for (let x = 30; x < w - 30; x += 26) { g.beginPath(); g.ellipse(x + 13, 300 + Math.sin((x + 13) * 0.12) * 8 - 8, 3, 6, 0.5, 0, TAU); g.fill(); }
    // fringe
    g.fillRect(0, h - 10, w, 3);
    g.lineWidth = 1.2; g.beginPath();
    for (let x = 2; x < w; x += 4) { g.moveTo(x, h - 8); g.lineTo(x, h); }
    g.stroke();
    return c;
  }
  function buildValance() {
    const w = 340, h = 56, c = mk(w, h), g = c.getContext('2d');
    const bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#223a86'); bg.addColorStop(1, '#101c4a');
    g.fillStyle = bg;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0); g.lineTo(w, 40);
    for (let i = 8; i >= 0; i--) { const x0 = (i * w) / 8, x1 = ((i + 1) * w) / 8; g.quadraticCurveTo((x0 + x1) / 2, 56, x0, 40); }
    g.closePath(); g.fill();
    const gg = goldGrad(g, 0, 0, w, h);
    g.fillStyle = gg; g.fillRect(0, 0, w, 5); g.fillRect(0, 30, w, 3);
    for (let i = 0; i < 8; i++) {
      const x = ((i + 0.5) * w) / 8;
      if (i === 3 || i === 4) continue;
      g.strokeStyle = gg; g.lineWidth = 1.5; g.beginPath(); star(g, x, 18, 8); g.stroke();
    }
    g.beginPath(); crownPath(g, w / 2, 27, 40, 22); g.fill();
    g.strokeStyle = gg; g.lineWidth = 1;
    g.beginPath();
    for (let i = 0; i < 8; i++) { const x0 = (i * w) / 8, x1 = ((i + 1) * w) / 8; for (let x = x0 + 3; x < x1 - 2; x += 4) { const u = (x - x0) / (x1 - x0); const y = 40 + 4 * Math.sin(u * Math.PI) * 2; g.moveTo(x, y); g.lineTo(x, y + 8); } }
    g.stroke();
    return c;
  }
  function buildChandelier(cands) {
    const w = 440, h = 340, c = mk(w, h), g = c.getContext('2d');
    const cx = w / 2;
    const brass = (x, y, r) => {
      const bg = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
      bg.addColorStop(0, '#fff2c0'); bg.addColorStop(0.35, '#d9a646'); bg.addColorStop(1, '#4a2e0c');
      return bg;
    };
    const tiers = [{ y: 120, R: 120, n: 8, cupY: 86 }, { y: 225, R: 196, n: 10, cupY: 180 }];
    const arms = [];
    for (const tr of tiers) for (let i = 0; i < tr.n; i++) {
      const a = (i / tr.n) * TAU + 0.2;
      arms.push({ tr, a, depth: Math.sin(a) });
    }
    arms.sort((p, q) => p.depth - q.depth);
    const drawArm = (ar) => {
      const { tr, a } = ar, ex = cx + tr.R * Math.cos(a), ey = tr.cupY + 14 * Math.sin(a);
      const k = 0.55 + 0.45 * (ar.depth + 1) / 2;
      g.strokeStyle = rgb([200 * k, 150 * k, 60 * k]); g.lineWidth = 5; g.lineCap = 'round';
      g.beginPath();
      g.moveTo(cx, tr.y);
      g.bezierCurveTo(cx + (ex - cx) * 0.4, tr.y + 34 + 10 * Math.sin(a), ex, tr.y + 30 + 12 * Math.sin(a), ex, ey + 12);
      g.stroke();
      g.fillStyle = brass(ex, ey + 6, 12);
      g.beginPath(); g.ellipse(ex, ey + 8, 12, 5, 0, 0, TAU); g.fill();
      g.fillStyle = rgb([245 * k + 10, 232 * k + 10, 205 * k + 10]); g.fillRect(ex - 4, ey - 22, 8, 28);
      g.fillStyle = '#ffe9b0'; g.beginPath(); g.ellipse(ex, ey - 29, 3.5, 8, 0, 0, TAU); g.fill();
      g.fillStyle = '#fffaf0'; g.beginPath(); g.ellipse(ex, ey - 27, 1.8, 4, 0, 0, TAU); g.fill();
      cands.push([ex - cx, ey - 30, k]);
    };
    const back = arms.filter((a) => a.depth < 0), front = arms.filter((a) => a.depth >= 0);
    back.forEach(drawArm);
    // shaft
    g.fillStyle = brass(cx, 20, 10); g.fillRect(cx - 5, 0, 10, 260);
    for (const [y, r] of [[40, 12], [70, 16], [120, 20], [170, 14], [225, 26], [272, 38]]) {
      g.fillStyle = brass(cx, y, r); g.beginPath(); g.arc(cx, y, r, 0, TAU); g.fill();
    }
    g.fillStyle = brass(cx, 310, 12); g.beginPath(); g.arc(cx, 312, 10, 0, TAU); g.fill();
    front.forEach(drawArm);
    return c;
  }
  function buildGlow(size, stops) {
    const c = mk(size, size), g = c.getContext('2d');
    const r = size / 2, gr = g.createRadialGradient(r, r, 0, r, r, r);
    for (const [o, col] of stops) gr.addColorStop(o, col);
    g.fillStyle = gr; g.fillRect(0, 0, size, size);
    return c;
  }
  // Vignette + bottom calm band + film grain, pre-composited into a few full-frame
  // overlays (one cheap drawImage per frame; the grain variant is picked from t).
  function buildFinish(rng, count) {
    const base = mk(W, H), g = base.getContext('2d');
    const vg = g.createRadialGradient(W / 2, H * 0.45, H * 0.35, W / 2, H * 0.5, H * 1.05);
    vg.addColorStop(0, 'rgba(6,3,1,0)'); vg.addColorStop(0.6, 'rgba(6,3,1,0.35)'); vg.addColorStop(1, 'rgba(6,3,1,0.85)');
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    const bb = g.createLinearGradient(0, H * 0.7, 0, H);
    bb.addColorStop(0, 'rgba(6,3,1,0)'); bb.addColorStop(1, 'rgba(6,3,1,0.55)');
    g.fillStyle = bb; g.fillRect(0, H * 0.7, W, H * 0.3);
    const src = g.getImageData(0, 0, W, H).data;
    const out = [];
    for (let k = 0; k < count; k++) {
      const c = mk(W, H), cg = c.getContext('2d');
      const id = cg.createImageData(W, H), d = id.data;
      for (let i = 0; i < d.length; i += 4) {
        const av = src[i + 3] / 255, v = rng();
        const ag = Math.abs(v - 0.5) * 2 * 0.075, G = v > 0.5 ? 255 : 0;
        const A = 1 - (1 - av) * (1 - ag);
        if (A <= 0) continue;
        const inv = 1 / A;
        d[i] = (G * ag + (1 - ag) * av * src[i]) * inv;
        d[i + 1] = (G * ag + (1 - ag) * av * src[i + 1]) * inv;
        d[i + 2] = (G * ag + (1 - ag) * av * src[i + 2]) * inv;
        d[i + 3] = A * 255;
      }
      cg.putImageData(id, 0, 0);
      out.push(c);
    }
    return out;
  }
  // Final-title backdrop: dims the room so the gold letters read, warm in the middle.
  function buildVeil() {
    const c = mk(W, H), g = c.getContext('2d');
    const vg = g.createRadialGradient(960, 500, 100, 960, 520, 1150);
    vg.addColorStop(0, 'rgba(46,20,6,0.42)'); vg.addColorStop(0.55, 'rgba(26,11,3,0.55)'); vg.addColorStop(1, 'rgba(12,5,2,0.78)');
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    const band = g.createLinearGradient(0, 220, 0, 820);
    band.addColorStop(0, 'rgba(30,12,3,0)'); band.addColorStop(0.5, 'rgba(30,12,3,0.3)'); band.addColorStop(1, 'rgba(30,12,3,0)');
    g.fillStyle = band; g.fillRect(0, 220, W, 600);
    return c;
  }

  // ---------- dancers ----------
  function dancerPaths(g, p, v, t) {
    const sp = Math.sin(p), cp = Math.cos(p);
    const l1 = Math.max(0, sp) * 0.09, l2 = Math.max(0, -sp) * 0.09;
    g.lineCap = 'round'; g.lineJoin = 'round';
    // legs
    g.lineWidth = 0.044;
    g.beginPath();
    g.moveTo(-0.035, -0.3); g.lineTo(-0.045 + sp * 0.025, -0.15 - l1 * 0.7); g.lineTo(-0.055 + sp * 0.04, -0.02 - l1);
    g.moveTo(0.035, -0.3); g.lineTo(0.045 - sp * 0.025, -0.15 - l2 * 0.7); g.lineTo(0.055 - sp * 0.04, -0.02 - l2);
    g.stroke();
    g.beginPath();
    g.ellipse(-0.045 + sp * 0.04, -0.012 - l1, 0.04, 0.016, 0, 0, TAU);
    g.moveTo(0.105 - sp * 0.04, -0.012 - l2);
    g.ellipse(0.065 - sp * 0.04, -0.012 - l2, 0.04, 0.016, 0, 0, TAU);
    g.fill();
    // long black coat (kapote), swinging with the step
    const sw = cp * 0.03;
    g.beginPath();
    g.moveTo(-0.118, -0.79);
    g.quadraticCurveTo(-0.134, -0.62, -0.112, -0.52);
    g.quadraticCurveTo(-0.14 + sw * 0.5, -0.36, -0.158 + sw, -0.2);
    g.quadraticCurveTo(sw, -0.18, 0.158 + sw, -0.2);
    g.quadraticCurveTo(0.14 + sw * 0.5, -0.36, 0.112, -0.52);
    g.quadraticCurveTo(0.134, -0.62, 0.118, -0.79);
    g.quadraticCurveTo(0, -0.835, -0.118, -0.79);
    g.fill();
    // neck, head, beard
    g.fillRect(-0.026, -0.845, 0.052, 0.07);
    g.beginPath(); g.ellipse(0, -0.888, 0.057, 0.066, 0, 0, TAU); g.fill();
    if (v.beard) { g.beginPath(); g.ellipse(0, -0.842, 0.048, 0.05, 0, 0, TAU); g.fill(); }
    // head covering
    g.beginPath();
    if (v.hat === 0) { // hat with brim
      g.ellipse(0, -0.93, 0.105, 0.017, 0, 0, TAU);
      g.moveTo(-0.062, -0.93); g.lineTo(-0.058, -0.995); g.quadraticCurveTo(0, -1.02, 0.058, -0.995); g.lineTo(0.062, -0.93);
    } else if (v.hat === 1) { // kippah
      g.ellipse(0, -0.948, 0.046, 0.018, 0, Math.PI, TAU);
    } else { // fur shtreimel
      g.ellipse(0, -0.955, 0.1, 0.05, 0, 0, TAU);
    }
    g.fill();
  }
  function tallitPaths(g) {
    g.beginPath();
    g.moveTo(-0.122, -0.8); g.lineTo(-0.168, -0.43); g.lineTo(-0.07, -0.44); g.lineTo(-0.045, -0.79);
    g.moveTo(0.122, -0.8); g.lineTo(0.168, -0.43); g.lineTo(0.07, -0.44); g.lineTo(0.045, -0.79);
    g.fill();
  }
  function armPoints(v, p, idx) {
    const sp = Math.sin(p), s2 = Math.sin(p + 1.3);
    switch (v.arms) {
      case 0: return [[-0.2, -0.87 + 0.03 * sp, -0.16, -1.04 + 0.04 * s2], [0.2, -0.87 - 0.03 * sp, 0.16, -1.04 - 0.04 * s2]];
      case 1: return [[-0.22, -0.735, -0.33, -0.765 + 0.012 * sp], [0.22, -0.735, 0.33, -0.765 - 0.012 * sp]];
      case 2: return [[-0.18, -0.9, -0.012 + 0.02 * sp, -1.09 + 0.02 * Math.abs(s2)], [0.18, -0.9, 0.012 + 0.02 * sp, -1.09 + 0.02 * Math.abs(s2)]];
      default: return [[-0.19, -0.88 + 0.02 * sp, -0.15, -1.03 + 0.03 * s2], [0.22, -0.72, 0.31, -0.76 + 0.012 * sp]];
    }
  }
  function drawArms(g, arms) {
    g.lineWidth = 0.05; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(-0.1, -0.775); g.lineTo(arms[0][0], arms[0][1]); g.lineTo(arms[0][2], arms[0][3]);
    g.moveTo(0.1, -0.775); g.lineTo(arms[1][0], arms[1][1]); g.lineTo(arms[1][2], arms[1][3]);
    g.stroke();
  }
  function drawFlag(g, hx, hy, t, ph, light) {
    const tx = hx - 0.05, ty = hy - 0.38;
    g.strokeStyle = rgb([150 * light, 110 * light, 70 * light]); g.lineWidth = 0.012;
    g.beginPath(); g.moveTo(hx, hy + 0.02); g.lineTo(tx, ty); g.stroke();
    g.fillStyle = '#b3232f'; g.beginPath(); g.arc(tx, ty - 0.012, 0.02, 0, TAU); g.fill();
    const fw = 0.23, fh = 0.15, n = 7, top = [], bot = [];
    for (let k = 0; k <= n; k++) {
      const u = k / n, wv = Math.sin(t * 7 + ph - u * 3.2) * 0.018 * u;
      const x = lerp(tx, hx, 0.1) - u * fw, x2 = lerp(tx, hx, 0.45) - u * fw;
      top.push([x, ty + 0.02 + wv]); bot.push([x2, ty + 0.02 + fh + wv * 1.2]);
    }
    const poly = (a, b, f0, f1) => {
      g.beginPath();
      for (let k = 0; k <= n; k++) { const x = lerp(a[k][0], b[k][0], f0), y = lerp(a[k][1], b[k][1], f0); if (k) g.lineTo(x, y); else g.moveTo(x, y); }
      for (let k = n; k >= 0; k--) g.lineTo(lerp(a[k][0], b[k][0], f1), lerp(a[k][1], b[k][1], f1));
      g.closePath(); g.fill();
    };
    // a Simchat Torah flag: cream field, gold and crimson borders, a little Torah scroll
    g.fillStyle = rgb([176 * light, 30 * light, 44 * light]); poly(top, bot, 0, 1);
    g.fillStyle = rgb([236 * light, 186 * light, 88 * light]); poly(top, bot, 0.08, 0.92);
    g.fillStyle = rgb([250 * light, 238 * light, 212 * light]); poly(top, bot, 0.16, 0.84);
    const mx = lerp(top[4][0], bot[4][0], 0.5), my = lerp(top[4][1], bot[4][1], 0.5);
    g.fillStyle = rgb([30 * light, 52 * light, 140 * light]);
    g.fillRect(mx - 0.018, my - 0.03, 0.036, 0.058);
    g.fillStyle = rgb([200 * light, 150 * light, 60 * light]);
    g.fillRect(mx - 0.014, my - 0.043, 0.006, 0.014); g.fillRect(mx + 0.008, my - 0.043, 0.006, 0.014);
    g.fillRect(mx - 0.018, my - 0.012, 0.036, 0.006);
    // shading across the wave
    g.fillStyle = 'rgba(80,40,10,0.15)'; poly(top, bot, 0, 1);
  }

  // ---------- scene state (static caches only) ----------
  let L = null;
  function init() {
    if (L) return;
    const rng = mulberry32(0x5eaf7);
    const glints = [];
    const cands = [];
    L = {
      bg: buildBG(rng, glints),
      glints,
      parochet: buildParochet(),
      valance: buildValance(),
      glow: buildGlow(128, [[0, 'rgba(255,240,200,1)'], [0.2, 'rgba(255,200,120,0.55)'], [0.55, 'rgba(255,160,70,0.12)'], [1, 'rgba(255,140,50,0)']]),
      spark: buildGlow(48, [[0, 'rgba(255,255,235,1)'], [0.15, 'rgba(255,225,150,0.8)'], [0.45, 'rgba(255,180,80,0.18)'], [1, 'rgba(255,160,60,0)']]),
      finish: buildFinish(rng, 4),
      veil: buildVeil(),
      torah: null,
      dancers: [],
      parts: [],
      torahGlints: [],
      candles: [],
    };
    // brass chandeliers are baked into the background (static); only candle glints animate
    const chand = buildChandelier(cands);
    const bgc = L.bg.getContext('2d');
    for (const [x, y, s, dim] of [[160, 470, 0.62, 0.7], [1760, 470, 0.62, 0.7], [420, 330, 0.95, 1], [1500, 330, 0.95, 1]]) {
      bgc.strokeStyle = 'rgba(60,40,20,0.9)'; bgc.lineWidth = 3;
      bgc.beginPath(); bgc.moveTo(x, 0); bgc.lineTo(x, y); bgc.stroke();
      bgc.drawImage(chand, x - 220 * s, y, 440 * s, 340 * s);
      bgc.globalCompositeOperation = 'lighter';
      bgc.globalAlpha = 0.3 * dim;
      bgc.drawImage(L.glow, x - 420 * s, y + 150 * s - 420 * s, 840 * s, 840 * s);
      bgc.globalAlpha = 1;
      bgc.globalCompositeOperation = 'source-over';
      for (const cd of cands) L.candles.push([x + cd[0] * s, y + cd[1] * s, cd[2] * dim, s]);
    }
    // carried Torah sprite (px space, 140 x 330)
    L.torah = mk(140, 330);
    drawScroll(L.torah.getContext('2d'), 70, 90, 210, 74, [26, 50, 138], true, L.torahGlints);
    // dancers
    const N = 12;
    for (let i = 0; i < N; i++) {
      L.dancers.push({
        hat: [0, 0, 1, 2, 0, 1, 0, 2, 1, 0, 0, 1][i],
        beard: rng() < 0.7,
        tallit: rng() < 0.45,
        arms: [0, 1, 3, 2, 1, 0, 3, 1, 2, 0, 3, 1][i],
        flag: [0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0][i] || 0,
        size: 0.94 + rng() * 0.1,
        ph: rng() * 0.8,
      });
    }
    for (let i = 0; i < 170; i++) {
      L.parts.push({
        x: rng() * W, y: rng() * (H + 120), vy: 18 + rng() * 45, amp: 10 + rng() * 40, f: 0.3 + rng() * 0.9,
        ph: rng() * TAU, size: 6 + rng() * 22, tw: 1.5 + rng() * 4, kind: rng() < 0.42 ? 1 : 0,
        col: [[255, 214, 120], [255, 236, 190], [230, 170, 70], [255, 200, 90]][(rng() * 4) | 0],
        spin: 1 + rng() * 4, far: rng(),
      });
    }
  }

  // ---------- camera ----------
  const REFY = 948;
  function camera(t) {
    const a = eio(seg(t, 0, 4.8));
    let z = lerp(1.22, 1.29, a), fy = lerp(862, 874, a);
    const b = eio(seg(t, 4.3, 7.8));
    z = lerp(z, 1.035, b); fy = lerp(fy, 985, b);
    z += 0.035 * seg(t, 7.8, 13.5);
    const d = eio(seg(t, 12.8, 16.6));
    z = lerp(z, 1.34, d); fy = lerp(fy, 424, d);
    const fx = 960 + 16 * Math.sin(t * 0.33) * (1 - d);
    return { z, fx, fy, d };
  }
  function applyCam(ctx, c, par) {
    ctx.translate(W / 2, H / 2);
    ctx.scale(c.z, c.z);
    ctx.translate(-c.fx, -(REFY + (c.fy - REFY) * par));
  }

  // ---------- draw ----------
  function draw(ctx, t, env) {
    if (!L) init();
    const c = camera(t);
    const fl = 1 + 0.035 * Math.sin(t * 7.3) + 0.025 * Math.sin(t * 12.7 + 1.1);
    const open = eio(seg(t, 0.6, 4.8));
    const burstUp = ss(13.6, 15.2, t);
    const burst = burstUp * (1 - 0.62 * ss(15.2, 17.0, t));

    ctx.save();
    ctx.fillStyle = '#0d0703'; ctx.fillRect(0, 0, W, H);

    // ----- world -----
    ctx.save();
    applyCam(ctx, c, 1);
    { // only the visible part of the tall background
      const vw = W / c.z, vh = H / c.z;
      const x0 = clamp(Math.floor(c.fx - vw / 2) - 2, 0, W), y0 = clamp(Math.floor(c.fy - vh / 2) - 2, 0, WH);
      const x1 = clamp(Math.ceil(c.fx + vw / 2) + 2, 0, W), y1 = clamp(Math.ceil(c.fy + vh / 2) + 2, 0, WH);
      ctx.drawImage(L.bg, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
    }

    // ark: glow behind curtain
    ctx.globalCompositeOperation = 'lighter';
    const ga = 0.15 + 0.85 * open;
    ctx.globalAlpha = clamp(ga * 0.6 * fl, 0, 1);
    ctx.drawImage(L.glow, 960 - 260, 925 - 260, 520, 520);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // parochet halves, gathering to the sides
    if (open < 0.999) {
      const hw = 160, keep = 1 - 0.78 * open;
      const wv = hw * keep;
      for (const s of [0, 1]) {
        const dx = s ? 1120 - wv : 800;
        ctx.drawImage(L.parochet, s * hw, 0, hw, 370, dx, 740, wv, 370);
        if (open > 0.01) {
          const n = 5, fg = ctx.createLinearGradient(dx, 0, dx + wv, 0);
          for (let k = 0; k <= n * 2; k++) fg.addColorStop(k / (n * 2), k % 2 ? `rgba(255,150,150,${0.07 * open})` : `rgba(0,0,0,${0.4 * open})`);
          ctx.fillStyle = fg; ctx.fillRect(dx, 740, wv, 370);
        }
        // the inner edge catches the light from the scrolls
        const ex = s ? dx : dx + wv;
        const eg = ctx.createLinearGradient(ex - (s ? 0 : 14), 0, ex + (s ? 14 : 0), 0);
        eg.addColorStop(s ? 0 : 1, `rgba(255,200,130,${0.45 * Math.sin(open * Math.PI)})`); eg.addColorStop(s ? 1 : 0, 'rgba(255,200,130,0)');
        ctx.fillStyle = eg; ctx.fillRect(s ? ex : ex - 14, 740, 14, 370);
      }
    } else {
      // fully drawn aside
      const wv = 160 * 0.22;
      for (const s of [0, 1]) {
        const dx = s ? 1120 - wv : 800;
        ctx.drawImage(L.parochet, s * 160, 0, 160, 370, dx, 740, wv, 370);
        const fg = ctx.createLinearGradient(dx, 0, dx + wv, 0);
        for (let k = 0; k <= 10; k++) fg.addColorStop(k / 10, k % 2 ? 'rgba(255,150,150,0.07)' : 'rgba(0,0,0,0.4)');
        ctx.fillStyle = fg; ctx.fillRect(dx, 740, wv, 370);
      }
    }
    ctx.drawImage(L.valance, 790, 716);

    // holy light from the scrolls: glow + soft rays + glints
    if (open > 0.02) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.save();
      ctx.beginPath(); ctx.rect(800, 760, 320, 350); ctx.clip();
      ctx.globalAlpha = 0.3 * open * fl;
      ctx.drawImage(L.glow, 960 - 200, 900 - 170, 400, 340);
      ctx.restore();
      ctx.save();
      ctx.translate(960, 900);
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI / 2 + (i - 3) * 0.34 + 0.05 * Math.sin(t * 0.5 + i);
        const len = 520 + 80 * Math.sin(t * 0.7 + i * 1.7);
        const rg = ctx.createLinearGradient(0, 0, Math.cos(a) * len, Math.sin(a) * len);
        rg.addColorStop(0, `rgba(255,220,150,${0.12 * open})`); rg.addColorStop(1, 'rgba(255,200,120,0)');
        ctx.fillStyle = rg;
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a - 0.05) * len, Math.sin(a - 0.05) * len);
        ctx.lineTo(Math.cos(a + 0.05) * len, Math.sin(a + 0.05) * len);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      for (let i = 0; i < L.glints.length; i++) {
        const [x, y] = L.glints[i];
        const inArk = y > 760;
        const tw = 0.5 + 0.5 * Math.sin(t * (2.1 + (i % 5) * 0.4) + i * 2.3);
        const a = (inArk ? open : 0.5) * (0.25 + 0.75 * tw * tw);
        const s = 22 + 18 * tw;
        ctx.globalAlpha = a; ctx.drawImage(L.spark, x - s / 2, y - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
      // warm pool on the floor
      ctx.globalAlpha = 0.35 * open;
      ctx.drawImage(L.glow, 960 - 700, FLOOR - 60, 1400, 260);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    // ----- hakafot: circle of dancers around the Torah -----
    const danceIn = seg(t, 4.2, 8.2);
    if (danceIn > 0) {
      const CX = 960, CY = 1345, RA = 430, RB = 82;
      const rot = 0.4 * t;
      const beat = t * TAU * 1.05;
      const list = [];
      const N = L.dancers.length;
      for (let i = 0; i < N; i++) {
        const v = L.dancers[i];
        const th = (i / N) * TAU + rot;
        const depth = Math.sin(th);
        let x = CX + RA * Math.cos(th), y = CY + RB * depth;
        const e = eo(seg(t, 4.3 + (i % 6) * 0.22, 7.3 + (i % 6) * 0.22));
        const sx = Math.cos(th) < 0 ? -260 : 2180;
        x = lerp(sx, x, e);
        list.push({ v, i, x, y, depth, s: 238 * v.size * (0.84 + 0.16 * (depth + 1) / 2), p: beat + v.ph + i * 0.35 });
      }
      list.sort((p, q) => p.depth - q.depth);
      const bearerDone = eo(seg(t, 4.6, 8.0));
      const bearer = { x: lerp(2150, 960, bearerDone), y: 1308 };
      let drewBearer = false;
      for (const d of list) {
        if (!drewBearer && d.depth > -0.05) { drawBearer(ctx, bearer.x, bearer.y, t, beat, fl); drewBearer = true; }
        drawDancer(ctx, d, t, beat);
      }
      if (!drewBearer) drawBearer(ctx, bearer.x, bearer.y, t, beat, fl);
    }

    // ----- chandelier candles: flickering flames -----
    ctx.globalCompositeOperation = 'lighter';
    const chBoost = 1 + 1.5 * burst;
    for (let k = 0; k < L.candles.length; k++) {
      const cd = L.candles[k];
      const f = 0.72 + 0.28 * Math.sin(t * (8 + (k % 5)) + k * 1.9);
      ctx.globalAlpha = clamp(0.75 * cd[2] * f * chBoost, 0, 1);
      const gs = (40 + 14 * burst) * cd[3];
      ctx.drawImage(L.spark, cd[0] - gs / 2, cd[1] - gs / 2, gs, gs);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // ----- screen-space atmosphere -----
    ctx.globalCompositeOperation = 'lighter';

    // confetti + sparkles
    const confAmt = ss(4.8, 7.5, t);
    const camShift = (REFY - c.fy) * c.z * 0.55;
    for (let i = 0; i < L.parts.length; i++) {
      const pt = L.parts[i];
      const x = pt.x + pt.amp * Math.sin(t * pt.f + pt.ph);
      let y = pt.y + pt.vy * t * (pt.kind ? 1.4 : -0.5) + camShift * (0.6 + pt.far * 0.6);
      y = ((y % (H + 120)) + (H + 120)) % (H + 120) - 60;
      const low = 1 - 0.75 * ss(H * 0.72, H * 0.95, y);
      if (pt.kind === 0) {
        const tw = 0.5 + 0.5 * Math.sin(t * pt.tw + pt.ph);
        const a = (0.18 + 0.82 * confAmt) * (0.3 + 0.7 * tw) * low * (0.45 + 0.55 * pt.far);
        if (a < 0.02) continue;
        const s = pt.size * (0.35 + 0.65 * confAmt) * (0.6 + 0.6 * tw);
        ctx.globalAlpha = a; ctx.drawImage(L.spark, x - s / 2, y - s / 2, s, s);
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    if (confAmt > 0) {
      for (let i = 0; i < L.parts.length; i++) {
        const pt = L.parts[i];
        if (pt.kind !== 1) continue;
        const x = pt.x + pt.amp * Math.sin(t * pt.f + pt.ph);
        let y = pt.y + pt.vy * t * 1.4 + camShift * (0.6 + pt.far * 0.6);
        y = ((y % (H + 120)) + (H + 120)) % (H + 120) - 60;
        const low = 1 - 0.8 * ss(H * 0.72, H * 0.95, y);
        const flip = Math.cos(t * pt.spin + pt.ph);
        const sh = 0.55 + 0.45 * Math.abs(flip);
        ctx.globalAlpha = confAmt * low * (0.55 + 0.45 * pt.far);
        ctx.fillStyle = rgb(shade(pt.col, sh));
        ctx.save();
        ctx.translate(x, y); ctx.rotate(pt.ph + t * pt.spin * 0.4); ctx.scale(1, flip);
        const sz = 5 + pt.size * 0.28;
        ctx.fillRect(-sz / 2, -sz * 0.35, sz, sz * 0.7);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    // ----- finale: golden burst, then the title -----
    const veil = ss(15.0, 16.8, t);
    if (veil > 0) {
      ctx.globalAlpha = veil;
      ctx.drawImage(L.veil, 0, 0);
      ctx.globalAlpha = 1;
    }
    const flash = burstUp * (1 - ss(15.0, 16.9, t));
    if (flash > 0.002) {
      ctx.globalCompositeOperation = 'lighter';
      const r = lerp(500, 1500, eos(burstUp));
      const bg = ctx.createRadialGradient(960, 440, 0, 960, 440, r);
      bg.addColorStop(0, `rgba(255,214,150,${0.62 * flash})`);
      bg.addColorStop(0.4, `rgba(255,160,70,${0.36 * flash})`);
      bg.addColorStop(1, `rgba(190,90,25,${0.14 * flash})`);
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
    }
    drawTitle(ctx, t);

    // ----- finishing: vignette + calm bottom band + grain (pre-composited) -----
    ctx.drawImage(L.finish[hash(Math.floor(t * 24) + 7) % L.finish.length], 0, 0);
    ctx.restore();
  }

  function drawDancer(ctx, d, t, beat) {
    const v = d.v, p = d.p;
    const bounce = Math.abs(Math.sin(p)) * 0.045;
    const back = (1 - d.depth) / 2; // 0 front .. 1 back
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.scale(d.s, d.s);
    ctx.translate(0, -bounce);
    ctx.rotate(Math.sin(p * 0.5 + d.i) * 0.06);
    const arms = armPoints(v, p, d.i);
    // rim light (backlit by the Ark and chandeliers)
    ctx.save();
    ctx.translate(0.004, -0.007);
    const rim = `rgba(255,${185 - back * 30},${105 - back * 30},${0.6 - back * 0.25})`;
    ctx.fillStyle = rim; ctx.strokeStyle = rim;
    dancerPaths(ctx, p, v, t); drawArms(ctx, arms);
    ctx.restore();
    const base = [13 + back * 30, 8 + back * 19, 5 + back * 12];
    ctx.fillStyle = rgb(base); ctx.strokeStyle = rgb(base);
    dancerPaths(ctx, p, v, t);
    if (v.tallit) {
      ctx.fillStyle = rgb([base[0] + 26, base[1] + 20, base[2] + 15]); tallitPaths(ctx);
      ctx.fillStyle = rgb(shade(base, 0.6));
      ctx.fillRect(-0.16, -0.5, 0.09, 0.018); ctx.fillRect(0.07, -0.5, 0.09, 0.018);
      ctx.fillRect(-0.163, -0.47, 0.095, 0.01); ctx.fillRect(0.068, -0.47, 0.095, 0.01);
      ctx.strokeStyle = 'rgba(255,225,170,0.45)'; ctx.lineWidth = 0.006;
      ctx.beginPath(); ctx.moveTo(-0.16, -0.43); ctx.lineTo(-0.163, -0.35); ctx.moveTo(0.16, -0.43); ctx.lineTo(0.163, -0.35); ctx.stroke();
      ctx.strokeStyle = rgb(base);
    }
    drawArms(ctx, arms);
    if (v.flag && v.arms === 3) drawFlag(ctx, arms[0][2], arms[0][3], t, d.i * 1.7, 0.85 - back * 0.25);
    else if (v.flag) drawFlag(ctx, arms[1][2], arms[1][3], t, d.i * 1.7, 0.85 - back * 0.25);
    ctx.restore();
  }

  function drawBearer(ctx, x, y, t, beat, fl) {
    const s = 262, p = beat * 0.5;
    const bounce = Math.abs(Math.sin(p)) * 0.03;
    ctx.save();
    ctx.translate(x, y);
    // halo around the Torah
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5 * fl;
    ctx.drawImage(L.glow, -230, -s * 1.02 - 230, 460, 460);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.scale(s, s);
    ctx.translate(0, -bounce);
    ctx.rotate(Math.sin(p) * 0.035);
    const v = { hat: 0, beard: true, tallit: true };
    const rim = 'rgba(255,196,120,0.8)';
    ctx.save(); ctx.translate(0.004, -0.007); ctx.fillStyle = rim; ctx.strokeStyle = rim; dancerPaths(ctx, p, v, t); ctx.restore();
    const base = [18, 10, 6];
    ctx.fillStyle = rgb(base); ctx.strokeStyle = rgb(base);
    dancerPaths(ctx, p, v, t);
    ctx.fillStyle = rgb([44, 31, 22]); tallitPaths(ctx);
    ctx.fillStyle = '#0c0704'; ctx.fillRect(-0.16, -0.5, 0.09, 0.018); ctx.fillRect(0.07, -0.5, 0.09, 0.018);
    // the Torah, held upright against the right shoulder, swaying
    ctx.save();
    ctx.translate(0.085, -0.62);
    ctx.rotate(-0.12 + Math.sin(t * 2.1) * 0.06);
    const k = 1 / 300 * 1.05;
    ctx.drawImage(L.torah, -70 * k, -300 * k, 140 * k, 330 * k);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < L.torahGlints.length; i++) {
      const g = L.torahGlints[i];
      const tw = 0.5 + 0.5 * Math.sin(t * (2.6 + i * 0.37) + i * 1.9);
      const sz = (0.05 + 0.06 * tw);
      ctx.globalAlpha = 0.3 + 0.7 * tw * tw;
      ctx.drawImage(L.spark, (g[0] - 70) * k - sz / 2, (g[1] - 300) * k - sz / 2, sz, sz);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
    // arms: right arm hugs the scroll, left arm raised in joy
    ctx.strokeStyle = rgb(base); ctx.lineWidth = 0.05; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0.1, -0.775); ctx.lineTo(0.16, -0.64); ctx.lineTo(0.03, -0.62);
    ctx.moveTo(-0.1, -0.775); ctx.lineTo(-0.2, -0.88 + 0.03 * Math.sin(p * 2)); ctx.lineTo(-0.15, -1.04 + 0.04 * Math.sin(p * 2 + 1));
    ctx.stroke();
    ctx.restore();
  }

  // The title is fully settled for t >= 17, so the static letters are rendered once into
  // an offscreen buffer (re-rendered if the web font set changes) and simply blitted.
  const TCY = 130;
  let titleCache = null, titleKey = '';
  function drawTitle(ctx, t) {
    const a = ss(15.0, 16.6, t);
    if (a <= 0) return;
    ctx.save();
    // soft halo behind the words
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5 * a;
    ctx.drawImage(L.glow, 960 - 560, 455 - 250, 1120, 500);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
    if (t < 17) { titleText(ctx, t); return; }
    const fs = document.fonts;
    const key = fs ? fs.size + '|' + fs.status + '|' + fs.check(`900 270px ${FONT}`) : 'x';
    if (!titleCache || key !== titleKey) {
      titleCache = titleCache || mk(W, 720);
      const g = titleCache.getContext('2d');
      g.clearRect(0, 0, W, 720);
      g.save(); g.translate(0, -TCY); titleText(g, 17); g.restore();
      titleKey = key;
    }
    ctx.drawImage(titleCache, 0, TCY);
  }
  function titleText(ctx, t) {
    const a = ss(15.0, 16.6, t);
    const k = eo(seg(t, 15.0, 17.0));
    const cx = 960, cy = 455;
    ctx.save();
    ctx.translate(cx, cy);
    const sc = 1.07 - 0.07 * k;
    ctx.scale(sc, sc);
    ctx.direction = 'rtl'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const hasLS = 'letterSpacing' in ctx;
    const ls = 46 * (1 - k) + 4;
    ctx.font = `900 270px ${FONT}`;
    if (hasLS) ctx.letterSpacing = ls + 'px';
    const shift = hasLS ? ls / 2 : 0; // center compensation for trailing spacing
    const gr = ctx.createLinearGradient(0, -130, 0, 120);
    gr.addColorStop(0, '#fff6d8'); gr.addColorStop(0.28, '#f6d680'); gr.addColorStop(0.5, '#d9a441');
    gr.addColorStop(0.62, '#b07a22'); gr.addColorStop(0.78, '#e7c062'); gr.addColorStop(1, '#fbe6a6');
    // dark separation shadow
    ctx.globalAlpha = a * 0.75;
    ctx.shadowColor = 'rgba(30,12,2,0.9)'; ctx.shadowBlur = 36; ctx.shadowOffsetY = 10;
    ctx.fillStyle = '#3a1e08'; ctx.fillText('חג שמח', -shift, 0);
    // warm glow
    ctx.shadowOffsetY = 0; ctx.shadowColor = 'rgba(255,190,90,0.85)'; ctx.shadowBlur = 44;
    ctx.globalAlpha = a;
    ctx.fillStyle = gr; ctx.fillText('חג שמח', -shift, 0);
    ctx.shadowBlur = 0; ctx.shadowColor = 'rgba(0,0,0,0)';
    ctx.fillText('חג שמח', -shift, 0);
    ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(255,248,225,0.55)';
    ctx.strokeText('חג שמח', -shift, 0);

    // ornament + subtitle
    const a2 = ss(15.8, 17.0, t);
    if (a2 > 0) {
      const k2 = eo(seg(t, 15.8, 17.0));
      ctx.globalAlpha = a2;
      const lw = 300 * k2;
      const lg = ctx.createLinearGradient(-lw - 40, 0, lw + 40, 0);
      lg.addColorStop(0, 'rgba(233,192,100,0)'); lg.addColorStop(0.5, 'rgba(250,220,150,1)'); lg.addColorStop(1, 'rgba(233,192,100,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(-lw - 40, 148, 2 * lw + 80, 2);
      ctx.fillStyle = '#f3d68a';
      ctx.save(); ctx.translate(0, 149); ctx.rotate(Math.PI / 4); ctx.fillRect(-6, -6, 12, 12); ctx.restore();
      if (hasLS) ctx.letterSpacing = (18 * (1 - k2) + 6) + 'px';
      ctx.font = `700 78px ${FONT}`;
      ctx.shadowColor = 'rgba(30,12,2,0.85)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 4;
      const sg = ctx.createLinearGradient(0, 200, 0, 270);
      sg.addColorStop(0, '#fbeac0'); sg.addColorStop(1, '#d9ae5c');
      ctx.fillStyle = sg;
      ctx.fillText('סוכות תשפ״ז', 0, 236 + 10 * (1 - k2));
      ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; ctx.shadowColor = 'rgba(0,0,0,0)';
    }
    if (hasLS) ctx.letterSpacing = '0px';
    ctx.restore();
  }

  S.scenes[7] = { duration: 20, init, draw };
})();
