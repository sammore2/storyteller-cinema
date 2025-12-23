import { S as StorytellerAPI } from "./core/api.js";
import { S as SkinManager } from "./core/skin-manager.js";
import { a as applyVisualDepth } from "./core/depth.js";
import { r as registerUIHooks } from "./hooks/ui.js";
Hooks.once("init", async function() {
  console.log("Storyteller Cinema | Initializing...");
  game.settings.register("storyteller-cinema", "activeSkin", {
    name: "Active Skin",
    scope: "client",
    // Client specific preference
    config: false,
    // Hidden from menu, managed by Skin UI
    type: String,
    default: "default",
    onChange: (value) => {
      var _a;
      if ((_a = window.StorytellerCinema) == null ? void 0 : _a.skins) {
        window.StorytellerCinema.skins.apply(value);
      }
    }
  });
  game.settings.register("storyteller-cinema", "customSkins", {
    name: "Custom Skins",
    scope: "client",
    // Stored locally per user (or world if shared needed)
    config: false,
    type: Array,
    default: []
  });
  game.settings.register("storyteller-cinema", "referenceHeight", {
    name: "Reference Height (%)",
    hint: "Token height relative to the screen height.",
    scope: "world",
    config: true,
    type: Number,
    default: 35,
    range: { min: 10, max: 80, step: 5 }
  });
  game.settings.register("storyteller-cinema", "minScale", {
    name: "Min Depth Scale",
    hint: "Scale multiplier at the top (background).",
    scope: "world",
    config: true,
    type: Number,
    default: 0.5,
    range: { min: 0.1, max: 1, step: 0.1 }
  });
  game.settings.register("storyteller-cinema", "maxScale", {
    name: "Max Depth Scale",
    hint: "Scale multiplier at the bottom (foreground).",
    scope: "world",
    config: true,
    type: Number,
    default: 1.2,
    range: { min: 1, max: 3, step: 0.1 }
  });
  window.StorytellerCinema = new StorytellerAPI();
  window.StorytellerCinema.skins = new SkinManager();
  window.StorytellerCinema.init();
  window.StorytellerCinema.skins.init();
  const visTarget = "foundry.canvas.groups.CanvasVisibility.prototype.tokenVision";
  try {
    libWrapper.register("storyteller-cinema", visTarget, function(wrapped, ...args) {
      var _a;
      if ((_a = window.StorytellerCinema) == null ? void 0 : _a.active) return false;
      return wrapped(...args);
    }, "MIXED");
    console.log("Storyteller Cinema | Hook registered on", visTarget);
  } catch (err) {
    console.warn("Storyteller Cinema | Failed to register Visibility wrapper:", err);
    try {
      libWrapper.register("storyteller-cinema", "CanvasVisibility.prototype.tokenVision", function(wrapped, ...args) {
        var _a;
        if ((_a = window.StorytellerCinema) == null ? void 0 : _a.active) return false;
        return wrapped(...args);
      }, "MIXED");
      console.log("Storyteller Cinema | Hook registered on Global CanvasVisibility");
    } catch (e2) {
      console.error("Storyteller Cinema | ALL wrapper attempts failed:", e2);
    }
  }
  const polygonTarget = "foundry.canvas.geometry.ClockwiseSweepPolygon.testCollision";
  try {
    libWrapper.register("storyteller-cinema", polygonTarget, function(wrapped, ...args) {
      var _a;
      if ((_a = window.StorytellerCinema) == null ? void 0 : _a.active) return false;
      return wrapped(...args);
    }, "MIXED");
    console.log("Storyteller Cinema | Hook registered on", polygonTarget);
  } catch (err) {
    console.warn("Storyteller Cinema | Failed to register Polygon collision wrapper:", err);
  }
  registerUIHooks();
  game.keybindings.register("storyteller-cinema", "toggle-mode", {
    name: "Toggle Cinematic Mode",
    hint: "Switch view",
    editable: [{ key: "KeyZ", modifiers: ["Shift"] }],
    onDown: () => {
      if (game.user.isGM) {
        const current = canvas.scene.getFlag("storyteller-cinema", "active");
        canvas.scene.setFlag("storyteller-cinema", "active", !current);
      }
    },
    restricted: false
  });
});
Hooks.on("canvasReady", () => {
  const viewMode = canvas.scene.getFlag("storyteller-cinema", "viewMode");
  const isActive = canvas.scene.getFlag("storyteller-cinema", "active") || false;
  const shouldBeCinematic = isActive || viewMode === "cinematic";
  window.StorytellerCinema.toggle(shouldBeCinematic, { init: true });
});
Hooks.on("updateScene", async (document, change, options, userId) => {
  var _a, _b, _c, _d;
  if (!document.isView) return;
  const activeChange = (_b = (_a = change.flags) == null ? void 0 : _a["storyteller-cinema"]) == null ? void 0 : _b.active;
  if (activeChange !== void 0) {
    setTimeout(() => {
      window.StorytellerCinema.toggle(activeChange);
    }, 50);
  }
  if (window.StorytellerCinema.active) {
    const flagChange = (_d = (_c = change.flags) == null ? void 0 : _c["storyteller-cinema"]) == null ? void 0 : _d.cinematicBg;
    if (flagChange !== void 0) {
      window.StorytellerCinema.toggle(true);
    }
    window.StorytellerCinema.enforceVision();
  }
});
Hooks.on("updateToken", (tokenDocument, change, options) => {
  var _a, _b;
  if (!change.x && !change.y) return;
  if ((_a = change.flags) == null ? void 0 : _a["storyteller-cinema"]) return;
  if (options.skippingMemory) return;
  try {
    if (game.user.isGM || tokenDocument.isOwner) {
      const isCinematic = (_b = window.StorytellerCinema) == null ? void 0 : _b.active;
      const targetFlag = isCinematic ? "cinematicPos" : "battlePos";
      const newPos = { x: change.x ?? tokenDocument.x, y: change.y ?? tokenDocument.y };
      tokenDocument.setFlag("storyteller-cinema", targetFlag, newPos);
      if (isCinematic && tokenDocument.object) {
        applyVisualDepth(tokenDocument.object);
      }
    }
  } catch (err) {
    console.error("Storyteller Cinema | Update Error:", err);
  }
});
Hooks.on("refreshToken", (token) => {
  var _a;
  if ((_a = window.StorytellerCinema) == null ? void 0 : _a.active) {
    applyVisualDepth(token);
  }
});
//# sourceMappingURL=main.js.map
