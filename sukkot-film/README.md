# זמן שמחתנו: a short film about Sukkot

A 2-minute animated film drawn entirely in code (Canvas 2D), with an original score synthesized with WebAudio. No images, no samples, no video model.

| Scene | Content |
|---|---|
| 1 | The wilderness: clouds of glory around the camp of Israel |
| 2 | Building the sukkah on a Jerusalem rooftop at sunset |
| 3 | The four species |
| 4 | Inside the sukkah at night: stars through the schach, the ushpizin |
| 5 | Simchat Beit HaShoeva in the Temple |
| 6 | Hoshana Rabbah: the prayer for rain, the land turns green |
| 7 | Simchat Torah and the title "חג שמח" |

- `index.html`: the engine (timeline, cross-fades, Hebrew captions, controls, audio sync)
- `scenes/s1.js` … `s7.js`: one scene per file, written in parallel per `CONTRACT.md`
- `music.js`: the score
- `node build.mjs` → `dist/sukkot-film.html` (one self-contained file)
- `node export.mjs dist/sukkot-film.mp4 30 1920` → MP4 (needs Playwright + ffmpeg; set `FFMPEG` if not on PATH)
