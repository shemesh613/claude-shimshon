// Engine: fixed timeline, cross-fades, the grain hand-off, the final line, playback and export hook.
(function () {
  'use strict';
  const W = 1080, H = 1920, GRAINS = 4000, XF = 2;
  const ORIGIN = [540, 1010];
  const S = (window.MIDBAR = window.MIDBAR || { beats: {} });
  const fx = S.fx;
  const SERIF = "'Frank Ruhl Libre', 'David Libre', serif";

  // [beat, start, end] in film time. Overlaps of XF seconds are cross-fades.
  const SCHEDULE = [[1, 0, 14], [2, 12, 25], [3, 23, 33], [4, 31, 38], [5, 36, 45], [6, 43, 54]];
  const DURATION = 54;

  const env = { W, H, GRAINS, ORIGIN, fx, world: S.world };
  const timeline = SCHEDULE.map(([n, start, end]) => ({
    n, start, end, dur: end - start, sc: S.beats[n] || null,
    buf: new Float32Array(GRAINS * 3), broken: !S.beats[n],
  }));
  const cues = timeline.map((e) => ({ beat: e.n, start: e.start, end: e.end }));
  timeline.forEach((e) => {
    if (!e.sc) return;
    try { e.sc.init && e.sc.init(env); } catch (err) { console.error('init beat', e.n, err); e.broken = true; }
  });
  for (const m of [S.grainSystem, S.post]) { try { m && m.init && m.init(env); } catch (err) { console.error('init', err); } }

  const canvas = document.getElementById('film');
  const ctx = canvas.getContext('2d');
  const stage = document.getElementById('stage');
  const bufA = document.createElement('canvas');
  const bufB = document.createElement('canvas');
  let scale = 1;

  function setResolution(pw) {
    const ph = Math.round(pw * H / W);
    for (const c of [canvas, bufA, bufB]) { c.width = pw; c.height = ph; }
    scale = pw / W;
  }
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = stage.clientWidth || 360;
    setResolution(Math.max(360, Math.min(W, Math.round(cssW * dpr))));
    renderAt(filmTime);
  }

  const localT = (e, T) => Math.max(0, Math.min(e.dur, T - e.start));

  function drawBeat(target, e, t) {
    const c = target.getContext('2d');
    c.save();
    c.setTransform(scale, 0, 0, scale, 0, 0);
    if (e.broken) { c.fillStyle = '#07081a'; c.fillRect(0, 0, W, H); }
    else {
      try { e.sc.draw(c, t, env); }
      catch (err) { console.error('draw beat', e.n, err); e.broken = true; c.fillStyle = '#07081a'; c.fillRect(0, 0, W, H); }
    }
    c.restore();
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.filter = 'none'; c.shadowBlur = 0;
  }

  function fillGrains(e, t) {
    const out = e.buf;
    if (!e.broken && e.sc.grains) {
      try { e.sc.grains(t, out, env); return; } catch (err) { console.error('grains beat', e.n, err); }
    }
    for (let i = 0; i < GRAINS; i++) { out[3 * i] = ORIGIN[0]; out[3 * i + 1] = ORIGIN[1]; out[3 * i + 2] = 0; }
  }
  const tintOf = (e, t) => {
    const s = e.sc;
    if (!s || !s.tint) return [255, 216, 154];
    return typeof s.tint === 'function' ? s.tint(t) : s.tint;
  };

  // Fallback grain renderer; grains.js replaces it with the real morph and look.
  function defaultGrains(c, T, frame) {
    const { a, b, k } = frame;
    c.save();
    c.globalCompositeOperation = 'lighter';
    const tint = b ? fx.mixRGB(a.tint, b.tint, k) : a.tint;
    c.fillStyle = fx.rgba(tint, 0.9);
    for (let i = 0; i < GRAINS; i++) {
      const j = 3 * i;
      let x = a.buf[j], y = a.buf[j + 1], w = a.buf[j + 2];
      if (b) { x = fx.lerp(x, b.buf[j], k); y = fx.lerp(y, b.buf[j + 1], k); w = fx.lerp(w, b.buf[j + 2], k); }
      if (w <= 0.01) continue;
      const s = 1 + 2.2 * w;
      c.globalAlpha = Math.min(1, w);
      c.fillRect(x - s / 2, y - s / 2, s, s);
    }
    c.restore();
  }

  // The only line of text in the film.
  function drawFinalLine(c, T) {
    const a = fx.smooth((T - 46.5) / 1.6) * (1 - fx.smooth((T - 50.0) / 1.5));
    if (a <= 0.001) return;
    c.save();
    c.globalAlpha = a;
    c.direction = 'rtl'; c.textAlign = 'center'; c.textBaseline = 'middle';
    const rise = (1 - fx.ease.out((T - 46.5) / 2.2)) * 18;
    const spread = 1 + (1 - fx.ease.out((T - 46.5) / 3)) * 0.04;
    c.translate(W / 2, 640 + rise);
    c.scale(spread, spread);
    const g = c.createLinearGradient(0, -60, 0, 50);
    g.addColorStop(0, '#fbe9b8'); g.addColorStop(0.6, '#e6b865'); g.addColorStop(1, '#b07e34');
    c.shadowColor = 'rgba(255, 200, 120, 0.45)'; c.shadowBlur = 36;
    c.font = `700 84px ${SERIF}`;
    c.fillStyle = g;
    c.fillText('לְמַעַן יֵדְעוּ דֹרֹתֵיכֶם', 0, 0);
    c.shadowBlur = 8; c.shadowColor = 'rgba(0,0,0,0.6)';
    c.font = `400 30px ${SERIF}`;
    c.fillStyle = 'rgba(243, 230, 200, 0.8)';
    c.fillText('כִּי בַסֻּכּוֹת הוֹשַׁבְתִּי אֶת בְּנֵי יִשְׂרָאֵל', 0, 92);
    c.restore();
  }

  function renderAt(T) {
    T = ((T % DURATION) + DURATION) % DURATION;
    const active = timeline.filter((e) => T >= e.start && T < e.end);
    const A = active[0], B = active[1] || null;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';

    const tA = localT(A, T);
    drawBeat(bufA, A, tA);
    ctx.drawImage(bufA, 0, 0);
    let k = 0, tB = 0;
    if (B) {
      tB = localT(B, T);
      k = fx.clamp((T - B.start) / XF);
      drawBeat(bufB, B, tB);
      ctx.globalAlpha = fx.ease.inOutSine(k);
      ctx.drawImage(bufB, 0, 0);
      ctx.globalAlpha = 1;
    }

    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    fillGrains(A, tA);
    if (B) fillGrains(B, tB);
    const frame = {
      a: { n: A.n, t: tA, buf: A.buf, tint: tintOf(A, tA) },
      b: B ? { n: B.n, t: tB, buf: B.buf, tint: tintOf(B, tB) } : null,
      k,
    };
    try { (S.grainSystem ? S.grainSystem.draw : defaultGrains)(ctx, T, frame, env); }
    catch (err) { console.error('grains', err); }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';

    drawFinalLine(ctx, T);

    if (S.post) { try { S.post.apply(ctx, T, env); } catch (err) { console.error('post', err); } }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  // ---------- playback & audio (loops seamlessly) ----------
  let filmTime = 0, playing = false, looping = true, muted = false;
  let audio = null, master = null, music = null, nextMusic = null, anchorCtx = 0, anchorFilm = 0, anchorPerf = 0;

  function clock() {
    if (audio && audio.state === 'running') return anchorFilm + (audio.currentTime - anchorCtx);
    return anchorFilm + (performance.now() - anchorPerf) / 1000;
  }
  function stopMusic() {
    for (const m of [music, nextMusic]) if (m) { try { m.stop(); } catch (_) {} }
    music = nextMusic = null;
  }
  function startMusic() {
    stopMusic();
    anchorFilm = filmTime; anchorPerf = performance.now();
    if (!audio || !S.music) return;
    const when = audio.currentTime + 0.06;
    anchorCtx = when;
    try { music = S.music.build(audio, master, cues, filmTime, when); } catch (err) { console.error('music', err); }
  }

  function play() {
    document.getElementById('poster').hidden = true;
    if (filmTime >= DURATION - 0.05) filmTime = 0;
    try {
      if (!audio) {
        audio = new (window.AudioContext || window.webkitAudioContext)();
        master = audio.createGain(); master.gain.value = muted ? 0 : 1; master.connect(audio.destination);
      }
      audio.resume();
    } catch (_) { audio = null; }
    startMusic();
    playing = true; stage.classList.remove('paused'); setIcons();
    requestAnimationFrame(tick);
  }
  function pause() {
    filmTime = clock(); playing = false; stopMusic();
    stage.classList.add('paused'); setIcons();
  }
  function seek(T) {
    filmTime = Math.max(0, Math.min(DURATION - 0.001, T));
    if (playing) startMusic();
    renderAt(filmTime); updateUI();
  }
  function tick() {
    if (!playing) return;
    let T = clock();
    // pre-schedule the next pass of the score so the loop is sample-accurate
    if (looping && audio && S.music && !nextMusic && T > DURATION - 0.6) {
      try { nextMusic = S.music.build(audio, master, cues, 0, anchorCtx + (DURATION - anchorFilm)); } catch (_) {}
    }
    if (T >= DURATION) {
      if (!looping) { filmTime = DURATION - 0.001; renderAt(filmTime); pause(); updateUI(); return; }
      anchorCtx += DURATION - anchorFilm; anchorPerf += (DURATION - anchorFilm) * 1000; anchorFilm = 0;
      music = nextMusic; nextMusic = null;
      T = clock();
    }
    filmTime = T;
    renderAt(filmTime); updateUI();
    requestAnimationFrame(tick);
  }

  // ---------- UI ----------
  const seekEl = document.getElementById('seek'), timeEl = document.getElementById('time');
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  function updateUI() {
    seekEl.value = String(Math.round((filmTime / DURATION) * 1000));
    timeEl.textContent = `${fmt(filmTime)} / ${fmt(DURATION)}`;
  }
  function setIcons() {
    document.getElementById('icoPlay').innerHTML = playing ? '<path d="M6 4h4v16H6zm8 0h4v16h-4z"/>' : '<path d="M6 4l14 8-14 8z"/>';
    document.getElementById('btnPlay').setAttribute('aria-label', playing ? 'Pause' : 'Play');
  }
  document.getElementById('poster').addEventListener('click', play);
  document.getElementById('btnPlay').addEventListener('click', () => (playing ? pause() : play()));
  canvas.addEventListener('click', () => (playing ? pause() : play()));
  seekEl.addEventListener('input', () => { document.getElementById('poster').hidden = true; seek((seekEl.value / 1000) * DURATION); });
  document.getElementById('btnLoop').addEventListener('click', (ev) => {
    looping = !looping; ev.currentTarget.setAttribute('aria-pressed', String(looping));
    if (!looping && nextMusic) { try { nextMusic.stop(); } catch (_) {} nextMusic = null; }
  });
  document.getElementById('btnMute').addEventListener('click', () => {
    muted = !muted; if (master) master.gain.value = muted ? 0 : 1;
    document.getElementById('icoMute').style.opacity = muted ? 0.4 : 1;
  });
  document.getElementById('btnFull').addEventListener('click', () => {
    try { document.fullscreenElement ? document.exitFullscreen() : stage.requestFullscreen().catch(() => {}); } catch (_) {}
  });
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' && e.code !== 'Space') return;
    if (e.code === 'Space' || e.key === 'k') { e.preventDefault(); playing ? pause() : play(); }
    if (e.key === 'ArrowRight') seek(filmTime + 5);
    if (e.key === 'ArrowLeft') seek(filmTime - 5);
  });
  window.addEventListener('resize', resize);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => renderAt(filmTime));

  // hook for offline export
  window.FILM = { duration: DURATION, cues, W, H, renderAt: (T) => { filmTime = T; renderAt(T); }, setResolution };

  filmTime = 26; // poster frame: the camp under the clouds
  resize();
  filmTime = 0;
  updateUI();
})();
