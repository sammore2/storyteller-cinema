class SkinManager {
  constructor() {
    this.skins = /* @__PURE__ */ new Map();
    this.activeSkin = "default";
    this._styleTag = null;
  }
  init() {
    console.log("Storyteller Cinema | Initializing Skin Manager...");
    this._createStyleTag();
    this._registerDefaultSkins();
    this._loadCustomSkins();
    const savedSkin = game.settings.get("storyteller-cinema", "activeSkin") || "default";
    this.apply(savedSkin);
  }
  /**
   * Registers a new skin definition
   * @param {Object} skinData The skin definition object
   * @param {boolean} persist Whether to save to database (default: false)
   */
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
  /**
   * Loads custom skins from settings
   */
  _loadCustomSkins() {
    const customSkins = game.settings.get("storyteller-cinema", "customSkins") || [];
    customSkins.forEach((skin) => {
      this.register(skin, false);
    });
  }
  /**
   * Saves a skin to the customSkins setting
   */
  async _saveCustomSkin(skinData) {
    if (skinData.author === "System" || !skinData.id) return;
    const customSkins = game.settings.get("storyteller-cinema", "customSkins") || [];
    const others = customSkins.filter((s) => s.id !== skinData.id);
    others.push(skinData);
    await game.settings.set("storyteller-cinema", "customSkins", others);
    console.log("Storyteller Cinema | Custom Skins Saved to DB.");
    Hooks.call("storyteller-cinema-skins-updated");
  }
  /**
   * Applies a skin by ID
   * @param {string} skinId 
   */
  async apply(skinId) {
    if (!this.skins.has(skinId)) {
      console.warn(`Storyteller Cinema | Skin '${skinId}' not found. Reverting to default.`);
      skinId = "default";
    }
    const skin = this.skins.get(skinId);
    this.activeSkin = skinId;
    const classes = document.body.className.split(" ").filter((c) => !c.startsWith("cinematic-skin-"));
    document.body.className = classes.join(" ");
    document.body.classList.add(`cinematic-skin-${skinId}`);
    document.body.dataset.cinematicSkin = skinId;
    this._injectCSS(skin);
    if (game.settings.get("storyteller-cinema", "activeSkin") !== skinId) {
      await game.settings.set("storyteller-cinema", "activeSkin", skinId);
    }
    console.log(`Storyteller Cinema | Applied Skin: ${skin.name}`);
  }
  getSkins() {
    return Array.from(this.skins.values());
  }
  /**
   * Exports a skin to a JSON file
   * @param {string} skinId 
   */
  exportSkin(skinId) {
    const skin = this.skins.get(skinId);
    if (!skin) {
      ui.notifications.error("Storyteller Cinema | Skin not found.");
      return;
    }
    const data = JSON.stringify(skin, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${skin.id}.json`;
    a.click();
  }
  /**
   * Imports a skin from a JSON string or object
   * @param {string|object} jsonData 
   */
  async importSkin(jsonData) {
    let skin;
    try {
      skin = typeof jsonData === "string" ? JSON.parse(jsonData) : jsonData;
    } catch (e) {
      ui.notifications.error("Storyteller Cinema | Invalid JSON.");
      return;
    }
    if (!skin.id || !skin.name) {
      ui.notifications.error("Storyteller Cinema | Invalid Skin definition.");
      return;
    }
    if (skin.autoDownload) {
      ui.notifications.info("Storyteller Cinema | Premium Skin detected. (Auto-Download coming in Phase 3)");
    }
    await this.register(skin, true);
    await this.apply(skin.id);
    ui.notifications.info(`Storyteller Cinema | Imported skin: ${skin.name}`);
    return skin;
  }
  /* ---------------------------------------------------------------------- */
  /* INTERNALS                                                              */
  /* ---------------------------------------------------------------------- */
  async _ensureDirectory(path) {
    const source = "data";
    const parts = path.split("/");
    let currentPath = "";
    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      try {
        await FilePicker.browse(source, currentPath);
      } catch (e) {
        try {
          await FilePicker.createDirectory(source, currentPath);
          console.log(`Storyteller Cinema | Created directory: ${currentPath}`);
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
      const result = await FilePicker.upload("data", targetDir, file);
      return result.path;
    } catch (err) {
      console.error(`Storyteller Cinema | Failed to fetch ${url}`, err);
      return null;
    }
  }
  _createStyleTag() {
    if (!document.getElementById("storyteller-cinema-skin-styles")) {
      this._styleTag = document.createElement("style");
      this._styleTag.id = "storyteller-cinema-skin-styles";
      document.head.appendChild(this._styleTag);
    } else {
      this._styleTag = document.getElementById("storyteller-cinema-skin-styles");
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
    if (skin.options.filter) {
      css += `    --cinematic-filter: ${skin.options.filter};
`;
    } else {
      css += `    --cinematic-filter: none;
`;
    }
    if (skin.options.backgroundTexture) {
      css += `    --cinematic-bg-texture: url('${skin.options.backgroundTexture}');
`;
    } else {
      css += `    --cinematic-bg-texture: none;
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
      author: "Storyteller",
      version: "1.0.0",
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
      author: "Storyteller",
      version: "1.0.0",
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
      author: "Storyteller",
      version: "1.0.0",
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
      author: "Storyteller",
      version: "1.0.0",
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
