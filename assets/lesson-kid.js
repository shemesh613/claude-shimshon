// Kid-friendly lesson layer (all lesson pages):
// 1) screenshots in steps are folded behind a big "👀 תראו לי איפה" button -> short, light page
// 2) every step gets a "✅ עשיתי!" button; progress bar; celebration + confetti when all steps are done
(function () {
  const KEY = "kid-done:" + location.pathname;
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { saved = {}; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) {} };

  const steps = [...document.querySelectorAll("section.step")];
  if (!steps.length) return;

  // ---- fold screenshots ----
  steps.forEach((step) => {
    step.querySelectorAll(":scope > figure.real").forEach((fig) => {
      const btn = document.createElement("button");
      btn.type = "button"; btn.className = "show-me";
      btn.innerHTML = '<span aria-hidden="true">👀</span> תראו לי איפה';
      btn.setAttribute("aria-expanded", "false");
      fig.classList.add("folded");
      fig.before(btn);
      btn.addEventListener("click", () => {
        const open = fig.classList.toggle("folded") === false;
        btn.setAttribute("aria-expanded", String(open));
        btn.innerHTML = open ? '<span aria-hidden="true">🙈</span> להסתיר' : '<span aria-hidden="true">👀</span> תראו לי איפה';
        if (open) window.dispatchEvent(new Event("resize")); // let the zoom recalc now that it is visible
      });
    });
  });

  // ---- "done" buttons + progress per group (tabs in a lesson are separate groups) ----
  const groupOf = (s) => s.closest("[data-topic-panel]") || document.querySelector("main");
  const groups = [...new Set(steps.map(groupOf))];

  groups.forEach((g, gi) => {
    const gs = steps.filter((s) => groupOf(s) === g);
    const bar = document.createElement("div");
    bar.className = "kid-progress";
    bar.innerHTML = '<div class="kp-text"></div><div class="kp-track"><span></span></div>';
    gs[0].before(bar);
    const party = document.createElement("div");
    party.className = "kid-party"; party.hidden = true;
    party.innerHTML = '<div class="kp-big">🎉</div><h2>כל הכבוד! סיימתן את כל הצעדים</h2><p>עכשיו נסו את האתגר, או הראו למישהי מה יצרתן!</p>';
    gs[gs.length - 1].after(party);

    const update = (celebrate) => {
      const n = gs.filter((s) => s.classList.contains("done")).length;
      bar.querySelector(".kp-text").textContent = n === gs.length ? `סיימתן! ${n} מתוך ${gs.length} ⭐` : `התקדמות: ${n} מתוך ${gs.length} צעדים`;
      bar.querySelector(".kp-track span").style.width = (n / gs.length * 100) + "%";
      const all = n === gs.length;
      party.hidden = !all;
      if (all && celebrate) confetti();
    };

    gs.forEach((s, i) => {
      const id = gi + "-" + i;
      const btn = document.createElement("button");
      btn.type = "button"; btn.className = "did-it";
      const paint = () => {
        const d = s.classList.contains("done");
        btn.textContent = d ? "✅ עשיתי!" : "⬜ עשיתי?";
        btn.setAttribute("aria-pressed", String(d));
      };
      if (saved[id]) s.classList.add("done");
      paint();
      btn.addEventListener("click", () => {
        s.classList.toggle("done");
        saved[id] = s.classList.contains("done"); save();
        paint(); update(saved[id]);
        if (saved[id]) { const next = gs[i + 1]; if (next) setTimeout(() => next.scrollIntoView({ behavior: "smooth", block: "start" }), 350); }
      });
      s.appendChild(btn);
    });
    update(false);
  });

  function confetti() {
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const box = document.createElement("div");
    box.className = "confetti";
    const em = ["🎉", "⭐", "✨", "🎈", "💖", "🌟"];
    for (let i = 0; i < 40; i++) {
      const s = document.createElement("span");
      s.textContent = em[i % em.length];
      s.style.left = Math.random() * 100 + "vw";
      s.style.animationDelay = Math.random() * 0.8 + "s";
      s.style.fontSize = 18 + Math.random() * 22 + "px";
      box.appendChild(s);
    }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 3500);
  }
})();
