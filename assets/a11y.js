// Text-size button: makes all text bigger and remembers the choice on this device.
(function () {
  const root = document.documentElement;
  const btn = document.getElementById("size-btn");
  let big = false;
  try { big = localStorage.getItem("big-text") === "1"; } catch (e) {}
  const apply = () => {
    root.classList.toggle("big", big);
    if (btn) btn.setAttribute("aria-pressed", String(big));
  };
  apply();
  if (btn) btn.addEventListener("click", () => {
    big = !big;
    apply();
    try { localStorage.setItem("big-text", big ? "1" : "0"); } catch (e) {}
  });
})();
