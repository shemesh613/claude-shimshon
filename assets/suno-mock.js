// Illustrated mock-ups of the Suno website, used for the marked "screenshots" and the animated walkthrough.
// The drawings follow Suno's real layout and English button names; real screenshots can replace them later.
(function () {
  const W = 960, H = 560;

  const css = `
  .sm-stage{position:absolute;top:0;left:0;width:${W}px;height:${H}px;transform-origin:top left;direction:ltr;text-align:left;
    font:400 14px/1.4 "Rubik",Arial,sans-serif;color:#f2f2f5;background:#101014;overflow:hidden}
  .sm-bar{height:40px;background:#26262c;display:flex;align-items:center;gap:10px;padding:0 14px}
  .sm-dots{display:flex;gap:6px}.sm-dots i{width:11px;height:11px;border-radius:50%;background:#ff5f57}.sm-dots i:nth-child(2){background:#febc2e}.sm-dots i:nth-child(3){background:#28c840}
  .sm-url{flex:1;max-width:520px;margin:0 auto;background:#16161a;border-radius:16px;padding:5px 14px;color:#cfcfd6;font:500 13px "IBM Plex Mono",monospace}
  .sm-app{display:flex;height:${H - 40}px}
  .sm-side{width:170px;background:#0a0a0d;padding:16px 12px;display:flex;flex-direction:column;gap:4px;border-right:1px solid #222}
  .sm-logo{font:700 22px/1 Arial,sans-serif;letter-spacing:3px;margin:0 8px 16px}
  .sm-nav{padding:8px 10px;border-radius:8px;color:#bdbdc6;display:flex;gap:10px;align-items:center}
  .sm-nav.on{background:#1f1f25;color:#fff}
  .sm-nav b{width:16px;height:16px;border-radius:4px;border:2px solid currentColor;display:inline-block}
  .sm-side .sm-me{margin-top:auto;display:flex;gap:8px;align-items:center;padding:8px;color:#ddd}
  .sm-avatar{width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#ff9a3c,#ff3d77);display:grid;place-items:center;font-weight:700;font-size:13px}
  .sm-main{flex:1;position:relative;padding:16px 26px;overflow:hidden}
  .sm-topbtns{position:absolute;top:16px;right:22px;display:flex;gap:8px}
  .sm-btn{padding:8px 16px;border-radius:999px;font-weight:600;font-size:13px;background:#2a2a31;color:#fff;border:0}
  .sm-btn.light{background:#fff;color:#111}
  .sm-hero{margin-top:90px;text-align:center}
  .sm-hero h1{font:700 40px/1.1 Arial,sans-serif;margin:0 0 22px}
  .sm-prompt{margin:0 auto;width:520px;background:#1d1d23;border:1px solid #333;border-radius:18px;padding:14px 16px;display:flex;align-items:center;gap:10px;color:#8c8c96}
  .sm-prompt span{flex:1}
  .sm-cta{background:linear-gradient(90deg,#ff7a2f,#ff3d77);color:#fff;border-radius:999px;padding:9px 18px;font-weight:700}
  .sm-cards{display:flex;gap:14px;justify-content:center;margin-top:40px}
  .sm-cards i{width:110px;height:110px;border-radius:12px;background:linear-gradient(135deg,#3b3b8f,#c24bd1)}
  .sm-cards i:nth-child(2){background:linear-gradient(135deg,#1d8a7a,#ade36b)}.sm-cards i:nth-child(3){background:linear-gradient(135deg,#e2683c,#f7d046)}.sm-cards i:nth-child(4){background:linear-gradient(135deg,#235bd6,#5fd3f3)}
  .sm-veil{position:absolute;inset:0;background:rgba(0,0,0,.6);display:grid;place-items:center}
  .sm-modal{width:340px;background:#1b1b21;border:1px solid #333;border-radius:16px;padding:24px;display:flex;flex-direction:column;gap:10px}
  .sm-modal h2{margin:0 0 6px;font:700 22px Arial,sans-serif;text-align:center}
  .sm-modal .sm-opt{border:1px solid #3a3a42;border-radius:999px;padding:10px 14px;display:flex;gap:10px;align-items:center;justify-content:center;font-weight:600}
  .sm-modal .sm-opt.g{background:#fff;color:#222;border-color:#fff}
  .sm-g{font:700 16px Arial;background:conic-gradient(#ea4335 0 25%,#fbbc05 0 50%,#34a853 0 75%,#4285f4 0);-webkit-background-clip:text;background-clip:text;color:transparent}
  .sm-panel{width:380px;display:flex;flex-direction:column;gap:10px;height:100%}
  .sm-row{display:flex;align-items:center;gap:10px}
  .sm-tabs{display:flex;background:#1d1d23;border-radius:999px;padding:4px}
  .sm-tabs span{padding:7px 18px;border-radius:999px;color:#a5a5ae;font-weight:600}
  .sm-tabs span.on{background:#3a3a44;color:#fff}
  .sm-chip{border:1px solid #3a3a42;border-radius:999px;padding:5px 10px;font-size:12px;color:#ccc}
  .sm-box{background:#1d1d23;border:1px solid #33333b;border-radius:12px;padding:10px 12px}
  .sm-box label{display:block;font-size:12px;font-weight:700;color:#c8c8d0;margin-bottom:6px}
  .sm-box .sm-text{white-space:pre-wrap;color:#fff;min-height:20px;font-size:13px;direction:auto;unicode-bidi:plaintext}
  .sm-box .sm-ph{color:#6f6f78}
  .sm-lyrics .sm-text{height:112px;overflow:hidden}
  .sm-styles .sm-text{min-height:38px}
  .sm-sugg{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
  .sm-create{margin-top:auto;text-align:center;padding:13px;border-radius:999px;background:linear-gradient(90deg,#ff7a2f,#ff3d77);font-weight:700;font-size:15px}
  .sm-work{flex:1;margin-left:24px;border-left:1px solid #222;padding-left:22px;display:flex;flex-direction:column;gap:12px}
  .sm-work h4{margin:0;color:#aaa;font-size:13px}
  .sm-empty{margin-top:60px;text-align:center;color:#666}
  .sm-song{display:flex;gap:12px;align-items:center;padding:8px;border-radius:12px;background:#17171c}
  .sm-cover{width:62px;height:62px;border-radius:10px;background:linear-gradient(135deg,#ff7a2f,#7a3dff);position:relative;flex:none}
  .sm-song:nth-child(3) .sm-cover{background:linear-gradient(135deg,#21c38c,#2f6bff)}
  .sm-play{position:absolute;inset:18px;border-radius:50%;background:rgba(0,0,0,.55);display:grid;place-items:center}
  .sm-play:after{content:"";border-left:10px solid #fff;border-top:6px solid transparent;border-bottom:6px solid transparent;margin-left:3px}
  .sm-song b{display:block;font-size:14px;direction:auto;unicode-bidi:plaintext}
  .sm-song small{color:#999;font-size:12px}
  .sm-song .sm-dl{margin-left:auto;color:#bbb;font-size:20px;padding:0 8px}
  .sm-menu{position:absolute;width:250px;background:#2b2b31;border:1px solid #45454d;border-radius:8px;padding:6px 0;box-shadow:0 10px 30px rgba(0,0,0,.6);font-size:13px}
  .sm-menu div{padding:7px 16px;color:#e8e8ec}
  .sm-menu hr{border:0;border-top:1px solid #45454d;margin:5px 0}
  .sm-mark{outline:4px solid #ff2d55 !important;outline-offset:4px;border-radius:10px;position:relative;animation:sm-pulse 1.4s ease-in-out infinite}
  .sm-mark:before{content:attr(data-n);position:absolute;top:-22px;right:-22px;width:32px;height:32px;border-radius:50%;background:#ff2d55;color:#fff;
    font:700 18px/32px Arial,sans-serif;text-align:center;z-index:5;box-shadow:0 2px 8px rgba(0,0,0,.5)}
  @keyframes sm-pulse{50%{outline-color:#ffd60a}}
  .sm-cursor{position:absolute;left:480px;top:300px;width:28px;height:28px;z-index:20;pointer-events:none;transition:left .9s cubic-bezier(.5,0,.2,1),top .9s cubic-bezier(.5,0,.2,1)}
  .sm-cursor svg{width:28px;height:28px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.6))}
  .sm-ripple{position:absolute;width:20px;height:20px;margin:-10px 0 0 -10px;border-radius:50%;border:3px solid #ffd60a;z-index:19;pointer-events:none;animation:sm-rip .6s ease-out forwards}
  @keyframes sm-rip{to{transform:scale(3.2);opacity:0}}
  .sm-typing:after{content:"|";animation:sm-blink .8s steps(1) infinite;color:#ff7a2f}
  @keyframes sm-blink{50%{opacity:0}}
  @media (prefers-reduced-motion: reduce){.sm-mark{animation:none}.sm-cursor{transition:none}}
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  const LYRICS = "[Verse]\nבחוג של AI יושבים ולומדים\nאיך המחשב כותב לנו שירים\n[Chorus]\nסונו, סונו, שיר לנו עכשיו\nשיר מצחיק שכולם ישירו איתו";
  const STYLES = "happy pop, kids choir, ukulele, funny";

  // m(key) -> attributes for an element that may be marked
  function maker(marks) {
    return (key, cls = "") => {
      const n = marks[key];
      return ` data-k="${key}" class="${cls}${n ? " sm-mark" : ""}"${n ? ` data-n="${n}"` : ""}`;
    };
  }

  function sidebar(m, d, active) {
    const nav = (key, label) => `<div${m(key, "sm-nav" + (active === key ? " on" : ""))}><b></b>${label}</div>`;
    return `<aside class="sm-side"><div class="sm-logo">SUNO</div>
      ${nav("nav-home", "Home")}${nav("nav-create", "Create")}${nav("nav-library", "Library")}${nav("nav-search", "Search")}
      ${d.loggedIn ? `<div${m("me", "sm-me")}><span class="sm-avatar">ח</span>החוג שלנו</div>` : ""}</aside>`;
  }

  function home(m, d) {
    return `<div class="sm-main">
      ${d.loggedIn ? "" : `<div class="sm-topbtns"><span${m("signin", "sm-btn")}>Sign In</span><span class="sm-btn light">Sign Up</span></div>`}
      <div class="sm-hero"><h1>Make any song you can imagine</h1>
        <div class="sm-prompt"><span>Make a song about…</span><span class="sm-cta">Create</span></div>
        <div class="sm-cards"><i></i><i></i><i></i><i></i></div></div></div>`;
  }

  function signin(m) {
    return `<div class="sm-veil"><div class="sm-modal"><h2>Sign in to Suno</h2>
      <div${m("google", "sm-opt g")}><span class="sm-g">G</span>Continue with Google</div>
      <div class="sm-opt">Continue with Apple</div>
      <div class="sm-opt">Continue with Microsoft</div>
      <div class="sm-opt">Continue with Discord</div>
      <div class="sm-opt">Continue with phone</div></div></div>`;
  }

  function create(m, d) {
    const adv = d.advanced;
    const ph = (t) => `<span class="sm-ph">${t}</span>`;
    const panel = adv
      ? `<div${m("lyrics", "sm-box sm-lyrics")}><label>Lyrics</label><div class="sm-text" data-field="lyrics">${d.lyrics || ph("Write some lyrics or a prompt — or leave blank for instrumental")}</div></div>
         <div${m("styles", "sm-box sm-styles")}><label>Styles</label><div class="sm-text" data-field="styles">${d.styles || ph("Enter style of music")}</div>
           <div class="sm-sugg"><span class="sm-chip">+ pop</span><span class="sm-chip">+ rock</span><span class="sm-chip">+ rap</span><span class="sm-chip">+ kids</span></div></div>
         <div${m("title", "sm-box")}><label>Song Title</label><div class="sm-text" data-field="title">${d.title || ph("Enter a title")}</div></div>`
      : `<div${m("desc", "sm-box")}><label>Song Description</label><div class="sm-text sm-ph" style="height:120px">a fun pop song about my friends…</div></div>
         <div class="sm-row"><span class="sm-chip">Instrumental</span></div>`;
    const songs = d.songs
      ? [1, 2].map((i) => `<div class="sm-song">
          <div class="sm-cover"><div${i === 1 ? m("play", "sm-play") : ' class="sm-play"'}></div></div>
          <div><b>${d.title || "השיר של החוג"}</b><small>${STYLES} · 2:4${i}</small></div><span${i === 1 ? m("download", "sm-dl") : ' class="sm-dl"'}>⋯</span></div>`).join("")
      : `<div class="sm-empty">Your songs will appear here</div>`;
    return `<div class="sm-main" style="display:flex">
      <div class="sm-panel">
        <div class="sm-row"><div class="sm-tabs"><span${m("tab-simple", adv ? "" : "on")}>Simple</span><span${m("tab-adv", adv ? "on" : "")}>Advanced</span></div><span class="sm-chip">v4.5</span></div>
        ${panel}
        <div${m("create", "sm-create")}>♫ Create</div>
      </div>
      <div class="sm-work"><h4>Workspace</h4>${songs}</div></div>`;
  }

  function menu(m) {
    return `<div class="sm-menu" style="left:520px;top:150px">
      <div>Back</div><div>Forward</div><div>Reload</div><hr>
      <div>Save as…</div><div>Print…</div><div>Cast…</div><div>Search images with Google</div><hr>
      <div${m("translate", "")}>Translate to עברית</div><hr>
      <div>View page source</div><div>Inspect</div></div>`;
  }

  // state: home | signin | create | translate     data: {loggedIn, advanced, lyrics, styles, title, songs}
  function render(state, data = {}, marks = {}) {
    const m = maker(marks);
    const d = Object.assign({}, data);
    let main = "", side = "nav-home", url = "suno.com";
    if (state === "home") main = home(m, d);
    if (state === "signin") main = home(m, d) + signin(m);
    if (state === "create") { main = create(m, d); side = "nav-create"; url = "suno.com/create"; }
    if (state === "translate") { main = home(m, Object.assign(d, { loggedIn: true })) + menu(m); }
    return `<div class="sm-bar"><div class="sm-dots"><i></i><i></i><i></i></div><div${m("url", "sm-url")}>${url}</div></div>
      <div class="sm-app">${sidebar(m, d, side)}${main}</div>`;
  }

  // Scales a fixed-size stage to fit its container
  function mount(host) {
    host.classList.add("shot-scale");
    host.setAttribute("dir", "ltr");
    const stage = document.createElement("div");
    stage.className = "sm-stage";
    host.appendChild(stage);
    const fit = () => {
      const s = host.clientWidth / W;
      stage.style.transform = `scale(${s})`;
      host.style.height = H * s + "px";
      stage.dataset.scale = s;
    };
    fit();
    if (window.ResizeObserver) new ResizeObserver(fit).observe(host);
    else window.addEventListener("resize", fit);
    return stage;
  }

  function parseMarks(str) {
    const out = {};
    (str || "").split(",").filter(Boolean).forEach((p) => { const [k, n] = p.split(":"); out[k.trim()] = n.trim(); });
    return out;
  }

  // Static marked figures: <div class="shot"><div data-screen="create" data-data='{"advanced":true}' data-marks="lyrics:1"></div></div>
  document.querySelectorAll("[data-screen]").forEach((host) => {
    const stage = mount(host);
    let data = {};
    try { data = JSON.parse(host.dataset.data || "{}"); } catch (e) {}
    if (data.lyrics === true) data.lyrics = LYRICS;
    if (data.styles === true) data.styles = STYLES;
    stage.innerHTML = render(host.dataset.screen, data, parseMarks(host.dataset.marks));
    host.setAttribute("role", "img");
  });

  window.SunoMock = { render, mount, LYRICS, STYLES, W, H };
})();
