var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
class StorytellerAPI {
  constructor() {
    __publicField(this, "active");
    __publicField(this, "cinematicContainer");
    __publicField(this, "cinematicSprite");
    __publicField(this, "skins");
    __publicField(this, "_sceneLightCache");
    __publicField(this, "_visionOverrideActive");
    __publicField(this, "_lastBackgroundPath", null);
    __publicField(this, "_subtitleTimeout", null);
    this.active = false;
    this.cinematicContainer = null;
    this.cinematicSprite = null;
    this._sceneLightCache = null;
    this._visionOverrideActive = false;
  }
  /**
   * Initializes the API
   */
  init() {
    console.log("Storyteller Cinema | API Initialized");
    this._createOverlay();
  }
  /**
   * Main Entry Point for Toggling Mode
   */
  async toggle(active, options = {}) {
    var _a, _b;
    const overlay = document.getElementById("storyteller-cinema-overlay");
    const skin = options.skin || "default";
    this.active = active;
    this._applyVisionOverride(active);
    if (active) {
      await this._setCinematicBackground(true);
      if (canvas.ready) {
        canvas.storytellerBattleView = {
          x: canvas.stage.pivot.x,
          y: canvas.stage.pivot.y,
          scale: canvas.stage.scale.x
        };
      }
      if ((_a = game.user) == null ? void 0 : _a.isGM) {
        this._ensureGhostMode(true);
      }
      if (overlay) overlay.classList.add("active");
      document.body.classList.add("cinematic-mode");
      {
        document.body.classList.add(`cinematic-skin-${skin}`);
        document.body.dataset.cinematicSkin = skin;
      }
      await this._panCameraToFit(options.init || false);
      if (canvas.ready) {
        this._refreshAllPlaceables();
        this.enforceVision();
      }
    } else {
      this.clear();
      if ((_b = game.user) == null ? void 0 : _b.isGM) {
        this._ensureGhostMode(false, true);
      }
      await this._setCinematicBackground(false);
      if (overlay) overlay.classList.remove("active");
      document.body.classList.remove("cinematic-mode");
      const skins = Array.from(document.body.classList).filter((c) => c.startsWith("cinematic-skin-"));
      skins.forEach((c) => document.body.classList.remove(c));
      delete document.body.dataset.cinematicSkin;
      const battleView = canvas.storytellerBattleView;
      if (battleView) {
        await canvas.animatePan({ x: battleView.x, y: battleView.y, scale: battleView.scale, duration: 800 });
        canvas.storytellerBattleView = null;
      }
      this._refreshAllPlaceables();
    }
    if (canvas.ready) {
      canvas.tokens.interactiveChildren = !active;
      canvas.tiles.interactiveChildren = !active;
      canvas.drawings.interactiveChildren = !active;
    }
  }
  /**
   * Broadcast or show a cinematic message
   */
  async say(actorName, message, options = {}) {
    var _a, _b;
    const socket = (_a = game.modules.get("storyteller-cinema")) == null ? void 0 : _a.socket;
    if (socket && ((_b = game.user) == null ? void 0 : _b.isGM)) {
      socket.executeForEveryone("showSubtitle", actorName, message, options);
    } else {
      this._showSubtitleLocal(actorName, message, options);
    }
  }
  /**
   * Clear all active cinematic UI elements
   */
  clear() {
    var _a, _b;
    const socket = (_a = game.modules.get("storyteller-cinema")) == null ? void 0 : _a.socket;
    if (socket && ((_b = game.user) == null ? void 0 : _b.isGM)) {
      socket.executeForEveryone("clearSubtitle");
    } else {
      this._clearLocal();
    }
  }
  /**
   * Clear the entire scene cast (the tray)
   */
  async clearCast() {
    var _a, _b;
    if (!((_a = game.user) == null ? void 0 : _a.isGM)) return;
    await game.settings.set("storyteller-cinema", "sceneCast", []);
    (_b = window.StorytellerCinema.cinemaTray) == null ? void 0 : _b.render(true);
    ui.notifications.info("Cinema Stage cleared.");
  }
  _showSubtitleLocal(actorName, message, options = {}) {
    const overlay = document.getElementById("storyteller-cinema-overlay");
    if (!overlay) return;
    const container = overlay.querySelector(".subtitle-container");
    if (!container) return;
    if (this._subtitleTimeout) {
      clearTimeout(this._subtitleTimeout);
      this._subtitleTimeout = null;
    }
    container.classList.remove("active", "left", "right");
    const side = options.side || "left";
    container.classList.add(side);
    setTimeout(() => {
      container.innerHTML = `
                <div class="actor-name">${actorName}</div>
                <div class="message-text">${message}</div>
            `;
      container.classList.add("active");
      this._showPortraitLocal(options.portrait, options.side || "left");
      if (options.duration) {
        this._subtitleTimeout = setTimeout(() => {
          this._clearLocal();
        }, options.duration);
      }
    }, 100);
  }
  _showPortraitLocal(path, side) {
    const overlay = document.getElementById("storyteller-cinema-overlay");
    if (!overlay) return;
    const container = overlay.querySelector(`.portrait-container.${side}`);
    if (!container) return;
    if (!path) {
      container.classList.remove("active");
      return;
    }
    container.style.backgroundImage = `url("${path}")`;
    container.classList.add("active");
  }
  _clearLocal() {
    var _a;
    const overlay = document.getElementById("storyteller-cinema-overlay");
    if (!overlay) return;
    (_a = overlay.querySelector(".subtitle-container")) == null ? void 0 : _a.classList.remove("active");
    overlay.querySelectorAll(".portrait-container").forEach((p) => p.classList.remove("active"));
  }
  _applyVisionOverride(active) {
    var _a;
    if (!canvas.ready || !canvas.scene) return;
    const isV14 = !!canvas.scene.environment;
    const environment = canvas.scene.environment;
    if (active) {
      this._visionOverrideActive = true;
      if (this._sceneLightCache === null) {
        if (isV14 && environment) {
          this._sceneLightCache = {
            version: 14,
            enabled: (_a = environment.globalLight) == null ? void 0 : _a.enabled,
            darkness: canvas.scene.darkness
          };
          if (environment.globalLight) environment.globalLight.enabled = true;
          canvas.scene.updateSource({ darkness: 0 }, { render: false });
        } else {
          this._sceneLightCache = {
            version: 13,
            enabled: canvas.scene.globalLight,
            darkness: canvas.scene.darkness
          };
          canvas.scene.updateSource({ globalLight: true, darkness: 0 }, { render: false });
        }
      }
    } else {
      this._visionOverrideActive = false;
      if (this._sceneLightCache !== null) {
        if (this._sceneLightCache.version === 14 && (environment == null ? void 0 : environment.globalLight)) {
          environment.globalLight.enabled = this._sceneLightCache.enabled;
        }
        const updateData = { darkness: this._sceneLightCache.darkness };
        if (this._sceneLightCache.version === 13) updateData.globalLight = this._sceneLightCache.enabled;
        canvas.scene.updateSource(updateData, { render: false });
        this._sceneLightCache = null;
      }
    }
    canvas.perception.update({
      refreshVision: true,
      refreshLighting: true,
      refreshPrimary: true
    }, true);
  }
  enforceVision() {
    if (this._visionOverrideActive) {
      this._applyVisionOverride(true);
    }
  }
  async _setCinematicBackground(active) {
    if (!canvas.ready || !canvas.scene) return;
    if (active) {
      const bgPath = canvas.scene.getFlag("storyteller-cinema", "cinematicBg");
      this._toggleLayerVisibility(false);
      if (this.cinematicContainer) this.cinematicContainer.visible = true;
      if (bgPath) {
        this._updateCanvasBackground(bgPath);
      }
    } else {
      this._toggleLayerVisibility(true);
      if (this.cinematicSprite) this.cinematicSprite.visible = false;
      if (this.cinematicContainer) this.cinematicContainer.visible = false;
      this._lastBackgroundPath = null;
    }
  }
  _updateCanvasBackground(path) {
    if (!path) {
      if (this.cinematicSprite) this.cinematicSprite.visible = false;
      this._lastBackgroundPath = null;
      return;
    }
    console.log(`Storyteller Cinema | Updating background to: ${path}`);
    if (this._lastBackgroundPath === path && this.cinematicSprite) {
      this.cinematicSprite.visible = true;
      return;
    }
    this._lastBackgroundPath = path;
    if (!canvas.ready) return;
    if (this.cinematicContainer && (this.cinematicContainer.destroyed || !canvas.stage.children.includes(this.cinematicContainer))) {
      this.cinematicContainer = null;
      this.cinematicSprite = null;
    }
    if (!this.cinematicContainer) {
      this.cinematicContainer = new PIXI.Container();
      this.cinematicContainer.sortableChildren = true;
      this.cinematicContainer.zIndex = 1e4;
      canvas.stage.addChild(this.cinematicContainer);
    }
    PIXI.Assets.load(path).then((tex) => {
      var _a;
      if (!tex) {
        console.error("Storyteller Cinema | Texture failed to load:", path);
        return;
      }
      if (this.cinematicSprite && this.cinematicSprite.destroyed) {
        this.cinematicSprite = null;
      }
      if (!this.cinematicSprite) {
        this.cinematicSprite = new PIXI.Sprite(tex);
        (_a = this.cinematicContainer) == null ? void 0 : _a.addChild(this.cinematicSprite);
      } else {
        this.cinematicSprite.texture = tex;
      }
      if (this.cinematicSprite) {
        this.cinematicSprite.visible = true;
        const rect = canvas.dimensions.sceneRect;
        this.cinematicSprite.width = rect.width;
        this.cinematicSprite.height = rect.height;
        this.cinematicSprite.position.set(rect.x, rect.y);
      }
    }).catch((err) => {
      console.error("Storyteller Cinema | Failed to load background texture:", err);
    });
  }
  _toggleLayerVisibility(visible) {
    var _a;
    const groups = ["primary", "effects", "interface", "controls"];
    for (const g of groups) {
      if (canvas[g]) canvas[g].visible = visible;
    }
    if (canvas.grid) canvas.grid.visible = visible;
    if ((_a = canvas.interface) == null ? void 0 : _a.grid) canvas.interface.grid.visible = visible;
    const layers = ["drawings", "walls", "sounds", "notes", "lighting", "tokens", "tiles", "templates"];
    for (const l of layers) {
      if (canvas[l]) canvas[l].visible = visible;
    }
  }
  _refreshAllPlaceables() {
    if (!canvas.ready) return;
    const layerNames = ["tokens", "tiles", "drawings", "lighting"];
    if (canvas.measuredTemplates) layerNames.push("measuredTemplates");
    for (const name of layerNames) {
      const layer = canvas[name];
      if (!(layer == null ? void 0 : layer.placeables)) continue;
      for (const obj of layer.placeables) {
        if (obj.renderFlags) {
          obj.renderFlags.set({ refresh: true });
        } else if (typeof obj.refresh === "function") {
          obj.refresh();
        }
      }
    }
  }
  async _panCameraToFit(isInit) {
    if (!canvas.dimensions) return;
    const rect = canvas.dimensions.sceneRect;
    const scaleW = window.innerWidth / rect.width;
    const scaleH = window.innerHeight / rect.height;
    let targetScale = Math.max(scaleW, scaleH);
    const minZ = canvas.minScale || 0.1;
    const maxZ = canvas.maxScale || 3;
    targetScale = Math.max(minZ, Math.min(maxZ, targetScale));
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    if (!isInit) {
      await canvas.animatePan({ x: cx, y: cy, scale: targetScale, duration: 800 });
    } else {
      canvas.stage.pivot.set(cx, cy);
      canvas.stage.scale.set(targetScale);
    }
  }
  _ensureGhostMode(target, force = false) {
    const current = game.settings.get("core", "unconstrainedMovement");
    if (current === target && !force) return;
    game.settings.set("core", "unconstrainedMovement", target).catch(() => {
    });
  }
  _createOverlay() {
    if (document.getElementById("storyteller-cinema-overlay")) return;
    const overlay = document.createElement("div");
    overlay.id = "storyteller-cinema-overlay";
    overlay.innerHTML = `
            <div class="cinematic-bar top"></div>
            <div class="cinematic-bar bottom">
                <div class="subtitle-container"></div>
            </div>
            <div class="portrait-container left"></div>
            <div class="portrait-container right"></div>
        `;
    document.body.appendChild(overlay);
  }
}
export {
  StorytellerAPI as S
};
//# sourceMappingURL=api.js.map
