/* Scene 5 - Simchat Beit HaShoeva
 * The Second Temple at night: the four great golden lamps of the Women's Courtyard
 * light up all of Jerusalem (Mishnah Sukkah 5:2-3). The camera flies in from over the
 * dark city; in the second half the water libation is poured at the altar as a
 * glittering silver stream of light.
 * Pure function of t: all randomness is precomputed in init with a seeded RNG.
 */
(function () {
  'use strict';
  const S = (window.SUKKOT = window.SUKKOT || { scenes: {} });
  const W = 1920, H = 1080, DUR = 19;

  // ---------- helpers ----------
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  const sstep = (a, b, x) => { x = clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
  const fract = (x) => x - Math.floor(x);
  function hex(c) {
    if (c[0] === 'r') return c.slice(4, -1).split(',').map(Number);
    const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mixc(a, b, k) {
    const A = hex(a), B = hex(b);
    k = clamp(k, 0, 1);
    return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * k) + ',' + Math.round(A[1] + (B[1] - A[1]) * k) + ',' +
      Math.round(A[2] + (B[2] - A[2]) * k) + ')';
  }
  function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; }
  function glowSprite(r, g, b, size, core) {
    const c = mk(size, size), x = c.getContext('2d'), h = size / 2;
    const gr = x.createRadialGradient(h, h, 0, h, h, h);
    gr.addColorStop(0, core || `rgba(${r},${g},${b},1)`);
    gr.addColorStop(0.18, `rgba(${r},${g},${b},0.6)`);
    gr.addColorStop(0.45, `rgba(${r},${g},${b},0.18)`);
    gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
    x.fillStyle = gr; x.fillRect(0, 0, size, size);
    return c;
  }
  function starSprite(size) {
    const c = mk(size, size), x = c.getContext('2d'), h = size / 2;
    let gr = x.createRadialGradient(h, h, 0, h, h, h * 0.35);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(210,230,255,0)');
    x.fillStyle = gr; x.fillRect(0, 0, size, size);
    for (const hor of [true, false]) {
      gr = hor ? x.createLinearGradient(0, 0, size, 0) : x.createLinearGradient(0, 0, 0, size);
      gr.addColorStop(0, 'rgba(210,230,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(210,230,255,0)');
      x.fillStyle = gr;
      if (hor) x.fillRect(0, h - 0.8, size, 1.6); else x.fillRect(h - 0.8, 0, 1.6, size);
    }
    return c;
  }

  // ---------- world layout (world units; the wide shot is 1920x1080) ----------
  const TX0 = 430, TY0 = 225, TW = 1060, TH = 680, TS = 2.6;       // temple cache
  const CX0 = -80, CY0 = 540, CW = 2080, CH = 660, CS = 1.5;         // city cache
  const SX0 = -200, SY0 = -200, SW = 2320, SH = 1400;                // sky cache
  const LAMPS = [712, 812, 1108, 1208], LAMP_BASE = 598, BOWL_Y = 404;
  const BOWL_OFF = [-21, -7, 7, 21];
  const GOLD = (g, x0, x1) => {
    const gr = g.createLinearGradient(x0, 0, x1, 0);
    gr.addColorStop(0, '#6b4716'); gr.addColorStop(0.3, '#ffe08a'); gr.addColorStop(0.6, '#c08e34'); gr.addColorStop(1, '#4e3210');
    return gr;
  };

  const st = { ready: false };

  // ---------- silhouettes (men only, tiny, no faces) ----------
  function figure(g, x, y, h, tilt, instr) {
    g.save();
    g.translate(x, y); g.rotate(tilt || 0);
    g.beginPath();
    g.moveTo(-h * 0.19, 0);
    g.lineTo(-h * 0.15, -h * 0.72);
    g.quadraticCurveTo(0, -h * 0.84, h * 0.15, -h * 0.72);
    g.lineTo(h * 0.19, 0);
    g.closePath(); g.fill();
    g.beginPath(); g.arc(0, -h * 0.88, h * 0.1, 0, Math.PI * 2); g.fill();
    if (instr === 1) { // lyre / harp
      g.lineWidth = h * 0.05; g.strokeStyle = g.fillStyle;
      g.beginPath(); g.moveTo(h * 0.14, -h * 0.35); g.lineTo(h * 0.36, -h * 0.78); g.lineTo(h * 0.44, -h * 0.34); g.closePath(); g.stroke();
    } else if (instr === 2) { // trumpet
      g.lineWidth = h * 0.05; g.strokeStyle = g.fillStyle;
      g.beginPath(); g.moveTo(h * 0.05, -h * 0.8); g.lineTo(h * 0.55, -h * 1.05); g.stroke();
    }
    g.restore();
  }

  // ---------- the Temple (cached) ----------
  function drawTemple(g, rng) {
    g.save(); g.scale(TS, TS); g.translate(-TX0, -TY0);
    let gr;

    // Temple Mount surface
    gr = g.createLinearGradient(0, 530, 0, 632);
    gr.addColorStop(0, '#2b2233'); gr.addColorStop(0.55, '#6a4e3c'); gr.addColorStop(1, '#a47c50');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(466, 534); g.lineTo(1454, 534); g.lineTo(1470, 632); g.lineTo(450, 632); g.closePath(); g.fill();

    // stoas (colonnades) on both sides
    for (const [x0, x1] of [[470, 648], [1272, 1450]]) {
      g.fillStyle = '#20161d'; g.fillRect(x0, 572, x1 - x0, 50);
      for (let x = x0 + 3; x < x1 - 4; x += 8) {
        const dc = Math.abs(x - 960);
        const lit = clamp(1.2 - dc / 520, 0.25, 1);
        gr = g.createLinearGradient(x, 0, x + 4, 0);
        gr.addColorStop(0, mixc('#6a5448', '#f4d9a2', lit)); gr.addColorStop(0.5, mixc('#4a3a38', '#c49a64', lit)); gr.addColorStop(1, '#3a2a28');
        g.fillStyle = gr; g.fillRect(x, 574, 4, 48);
        g.fillStyle = mixc('#5a4a40', '#e2b45c', lit); g.fillRect(x - 0.6, 573, 5.2, 1.6);
      }
      gr = g.createLinearGradient(0, 560, 0, 574);
      gr.addColorStop(0, '#4d4048'); gr.addColorStop(1, '#b8966c');
      g.fillStyle = gr; g.fillRect(x0 - 3, 561, x1 - x0 + 6, 12);
      g.fillStyle = '#d8ab52'; g.fillRect(x0 - 3, 571, x1 - x0 + 6, 1.2);
      g.fillStyle = '#3a2f3a'; g.fillRect(x0 - 1, 557, x1 - x0 + 2, 4);
    }

    // ---- Heichal: side depth face
    // facade
    gr = g.createLinearGradient(0, 250, 0, 500);
    gr.addColorStop(0, '#7a7090'); gr.addColorStop(0.3, '#b3a08f'); gr.addColorStop(0.7, '#dcbd8c'); gr.addColorStop(1, '#ecca92');
    g.fillStyle = gr; g.fillRect(840, 250, 240, 250);
    // soft horizontal lighting: centre brighter
    gr = g.createLinearGradient(840, 0, 1080, 0);
    gr.addColorStop(0, 'rgba(40,30,60,0.28)'); gr.addColorStop(0.5, 'rgba(40,30,60,0)'); gr.addColorStop(1, 'rgba(40,30,60,0.32)');
    g.fillStyle = gr; g.fillRect(840, 250, 240, 250);
    // stone courses
    g.strokeStyle = 'rgba(95,65,50,0.2)'; g.lineWidth = 0.35;
    g.beginPath();
    let row = 0;
    for (let y = 268; y < 500; y += 6.5, row++) {
      g.moveTo(840, y); g.lineTo(1080, y);
      for (let x = 840 + (row % 2 ? 9 : 0); x < 1080; x += 18) { g.moveTo(x, y); g.lineTo(x, y + 6.5); }
    }
    g.stroke();
    // pilasters
    for (const px of [848, 888, 1018, 1058]) {
      gr = g.createLinearGradient(px, 0, px + 14, 0);
      gr.addColorStop(0, '#fff0cc'); gr.addColorStop(0.45, '#e6cc9c'); gr.addColorStop(1, '#9a7e66');
      g.fillStyle = gr; g.fillRect(px, 276, 14, 224);
      g.fillStyle = GOLD(g, px - 2, px + 16); g.fillRect(px - 2, 268, 18, 8);
      g.fillStyle = 'rgba(70,40,20,0.5)'; g.fillRect(px - 2, 275, 18, 0.8);
      g.fillStyle = GOLD(g, px - 1, px + 15); g.fillRect(px - 1, 494, 16, 6);
    }
    // cornice + dentils + golden spikes
    gr = g.createLinearGradient(0, 248, 0, 268);
    gr.addColorStop(0, '#fff0b0'); gr.addColorStop(0.25, '#d9a445'); gr.addColorStop(0.5, '#7a5520');
    gr.addColorStop(0.7, '#e8c070'); gr.addColorStop(1, '#8a6228');
    g.fillStyle = gr; g.fillRect(834, 249, 252, 12);
    g.fillStyle = '#b89872'; g.fillRect(838, 261, 244, 6);
    g.fillStyle = 'rgba(60,40,40,0.55)';
    for (let x = 840; x < 1080; x += 4) g.fillRect(x, 262, 2, 3.5);
    g.fillStyle = '#e0ae4c'; g.fillRect(838, 266.5, 244, 1.2);
    g.fillStyle = '#f3c963';
    g.beginPath();
    for (let x = 836; x < 1084; x += 3.3) { g.moveTo(x, 249.5); g.lineTo(x + 0.8, 242.5); g.lineTo(x + 1.6, 249.5); }
    g.fill();
    // gold rosette band
    g.fillStyle = '#e8b851';
    for (let x = 846; x < 1076; x += 7) { g.beginPath(); g.arc(x, 285, 1.5, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = 'rgba(120,80,30,0.6)'; g.fillRect(840, 281, 240, 0.6); g.fillRect(840, 288.5, 240, 0.6);

    // entrance of the Ulam (no doors)
    g.fillStyle = GOLD(g, 915, 1005); g.fillRect(915, 302, 90, 7);
    g.fillStyle = GOLD(g, 919, 1001); g.fillRect(919, 309, 82, 9);
    g.fillStyle = 'rgba(60,35,15,0.6)'; g.fillRect(915, 308.6, 90, 0.7); g.fillRect(919, 317.6, 82, 0.7);
    g.fillStyle = GOLD(g, 921, 999); g.fillRect(921, 318, 78, 182);
    gr = g.createLinearGradient(0, 322, 0, 500);
    gr.addColorStop(0, '#120a10'); gr.addColorStop(0.6, '#2a1712'); gr.addColorStop(1, '#4a2a16');
    g.fillStyle = gr; g.fillRect(925, 322, 70, 178);
    // the golden doorway of the Heichal glimpsed within
    gr = g.createRadialGradient(960, 450, 4, 960, 440, 70);
    gr.addColorStop(0, '#e2aa4c'); gr.addColorStop(0.5, '#8a5a22'); gr.addColorStop(1, '#3a2010');
    g.fillStyle = gr; g.fillRect(942, 378, 36, 122);
    g.fillStyle = 'rgba(40,20,10,0.6)'; g.fillRect(959.5, 378, 1, 122);
    g.strokeStyle = 'rgba(255,215,130,0.55)'; g.lineWidth = 0.6;
    g.strokeRect(945, 384, 12, 112); g.strokeRect(963, 384, 12, 112);
    // golden vine with grape clusters above the inner doorway
    g.strokeStyle = '#e9b24a'; g.lineWidth = 1.2;
    g.beginPath();
    for (let x = 929; x <= 991; x += 1) { const y = 366 + Math.sin(x * 0.35) * 2.2; if (x === 929) g.moveTo(x, y); else g.lineTo(x, y); }
    g.stroke();
    g.fillStyle = '#f2c35a';
    for (let x = 932; x < 990; x += 7.5) {
      for (let k = 0; k < 6; k++) {
        const cx = x + (k % 2 ? 1 : -1) * (k < 2 ? 1.4 : k < 4 ? 0.9 : 0.3), cy = 369 + (k >> 1) * 1.8 + Math.sin(x * 0.35) * 2.2;
        g.beginPath(); g.arc(cx, cy, 0.95, 0, Math.PI * 2); g.fill();
      }
      g.beginPath(); g.ellipse(x + 3.5, 363.5 + Math.sin((x + 3.5) * 0.35) * 2.2, 2.2, 1.2, -0.5, 0, Math.PI * 2); g.fill();
    }

    // ---- the altar (unhewn white stone), behind the inner wall
    const tiers = [[994, 1082, 488, 512], [998, 1078, 474, 488], [1002, 1074, 462, 474]];
    for (const [a, b, y0, y1] of tiers) {
      gr = g.createLinearGradient(0, y0, 0, y1);
      gr.addColorStop(0, '#d9c2a0'); gr.addColorStop(1, '#8f7258');
      g.fillStyle = gr; g.fillRect(a, y0, b - a, y1 - y0);
      g.fillStyle = 'rgba(80,50,40,0.35)'; g.fillRect(a, y1 - 0.8, b - a, 0.8);
      g.fillStyle = 'rgba(70,50,60,0.3)'; g.fillRect(b - 6, y0, 6, y1 - y0);
    }
    g.fillStyle = '#9a2e22'; g.fillRect(998, 487.2, 80, 1.1); // the red line
    g.fillStyle = '#e2cfae';
    for (const hx of [1002, 1069]) g.fillRect(hx, 456.5, 5, 6);
    g.fillStyle = '#d2bc9a';
    for (const hx of [1008, 1063]) g.fillRect(hx, 457.5, 4, 4.5);
    // two silver bowls on the south-west corner
    for (const bx of [1008, 1016]) {
      gr = g.createLinearGradient(bx - 3, 0, bx + 3, 0);
      gr.addColorStop(0, '#6f7c90'); gr.addColorStop(0.4, '#f4f8ff'); gr.addColorStop(1, '#8290a8');
      g.fillStyle = gr; g.beginPath(); g.ellipse(bx, 461, 3.2, 2.4, 0, 0, Math.PI); g.fill();
      g.fillStyle = '#e8eef8'; g.fillRect(bx - 3.2, 460.4, 6.4, 0.7);
    }

    // ---- inner wall (Court of Israel) with the Nikanor gate
    gr = g.createLinearGradient(0, 504, 0, 548);
    gr.addColorStop(0, '#a88c70'); gr.addColorStop(0.45, '#e6c996'); gr.addColorStop(1, '#f7d8a0');
    g.fillStyle = gr; g.fillRect(650, 505, 620, 43);
    gr = g.createLinearGradient(650, 0, 1270, 0);
    gr.addColorStop(0, 'rgba(30,20,40,0.45)'); gr.addColorStop(0.35, 'rgba(30,20,40,0)');
    gr.addColorStop(0.65, 'rgba(30,20,40,0)'); gr.addColorStop(1, 'rgba(30,20,40,0.45)');
    g.fillStyle = gr; g.fillRect(650, 505, 620, 43);
    g.fillStyle = '#e4b75a'; g.fillRect(647, 502.5, 626, 2.4);
    g.fillStyle = 'rgba(60,40,30,0.4)'; g.fillRect(647, 504.9, 626, 1);
    g.fillStyle = '#3b2518';
    for (let x = 664; x < 1262; x += 30) {
      if (Math.abs(x + 4 - 960) < 64) continue;
      g.beginPath(); g.moveTo(x, 536); g.lineTo(x, 522); g.arc(x + 4, 522, 4, Math.PI, 0); g.lineTo(x + 8, 536); g.closePath(); g.fill();
    }
    g.strokeStyle = 'rgba(95,65,45,0.18)'; g.lineWidth = 0.35; g.beginPath();
    for (let y = 512; y < 548; y += 6) { g.moveTo(650, y); g.lineTo(1270, y); }
    g.stroke();
    // gate tower
    gr = g.createLinearGradient(0, 486, 0, 548);
    gr.addColorStop(0, '#d2b690'); gr.addColorStop(1, '#fbe0ae');
    g.fillStyle = gr; g.fillRect(916, 487, 88, 61);
    g.fillStyle = GOLD(g, 912, 1008); g.fillRect(912, 483.5, 96, 4);
    g.fillStyle = 'rgba(60,40,30,0.5)'; g.fillRect(912, 487.3, 96, 0.8);
    gr = g.createRadialGradient(960, 546, 2, 960, 530, 40);
    gr.addColorStop(0, '#ffe2a0'); gr.addColorStop(0.45, '#d08a3a'); gr.addColorStop(1, '#4a2612');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(938, 548); g.lineTo(938, 514); g.arc(960, 514, 22, Math.PI, 0); g.lineTo(982, 548); g.closePath(); g.fill();
    g.strokeStyle = '#e8b650'; g.lineWidth = 1.3; g.stroke();
    g.fillStyle = '#b8733a'; g.fillRect(932, 512, 5, 36); g.fillRect(983, 512, 5, 36); // bronze doors, open

    // ---- Women's Courtyard floor
    gr = g.createLinearGradient(0, 546, 0, 602);
    gr.addColorStop(0, '#a47a48'); gr.addColorStop(0.5, '#dcae68'); gr.addColorStop(1, '#b0824c');
    g.fillStyle = gr; g.fillRect(630, 547, 660, 55);
    g.strokeStyle = 'rgba(90,55,30,0.22)'; g.lineWidth = 0.4; g.beginPath();
    for (const y of [552, 558, 565, 573, 582, 592]) { g.moveTo(630, y); g.lineTo(1290, y); }
    for (let x = 640; x < 1290; x += 26) { g.moveTo(960 + (x - 960) * 0.85, 548); g.lineTo(960 + (x - 960) * 1.1, 602); }
    g.stroke();
    // corner chambers of the courtyard
    for (const [x0, x1] of [[626, 694], [1226, 1294]]) {
      gr = g.createLinearGradient(0, 528, 0, 600);
      gr.addColorStop(0, '#9c7c62'); gr.addColorStop(1, '#e4c08a');
      g.fillStyle = gr; g.fillRect(x0, 528, x1 - x0, 72);
      g.fillStyle = '#5a4442'; g.fillRect(x0 - 2, 523, x1 - x0 + 4, 5);
      g.fillStyle = '#dcae55'; g.fillRect(x0 - 2, 527.5, x1 - x0 + 4, 1);
      g.fillStyle = '#3a2418';
      for (let k = 0; k < 3; k++) {
        const wx = x0 + 12 + k * 20;
        g.beginPath(); g.moveTo(wx, 552); g.lineTo(wx, 542); g.arc(wx + 3, 542, 3, Math.PI, 0); g.lineTo(wx + 6, 552); g.closePath(); g.fill();
      }
    }

    // ---- the fifteen semicircular steps
    for (let i = 14; i >= 0; i--) {
      const y = 548 + i * 1.85, hw = 44 + i * 3.4, ry = 3 + i * 0.35;
      g.fillStyle = mixc('#7e5c40', '#a67a50', i / 14);
      g.beginPath(); g.ellipse(960, y + 1.5, hw, ry, 0, 0, Math.PI); g.closePath(); g.fill();
      gr = g.createLinearGradient(0, y, 0, y + ry);
      gr.addColorStop(0, '#fbe3b0'); gr.addColorStop(1, '#dcb47a');
      g.fillStyle = gr;
      g.beginPath(); g.ellipse(960, y, hw, ry, 0, 0, Math.PI); g.closePath(); g.fill();
    }
    // Levites with instruments on the steps (tiny silhouettes)
    g.fillStyle = 'rgba(28,16,22,0.92)';
    for (let k = 0; k < 14; k++) {
      const side = k % 2 ? 1 : -1, j = k >> 1;
      const i = 2 + j * 2;
      const y = 548 + i * 1.85 + 1.2, hw = 44 + i * 3.4;
      const x = 960 + side * (26 + ((j * 37) % 5) * 0.2 * (hw - 34));
      figure(g, x, y, 9.5 + rng() * 1.2, (rng() - 0.5) * 0.08, 1 + (k % 3 === 2 ? 1 : 0));
    }

    // ---- the four great golden lamp stands
    for (const lx of LAMPS) {
      // ladder leaning on the stand
      g.strokeStyle = '#5a3a22'; g.lineWidth = 0.9;
      g.beginPath();
      g.moveTo(lx + 22, 598); g.lineTo(lx + 10, 414); g.moveTo(lx + 28, 598); g.lineTo(lx + 16, 414);
      for (let k = 0; k < 20; k++) {
        const u = (k + 0.5) / 20, y = 598 - u * 184;
        g.moveTo(lx + 22 - u * 12, y); g.lineTo(lx + 28 - u * 12, y);
      }
      g.stroke();
      g.strokeStyle = 'rgba(255,200,120,0.35)'; g.lineWidth = 0.4;
      g.beginPath(); g.moveTo(lx + 21.6, 598); g.lineTo(lx + 9.6, 414); g.stroke();
      // tripod base
      g.fillStyle = GOLD(g, lx - 15, lx + 15);
      g.beginPath(); g.moveTo(lx - 15, 599); g.quadraticCurveTo(lx - 5, 592, lx - 3, 582); g.lineTo(lx + 3, 582);
      g.quadraticCurveTo(lx + 5, 592, lx + 15, 599); g.closePath(); g.fill();
      // shaft
      g.fillStyle = GOLD(g, lx - 2.6, lx + 2.6);
      g.beginPath(); g.moveTo(lx - 2.6, 584); g.lineTo(lx - 1.8, 412); g.lineTo(lx + 1.8, 412); g.lineTo(lx + 2.6, 584); g.closePath(); g.fill();
      for (let y = 560; y > 420; y -= 28) {
        g.fillStyle = GOLD(g, lx - 4.2, lx + 4.2);
        g.beginPath(); g.ellipse(lx, y, 4.2, 1.9, 0, 0, Math.PI * 2); g.fill();
      }
      // cross arms and four bowls
      g.strokeStyle = GOLD(g, lx - 24, lx + 24); g.lineWidth = 1.8;
      g.beginPath();
      g.moveTo(lx - 21, 406); g.quadraticCurveTo(lx - 20, 414, lx, 415); g.quadraticCurveTo(lx + 20, 414, lx + 21, 406);
      g.moveTo(lx - 7, 406); g.lineTo(lx - 6, 414); g.moveTo(lx + 7, 406); g.lineTo(lx + 6, 414);
      g.stroke();
      for (const o of BOWL_OFF) {
        g.fillStyle = GOLD(g, lx + o - 5, lx + o + 5);
        g.beginPath(); g.ellipse(lx + o, BOWL_Y, 5, 3.4, 0, 0, Math.PI); g.closePath(); g.fill();
      }
    }

    // ---- front wall of the Women's Courtyard, eastern gate
    gr = g.createLinearGradient(0, 600, 0, 620);
    gr.addColorStop(0, '#e6c28a'); gr.addColorStop(1, '#8e6a48');
    g.fillStyle = gr; g.fillRect(620, 600, 680, 20);
    g.fillStyle = '#d8aa54'; g.fillRect(618, 599, 684, 1.4);
    gr = g.createLinearGradient(0, 588, 0, 620);
    gr.addColorStop(0, '#e2c490'); gr.addColorStop(1, '#9a7450');
    g.fillStyle = gr; g.fillRect(924, 589, 72, 31);
    g.fillStyle = GOLD(g, 921, 999); g.fillRect(921, 586.5, 78, 3);
    gr = g.createLinearGradient(0, 598, 0, 620);
    gr.addColorStop(0, '#ffd08a'); gr.addColorStop(1, '#6a3a18');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(946, 620); g.lineTo(946, 604); g.arc(960, 604, 14, Math.PI, 0); g.lineTo(974, 620); g.closePath(); g.fill();

    // ---- great retaining wall of the Temple Mount (Herodian ashlars)
    g.fillStyle = '#2a2130'; g.beginPath(); g.moveTo(1470, 626); g.lineTo(1492, 634); g.lineTo(1492, 900); g.lineTo(1470, 900); g.closePath(); g.fill();
    g.fillStyle = '#231b2a'; g.beginPath(); g.moveTo(450, 626); g.lineTo(436, 634); g.lineTo(436, 900); g.lineTo(450, 900); g.closePath(); g.fill();
    for (let y = 632; y < 900; y += 11) {
      const k = Math.pow(clamp((y - 632) / 230, 0, 1), 0.75);
      let x = 450 - rng() * 50;
      while (x < 1470) {
        const w = 26 + rng() * 52;
        const x0 = Math.max(x, 450), x1 = Math.min(x + w, 1470);
        const dc = Math.abs((x0 + x1) / 2 - 960) / 520;
        const kk = clamp(k + dc * 0.35 + (rng() - 0.5) * 0.08, 0, 1);
        g.fillStyle = mixc('#7a5a40', '#141019', kk); g.fillRect(x0, y, x1 - x0, 11);
        g.fillStyle = mixc('#caa272', '#241d2a', kk); g.fillRect(x0 + 1.3, y + 1.3, x1 - x0 - 2.6, 8.4);
        g.fillStyle = `rgba(255,220,160,${(0.28 * (1 - kk)).toFixed(3)})`; g.fillRect(x0 + 1.3, y + 1.3, x1 - x0 - 2.6, 0.6);
        x += w;
      }
    }
    gr = g.createLinearGradient(0, 624, 0, 634);
    gr.addColorStop(0, '#e8c690'); gr.addColorStop(1, '#8a6848');
    g.fillStyle = gr; g.fillRect(446, 624, 1028, 9);
    g.restore();
  }

  // ---------- the city of Jerusalem (cached, dark + lit versions) ----------
  function contour(x) { const d = Math.abs(x - 960); return 800 - 225 * sstep(520, 900, d) + 10 * Math.sin(x * 0.011); }
  function genCity(rng) {
    const houses = [], wins = [], trees = [];
    for (let y = 572; y < 1200; y += 15 + rng() * 6) {
      let x = CX0 + rng() * 30;
      const sc = 0.78 + (y - 580) / 850;
      while (x < CX0 + CW) {
        const w = (24 + rng() * 42) * sc;
        if (y > contour(x + w / 2) + 6 && rng() > 0.06) {
          const h = (13 + rng() * 18) * sc;
          const cx = x + w / 2;
          const dist = Math.hypot(cx - 960, (y - 470) * 1.35);
          const lf = Math.pow(clamp(1.3 - dist / 1300, 0, 1), 1.1) * (1 - 0.8 * sstep(840, 1080, y));
          const hs = { x, y, w, h, d: (3 + rng() * 4) * sc * (cx < 960 ? 1 : -1), tone: rng(), lf, par: rng() < 0.4 };
          houses.push(hs);
          const nw = w > 30 * sc ? 1 + Math.floor(rng() * 2.6) : (rng() < 0.6 ? 1 : 0);
          for (let k = 0; k < nw; k++) {
            const ww = 3 * sc, wh = 4.2 * sc;
            const wx = x + (k + 0.5) * w / nw - ww / 2 + (rng() - 0.5) * 3;
            const wy = y - h * (0.55 + rng() * 0.25);
            const on = rng() < 0.62 - 0.35 * sstep(900, 1100, y);
            wins.push({ x: wx, y: wy, w: ww, h: wh, on, ph: rng() * 6.28, sp: 0.6 + rng() * 1.8, b: 0.55 + rng() * 0.45, glow: rng() < 0.3 });
          }
          if (rng() < 0.025) trees.push({ x: x + rng() * w, y: y - h * 0.2, s: (7 + rng() * 6) * sc, lf });
        }
        x += w + (rng() < 0.18 ? 5 + rng() * 22 : 0.6);
      }
    }
    return { houses, wins, trees };
  }
  function drawCity(g, city, lit) {
    g.save(); g.scale(CS, CS); g.translate(-CX0, -CY0);
    // ground
    const gr = g.createLinearGradient(0, 560, 0, 1200);
    if (lit) { gr.addColorStop(0, '#5a3a26'); gr.addColorStop(0.5, '#3a2620'); gr.addColorStop(1, '#120d14'); }
    else { gr.addColorStop(0, '#191828'); gr.addColorStop(1, '#0a0a14'); }
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(CX0, CY0 + CH);
    for (let x = CX0; x <= CX0 + CW; x += 20) g.lineTo(x, contour(x) + 4);
    g.lineTo(CX0 + CW, CY0 + CH); g.closePath(); g.fill();

    let ti = 0;
    for (const hs of city.houses) {
      while (ti < city.trees.length && city.trees[ti].y < hs.y - 10) {
        const tr = city.trees[ti++];
        g.fillStyle = lit ? mixc('#161a1c', '#3a3a1e', tr.lf) : '#141a22';
        g.beginPath(); g.ellipse(tr.x, tr.y - tr.s, tr.s * 0.28, tr.s, 0, 0, Math.PI * 2); g.fill();
      }
      const { x, y, w, h, d, tone } = hs;
      const k = lit ? hs.lf : 0;
      const front = mixc(mixc('#262742', '#363856', tone), mixc('#8e6036', '#b07c48', tone), k);
      const roof = mixc(mixc('#474a70', '#55587e', tone), '#f0c078', k);
      const side = mixc('#1d1d31', '#6a4428', k);
      const dy = Math.abs(d) * 0.55;
      // side face (facing the Temple)
      g.fillStyle = side;
      g.beginPath();
      if (d > 0) { g.moveTo(x + w, y); g.lineTo(x + w, y - h); g.lineTo(x + w + d, y - h - dy); g.lineTo(x + w + d, y - dy); }
      else { g.moveTo(x, y); g.lineTo(x, y - h); g.lineTo(x + d, y - h - dy); g.lineTo(x + d, y - dy); }
      g.closePath(); g.fill();
      // front
      g.fillStyle = front; g.fillRect(x, y - h, w, h);
      // flat roof
      g.fillStyle = roof;
      g.beginPath(); g.moveTo(x, y - h); g.lineTo(x + w, y - h); g.lineTo(x + w + d, y - h - dy); g.lineTo(x + d, y - h - dy); g.closePath(); g.fill();
      if (hs.par) { g.fillStyle = front; g.fillRect(x, y - h - 1.4, w, 1.4); }
      if (tone > 0.72 && w > 34) { // upper room on the roof
        const ux = x + w * 0.35 + d * 0.5, uw = w * 0.42, uh = h * 0.42, uy = y - h - dy * 0.5;
        g.fillStyle = front; g.fillRect(ux, uy - uh, uw, uh);
        g.fillStyle = roof;
        g.beginPath(); g.moveTo(ux, uy - uh); g.lineTo(ux + uw, uy - uh); g.lineTo(ux + uw + d * 0.6, uy - uh - dy * 0.6); g.lineTo(ux + d * 0.6, uy - uh - dy * 0.6); g.closePath(); g.fill();
        g.fillStyle = lit ? 'rgba(60,34,20,0.8)' : 'rgba(10,10,18,0.85)';
        g.beginPath(); g.moveTo(ux + uw * 0.4, uy); g.lineTo(ux + uw * 0.4, uy - uh * 0.45); g.arc(ux + uw * 0.5, uy - uh * 0.45, uw * 0.1, Math.PI, 0); g.lineTo(ux + uw * 0.6, uy); g.closePath(); g.fill();
      }
      // warm top edge on lit walls
      if (lit && k > 0.05) { g.fillStyle = `rgba(255,214,150,${(0.5 * k).toFixed(3)})`; g.fillRect(x, y - h, w, 0.9); }
    }
    // unlit windows
    g.fillStyle = lit ? 'rgba(40,24,18,0.8)' : 'rgba(10,10,18,0.85)';
    for (const wn of city.wins) if (!wn.on) g.fillRect(wn.x, wn.y, wn.w, wn.h);
    g.restore();
  }

  // ---------- sky ----------
  function drawSky(g, rng) {
    g.save(); g.translate(-SX0, -SY0);
    const gr = g.createLinearGradient(0, SY0, 0, SY0 + SH);
    gr.addColorStop(0, '#03041a'); gr.addColorStop(0.35, '#0a0d30'); gr.addColorStop(0.55, '#1a1840');
    gr.addColorStop(0.68, '#3a2640'); gr.addColorStop(0.8, '#1a1428'); gr.addColorStop(1, '#0a0812');
    g.fillStyle = gr; g.fillRect(SX0, SY0, SW, SH);
    for (let i = 0; i < 900; i++) {
      const x = SX0 + rng() * SW, y = SY0 + Math.pow(rng(), 1.4) * 800;
      const a = (0.25 + rng() * 0.75) * (1 - sstep(300, 560, y));
      const s = rng() < 0.06 ? 2.2 : rng() < 0.3 ? 1.5 : 1;
      g.fillStyle = `rgba(${220 + rng() * 35 | 0},${225 + rng() * 30 | 0},255,${a.toFixed(3)})`;
      g.fillRect(x, y, s, s);
    }
    // full moon of the 15th of Tishrei
    const mx = 330, my = 150;
    let hg = g.createRadialGradient(mx, my, 20, mx, my, 300);
    hg.addColorStop(0, 'rgba(190,200,240,0.28)'); hg.addColorStop(0.3, 'rgba(150,160,220,0.08)'); hg.addColorStop(1, 'rgba(150,160,220,0)');
    g.fillStyle = hg; g.fillRect(mx - 300, my - 300, 600, 600);
    hg = g.createRadialGradient(mx - 8, my - 8, 4, mx, my, 34);
    hg.addColorStop(0, '#fffaf0'); hg.addColorStop(0.8, '#ece2c6'); hg.addColorStop(1, '#cfc2a2');
    g.fillStyle = hg; g.beginPath(); g.arc(mx, my, 34, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(150,140,125,0.22)';
    for (const [dx, dy, rx, ry] of [[-10, -8, 11, 8], [8, -2, 8, 10], [-4, 12, 9, 6], [14, 14, 5, 4]]) {
      g.beginPath(); g.ellipse(mx + dx, my + dy, rx, ry, 0.4, 0, Math.PI * 2); g.fill();
    }
    g.restore();
  }

  // ---------- init ----------
  function init() {
    if (st.ready) return;
    const rng = mulberry32(0x5A1C0705);
    st.sky = mk(SW, SH); drawSky(st.sky.getContext('2d'), rng);
    st.temple = mk(TW * TS, TH * TS); drawTemple(st.temple.getContext('2d'), rng);
    st.city = genCity(rng);
    st.cityDark = mk(CW * CS, CH * CS); drawCity(st.cityDark.getContext('2d'), st.city, false);
    st.cityLit = mk(CW * CS, CH * CS); drawCity(st.cityLit.getContext('2d'), st.city, true);
    st.glowWarm = glowSprite(255, 170, 80, 128);
    st.glowHot = glowSprite(255, 215, 150, 64, 'rgba(255,250,230,1)');
    st.glowSilver = glowSprite(190, 215, 255, 64, 'rgba(255,255,255,1)');
    st.smoke = glowSprite(190, 140, 105, 64);
    st.star = starSprite(48);
    st.dome = mk(256, 256);
    {
      const d = st.dome.getContext('2d'), gr = d.createRadialGradient(128, 128, 0, 128, 128, 128);
      gr.addColorStop(0, 'rgba(255,150,60,0.7)'); gr.addColorStop(0.35, 'rgba(200,90,50,0.26)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = gr; d.fillRect(0, 0, 256, 256);
    }

    // sparks
    st.sparks = [];
    for (let i = 0; i < 210; i++) {
      const li = i % 4;
      st.sparks.push({
        x: LAMPS[li] + BOWL_OFF[(rng() * 4) | 0] + (rng() - 0.5) * 8, per: 2.4 + rng() * 3, off: rng() * 10,
        v: 35 + rng() * 55, sway: 4 + rng() * 14, f: 1 + rng() * 2.5, ph: rng() * 6.28, s: 2.2 + rng() * 4, drift: -10 + rng() * 40,
      });
    }
    // glitter on the water stream
    st.glit = [];
    for (let i = 0; i < 60; i++) st.glit.push({ o: rng(), ph: rng() * 6.28, f: 4 + rng() * 6, j: (rng() - 0.5) * 3.2, s: 3 + rng() * 5 });
    // flame seeds
    st.fseed = [];
    for (let i = 0; i < 16; i++) st.fseed.push(rng() * 100);

    // grain tiles
    st.grain = [];
    for (let k = 0; k < 4; k++) {
      const c = mk(256, 256), x = c.getContext('2d'), id = x.createImageData(256, 256);
      for (let p = 0; p < id.data.length; p += 4) {
        const v = rng();
        id.data[p] = id.data[p + 1] = id.data[p + 2] = v < 0.5 ? 0 : 255; id.data[p + 3] = (Math.abs(v - 0.5) * 2 * 30) | 0;
      }
      x.putImageData(id, 0, 0);
      st.grain.push(c);
    }
    // vignette + calm bottom band
    st.vig = mk(W, H);
    const v = st.vig.getContext('2d');
    let gr = v.createRadialGradient(W / 2, H * 0.44, 380, W / 2, H * 0.5, 1250);
    gr.addColorStop(0, 'rgba(4,3,14,0)'); gr.addColorStop(0.6, 'rgba(4,3,14,0.35)'); gr.addColorStop(1, 'rgba(4,3,14,0.85)');
    v.fillStyle = gr; v.fillRect(0, 0, W, H);
    gr = v.createLinearGradient(0, H * 0.62, 0, H);
    gr.addColorStop(0, 'rgba(6,4,14,0)'); gr.addColorStop(0.4, 'rgba(6,4,14,0.45)'); gr.addColorStop(1, 'rgba(6,4,14,0.8)');
    v.fillStyle = gr; v.fillRect(0, H * 0.66, W, H * 0.34);
    st.ready = true;
  }

  // ---------- per-frame pieces ----------
  function camAt(t) {
    const u = clamp(t / DUR, 0, 1);
    const s = u * u * u * (u * (u * 6 - 15) + 10);
    const e = 0.14 * u + 0.86 * s;
    return { z: Math.exp(Math.log(2.7) * e), x: 960 + 46 * e, y: 560 - 118 * e };
  }
  function layer(ctx, cam, k) {
    const z = 1 + (cam.z - 1) * k;
    ctx.translate(960 - cam.x * z, 540 - cam.y * z);
    ctx.scale(z, z);
    return z;
  }
  function flick(t, s) { return 1 + 0.07 * Math.sin(t * 6.3 + s) + 0.05 * Math.sin(t * 10.7 + s * 2.1) + 0.03 * Math.sin(t * 17.9 + s * 3.3); }

  const FL_LAYERS = [[1.12, 'rgba(255,70,15,0.25)'], [1, 'rgba(255,95,20,0.45)'], [0.74, 'rgba(255,160,45,0.7)'], [0.5, 'rgba(255,220,130,0.85)'], [0.28, 'rgba(255,250,220,0.9)']];
  function flame(ctx, x, y, h, w, t, sd, swW) {
    const sw = swW || w;
    const N = 12;
    for (const [k, col] of FL_LAYERS) {
      const hh = h * (0.35 + 0.65 * k), ww = w * (0.45 + 0.55 * k);
      ctx.fillStyle = col;
      ctx.beginPath();
      for (let side = -1; side <= 1; side += 2) {
        for (let i = 0; i <= N; i++) {
          const s = side < 0 ? i / N : 1 - i / N;
          const sway = (Math.sin(t * 5.3 + sd + s * 3) * 0.55 + Math.sin(t * 8.7 + sd * 1.7 - s * 5) * 0.3 +
            Math.sin(t * 14.1 + sd * 2.9 - s * 7) * 0.15) * s * s * sw * 1.25;
          const half = ww * Math.pow(1 - s, 0.85) * (1 + 0.35 * Math.sin(Math.PI * s)) *
            (1 + 0.14 * Math.sin(t * 17 + sd + s * 9));
          const px = x + sway + side * half, py = y - hh * s;
          if (side < 0 && i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
      }
      ctx.closePath(); ctx.fill();
    }
  }
  function spr(ctx, img, x, y, s, a) {
    if (a <= 0.003) return;
    ctx.globalAlpha = a; ctx.drawImage(img, x - s / 2, y - s / 2, s, s);
  }

  // silver ewer, water stream geometry
  function ewerState(t) {
    const lift = 3 * sstep(7.5, 9.8, t);
    const hx = 1024, hy = 446 - lift;
    const a = -1.0 * sstep(9.6, 11.0, t);
    const ca = Math.cos(a), sa = Math.sin(a);
    const lx = -4.6, ly = -4.2;  // spout in ewer-local coords
    return { hx, hy, a, sx: hx + lx * ca - ly * sa, sy: hy + lx * sa + ly * ca };
  }
  function streamPoint(e, s, t) {
    const B = [1008.5, 459.5];
    const k1 = 0.38;
    if (s <= k1) {
      const k = s / k1;
      return [e.sx + (B[0] - e.sx) * k + Math.sin(t * 9 - k * 6) * 0.25 * k, e.sy + (B[1] - e.sy) * (0.3 * k + 0.7 * k * k)];
    }
    const k = (s - k1) / (1 - k1);
    return [1003.8 - 0.8 * k + Math.sin(k * 14 - t * 7) * 0.45, 461 + k * 45];
  }

  // ---------- draw ----------
  function draw(ctx, t) {
    if (!st.ready) init();
    const cam = camAt(t);
    const P = 0.62 + 0.38 * sstep(0, 7, t);          // lamp power, blooming
    const Fm = flick(t, 0.7);
    const cityGlow = sstep(0.3, 5.5, t);
    const pour = sstep(10.6, 12.2, t);

    ctx.save();
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#05061a'; ctx.fillRect(0, 0, W, H);

    // sky
    ctx.save(); layer(ctx, cam, 0.1);
    ctx.drawImage(st.sky, SX0, SY0, SW, SH);
    ctx.restore();

    // warm dome of light over Jerusalem (screen space)
    {
      const zc = cam.z, px = 960 + (960 - cam.x) * zc, py = 540 + (430 - cam.y) * zc;
      const r = 1150 * Math.sqrt(zc);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = clamp(0.5 * P * Fm, 0, 1);
      ctx.drawImage(st.dome, px - r, py - r * 0.75, r * 2, r * 1.5);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    // Mount of Olives behind
    ctx.save(); layer(ctx, cam, 0.72);
    {
      ctx.beginPath(); ctx.moveTo(-700, 830);
      for (let x = -700; x <= 2600; x += 40) {
        const y = 566 - 72 * Math.exp(-Math.pow((x - 1260) / 430, 2)) - 44 * Math.exp(-Math.pow((x - 520) / 380, 2)) + 7 * Math.sin(x * 0.013);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(2600, 830); ctx.closePath();
      const gr = ctx.createLinearGradient(0, 480, 0, 700);
      gr.addColorStop(0, '#1c1a36'); gr.addColorStop(1, '#0b0b18');
      ctx.fillStyle = gr; ctx.fill();
      const rg = ctx.createLinearGradient(300, 0, 1700, 0);
      rg.addColorStop(0, 'rgba(255,170,90,0)'); rg.addColorStop(0.5, `rgba(255,170,90,${(0.35 * P).toFixed(3)})`); rg.addColorStop(1, 'rgba(255,170,90,0)');
      ctx.strokeStyle = rg; ctx.lineWidth = 1.5; ctx.stroke();
    }
    ctx.restore();

    // ---- temple layer
    ctx.save(); layer(ctx, cam, 1);
    // light columns rising from the lamps
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 2; i++) {
      const f = flick(t, i * 1.9), cx = (LAMPS[i * 2] + LAMPS[i * 2 + 1]) / 2;
      ctx.globalAlpha = 0.22 * P * f;
      ctx.drawImage(st.glowWarm, cx - 110, BOWL_Y - 560, 220, 1100);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(st.temple, TX0, TY0, TW, TH);

    // dynamic golden light on the architecture
    ctx.globalCompositeOperation = 'lighter';
    {
      const gr = ctx.createRadialGradient(960, 440, 0, 960, 450, 460);
      gr.addColorStop(0, `rgba(255,185,100,${(0.15 * P * Fm).toFixed(3)})`);
      gr.addColorStop(0.45, `rgba(255,140,60,${(0.07 * P * Fm).toFixed(3)})`);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr; ctx.fillRect(480, -40, 960, 940);
    }
    // altar fire
    for (let i = 0; i < 3; i++) spr(ctx, st.glowWarm, 1030 + i * 14, 458, 44, 0.22 * flick(t, i + 7));
    ctx.globalAlpha = 1;
    for (let i = 0; i < 4; i++) flame(ctx, 1030 + i * 10, 462, 9 + 2 * Math.sin(t * 3 + i), 3.2, t, 40 + i * 3.1);
    ctx.globalCompositeOperation = 'source-over';

    // priest (silhouette) with the silver ewer on the altar
    {
      const e = ewerState(t);
      ctx.fillStyle = 'rgba(30,20,30,0.95)';
      figure(ctx, 1033, 462.2, 15, 0.03, 0);
      ctx.strokeStyle = 'rgba(30,20,30,0.95)'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(1031, 451); ctx.lineTo(e.hx + 1.5, e.hy + 1); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,245,230,0.35)'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(1030, 462); ctx.lineTo(1030.6, 451.5); ctx.stroke();
      ctx.save(); ctx.translate(e.hx, e.hy); ctx.rotate(e.a);
      const gr = ctx.createLinearGradient(-4, 0, 4, 0);
      gr.addColorStop(0, '#6a7890'); gr.addColorStop(0.35, '#f6f9ff'); gr.addColorStop(0.7, '#a8b6cc'); gr.addColorStop(1, '#56627a');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.ellipse(0, 1, 3.6, 4.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(-1.4, -5, 2.8, 3.4);
      ctx.beginPath(); ctx.moveTo(-1.4, -4.6); ctx.lineTo(-5, -4.6); ctx.lineTo(-1.4, -2.6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e8eef8'; ctx.fillRect(-2, -5.6, 4, 0.9);
      ctx.restore();
      ctx.globalCompositeOperation = 'lighter';
      spr(ctx, st.glowSilver, e.hx - 1, e.hy - 1, 10, 0.16 + 0.1 * Math.sin(t * 2.2));
      spr(ctx, st.star, e.hx - 1.5, e.hy - 1.5, 7, 0.5 * Math.pow(Math.max(0, Math.sin(t * 1.7)), 3));

      // the water libation: a stream of silver light
      if (pour > 0.001) {
        const N = 34, pts = [];
        for (let i = 0; i <= N; i++) pts.push(streamPoint(e, (i / N) * pour, t));
        const passes = [[5.4, 'rgba(30,45,90,0.5)'], [13, 'rgba(120,170,255,0.14)'], [5, 'rgba(160,200,255,0.42)'], [2.4, 'rgba(235,245,255,0.9)'], [0.9, 'rgba(255,255,255,1)']];
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (let pi = 0; pi < passes.length; pi++) {
          const [lw, col] = passes[pi];
          ctx.globalCompositeOperation = pi === 0 ? 'source-over' : 'lighter';
          ctx.strokeStyle = col; ctx.lineWidth = lw * (0.9 + 0.1 * Math.sin(t * 11));
          ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
          for (let i = 1; i <= N; i++) ctx.lineTo(pts[i][0], pts[i][1]);
          ctx.stroke();
        }
        // glitter
        for (const gl of st.glit) {
          const s = fract(gl.o + t * 0.55);
          if (s > pour) continue;
          const p = streamPoint(e, s, t);
          const tw = 0.25 + 0.75 * Math.pow(Math.max(0, Math.sin(t * gl.f + gl.ph)), 3);
          spr(ctx, st.star, p[0] + gl.j * Math.sin(t * 3 + gl.ph), p[1], gl.s, tw * 0.95);
        }
        const hp = streamPoint(e, pour, t);
        spr(ctx, st.glowSilver, 1008.5, 460, 26, 0.45 * sstep(10.9, 11.4, t) * (0.85 + 0.15 * Math.sin(t * 6)));
        spr(ctx, st.glowSilver, hp[0], hp[1], 14, 0.6);
        spr(ctx, st.glowSilver, 1003.5, 505, 24, 0.4 * sstep(11.8, 12.4, t));
        // a cool silver halo around the altar
        const gr = ctx.createRadialGradient(1010, 470, 0, 1010, 470, 110);
        gr.addColorStop(0, `rgba(170,200,255,${(0.2 * pour).toFixed(3)})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = 1; ctx.fillStyle = gr; ctx.fillRect(900, 360, 220, 220);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }

    // men dancing with torches in the courtyard
    for (let i = 0; i < 12; i++) {
      const grp = i < 6 ? 0 : 1, j = i % 6;
      const ang = t * (grp ? -0.55 : 0.55) + j * (Math.PI * 2 / 6);
      const cx = grp ? 1150 : 770;
      const x = cx + Math.cos(ang) * 40, y = 593 + Math.sin(ang) * 3 - Math.abs(Math.sin(t * 3.2 + i)) * 1.1;
      const h = 9.6 + Math.sin(ang) * 0.5;
      ctx.fillStyle = 'rgba(30,18,24,0.9)';
      figure(ctx, x, y, h, Math.sin(t * 2.4 + i) * 0.12, 0);
      const tx = x + 2.5 + Math.sin(t * 2.4 + i) * 1.5, ty = y - h * 1.12;
      ctx.strokeStyle = 'rgba(30,18,24,0.9)'; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(x + 1, y - h * 0.72); ctx.lineTo(tx, ty + 1.5); ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
      spr(ctx, st.glowWarm, tx, ty - 1.5, 16, 0.5 * flick(t, i * 2.3));
      ctx.globalAlpha = 1;
      flame(ctx, tx, ty, 4.2 * flick(t, i), 1.3, t, i * 5.7);
      ctx.globalCompositeOperation = 'source-over';
    }

    // smoke of the wicks, drifting up (lit from below)
    for (let li = 0; li < 4; li++) {
      for (let k = 0; k < 4; k++) {
        const u = fract(t / 7 + k / 4 + li * 0.13);
        const x = LAMPS[li] + Math.sin(u * 3 + li) * 18 * u + u * 50, y = BOWL_Y - 30 - u * 320;
        spr(ctx, st.smoke, x, y, 40 + u * 170, Math.sin(Math.PI * u) * 0.15 * P);
      }
    }
    ctx.globalAlpha = 1;

    // the great lamps: glow + living flames
    ctx.globalCompositeOperation = 'lighter';
    for (let li = 0; li < 4; li++) {
      const lx = LAMPS[li], f = flick(t, li * 2.7);
      if (li % 2 === 0) {
        ctx.globalAlpha = clamp(0.6 * P * f, 0, 1);
        const cx = (lx + LAMPS[li + 1]) / 2, sw = (460 + 100) * P, sh = 400 * P;
        ctx.drawImage(st.glowWarm, cx - sw / 2, BOWL_Y - 22 - sh / 2, sw, sh);
      }
      spr(ctx, st.glowHot, lx, BOWL_Y - 18, 100 * P, 0.6 * P * f);
    }
    ctx.globalAlpha = 1;
    for (let li = 0; li < 4; li++) {
      const sd0 = st.fseed[li * 4];
      ctx.globalAlpha = 0.55;
      flame(ctx, LAMPS[li], BOWL_Y + 1, (52 + 8 * Math.sin(t * 1.7 + sd0)) * (0.75 + 0.25 * P), 26, t, sd0 + 3, 7);
      ctx.globalAlpha = 1;
      for (let b = 0; b < 4; b++) {
        const sd = st.fseed[li * 4 + b];
        const hh = (30 + 7 * Math.sin(t * 2.1 + sd) + 4 * Math.sin(t * 5.7 + sd * 1.3)) * (0.75 + 0.25 * P) * (b === 1 || b === 2 ? 1.18 : 1);
        flame(ctx, LAMPS[li] + BOWL_OFF[b], BOWL_Y - 1, hh, 5.6, t, sd);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();

    // ---- city layer (nearer: more parallax)
    ctx.save(); layer(ctx, cam, 1.3);
    ctx.drawImage(st.cityDark, CX0, CY0, CW, CH);
    if (cityGlow > 0.002) {
      ctx.globalAlpha = clamp(cityGlow * (0.94 + 0.06 * Fm), 0, 1);
      ctx.drawImage(st.cityLit, CX0, CY0, CW, CH);
      ctx.globalAlpha = 1;
    }
    {
      const wa = 0.35 + 0.65 * cityGlow;
      ctx.fillStyle = '#ffc46a';
      for (const wn of st.city.wins) {
        if (!wn.on) continue;
        ctx.globalAlpha = wa * wn.b * (0.8 + 0.2 * Math.sin(t * wn.sp + wn.ph));
        ctx.fillRect(wn.x, wn.y, wn.w, wn.h);
      }
      ctx.globalCompositeOperation = 'lighter';
      for (const wn of st.city.wins) {
        if (!wn.on || !wn.glow) continue;
        spr(ctx, st.glowWarm, wn.x + wn.w / 2, wn.y + wn.h / 2, wn.w * 9, 0.35 * wa * wn.b);
      }
      // golden haze over the city
      ctx.globalAlpha = 1;
      const gr = ctx.createRadialGradient(960, 700, 0, 960, 760, 900);
      gr.addColorStop(0, `rgba(255,160,80,${(0.16 * cityGlow * P).toFixed(3)})`);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr; ctx.fillRect(0, 560, 1920, 640);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();

    // ---- sparks rising into the night
    ctx.save(); layer(ctx, cam, 1);
    ctx.globalCompositeOperation = 'lighter';
    for (const sp of st.sparks) {
      const u = fract((t + sp.off) / sp.per);
      const rise = u * sp.per * sp.v;
      const x = sp.x + Math.sin(t * sp.f + sp.ph) * sp.sway * u + sp.drift * u * u;
      const y = BOWL_Y - 26 - rise;
      const a = sstep(0, 0.06, u) * Math.pow(1 - u, 1.4) * (0.65 + 0.35 * Math.sin(t * 13 + sp.ph)) * P;
      spr(ctx, st.glowHot, x, y, sp.s * (1 - 0.5 * u), a);
    }
    ctx.restore();

    // ---- grade: vignette, calm caption band, grain
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(st.vig, 0, 0, W, H);
    {
      const fi = Math.floor(t * 24);
      const tile = st.grain[fi & 3];
      const ox = ((fi * 73) % 256), oy = ((fi * 151) % 256);
      ctx.save();
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.55;
      const pat = ctx.createPattern(tile, 'repeat');
      ctx.translate(-ox, -oy);
      ctx.fillStyle = pat; ctx.fillRect(0, 0, W + 256, H + 256);
      ctx.restore();
    }
    ctx.restore();
  }

  S.scenes[5] = {
    duration: DUR,
    init: function () { init(); },
    draw: function (ctx, t) { draw(ctx, t); },
  };
})();
