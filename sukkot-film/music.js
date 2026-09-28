/* Sukkot film: original score, synthesized entirely with WebAudio.
 * Rooted in D: Ahava Rabbah (freygish) and Misheberach modes, resolving to D major.
 * Deterministic (no Math.random), no samples, no network.
 * Works on AudioContext (lookahead scheduler) and OfflineAudioContext (all at once). */
(function () {
  const S = (window.SUKKOT = window.SUKKOT || { scenes: {} });

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // hash-based random from a number (stable regardless of seek offset)
  function hr(x) { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // ---------- chords (MIDI) ----------
  const CH = {
    // freygish on D
    D: [50, 57, 62, 66], Cm: [48, 55, 60, 63], Gm: [43, 50, 55, 58], Eb: [51, 58, 63, 67],
  };

  function build(ctx, dest, cues, offset, when) {
    offset = Math.max(0, offset || 0);
    if (when == null) when = ctx.currentTime;
    const T = (t) => when + (t - offset);
    const isOffline = typeof OfflineAudioContext !== 'undefined' && ctx instanceof OfflineAudioContext;
    const sr = ctx.sampleRate;
    const live = new Set();
    const allNodes = [];
    let stopped = false;

    // ---------- shared buffers (cached per context) ----------
    const cache = (ctx.__sukkotMusic = ctx.__sukkotMusic || {});
    if (!cache.noise) {
      const r = mulberry32(90210);
      const b = ctx.createBuffer(1, Math.floor(sr * 2), sr);
      const d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1;
      cache.noise = b;
    }
    if (!cache.ir) {
      const r = mulberry32(5786);
      const len = Math.floor(sr * 3.6), pre = Math.floor(sr * 0.018);
      const b = ctx.createBuffer(2, len, sr);
      for (let ch = 0; ch < 2; ch++) {
        const d = b.getChannelData(ch);
        let y = 0;
        for (let i = 0; i < len; i++) {
          if (i < pre) { d[i] = 0; continue; }
          const u = (i - pre) / (len - pre);
          const x = r() * 2 - 1;
          const a = 0.55 - 0.47 * Math.sqrt(u); // darker as it decays
          y += a * (x - y);
          const early = i - pre < sr * 0.08 && r() < 0.004 ? (r() * 2 - 1) * 1.5 : 0;
          d[i] = (y * 1.6 + early) * Math.exp(-6.2 * u) * Math.min(1, (i - pre) / (sr * 0.01));
        }
      }
      cache.ir = b;
    }
    const NOISE = cache.noise;

    // ---------- master chain ----------
    const keep = (n) => { allNodes.push(n); return n; };
    const out = keep(ctx.createGain()); out.gain.value = 1; out.connect(dest);
    const limiter = keep(ctx.createDynamicsCompressor());
    limiter.threshold.value = -3; limiter.knee.value = 0; limiter.ratio.value = 20;
    limiter.attack.value = 0.001; limiter.release.value = 0.08;
    limiter.connect(out);
    const comp = keep(ctx.createDynamicsCompressor());
    comp.threshold.value = -20; comp.knee.value = 12; comp.ratio.value = 2.5;
    comp.attack.value = 0.02; comp.release.value = 0.3;
    const trim = keep(ctx.createGain()); trim.gain.value = 0.62;
    comp.connect(trim); trim.connect(limiter);
    const tone = keep(ctx.createBiquadFilter()); // tame harsh highs
    tone.type = 'highshelf'; tone.frequency.value = 6500; tone.gain.value = -5;
    tone.connect(comp);
    const hp = keep(ctx.createBiquadFilter()); hp.type = 'highpass'; hp.frequency.value = 28; hp.Q.value = 0.6;
    hp.connect(tone);
    const mix = keep(ctx.createGain()); mix.gain.value = 1; mix.connect(hp);
    const verb = keep(ctx.createConvolver()); verb.buffer = cache.ir;
    const verbOut = keep(ctx.createGain()); verbOut.gain.value = 0.9;
    const verbIn = keep(ctx.createGain()); verbIn.gain.value = 1;
    verbIn.connect(verb); verb.connect(verbOut); verbOut.connect(mix);

    // piecewise-linear automation in film time, seek-aware
    function autom(p, pts) {
      pts = pts.slice().sort((a, b) => a[0] - b[0]);
      let v = pts[0][1];
      if (offset >= pts[pts.length - 1][0]) v = pts[pts.length - 1][1];
      else for (let i = 0; i < pts.length - 1; i++) {
        const [t0, v0] = pts[i], [t1, v1] = pts[i + 1];
        if (offset >= t0 && offset < t1) { v = v0 + (v1 - v0) * ((offset - t0) / Math.max(1e-6, t1 - t0)); break; }
      }
      p.cancelScheduledValues(0);
      p.setValueAtTime(v, when);
      for (const [t, val] of pts) if (t > offset) p.linearRampToValueAtTime(val, T(t));
    }

    // ---------- event queue ----------
    const events = [];
    // span = how long the event lasts (film s). fn(s, late): s = ctx start time, late = seconds already elapsed
    function ev(t, span, fn) {
      if (t + span <= offset) return;
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
      const n = ctx.createBufferSource(); n.buffer = NOISE; n.loop = true; n._off = hr(seed) * 1.8;
      this.src.push(n); return n;
    };
    V.prototype.g = function (v) { const g = ctx.createGain(); g.gain.value = v == null ? 1 : v; this.nodes.push(g); return g; };
    V.prototype.f = function (type, f, q) {
      const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q;
      this.nodes.push(b); return b;
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
      g.gain.linearRampToValueAtTime(depth, s + (delay || 0.01));
      return g;
    }
    // sustain envelope: attack a, gate (held until s+gate), release time constant rel/5, returns stop time
    function sus(p, s, gate, a, rel, peak) {
      a = Math.min(a, gate * 0.9);
      p.setValueAtTime(0, s);
      p.linearRampToValueAtTime(peak, s + a);
      p.setValueAtTime(peak, s + gate);
      p.setTargetAtTime(0, s + gate, rel / 5);
      return s + gate + rel + 0.05;
    }
    function perc(p, s, peak, tau, a) {
      a = a || 0.003;
      p.setValueAtTime(0, s);
      p.linearRampToValueAtTime(peak, s + a);
      p.setTargetAtTime(0, s + a, tau);
      return s + a + tau * 6;
    }

    // ---------- instruments ----------
    // drone: two detuned saws through a slowly breathing low-pass
    function drone(t, dur, m, g, out, cut) {
      ev(t, dur, (s, late) => {
        const gate = dur - late; if (gate < 0.3) return;
        const v = new V(), f = mtof(m);
        const o1 = v.osc('sawtooth', f, -7), o2 = v.osc('sawtooth', f, 6), o3 = v.osc('sine', f);
        const lp = v.f('lowpass', cut || 260, 0.9), amp = v.g(0), g3 = v.g(0.8);
        o1.connect(lp); o2.connect(lp); o3.connect(g3); g3.connect(amp); lp.connect(amp); amp.connect(out);
        lfo(v, 0.07 + hr(m) * 0.05, (cut || 260) * 0.45, [lp.frequency], s, 3);
        const e = sus(amp.gain, s, gate, late > 0 ? 0.4 : Math.min(5, gate * 0.3), 3, g);
        v.play(s, e);
      });
    }
    // pad: detuned oscillators per chord note through one low-pass (swell)
    function pad(t, dur, ms, g, out, o) {
      o = o || {};
      const rel = o.rel == null ? 2.2 : o.rel;
      ev(t, dur + rel, (s, late) => {
        const gate = dur - late; if (gate < 0.15) return;
        const v = new V(), cut = o.cut || 1100;
        const lp = v.f('lowpass', cut, o.q == null ? 0.5 : o.q), amp = v.g(0);
        lp.connect(amp); amp.connect(out);
        const type = o.type || 'sawtooth', det = o.det == null ? 7 : o.det;
        for (let i = 0; i < ms.length; i++) {
          const f = mtof(ms[i]);
          const a = v.osc(type, f, -det - hr(ms[i] + i) * 3), b = v.osc(type, f, det + hr(ms[i] * 3) * 3);
          a.connect(lp); b.connect(lp);
        }
        const att = late > 0 ? 0.3 : (o.a == null ? gate * 0.4 : o.a);
        lp.frequency.setValueAtTime(cut * 0.55, s);
        lp.frequency.linearRampToValueAtTime(cut, s + Math.min(gate, att * 1.5 + 0.01));
        if (o.trem) {
          const tg = v.g(1); lp.disconnect(); lp.connect(tg); tg.connect(amp);
          lfo(v, o.trem, 0.35, [tg.gain], s, 1);
        }
        const e = sus(amp.gain, s, gate, att, rel, g / Math.sqrt(ms.length * 2));
        v.play(s, e);
      });
    }
    // ney / clarinet: saw + triangle, low-pass, delayed vibrato, breath noise, small scoop into the note
    function ney(t, dur, m, g, out, o) {
      o = o || {};
      const rel = o.rel || 0.28;
      ev(t, dur + rel, (s, late) => {
        const gate = dur - late; if (gate < 0.06) return;
        const v = new V(), f = mtof(m);
        const o1 = v.osc('sawtooth', f), o2 = v.osc('triangle', f, 3);
        if (!late && o.scoop !== false) {
          for (const x of [o1, o2]) {
            x.frequency.setValueAtTime(f * 0.972, s);
            x.frequency.exponentialRampToValueAtTime(f, s + 0.09);
          }
        }
        const cut = Math.min(o.cut || f * 3, 3200);
        const lp = v.f('lowpass', cut, 0.9), amp = v.g(0), og = v.g(0.35), tg = v.g(0.9);
        o1.connect(og); og.connect(lp); o2.connect(tg); tg.connect(lp); lp.connect(amp); amp.connect(out);
        lfo(v, 5.1 + hr(t) * 0.8, o.vib == null ? 16 : o.vib, [o1.detune, o2.detune], s, Math.min(0.6, gate));
        if ((o.breath == null ? 0.12 : o.breath) > 0) {
          const n = v.noise(t * 7 + m), bp = v.f('bandpass', Math.min(f * 2, 2500), 1.4), ng = v.g(o.breath == null ? 0.12 : o.breath);
          n.connect(bp); bp.connect(ng); ng.connect(amp);
        }
        const e = sus(amp.gain, s, gate, late ? 0.05 : o.a || 0.08, rel, g);
        v.play(s, e);
      });
    }
    // brass: three detuned saws, filter opens on the attack
    function brass(t, dur, m, g, out, o) {
      o = o || {};
      const rel = o.rel || 0.18;
      ev(t, dur + rel, (s, late) => {
        const gate = dur - late; if (gate < 0.05) return;
        const v = new V(), f = mtof(m);
        const lp = v.f('lowpass', f, 1.1), amp = v.g(0);
        const oscs = [v.osc('sawtooth', f, -9), v.osc('sawtooth', f, 0), v.osc('sawtooth', f, 9)];
        for (const x of oscs) x.connect(lp);
        lp.connect(amp); amp.connect(out);
        const peakCut = Math.min(f * (o.bright || 4.5), 3400);
        lp.frequency.setValueAtTime(f * 1.1, s);
        lp.frequency.linearRampToValueAtTime(peakCut, s + 0.06);
        lp.frequency.setTargetAtTime(Math.min(f * 2.6, 2600), s + 0.06, 0.25);
        lfo(v, 5.6, o.vib == null ? 9 : o.vib, oscs.map((x) => x.detune), s, Math.min(0.35, gate));
        const e = sus(amp.gain, s, gate, 0.035, rel, g / 1.7);
        v.play(s, e);
      });
    }
    // pluck: oud / harp
    function pluck(t, m, g, out, o) {
      o = o || {};
      const dec = o.decay || 1.0;
      ev(t, 0.02, (s, late) => {
        if (late > 0.02) return;
        const v = new V(), f = mtof(m);
        const a = v.osc('triangle', f), b = v.osc('sawtooth', f, 4), bg = v.g(o.saw == null ? 0.3 : o.saw);
        const lp = v.f('lowpass', 1000, o.q == null ? 2.5 : o.q), amp = v.g(0);
        a.connect(lp); b.connect(bg); bg.connect(lp); lp.connect(amp); amp.connect(out);
        lp.frequency.setValueAtTime(Math.min(f * (o.bright || 7), 4200), s);
        lp.frequency.setTargetAtTime(Math.max(f * 1.3, 180), s, 0.06 + dec * 0.08);
        const e = perc(amp.gain, s, g, dec / 4, 0.002);
        v.play(s, e);
      });
    }
    // bell / celesta: FM pair plus an inharmonic partial
    function bell(t, m, g, out, o) {
      o = o || {};
      const dec = o.decay || 2.4;
      ev(t, 0.02, (s, late) => {
        if (late > 0.02) return;
        const v = new V(), f = mtof(m);
        const car = v.osc('sine', f), mod = v.osc('sine', f * (o.ratio || 3.5)), mg = v.g(0);
        mod.connect(mg); mg.connect(car.frequency);
        mg.gain.setValueAtTime(f * (o.index || 1.6), s);
        mg.gain.setTargetAtTime(0, s, dec * 0.12);
        const p = v.osc('sine', f * 2.756), pg = v.g(0);
        const amp = v.g(0);
        car.connect(amp); p.connect(pg); pg.connect(amp); amp.connect(out);
        perc(pg.gain, s, 0.25, dec * 0.07, 0.002);
        const e = perc(amp.gain, s, g, dec / 5, 0.003);
        v.play(s, e);
      });
    }
    function bass(t, dur, m, g, out, o) {
      o = o || {};
      ev(t, dur + 0.2, (s, late) => {
        const gate = dur - late; if (gate < 0.05) return;
        const v = new V(), f = mtof(m);
        const a = v.osc('triangle', f), b = v.osc('sine', f), lp = v.f('lowpass', o.cut || 420, 0.8), amp = v.g(0);
        a.connect(lp); b.connect(lp); lp.connect(amp); amp.connect(out);
        let e;
        if (o.sus) e = sus(amp.gain, s, gate, late ? 0.2 : o.a || 0.02, 0.4, g);
        else {
          amp.gain.setValueAtTime(0, s); amp.gain.linearRampToValueAtTime(g, s + 0.006);
          amp.gain.setTargetAtTime(g * 0.5, s + 0.006, 0.12);
          amp.gain.setTargetAtTime(0, s + gate, 0.03);
          e = s + gate + 0.2;
        }
        v.play(s, e);
      });
    }
    // frame drum low stroke
    function dum(t, g, out, pitch) {
      ev(t, 0.02, (s, late) => {
        if (late > 0.02) return;
        const v = new V(), p = pitch || 1;
        const o = v.osc('sine', 125 * p), amp = v.g(0);
        o.frequency.setValueAtTime(125 * p, s);
        o.frequency.exponentialRampToValueAtTime(58 * p, s + 0.13);
        o.connect(amp); amp.connect(out);
        const n = v.noise(t * 13), lp = v.f('lowpass', 700, 0.7), ng = v.g(0);
        n.connect(lp); lp.connect(ng); ng.connect(out);
        perc(ng.gain, s, g * 0.35, 0.025);
        const e = perc(amp.gain, s, g, 0.13);
        v.play(s, e);
      });
    }
    // frame drum rim / darbuka tek
    function tek(t, g, out) {
      ev(t, 0.02, (s, late) => {
        if (late > 0.02) return;
        const v = new V();
        const n = v.noise(t * 17), bp = v.f('bandpass', 2600, 1.1), amp = v.g(0);
        const o = v.osc('sine', 420), og = v.g(0);
        n.connect(bp); bp.connect(amp); amp.connect(out); o.connect(og); og.connect(out);
        perc(og.gain, s, g * 0.35, 0.02);
        const e = perc(amp.gain, s, g, 0.028);
        v.play(s, Math.max(e, s + 0.15));
      });
    }
    // big low drum / timpani-ish
    function boom(t, g, out) {
      ev(t, 0.02, (s, late) => {
        if (late > 0.03) return;
        const v = new V();
        const o = v.osc('sine', 82), amp = v.g(0);
        o.frequency.setValueAtTime(82, s); o.frequency.exponentialRampToValueAtTime(41, s + 0.5);
        o.connect(amp); amp.connect(out);
        const n = v.noise(t * 19), lp = v.f('lowpass', 260, 0.7), ng = v.g(0);
        n.connect(lp); lp.connect(ng); ng.connect(out);
        perc(ng.gain, s, g * 0.6, 0.12);
        const e = perc(amp.gain, s, g, 0.45, 0.006);
        v.play(s, e);
      });
    }
    function clap(t, g, out) {
      ev(t, 0.02, (s, late) => {
        if (late > 0.02) return;
        const v = new V();
        const n = v.noise(t * 23), bp = v.f('bandpass', 1250 + hr(t) * 200, 1.3), amp = v.g(0);
        n.connect(bp); bp.connect(amp); amp.connect(out);
        const p = amp.gain;
        p.setValueAtTime(0, s);
        for (let k = 0; k < 3; k++) {
          const tk = s + k * 0.011;
          p.linearRampToValueAtTime(g * (k === 2 ? 1 : 0.7), tk + 0.001);
          p.setTargetAtTime(0, tk + 0.001, k === 2 ? 0.05 : 0.003);
        }
        v.play(s, s + 0.4);
      });
    }
    function jingle(t, g, out) {
      ev(t, 0.02, (s, late) => {
        if (late > 0.02) return;
        const v = new V();
        const n = v.noise(t * 29), bp = v.f('bandpass', 5200, 2.2), amp = v.g(0);
        n.connect(bp); bp.connect(amp); amp.connect(out);
        const e = perc(amp.gain, s, g, 0.045, 0.002);
        v.play(s, e);
      });
    }
    // noise textures: pts are [filmTime, gain] points
    function texture(pts, out, o) {
      const t0 = pts[0][0], t1 = pts[pts.length - 1][0];
      ev(t0, t1 - t0, (s, late) => {
        const v = new V();
        const n = v.noise(t0 * 31 + (o.seed || 0));
        let node = n;
        for (const [type, f, q] of o.filters) { const b = v.f(type, f, q); node.connect(b); node = b; }
        if (o.sweep) {
          const b = v.nodes[v.nodes.length - 1];
          const sw = o.sweep; // [[t, f], ...] in film time
          let f0 = sw[0][1];
          for (let i = 0; i < sw.length - 1; i++) if (offset >= sw[i][0] && offset < sw[i + 1][0]) f0 = sw[i][1] + (sw[i + 1][1] - sw[i][1]) * (offset - sw[i][0]) / (sw[i + 1][0] - sw[i][0]);
          b.frequency.setValueAtTime(offset > sw[0][0] ? f0 : sw[0][1], s);
          for (const [tt, ff] of sw) if (tt > offset) b.frequency.exponentialRampToValueAtTime(ff, T(tt));
        }
        const amp = v.g(0); node.connect(amp); amp.connect(out);
        autom(amp.gain, pts);
        v.play(s, T(t1) + 0.05);
      });
    }

    function seq(notes, t0, beat, fn) {
      let t = t0;
      for (const [m, b] of notes) { if (m != null) fn(t, b * beat, m); t += b * beat; }
      return t;
    }

    // ---------- buses (one per cue, cross-faded) ----------
    const cs = (cues || []).slice().sort((a, b) => a.start - b.start);
    if (!cs.length) return { stop() {} };
    const filmEnd = cs[cs.length - 1].end;
    const WET = { 1: 0.55, 2: 0.32, 3: 0.5, 4: 0.42, 5: 0.28, 6: 0.5, 7: 0.3 };
    function mkBus(i) {
      const c = cs[i];
      const bus = keep(ctx.createGain());
      bus.connect(mix);
      const send = keep(ctx.createGain()); send.gain.value = WET[c.scene] || 0.35;
      bus.connect(send); send.connect(verbIn);
      const prev = cs[i - 1], next = cs[i + 1];
      const fin = prev ? Math.min(3, Math.max(0.3, prev.end - c.start)) : 0.02;
      const pts = [[c.start, 0], [c.start + fin, 1]];
      if (next) {
        const fo = Math.min(3, Math.max(0.3, c.end - next.start));
        pts.push([c.end - fo, 1], [c.end, 0]);
      } else pts.push([c.end, 1]);
      autom(bus.gain, pts);
      const pans = {};
      const at = (p) => {
        p = p || 0;
        if (!pans[p]) {
          if (!p || !ctx.createStereoPanner) pans[p] = bus;
          else { const sp = keep(ctx.createStereoPanner()); sp.pan.value = p; sp.connect(bus); pans[p] = sp; }
        }
        return pans[p];
      };
      return at;
    }

    // ---------- the score ----------
    const SCENES = {};

    // 1. Wilderness: drone, airy swells, solo ney in freygish
    SCENES[1] = (c, at) => {
      const s = c.start, e = c.end, D = e - s;
      boom(s + 0.15, 0.32, at());
      drone(s, D + 0.2, 38, 0.13, at(), 240);
      drone(s + 1.5, D - 1.3, 45, 0.07, at(0.15), 300);
      texture([[s, 0], [s + D * 0.3, 0.05], [s + D * 0.6, 0.025], [s + D * 0.85, 0.05], [e, 0.03]], at(-0.3), {
        filters: [['bandpass', 500, 3.5]], sweep: [[s, 380], [s + D * 0.4, 900], [s + D * 0.7, 520], [e, 800]], seed: 1,
      });
      const chords = [[50, 54, 57, 62], [43, 55, 58, 62], [48, 51, 55, 60], [50, 57, 62, 66]];
      const seg = D / chords.length;
      chords.forEach((ch, i) => pad(s + i * seg - (i ? 1 : 0), seg + (i ? 1.6 : 0.6), ch, 0.16, at(i % 2 ? 0.2 : -0.2),
        { cut: 900 + i * 150, a: seg * 0.5, rel: 2.5, det: 9 }));
      // airy high shimmer
      pad(s + D * 0.45, D * 0.55, [74, 78, 81], 0.035, at(0.3), { type: 'sine', a: 3, trem: 0.25, cut: 3000 });
      const mel = [[69, 2], [70, 1], [69, 1], [66, 1.5], [67, 0.5], [66, 1], [63, 1], [62, 3], [null, 0.5],
        [62, 0.5], [63, 0.5], [66, 0.5], [67, 1], [69, 1], [70, 0.5], [72, 0.5], [70, 1], [69, 4]];
      const beat = Math.max(0.5, (D - 4.4) / 21);
      seq(mel, s + 2.4, beat, (t, d, m) => ney(t, d * 0.97, m, 0.2, at(-0.1), { cut: 1900, breath: 0.16, vib: 18 }));
    };

    // 2. Building the sukkah: oud arpeggios, frame drum, warm clarinet
    SCENES[2] = (c, at) => {
      const s = c.start, D = c.end - s;
      const bar = D / 9, beat = bar / 4, e8 = beat / 2;
      const prog = ['D', 'D', 'Cm', 'D', 'Gm', 'D', 'Eb', 'Cm', 'D'];
      const pat = [0, 1, 2, 1, 3, 1, 2, 1];
      for (let i = 0; i < 9; i++) {
        const tb = s + i * bar, ch = CH[prog[i]], k = i / 8;
        for (let j = 0; j < 8; j++) pluck(tb + j * e8 + hr(tb + j) * 0.008, ch[pat[j]], 0.13 * (j % 2 ? 0.75 : 1), at(-0.3), { decay: 0.9 });
        if (i >= 4) for (const j of [0, 3, 6]) pluck(tb + j * e8, ch[3] + 12, 0.05, at(0.35), { decay: 1.6, bright: 4 });
        bass(tb, beat * 1.8, ch[0] - 12, 0.2, at(), {});
        bass(tb + 2 * beat, beat * 1.6, ch[0] - 12 + (i % 2 ? 7 : 0), 0.16, at(), {});
        pad(tb, bar + 0.2, ch.slice(1), 0.09, at(0.1), { type: 'triangle', cut: 800 + 500 * k, a: 0.6, rel: 1 });
        if (i >= 1) {
          const lv = 0.3 + 0.7 * k;
          dum(tb, 0.34 * lv, at()); tek(tb + e8, 0.07 * lv, at(0.2)); tek(tb + 3 * e8, 0.07 * lv, at(0.2));
          dum(tb + 4 * e8, 0.26 * lv, at()); tek(tb + 6 * e8, 0.08 * lv, at(0.2));
          if (i >= 5) tek(tb + 7 * e8, 0.04 * lv, at(-0.2));
        }
      }
      const mel = [
        [69, 1], [66, 0.5], [67, 0.5], [69, 2],
        [67, 1], [63, 1], [67, 0.5], [70, 0.5], [69, 1],
        [66, 1.5], [63, 0.5], [62, 2],
        [62, 0.5], [67, 0.5], [70, 1], [69, 1], [67, 1],
        [69, 1], [74, 1], [72, 0.5], [70, 0.5], [69, 1],
        [67, 1], [70, 1], [67, 0.5], [66, 0.5], [63, 1],
        [63, 0.5], [66, 0.5], [67, 1], [66, 1], [63, 1],
        [62, 4],
      ];
      seq(mel, s + bar, beat, (t, d, m) => ney(t, d * 0.94, m, 0.17, at(0.05), { cut: 2300, breath: 0.1, vib: 14 }));
    };

    // 3. The four species: bells and celesta in the Misheberach mode, shimmering pad
    SCENES[3] = (c, at) => {
      const s = c.start, D = c.end - s;
      const bar = D / 9, beat = bar / 3, e8 = beat / 2;
      const C3 = { Dm: [62, 65, 69, 74], E: [64, 68, 71, 76], Am: [57, 64, 69, 72], F: [60, 65, 69, 72] };
      const prog = ['Dm', 'Dm', 'E', 'Am', 'Dm', 'F', 'E', 'Dm', 'Dm'];
      const pat = [0, 1, 2, 3, 2, 1];
      for (let i = 0; i < 9; i++) {
        const tb = s + i * bar, ch = C3[prog[i]];
        for (let j = 0; j < 6; j++) bell(tb + j * e8, ch[pat[j]], 0.06 * (j ? 0.8 : 1), at(j % 2 ? 0.35 : -0.35), { ratio: 3.5, index: 1.1, decay: 2.2 });
        pad(tb - 0.2, bar + 0.4, ch.map((m) => m - 12), 0.11, at(-0.1), { cut: 1000, a: bar * 0.4, rel: 1.6 });
        pad(tb, bar + 0.3, ch.slice(0, 3).map((m) => m + 12), 0.03, at(0.25), { type: 'sine', trem: 5.5, cut: 4000, a: 0.8, rel: 1.5 });
        bass(tb, bar * 0.95, ch[0] - 24 + (ch[0] < 60 ? 12 : 0), 0.14, at(), { sus: true, a: 0.1, cut: 300 });
        if (i >= 1) dum(tb, 0.12, at(), 0.9);
      }
      const mel = [
        [74, 1], [77, 1], [81, 1],
        [80, 1.5], [81, 0.5], [83, 1],
        [84, 2], [83, 0.5], [81, 0.5],
        [77, 1], [76, 1], [74, 1],
        [72, 1], [77, 1], [81, 1],
        [80, 2], [76, 1],
        [77, 1], [76, 1], [74, 1],
        [74, 3],
      ];
      seq(mel, s + bar, beat, (t, d, m) => {
        bell(t, m, 0.15, at(0.05), { ratio: 4, index: 0.7, decay: Math.min(3.2, 1.4 + d) });
        if (d >= 1.9 * beat) ney(t, d, m - 12, 0.05, at(-0.15), { cut: 1500, breath: 0.05, vib: 10, scoop: false });
      });
    };

    // 4. The sukkah at night: harp lullaby, clarinet, music box
    SCENES[4] = (c, at) => {
      const s = c.start, D = c.end - s;
      const bar = D / 8.5, beat = bar / 3, e8 = beat / 2, t0 = s + bar * 0.5;
      const C4 = { Dm: [50, 57, 62, 65], Gm: [43, 55, 58, 62], A: [45, 52, 57, 61], Bb: [46, 53, 58, 62] };
      const prog = ['Dm', 'Gm', 'A', 'Dm', 'Bb', 'Gm', 'A', 'Dm'];
      const pat = [0, 1, 2, 3, 2, 1];
      for (let j = 3; j < 6; j++) pluck(s + (j - 3) * e8, C4.Dm[pat[j]], 0.08, at(0.2), { decay: 2.2, bright: 4, q: 1.5 });
      pad(s, bar * 0.6, [57, 62, 65], 0.07, at(-0.1), { type: 'triangle', cut: 700, a: 0.5, rel: 1 });
      for (let i = 0; i < 8; i++) {
        const tb = t0 + i * bar, ch = C4[prog[i]];
        for (let j = 0; j < 6; j++) pluck(tb + j * e8, ch[pat[j]], 0.09 * (j ? 0.75 : 1), at(0.2), { decay: 2.4, bright: 4, q: 1.5 });
        pad(tb - 0.15, bar + 0.3, ch.slice(1), 0.1, at(-0.15), { type: 'triangle', cut: 750, a: bar * 0.35, rel: 1.8 });
        bass(tb, bar * 0.95, ch[0] - 12, 0.13, at(), { sus: true, a: 0.08, cut: 260 });
      }
      const mel = [
        [69, 2], [65, 1],
        [67, 1.5], [69, 0.5], [70, 1],
        [69, 2], [64, 1],
        [65, 1], [64, 1], [62, 1],
        [74, 2], [72, 1],
        [70, 1.5], [69, 0.5], [67, 1],
        [76, 1.5], [74, 0.5], [73, 1],
        [74, 3],
      ];
      let k = 0;
      seq(mel, t0, beat, (t, d, m) => {
        ney(t, d * 0.96, m, 0.16, at(-0.05), { cut: 1350, breath: 0.07, vib: 12, a: 0.14, rel: 0.5 });
        if (t >= t0 + 4 * bar) bell(t, m + 12, 0.04, at(0.4), { ratio: 5, index: 0.5, decay: 1.8 });
        k++;
      });
    };

    // 5. Simchat Beit HaShoeva: 2/4 freygish dance, brass lead, rising energy
    SCENES[5] = (c, at) => {
      const s = c.start, D = c.end - s;
      const bar = D / 20, beat = bar / 2, e8 = beat / 2, x16 = beat / 4;
      const ST = { D: [62, 66, 69], Cm: [60, 63, 67], Gm: [62, 67, 70], Eb: [63, 67, 70] };
      const RT = { D: 38, Cm: 36, Gm: 43, Eb: 39 };
      const mprog = ['D', 'D', 'Cm', 'D', 'Gm', 'D', 'Cm', 'D', 'Cm', 'Gm', 'D', 'D', 'D', 'Eb', 'Cm', 'D'];
      const prog = ['D', 'D'].concat(mprog, ['D', 'D']);
      for (let i = 0; i < 20; i++) {
        const tb = s + i * bar, name = prog[i], k = Math.min(1, i / 17);
        const lv = 0.55 + 0.45 * k;
        if (i < 18) {
          dum(tb, 0.36 * lv, at()); dum(tb + 3 * x16, 0.22 * lv, at());
          tek(tb + 2 * x16, 0.08 * lv, at(0.2)); tek(tb + 4 * x16, 0.1 * lv, at(0.2)); tek(tb + 6 * x16, 0.08 * lv, at(-0.2));
          if (i >= 4) tek(tb + 7 * x16, 0.05 * lv, at(-0.2));
          bass(tb, beat * 0.5, RT[name], 0.24, at(), {});
          bass(tb + beat, beat * 0.5, RT[name] + 7, 0.2, at(), {});
          for (const j of [1, 3]) for (const m of ST[name]) pluck(tb + j * e8, m, 0.05, at(m % 2 ? 0.3 : -0.3), { decay: 0.35, bright: 5, saw: 0.6 });
          if (i >= 6) clap(tb + beat, 0.16 * lv, at(0.1));
          if (i >= 12) clap(tb, 0.12, at(-0.1));
          if (i >= 8) for (const j of [1, 3]) jingle(tb + j * e8, 0.035 * lv, at(0.4));
          if (i % 4 === 0) boom(tb, 0.3, at());
        }
        if (i % 2 === 0 && i < 18) pad(tb, bar * 2 + 0.1, ST[name].map((m) => m - 12), 0.07, at(-0.2), { cut: 1100 + 900 * k, a: 0.3, rel: 0.8 });
      }
      const mel = [
        [69, .5], [74, .5], [74, .5], [75, .5],
        [78, 1], [75, .5], [74, .5],
        [75, .5], [74, .5], [72, .5], [70, .5],
        [69, 1.5], [null, .5],
        [67, .5], [70, .5], [74, .5], [79, .5],
        [78, .5], [79, .5], [81, 1],
        [79, .5], [78, .5], [75, .5], [74, .5],
        [74, 1.5], [null, .5],
        [72, .5], [75, .5], [79, .5], [75, .5],
        [74, 1], [72, .5], [70, .5],
        [69, .5], [70, .5], [72, .5], [70, .5],
        [69, 1.5], [null, .5],
        [69, .5], [74, .5], [78, .5], [81, .5],
        [79, .5], [78, .5], [75, .5], [78, .5],
        [75, .5], [74, .5], [72, .5], [75, .5],
        [74, 1.5], [null, .5],
      ];
      const t2 = s + 2 * bar, t10 = s + 10 * bar;
      seq(mel, t2, beat, (t, d, m) => {
        brass(t, d * 0.86, m, 0.16, at(0.05), { bright: 4 });
        if (t >= t10) brass(t, d * 0.86, m - 12, 0.08, at(-0.25), { bright: 3 });
      });
      // cymbal swell into the big hit
      texture([[s + 14 * bar, 0], [s + 18 * bar - 0.02, 0.05], [s + 18 * bar + 0.01, 0.06], [s + 18 * bar + 1.5, 0]], at(0.1),
        { filters: [['highpass', 3500, 0.7], ['lowpass', 8000, 0.5]], seed: 5 });
      const th = s + 18 * bar;
      boom(th, 0.42, at());
      for (const m of [62, 66, 69, 74]) brass(th, bar * 1.2, m, 0.09, at(m % 2 ? 0.25 : -0.25), { rel: 1.2, bright: 3.5 });
      pad(th, bar * 1.6, [50, 57, 62, 66], 0.12, at(), { cut: 1600, a: 0.05, rel: 1.4 });
      bass(th, bar * 1.6, 38, 0.22, at(), { sus: true, a: 0.01 });
    };

    // 6. Prayer for rain: minor chorale, rain swell, breaking into D major
    SCENES[6] = (c, at) => {
      const s = c.start, e = c.end, D = e - s;
      const cl = D / 8, beat = cl / 2;
      const chords = [[50, 53, 57, 62], [46, 50, 53, 58], [43, 50, 55, 58], [45, 52, 55, 61],
        [50, 54, 57, 62], [43, 50, 55, 59], [45, 52, 57, 61], [50, 57, 62, 66]];
      for (let i = 0; i < 8; i++) {
        const tb = s + i * cl, maj = i >= 4, ch = chords[i];
        pad(tb - 0.1, cl + 0.4, ch, maj ? 0.2 : 0.18, at(i % 2 ? 0.15 : -0.15),
          { cut: maj ? 1300 + i * 80 : 650, a: cl * 0.45, rel: 1.8, det: 6 });
        bass(tb, cl * 0.95, ch[0] - 12, 0.14, at(), { sus: true, a: 0.3, cut: 240 });
        if (maj) pad(tb, cl + 0.3, ch.slice(1).map((m) => m + 12), 0.03, at(0.3), { type: 'sine', trem: 4.5, cut: 4000, a: 0.8 });
      }
      texture([[s, 0], [s + D * 0.25, 0.035], [s + D * 0.5, 0.07], [s + D * 0.75, 0.05], [e, 0.035]], at(0.2),
        { filters: [['highpass', 1400, 0.6], ['lowpass', 5200, 0.6]], seed: 6 });
      texture([[s, 0], [s + D * 0.4, 0.09], [s + D * 0.6, 0.06], [e, 0.03]], at(-0.2),
        { filters: [['lowpass', 700, 0.6]], seed: 7 });
      texture([[s + D * 0.22, 0], [s + D * 0.28, 0.22], [s + D * 0.45, 0]], at(),
        { filters: [['lowpass', 140, 0.8]], seed: 8 }); // distant thunder
      // raindrops as soft bells in the major part (seeded)
      const r = mulberry32(606);
      const penta = [74, 76, 78, 81, 83, 86];
      for (let t = s + D * 0.48; t < e - 0.8; t += 0.22 + r() * 0.45) {
        bell(t, penta[Math.floor(r() * penta.length)], 0.025 + r() * 0.02, at(r() * 1.2 - 0.6), { ratio: 5.2, index: 0.6, decay: 1.2 });
      }
      const minor = [[57, 2], [58, 1], [57, .5], [55, .5], [55, 1], [53, .5], [52, .5], [52, 1], [57, .5], [61, .5]];
      const major = [[66, 1], [69, 1], [71, 1.5], [69, .5], [73, 1], [76, .5], [74, .5], [74, 2]];
      seq(minor, s, beat, (t, d, m) => ney(t, d * 0.97, m, 0.19, at(-0.1), { cut: 850, breath: 0.04, vib: 14, a: 0.2, rel: 0.5 }));
      seq(major, s + 4 * cl, beat, (t, d, m) => ney(t, d * 0.96, m, 0.17, at(0.05), { cut: 2100, breath: 0.09, vib: 15, a: 0.12, rel: 0.6 }));
    };

    // 7. Simchat Torah: freilach, claps, big cadence, final D major chord with a long tail
    SCENES[7] = (c, at) => {
      const s = c.start, e = c.end;
      const C = e - 5;
      const nb = Math.max(3, Math.round((C - s) / (4 * 60 / 142)));
      const bar = (C - s) / nb, beat = bar / 4, e8 = beat / 2;
      const ST = { D: [62, 66, 69], G: [62, 67, 71], A7: [61, 64, 67] };
      const RT = { D: 38, G: 43, A7: 45 };
      const tprog = ['D', 'D', 'G', 'D', 'D', 'A7', 'A7', 'D'];
      const tune = [
        [[69, .5], [74, .5], [78, .5], [81, .5], [81, 1], [78, .5], [81, .5]],
        [[76, .5], [78, .5], [76, .5], [74, .5], [73, 1], [69, 1]],
        [[71, .5], [74, .5], [79, .5], [83, .5], [81, .5], [79, .5], [78, .5], [79, .5]],
        [[81, 1], [78, .5], [74, .5], [69, 2]],
        [[74, .5], [76, .5], [78, .5], [79, .5], [81, .5], [83, .5], [81, 1]],
        [[79, .5], [78, .5], [76, .5], [79, .5], [78, .5], [76, .5], [73, 1]],
        [[76, .5], [79, .5], [78, .5], [76, .5], [74, .5], [73, .5], [71, .5], [73, .5]],
        [[74, 1], [69, 1], [74, 2]],
      ];
      const cad = [[69, .5], [73, .5], [76, .5], [79, .5], [78, .5], [76, .5], [74, .5], [73, .5]];
      for (let i = 0; i < nb; i++) {
        const tb = s + i * bar, last = i === nb - 1;
        const name = last ? 'A7' : tprog[i % 8];
        const notes = last ? cad : tune[i % 8];
        const k = i / nb;
        // bulgar bass 3+3+2
        [0, 3, 6].forEach((p, j) => bass(tb + p * e8, e8 * (j < 2 ? 2.6 : 1.8), RT[name] + [0, 7, 12][j], 0.24, at(), {}));
        dum(tb, 0.36, at()); dum(tb + 3 * e8, 0.28, at());
        if (!last) { tek(tb + 5 * e8, 0.09, at(0.2)); tek(tb + 7 * e8, 0.08, at(-0.2)); dum(tb + 6 * e8, 0.22, at()); }
        else for (let j = 0; j < 16; j++) tek(tb + j * beat / 4, 0.04 + 0.1 * j / 15, at(j % 2 ? 0.25 : -0.25)); // roll
        for (const p of [2, 6]) {
          clap(tb + p * e8, 0.2, at(0.15)); clap(tb + p * e8 + 0.008, 0.1, at(-0.25));
          for (const m of ST[name]) pluck(tb + p * e8, m, 0.055, at(m % 2 ? 0.3 : -0.3), { decay: 0.3, bright: 5, saw: 0.6 });
        }
        for (let j = 1; j < 8; j += 2) jingle(tb + j * e8, 0.04, at(0.4));
        if (i % 4 === 0) boom(tb, 0.26, at());
        pad(tb, bar + 0.05, ST[name].map((m) => m - 12), 0.08, at(-0.2), { cut: 1400 + 800 * k, a: 0.15, rel: 0.4 });
        seq(notes, tb, beat, (t, d, m) => {
          ney(t, d * 0.9, m, 0.17, at(0.08), { cut: 3000, breath: 0.08, vib: 12, a: 0.03, rel: 0.12 });
          if (i >= 3) brass(t, d * 0.85, m - 12, 0.085, at(-0.2), { bright: 3.5 });
        });
      }
      // the final chord (title "Chag Sameach")
      const hold = Math.max(0.8, e - C - 3.2);
      boom(C, 0.5, at());
      texture([[C, 0], [C + 0.01, 0.07], [C + 1.2, 0.02], [C + 3.5, 0]], at(0.1),
        { filters: [['highpass', 3200, 0.7], ['lowpass', 7500, 0.5]], seed: 9 });
      for (const m of [62, 66, 69, 74]) brass(C, hold, m, 0.1, at(m % 2 ? 0.25 : -0.25), { rel: 2.6, bright: 3 });
      ney(C, hold, 74, 0.13, at(0.08), { cut: 2600, breath: 0.06, vib: 14, rel: 2.6 });
      pad(C, hold + 0.4, [38, 50, 57, 62, 66, 69, 74], 0.26, at(), { cut: 1700, a: 0.08, rel: 3.2, det: 8 });
      pad(C + 0.2, hold + 0.4, [78, 81, 86], 0.035, at(0.3), { type: 'sine', trem: 5, cut: 5000, a: 1.2, rel: 3 });
      bass(C, hold + 0.4, 38, 0.2, at(), { sus: true, a: 0.01 });
      [74, 78, 81, 86].forEach((m, j) => bell(C + j * 0.09, m, 0.07, at(j % 2 ? 0.35 : -0.35), { ratio: 3.5, index: 1, decay: 4 }));
    };

    cs.forEach((c, i) => {
      const f = SCENES[c.scene];
      if (!f || c.end <= offset) { if (f) { /* nothing to schedule */ } return; }
      const at = mkBus(i);
      f(c, at);
    });

    // master: fade to silence by the end of the film
    autom(out.gain, [[0, 1], [filmEnd - 2.8, 1], [filmEnd, 0]]);

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
    if (isOffline) pump(Infinity);
    else {
      pump(ctx.currentTime + 2.5);
      if (idx < events.length) timer = setInterval(() => { if (!stopped) pump(ctx.currentTime + 2.5); }, 200);
    }

    return {
      stop() {
        if (stopped) return;
        stopped = true;
        if (timer) { clearInterval(timer); timer = null; }
        for (const n of live) { try { n.onended = null; n.stop(); } catch (_) {} try { n.disconnect(); } catch (_) {} }
        live.clear();
        for (const n of allNodes) { try { n.disconnect(); } catch (_) {} }
      },
    };
  }

  S.music = { build };
})();
