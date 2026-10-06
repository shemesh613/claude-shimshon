// Renders the shelves on the home page from data.js
(function () {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const icon = (it) => `<span class="icon ${it.color || "ink"}">${ICONS[it.icon] || ICONS.star}</span>`;
  const tags = (it) => it.tags && it.tags.length
    ? `<div class="meta">${it.tags.map((t) => `<span class="chip${t === "חדש" ? " new" : ""}">${esc(t)}</span>`).join("")}</div>`
    : "";
  const isExternal = (href) => /^https?:/.test(href);

  function linkCard(it) {
    const ext = isExternal(it.href) ? ' target="_blank" rel="noopener"' : "";
    return `<a class="card" href="${esc(it.href)}"${ext}>${icon(it)}<div class="body"><h3>${esc(it.title)}</h3><p>${esc(it.text)}</p>${tags(it)}</div></a>`;
  }

  function songPlayer(it) {
    const player = it.audio
      ? `<audio controls preload="metadata" aria-label="השמעת ${esc(it.title)}" src="${esc(it.audio)}">הדפדפן אינו תומך בניגון שמע.</audio>`
      : `<iframe class="suno-player" title="נגן השיר ${esc(it.title)}" src="https://suno.com/embed/${esc(it.sunoId)}" loading="lazy" allow="autoplay; encrypted-media; fullscreen" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
    const links = it.audio ? `<div class="product-actions"><a href="${esc(it.audio)}" download>הורדת השיר</a><a href="https://suno.com/song/${esc(it.sunoId)}" target="_blank" rel="noopener">השיר ב־Suno</a></div>` : "";
    return `<div class="card product"><div class="product-head">${icon(it)}<h3>${esc(it.title)}</h3></div>${player}${links}</div>`;
  }

  function soonCard(text) {
    return `<div class="card soon"><span class="icon sm ink">${ICONS.plus}</span><div class="body"><h3>בקרוב</h3><p>${text}</p></div></div>`;
  }

  function fill(id, items, render, soon) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = items.map(render).join("") + (soon ? soonCard(soon) : "");
    const count = document.querySelector(`[data-count="${id}"]`);
    if (count) count.textContent = items.length;
  }

  fill("lessons", SITE.lessons, linkCard);
  fill("tools", SITE.tools, linkCard);

  const products = document.getElementById("products");
  let selectedSong = 0;
  if (products && SITE.products.length) {
    products.innerHTML = `<div class="song-select-wrap">
      <label for="song-select">בחרו שיר</label>
      <select id="song-select" class="song-select">${SITE.products.map((it, i) =>
        `<option value="${i}">${esc(it.title)}</option>`).join("")}</select>
    </div><div id="selected-song"></div>`;
    const selectedSongHost = document.getElementById("selected-song");
    const showSong = () => { selectedSongHost.innerHTML = songPlayer(SITE.products[selectedSong]); };
    products.querySelector("#song-select").addEventListener("change", (e) => {
      selectedSong = Number(e.target.value);
      showSong();
    });

    const panels = [...document.querySelectorAll("[data-section-panel]")];
    const tabs = [...document.querySelectorAll("[data-section-tab]")];
    const activateSection = () => {
      const requested = decodeURIComponent(location.hash.slice(1));
      const active = panels.some((panel) => panel.id === requested) ? requested : "lessons-shelf";
      panels.forEach((panel) => { panel.hidden = panel.id !== active; });
      tabs.forEach((tab) => {
        if (tab.dataset.sectionTab === active) tab.setAttribute("aria-current", "location");
        else tab.removeAttribute("aria-current");
      });
      if (active === "products-shelf") showSong();
      else selectedSongHost.replaceChildren();
      document.documentElement.classList.add("tabs-ready");
      if (requested && requested === active) requestAnimationFrame(() => document.getElementById(active).scrollIntoView());
    };
    window.addEventListener("hashchange", activateSection);
    activateSection();
  }
})();
