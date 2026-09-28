/* "מהמדבר לסוכה": the original score, synthesized entirely with WebAudio.
 * D Ahava Rabbah (freygish: D Eb F# G A Bb C) in the desert, opening into warm D major in the sukkah.
 * Deterministic (seeded noise and reverb, no Math.random), no samples, no network.
 * Works on AudioContext (lookahead scheduler) and OfflineAudioContext (suspend/resume feeding).
 *
 * Loop seam: the piece begins and ends on the same pure glass tone (D5), at the same gain.
 * The closing tone is started at a time that puts a whole number of cycles before t = 54, and
 * stops exactly at 54, so pass N's tone hands over to pass N+1's tone (which starts at phase 0)
 * with a continuous waveform. The wind is at zero at the seam, and the reverb return fades out over
 * the last 0.6 s, so nothing is cut off. */
(function () {
  const S = (window.MIDBAR = window.MIDBAR || { beats: {} });

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hr(x) { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  const GLASS_M = 74;              // D5, the single grain
  const GLASS_F = mtof(GLASS_M);
  const G0 = 0.05;                 // glass gain at t = 0 and t = END (the seam)

  function build(ctx, dest, cues, offset, when) {
    offset = Math.max(0, offset || 0);
    if (when == null) when = ctx.currentTime;
    const cs = (cues || []).slice().sort((a, b) => a.start - b.start);
    const END = cs.length ? cs[cs.length - 1].end : 54;
    if (offset >= END) return { stop() {} };
    const T = (t) => when + (t - offset);
    const isOffline = typeof OfflineAudioContext !== 'undefined' && ctx instanceof OfflineAudioContext;
    const sr = ctx.sampleRate;
    const live = new Set();
    const allNodes = [];
    let stopped = false;

    // ---------- shared buffers (cached per context) ----------
    const cache = (ctx.__midbarMusic = ctx.__midbarMusic || {});
    if (!cache.noise) {
      const r = mulberry32(5717);
      const b = ctx.createBuffer(1, Math.floor(sr * 3), sr);
      const d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1;
      cache.noise = b;
    }
    if (!cache.ir) {
      const r = mulberry32(5787);
      const len = Math.floor(sr * 3.4), pre = Math.floor(sr * 0.022);
      const b = ctx.createBuffer(2, len, sr);
      for (let ch = 0; ch < 2; ch++) {
        const d = b.getChannelData(ch);
        let y = 0;
        for (let i = 0; i < len; i++) {
          if (i < pre) { d[i] = 0; continue; }
          const u = (i - pre) / (len - pre);
          const x = r() * 2 - 1;
          const a = 0.5 - 0.44 * Math.sqrt(u); // darker as it decays
          y += a * (x - y);
          const early = i - pre < sr * 0.09 && r() < 0.004 ? (r() * 2 - 1) * 1.3 : 0;
          d[i] = (y * 1.5 + early) * Math.exp(-5.6 * u) * Math.min(1, (i - pre) / (sr * 0.012));
        }
      }
      cache.ir = b;
    }
    const NOISE = cache.noise;

    // ---------- master chain ----------
    const keep = (n) => { allNodes.push(n); return n; };
    const out = keep(ctx.createGain()); out.gain.value = 1; out.connect(dest);
    const limiter = keep(ctx.createDynamicsCompressor());
    limiter.threshold.value = -4; limiter.knee.value = 0; limiter.ratio.value = 20;
    limiter.attack.value = 0.001; limiter.release.value = 0.1;
    limiter.connect(out);
    const trim = keep(ctx.createGain()); trim.gain.value = 0.9; trim.connect(limiter);
    const comp = keep(ctx.createDynamicsCompressor());
    comp.threshold.value = -22; comp.knee.value = 14; comp.ratio.value = 2.2;
    comp.attack.value = 0.03; comp.release.value = 0.35;
    comp.connect(trim);
    const tone = keep(ctx.createBiquadFilter());
    tone.type = 'highshelf'; tone.frequency.value = 7000; tone.gain.value = -4;
    tone.connect(comp);
    const hp = keep(ctx.createBiquadFilter()); hp.type = 'highpass'; hp.frequency.value = 30; hp.Q.value = 0.6;
    hp.connect(tone);
    const mix = keep(ctx.createGain()); mix.gain.value = 1; mix.connect(hp);
    const verb = keep(ctx.createConvolver()); verb.normalize = true; verb.buffer = cache.ir;
    const verbOut = keep(ctx.createGain()); verbOut.gain.value = 0.8;
    const verbIn = keep(ctx.createGain()); verbIn.gain.value = 1;
    verbIn.connect(verb); verb.connect(verbOut); verbOut.connect(mix);

    // piecewise-linear automation in absolute film time, seek-aware
    function autom(p, pts, exp) {
      let v = pts[0][1];
      if (offset >= pts[pts.length - 1][0]) v = pts[pts.length - 1][1];
      else for (let i = 0; i < pts.length - 1; i++) {
        const [t0, v0] = pts[i], [t1, v1] = pts[i + 1];
        if (offset >= t0 && offset < t1) { v = v0 + (v1 - v0) * ((offset - t0) / Math.max(1e-6, t1 - t0)); break; }
      }
      p.cancelScheduledValues(0);
      p.setValueAtTime(v, when);
      for (const [t, val] of pts) if (t > offset) {
        if (exp && val > 0) p.exponentialRampToValueAtTime(val, T(t)); else p.linearRampToValueAtTime(val, T(t));
      }
    }

    // ---------- output routing: (pan, reverb send) -> node ----------
    const outs = {};
    function at(pan, wet) {
      pan = Math.round((pan || 0) * 100) / 100;
      wet = wet == null ? 0.3 : wet;
      const key = pan + '|' + wet;
      if (outs[key]) return outs[key];
      const g = keep(ctx.createGain());
      let head = g;
      if (pan && ctx.createStereoPanner) { const sp = keep(ctx.createStereoPanner()); sp.pan.value = pan; g.connect(sp); head = sp; }
      head.connect(mix);
      if (wet > 0) { const s = keep(ctx.createGain()); s.gain.value = wet; head.connect(s); s.connect(verbIn); }
      return (outs[key] = g);
    }

    // ---------- event queue ----------
    const events = [];
    // fn(s, late): s = ctx start time, late = seconds of the event already elapsed at `offset`
    function ev(t, span, fn) {
      if (t >= END || t + span <= offset) return;
      const late = Math.max(0, offset - t);
      events.push({ t: t + late, fn: () => fn(T(t + late), late) });
    }

    // ---------- voice helper ----------
    function V() { this.src = []; this.nodes = []; }
    V.prototype.osc = function (type, f, detune) {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = f;
      if (detune) o.detune.value = detune;
      this.src.push(o); return o;
    };
    V.prototype.noise = function (seed) {
      const n = ctx.createBufferSource(); n.buffer = NOISE; n.loop = true; n._off = hr(seed) * 2.8;
      this.src.push(n); return n;
    };
    V.prototype.g = function (v) { const g = ctx.createGain(); g.gain.value = v == null ? 1 : v; this.nodes.push(g); return g; };
    V.prototype.f = function (type, f, q) {
      const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q;
      this.nodes.push(b); return b;
    };
    V.prototype.pan = function (p) {
      if (!ctx.createStereoPanner) return this.g(1);
      const sp = ctx.createStereoPanner(); sp.pan.value = p; this.nodes.push(sp); return sp;
    };
    V.prototype.play = function (s, e) {
      if (stopped) return;
      let left = this.src.length; const nodes = this.nodes;
      for (const n of this.src) {
        if (n._off != null) n.start(s, n._off); else n.start(s);
        n.stop(e); live.add(n);
        n.onended = () => {
          live.delete(n); try { n.disconnect(); } catch (_) {}
          if (--left === 0) for (const m of nodes) { try { m.disconnect(); } catch (_) {} }
        };
      }
    };
    function lfo(v, rate, depth, targets, s, delay) {
      const o = v.osc('sine', rate); const g = v.g(0);
      o.connect(g); for (const t of targets) g.connect(t);
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(depth, s + Math.max(0.01, delay || 0.01));
      return g;
    }
    function perc(p, s, peak, tau, a) {
      a = a || 0.003;
      p.setValueAtTime(0, s);
      p.linearRampToValueAtTime(peak, s + a);
      p.setTargetAtTime(0, s + a, tau);
      return s + a + tau * 7;
    }
    // attack / hold / release envelope for a note (ctx time)
    function adsr(p, s, gate, a, rel, peak, swell) {
      a = Math.min(a, gate * 0.8);
      p.setValueAtTime(0, s);
      p.linearRampToValueAtTime(peak, s + a);
      if (swell && gate > a + 0.4) p.linearRampToValueAtTime(peak * swell, s + a + (gate - a) * 0.6);
      p.linearRampToValueAtTime(peak * (swell ? swell * 0.92 : 1), s + gate);
      p.setTargetAtTime(0, s + gate, rel / 4);
      return s + gate + rel * 1.6 + 0.05;
    }

    // =====================================================================
    // instruments
    // =====================================================================

    // the glass tone: pure harmonic partials (phase-coherent across the loop seam), gain = pts
    function glass(t0, t1, pts, dst) {
      ev(t0, t1 - t0, (s, late) => {
        let ts = t0;
        if (late > 0) ts = t1 - Math.floor((t1 - offset) * GLASS_F) / GLASS_F; // keep the seam phase
        const v = new V();
        const amp = v.g(0); amp.connect(dst);
        const mixp = [[1, 1], [2, 0.16], [3, 0.045]];
        for (const [k, a] of mixp) { const o = v.osc('sine', GLASS_F * k); const g = v.g(a); o.connect(g); g.connect(amp); }
        autom(amp.gain, pts);
        v.play(T(Math.max(ts, offset)), T(t1));
      });
    }
    // soft glass / bell strike (inharmonic, short) and FM chime
    function bell(t, m, g, dst, o) {
      o = o || {};
      const dec = o.decay || 2.2;
      ev(t, 0.02, (s, late) => {
        if (late > 0.02) return;
        const v = new V(), f = mtof(m);
        const car = v.osc('sine', f), mod = v.osc('sine', f * (o.ratio || 3.5)), mg = v.g(0);
        mod.connect(mg); mg.connect(car.frequency);
        mg.gain.setValueAtTime(f * (o.index || 1.2), s);
        mg.gain.setTargetAtTime(0, s, dec * 0.1);
        const p = v.osc('sine', f * 2.756), pg = v.g(0);
        const amp = v.g(0);
        car.connect(amp); p.connect(pg); pg.connect(amp); amp.connect(dst);
        perc(pg.gain, s, o.part == null ? 0.22 : o.part, dec * 0.06, 0.002);
        const e = perc(amp.gain, s, g, dec / 5, o.a || 0.004);
        v.play(s, e);
      });
    }
    // flute / ney: sine + triangle + octave partial, breath noise, delayed vibrato, scoop or ornament
    function flute(t, dur, m, g, dst, o) {
      o = o || {};
      const rel = o.rel || 0.3;
      ev(t, dur + rel, (s, late) => {
        if (late > 0.05) return;
        const gate = dur, v = new V(), f = mtof(m);
        const o1 = v.osc('sine', f), o2 = v.osc('triangle', f, 2), o3 = v.osc('sine', f * 2, -3);
        const oscs = [o1, o2, o3];
        if (o.orn) { // upper-neighbour flick, a ney ornament
          const fu = mtof(m + o.orn);
          for (const [x, mult] of [[o1, 1], [o2, 1], [o3, 2]]) {
            x.frequency.setValueAtTime(fu * mult, s);
            x.frequency.setValueAtTime(fu * mult, s + 0.075);
            x.frequency.exponentialRampToValueAtTime(f * mult, s + 0.11);
          }
        } else if (o.scoop !== false) {
          for (const [x, mult] of [[o1, 1], [o2, 1], [o3, 2]]) {
            x.frequency.setValueAtTime(f * mult * 0.982, s);
            x.frequency.exponentialRampToValueAtTime(f * mult, s + 0.1);
          }
        }
        const lp = v.f('lowpass', Math.min(o.cut || f * 4, 5000), 0.7), amp = v.g(0);
        const g1 = v.g(1), g2 = v.g(0.32), g3 = v.g(o.bright == null ? 0.12 : o.bright);
        o1.connect(g1); o2.connect(g2); o3.connect(g3);
        g1.connect(lp); g2.connect(lp); g3.connect(lp); lp.connect(amp); amp.connect(dst);
        if (gate > 0.45) lfo(v, 4.9 + hr(t) * 0.6, o.vib == null ? 14 : o.vib, oscs.map((x) => x.detune), s + 0.25, Math.min(0.7, gate * 0.6));
        const br = o.breath == null ? 0.1 : o.breath;
        if (br > 0) {
          const n = v.noise(t * 7 + m), bp = v.f('bandpass', Math.min(f * 2.2, 4000), 1.1), ng = v.g(br);
          n.connect(bp); bp.connect(ng); ng.connect(amp);
          // attack chiff
          const hpN = v.f('highpass', 2500, 0.7), cg = v.g(0);
          n.connect(hpN); hpN.connect(cg); cg.connect(dst);
          perc(cg.gain, s, g * br * 1.4, 0.03, 0.01);
        }
        const e = adsr(amp.gain, s, gate, o.a || 0.09, rel, g, o.swell || 1.08);
        v.play(s, e);
      });
    }
    // plucked oud / kanun: triangle + saw through a closing low-pass, plus a pick noise
    function pluck(t, m, g, dst, o) {
      o = o || {};
      const dec = o.decay || 0.9;
      ev(t, 0.02, (s, late) => {
        if (late > 0.02) return;
        const v = new V(), f = mtof(m);
        const a = v.osc('triangle', f), b = v.osc('sawtooth', f, 5), bg = v.g(o.saw == null ? 0.35 : o.saw);
        const lp = v.f('lowpass', 1000, o.q == null ? 2 : o.q), amp = v.g(0);
        a.connect(lp); b.connect(bg); bg.connect(lp); lp.connect(amp); amp.connect(dst);
        lp.frequency.setValueAtTime(Math.min(f * (o.bright || 7), 5500), s);
        lp.frequency.setTargetAtTime(Math.max(f * 1.2, 200), s, 0.05 + dec * 0.09);
        const n = v.noise(t * 11 + m), nb = v.f('bandpass', Math.min(f * 4, 6000), 1.5), ng = v.g(0);
        n.connect(nb); nb.connect(ng); ng.connect(dst);
        perc(ng.gain, s, g * 0.25, 0.008, 0.001);
        const e = perc(amp.gain, s, g, dec / 4, 0.002);
        v.play(s, e);
      });
    }
    // warm pad: detuned oscillator pairs into one low-pass; env and cutoff are absolute-time points
    function pad(t0, t1, ms, g, dst, o) {
      o = o || {};
      ev(t0, t1 - t0, (s) => {
        const v = new V();
        const lp = v.f('lowpass', o.cut || 900, o.q == null ? 0.6 : o.q), amp = v.g(0);
        lp.connect(amp); amp.connect(dst);
        const type = o.type || 'sawtooth', det = o.det == null ? 8 : o.det;
        for (let i = 0; i < ms.length; i++) {
          const f = mtof(ms[i]);
          const a = v.osc(type, f, -det - hr(ms[i] + i) * 4), b = v.osc(type, f, det + hr(ms[i] * 3) * 4);
          a.connect(lp); b.connect(lp);
        }
        if (o.cutPts) autom(lp.frequency, o.cutPts, true);
        const k = g / Math.sqrt(ms.length * 2);
        autom(amp.gain, (o.env || [[t0, 0], [t0 + (o.a || 1), 1], [t1 - (o.r || 1.2), 1], [t1, 0]]).map(([tt, x]) => [tt, x * k]));
        if (o.trem) { lfo(v, o.trem, o.tremDepth || 0.25 * k, [amp.gain], T(Math.max(t0, offset)), 1.5); }
        v.play(T(Math.max(t0, offset)), T(t1) + 0.05);
      });
    }
    // choir "aah": three detuned saws per note, through parallel vowel formants
    function choir(t0, t1, ms, g, dst, o) {
      o = o || {};
      ev(t0, t1 - t0, (s) => {
        const v = new V();
        const sum = v.g(1), amp = v.g(0);
        for (let i = 0; i < ms.length; i++) {
          const f = mtof(ms[i]);
          for (const d of [-9, 0, 10]) { const x = v.osc('sawtooth', f, d + (hr(ms[i] * 7 + d) - 0.5) * 6); x.connect(sum); }
        }
        const forms = o.vowel === 'oo' ? [[380, 7, 1], [900, 9, 0.35], [2500, 12, 0.08]] : [[760, 6, 1], [1180, 8, 0.6], [2650, 11, 0.2]];
        for (const [f, q, a] of forms) { const b = v.f('bandpass', f, q), ga = v.g(a); sum.connect(b); b.connect(ga); ga.connect(amp); }
        const lp = v.f('lowpass', 520, 0.5), gl = v.g(0.45); sum.connect(lp); lp.connect(gl); gl.connect(amp);
        amp.connect(dst);
        const sStart = T(Math.max(t0, offset));
        const vib = v.osc('sine', 4.6), vg = v.g(0); vib.connect(vg);
        for (const x of v.src) if (x !== vib && x.detune) vg.connect(x.detune);
        vg.gain.setValueAtTime(0, sStart); vg.gain.linearRampToValueAtTime(9, sStart + 2);
        const k = g / Math.sqrt(ms.length * 3);
        autom(amp.gain, (o.env || [[t0, 0], [t0 + (o.a || 2), 1], [t1 - (o.r || 1.5), 1], [t1, 0]]).map(([tt, x]) => [tt, x * k]));
        v.play(sStart, T(t1) + 0.05);
      });
    }
    // low drone: saws + sine through a breathing low-pass
    function drone(t0, t1, m, g, dst, env, cut) {
      ev(t0, t1 - t0, (s) => {
        const v = new V(), f = mtof(m);
        const o1 = v.osc('sawtooth', f, -6), o2 = v.osc('sawtooth', f, 7), o3 = v.osc('sine', f), o4 = v.osc('sine', f / 2);
        const lp = v.f('lowpass', cut || 220, 1.2), amp = v.g(0), g3 = v.g(1.2), g4 = v.g(0.5);
        o1.connect(lp); o2.connect(lp); o3.connect(g3); o4.connect(g4); g3.connect(amp); g4.connect(amp); lp.connect(amp); amp.connect(dst);
        const sStart = T(Math.max(t0, offset));
        lfo(v, 0.09 + hr(m) * 0.05, (cut || 220) * 0.5, [lp.frequency], sStart, 3);
        autom(amp.gain, env.map(([tt, x]) => [tt, x * g]));
        v.play(sStart, T(t1) + 0.05);
      });
    }
    // noise textures: wind, whoosh, riser. gain pts, band-pass centre pts, optional pan pts
    function air(pts, fPts, dst, o) {
      o = o || {};
      const t0 = pts[0][0], t1 = pts[pts.length - 1][0];
      ev(t0, t1 - t0, (s) => {
        const v = new V();
        const n = v.noise(t0 * 31 + (o.seed || 0));
        const bp = v.f('bandpass', fPts[0][1], o.q || 1.2);
        let node = n;
        if (o.lp) { const l = v.f('lowpass', o.lp, 0.5); node.connect(l); node = l; }
        node.connect(bp); node = bp;
        if (o.q2) { const b2 = v.f('bandpass', fPts[0][1], o.q2); node.connect(b2); node = b2; autom(b2.frequency, fPts, true); }
        autom(bp.frequency, fPts, true);
        const amp = v.g(0); node.connect(amp);
        if (o.panPts && ctx.createStereoPanner) { const sp = v.pan(0); amp.connect(sp); sp.connect(dst); autom(sp.pan, o.panPts); }
        else amp.connect(dst);
        autom(amp.gain, pts);
        v.play(T(Math.max(t0, offset)), T(t1) + 0.02);
      });
    }
    function bass(t, dur, m, g, dst, o) {
      o = o || {};
      ev(t, dur + 0.6, (s, late) => {
        if (late > 0.05) return;
        const v = new V(), f = mtof(m);
        const a = v.osc('triangle', f), b = v.osc('sine', f), lp = v.f('lowpass', o.cut || 380, 0.7), amp = v.g(0);
        a.connect(lp); b.connect(lp); lp.connect(amp); amp.connect(dst);
        const e = adsr(amp.gain, s, dur, o.a || 0.05, o.rel || 0.5, g);
        v.play(s, e);
      });
    }
    // frame drum: low "dum"
    function dum(t, g, dst, pitch) {
      ev(t, 0.02, (s, late) => {
        if (late > 0.02) return;
        const v = new V(), p = pitch || 1;
        const o = v.osc('sine', 118 * p), amp = v.g(0);
        o.frequency.setValueAtTime(118 * p, s);
        o.frequency.exponentialRampToValueAtTime(62 * p, s + 0.16);
        o.connect(amp); amp.connect(dst);
        const n = v.noise(t * 13), lp = v.f('lowpass', 600 * p, 0.7), ng = v.g(0);
        n.connect(lp); lp.connect(ng); ng.connect(dst);
        perc(ng.gain, s, g * 0.3, 0.03);
        const e = perc(amp.gain, s, g, 0.16, 0.004);
        v.play(s, e);
      });
    }
    // rim "tek" (frame drum edge / darbuka)
    function tek(t, g, dst, bright) {
      ev(t, 0.02, (s, late) => {
        if (late > 0.02) return;
        const v = new V();
        const n = v.noise(t * 17), bp = v.f('bandpass', bright || 2300, 1.2), amp = v.g(0);
        const o = v.osc('sine', 380), og = v.g(0);
        n.connect(bp); bp.connect(amp); amp.connect(dst); o.connect(og); og.connect(dst);
        perc(og.gain, s, g * 0.3, 0.025);
        const e = perc(amp.gain, s, g, 0.032);
        v.play(s, Math.max(e, s + 0.15));
      });
    }
    // soft timpani-like swell hit
    function boom(t, g, dst) {
      ev(t, 0.02, (s, late) => {
        if (late > 0.03) return;
        const v = new V();
        const o = v.osc('sine', 74), amp = v.g(0);
        o.frequency.setValueAtTime(76, s); o.frequency.exponentialRampToValueAtTime(40, s + 0.9);
        o.connect(amp); amp.connect(dst);
        const n = v.noise(t * 19), lp = v.f('lowpass', 220, 0.7), ng = v.g(0);
        n.connect(lp); lp.connect(ng); ng.connect(dst);
        perc(ng.gain, s, g * 0.5, 0.2, 0.02);
        const e = perc(amp.gain, s, g, 0.7, 0.012);
        v.play(s, e);
      });
    }
    function seq(notes, t0, beat, fn) {
      let t = t0;
      for (const n of notes) { if (n[0] != null) fn(t, n[1] * beat, n[0], n[2]); t += n[1] * beat; }
      return t;
    }

    // =====================================================================
    // the score (absolute film time; cues follow CONTRACT: 0-14, 12-25, 23-33, 31-38, 36-45, 43-54)
    // =====================================================================
    const B70 = 60 / 70, B100 = 60 / 100;

    // --- the single grain: glass tone at the start, and again at the end (the loop seam) ---
    const gOut = at(0, 0.32);
    glass(0, 6.5, [[0, G0], [0.8, 0.085], [1.6, 0.075], [2.4, 0.06], [3.6, 0.045], [5, 0.02], [6.5, 0]], gOut);
    const tEnd = END - Math.round((END - 50.9) * GLASS_F) / GLASS_F; // whole cycles before END
    glass(tEnd, END, [[tEnd, 0], [tEnd + 0.9, 0.05], [51.8, 0.072], [52.6, 0.085], [53.3, 0.065], [END, G0]], gOut);
    bell(tEnd, GLASS_M, 0.05, at(0, 0.4), { ratio: 2.76, index: 0.4, decay: 2.5, part: 0.12, a: 0.03 });

    // --- 1.6-5: the grains burst into wind; desert drone on D ---
    air([[1.3, 0], [2.5, 0.2], [3.4, 0.12], [5.2, 0]], [[1.3, 260], [2.6, 2600], [3.6, 1400], [5.2, 700]], mix,
      { q: 0.8, seed: 1, panPts: [[1.3, -0.7], [3.2, 0.5], [5.2, 0.2]] });
    const verbWhoosh = at(0, 0.6);
    air([[1.5, 0], [2.6, 0.05], [5, 0]], [[1.5, 700], [2.8, 4200], [5, 2000]], verbWhoosh, { q: 1.4, seed: 2 });
    // swirling wind, two layers
    const windA = [[1.4, 0], [2.4, 0.09], [5, 0.08], [9, 0.05], [13, 0.04], [17, 0.018], [20, 0]];
    const walk = (seed, t0, t1, lo, hi, step) => {
      const r = mulberry32(seed), pts = [];
      for (let t = t0; t < t1; t += step * (0.7 + r() * 0.6)) pts.push([t, lo * Math.pow(hi / lo, r())]);
      pts.push([t1, lo * 1.5]);
      return pts;
    };
    air(windA, walk(11, 1.4, 20, 300, 1500, 0.9), mix, { q: 2.2, q2: 1.2, seed: 3, panPts: [[1.4, -0.4], [6, 0.3], [11, -0.3], [16, 0.4], [20, 0]] });
    air(windA.map(([t, g]) => [t + 0.3, g * 0.8]), walk(12, 1.7, 20.3, 220, 1100, 1.1), mix,
      { q: 2, q2: 1.4, seed: 4, panPts: [[1.7, 0.5], [7, -0.3], [12, 0.35], [17, -0.4], [20.3, 0]] });
    // the drone: D2 + A2, holds through the camp, dissolves into the transformation
    drone(1.8, 27, 38, 0.2, at(0, 0.2), [[1.8, 0], [5, 1], [14, 0.9], [22, 0.85], [25, 0.5], [27, 0]], 230);
    drone(3.5, 26, 45, 0.1, at(0.15, 0.25), [[3.5, 0], [7, 1], [21, 0.9], [26, 0]], 260);
    // a faint sustained ring of the grain's D over the fifth, fading into the journey
    pad(2.5, 12, [62, 69], 0.035, at(-0.2, 0.5), { type: 'sine', det: 3, env: [[2.5, 0], [5, 1], [9, 0.7], [12, 0]] });

    // --- 5-14: solo ney in D freygish (Ahava Rabbah); frame drum joins with the journey ---
    const neyOut = at(-0.08, 0.42);
    const ney1 = [[69, 2, 1], [70, 0.5], [69, 0.5], [66, 1], [67, 0.5], [66, 0.5], [63, 1, 1], [62, 2.5]];
    seq(ney1, 5.2, B70, (t, d, m, orn) => flute(t, d * 0.97, m, 0.13, neyOut, { orn, breath: 0.16, vib: 16, cut: 2600, bright: 0.08 }));
    const ney2 = [[62, 0.5], [63, 0.5], [66, 0.5], [67, 0.5], [69, 1.5, 1], [72, 0.5], [70, 0.5], [69, 0.5], [67, 1], [66, 0.5], [67, 0.5], [69, 2.5]];
    seq(ney2, 13.0, B70, (t, d, m, orn) => flute(t, d * 0.97, m, 0.12, neyOut, { orn, breath: 0.14, vib: 15, cut: 2800, bright: 0.09 }));
    const drum = at(0, 0.18);
    for (let t = 8.6, i = 0; t < 23.4; t += 4 * B70, i++) {
      const lv = Math.min(1, 0.45 + i * 0.12) * (t > 20 ? 0.7 : 1);
      dum(t, 0.26 * lv, drum);
      tek(t + 1.5 * B70, 0.035 * lv, at(0.25, 0.2));
      dum(t + 2 * B70, 0.15 * lv, drum, 1.1);
      tek(t + 3 * B70, 0.05 * lv, at(-0.2, 0.2));
      if (i >= 2) tek(t + 3.5 * B70, 0.025 * lv, at(0.3, 0.2));
    }

    // --- 12-25: the camp forms: oud and kanun arpeggios; 18-25 Clouds of Glory choir ---
    const FR = { D: [50, 57, 62, 66, 69], Cm: [48, 55, 60, 63, 67], Gm: [43, 55, 58, 62, 67], Eb: [51, 58, 63, 67, 70] };
    const campProg = ['D', 'Cm', 'D', 'Gm'];
    const barC = 4 * B70, e8 = B70 / 2;
    for (let i = 0; i < 4; i++) {
      const tb = 12.3 + i * barC, ch = FR[campProg[i]];
      const pat = [0, 2, 1, 3, 2, 4, 3, 2];
      for (let j = 0; j < 8; j++) {
        if (i === 0 && j % 2) continue;
        const tt = tb + j * e8 + hr(tb * 3 + j) * 0.01;
        if (tt > 24.2) continue;
        pluck(tt, ch[pat[j]], 0.075 * (j % 2 ? 0.7 : 1) * (0.8 + i * 0.1), at(-0.35, 0.3), { decay: 1.0 });
      }
      if (i >= 1) for (const j of [1, 4, 6]) {
        const tt = tb + j * e8 + 0.02;
        if (tt < 24) pluck(tt, ch[(j + i) % 5] + 12, 0.035, at(0.4, 0.4), { decay: 0.6, bright: 5, saw: 0.15, q: 3 });
      }
      bass(tb, barC * 0.9, ch[0] - 12, 0.1, at(0, 0.15), { a: 0.03, rel: 0.8 });
    }
    // kanun tremolo shimmer as the tents rise
    for (let t = 19.4, k = 0; t < 22.6; t += 0.107, k++) pluck(t, [74, 75, 74, 72][k % 4] + (k > 18 ? 5 : 0), 0.018 + 0.012 * (k / 30), at(0.5, 0.45), { decay: 0.35, bright: 6, saw: 0.1 });
    // Clouds of Glory: luminous "aah"
    const cloud = at(0.05, 0.6);
    choir(17.6, 25.4, [50, 57, 62, 66, 69], 0.2, cloud, { env: [[17.6, 0], [20.5, 0.75], [22.5, 0.9], [24.4, 1], [25.4, 0]] });
    choir(21.2, 25.6, [55, 62, 67, 70, 74], 0.13, at(-0.3, 0.6), { env: [[21.2, 0], [23.4, 0.8], [24.6, 1], [25.6, 0]] });
    pad(18.5, 25.5, [74, 78, 81], 0.03, at(0.35, 0.6), { type: 'sine', det: 4, trem: 0.3, env: [[18.5, 0], [21.5, 1], [24.5, 1], [25.5, 0]] });

    // --- 23-33: the transformation: rising pad, shimmering arpeggio, sparkles; resolves at 31 ---
    const trans = [
      [23.2, 25.2, [50, 57, 60, 62, 66]],     // D7 (freygish tonic)
      [25.0, 26.8, [43, 55, 58, 62, 67]],     // Gm
      [26.6, 28.4, [51, 58, 62, 67, 70]],     // Ebmaj7
      [28.2, 29.8, [48, 55, 60, 64, 67, 72]], // C major (the first warm colour)
      [29.6, 31.3, [45, 57, 61, 64, 67, 73]], // A7: the C# that opens into D major
    ];
    trans.forEach(([a, b, ms], i) => {
      pad(a, b + 0.4, ms, 0.18 + i * 0.02, at(i % 2 ? 0.2 : -0.2, 0.5),
        { a: 0.9, r: 0.6, cut: 700, cutPts: [[a, 600 + i * 350], [b + 0.4, 1000 + i * 450]], det: 9 });
      bass(a, b - a, ms[0] - 12, 0.11, at(0, 0.2), { a: 0.3, rel: 0.6, cut: 260 });
    });
    const shimmer = at(0.3, 0.55);
    {
      let k = 0;
      for (let t = 24.2; t < 30.95; k++) {
        const seg = trans.find(([a, b]) => t >= a && t < b - 0.15) || trans[trans.length - 1];
        const ms = seg[2].slice(1);
        const up = Math.floor((t - 24.2) / 1.7); // register climbs
        const m = ms[k % ms.length] + 12 * (1 + Math.min(1, Math.floor(k / ms.length) % 2)) + (up >= 3 ? 12 : 0);
        const lv = 0.02 + 0.035 * ((t - 24.2) / 6.8);
        bell(t, Math.min(m, 98), lv, k % 2 ? shimmer : at(-0.3, 0.55), { ratio: 3.01, index: 0.7, decay: 1.2, part: 0.1 });
        t += Math.max(0.105, 0.2 - (t - 24.2) * 0.014);
      }
    }
    // sparkle chimes as the lines are drawn (seeded)
    {
      const r = mulberry32(3131);
      const frey = [74, 75, 78, 79, 81, 82, 84, 86, 87, 90], maj = [81, 85, 86, 88, 90, 93];
      for (let t = 25.2; t < 30.8; t += 0.18 + r() * (0.55 - (t - 25) * 0.06)) {
        const pool = t > 29.6 ? maj : frey;
        bell(t, pool[Math.floor(r() * pool.length)], 0.012 + r() * 0.016, at(r() * 1.4 - 0.7, 0.7), { ratio: 5.1, index: 0.5, decay: 1.6, part: 0.3 });
      }
    }
    air([[26.4, 0], [30.6, 0.07], [31.05, 0.02], [31.6, 0]], [[26.4, 500], [30.8, 6500], [31.6, 7500]], at(0, 0.5), { q: 1.5, seed: 5 });
    choir(27.5, 31.4, [57, 64, 69, 73], 0.09, at(-0.1, 0.6), { vowel: 'oo', env: [[27.5, 0], [30.5, 1], [31.4, 0]] });

    // --- 31-38: inside the sukkah: warm D major, the flute again, now at home ---
    const warm = at(0, 0.45);
    boom(31.0, 0.18, at(0, 0.4));
    [86, 90, 93, 97].forEach((m, j) => bell(31.0 + j * 0.06, m, 0.028, at(j % 2 ? 0.35 : -0.35, 0.6), { ratio: 3.5, index: 0.8, decay: 3 }));
    const home = [
      [31.0, 33.6, [50, 57, 62, 64, 66, 69]], // D add9
      [33.4, 35.3, [43, 55, 59, 62, 67, 71]], // G
      [35.1, 37.7, [47, 54, 59, 62, 66, 69]], // Bm7
    ];
    home.forEach(([a, b, ms], i) => {
      pad(a, b + 0.3, ms, 0.2, at(i % 2 ? 0.15 : -0.15, 0.45), { cut: 850, a: i ? 0.6 : 0.25, r: 0.6, det: 7 });
      bass(a, b - a, ms[0] - 12, 0.12, at(0, 0.2), { a: 0.1, rel: 0.7, cut: 280 });
    });
    const neyWarm = at(0.05, 0.45);
    const tender = [[66, 1], [69, 1], [74, 1.5], [73, 0.5], [71, 1], [69, 0.5], [71, 0.5], [69, 2.2]];
    seq(tender, 31.7, B70, (t, d, m) => flute(t, d * 0.98, m, 0.13, neyWarm, { breath: 0.08, vib: 12, cut: 2400, a: 0.12, rel: 0.45, bright: 0.1 }));
    [[33.45, 55], [33.9, 59], [34.35, 62], [35.15, 59], [35.6, 62], [36.05, 66], [36.5, 69]].forEach(([t, m]) =>
      pluck(t, m, 0.045, at(0.35, 0.5), { decay: 1.8, bright: 4, saw: 0.15, q: 1.2 }));

    // --- 36-45: the four species, then the unity wave ---
    const sp = [
      [37.4, 39.1, [50, 57, 62, 66, 69]],     // D (lulav)
      [38.9, 40.6, [43, 55, 59, 62, 67]],     // G (hadasim)
      [40.4, 42.1, [47, 54, 59, 62, 66]],     // Bm (aravot)
      [41.9, 43.2, [45, 57, 62, 64, 67]],     // A sus4 -> (etrog)
    ];
    sp.forEach(([a, b, ms], i) => {
      pad(a, b + 0.35, ms, 0.14 + i * 0.015, at(i % 2 ? -0.1 : 0.1, 0.5), { cut: 900 + i * 150, a: 0.5, r: 0.5, det: 7 });
      bass(a, b - a, ms[0] - 12, 0.1, at(0, 0.2), { a: 0.15, rel: 0.5, cut: 260 });
    });
    pad(42.5, 43.3, [61, 64, 69], 0.05, at(0.1, 0.5), { cut: 1200, a: 0.3, r: 0.3 }); // sus resolves to the third
    // 37.5 lulav: a tall rising motif
    [[37.5, 62], [37.8, 69], [38.1, 74], [38.4, 76], [38.7, 78], [39.0, 81]].forEach(([t, m], j) =>
      pluck(t, m, 0.07 + j * 0.006, at(-0.4, 0.45), { decay: 1.4, bright: 5, saw: 0.3 }));
    flute(38.1, 1.4, 81, 0.05, at(-0.3, 0.5), { breath: 0.12, vib: 10, cut: 3500, scoop: false, a: 0.35 });
    // 39 hadasim: symmetric harmony, voices mirror outward from A
    choir(39.0, 41.2, [69], 0.06, at(0, 0.55), { env: [[39, 0], [39.4, 1], [40.8, 0.7], [41.2, 0]] });
    choir(39.5, 41.4, [67], 0.05, at(-0.5, 0.55), { env: [[39.5, 0], [39.9, 1], [41, 0.7], [41.4, 0]] });
    choir(39.5, 41.4, [71], 0.05, at(0.5, 0.55), { env: [[39.5, 0], [39.9, 1], [41, 0.7], [41.4, 0]] });
    bell(39.0, 81, 0.035, at(0, 0.5), { ratio: 3.5, index: 0.6, decay: 2 });
    bell(39.5, 79, 0.03, at(-0.5, 0.5), { ratio: 3.5, index: 0.6, decay: 2 });
    bell(39.5, 83, 0.03, at(0.5, 0.5), { ratio: 3.5, index: 0.6, decay: 2 });
    bell(40.0, 74, 0.03, at(-0.6, 0.5), { ratio: 3.5, index: 0.6, decay: 2 });
    bell(40.0, 86, 0.026, at(0.6, 0.5), { ratio: 3.5, index: 0.6, decay: 2 });
    // 40.5 aravot: a flowing, water-like figure
    [83, 81, 78, 76, 74, 73, 71, 73, 74, 76, 78, 81, 78, 76].forEach((m, j) =>
      pluck(40.5 + j * 0.14 + hr(j) * 0.01, m, 0.04, at(0.45 - j * 0.04, 0.5), { decay: 1.1, bright: 4, saw: 0.12, q: 1.2 }));
    // 42 etrog: a bright chime cluster
    [[42.0, 86], [42.07, 90], [42.14, 93], [42.21, 88], [42.3, 97], [42.42, 93]].forEach(([t, m], j) =>
      bell(t, m, 0.05 - j * 0.004, at(j % 2 ? 0.3 : -0.3, 0.6), { ratio: 3.5, index: 1.1, decay: 3.2, part: 0.25 }));
    air([[42.2, 0], [42.95, 0.035], [43.3, 0]], [[42.2, 1500], [43.1, 7000]], at(0, 0.5), { q: 1, seed: 6 });

    // 43-45 the unity wave; 43-51 the warm resolution and the melody's final statement
    boom(43.0, 0.2, at(0, 0.4));
    const res = [
      [43.0, 45.5, [38, 50, 57, 62, 66, 69, 74]], // D
      [45.4, 46.7, [43, 50, 55, 59, 62, 67]],     // G
      [46.6, 47.9, [42, 50, 57, 62, 66, 69]],     // D/F#
      [47.8, 49.7, [43, 55, 59, 62, 67, 71]],     // G
      [49.6, 50.35, [45, 55, 57, 61, 64, 69]],    // A7
    ];
    res.forEach(([a, b, ms], i) => {
      pad(a, b + 0.4, ms, 0.26 - i * 0.012, at(i % 2 ? 0.15 : -0.15, 0.45), { cut: 1500 - i * 80, a: i ? 0.4 : 0.9, r: 0.5, det: 8 });
      bass(a, b - a, ms[0] < 45 ? ms[0] : ms[0] - 12, 0.14, at(0, 0.2), { a: 0.06, rel: 0.6, cut: 300 });
    });
    choir(43.0, 50.6, [57, 62, 66, 69, 74], 0.17, at(0, 0.6), { env: [[43, 0], [44.2, 1], [46.5, 0.85], [49.5, 0.75], [50.6, 0]] });
    pad(43.3, 50.6, [78, 81, 86], 0.03, at(0.4, 0.6), { type: 'sine', det: 4, trem: 5, tremDepth: 0.006, env: [[43.3, 0], [45, 1], [49.6, 0.8], [50.6, 0]] });
    // light festive rhythm (maqsum on a hand drum, ~100 bpm), hinting at simcha, receding under the text
    for (let t = 43.0, i = 0; t < 49.3; t += 4 * B100, i++) {
      const lv = i === 0 ? 0.6 : Math.max(0.2, 1 - (t - 44) * 0.14);
      const d = at(0, 0.2);
      dum(t, 0.24 * lv, d, 1.25); tek(t + B100 / 2, 0.06 * lv, at(0.25, 0.25), 2800); tek(t + 1.5 * B100, 0.07 * lv, at(-0.25, 0.25), 2600);
      dum(t + 2 * B100, 0.2 * lv, d, 1.3); tek(t + 3 * B100, 0.07 * lv, at(0.25, 0.25), 2800); tek(t + 3.5 * B100, 0.035 * lv, at(-0.3, 0.25), 3200);
      for (const j of [1, 3, 5, 7]) {
        if (t + j * B100 / 2 > 48.2) continue;
        const ch = [62, 66, 69];
        for (const m of ch) pluck(t + j * B100 / 2, m, 0.022 * lv, at(m % 2 ? 0.3 : -0.3, 0.35), { decay: 0.4, bright: 5, saw: 0.5 });
      }
    }
    // the final statement: the opening phrase, now in D major, an octave higher, landing on the grain's D5
    const finale = [[81, 2], [83, 1], [81, 1], [78, 1.5], [79, 0.5], [78, 1], [76, 1]];
    const fOut = at(0.05, 0.45);
    const tLand = seq(finale, 45.4, B100, (t, d, m) => flute(t, d * 0.98, m, 0.14, fOut, { breath: 0.09, vib: 13, cut: 3600, a: 0.1, rel: 0.4, bright: 0.12 }));
    flute(tLand, 51.9 - tLand, GLASS_M, 0.13, fOut, { breath: 0.08, vib: 11, cut: 3000, a: 0.12, rel: 1.4, swell: 0.7, bright: 0.06 });
    // the home chord under the landing, dissolving into the single tone
    pad(tLand, 53.4, [38, 50, 57, 62, 66, 69], 0.22, at(0, 0.4), { cut: 1100, cutPts: [[tLand, 1300], [53.4, 380]], env: [[tLand, 0], [tLand + 0.3, 1], [51.2, 0.7], [52.5, 0.25], [53.4, 0]] });
    drone(tLand, 53.6, 38, 0.14, at(0, 0.2), [[tLand, 0], [tLand + 0.6, 1], [52, 0.6], [53.6, 0]], 200);

    // --- 51-54: back to the single grain: glass tone and a low wind that settles to nothing ---
    air([[50.6, 0], [51.8, 0.04], [52.8, 0.03], [53.7, 0.006], [END, 0]], walk(21, 50.6, END, 250, 800, 0.9), mix,
      { q: 1.8, q2: 1.1, seed: 7, panPts: [[50.6, -0.4], [52.3, 0.3], [END, 0]] });

    // reverb return fades over the last 0.6 s so no tail is cut at the seam
    autom(verbOut.gain, [[0, 0.8], [END - 0.6, 0.8], [END, 0]]);

    // ---------- dispatch ----------
    events.sort((a, b) => a.t - b.t);
    let idx = 0, timer = null;
    function pump(horizon) {
      while (idx < events.length && T(events[idx].t) < horizon) {
        try { events[idx].fn(); } catch (err) { if (typeof console !== 'undefined') console.error('music event', err); }
        idx++;
      }
      if (idx >= events.length && timer) { clearInterval(timer); timer = null; }
    }
    if (isOffline) {
      // feed voices a few seconds ahead of the render position via suspend/resume
      const q = 128 / sr, step = 2, ahead = 3;
      pump(when + ahead);
      const used = (ctx.__midbarSuspends = ctx.__midbarSuspends || new Set());
      const endT = idx < events.length ? T(events[events.length - 1].t) : 0;
      let ok = typeof ctx.suspend === 'function';
      if (ok) {
        try {
          for (let t = when + step; t < endT; t += step) {
            let fr = Math.round(t / q);
            while (used.has(fr)) fr++;
            const ts = fr * q;
            if (ts >= ctx.length / sr) break;
            used.add(fr);
            ctx.suspend(ts).then(() => { if (!stopped) pump(ts + ahead); ctx.resume(); });
          }
        } catch (_) { ok = false; }
      }
      if (!ok) pump(Infinity);
    } else {
      pump(ctx.currentTime + 2.5);
      if (idx < events.length) timer = setInterval(() => { if (!stopped) pump(ctx.currentTime + 2.5); }, 200);
    }

    return {
      stop() {
        if (stopped) return;
        stopped = true;
        if (timer) { clearInterval(timer); timer = null; }
        const now = ctx.currentTime;
        try { out.gain.cancelScheduledValues(0); out.gain.setValueAtTime(out.gain.value, now); out.gain.setTargetAtTime(0, now, 0.025); } catch (_) {}
        const kill = () => {
          for (const n of live) { try { n.onended = null; n.stop(); } catch (_) {} try { n.disconnect(); } catch (_) {} }
          live.clear();
          for (const n of allNodes) { try { n.disconnect(); } catch (_) {} }
        };
        if (isOffline || typeof setTimeout !== 'function') kill(); else setTimeout(kill, 160);
      },
    };
  }

  S.music = { build };
})();
