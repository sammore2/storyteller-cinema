var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { S as StorytellerAPI } from "../core/api.js";
import { S as SkinManager } from "../core/skin-manager.js";
import { r as registerUIHooks } from "../hooks/ui.js";
import { r as registerRenderHooks } from "../hooks/render.js";
import { r as registerChatHooks } from "../hooks/chat.js";
Hooks.once("init", function() {
  console.log("Storyteller Cinema | Initializing...");
  const PIXI = window.PIXI;
  if (PIXI && PIXI.Sprite) {
    const proto = PIXI.Sprite.prototype;
    const dummyMethods = ["clear", "beginFill", "lineStyle", "drawRect", "drawRoundedRect", "drawCircle", "endFill"];
    for (const method of dummyMethods) {
      if (typeof proto[method] !== "function") {
        proto[method] = function() {
          return this;
        };
      }
    }
  }
  game.settings.register("storyteller-cinema", "activeSkin", {
    name: "Active Skin",
    scope: "world",
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
  game.settings.register("storyteller-cinema", "premiumKeys", {
    name: "Premium Keys",
    scope: "client",
    config: false,
    type: Array,
    default: [],
    onChange: () => {
      var _a;
      if ((_a = window.StorytellerCinema) == null ? void 0 : _a.skins) {
        window.StorytellerCinema.skins.init();
      }
    }
  });
  game.settings.register("storyteller-cinema", "ignoreDevKeys", {
    name: "Ignore Developer Keys",
    scope: "client",
    config: false,
    type: Boolean,
    default: false,
    onChange: () => {
      var _a;
      if ((_a = window.StorytellerCinema) == null ? void 0 : _a.skins) {
        window.StorytellerCinema.skins.init();
      }
    }
  });
  game.settings.register("storyteller-cinema", "customSkins", {
    name: "Custom Skins",
    scope: "world",
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
async function loadPremiumKeysFromServer() {
  try {
    const res = await fetch("/storyteller-cinema/keys.json?v=" + Date.now());
    if (res.ok) {
      const keys = await res.json();
      if (Array.isArray(keys)) return keys;
    }
  } catch (err) {
    console.warn("Storyteller Cinema | Não foi possível ler storyteller-cinema/keys.json do servidor:", err);
  }
  return [];
}
async function savePremiumKeysToServer(keys) {
  var _a, _b, _c;
  if (!((_a = game.user) == null ? void 0 : _a.isGM)) return false;
  try {
    const FilePickerClass = ((_c = (_b = foundry.applications) == null ? void 0 : _b.apps) == null ? void 0 : _c.FilePicker) || FilePicker;
    const source = "data";
    try {
      await FilePickerClass.browse(source, "storyteller-cinema");
    } catch {
      try {
        await FilePickerClass.createDirectory(source, "storyteller-cinema");
      } catch (err) {
        console.error("Storyteller Cinema | Falha ao criar pasta de armazenamento das chaves:", err);
      }
    }
    const data = JSON.stringify(keys, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const file = new File([blob], "keys.json", { type: "application/json" });
    await FilePickerClass.upload(source, "storyteller-cinema", file);
    console.log("Storyteller Cinema | Chaves salvas com sucesso no servidor em storyteller-cinema/keys.json");
    return true;
  } catch (err) {
    console.error("Storyteller Cinema | Falha ao salvar chaves no servidor:", err);
    return false;
  }
}
Hooks.once("ready", async () => {
  var _a, _b, _c, _d, _e;
  try {
    let serverKeys = await loadPremiumKeysFromServer();
    if ((_a = game.user) == null ? void 0 : _a.isGM) {
      let fileExists = false;
      const FilePickerClass = ((_c = (_b = foundry.applications) == null ? void 0 : _b.apps) == null ? void 0 : _c.FilePicker) || FilePicker;
      try {
        const browse = await FilePickerClass.browse("data", "storyteller-cinema");
        fileExists = browse.files.some((f) => f.endsWith("keys.json"));
      } catch (err) {
      }
      const clientKeys = game.settings.get("storyteller-cinema", "premiumKeys") || [];
      if (serverKeys.length === 0 && clientKeys.length > 0) {
        await savePremiumKeysToServer(clientKeys);
        serverKeys = clientKeys;
      } else if (!fileExists && clientKeys.length === 0) {
        await savePremiumKeysToServer([]);
      }
    }
    if (serverKeys.length > 0) {
      await game.settings.set("storyteller-cinema", "premiumKeys", serverKeys);
      console.log("Storyteller Cinema | Chaves carregadas e sincronizadas do servidor.");
      Hooks.callAll("storyteller-cinema-keys-updated", serverKeys);
    }
  } catch (err) {
    console.error("Storyteller Cinema | Erro ao inicializar sincronização de chaves no servidor:", err);
  }
  if ((_d = window.StorytellerCinema) == null ? void 0 : _d.skins) {
    await window.StorytellerCinema.skins.init();
  }
  const DrawingClass = (_e = CONFIG.Drawing) == null ? void 0 : _e.objectClass;
  if (!DrawingClass) {
    console.warn("Storyteller Cinema | Could not find Drawing class via CONFIG.Drawing.objectClass");
    return;
  }
  const proto = DrawingClass.prototype;
  if (proto._scIsVisiblePatched) return;
  let targetProto = proto;
  while (targetProto && !Object.getOwnPropertyDescriptor(targetProto, "isVisible")) {
    targetProto = Object.getPrototypeOf(targetProto);
  }
  const originalDescriptor = targetProto ? Object.getOwnPropertyDescriptor(targetProto, "isVisible") : null;
  if (originalDescriptor == null ? void 0 : originalDescriptor.get) {
    Object.defineProperty(proto, "isVisible", {
      get() {
        var _a2, _b2, _c2;
        if ((_a2 = window.StorytellerCinema) == null ? void 0 : _a2.active) {
          const showInCinema = ((_c2 = (_b2 = this.document) == null ? void 0 : _b2.getFlag) == null ? void 0 : _c2.call(_b2, "storyteller-cinema", "showInCinema")) || false;
          if (!showInCinema) return false;
        }
        return originalDescriptor.get.call(this);
      },
      configurable: true
    });
    proto._scIsVisiblePatched = true;
    console.log("Storyteller Cinema | Drawing.isVisible patched successfully.");
  } else {
    console.warn("Storyteller Cinema | Could not find isVisible getter on Drawing prototype chain.");
  }
});
Hooks.on("canvasReady", () => {
  if (!canvas.scene) return;
  const viewMode = canvas.scene.getFlag("storyteller-cinema", "viewMode");
  const isActive = canvas.scene.getFlag("storyteller-cinema", "active") || false;
  const shouldBeCinematic = !!(isActive || viewMode === "cinematic");
  window.StorytellerCinema.toggle(shouldBeCinematic, { init: true });
});
Hooks.on("updateScene", async (doc, change) => {
  var _a, _b, _c, _d, _e, _f, _g, _h;
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
    const dragChange = (_h = (_g = change.flags) == null ? void 0 : _g["storyteller-cinema"]) == null ? void 0 : _h.draggedPositions;
    if (dragChange !== void 0) {
      window.StorytellerCinema.syncDraggedPositions(dragChange);
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
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
class KeyManager extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options = {}) {
    super(options);
    __publicField(this, "_hookId", null);
  }
  static get DEFAULT_OPTIONS() {
    return {
      tagName: "form",
      id: "storyteller-cinema-key-manager",
      window: {
        title: "Storyteller's Cinema - Premium Hub",
        icon: "fas fa-key",
        resizable: true,
        width: 650,
        height: 520
      },
      position: {
        width: 650,
        height: 520
      },
      form: {
        handler: KeyManager._onSubmit,
        submitOnChange: false,
        closeOnSubmit: false
      },
      actions: {
        addKey: KeyManager._onAddKey,
        removeKey: KeyManager._onRemoveKey,
        connectPatreon: KeyManager._onConnectPatreon,
        toggleIgnoreDev: KeyManager._onToggleIgnoreDev
      }
    };
  }
  static get PARTS() {
    return {
      form: {
        template: "modules/storyteller-cinema/templates/key-manager.hbs"
      }
    };
  }
  async _prepareContext(_options) {
    var _a, _b, _c, _d;
    const keysArray = game.settings.get("storyteller-cinema", "premiumKeys") || [];
    const activeKeysList = [];
    const unlockedPacks = /* @__PURE__ */ new Set(["classics"]);
    const ignoreDevKeys = game.settings.get("storyteller-cinema", "ignoreDevKeys") || false;
    const hasDevKey = keysArray.some((key) => key.startsWith("sammore-dev-") && key.endsWith("5633"));
    for (const key of keysArray) {
      const isDev = !ignoreDevKeys && key.startsWith("sammore-dev-") && key.endsWith("5633");
      let tier = "Avulsa/Promocional";
      let typeClass = "promo";
      if (isDev) {
        tier = "Desenvolvedor";
        typeClass = "dev";
        unlockedPacks.add("the-umbra");
        unlockedPacks.add("cyberpunk-neon");
        unlockedPacks.add("eldritch-abyss");
        unlockedPacks.add("steampunk-gears");
      } else if (key.toLowerCase() === "classics") {
        tier = "Gratuito";
        typeClass = "free";
      } else {
        try {
          const res = await fetch(`https://storyteller-cinema-proxy.robsammore.workers.dev/packs?key=${encodeURIComponent(key)}`);
          if (res.ok) {
            const data = await res.json();
            (data.packs || []).forEach((p) => unlockedPacks.add(p));
            if (data.tier === "Developer") {
              tier = "Desenvolvedor";
              typeClass = "dev";
            } else if ((_a = data.packs) == null ? void 0 : _a.includes("cyberpunk-neon")) {
              tier = "Patreon Silver";
              typeClass = "patreon";
            } else if (((_b = data.packs) == null ? void 0 : _b.includes("the-umbra")) && ((_c = data.packs) == null ? void 0 : _c.length) > 2) {
              tier = "Patreon Gold";
              typeClass = "patreon";
            } else if ((_d = data.packs) == null ? void 0 : _d.includes("the-umbra")) {
              tier = "Patreon Bronze";
              typeClass = "patreon";
            }
          }
        } catch (_) {
          tier = "Patreon/Avulsa";
          typeClass = "patreon";
        }
      }
      activeKeysList.push({
        key,
        tier,
        typeClass
      });
    }
    const packsShowcase = [
      {
        id: "the-umbra",
        title: "Bronze Suporter (The Umbra Pack)",
        description: "Estética sombria e misteriosa perfeita para crônicas góticas e mistérios arcanos.",
        banner: "modules/storyteller-cinema/assets/premium-banner/premium-banner.png",
        // Usando o banner clássico de fundo
        link: "https://www.patreon.com/c/storyteller_cinema",
        unlocked: unlockedPacks.has("the-umbra")
      },
      {
        id: "cyberpunk-neon",
        title: "Silver Suporter (Cyberpunk Neon Pack)",
        description: "Visuais futuristas vibrantes, luzes de neon e telas de dados de alta tecnologia.",
        banner: "modules/storyteller-cinema/assets/premium-banner/premium-banner.png",
        link: "https://www.patreon.com/c/storyteller_cinema",
        unlocked: unlockedPacks.has("cyberpunk-neon")
      },
      {
        id: "gold-pack",
        title: "Gold Suporter (Arsenal Cinemático Completo)",
        description: "Desbloqueia absolutamente todas as skins do acervo, incluindo Steampunk Gears e Eldritch Abyss.",
        banner: "modules/storyteller-cinema/assets/premium-banner/premium-banner.png",
        link: "https://www.patreon.com/c/storyteller_cinema",
        unlocked: unlockedPacks.has("eldritch-abyss") || unlockedPacks.has("steampunk-gears")
      }
    ];
    return {
      activeKeys: activeKeysList,
      packs: packsShowcase,
      ignoreDevKeys,
      hasDevKey
    };
  }
  _onRender(_context, _options) {
    super._onRender(_context, _options);
    if (!this._hookId) {
      this._hookId = Hooks.on("storyteller-cinema-skins-updated", () => {
        if (this.rendered) this.render();
      });
    }
  }
  static async _onSubmit(_event, _form, _formData) {
  }
  static async _onAddKey(event, _target) {
    var _a, _b, _c, _d, _e;
    event.preventDefault();
    const container = this.element;
    const input = container.querySelector(".new-key-field");
    const newKey = (_a = input == null ? void 0 : input.value) == null ? void 0 : _a.trim();
    if (!newKey) {
      (_b = ui.notifications) == null ? void 0 : _b.warn("Storyteller Cinema | Digite uma chave premium para adicionar.");
      return;
    }
    const keysList = game.settings.get("storyteller-cinema", "premiumKeys") || [];
    if (keysList.includes(newKey)) {
      (_c = ui.notifications) == null ? void 0 : _c.info("Storyteller Cinema | Esta chave já está cadastrada.");
      return;
    }
    keysList.push(newKey);
    await game.settings.set("storyteller-cinema", "premiumKeys", keysList);
    await savePremiumKeysToServer(keysList);
    (_d = ui.notifications) == null ? void 0 : _d.info("Storyteller Cinema | Chave adicionada com sucesso!");
    input.value = "";
    if ((_e = window.StorytellerCinema) == null ? void 0 : _e.skins) {
      await window.StorytellerCinema.skins.init();
    }
    this.render();
  }
  static async _onRemoveKey(event, _target) {
    var _a, _b, _c, _d, _e;
    event.preventDefault();
    const keyToRemove = ((_b = (_a = event.currentTarget) == null ? void 0 : _a.dataset) == null ? void 0 : _b.key) || ((_c = _target == null ? void 0 : _target.dataset) == null ? void 0 : _c.key);
    if (!keyToRemove) return;
    const keysList = game.settings.get("storyteller-cinema", "premiumKeys") || [];
    const filteredKeys = keysList.filter((k) => k !== keyToRemove);
    await game.settings.set("storyteller-cinema", "premiumKeys", filteredKeys);
    await savePremiumKeysToServer(filteredKeys);
    (_d = ui.notifications) == null ? void 0 : _d.info("Storyteller Cinema | Chave removida.");
    if ((_e = window.StorytellerCinema) == null ? void 0 : _e.skins) {
      await window.StorytellerCinema.skins.init();
    }
    this.render();
  }
  static _onConnectPatreon(event, _target) {
    event.preventDefault();
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open(
      "https://storyteller-cinema-proxy.robsammore.workers.dev/oauth/login",
      "PatreonLogin",
      `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
    );
    if (popup) {
      const messageListener = async (e) => {
        var _a, _b, _c, _d;
        if (e.origin !== "https://storyteller-cinema-proxy.robsammore.workers.dev") return;
        if (((_a = e.data) == null ? void 0 : _a.type) === "PATREON_KEY_ACTIVATED" && ((_b = e.data) == null ? void 0 : _b.key)) {
          const newKey = e.data.key;
          const keysList = game.settings.get("storyteller-cinema", "premiumKeys") || [];
          if (!keysList.includes(newKey)) {
            keysList.push(newKey);
            await game.settings.set("storyteller-cinema", "premiumKeys", keysList);
            await savePremiumKeysToServer(keysList);
            (_c = ui.notifications) == null ? void 0 : _c.info("Storyteller Cinema | Patreon conectado e chave premium ativada!");
            if ((_d = window.StorytellerCinema) == null ? void 0 : _d.skins) {
              await window.StorytellerCinema.skins.init();
            }
            this.render();
          }
          window.removeEventListener("message", messageListener);
        }
      };
      window.addEventListener("message", messageListener);
    }
  }
  static async _onToggleIgnoreDev(event, _target) {
    var _a, _b;
    event.preventDefault();
    const currentVal = game.settings.get("storyteller-cinema", "ignoreDevKeys") || false;
    await game.settings.set("storyteller-cinema", "ignoreDevKeys", !currentVal);
    (_a = ui.notifications) == null ? void 0 : _a.info(`Storyteller Cinema | Modo de teste ${!currentVal ? "ativado" : "desativado"} (chaves de dev ${!currentVal ? "ignoradas" : "ativas"}).`);
    if ((_b = window.StorytellerCinema) == null ? void 0 : _b.skins) {
      await window.StorytellerCinema.skins.init();
    }
    this.render();
  }
}
const keyManager = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  KeyManager
}, Symbol.toStringTag, { value: "Module" }));
export {
  keyManager as k,
  loadPremiumKeysFromServer as l,
  savePremiumKeysToServer as s
};
//# sourceMappingURL=key-manager.js.map
