# Sukkot film: contract between the engine and the scene/music modules

The film is one HTML page (`index.html`, the engine) that plays 7 scenes drawn on a
`<canvas>` with a synthesized WebAudio score. Every scene and the score live in their
own file and follow this contract exactly.

## Content rules (mandatory for everyone)

- A respectful, traditional (Orthodox) Jewish depiction of Sukkot.
- **Do not depict any women or girls. Do not depict any human faces.** People appear
  only as small, distant, simple silhouettes of men (kippah/hat, tallit
  optional), or not at all. Prefer environments, objects, light.
- Never depict God in any form. Divine presence = light, cloud, glow only.
- No crosses, no non-Jewish religious symbols, nothing irreverent or comic.
- Hebrew text, when drawn, must be correct and right-to-left (`ctx.direction = 'rtl'`).

## Scene module: `scenes/sN.js` (N = 1..7)

A plain script (no modules, no imports, no network, no images: everything is drawn
procedurally with Canvas 2D). Wrap it in an IIFE and register exactly one scene:

```js
(function () {
  const S = (window.SUKKOT = window.SUKKOT || { scenes: {} });
  S.scenes[N] = {
    duration: 18,          // seconds, 16-20
    init(env) { /* optional: precompute geometry with a seeded RNG */ },
    draw(ctx, t, env) { /* paint the full frame for local time t */ },
  };
})();
```

- Coordinate space is always **1920 x 1080** (`env.W`, `env.H`). The engine already
  scales the context. Never read `canvas.width`.
- `draw` must **paint every pixel** (start with an opaque background fill) and must be a
  **pure function of `t`**: no state carried between frames, no `Math.random()` inside
  `draw`, no `Date.now()`/`performance.now()`. Frames may be requested out of order
  (seeking, video export). Use a seeded RNG in `init` for any randomness, e.g.
  mulberry32.
- `t` runs from 0 to `duration`. The engine cross-fades 1.5 s at both ends, so the
  first and last 1.5 s should still look good (no black, keep motion going).
- Keep the **bottom 22%** of the frame calm/darker: the engine draws the Hebrew verse
  caption there.
- The engine draws the verse caption; scenes draw no captions of their own. Scene
  text inside the world (e.g., names that appear in the sky) is allowed. Font:
  `'Frank Ruhl Libre', 'David Libre', serif`.
- Budget: must render at 60 fps on a laptop. Aim for ≤ ~3,000 primitives per frame; cache
  static layers in an offscreen canvas made in `init` (`document.createElement('canvas')`
  sized 1920x1080) and `drawImage` them.
- Cinematic craft: slow camera moves (parallax, push-in, pan), depth layers, atmospheric
  light (gradients, glow via `globalCompositeOperation = 'lighter'`), vignette, careful
  color grading, eased motion (no linear pops). It should look like a professional
  animated short, not a demo.
- Visual palette for the whole film: warm desert golds, deep night indigo, olive/palm
  greens, Jerusalem-stone cream, candle amber. Each scene must match this palette.

## Music module: `music.js`

```js
(function () {
  const S = (window.SUKKOT = window.SUKKOT || { scenes: {} });
  S.music = {
    // Schedules the full score on ctx (AudioContext OR OfflineAudioContext) into dest.
    // Schedule only events whose time >= offset; film time `offset` plays at ctx time `when`.
    // cues: [{ scene: 1..7, start: seconds, end: seconds }] in film time.
    // Returns { stop() } that stops everything scheduled.
    build(ctx, dest, cues, offset, when) { ... },
  };
})();
```

Deterministic, synthesized only (oscillators, noise buffers, filters, convolver reverb
from a generated impulse). No samples, no network.

## Scene list (film order, total ≈ 2:05)

1. Wilderness: clouds of glory around the camp at night
2. Building the sukkah: Jerusalem courtyard at dusk, time-lapse
3. The four species: lulav, etrog, hadasim, aravot
4. Inside the sukkah at night: decorations, stars through the schach, the ushpizin
5. Simchat Beit HaShoeva: the Temple ablaze with light, the water libation
6. Hoshana Rabbah → Shemini Atzeret: aravot, the prayer for rain, the land turns green
7. Simchat Torah: the Torah scrolls, the rejoicing, the finale "חג שמח"
