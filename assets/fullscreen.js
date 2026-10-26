// Adds a "full screen" button to every lesson video player.
(function () {
  document.querySelectorAll(".player .controls").forEach(function (controls) {
    var root = controls.closest(".player");
    var req = root.requestFullscreen || root.webkitRequestFullscreen;
    if (!req || controls.querySelector(".movie-full")) return;
    var btn = document.createElement("button");
    btn.type = "button"; btn.className = "btn ghost movie-full";
    btn.textContent = "⛶ מסך מלא";
    var isFull = function () { return document.fullscreenElement === root || document.webkitFullscreenElement === root; };
    btn.addEventListener("click", function () {
      if (isFull()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else req.call(root);
    });
    var label = function () { btn.textContent = isFull() ? "✕ יציאה ממסך מלא" : "⛶ מסך מלא"; };
    document.addEventListener("fullscreenchange", label);
    document.addEventListener("webkitfullscreenchange", label);
    controls.insertBefore(btn, controls.querySelector(".progress"));
  });
})();
