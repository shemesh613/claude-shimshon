// The golden grains: the morph between beats and the look of every grain.
// S.grainSystem = { init(env), draw(ctx, T, frame, env) }. A pure function of (T, frame).
//
// Morph: during a 2 s overlap each grain leaves beat a's layout for beat b's on its own eased
// clock (a wind front sweeps the frame right-to-left plus per-grain scatter), along a curved
// path: a sideways bow, a divergence-free swirl and a lift, all scaled by sin(pi*p), so the
// transfer reads as luminous sand carried by wind.
// Look: crisp 1-3 px cores batched into (tint x alpha) paths, pre-scaled soft halos on a
// sample of the brighter grains, faint motion tails for the fastest flyers. Drawn in device
// space on integer pixels, which is what keeps 4,000 grains inside a few ms in software raster.
(function () {
  'use strict';
  const S = (window.MIDBAR = window.MIDBAR || { beats: {} });

  const TAU = Math.PI * 2;
  const NA = 8;              // alpha buckets per tint group
  const NT = 3;              // tint groups (by morph progress)
  const NB = NA * NT;
  const STAGGER = 0.5;       // share of the overlap used to ripple the start times
  const HALO_MIN_W = 0.45;   // grains brighter than this may get a soft halo
  const HALO_CAP = 320;      // most halos drawn per frame (sampled evenly by hash)
  const STREAK_MIN = 6;      // logical px of travel per 0.02 k before a tail shows
  const STREAK_MAX = 12;     // longest tail (logical px)
  const STREAK_CAP = 1000;

  let N = 0, fx = null;
  // per-grain constants (seeded in init)
  let H1, H2, H3, H4, TW_F, TW_P, SIDE;
  // per-frame scratch
  let PX, PY, PS, PA, PW, PG, KEY, ORDER, ORDERB, CNT, OFF, FILL, STX, STY;
  const styleCache = new Map();
  const spriteCache = new Map();

  function init(env) {
    fx = env.fx;
    N = env.GRAINS;
    const r = fx.rng(0x5a4d);
    H1 = new Float32Array(N); H2 = new Float32Array(N); H3 = new Float32Array(N); H4 = new Float32Array(N);
    TW_F = new Float32Array(N); TW_P = new Float32Array(N); SIDE = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      H1[i] = r(); H2[i] = r(); H3[i] = r(); H4[i] = r();
      TW_F[i] = 0.9 + 2.6 * r();          // twinkle speed (rad/s)
      TW_P[i] = TAU * r();                // twinkle phase
      SIDE[i] = r() < 0.5 ? -1 : 1;       // which way the grain bows in flight
    }
    PX = new Float32Array(N); PY = new Float32Array(N); PS = new Float32Array(N);
    PA = new Float32Array(N); PW = new Float32Array(N); PG = new Uint8Array(N);
    KEY = new Uint8Array(N); ORDER = new Uint16Array(N); ORDERB = new Uint16Array(N);
    CNT = new Int32Array(NB); OFF = new Int32Array(NB + 1); FILL = new Int32Array(NB);
    STX = new Float32Array(STREAK_CAP * 2); STY = new Float32Array(STREAK_CAP * 2);
  }

  // Tint quantised so style strings and sprites stay cached.
  const q = (v) => Math.max(0, Math.min(255, Math.round(v / 6) * 6));
  function style(rgb, level) {
    const key = ((rgb[0] * 256 + rgb[1]) * 256 + rgb[2]) * 16 + level;
    let s = styleCache.get(key);
    if (!s) {
      if (styleCache.size > 4000) styleCache.clear();
      s = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${((level + 1) / NA).toFixed(3)})`;
      styleCache.set(key, s);
    }
    return s;
  }
  // A halo sprite of diameter d device px (so it is blitted 1:1, never resampled).
  function sprite(rgb, d) {
    const key = rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ':' + d;
    let c = spriteCache.get(key);
    if (!c) {
      if (spriteCache.size > 160) spriteCache.clear();
      c = fx.canvas(d, d);
      const g = c.getContext('2d'), r = d / 2;
      const gr = g.createRadialGradient(r, r, 0, r, r, r);
      const [R, G, B] = rgb;
      gr.addColorStop(0, `rgba(${Math.min(255, R + 30)},${Math.min(255, G + 30)},${Math.min(255, B + 40)},1)`);
      gr.addColorStop(0.12, `rgba(${R},${G},${B},0.62)`);
      gr.addColorStop(0.38, `rgba(${R},${G},${B},0.17)`);
      gr.addColorStop(0.7, `rgba(${R},${G},${B},0.04)`);
      gr.addColorStop(1, `rgba(${R},${G},${B},0)`);
      g.fillStyle = gr; g.fillRect(0, 0, d, d);
      spriteCache.set(key, c);
    }
    return c;
  }

  // fast sine (max error ~0.001), enough for swirl and twinkle
  const INV_TAU = 1 / TAU;
  function fsin(x) {
    x = x * INV_TAU; x -= Math.floor(x + 0.5);         // -> [-0.5, 0.5) turns
    const y = 8 * x - 16 * x * (x < 0 ? -x : x);         // parabola
    return 0.225 * (y * (y < 0 ? -y : y) - y) + y;        // refinement
  }
  const fcos = (x) => fsin(x + 1.5707963267948966);

  // ---- the morph (analytic, so evaluating it twice for velocity is cheap) ----
  function delay(i, xa, ya, xb, yb) {
    // a wind front blowing right-to-left (grains on the right lift off first), plus scatter
    const sweep = 0.55 * (1 - (xa + xb) * 0.5 / 1080) + 0.25 * ((ya + yb) * 0.5 / 1920);
    return fx.clamp(0.55 * sweep + 0.55 * H1[i], 0, 1);
  }
  const easeP = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const progress = (k, d) => easeP((k - d * STAGGER) / (1 - STAGGER));
  let OX = 0, OY = 0; // flight offset (out params)
  function flight(i, xa, ya, xb, yb, p, T) {
    const s = fsin(Math.PI * p);
    if (s <= 0) { OX = 0; OY = 0; return 0; }
    const dx = xb - xa, dy = yb - ya;
    const dist = Math.sqrt(dx * dx + dy * dy) + 1e-3;
    // bow sideways, proportional to the distance travelled (capped)
    const bow = Math.min(dist * 0.28, 260) * (0.35 + 0.65 * H3[i]) * SIDE[i];
    let ox = (-dy / dist) * bow, oy = (dx / dist) * bow;
    // divergence-free swirl: curl of psi = A sin(u) sin(v), drifting slowly with T
    const x = xa + dx * p, y = ya + dy * p;
    const u = 0.0052 * x + 0.35 * T, v = 0.0041 * y - 0.27 * T + 1.7;
    const amp = 60 + 50 * H2[i];
    const su = fsin(u), cu = fcos(u), sv = fsin(v), cv = fcos(v);
    ox += amp * su * cv;
    oy -= amp * cu * sv;
    // the prevailing wind: a lean and a lift, like sand blown off a dune crest
    ox -= 38; oy -= 46 * (0.5 + H1[i]);
    OX = ox * s; OY = oy * s;
    return s;
  }

  function draw(ctx, T, frame, env) {
    if (!N) init(env);
    const { a, b } = frame;
    const k = b ? frame.k : 0;
    const A = a.buf, B = b ? b.buf : null;
    const tintA = a.tint || [255, 216, 154];
    const tintB = b ? b.tint || [255, 216, 154] : tintA;
    const tints = [];
    for (let g = 0; g < NT; g++) {
      const m = b ? g / (NT - 1) : 0;
      tints.push([q(tintA[0] + (tintB[0] - tintA[0]) * m), q(tintA[1] + (tintB[1] - tintA[1]) * m), q(tintA[2] + (tintB[2] - tintA[2]) * m)]);
    }
    // device scale (the engine hands us a context scaled to 1080 logical px)
    const tr = ctx.getTransform();
    const sc = tr.a || 1, ex = tr.e, ey = tr.f;
    const DW = 1080 * sc, DH = 1920 * sc;

    CNT.fill(0);
    let n = 0, nStreak = 0, nHaloCand = 0;
    const k0 = Math.max(0, k - 0.02);

    for (let i = 0; i < N; i++) {
      const j = 3 * i;
      let x = A[j], y = A[j + 1], w = A[j + 2], p = 0, glow = 1;
      if (B) {
        const xb = B[j], yb = B[j + 1], wb = B[j + 2];
        if (w <= 0.004 && wb <= 0.004) continue;
        const xa = x, ya = y, wa = w;
        const d = delay(i, xa, ya, xb, yb);
        p = progress(k, d);
        const mid = flight(i, xa, ya, xb, yb, p, T);
        x = xa + (xb - xa) * p + OX;
        y = ya + (yb - ya) * p + OY;
        w = Math.max(wa + (wb - wa) * p, 0.35 * mid * Math.max(wa, wb));
        glow = 1 + 0.55 * mid; // luminous mid-flight
        if (mid > 0.05 && nStreak < STREAK_CAP && H2[i] < 0.45) {
          const p0 = progress(k0, d);
          flight(i, xa, ya, xb, yb, p0, T - 0.04);
          const vx = x - (xa + (xb - xa) * p0 + OX), vy = y - (ya + (yb - ya) * p0 + OY);
          const v2 = vx * vx + vy * vy;
          if (v2 > STREAK_MIN * STREAK_MIN) {
            // a short tail back along the motion: reads as blur, not needles
            const v = Math.sqrt(v2), len = Math.min(STREAK_MAX, 0.45 * v) * mid;
            const m = nStreak * 2;
            STX[m] = x - (vx / v) * len; STY[m] = y - (vy / v) * len; STX[m + 1] = x; STY[m + 1] = y;
            nStreak++;
          }
        }
      } else if (w <= 0.004) continue;
      const dx = x * sc + ex, dy = y * sc + ey;
      if (dx < -30 || dx > DW + 30 || dy < -30 || dy > DH + 30) continue;

      // deterministic twinkle: two incommensurate sines per grain
      const tw = 0.78 + 0.14 * fsin(T * TW_F[i] + TW_P[i]) + 0.08 * fsin(T * 5.3 * H3[i] + 11 * H1[i]);
      const wc = w > 1 ? 1 : w;
      const alpha = Math.min(1, (0.25 + 0.85 * wc) * tw * glow);
      const size = (0.9 + 2.1 * wc * (0.75 + 0.5 * H2[i])) * sc; // device px
      const lvl = Math.max(0, Math.min(NA - 1, Math.round(alpha * NA) - 1));
      const g = B ? Math.min(NT - 1, Math.round(p * (NT - 1))) : 0;
      const key = g * NA + lvl;
      PX[n] = dx; PY[n] = dy; PS[n] = size; PA[n] = alpha * (w * glow > HALO_MIN_W ? 1 : -1);
      PW[n] = wc * glow * tw; PG[n] = g; KEY[n] = key;
      ORDER[n] = i; // remember the grain for the halo sample
      CNT[key]++;
      if (w * glow > HALO_MIN_W) nHaloCand++;
      n++;
    }

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'lighter';

    // 1) halos: an even hash-sample of the brighter grains, pre-scaled sprites blitted 1:1.
    // When only a handful of grains are lit (the lone grain that opens and closes the film)
    // each one gets a much fuller glow.
    if (nHaloCand) {
      const solo = 1 - fx.smooth((n - 1) / 80);
      const hA = 1 + 5.5 * solo, hR = 1 + 2.8 * solo;
      const frac = Math.min(1, HALO_CAP / nHaloCand);
      const comp = Math.min(1.8, 1 / Math.sqrt(frac)); // fewer halos -> each a touch stronger
      for (let m = 0; m < n; m++) {
        if (PA[m] < 0) continue;
        const i = ORDER[m];
        if (H4[i] >= frac) continue;
        const r = (7 + 12 * Math.min(1, PW[m])) * (0.8 + 0.4 * H1[i]) * hR * sc;
        const d = Math.max(4, (Math.round(r) * 2) & ~3); // quantised diameter -> small sprite cache
        ctx.globalAlpha = Math.min(1, 0.13 * PW[m] * hA * comp);
        ctx.drawImage(sprite(tints[PG[m]], d), Math.round(PX[m] - d / 2), Math.round(PY[m] - d / 2));
      }
      ctx.globalAlpha = 1;
    }

    // 2) faint tails on the fastest flyers
    if (nStreak) {
      const t = tints[Math.min(NT - 1, Math.round(k * (NT - 1)))];
      ctx.strokeStyle = `rgba(${t[0]},${t[1]},${t[2]},0.15)`;
      ctx.lineWidth = Math.max(1, sc);
      ctx.lineCap = 'butt';
      ctx.beginPath();
      for (let s = 0; s < nStreak; s++) {
        const m = s * 2;
        ctx.moveTo(STX[m] * sc + ex, STY[m] * sc + ey);
        ctx.lineTo(STX[m + 1] * sc + ex, STY[m + 1] * sc + ey);
      }
      ctx.stroke();
    }

    // 3) crisp cores on whole pixels, one path per (tint, alpha) bucket
    OFF[0] = 0;
    for (let c = 0; c < NB; c++) { OFF[c + 1] = OFF[c] + CNT[c]; FILL[c] = OFF[c]; }
    const idx = ORDERB;
    for (let m = 0; m < n; m++) idx[FILL[KEY[m]]++] = m;
    for (let c = 0; c < NB; c++) {
      if (!CNT[c]) continue;
      ctx.fillStyle = style(tints[(c / NA) | 0], c % NA);
      ctx.beginPath();
      for (let o = OFF[c]; o < OFF[c + 1]; o++) {
        const m = idx[o];
        const s = Math.max(1, Math.round(PS[m]));
        const x0 = Math.round(PX[m] - s / 2), y0 = Math.round(PY[m] - s / 2);
        if (s < 3) ctx.rect(x0, y0, s, s);
        else { // clip the corners so bigger grains read round, not square
          ctx.rect(x0 + 1, y0, s - 2, s);
          ctx.rect(x0, y0 + 1, 1, s - 2);
          ctx.rect(x0 + s - 1, y0 + 1, 1, s - 2);
        }
      }
      ctx.fill();
    }
    // a hot pip on the very brightest, largest grains
    ctx.fillStyle = 'rgba(255,248,230,0.5)';
    const ps = Math.max(1, Math.round(1.2 * sc));
    ctx.beginPath();
    for (let m = 0; m < n; m++) {
      if (Math.abs(PA[m]) < 0.92 || PS[m] < 2.2 * sc) continue;
      ctx.rect(Math.round(PX[m] - ps / 2), Math.round(PY[m] - ps / 2), ps, ps);
    }
    ctx.fill();

    ctx.restore();
  }
  S.grainSystem = { init, draw };
})();
