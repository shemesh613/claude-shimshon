// Home page upgrades (runs after hub.js):
// big "today's lesson" button, lesson numbers (1 = first lesson), an icon per topic
(function () {
  if (!window.SITE || !SITE.lessons || !SITE.lessons.length) return;
  const lessons = SITE.lessons;
  const total = lessons.length;
  const CAMERA = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h3l2-3h6l2 3h3v12H4z"/><circle cx="12" cy="13" r="4"/></svg>';
  const topic = (href) =>
    /edit/.test(href) ? { icon: CAMERA, color: "coral" } :
    /images/.test(href) ? { icon: ICONS.pencil, color: "sky" } :
    /gemini/.test(href) ? { icon: ICONS.book, color: "sun" } :
    /suno/.test(href) ? { icon: ICONS.music, color: "leaf" } : null;
  const clean = (t) => t.replace(/^שיעור\s*\d*\s*:\s*/, "");

  // number + icon on each lesson card (newest is first in the list)
  const cards = [...document.querySelectorAll("#lessons a.card")];
  cards.forEach((card, i) => {
    const it = lessons[i]; if (!it) return;
    const n = total - i;
    const h3 = card.querySelector("h3");
    if (h3) {
      h3.textContent = clean(it.title);
      const badge = document.createElement("span");
      badge.className = "lesson-num"; badge.textContent = "שיעור " + n;
      h3.before(badge);
    }
    const t = topic(it.href), ic = card.querySelector(".icon");
    if (t && ic) { ic.className = "icon " + t.color; ic.innerHTML = t.icon; }
    const chip = card.querySelector(".chip.new");
    if (chip) card.appendChild(chip);
  });

  // big "today's lesson" button above everything
  const first = lessons[0];
  const btn = document.createElement("a");
  btn.className = "today-lesson"; btn.href = first.href;
  btn.innerHTML = '<span class="tl-play" aria-hidden="true">▶</span><span><small>השיעור של היום · שיעור ' + total + '</small><strong></strong></span>';
  btn.querySelector("strong").textContent = clean(first.title);
  const tabs = document.querySelector(".section-tabs");
  if (tabs) tabs.before(btn); else document.querySelector("main").prepend(btn);
})();
