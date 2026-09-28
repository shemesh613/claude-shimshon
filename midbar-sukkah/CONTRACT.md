# "מהמדבר לסוכה" (From the Desert to the Sukkah): the contract

A **vertical 9:16** (1080 x 1920) procedural animation, **54 seconds**, told as **one continuous
shot with no hard cuts**. Everything is drawn by code with Canvas 2D, and the score is WebAudio synthesis.
There are no images, no samples and no network requests (except the Google web font, which the engine loads).

## The hook: the golden grains

The whole film is carried by **one set of 4,000 grains of sand** (`env.GRAINS`). Grain *i*
exists for the entire film. It starts as **one glowing grain in the dark**. Then it swirls up with the
wind, lies down as dunes, becomes the trail of a journeying people, the outlines of tents, the
clouds of glory, the walls and schach of a sukkah, the light through the schach, the etrog, and
finally it collapses back into **the single grain**. The last frame matches the first, so the film **loops seamlessly**.
Every beat tells the engine where the grains are at every moment; the engine morphs grains between beats.

## Content rules (mandatory)

- A respectful, traditional (Orthodox) Jewish tone. Poetic, elegant, never childish or cheesy.
- **No women or girls. No faces at all.** People appear only as tiny, distant, minimal
  silhouettes of men (a few strokes, or implied by footprints/shadows/dust), or not at all.
- **Never depict God** in any form. Divine presence = light, luminous cloud, glow only.
- No non-Jewish symbols. No modern clutter (no cars, wires, electric bulbs, plastic).
- Hebrew text: the engine draws the only line of text in the film. Beats draw **no text**.

## Coordinate space & look

- Logical frame **W = 1080, H = 1920** (`env.W`, `env.H`); the engine scales the context. Never
  read `canvas.width`.
- **Safe zone for social apps:** the top 240 px and the bottom 420 px get covered by app UI (Reels,
  Status). Keep the essential subject inside y ∈ [240, 1500]. Those bands must still look good, just not carry key content.
- Style: sand particles, delicate line drawing, parchment/watercolor texture, soft luminous
  clouds, warm festive light, and a "made with code" elegance. Slow, eased camera moves; no linear pops.
- **Palette** (whole film): night indigo `#0b0d1f` / `#16193a`; dusk violet `#3a2b4a`;
  sand gold `#d9a45a` / `#f0c98a`; parchment cream `#f3e6c8`; ink brown `#3b2616`;
  candle amber `#ffb347`; cloud pearl `#e9eefc`; palm/olive greens `#4f6b3a` / `#7e9152`;
  etrog yellow `#e8c547`. Grains are warm gold light (`#ffd89a` family) unless noted.
- Lighting arc: B1 moonlit indigo night → first light; B2 golden day into sunset; B3 dusk
  → night with luminous clouds; B4 night; B5 night, warm interior; B6 interior light,
  then night with glowing sukkot, ending in darkness with one grain.

## Timeline (fixed absolute times, set in the engine; 2 s overlaps are cross-fades)

| beat | file | film time | local duration | content |
|---|---|---|---|---|
| 1 | `beats/b1.js` | 0 – 14 | 14 | Desert opening (single grain, wind, dunes form) → journey (a people moving, camera rises to top-down) |
| 2 | `beats/b2.js` | 12 – 25 | 13 | Camp of Israel from above (tents emerge in formation) → Clouds of Glory surround it |
| 3 | `beats/b3.js` | 23 – 33 | 10 | **The transformation: camp → sukkah**, camera descends into one structure |
| 4 | `beats/b4.js` | 31 – 38 | 7 | Inside the sukkah: warm, intimate, light filtered through schach |
| 5 | `beats/b5.js` | 36 – 45 | 9 | The four species one by one → united → a wave of light fills the sukkah |
| 6 | `beats/b6.js` | 43 – 54 | 11 | Pull back: many glowing sukkot at night, clouds implied → the final line of text → collapse to the single grain (loop) |

Local time `t` runs from 0 to the local duration. In the first 2 s and last 2 s of each beat, the engine
cross-fades with the neighbour **and** morphs the grains between the two beats' grain layouts.
These edges must still look complete and in motion.

**Handoffs** (make the edges match your neighbour's description):
- **H0/loop:** at B1 t=0 and at B6 t=11, the frame is near-black indigo (`#07081a`) with **one** glowing
  grain at `ORIGIN = (540, 1010)`, and every grain sits exactly on ORIGIN.
- **H1 (B1 end → B2 start):** camera looks **straight down** at warm golden sand in late
  afternoon; faint wind ripples; grains lie along the lines where the tents will stand.
- **H2 (B2 end → B3 start):** top-down view of the whole camp, drawn with the shared `WORLD`
  helpers at camera `WORLD.CAM_CAMP`, at night, ringed and roofed by softly luminous clouds; pillar glow at the Mishkan.
  B2 and B3 must both draw the camp with `WORLD.drawCamp` so they are pixel-identical at the seam.
- **H3 (B3 end → B4 start):** we are inside the hero sukkah at night, looking up and forward: the schach
  (palm fronds/branches) across the top half with stars and moonlight between, and warm amber light from below.
- **H4 (B4 end → B5 start):** warm interior; the table/foreground area of the sukkah, soft bokeh,
  a calm central space where the species will appear (centre of the frame).
- **H5 (B5 end → B6 start):** the united four species glow at the centre; a wave of warm light
  fills the frame (bright warm gold). B6 starts from that glow and pulls back.

**The final text** (drawn by the engine, not the beat), during film time 46.5–51.5 = B6 local
3.5–8.5: "לְמַעַן יֵדְעוּ דֹרֹתֵיכֶם", centred at y ≈ 640. B6 must keep the sky
region y ∈ [520, 780] calm (no bright objects) in that window.

## Beat module API

A plain script (no modules or imports), wrapped in an IIFE:

```js
(function () {
  const S = (window.MIDBAR = window.MIDBAR || { beats: {} });
  S.beats[N] = {
    init(env) {},                // optional: precompute with a seeded RNG (env.fx.rng(seed))
    draw(ctx, t, env) {},        // paint EVERY pixel for local time t (opaque fill first)
    grains(t, out, env) {},      // write grain layout for local time t (see below)
    tint: [255, 216, 154],       // optional grain colour [r,g,b] for this beat (or tint(t) => [r,g,b])
  };
})();
```

- `draw` and `grains` must be **pure functions of t**. No state carried between frames, no
  `Math.random()`, no `Date.now()` or `performance.now()`. Frames are requested out of order.
- `grains(t, out, env)`: `out` is a `Float32Array(env.GRAINS * 3)`. For grain `i`, write
  `out[3i] = x`, `out[3i+1] = y` (frame coords, with any camera move already applied), `out[3i+2] = w`
  (0..1: visibility/size; 0 hides the grain). **Fill every grain every call.** Grains you don't need can
  be hidden (w=0) at a sensible position (e.g. scattered in the air or ground), since they still fly during morphs.
  The engine draws the grains **on top of** your frame as small additive glows, so choose `w` so
  the grains feel like part of your picture (e.g. 0.15–0.4 for ambient dust, 0.6–1 for key forms).
- Budget: must stay light (aim ≲ 3,000 path primitives per frame). Cache static layers in
  offscreen canvases made in `init` (`env.fx.canvas(w, h)`). Frame time matters, since the export renders 1,620 frames.

## Shared helpers (`core.js`, loaded first, available as `env.fx`)

`rng(seed)` → mulberry32 function · `clamp, lerp, smooth(x)` (smoothstep 0..1) ·
`ease.inOut / out / in / outExpo / inOutSine` · `range(t, a, b)` = clamp((t-a)/(b-a)) ·
`noise(x, y)` value noise in [-1, 1] · `fbm(x, y, oct)` · `canvas(w, h)` · `glow(radius, rgb)`
returns a cached radial-glow sprite canvas (draw with `drawImage` and `'lighter'`) ·
`rgba(rgb, a)` · `mixRGB(a, b, k)`.

## `WORLD` (shared camp, `world.js`, available as `env.world`)

The camp layout and camera shared by B2, B3 (and optionally B6). World units, camp centred on (0,0),
east is **up** (toward the top of the frame). `WORLD.TENTS[]` = `{x, y, w, h, rot, tribe, ring}`;
`WORLD.MISHKAN` = courtyard rect; `WORLD.HERO` = index of the tent that becomes the hero sukkah;
`WORLD.CAM_CAMP` = `{x, y, zoom}` overview camera; `WORLD.applyCam(ctx, cam, env)`;
`WORLD.toScreen(cam, x, y, env)`; `WORLD.drawCamp(ctx, cam, opts, env)`, where opts are
`{appear: (i) => 0..1, night: 0..1, glow: 0..1}`.
**B3 owns `world.js`** (may improve the drawing, must keep the API). Others only read it.

## Engine-side modules

- `grains.js` → `S.grainSystem = { init(env), draw(ctx, T, frame, env) }`, where `frame = { a, b, k }`
  gives the active beats' grain buffers and the morph progress. It is the morphing and rendering of the grains.
- `post.js` → `S.post = { init(env), apply(ctx, T, env) }`: parchment/watercolor texture, grade, vignette.
- `music.js` → `S.music.build(ctx, dest, cues, offset, when) → { stop() }`. It schedules only events at film time
  ≥ offset, with film time `offset` at ctx time `when`, on `AudioContext` or `OfflineAudioContext`. `cues = [{beat, start, end}]`.

## Checking your work

```
node export.mjs /tmp/x.mp4 30 540        # full video at a quick 540 px width
STILLS="3,7.5,13" node export.mjs /path/prefix.mp4 30 540   # JPEG stills at film times
```
`export.mjs` inlines the scripts itself (no build step). Look at your stills with the Read tool.
