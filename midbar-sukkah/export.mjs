// Renders the film frame by frame into a vertical MP4 (H.264 + AAC).
// Usage: node export.mjs [out.mp4] [fps=30] [width=1080]
// Preview: STILLS="3,7.5" node export.mjs /tmp/prefix.mp4 30 540 writes JPEG stills instead.
// Needs: playwright (Chromium) and an ffmpeg binary in $FFMPEG or on PATH.
import { createRequire } from 'node:module';
import { execSync, spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, existsSync } from 'node:fs';
import { inline } from './inline.mjs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); }
catch { playwright = require(join(execSync('npm root -g').toString().trim(), 'playwright')); }

const root = dirname(fileURLToPath(import.meta.url));
const out = resolve(process.argv[2] || join(root, 'dist', 'midbar-sukkah.mp4'));
const fps = Number(process.argv[3] || 30);
const width = Number(process.argv[4] || 1080);
const IMAGEIO = '/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2';
const ffmpeg = process.env.FFMPEG || (existsSync(IMAGEIO) ? IMAGEIO : 'ffmpeg');
const work = mkdtempSync(join(tmpdir(), 'midbar-'));

// Fetch the web fonts with curl (honours the system proxy) and inline them.
function fontCSS() {
  const cache = join(tmpdir(), 'midbar-fonts.css');
  if (existsSync(cache)) return readFileSync(cache, 'utf8');
  try {
    const url = 'https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@400;700;900&display=block';
    let css = execSync(`curl -sS -A "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36" "${url}"`).toString();
    const urls = [...new Set(css.match(/https:\/\/fonts\.gstatic\.com\/[^)]+/g) || [])];
    for (const u of urls) {
      const b64 = execSync(`curl -sS "${u}"`, { maxBuffer: 1 << 26 }).toString('base64');
      css = css.split(u).join(`data:font/woff2;base64,${b64}`);
    }
    writeFileSync(cache, css);
    return css;
  } catch (e) { console.warn('font fetch failed, using fallback serif', e.message); return ''; }
}

const browser = await playwright.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 720, height: 1280 } });
let html = inline(root);
html = html.replace(/<link[^>]+fonts\.g[^>]+>/g, '');
html = `<!doctype html><html><head><meta charset="utf-8"><style>${fontCSS()}</style></head><body>${html}</body></html>`;
const htmlPath = join(work, 'film.html');
writeFileSync(htmlPath, html);
page.on('pageerror', (e) => console.error('page error:', e.message));
await page.goto('file://' + htmlPath);
await page.evaluate(async () => {
  await Promise.all(['400', '700', '900'].map((w) => document.fonts.load(`${w} 40px 'Frank Ruhl Libre'`, 'אבג')));
  await document.fonts.ready;
});

const { duration, cues } = await page.evaluate(() => ({ duration: FILM.duration, cues: FILM.cues }));
console.log(`duration ${duration.toFixed(2)} s, ${fps} fps, width ${width}`);

// Preview mode: STILLS="3,20,64" writes JPEG stills next to `out` instead of a video.
if (process.env.STILLS) {
  await page.evaluate((w) => { document.getElementById('poster').hidden = true; FILM.setResolution(w); }, width);
  for (const T of process.env.STILLS.split(',').map(Number)) {
    const url = await page.evaluate((T) => { FILM.renderAt(T); return document.getElementById('film').toDataURL('image/jpeg', 0.85); }, T);
    const file = out.replace(/\.mp4$/, '') + `-${String(T).padStart(5, '0')}.jpg`;
    writeFileSync(file, Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));
    console.log('still', file);
  }
  await browser.close();
  process.exit(0);
}

// 1) audio: render the score offline, write a 16-bit WAV
const wavB64 = await page.evaluate(async ({ cues, duration }) => {
  const sr = 48000;
  const ctx = new OfflineAudioContext(2, Math.ceil(sr * (duration + 0.5)), sr);
  window.SUKKOT.music.build(ctx, ctx.destination, cues, 0, 0);
  const buf = await ctx.startRendering();
  const n = buf.length, L = buf.getChannelData(0), R = buf.getChannelData(1);
  const dv = new DataView(new ArrayBuffer(44 + n * 4));
  const s = (o, str) => { for (let i = 0; i < str.length; i++) dv.setUint8(o + i, str.charCodeAt(i)); };
  s(0, 'RIFF'); dv.setUint32(4, 36 + n * 4, true); s(8, 'WAVE'); s(12, 'fmt ');
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 2, true);
  dv.setUint32(24, sr, true); dv.setUint32(28, sr * 4, true); dv.setUint16(32, 4, true); dv.setUint16(34, 16, true);
  s(36, 'data'); dv.setUint32(40, n * 4, true);
  for (let i = 0, o = 44; i < n; i++, o += 4) {
    dv.setInt16(o, Math.max(-1, Math.min(1, L[i])) * 32767, true);
    dv.setInt16(o + 2, Math.max(-1, Math.min(1, R[i])) * 32767, true);
  }
  const bytes = new Uint8Array(dv.buffer);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}, { cues, duration });
const wav = join(work, 'score.wav');
writeFileSync(wav, Buffer.from(wavB64, 'base64'));
console.log('audio rendered');

// 2) video: pipe JPEG frames into ffmpeg
await page.evaluate((w) => { document.getElementById('poster').hidden = true; FILM.setResolution(w); }, width);
const ff = spawn(ffmpeg, [
  '-y', '-hide_banner', '-loglevel', 'error',
  '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
  '-i', wav,
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
  '-c:a', 'aac', '-b:a', '192k', '-shortest', out,
], { stdio: ['pipe', 'inherit', 'inherit'] });

const frames = Math.floor(duration * fps);
const t0 = Date.now();
for (let f = 0; f < frames; f++) {
  const dataUrl = await page.evaluate((T) => {
    FILM.renderAt(T);
    return document.getElementById('film').toDataURL('image/jpeg', 0.93);
  }, f / fps);
  const buf = Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  if (f % (fps * 10) === 0) console.log(`frame ${f}/${frames}  ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
ff.stdin.end();
await new Promise((r, j) => ff.on('close', (c) => (c === 0 ? r() : j(new Error('ffmpeg exit ' + c)))));
await browser.close();
console.log('wrote', out);
