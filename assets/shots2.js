// Lesson 2: real Suno screenshots (cropped) with red numbered markings + a short motion video.
// Marks are [x, y, width, height] in the pixel size of each cropped screenshot.
(function () {
  const SHOTS = {
    create:  { img: "img/l2-1.jpg", w: 700, h: 695, url: "suno.com/create" },
    menu:    { img: "img/l2-2.jpg", w: 700, h: 695, url: "suno.com/create" },
    dialog:  { img: "img/l2-3.jpg", w: 540, h: 615, url: "suno.com/create" },
    file:    { img: "img/l2-file.jpg", w: 960, h: 600, url: "suno.com/create" },
    lyrics:  { img: "img/l2-5.jpg", w: 700, h: 695, url: "suno.com/create" },
    style:   { img: "img/l2-6.jpg", w: 700, h: 695, url: "suno.com/create" },
    remix:   { img: "img/l2-7.jpg", w: 406, h: 320, url: "suno.com/create" },
    covered: { img: "img/l2-8.jpg", w: 700, h: 695, url: "suno.com/create" }
  };
  const MARKS = {
    audioBtn:    ["create", 264, 141, 133, 56],
    uploadItem:  ["menu", 272, 247, 102, 38],
    continueBtn: ["dialog", 216, 536, 286, 56],
    filePick:    ["file", 227, 218, 160, 36],
    openBtn:     ["file", 697, 538, 107, 32],
    fullSong:    ["dialog", 48, 298, 106, 28],
    lyricsBox:   ["lyrics", 264, 137, 403, 413],
    stylesBox:   ["style", 264, 287, 403, 233],
    createBtn:   ["style", 328, 567, 354, 48],
    remixItem:   ["remix", 204, 91, 158, 42],
    originalSong: ["covered", 264, 213, 403, 207],
    coverMode:   ["covered", 503, 225, 110, 40],
    coverItem:   ["remix", 10, 93, 188, 30]
  };

  const pct = (v, total) => (v / total * 100) + "%";
  const PAD = 7;

  function frame(key) {
    const s = SHOTS[key];
    return `<div class="win">
      <div class="win-top">
        <div class="win-tab"><span class="win-fav">♪</span>Suno<span class="win-x">✕</span></div>
        <div class="win-ctrl" aria-hidden="true"><span>&#8212;</span><span>&#9744;</span><span class="close">&#10005;</span></div>
      </div>
      <div class="win-bar"><span class="win-nav" aria-hidden="true">&#8592; &#8594; &#8635;</span><span class="win-url">${s.url}</span></div>
      <div class="win-view"><img src="${s.img}" alt="" width="${s.w}" height="${s.h}" loading="lazy"></div>
    </div>`;
  }

  function markEl(key, n) {
    const [shot, x, y, w, h] = MARKS[key];
    const W = SHOTS[shot].w, H = SHOTS[shot].h;
    const el = document.createElement("span");
    el.className = "ring";
    el.dataset.key = key;
    el.style.left = pct(x - PAD, W); el.style.top = pct(y - PAD, H);
    el.style.width = pct(w + PAD * 2, W); el.style.height = pct(h + PAD * 2, H);
    if (n) el.dataset.n = n;
    return el;
  }

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
    { mark: "audioBtn",     cap: "נושא א: במסך Create לוחצים על Audio", click: true },
    { mark: "uploadItem",   cap: "בוחרים Upload", click: true },
    { mark: "filePick",     cap: "נפתחת תיקיית המחשב. בוחרים את הלחן שהורדנו", click: true },
    { mark: "openBtn",      cap: "לוחצים Open", click: true },
    { mark: "fullSong",     cap: "בוחרים Full Song", click: true },
    { mark: "continueBtn",  cap: "לוחצים Continue", click: true },
    { mark: "lyricsBox",    cap: "כותבים מילים חדשות לשיר" },
    { mark: "stylesBox",    cap: "כותבים סגנון באנגלית" },
    { mark: "createBtn",    cap: "לוחצים Create", click: true },
    { mark: "remixItem",    cap: "נושא ב: קאבר לשיר שיצרנו. בשלוש הנקודות בוחרים Remix", click: true },
    { mark: "coverItem",    cap: "ואז בוחרים Cover", click: true },
    { mark: "originalSong", cap: "למעלה רואים את השיר המקורי. מתחתיו כותבים מילים חדשות" },
    { mark: "createBtn",    cap: "לוחצים Create", click: true }
  ];


  host.innerHTML = frame(MARKS[SCENES[0].mark][0]);
  const view = host.querySelector(".win-view");
  const img = view.querySelector("img");
  img.loading = "eager";
  const cursor = document.createElement("span");
  cursor.className = "cursor";
  cursor.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 2l16 11-7 1.5L9.5 22z" fill="#fff" stroke="#111" stroke-width="1.5" stroke-linejoin="round"/></svg>';
  cursor.style.left = "50%"; cursor.style.top = "60%";
  view.appendChild(cursor);
  Object.values(SHOTS).forEach((s) => { const i = new Image(); i.src = s.img; });

  progress.innerHTML = SCENES.map((_, i) => `<span data-i="${i}" title="שלב ${i + 1}"></span>`).join("");
  const reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  let run = 0, playing = false, current = 0;
  const sleep = (ms, id) => new Promise((res, rej) => setTimeout(() => (id === run ? res() : rej("stop")), ms));

  async function scene(i, id) {
    const sc = SCENES[i];
    const [shot, x, y, w, h] = MARKS[sc.mark];
    const S = SHOTS[shot];
    view.querySelectorAll(".ring, .ripple").forEach((e) => e.remove());
    if (!img.src.endsWith(S.img)) {
      img.classList.add("fade");
      await sleep(reduced ? 0 : 250, id);
      img.src = S.img; img.width = S.w; img.height = S.h;
      img.classList.remove("fade");
    }
    numEl.textContent = i + 1;
    captionEl.textContent = sc.cap;
    [...progress.children].forEach((p, j) => p.classList.toggle("on", j <= i));
    await sleep(reduced ? 150 : 600, id);
    cursor.style.left = pct(x + Math.min(w / 2, 90), S.w);
    cursor.style.top = pct(y + Math.min(h / 2, 30), S.h);
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
  captionEl.textContent = "לוחצים ▶ וצופים: מעלים לחן, ואיך עושים קאבר לשיר";
})();
