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

  function productCard(it) {
    const player = it.sunoId
      ? `<iframe class="suno-player" title="נגן השיר ${esc(it.title)}" src="https://suno.com/embed/${esc(it.sunoId)}" loading="lazy" allow="autoplay; encrypted-media; fullscreen" referrerpolicy="no-referrer-when-downgrade"></iframe>`
      : `<audio controls preload="none" src="${esc(it.audio)}"></audio><div class="missing" hidden>השיר יעלה לכאן בקרוב.</div>`;
    return `<div class="card product"><div class="product-head">${icon(it)}<h3>${esc(it.title)}</h3></div>${it.text ? `<p>${esc(it.text)}</p>` : ""}${tags(it)}${player}</div>`;
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
  fill("products", SITE.products, productCard);
  
  // Show a friendly note when a song file has not been uploaded yet
  document.querySelectorAll(".product audio").forEach((a) => {
    const missing = a.nextElementSibling;
    fetch(a.getAttribute("src"), { method: "HEAD" })
      .then((r) => { if (!r.ok) { a.hidden = true; missing.hidden = false; } })
      .catch(() => { a.hidden = true; missing.hidden = false; });
  });
})();
