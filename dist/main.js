import { S as StorytellerAPI } from "./core/api.js";
import { S as SkinManager } from "./core/skin-manager.js";
import { r as registerUIHooks } from "./hooks/ui.js";
import { r as registerRenderHooks } from "./hooks/render.js";
import { r as registerChatHooks } from "./hooks/chat.js";
Hooks.once("init", async function() {
  console.log("Storyteller Cinema | Initializing...");
  game.settings.register("storyteller-cinema", "activeSkin", {
    name: "Active Skin",
    scope: "client",
    config: false,
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
    config: false,
    type: Array,
    default: []
  });
  game.settings.register("storyteller-cinema", "cinemaModeActive", {
    name: "Cinema Mode Active",
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });
  game.settings.register("storyteller-cinema", "sceneCast", {
    name: "Scene Cast",
    scope: "world",
    config: false,
    type: Array,
    default: []
  });
  game.settings.register("storyteller-cinema", "activePortraits", {
    name: "Active Portraits",
    scope: "world",
    config: false,
    type: Array,
    default: [],
    onChange: () => {
      if (window.StorytellerCinema) {
        window.StorytellerCinema.refreshPortraits();
      }
    }
  });
  game.settings.register("storyteller-cinema", "stageFontFamily", {
    name: "Stage Font Family",
    hint: "The font family used for dialogue subtitles on the stage.",
    scope: "world",
    config: true,
    type: String,
    default: "Inter",
    choices: {
      "Inter": "Inter (Modern Sans)",
      "Roboto": "Roboto (Clean Sans)",
      "Outfit": "Outfit (Geometric)",
      "Merriweather": "Merriweather (Classic Serif)",
      "Courier Prime": "Courier Prime (Typewriter)"
    },
    onChange: (value) => {
      document.documentElement.style.setProperty("--stage-font-family", value);
    }
  });
  game.settings.register("storyteller-cinema", "stageFontSize", {
    name: "Stage Font Size (px)",
    hint: "The font size for dialogue subtitles.",
    scope: "world",
    config: true,
    type: Number,
    default: 24,
    range: { min: 14, max: 48, step: 2 },
    onChange: (value) => {
      document.documentElement.style.setProperty("--stage-font-size", `${value}px`);
    }
  });
  game.settings.register("storyteller-cinema", "stageActorFontSize", {
    name: "Stage Actor Name Font Size (px)",
    hint: "The font size for the actor's name above the dialogue.",
    scope: "world",
    config: true,
    type: Number,
    default: 28,
    range: { min: 14, max: 60, step: 2 },
    onChange: (value) => {
      document.documentElement.style.setProperty("--stage-actor-font-size", `${value}px`);
    }
  });
  game.settings.register("storyteller-cinema", "stageActorFontFamily", {
    name: "Stage Actor Font Family",
    hint: "The font family used for the character's name.",
    scope: "world",
    config: true,
    type: String,
    default: "Merriweather",
    choices: {
      "Inter": "Inter (Modern Sans)",
      "Roboto": "Roboto (Clean Sans)",
      "Outfit": "Outfit (Geometric)",
      "Merriweather": "Merriweather (Classic Serif)",
      "Courier Prime": "Courier Prime (Typewriter)"
    },
    onChange: (value) => {
      document.documentElement.style.setProperty("--stage-actor-font-family", value);
    }
  });
  game.settings.register("storyteller-cinema", "trayOpacity", {
    name: "Tray Idle Opacity",
    hint: "Opacity of the Stage Tray when not hovered.",
    scope: "client",
    config: true,
    type: Number,
    default: 0.4,
    range: { min: 0.1, max: 1, step: 0.1 },
    onChange: (value) => {
      document.documentElement.style.setProperty("--tray-idle-opacity", value.toString());
    }
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
  } catch (err) {
    console.warn("Storyteller Cinema | Visibility wrapper failed:", err);
  }
  const polygonTarget = "foundry.canvas.geometry.ClockwiseSweepPolygon.testCollision";
  try {
    libWrapper.register("storyteller-cinema", polygonTarget, function(wrapped, ...args) {
      var _a;
      if ((_a = window.StorytellerCinema) == null ? void 0 : _a.active) return false;
      return wrapped(...args);
    }, "MIXED");
  } catch (err) {
    console.warn("Storyteller Cinema | Polygon wrapper failed:", err);
  }
  registerUIHooks();
  registerRenderHooks();
  registerChatHooks();
  Hooks.on("updateActor", (actor) => {
    const tray = window.StorytellerCinema.cinemaTray;
    if (tray) {
      const castIds = game.settings.get("storyteller-cinema", "sceneCast") || [];
      if (castIds.includes(actor.id)) {
        tray.render();
      }
    }
  });
  game.keybindings.register("storyteller-cinema", "toggle-mode", {
    name: "Toggle Cinematic Mode",
    hint: "Switch view",
    editable: [{ key: "KeyZ", modifiers: ["Shift"] }],
    onDown: () => {
      var _a, _b, _c;
      if ((_a = game.user) == null ? void 0 : _a.isGM) {
        const current = (_b = canvas.scene) == null ? void 0 : _b.getFlag("storyteller-cinema", "active");
        (_c = canvas.scene) == null ? void 0 : _c.setFlag("storyteller-cinema", "active", !current);
      }
    },
    restricted: false
  });
});
Hooks.on("canvasReady", () => {
  if (!canvas.scene) return;
  const viewMode = canvas.scene.getFlag("storyteller-cinema", "viewMode");
  const isActive = canvas.scene.getFlag("storyteller-cinema", "active") || false;
  const shouldBeCinematic = !!(isActive || viewMode === "cinematic");
  window.StorytellerCinema.toggle(shouldBeCinematic, { init: true });
});
Hooks.on("updateScene", async (doc, change) => {
  var _a, _b, _c, _d, _e, _f;
  if (!doc.isView) return;
  const activeChange = (_b = (_a = change.flags) == null ? void 0 : _a["storyteller-cinema"]) == null ? void 0 : _b.active;
  if (activeChange !== void 0) {
    setTimeout(() => {
      window.StorytellerCinema.toggle(activeChange);
    }, 50);
  }
  if (window.StorytellerCinema.active) {
    const flagChange = (_d = (_c = change.flags) == null ? void 0 : _c["storyteller-cinema"]) == null ? void 0 : _d.cinematicBg;
    const dimChange = (_f = (_e = change.flags) == null ? void 0 : _e["storyteller-cinema"]) == null ? void 0 : _f.cinematicBgDim;
    if (flagChange !== void 0 || dimChange !== void 0) {
      window.StorytellerCinema.toggle(true);
    }
    window.StorytellerCinema.enforceVision();
  }
});
Hooks.once("socketlib.ready", () => {
  var _a;
  const socket = (_a = window.socketlib) == null ? void 0 : _a.registerModule("storyteller-cinema");
  if (socket) {
    socket.register("showSubtitle", (actorName, message, options) => {
      window.StorytellerCinema._showSubtitleLocal(actorName, message, options);
    });
    socket.register("clearSubtitle", () => {
      window.StorytellerCinema._clearLocal();
    });
    game.modules.get("storyteller-cinema").socket = socket;
  } else {
    console.warn("Storyteller Cinema | Socketlib registration failed. Broadcast features will be disabled.");
  }
});
Hooks.once("ready", () => {
  const fontFamily = game.settings.get("storyteller-cinema", "stageFontFamily");
  const fontSize = game.settings.get("storyteller-cinema", "stageFontSize");
  const actorFontFamily = game.settings.get("storyteller-cinema", "stageActorFontFamily");
  const actorFontSize = game.settings.get("storyteller-cinema", "stageActorFontSize");
  const idleOpacity = game.settings.get("storyteller-cinema", "trayOpacity");
  document.documentElement.style.setProperty("--stage-font-family", fontFamily);
  document.documentElement.style.setProperty("--stage-font-size", `${fontSize}px`);
  document.documentElement.style.setProperty("--stage-actor-font-family", actorFontFamily);
  document.documentElement.style.setProperty("--stage-actor-font-size", `${actorFontSize}px`);
  document.documentElement.style.setProperty("--tray-idle-opacity", idleOpacity.toString());
});
//# sourceMappingURL=main.js.map
