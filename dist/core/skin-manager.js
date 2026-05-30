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
    __publicField(this, "_objectUrls", /* @__PURE__ */ new Map());
    this.skins = /* @__PURE__ */ new Map();
    this.activeSkin = "default";
    this._styleTag = null;
  }
  async init() {
    var _a2;
    console.log("Storyteller Cinema | Initializing Skin Manager...");
    this._createStyleTag();
    this._registerDefaultSkins();
    this._ensureDirectory("storyteller-cinema").catch((err) => console.warn("Storyteller Cinema | Root folder error:", err));
    this._loadCustomSkins();
    await this._loadHubSkins();
    const savedSkin = ((_a2 = game.settings) == null ? void 0 : _a2.get("storyteller-cinema", "activeSkin")) || "default";
    await this.apply(savedSkin);
  }
  async _fetchAssetAsObjectURL(relativePath, token) {
    try {
      const url = `https://api.github.com/repos/sammore2/storyteller-cinema-hub/contents/${relativePath}`;
      const response = await fetch(url, {
        headers: {
          "Authorization": `token ${token}`,
          "Accept": "application/vnd.github.v3.raw"
        }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (err) {
      console.error(`Storyteller Cinema | Failed to fetch asset as Blob: ${relativePath}`, err);
      return null;
    }
  }
  async _loadHubSkins() {
    var _a2, _b2, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m;
    const token = (_a2 = game.settings) == null ? void 0 : _a2.get("storyteller-cinema", "premiumGitHubToken");
    if (token) {
      try {
        const url = "https://api.github.com/repos/sammore2/storyteller-cinema-hub/contents/skins.json";
        const response = await fetch(url, {
          headers: {
            "Authorization": `token ${token}`,
            "Accept": "application/vnd.github.v3.raw"
          }
        });
        if (response.ok) {
          const data = await response.json().catch((err) => {
            console.error("Storyteller Cinema | Failed to parse skins.json from GitHub:", err);
            return null;
          });
          if (data && Array.isArray(data.skins)) {
            for (const skin of data.skins) {
              const mappedSkin = {
                id: skin.id,
                name: game.i18n.has(skin.name) ? game.i18n.localize(skin.name) : skin.name || skin.id,
                author: skin.author || "The Blacksmith",
                version: skin.version || "1.0.0",
                assets: { ...skin.files || {}, ...skin.assets || {} },
                // Merge legacy files + new assets (footer, etc.)
                options: {
                  theme: ((_b2 = skin.options) == null ? void 0 : _b2.theme) || "dark",
                  filter: ((_c = skin.options) == null ? void 0 : _c.filter) || "none",
                  barTexture: (_d = skin.options) == null ? void 0 : _d.barTexture,
                  backgroundTexture: (_e = skin.options) == null ? void 0 : _e.backgroundTexture,
                  overlayTexture: (_f = skin.options) == null ? void 0 : _f.overlayTexture,
                  styles: {
                    "--cinematic-bar-bg": ((_h = (_g = skin.options) == null ? void 0 : _g.styles) == null ? void 0 : _h["--cinematic-bar-bg"]) || "#000000",
                    "--cinematic-bar-border": ((_j = (_i = skin.options) == null ? void 0 : _i.styles) == null ? void 0 : _j["--cinematic-bar-border"]) || "none",
                    "--cinematic-text-color": ((_l = (_k = skin.options) == null ? void 0 : _k.styles) == null ? void 0 : _l["--cinematic-text-color"]) || "#ffffff",
                    ...(_m = skin.options) == null ? void 0 : _m.styles
                  }
                }
              };
              await this.register(mappedSkin, false);
            }
            console.log("Storyteller Cinema | Premium Hub Skins loaded from private GitHub repo.");
          }
        } else {
          console.warn(`Storyteller Cinema | Premium skin sync failed with HTTP status ${response.status}`);
        }
      } catch (err) {
        console.error("Storyteller Cinema | Premium skin synchronization failed:", err);
      }
    }
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
    var _a2, _b2, _c, _d;
    let skin = this.skins.get(skinId);
    if (!skin) {
      console.warn(`Storyteller Cinema | Skin '${skinId}' not found. Reverting to default.`);
      skinId = "default";
      skin = this.skins.get("default");
    }
    for (const url of this._objectUrls.values()) {
      URL.revokeObjectURL(url);
    }
    this._objectUrls.clear();
    const token = (_a2 = game.settings) == null ? void 0 : _a2.get("storyteller-cinema", "premiumGitHubToken");
    if (skin.assets && token) {
      (_b2 = ui.notifications) == null ? void 0 : _b2.info(`Storyteller Cinema | Loading secure premium assets for: ${skin.name}...`);
      const borderPath = skin.assets.border;
      const portraitBorderPath = skin.assets.portraitBorder || skin.assets.cardBorder;
      const bgPath = skin.assets.background;
      const topBarPath = skin.assets.topBar;
      const bottomBarPath = skin.assets.bottomBar;
      skin.options.styles = skin.options.styles || {};
      if (borderPath) {
        const borderObjUrl = await this._fetchAssetAsObjectURL(borderPath, token);
        if (borderObjUrl) {
          this._objectUrls.set("border", borderObjUrl);
          skin.options.styles["--cinematic-bar-border-image"] = `url("${borderObjUrl}")`;
        }
      }
      if (portraitBorderPath) {
        const portraitBorderObjUrl = await this._fetchAssetAsObjectURL(portraitBorderPath, token);
        if (portraitBorderObjUrl) {
          this._objectUrls.set("portraitBorder", portraitBorderObjUrl);
          skin.options.styles["--cinematic-portrait-border-image"] = `url("${portraitBorderObjUrl}")`;
        }
      }
      if (bgPath) {
        const bgObjUrl = await this._fetchAssetAsObjectURL(bgPath, token);
        if (bgObjUrl) {
          this._objectUrls.set("background", bgObjUrl);
          skin.options.backgroundTexture = bgObjUrl;
          skin.options.styles["--cinematic-portrait-background"] = `url("${bgObjUrl}")`;
        }
      }
      if (topBarPath) {
        const topBarObjUrl = await this._fetchAssetAsObjectURL(topBarPath, token);
        if (topBarObjUrl) {
          this._objectUrls.set("topBar", topBarObjUrl);
          skin.options.barTopTexture = topBarObjUrl;
          skin.options.styles["--cinematic-bar-top-texture"] = `url("${topBarObjUrl}")`;
        }
      }
      if (bottomBarPath) {
        const bottomBarObjUrl = await this._fetchAssetAsObjectURL(bottomBarPath, token);
        if (bottomBarObjUrl) {
          this._objectUrls.set("bottomBar", bottomBarObjUrl);
          skin.options.barBottomTexture = bottomBarObjUrl;
          skin.options.styles["--cinematic-bar-bottom-texture"] = `url("${bottomBarObjUrl}")`;
        }
      }
      const footerPath = skin.assets.footer;
      if (footerPath) {
        const footerObjUrl = await this._fetchAssetAsObjectURL(footerPath, token);
        if (footerObjUrl) {
          this._objectUrls.set("footer", footerObjUrl);
          skin.options.footerTexture = footerObjUrl;
          skin.options.styles["--cinematic-footer-texture"] = `url("${footerObjUrl}")`;
        }
      }
    }
    this.activeSkin = skinId;
    const classes = document.body.className.split(" ").filter((c) => !c.startsWith("cinematic-skin-"));
    document.body.className = classes.join(" ");
    document.body.classList.add(`cinematic-skin-${skinId}`);
    document.body.dataset.cinematicSkin = skinId;
    this._injectCSS(skin);
    if (((_c = game.settings) == null ? void 0 : _c.get("storyteller-cinema", "activeSkin")) !== skinId) {
      await ((_d = game.settings) == null ? void 0 : _d.set("storyteller-cinema", "activeSkin", skinId));
    }
    console.log(`Storyteller Cinema | Applied Skin: ${skin.name}`);
  }
  getSkins() {
    return Array.from(this.skins.values());
  }
  exportSkin(skinId) {
    var _a2, _b2;
    const skin = this.skins.get(skinId);
    if (!skin) {
      (_a2 = ui.notifications) == null ? void 0 : _a2.error("Storyteller Cinema | Skin not found.");
      return;
    }
    const data = JSON.stringify(skin, null, 2);
    const filename = `${skin.id}.json`;
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
      } catch (_) {
      }
    }, 1e3);
    try {
      navigator.clipboard.writeText(data);
      (_b2 = ui.notifications) == null ? void 0 : _b2.info(`Storyteller Cinema | Skin exported. JSON also copied to clipboard.`);
    } catch (_) {
    }
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
  async _downloadAndSave(url, targetDir, filename, token) {
    try {
      const headers = {};
      if (token) {
        headers["Authorization"] = `token ${token}`;
      }
      const response = await fetch(url, { headers });
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
      const skipKeys = /* @__PURE__ */ new Set([
        "--cinematic-bg-texture",
        "--cinematic-bar-top-texture",
        "--cinematic-bar-bottom-texture",
        "--cinematic-footer-texture",
        "--cinematic-overlay-texture"
      ]);
      for (const [key, value] of Object.entries(skin.options.styles)) {
        if (skipKeys.has(key)) continue;
        css += `    ${key}: ${value};
`;
      }
    }
    css += `    --cinematic-filter: ${skin.options.filter || "none"};
`;
    const sanitize = (p) => {
      if (!p) return null;
      if (p.startsWith("http") || p.startsWith("/") || p.startsWith("blob:")) return p;
      return `/${p}`;
    };
    const barTex = sanitize(skin.options.barTexture || skin.options.backgroundTexture);
    if (barTex) {
      css += `    --cinematic-bg-texture: url("${barTex}");
`;
    }
    const barTopTex = sanitize(skin.options.barTopTexture);
    if (barTopTex) {
      css += `    --cinematic-bar-top-texture: url("${barTopTex}");
`;
    }
    const barBottomTex = sanitize(skin.options.barBottomTexture);
    if (barBottomTex) {
      css += `    --cinematic-bar-bottom-texture: url("${barBottomTex}");
`;
    }
    const footerTex = sanitize(skin.options.footerTexture);
    if (footerTex) {
      css += `    --cinematic-footer-texture: url("${footerTex}");
`;
    }
    const overlayTex = sanitize(skin.options.overlayTexture);
    if (overlayTex) {
      css += `    --cinematic-overlay-texture: url("${overlayTex}");
`;
    }
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
