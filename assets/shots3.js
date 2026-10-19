// Lesson 3: real Suno screenshots (cropped) with red numbered markings + two short motion videos (topics A / B / C) + tabs.
// Marks are [shot, x, y, width, height] in the pixel size of each cropped screenshot.
(function () {
  const SHOTS = {
    simple:   { img: "img/l3-1.jpg", w: 700, h: 695, url: "suno.com/create" },
    audiomenu:{ img: "img/l3-2.jpg", w: 700, h: 695, url: "suno.com/create" },
    record:   { img: "img/l3-3.jpg", w: 520, h: 615, url: "suno.com/create" },
    dialog:   { img: "img/l2-3.jpg", w: 540, h: 615, url: "suno.com/create" },
    covered2: { img: "img/l2-9.jpg", w: 700, h: 695, url: "suno.com/create" },
    voices:   { img: "img/l3-4.jpg", w: 536, h: 595, url: "suno.com/create" },
    voicenew: { img: "img/l3-5.jpg", w: 936, h: 635, url: "suno.com/create" }
  };
  const MARKS = {
    audioBtn:     ["audiomenu", 265, 141, 137, 56],
    recordItem:   ["audiomenu", 272, 287, 102, 36],
    recordBtn:    ["record", 208, 452, 100, 100],
    songDemo:     ["dialog", 162, 298, 112, 28],
    continueBtn:  ["dialog", 216, 536, 286, 56],
    coverLyrics:  ["covered2", 264, 437, 403, 113],
    coverCreate:  ["covered2", 328, 567, 354, 48],
    simpleTab:    ["simple", 265, 72, 62, 38],
    descBox:      ["simple", 264, 213, 418, 170],
    createSimple: ["simple", 264, 398, 418, 48],
    voiceBtn:     ["simple", 405, 141, 137, 56],
    createVoice:  ["voices", 37, 191, 463, 65],
    myVoices:     ["voices", 28, 76, 240, 40],
    voiceRecord:  ["voicenew", 190, 335, 158, 54],
    voiceUpload:  ["voicenew", 373, 335, 160, 54]
  };
  const SETS = {
    A: [
      { mark: "audioBtn",     cap: "במסך Create לוחצים על Audio", click: true },
      { mark: "recordItem",   cap: "בוחרים Record", click: true },
      { mark: "recordBtn",    cap: "לוחצים על העיגול ושרים או מזמזמים (לפחות 6 שניות)", click: true },
      { mark: "songDemo",     cap: "בוחרים Song Demo", click: true },
      { mark: "continueBtn",  cap: "לוחצים Continue", click: true },
      { mark: "coverLyrics",  cap: "כותבים מילים, או משאירים ריק", click: false },
      { mark: "coverCreate",  cap: "לוחצים Create", click: true }
    ],
    B: [
      { mark: "simpleTab",    cap: "לוחצים על Simple", click: true },
      { mark: "descBox",      cap: "כותבים באנגלית איזו מנגינה רוצים, בלי מילים" },
      { mark: "createSimple", cap: "לוחצים Create", click: true }
    ],
    C: [
      { mark: "voiceBtn",     cap: "לוחצים על Voice", click: true },
      { mark: "createVoice",  cap: "לוחצים Create Voice", click: true },
      { mark: "voiceRecord",  cap: "מקליטים את הקול (Record), או מעלים קובץ (Upload Audio)", click: true },
      { mark: "myVoices",     cap: "הקול נשמר ב-My Voices ואפשר להשתמש בו שוב ושוב" }
    ]
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

  // ---------- the motion videos ----------
  const reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  Object.values(SHOTS).forEach((s) => { const i = new Image(); i.src = s.img; });

  function movie(root) {
    const SCENES = SETS[root.dataset.set];
    const host = root.querySelector(".movie-host");
    const captionEl = root.querySelector(".movie-caption");
    const numEl = root.querySelector(".movie-num");
    const progress = root.querySelector(".movie-progress");
    const playBtn = root.querySelector(".movie-play");
    const restartBtn = root.querySelector(".movie-restart");

    host.innerHTML = frame(MARKS[SCENES[0].mark][0]);
    const view = host.querySelector(".win-view");
    const img = view.querySelector("img");
    img.loading = "eager";
    const cursor = document.createElement("span");
    cursor.className = "cursor";
    cursor.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 2l16 11-7 1.5L9.5 22z" fill="#fff" stroke="#111" stroke-width="1.5" stroke-linejoin="round"/></svg>';
    cursor.style.left = "50%"; cursor.style.top = "60%";
    view.appendChild(cursor);

    progress.innerHTML = SCENES.map((_, i) => `<span data-i="${i}" title="שלב ${i + 1}"></span>`).join("");

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
    restartBtn.addEventListener("click", () => playFrom(0));
    progress.addEventListener("click", (e) => { const i = e.target.dataset.i; if (i !== undefined) playFrom(+i); });
    root.pause = () => { if (playing) { run++; playing = false; playBtn.textContent = "המשך ▶"; } };

    numEl.textContent = 1;
    captionEl.textContent = root.dataset.intro || "לוחצים ▶ וצופים";
  }
  const movies = [...document.querySelectorAll(".player[data-set]")];
  movies.forEach(movie);

  // ---------- tabs: topics A / B / C ----------
  const tabs = [...document.querySelectorAll("[data-topic-tab]")];
  const panels = [...document.querySelectorAll("[data-topic-panel]")];
  function show(id) {
    tabs.forEach((t) => {
      const on = t.dataset.topicTab === id;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.classList.toggle("on", on);
    });
    panels.forEach((p) => { p.hidden = p.id !== id; });
    movies.forEach((m) => m.pause && m.pause());
  }
  if (tabs.length) {
    tabs.forEach((t) => t.addEventListener("click", () => { history.replaceState(null, "", "#" + t.dataset.topicTab); show(t.dataset.topicTab); }));
    const h = decodeURIComponent(location.hash.slice(1));
    show(h === "topicB" || h === "topicC" ? h : "topicA");
  }
})();
