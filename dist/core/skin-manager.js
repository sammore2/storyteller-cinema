var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var _a, _b;
const FilePickerClass = ((_b = (_a = foundry.applications) == null ? void 0 : _a.apps) == null ? void 0 : _b.FilePicker) || FilePicker;
class SkinManager {
  constructor() {
    __publicField(this, "skins");
    __publicField(this, "activeSkin");
    __publicField(this, "_styleTag");
    this.skins = /* @__PURE__ */ new Map();
    this.activeSkin = "default";
    this._styleTag = null;
  }
  init() {
    var _a2;
    console.log("Storyteller Cinema | Initializing Skin Manager...");
    this._createStyleTag();
    this._registerDefaultSkins();
    this._ensureDirectory("storyteller-cinema").catch((err) => console.warn("Storyteller Cinema | Root folder error:", err));
    this._loadCustomSkins();
    const savedSkin = ((_a2 = game.settings) == null ? void 0 : _a2.get("storyteller-cinema", "activeSkin")) || "default";
    this.apply(savedSkin);
  }
  async register(skinData, persist = false) {
    if (!skinData.id) {
      console.error("Storyteller Cinema | Skin missing ID:", skinData);
      return;
    }
    this.skins.set(skinData.id, skinData);
    console.log(`Storyteller Cinema | Skin Registered: ${skinData.name} (${skinData.id})`);
    if (persist) {
      await this._saveCustomSkin(skinData);
    }
    Hooks.call("storyteller-cinema-skins-updated");
  }
  _loadCustomSkins() {
    var _a2;
    const customSkins = ((_a2 = game.settings) == null ? void 0 : _a2.get("storyteller-cinema", "customSkins")) || [];
    customSkins.forEach((skin) => {
      this.register(skin, false);
    });
  }
  async _saveCustomSkin(skinData) {
    var _a2, _b2;
    if (skinData.author === "System" || !skinData.id) return;
    const customSkins = ((_a2 = game.settings) == null ? void 0 : _a2.get("storyteller-cinema", "customSkins")) || [];
    const others = customSkins.filter((s) => s.id !== skinData.id);
    others.push(skinData);
    await ((_b2 = game.settings) == null ? void 0 : _b2.set("storyteller-cinema", "customSkins", others));
    Hooks.call("storyteller-cinema-skins-updated");
  }
  async delete(skinId) {
    var _a2, _b2, _c;
    const skin = this.skins.get(skinId);
    if (!skin) return;
    if (skin.author === "System") {
      (_a2 = ui.notifications) == null ? void 0 : _a2.warn("Storyteller Cinema | Cannot delete system skins.");
      return;
    }
    this.skins.delete(skinId);
    const customSkins = ((_b2 = game.settings) == null ? void 0 : _b2.get("storyteller-cinema", "customSkins")) || [];
    const filtered = customSkins.filter((s) => s.id !== skinId);
    await ((_c = game.settings) == null ? void 0 : _c.set("storyteller-cinema", "customSkins", filtered));
    if (this.activeSkin === skinId) {
      this.apply("default");
    }
    Hooks.call("storyteller-cinema-skins-updated");
  }
  async apply(skinId) {
    var _a2, _b2;
    let skin = this.skins.get(skinId);
    if (!skin) {
      console.warn(`Storyteller Cinema | Skin '${skinId}' not found. Reverting to default.`);
      skinId = "default";
      skin = this.skins.get("default");
    }
    this.activeSkin = skinId;
    const classes = document.body.className.split(" ").filter((c) => !c.startsWith("cinematic-skin-"));
    document.body.className = classes.join(" ");
    document.body.classList.add(`cinematic-skin-${skinId}`);
    document.body.dataset.cinematicSkin = skinId;
    this._injectCSS(skin);
    if (((_a2 = game.settings) == null ? void 0 : _a2.get("storyteller-cinema", "activeSkin")) !== skinId) {
      await ((_b2 = game.settings) == null ? void 0 : _b2.set("storyteller-cinema", "activeSkin", skinId));
    }
    console.log(`Storyteller Cinema | Applied Skin: ${skin.name}`);
  }
  getSkins() {
    return Array.from(this.skins.values());
  }
  exportSkin(skinId) {
    var _a2;
    const skin = this.skins.get(skinId);
    if (!skin) {
      (_a2 = ui.notifications) == null ? void 0 : _a2.error("Storyteller Cinema | Skin not found.");
      return;
    }
    const data = JSON.stringify(skin, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${skin.id}.json`;
    a.click();
  }
  async importSkin(jsonData) {
    var _a2, _b2, _c, _d, _e;
    let skin;
    try {
      skin = typeof jsonData === "string" ? JSON.parse(jsonData) : jsonData;
    } catch (e) {
      (_a2 = ui.notifications) == null ? void 0 : _a2.error("Storyteller Cinema | Invalid JSON.");
      return;
    }
    if (!skin.id || !skin.name) {
      (_b2 = ui.notifications) == null ? void 0 : _b2.error("Storyteller Cinema | Invalid Skin definition.");
      return;
    }
    if (skin.autoDownload && skin.assets) {
      (_c = ui.notifications) == null ? void 0 : _c.info("Storyteller Cinema | Downloading skin assets...");
      const targetDir = `storyteller-cinema/${skin.id}`;
      await this._ensureDirectory(targetDir);
      for (const [key, url] of Object.entries(skin.assets)) {
        if (!url || !url.startsWith("http")) continue;
        const filename = url.split("/").pop();
        const savedPath = await this._downloadAndSave(url, targetDir, filename);
        if (savedPath) {
          skin.options[key] = savedPath;
        }
      }
      (_d = ui.notifications) == null ? void 0 : _d.info("Storyteller Cinema | Assets downloaded successfully.");
    }
    await this.register(skin, true);
    await this.apply(skin.id);
    (_e = ui.notifications) == null ? void 0 : _e.info(`Storyteller Cinema | Imported skin: ${skin.name}`);
    return skin;
  }
  async _ensureDirectory(path) {
    const source = "data";
    const parts = path.split("/");
    let currentPath = "";
    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      try {
        await FilePickerClass.browse(source, currentPath);
      } catch (e) {
        try {
          await FilePickerClass.createDirectory(source, currentPath);
        } catch (err) {
          if (!err.message.includes("EEXIST")) {
            console.warn(`Storyteller Cinema | Failed to create ${currentPath}`, err);
          }
        }
      }
    }
  }
  async _downloadAndSave(url, targetDir, filename) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const file = new File([blob], filename, { type: blob.type });
      const result = await FilePickerClass.upload("data", targetDir, file);
      return result.path;
    } catch (err) {
      console.error(`Storyteller Cinema | Failed to fetch ${url}`, err);
      return null;
    }
  }
  _createStyleTag() {
    const existing = document.getElementById("storyteller-cinema-skin-styles");
    if (!existing) {
      this._styleTag = document.createElement("style");
      this._styleTag.id = "storyteller-cinema-skin-styles";
      document.head.appendChild(this._styleTag);
    } else {
      this._styleTag = existing;
    }
  }
  _injectCSS(skin) {
    if (!this._styleTag) this._createStyleTag();
    let css = `:root { 
`;
    if (skin.options.styles) {
      for (const [key, value] of Object.entries(skin.options.styles)) {
        css += `    ${key}: ${value};
`;
      }
    }
    css += `    --cinematic-filter: ${skin.options.filter || "none"};
`;
    const sanitize = (p) => {
      if (!p) return null;
      if (p.startsWith("http") || p.startsWith("/")) return p;
      return `/${p}`;
    };
    const barTex = sanitize(skin.options.barTexture || skin.options.backgroundTexture);
    css += `    --cinematic-bg-texture: ${barTex ? `url("${barTex}")` : "none"};
`;
    const overlayTex = sanitize(skin.options.overlayTexture);
    css += `    --cinematic-overlay-texture: ${overlayTex ? `url("${overlayTex}")` : "none"};
`;
    css += `}
`;
    this._styleTag.innerHTML = css;
  }
  _registerDefaultSkins() {
    this.register({
      id: "default",
      name: "Classic Black",
      author: "System",
      options: {
        theme: "dark",
        styles: {
          "--cinematic-bar-bg": "#000000",
          "--cinematic-bar-border": "none",
          "--cinematic-text-color": "#ffffff"
        }
      }
    });
    this.register({
      id: "vignette",
      name: "Soft Vignette",
      author: "System",
      options: {
        theme: "dark",
        styles: {
          "--cinematic-bar-bg": "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 50%, transparent 100%)",
          "--cinematic-bar-border": "none",
          "--cinematic-text-color": "#e0e0e0"
        }
      }
    });
    this.register({
      id: "noir",
      name: "Noir Detective",
      author: "System",
      options: {
        theme: "dark",
        filter: "grayscale(100%) contrast(1.2)",
        styles: {
          "--cinematic-bar-bg": "#1a1a1a",
          "--cinematic-bar-border": "1px solid #333",
          "--cinematic-text-color": "#cccccc"
        }
      }
    });
    this.register({
      id: "sepia",
      name: "Old Photograph",
      author: "System",
      options: {
        theme: "light",
        filter: "sepia(0.8) contrast(0.9)",
        styles: {
          "--cinematic-bar-bg": "#3b2f2f",
          "--cinematic-bar-border": "2px solid #8b7355",
          "--cinematic-text-color": "#f4ebd0"
        }
      }
    });
  }
}
export {
  SkinManager as S
};
//# sourceMappingURL=skin-manager.js.map
