import { P as ProxyManager } from "./proxy.js";
function createOverlay() {
  if (document.getElementById("storyteller-cinema-overlay")) return;
  const overlay = document.createElement("div");
  overlay.id = "storyteller-cinema-overlay";
  overlay.innerHTML = '<div class="cinematic-bar top"></div><div class="cinematic-bar bottom"></div>';
  document.body.appendChild(overlay);
}
async function toggleCinematicMode(active) {
  const overlay = document.getElementById("storyteller-cinema-overlay");
  if (active) {
    if (overlay) overlay.classList.add("active");
    document.body.classList.add("cinematic-mode");
    console.log("Storyteller Cinema | 🟢 Mode ON");
    ProxyManager.enable();
  } else {
    if (overlay) overlay.classList.remove("active");
    document.body.classList.remove("cinematic-mode");
    console.log("Storyteller Cinema | 🔴 Mode OFF");
    ProxyManager.disable();
  }
}
export {
  createOverlay as c,
  toggleCinematicMode as t
};
//# sourceMappingURL=cinematic.js.map
