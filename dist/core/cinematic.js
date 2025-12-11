import { a as applyVisualDepth } from "./depth.js";
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
    console.log("Storyteller Cinema | 🟢 Visual Novel Mode ON");
    canvas.tokens.placeables.forEach((token) => {
      applyVisualDepth(token);
    });
  } else {
    if (overlay) overlay.classList.remove("active");
    document.body.classList.remove("cinematic-mode");
    console.log("Storyteller Cinema | 🔴 Visual Novel Mode OFF");
    if (canvas.tokens) {
      canvas.tokens.placeables.forEach((token) => {
        if (token.mesh && token.document) {
          token.mesh.scale.set(token.document.texture.scaleX, token.document.texture.scaleY);
          token.mesh.rotation = Math.toRadians(token.document.rotation);
          token.mesh.alpha = token.document.hidden ? 0.5 : 1;
          token.refresh();
        }
      });
    }
  }
}
export {
  createOverlay as c,
  toggleCinematicMode as t
};
//# sourceMappingURL=cinematic.js.map
