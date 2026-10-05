// Real Suno screenshots (1366x768) shown inside a Windows Chrome window, with red numbered markings.
// Marks are [x, y, width, height] in screenshot pixels (taken from the live page when the screenshots were captured).
(function () {
  const W = 1366, H = 768;
  const BASE = document.currentScript.dataset.base || "";

  const SHOTS = {
    home:     { img: "img/1-home.jpg",     url: "suno.com" },
    login:    { img: "img/2-login.jpg",    url: "suno.com" },
    "signed-simple":  { img: "img/3-signed-create.jpg", url: "suno.com/create" },
    "signed-lyrics":  { img: "img/4-signed-lyrics.jpg", url: "suno.com/create" },
    "signed-style":   { img: "img/5-signed-style.jpg", url: "suno.com/create" },
    "signed-results": { img: "img/6-signed-results.jpg", url: "suno.com/create" }
  };
  const MARKS = {
    login:    [1063, 20, 67, 40],
    google:   [508, 278, 350, 48],
    createNav: [13, 175, 222, 45],
    advanced:  [319, 72, 74, 40],
    lyricsBox: [264, 212, 403, 414],
    stylesBox: [264, 292, 403, 234],
    createBtn: [328, 640, 354, 50],
    playSong:  [738, 279, 86, 85],
    moreSong:  [1274, 298, 49, 48]
  };

  const pct = (v, total) => (v / total * 100) + "%";
  const PAD = 7;

  function frame(shotKey) {
    const s = SHOTS[shotKey];
    return `<div class="win">
      <div class="win-top">
        <div class="win-tab"><span class="win-fav">♪</span>Suno<span class="win-x">✕</span></div>
        <div class="win-ctrl" aria-hidden="true"><span>&#8212;</span><span>&#9744;</span><span class="close">&#10005;</span></div>
      </div>
      <div class="win-bar"><span class="win-nav" aria-hidden="true">&#8592; &#8594; &#8635;</span><span class="win-url">${s.url}</span></div>
      <div class="win-view"><img src="${BASE + s.img}" alt="" width="${W}" height="${H}" loading="lazy"></div>
    </div>`;
  }

  function markEl(key, n) {
    const [x, y, w, h] = MARKS[key];
    const el = document.createElement("span");
    el.className = "ring";
    el.dataset.key = key;
    el.style.left = pct(x - PAD, W); el.style.top = pct(y - PAD, H);
    el.style.width = pct(w + PAD * 2, W); el.style.height = pct(h + PAD * 2, H);
    if (n) el.dataset.n = n;
    return el;
  }

  // Static figures: <figure class="real" data-shot="home" data-marks="login:1" aria-label="..."></figure>
  document.querySelectorAll("[data-shot]").forEach((fig) => {
    fig.innerHTML = frame(fig.dataset.shot);
    const view = fig.querySelector(".win-view");
    (fig.dataset.marks || "").split(",").filter(Boolean).forEach((p) => {
      const [k, n] = p.split(":");
      view.appendChild(markEl(k.trim(), n && n.trim()));
    });
  });

  // ---------- the motion video ----------
  const host = document.getElementById("movie-host");
  if (!host) return;
  const captionEl = document.getElementById("movie-caption");
  const numEl = document.getElementById("movie-num");
  const progress = document.getElementById("movie-progress");
  const playBtn = document.getElementById("movie-play");

  const SCENES = [
    { shot: "home",     mark: "login",     cap: "נכנסים ל-suno.com ולוחצים Log in", click: true },
    { shot: "login",    mark: "google",    cap: "לוחצים Continue with Google ובוחרים את החשבון", click: true },
    { shot: "signed-simple", mark: "createNav", cap: "נכנסים למסך Create", click: true },
    { shot: "signed-simple", mark: "advanced", cap: "לוחצים Advanced", click: true },
    { shot: "signed-lyrics", mark: "lyricsBox", cap: "כותבים את מילות השיר בתיבת Lyrics" },
    { shot: "signed-style", mark: "stylesBox", cap: "בתיבת Styles כותבים את הסגנון" },
    { shot: "signed-style", mark: "createBtn", cap: "לוחצים Create", click: true },
    { shot: "signed-results", mark: "playSong", cap: "כשמופיעים שני שירים, לוחצים ▶ ומאזינים", click: true },
    { shot: "signed-results", mark: "moreSong", cap: "בשלוש הנקודות יש אפשרויות נוספות", click: true }
  ];

  host.innerHTML = frame("home");
  const view = host.querySelector(".win-view");
  const img = view.querySelector("img");
  img.loading = "eager";
  const cursor = document.createElement("span");
  cursor.className = "cursor";
  cursor.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 2l16 11-7 1.5L9.5 22z" fill="#fff" stroke="#111" stroke-width="1.5" stroke-linejoin="round"/></svg>';
  cursor.style.left = "50%"; cursor.style.top = "60%";
  view.appendChild(cursor);
  // preload frames so scene changes are instant
  Object.values(SHOTS).forEach((s) => { const i = new Image(); i.src = BASE + s.img; });

  progress.innerHTML = SCENES.map((_, i) => `<span data-i="${i}" title="שלב ${i + 1}"></span>`).join("");
  const reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  let run = 0, playing = false, current = 0;
  const sleep = (ms, id) => new Promise((res, rej) => setTimeout(() => (id === run ? res() : rej("stop")), ms));

  async function scene(i, id) {
    const sc = SCENES[i];
    view.querySelectorAll(".ring, .ripple").forEach((e) => e.remove());
    const src = BASE + SHOTS[sc.shot].img;
    if (!img.src.endsWith(src)) {
      img.classList.add("fade");
      await sleep(reduced ? 0 : 250, id);
      img.src = src;
      img.classList.remove("fade");
    }
    numEl.textContent = i + 1;
    captionEl.textContent = sc.cap;
    [...progress.children].forEach((p, j) => p.classList.toggle("on", j <= i));
    await sleep(reduced ? 150 : 600, id);
    const [x, y, w, h] = MARKS[sc.mark];
    cursor.style.left = pct(x + Math.min(w / 2, 90), W);
    cursor.style.top = pct(y + Math.min(h / 2, 30), H);
    await sleep(reduced ? 100 : 1000, id);
    view.appendChild(markEl(sc.mark, i + 1));
    if (sc.click) {
      const r = document.createElement("span");
      r.className = "ripple"; r.style.left = cursor.style.left; r.style.top = cursor.style.top;
      view.appendChild(r);
    }
    await sleep(2200, id);
  }

  async function playFrom(i) {
    const id = ++run; playing = true; playBtn.textContent = "השהיה ❚❚";
    try {
      for (current = i; current < SCENES.length; current++) await scene(current, id);
      playing = false; playBtn.textContent = "נגן שוב ▶"; current = 0;
    } catch (e) { /* stopped */ }
  }

  playBtn.addEventListener("click", () => {
    if (playing) { run++; playing = false; playBtn.textContent = "המשך ▶"; }
    else playFrom(current);
  });
  document.getElementById("movie-restart").addEventListener("click", () => playFrom(0));
  progress.addEventListener("click", (e) => { const i = e.target.dataset.i; if (i !== undefined) playFrom(+i); });

  numEl.textContent = 1;
  captionEl.textContent = "לוחצים ▶ וצופים איך יוצרים שיר";
})();
