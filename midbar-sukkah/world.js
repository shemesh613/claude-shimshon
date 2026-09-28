// The shared camp of Israel (Bamidbar 2-3), seen from above. East is up.
// Owned by beat 3 (the morph). B2 and B3 draw the camp through drawCamp so the seam matches.
(function () {
  const S = (window.MIDBAR = window.MIDBAR || { beats: {} });
  const fx = S.fx;
  const R = fx.rng(1948);

  // Tribes by side (east is up / negative y).
  const SIDES = {
    east: ['judah', 'issachar', 'zebulun'],
    south: ['reuben', 'simeon', 'gad'],
    west: ['ephraim', 'manasseh', 'benjamin'],
    north: ['dan', 'asher', 'naphtali'],
  };
  // Direction vectors in world space: east = up, south = right, west = down, north = left.
  const DIR = { east: [0, -1], south: [1, 0], west: [0, 1], north: [-1, 0] };

  const MISHKAN = { x: -30, y: -15, w: 60, h: 30 }; // 100 x 50 cubits courtyard, long axis east-west... drawn as a vertical rect below
  // With east up, the courtyard's long (east-west) axis is vertical.
  MISHKAN.x = -16; MISHKAN.y = -32; MISHKAN.w = 32; MISHKAN.h = 64;

  const TENTS = [];
  function addBlock(cx, cy, cols, rows, dx, dy, tribe, ring, rot) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const jx = (R() - 0.5) * dx * 0.28, jy = (R() - 0.5) * dy * 0.28;
        TENTS.push({
          x: cx + (c - (cols - 1) / 2) * dx + jx,
          y: cy + (r - (rows - 1) / 2) * dy + jy,
          w: dx * (0.52 + R() * 0.12), h: dy * (0.42 + R() * 0.1),
          rot: rot + (R() - 0.5) * 0.18, tribe, ring,
        });
      }
    }
  }

  // Inner ring: Levites (Moses/Aaron east, Kehat south, Gershon west, Merari north)
  addBlock(0, -72, 7, 2, 12, 12, 'moshe-aharon', 0, 0);
  addBlock(62, 0, 2, 8, 12, 12, 'kehat', 0, Math.PI / 2);
  addBlock(0, 72, 7, 2, 12, 12, 'gershon', 0, 0);
  addBlock(-62, 0, 2, 8, 12, 12, 'merari', 0, Math.PI / 2);

  // Outer ring: 12 tribes, 3 per side
  for (const side of Object.keys(SIDES)) {
    const [ux, uy] = DIR[side];
    const horizontal = uy !== 0; // east/west sides run horizontally
    SIDES[side].forEach((tribe, k) => {
      const along = (k - 1) * 150; // centre tribe on the axis
      const out = 215;
      const cx = horizontal ? along : ux * out;
      const cy = horizontal ? uy * out : along;
      if (horizontal) addBlock(cx, cy, 9, 7, 15, 17, tribe, 1, 0);
      else addBlock(cx, cy, 7, 9, 17, 15, tribe, 1, Math.PI / 2);
    });
  }

  // The hero tent: in the camp of Judah, on the corner of its front row, facing the Mishkan
  // across open ground (beat 3 flies in low from that side, so the approach must be clear).
  let HERO = 0, best = 1e9;
  TENTS.forEach((t, i) => {
    if (t.tribe !== 'judah') return;
    const d = Math.hypot(t.x - (-88), t.y - (-158));
    if (d < best) { best = d; HERO = i; }
  });

  const CAM_CAMP = { x: 0, y: 0, zoom: 1.45 };

  function applyCam(ctx, cam, env) {
    ctx.translate(env.W / 2, env.H / 2);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);
  }
  function toScreen(cam, x, y, env) {
    return [(x - cam.x) * cam.zoom + env.W / 2, (y - cam.y) * cam.zoom + env.H / 2];
  }

  // Goat-hair tents: dark brown cloth with a lighter ridge and a soft shadow.
  function drawCamp(ctx, cam, opts, env) {
    const appear = (opts && opts.appear) || (() => 1);
    const night = (opts && opts.night) || 0;
    const glow = (opts && opts.glow) || 0;
    ctx.save();
    applyCam(ctx, cam, env);
    const cloth = fx.mixRGB([92, 62, 40], [38, 30, 44], night);
    const ridge = fx.mixRGB([196, 150, 96], [96, 84, 110], night);
    const shadow = fx.rgba([20, 12, 8], 0.28 * (1 - night * 0.5));

    // Mishkan courtyard: linen hangings (cream) with the tent of meeting inside.
    const m = MISHKAN;
    ctx.fillStyle = fx.rgba(fx.mixRGB([243, 230, 200], [150, 150, 175], night * 0.7), 0.95);
    ctx.fillRect(m.x, m.y, m.w, m.h);
    ctx.fillStyle = fx.rgba([214, 196, 160], 1 - night * 0.3);
    ctx.fillRect(m.x + 3, m.y + 3, m.w - 6, m.h - 6);
    ctx.fillStyle = fx.rgba(fx.mixRGB([110, 70, 50], [60, 40, 60], night), 1);
    ctx.fillRect(m.x + 8, m.y + 6, m.w - 16, m.h * 0.42);

    for (let i = 0; i < TENTS.length; i++) {
      const a = appear(i);
      if (a <= 0.002) continue;
      const t = TENTS[i];
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(t.rot);
      const s = 0.6 + 0.4 * a;
      ctx.scale(s, s);
      ctx.globalAlpha = a;
      ctx.fillStyle = shadow;
      ctx.fillRect(-t.w / 2 + 2.5, -t.h / 2 + 2.5, t.w, t.h);
      ctx.fillStyle = fx.rgba(cloth, 1);
      ctx.fillRect(-t.w / 2, -t.h / 2, t.w, t.h);
      ctx.strokeStyle = fx.rgba(ridge, 0.9);
      ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.moveTo(-t.w / 2, 0); ctx.lineTo(t.w / 2, 0); ctx.stroke();
      if (glow > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = fx.rgba([255, 170, 80], 0.22 * glow * a);
        ctx.fillRect(-t.w / 2, -t.h / 2, t.w, t.h);
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.restore();
    }
    ctx.restore();
  }

  S.world = { TENTS, MISHKAN, HERO, SIDES, CAM_CAMP, applyCam, toScreen, drawCamp };
})();
