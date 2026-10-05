// Animated walkthrough ("motion graphics") of making a song in Suno.
(function () {
  const host = document.getElementById("movie-host");
  if (!host) return;
  const { render, mount, LYRICS, STYLES } = window.SunoMock;
  const stage = mount(host);
  const captionEl = document.getElementById("movie-caption");
  const numEl = document.getElementById("movie-num");
  const progress = document.getElementById("movie-progress");
  const playBtn = document.getElementById("movie-play");

  const TITLE = "השיר של החוג";
  const SCENES = [
    { cap: "נכנסים לאתר suno.com ולוחצים Sign In", state: "home", data: {},
      act: [["move", "url"], ["wait", 500], ["move", "signin"], ["click"]] },
    { cap: "בוחרים Continue with Google ונכנסים עם חשבון הגוגל", state: "signin", data: {},
      act: [["move", "google"], ["click"]] },
    { cap: "בתפריט שבצד לוחצים על Create", state: "home", data: { loggedIn: true },
      act: [["move", "nav-create"], ["click"]] },
    { cap: "עוברים ללשונית Advanced (מתקדם)", state: "create", data: { loggedIn: true },
      act: [["move", "tab-adv"], ["click"]] },
    { cap: "בתיבת Lyrics כותבים את המילים של השיר", state: "create", data: { loggedIn: true, advanced: true },
      act: [["move", "lyrics"], ["click"], ["type", "lyrics", LYRICS]] },
    { cap: "בתיבת Styles כותבים את סגנון המוזיקה", state: "create", data: { loggedIn: true, advanced: true, lyrics: LYRICS },
      act: [["move", "styles"], ["click"], ["type", "styles", STYLES], ["move", "title"], ["click"], ["type", "title", TITLE]] },
    { cap: "לוחצים Create ומחכים כמה שניות", state: "create", data: { loggedIn: true, advanced: true, lyrics: LYRICS, styles: STYLES, title: TITLE },
      act: [["move", "create"], ["click"], ["wait", 900]] },
    { cap: "מקבלים שני שירים! לוחצים ▶ כדי לשמוע", state: "create", data: { loggedIn: true, advanced: true, lyrics: LYRICS, styles: STYLES, title: TITLE, songs: true },
      act: [["move", "play"], ["click"], ["wait", 600], ["move", "download"]] },
    { cap: "טיפ: אתר באנגלית? מקש ימני ← Translate to עברית", state: "translate", data: {},
      act: [["move", "translate"], ["click"]] }
  ];

  progress.innerHTML = SCENES.map((_, i) => `<span title="שלב ${i + 1}" data-i="${i}"></span>`).join("");
  const reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  let run = 0, playing = false, current = 0;
  const sleep = (ms, id) => new Promise((res, rej) => setTimeout(() => (id === run ? res() : rej("stop")), ms));

  const cursor = () => stage.querySelector(".sm-cursor");
  function addCursor(x, y) {
    const c = document.createElement("div");
    c.className = "sm-cursor";
    c.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 2l16 11-7 1.5L9.5 22z" fill="#fff" stroke="#111" stroke-width="1.5" stroke-linejoin="round"/></svg>';
    c.style.left = x + "px"; c.style.top = y + "px";
    stage.appendChild(c);
  }
  function target(k) {
    const el = stage.querySelector(`[data-k="${k}"]`);
    if (!el) return null;
    const s = parseFloat(stage.dataset.scale) || 1;
    const r = el.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    return { el, x: (r.left - sr.left + Math.min(r.width / 2, 60)) / s, y: (r.top - sr.top + Math.min(r.height / 2, 20)) / s };
  }

  async function playScene(i, id) {
    const sc = SCENES[i];
    const prev = cursor();
    const px = prev ? prev.style.left : "480px", py = prev ? prev.style.top : "300px";
    stage.innerHTML = render(sc.state, sc.data, {});
    addCursor(parseFloat(px), parseFloat(py));
    numEl.textContent = i + 1;
    captionEl.textContent = sc.cap;
    [...progress.children].forEach((p, j) => p.classList.toggle("on", j <= i));
    await sleep(reduced ? 200 : 700, id);
    for (const [type, a, b] of sc.act) {
      if (type === "move") {
        const t = target(a); if (!t) continue;
        const c = cursor(); c.style.left = t.x + "px"; c.style.top = t.y + "px";
        stage.querySelectorAll(".sm-mark").forEach((e) => e.classList.remove("sm-mark"));
        t.el.classList.add("sm-mark"); t.el.dataset.n = i + 1;
        await sleep(reduced ? 100 : 1000, id);
      } else if (type === "click") {
        const c = cursor();
        const r = document.createElement("div");
        r.className = "sm-ripple"; r.style.left = c.style.left; r.style.top = c.style.top;
        stage.appendChild(r);
        await sleep(450, id); r.remove();
      } else if (type === "type") {
        const f = stage.querySelector(`[data-field="${a}"]`);
        f.classList.add("sm-typing");
        const step = reduced ? b.length : 2;
        for (let n = 0; n <= b.length; n += step) {
          f.textContent = b.slice(0, n);
          await sleep(reduced ? 0 : 35, id);
        }
        f.textContent = b; f.classList.remove("sm-typing");
        await sleep(300, id);
      } else if (type === "wait") {
        await sleep(a, id);
      }
    }
    await sleep(reduced ? 1500 : 1600, id);
  }

  async function playFrom(i) {
    const id = ++run; playing = true; playBtn.textContent = "השהיה ❚❚";
    try {
      for (current = i; current < SCENES.length; current++) await playScene(current, id);
      playing = false; playBtn.textContent = "נגן שוב ▶"; current = 0;
    } catch (e) { /* stopped */ }
  }
  function stop() { run++; playing = false; playBtn.textContent = "המשך ▶"; }

  playBtn.addEventListener("click", () => (playing ? stop() : playFrom(current)));
  document.getElementById("movie-restart").addEventListener("click", () => playFrom(0));
  progress.addEventListener("click", (e) => { const i = e.target.dataset.i; if (i !== undefined) playFrom(+i); });

  // Resting frame: the finished song screen with the first caption ready
  stage.innerHTML = render("home", {}, {});
  addCursor(480, 300);
  numEl.textContent = 1; captionEl.textContent = "לוחצים ▶ כדי לראות את כל התהליך מההתחלה ועד השיר המוכן";
  playBtn.textContent = "נגן ▶";
})();
