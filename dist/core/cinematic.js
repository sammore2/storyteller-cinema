function createOverlay() {
  if (document.getElementById("storyteller-cinema-overlay")) return;
  const overlay = document.createElement("div");
  overlay.id = "storyteller-cinema-overlay";
  overlay.innerHTML = '<div class="cinematic-bar top"></div><div class="cinematic-bar bottom"></div>';
  document.body.appendChild(overlay);
}
let cinematicContainer = null;
Hooks.on("canvasReady", () => {
  const viewMode = canvas.scene.getFlag("storyteller-cinema", "viewMode");
  const isActive = canvas.scene.getFlag("storyteller-cinema", "active") || false;
  const shouldBeCinematic = isActive || viewMode === "cinematic";
  toggleCinematicMode(shouldBeCinematic, "default");
});
async function setCinematicBackground(active) {
  var _a, _b;
  {
    const bgPath = canvas.scene.getFlag("storyteller-cinema", "cinematicBg");
    console.log("Storyteller Cinema | 🖼️ Setting Background. Path:", bgPath);
    if ((_a = canvas.primary) == null ? void 0 : _a.background) {
      canvas.primary.background.visible = false;
    }
    if (canvas.grid) canvas.grid.visible = false;
    if (canvas.walls) canvas.walls.visible = false;
    if (canvas.templates) canvas.templates.visible = false;
    if (canvas.foreground) canvas.foreground.visible = false;
    if ((_b = canvas.controls) == null ? void 0 : _b.doors) canvas.controls.doors.visible = false;
    if (canvas.lighting) canvas.lighting.visible = false;
    if (canvas.effects) canvas.effects.visible = false;
    if (canvas.fog) canvas.fog.visible = false;
    if (bgPath) {
      try {
        const tex = await foundry.canvas.loadTexture(bgPath);
        if (cinematicContainer) {
          if (cinematicContainer.destroyed || cinematicContainer.parent !== canvas.primary) {
            if (!cinematicContainer.destroyed) cinematicContainer.destroy({ children: true });
            cinematicContainer = null;
          }
        }
        if (!cinematicContainer) {
          cinematicContainer = new PIXI.Container();
          cinematicContainer.eventMode = "none";
          const sprite2 = new PIXI.Sprite(tex);
          sprite2.anchor.set(0.5);
          cinematicContainer.addChild(sprite2);
          canvas.primary.addChildAt(cinematicContainer, 0);
        }
        const sprite = cinematicContainer.children[0];
        sprite.texture = tex;
        const rect = canvas.dimensions.sceneRect;
        const scaleW = window.innerWidth / rect.width;
        const scaleH = window.innerHeight / rect.height;
        const cameraScale = Math.min(scaleW, scaleH);
        const visibleWorldWidth = window.innerWidth / cameraScale;
        const visibleWorldHeight = window.innerHeight / cameraScale;
        const cx = rect.x + rect.width / 2;
        const cy = rect.y + rect.height / 2;
        sprite.position.set(cx, cy);
        const targetWidth = Math.max(rect.width, visibleWorldWidth);
        const targetHeight = Math.max(rect.height, visibleWorldHeight);
        const texScaleX = targetWidth / tex.width;
        const texScaleY = targetHeight / tex.height;
        const finalScale = Math.max(texScaleX, texScaleY);
        sprite.scale.set(finalScale);
      } catch (err) {
        console.error("Storyteller Cinema | BG Error:", err);
      }
    }
  }
}
let _visionCache = true;
function toggleCinematicMode(active, skin = "default") {
  const body = document.body;
  if (active) {
    body.classList.add("cinematic-mode");
    if (skin !== "default") {
      body.classList.add(`cinematic-skin-${skin}`);
    }
    if (canvas.ready) {
      _visionCache = canvas.sight.tokenVision;
      canvas.sight.tokenVision = false;
      canvas.perception.refresh();
    }
  } else {
    body.classList.remove("cinematic-mode");
    const skinClasses = Array.from(body.classList).filter((c) => c.startsWith("cinematic-skin-"));
    skinClasses.forEach((c) => body.classList.remove(c));
    if (canvas.ready) {
      canvas.sight.tokenVision = _visionCache;
      canvas.perception.refresh();
    }
  }
}
Hooks.on("updateScene", (document2, change, options, userId) => {
  var _a, _b, _c, _d;
  if (!document2.isView) return;
  const activeChange = (_b = (_a = change.flags) == null ? void 0 : _a["storyteller-cinema"]) == null ? void 0 : _b.active;
  if (activeChange !== void 0) {
    toggleCinematicMode(activeChange);
  }
  if (window.document.body.classList.contains("cinematic-mode")) {
    const flagChange = (_d = (_c = change.flags) == null ? void 0 : _c["storyteller-cinema"]) == null ? void 0 : _d.cinematicBg;
    if (flagChange !== void 0) {
      console.log("Storyteller Cinema | Background updated, refreshing...");
      setCinematicBackground();
    }
  }
});
export {
  createOverlay as c,
  toggleCinematicMode as t
};
//# sourceMappingURL=cinematic.js.map
