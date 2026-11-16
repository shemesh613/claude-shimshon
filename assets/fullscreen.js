// Adds a "full screen" button to every lesson video player.
// Phones without real fullscreen on elements (iPhone) get a fixed full-window mode instead.
(function () {
  document.querySelectorAll(".player .controls").forEach(function (controls) {
    var root = controls.closest(".player");
    if (controls.querySelector(".movie-full")) return;
    var req = root.requestFullscreen || root.webkitRequestFullscreen;
    var btn = document.createElement("button");
    btn.type = "button"; btn.className = "btn ghost movie-full";
    var isFull = function () {
      return document.fullscreenElement === root || document.webkitFullscreenElement === root || root.classList.contains("pseudo-full");
    };
    var label = function () { btn.textContent = isFull() ? "✕ יציאה ממסך מלא" : "⛶ מסך מלא"; };
    var pseudo = function (on) {
      root.classList.toggle("pseudo-full", on);
      document.body.classList.toggle("no-scroll", on);
      label();
    };
    btn.addEventListener("click", function () {
      if (root.classList.contains("pseudo-full")) return pseudo(false);
      if (document.fullscreenElement === root || document.webkitFullscreenElement === root) {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document); return;
      }
      if (req) {
        var p = req.call(root);
        if (p && p.catch) p.catch(function () { pseudo(true); });
      } else pseudo(true);
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && root.classList.contains("pseudo-full")) pseudo(false); });
    document.addEventListener("fullscreenchange", label);
    document.addEventListener("webkitfullscreenchange", label);
    label();
    controls.insertBefore(btn, controls.querySelector(".progress"));
  });
})();
