class StorytellerAPI {
  constructor() {
    this.active = false;
    this.cinematicContainer = null;
    this.cinematicSprite = null;
    this._visionCache = /* @__PURE__ */ new Map();
    this._sceneLightCache = null;
    this._visionOverrideActive = false;
  }
  /**
   * Initializes the API (called from main.js)
   */
  init() {
    console.log("Storyteller Cinema | API Initialized");
    this._createOverlay();
  }
  /**
   * Main Entry Point for Toggling Mode
   * @param {boolean} active 
   * @param {object} options { skin: 'default', init: boolean }
   */
  async toggle(active, options = {}) {
    const overlay = document.getElementById("storyteller-cinema-overlay");
    const skin = options.skin || "default";
    this.active = active;
    if (active) {
      await this._applyVisionOverride(true);
    } else {
      await this._applyVisionOverride(false);
    }
    if (active) {
      await this._setCinematicBackground(true);
      if (canvas.ready) {
        const battleView = {
          x: canvas.stage.pivot.x,
          y: canvas.stage.pivot.y,
          scale: canvas.stage.scale.x
        };
        canvas.storytellerBattleView = battleView;
      }
      if (game.user.isGM) {
        await this._ensureGhostMode(true);
      }
      if (overlay) overlay.classList.add("active");
      document.body.classList.add("cinematic-mode");
      {
        document.body.classList.add(`cinematic-skin-${skin}`);
        document.body.dataset.cinematicSkin = skin;
      }
      await this._panCameraToFit(options.init);
      this._refreshAllPlaceables();
    } else {
      if (game.user.isGM) {
        await this._ensureGhostMode(false, true);
      }
      await this._setCinematicBackground(false);
      if (overlay) overlay.classList.remove("active");
      document.body.classList.remove("cinematic-mode");
      const skins = Array.from(document.body.classList).filter((c) => c.startsWith("cinematic-skin-"));
      skins.forEach((c) => document.body.classList.remove(c));
      delete document.body.dataset.cinematicSkin;
      if (canvas.storytellerBattleView) {
        const v = canvas.storytellerBattleView;
        await canvas.animatePan({ x: v.x, y: v.y, scale: v.scale, duration: 800 });
        canvas.storytellerBattleView = null;
      }
      this._refreshAllPlaceables();
    }
  }
  /* ---------------------------------------------------------------------- */
  /* LOGIC: VISION & LIGHTING (THE FIX)                                     */
  /* ---------------------------------------------------------------------- */
  _applyVisionOverride(active) {
    if (!canvas.ready || !canvas.scene) return;
    const environment = canvas.scene.environment;
    if (active) {
      this._visionOverrideActive = true;
      if (this._sceneLightCache === null) {
        if (environment && environment.globalLight) {
          this._sceneLightCache = environment.globalLight.enabled;
          environment.globalLight.enabled = true;
          environment.globalLight.source = true;
        } else {
          this._sceneLightCache = canvas.scene.globalLight;
          canvas.scene.globalLight = true;
        }
      }
    } else {
      this._visionOverrideActive = false;
      if (this._sceneLightCache !== null) {
        if (environment && environment.globalLight) {
          environment.globalLight.enabled = this._sceneLightCache;
        } else {
          canvas.scene.globalLight = this._sceneLightCache;
        }
        this._sceneLightCache = null;
      }
    }
    canvas.perception.update({
      refreshVision: true,
      refreshLighting: true
    }, true);
  }
  // Called by Hook to enforce state after scene refresh
  enforceVision() {
    if (this._visionOverrideActive) {
      this._applyVisionOverride(true);
    }
  }
  /* ---------------------------------------------------------------------- */
  /* LOGIC: BACKGROUND                                                      */
  /* ---------------------------------------------------------------------- */
  async _setCinematicBackground(active) {
    if (!canvas.ready) return;
    if (active) {
      const bgPath = canvas.scene.getFlag("storyteller-cinema", "cinematicBg");
      this._toggleLayerVisibility(false);
      if (bgPath) {
        this._updateCanvasBackground(bgPath);
      }
    } else {
      this._toggleLayerVisibility(true);
      if (this.cinematicSprite) this.cinematicSprite.visible = false;
      this._lastBackgroundPath = null;
    }
  }
  _updateCanvasBackground(path) {
    if (!path) {
      if (this.cinematicSprite) this.cinematicSprite.visible = false;
      this._lastBackgroundPath = null;
      return;
    }
    if (this._lastBackgroundPath === path) return;
    this._lastBackgroundPath = path;
    if (!canvas.ready) return;
    if (!this.cinematicContainer) {
      this.cinematicContainer = new PIXI.Container();
      this.cinematicContainer.sort = 1e3;
      this.cinematicContainer.elevation = 0;
      canvas.primary.addChild(this.cinematicContainer);
    }
    foundry.canvas.loadTexture(path).then((tex) => {
      if (!tex) return;
      if (!this.cinematicSprite) {
        this.cinematicSprite = new PIXI.Sprite(tex);
        this.cinematicContainer.addChild(this.cinematicSprite);
      } else {
        this.cinematicSprite.texture = tex;
      }
      this.cinematicSprite.visible = true;
      const rect = canvas.dimensions.sceneRect;
      this.cinematicSprite.width = rect.width;
      this.cinematicSprite.height = rect.height;
      this.cinematicSprite.position.set(rect.x, rect.y);
    });
  }
  _fitSpriteToScreen(sprite, tex) {
  }
  _toggleLayerVisibility(visible) {
    var _a;
    if (canvas.grid) canvas.grid.visible = visible;
    if ((_a = canvas.interface) == null ? void 0 : _a.grid) canvas.interface.grid.visible = visible;
    if (canvas.drawings) canvas.drawings.visible = visible;
    if (canvas.templates) canvas.templates.visible = visible;
  }
  /**
   * Triggers a refresh on all placeable objects to invoke the V13 render hooks.
   */
  _refreshAllPlaceables() {
    if (!canvas.ready) return;
    const layerNames = ["tokens", "tiles", "drawings", "templates", "lighting"];
    for (const name of layerNames) {
      if (name === "templates" && game.release.generation >= 14) continue;
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
  /* ---------------------------------------------------------------------- */
  /* LOGIC: CAMERA                                                          */
  /* ---------------------------------------------------------------------- */
  async _panCameraToFit(isInit) {
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
  // Token logic removed (handled via layer visibility)
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
    overlay.innerHTML = '<div class="cinematic-bar top"></div><div class="cinematic-bar bottom"></div>';
    document.body.appendChild(overlay);
  }
}
export {
  StorytellerAPI as S
};
//# sourceMappingURL=api.js.map
