import { r as registerInitHooks } from "./hooks/init.js";
import { r as registerUIHooks } from "./hooks/ui.js";
import { a as applyVisualDepth } from "./core/depth.js";
import { t as toggleCinematicMode } from "./core/cinematic.js";
registerInitHooks();
registerUIHooks();
Hooks.on("refreshToken", (token) => {
  if (document.body.classList.contains("cinematic-mode")) {
    applyVisualDepth(token);
  }
});
Hooks.on("canvasReady", async (canvas2) => {
  var _a, _b;
  const scene = canvas2.scene;
  if (!scene) return;
  const shouldActivate = scene.getFlag("storyteller-cinema", "viewMode") === "cinematic";
  if (shouldActivate) {
    let maxTries = 20;
    while (((_b = (_a = canvas2.tokens) == null ? void 0 : _a.placeables) == null ? void 0 : _b.length) === 0 && maxTries > 0) {
      await new Promise((r) => setTimeout(r, 100));
      maxTries--;
    }
  }
  await toggleCinematicMode(shouldActivate);
});
Hooks.on("updateScene", (scene, data) => {
  var _a;
  if (!canvas.ready || scene.id !== ((_a = canvas.scene) == null ? void 0 : _a.id)) return;
  if (data.flags && data.flags["storyteller-cinema"] && data.flags["storyteller-cinema"].viewMode !== void 0) {
    const newMode = data.flags["storyteller-cinema"].viewMode;
    toggleCinematicMode(newMode === "cinematic");
  }
});
Hooks.on("createToken", (tokenDoc) => {
  if (document.body.classList.contains("cinematic-mode")) {
    setTimeout(() => {
      if (tokenDoc.object) applyVisualDepth(tokenDoc.object);
    }, 50);
  }
});
//# sourceMappingURL=main.js.map
