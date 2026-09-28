# מהמדבר לסוכה · From the Desert to the Sukkah

A 54-second **vertical (9:16)** animation for Sukkot, made entirely with code. There are no images and no
recorded sounds. Every frame is drawn with Canvas 2D, and the score is synthesized live with WebAudio.

One continuous shot follows **4,000 golden grains of sand**. At the start they are a single grain in the dark.
They swirl into dunes, trace the path of the journey, and become the tents of the camp and the Clouds of Glory.
Then they turn into the walls and schach of a sukkah, the light inside it, and the etrog.
In the end they collapse back into the single grain, and the film loops seamlessly.

## Run

Open `index.html` in a browser. It works from `file://`, and no server is needed. Click to play.
- Space: play/pause. ←/→: seek 5 s. The loop button turns looping on or off.

A single self-contained file (all scripts inlined):

```
node build.mjs            # → dist/midbar-sukkah.html
```

Render an MP4 (needs Playwright + Chromium, and ffmpeg in `$FFMPEG` or on PATH):

```
node export.mjs dist/midbar-sukkah.mp4 30 1080     # 1080x1920, 30 fps, H.264 + AAC
STILLS="3,26,48" node export.mjs /tmp/still.mp4 30 540   # preview JPEG stills
```

## Structure

| file | role |
|---|---|
| `index.html`, `styles.css` | player page (poster, controls, 9:16 stage) |
| `main.js` | engine: fixed timeline, cross-fades, grain hand-off, the final verse, looping playback, audio clock, `window.FILM` export hook |
| `core.js` | shared helpers (`env.fx`): seeded RNG, easing, value noise / fbm, glow sprites |
| `world.js` | the camp of Israel (Bamidbar 2–3): tribes around the Mishkan, the camera, tent drawing |
| `beats/b1.js` | 0–14 s: single grain → desert wind and dunes → the journey → camera tilts down |
| `beats/b2.js` | 12–25 s: the camp forms from above → the Clouds of Glory |
| `beats/b3.js` | 23–33 s: **the transformation**: every tent becomes a sukkah, and the camera descends into one |
| `beats/b4.js` | 31–38 s: inside the sukkah, with light through the schach |
| `beats/b5.js` | 36–45 s: the four species one by one (the etrog forms from the grains) → unity → a wave of light |
| `beats/b6.js` | 43–54 s: pull back to many glowing sukkot at night → "לְמַעַן יֵדְעוּ דֹרֹתֵיכֶם" → back to one grain |
| `grains.js` | renders the 4,000 grains and morphs them between beats along wind-curved paths |
| `post.js` | parchment/watercolor texture, film grain, colour grade, vignette |
| `music.js` | the synthesized score, which also loops seamlessly |
| `build.mjs`, `inline.mjs`, `export.mjs` | single-file build and frame-accurate MP4 export |

Each beat is a pure function of time: `draw(ctx, t)` paints the frame and `grains(t, out)` says where every
grain is. The engine cross-fades neighbouring beats over 2 s and morphs the grains between their
layouts, so the whole film reads as one shot. See `CONTRACT.md` for the full API.
