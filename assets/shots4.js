// Gemini lesson: real Gemini screenshots (cropped) with red numbered markings + two short motion videos (topic A / topic B) + tabs.
// Marks are [shot, x, y, width, height] in the pixel size of each cropped screenshot.
(function () {
  const SHOTS = {
    search: { img: "img/n-1.jpg", w: 1340, h: 639, url: "google.com" },
    chooser: { img: "img/n-2.jpg", w: 1140, h: 500, url: "accounts.google.com" },
    pwd: { img: "img/n-3.jpg", w: 1140, h: 420, url: "accounts.google.com" },
    home: { img: "img/n-4.jpg", w: 1236, h: 639, url: "gemini.google.com" },
    menu: { img: "img/n-5.jpg", w: 1236, h: 639, url: "gemini.google.com" },
    gemlist: { img: "img/n-6.jpg", w: 1236, h: 639, url: "gemini.google.com" },
    storytyp: { img: "img/n-7.jpg", w: 1236, h: 639, url: "gemini.google.com" },
    book: { img: "img/g-5.jpg", w: 940, h: 590, url: "gemini.google.com" },
    pages: { img: "img/g-6.jpg", w: 940, h: 590, url: "gemini.google.com" },
    tools: { img: "img/t-1.jpg", w: 930, h: 585, url: "gemini.google.com" },
    share: { img: "img/t-2.jpg", w: 576, h: 400, url: "gemini.google.com" },
    plus: { img: "img/i-1.jpg", w: 760, h: 695, url: "gemini.google.com" },
    styles: { img: "img/i-2.jpg", w: 760, h: 695, url: "gemini.google.com" },
    typed: { img: "img/i-3.jpg", w: 760, h: 695, url: "gemini.google.com" },
    result: { img: "img/i-4.jpg", w: 760, h: 695, url: "gemini.google.com" }
  };
  const MARKS = {
    searchBox: ["search", 470, 28, 860, 50],
    searchHit: ["search", 665, 165, 645, 75],
    account: ["chooser", 36, 320, 508, 70],
    pwdField: ["pwd", 36, 180, 508, 56],
    pwdNext: ["pwd", 36, 332, 76, 40],
    homeBox: ["home", 112, 288, 660, 64],
    gear: ["home", 1194, 548, 34, 34],
    gemsItem: ["menu", 996, 228, 225, 30],
    storyCard: ["gemlist", 665, 232, 198, 175],
    storyBox: ["storytyp", 112, 460, 660, 125],
    storySend: ["storytyp", 128, 538, 34, 34],
    bookCover: ["book", 240, 85, 445, 485],
    bookTools: ["book", 120, 28, 262, 38],
    pagesView: ["pages", 25, 85, 880, 490],
    nextPage: ["pages", 593, 32, 42, 40],
    listenBtn: ["tools", 121, 24, 126, 32],
    fullBtn: ["tools", 353, 25, 28, 28],
    shareBtn: ["tools", 258, 27, 24, 24],
    copyBtn: ["share", 56, 124, 165, 40],
    plusBtn: ["plus", 657, 328, 46, 42],
    createImg: ["plus", 460, 506, 218, 34],
    styleTab: ["styles", 334, 88, 60, 34],
    styleTile: ["styles", 563, 296, 167, 140],
    styleChip: ["typed", 590, 368, 112, 112],
    descBox: ["typed", 490, 490, 215, 30],
    sendImg: ["typed", 70, 538, 36, 34],
    resultImg: ["result", 30, 38, 708, 386]
  };
  const SETS = {
    S: [
      { mark: "searchBox", cap: "בגוגל כותבים Gemini" },
      { mark: "searchHit", cap: "לוחצים על Google Gemini", click: true },
      { mark: "account", cap: "בוחרים את חשבון הגוגל של החוג", click: true },
      { mark: "pwdField", cap: "כותבים את הסיסמה ולוחצים הבא", click: true },
      { mark: "homeBox", cap: "נכנסנו! זה מסך הבית של Gemini" }
    ],
    A: [
      { mark: "gear", cap: "בפינה למטה לוחצים על גלגל ההגדרות", click: true },
      { mark: "gemsItem", cap: "בתפריט בוחרים Gems", click: true },
      { mark: "storyCard", cap: "בוחרים את Storybook", click: true },
      { mark: "storyBox", cap: "כותבים הוראה אחת ושולחים" },
      { mark: "bookCover", cap: "אחרי כמה דקות הספר מוכן" },
      { mark: "nextPage", cap: "לוחצים על החץ ומדפדפים בספר", click: true },
      { mark: "listenBtn", cap: "לוחצים על האזנה והספר מוקרא בקול", click: true },
      { mark: "fullBtn", cap: "ארבע הפינות פותחות מסך מלא", click: true },
      { mark: "shareBtn", cap: "לשיתוף לוחצים על סמל השיתוף", click: true },
      { mark: "copyBtn", cap: "לוחצים על העתקת הקישור", click: true }
    ],
    B: [
      { mark: "plusBtn", cap: "לוחצים על +", click: true },
      { mark: "createImg", cap: "בוחרים יצירת תמונה", click: true },
      { mark: "styleTile", cap: "בוחרים סגנון מהגלריה", click: true },
      { mark: "descBox", cap: "כותבים מה לצייר, או משאירים ריק ושולחים" },
      { mark: "resultImg", cap: "התמונה מוכנה" }
    ]
  };

  const pct = (v, total) => (v / total * 100) + "%";
  const PAD = 7;

  function frame(key) {
    const s = SHOTS[key];
    return `<div class="win">
      <div class="win-top">
        <div class="win-tab"><span class="win-fav">✦</span>Gemini<span class="win-x">✕</span></div>
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

  // ---------- tabs: topic A / topic B ----------
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
    show(h === "topicA" || h === "topicB" || h === "topicD" ? h : "topicS");
  }
})();
