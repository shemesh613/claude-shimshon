// Shared helpers for every beat (exposed as env.fx). Pure, deterministic.
(function () {
  const S = (window.MIDBAR = window.MIDBAR || { beats: {} });

  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, k) => a + (b - a) * k;
  const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
  const range = (t, a, b) => clamp((t - a) / (b - a));

  const ease = {
    inOut: (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; },
    out: (x) => { x = clamp(x); return 1 - Math.pow(1 - x, 3); },
    in: (x) => { x = clamp(x); return x * x * x; },
    outExpo: (x) => { x = clamp(x); return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x); },
    inOutSine: (x) => { x = clamp(x); return -(Math.cos(Math.PI * x) - 1) / 2; },
  };

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // value noise in [-1, 1]
  function hash(x, y) {
    let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }
  function noise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
  }
  function fbm(x, y, oct = 4) {
    let s = 0, amp = 0.5, f = 1, norm = 0;
    for (let i = 0; i < oct; i++) { s += amp * noise(x * f, y * f); norm += amp; amp *= 0.5; f *= 2.03; }
    return s / norm;
  }

  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  const glowCache = new Map();
  function glow(radius, rgb = [255, 216, 154]) {
    const r = Math.max(2, Math.round(radius));
    const key = r + ':' + rgb.join(',');
    let c = glowCache.get(key);
    if (c) return c;
    c = canvas(r * 2, r * 2);
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(r, r, 0, r, r, r);
    const [R, G, B] = rgb;
    gr.addColorStop(0, `rgba(${R},${G},${B},1)`);
    gr.addColorStop(0.18, `rgba(${R},${G},${B},0.55)`);
    gr.addColorStop(0.45, `rgba(${R},${G},${B},0.16)`);
    gr.addColorStop(1, `rgba(${R},${G},${B},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, r * 2, r * 2);
    glowCache.set(key, c);
    return c;
  }

  const rgba = (rgb, a) => `rgba(${rgb[0] | 0},${rgb[1] | 0},${rgb[2] | 0},${a})`;
  const mixRGB = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

  S.fx = { clamp, lerp, smooth, range, ease, rng, noise, fbm, canvas, glow, rgba, mixRGB };
})();
