// Shared upgrades for every lesson page (loaded after the shots*.js file):
// 1) static screenshots zoom in on their red rings, so the important spot is big and readable (also on phones)
// 2) the motion player zooms in on each step, has a big ▶ in the middle, and "הקודם / הבא" buttons
// 3) duplicate ring numbers in one picture show only once
(function () {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const narrow = () => window.matchMedia("(max-width: 700px)").matches;

  function ringBox(rings) {
    let x1 = 100, y1 = 100, x2 = 0, y2 = 0;
    rings.forEach((r) => {
      const l = parseFloat(r.style.left), t = parseFloat(r.style.top);
      const w = parseFloat(r.style.width), h = parseFloat(r.style.height);
      if ([l, t, w, h].some(isNaN)) return;
      x1 = Math.min(x1, l); y1 = Math.min(y1, t); x2 = Math.max(x2, l + w); y2 = Math.max(y2, t + h);
    });
    return x2 > x1 ? { x1, y1, x2, y2 } : null;
  }

  // Zoom a .win-view so the rings fill most of the frame. maxS = strongest zoom allowed.
  function zoom(view, maxS) {
    const b = ringBox([...view.querySelectorAll(".ring")]);
    if (!b) { reset(view); return; }
    const bw = b.x2 - b.x1, bh = b.y2 - b.y1;
    const s = clamp(Math.min(62 / bw, 62 / bh), 1, maxS);
    const cx = (b.x1 + b.x2) / 2, cy = (b.y1 + b.y2) / 2;
    const tx = clamp(50 - s * cx, 100 - 100 * s, 0);
    const ty = clamp(50 - s * cy, 100 - 100 * s, 0);
    view.style.setProperty("--z", s.toFixed(3));
    view.style.transform = s > 1.01 ? `translate(${tx}%, ${ty}%) scale(${s})` : "";
  }
  function reset(view) { view.style.transform = ""; view.style.setProperty("--z", 1); }

  // keep the zoom inside the picture (not over the window's title/address bar)
  function clip(view) {
    if (!view || view.parentElement.classList.contains("win-clip")) return;
    const c = document.createElement("div"); c.className = "win-clip";
    view.before(c); c.appendChild(view);
  }

  function dedupeNumbers(scope) {
    const seen = new Set();
    scope.querySelectorAll(".ring[data-n]").forEach((r) => {
      if (seen.has(r.dataset.n)) delete r.dataset.n; else seen.add(r.dataset.n);
    });
  }

  // ---------- static figures ----------
  document.querySelectorAll("figure.real").forEach((fig) => {
    const view = fig.querySelector(".win-view");
    if (!view) return;
    clip(view);
    dedupeNumbers(view);
    const apply = () => zoom(view, narrow() ? 2.6 : 1.9);
    apply();
    window.addEventListener("resize", apply);
  });

  // ---------- motion players ----------
  document.querySelectorAll(".player").forEach((root) => {
    const pick = (cls) => root.querySelector("." + cls) || root.querySelector("#" + cls);
    const host = pick("movie-host"), play = pick("movie-play"), progress = pick("movie-progress"), controls = root.querySelector(".controls");
    if (!host || !play || !progress) return;

    // zoom on every step
    const follow = () => {
      const view = host.querySelector(".win-view");
      if (!view) return;
      clip(view);
      if (view.querySelector(".ring")) zoom(view, narrow() ? 2.3 : 1.45);
    };
    const mo = new MutationObserver((list) => {
      const view = host.querySelector(".win-view");
      if (!view) return;
      for (const m of list) {
        if (m.type === "attributes" && m.target.tagName === "IMG") { reset(view); return; } // new screenshot: start wide
      }
      follow();
    });
    clip(host.querySelector(".win-view"));
    mo.observe(host, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });

    // big ▶ in the middle before the first play
    const big = document.createElement("button");
    big.type = "button"; big.className = "big-play"; big.setAttribute("aria-label", "הפעלת הסרטון");
    big.innerHTML = '<span aria-hidden="true">▶</span><b>לוחצים כאן לצפייה</b>';
    host.style.position = "relative";
    host.appendChild(big);
    big.addEventListener("click", () => play.click());
    play.addEventListener("click", () => big.remove());
    progress.addEventListener("click", () => big.remove());

    // הקודם / הבא
    if (controls) {
      const dots = () => [...progress.children];
      const current = () => Math.max(0, dots().filter((d) => d.classList.contains("on")).length - 1);
      const go = (d) => {
        const list = dots(); if (!list.length) return;
        const started = list.some((x) => x.classList.contains("on"));
        const i = started ? clamp(current() + d, 0, list.length - 1) : 0;
        big.remove(); list[i].click();
      };
      const mk = (label, cls, d) => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "btn ghost " + cls; b.textContent = label;
        b.addEventListener("click", () => go(d));
        return b;
      };
      const nav = document.createElement("div");
      nav.className = "step-nav";
      nav.append(mk("→ הקודם", "movie-prev", -1), mk("הבא ←", "movie-next", 1));
      controls.appendChild(nav);
    }
  });
})();
