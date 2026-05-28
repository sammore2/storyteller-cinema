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
    const skin = options.skin || game.settings.get("storyteller-cinema", "activeSkin") || "default";
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
      this.refreshPortraits();
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
  async clear() {
    var _a, _b, _c, _d;
    const socket = (_a = game.modules.get("storyteller-cinema")) == null ? void 0 : _a.socket;
    if (socket && ((_b = game.user) == null ? void 0 : _b.isGM)) {
      socket.executeForEveryone("clearSubtitle");
    } else {
      this._clearLocal();
    }
    if (game.ready && ((_c = game.user) == null ? void 0 : _c.isGM)) {
      await game.settings.set("storyteller-cinema", "activePortraits", []);
      await game.settings.set("storyteller-cinema", "sceneCast", []);
      const tray = (_d = window.StorytellerCinema) == null ? void 0 : _d.cinemaTray;
      if (tray) tray.render(true);
    }
  }
  clearSubtitles() {
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
    ui.notifications.info(game.i18n.localize("STORYTELLER_CINEMA.Notification.StageClear"));
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
    container.classList.remove("active");
    setTimeout(() => {
      container.innerHTML = `
                <div class="actor-name">${actorName}</div>
                <div class="message-text">${message}</div>
            `;
      container.classList.add("active");
      if (options.portrait) {
        this.refreshPortraits({ name: actorName, img: options.portrait });
      } else {
        this.refreshPortraits(null);
      }
      if (options.duration) {
        this._subtitleTimeout = setTimeout(() => {
          this._clearLocal();
        }, options.duration);
      }
    }, 100);
  }
  refreshPortraits(speakingActor = null) {
    const overlay = document.getElementById("storyteller-cinema-overlay");
    if (!overlay) return;
    let container = overlay.querySelector(".portraits-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "portraits-container";
      overlay.appendChild(container);
    }
    const activeIds = game.settings.get("storyteller-cinema", "activePortraits") || [];
    const portraitsToShow = [];
    activeIds.forEach((id) => {
      var _a, _b;
      let img = "icons/svg/book.svg";
      let name = "Narrator";
      if (id !== "narrator") {
        const actor = (_a = game.actors) == null ? void 0 : _a.get(id);
        if (actor) {
          img = actor.img || "";
          name = actor.name || "";
        } else {
          return;
        }
      } else {
        img = ((_b = game.user) == null ? void 0 : _b.avatar) || "icons/svg/book.svg";
      }
      portraitsToShow.push({ name, img });
    });
    if (speakingActor && speakingActor.name) {
      const alreadyExists = portraitsToShow.some((p) => p.name.toLowerCase() === speakingActor.name.toLowerCase());
      if (!alreadyExists) {
        portraitsToShow.push({ name: speakingActor.name, img: speakingActor.img, isTemp: true });
      }
    }
    if (portraitsToShow.length === 0) {
      container.classList.remove("active");
      const cards = Array.from(container.querySelectorAll(".portrait-card"));
      cards.forEach((card) => card.classList.remove("active"));
      setTimeout(() => {
        const currentActive = game.settings.get("storyteller-cinema", "activePortraits") || [];
        if (currentActive.length === 0) {
          container.innerHTML = "";
        }
      }, 800);
      return;
    }
    container.classList.add("active");
    const existingCards = Array.from(container.querySelectorAll(".portrait-card"));
    existingCards.forEach((card) => {
      var _a;
      const cardName = ((_a = card.querySelector(".portrait-name")) == null ? void 0 : _a.textContent) || "";
      const stillExists = portraitsToShow.some((p) => p.name.toLowerCase() === cardName.toLowerCase());
      if (!stillExists) {
        card.classList.remove("active");
        setTimeout(() => card.remove(), 800);
      }
    });
    portraitsToShow.forEach((p) => {
      let card = existingCards.find((c) => {
        var _a;
        const cardName = ((_a = c.querySelector(".portrait-name")) == null ? void 0 : _a.textContent) || "";
        return cardName.toLowerCase() === p.name.toLowerCase();
      });
      if (!card) {
        card = document.createElement("div");
        card.className = "portrait-card";
        if (p.isTemp) card.classList.add("temp-speaker");
        card.style.backgroundImage = `url("${p.img}")`;
        card.innerHTML = `<div class="portrait-name">${p.name}</div>`;
        container.appendChild(card);
        void card.offsetWidth;
        card.classList.add("active");
      } else {
        if (p.isTemp) card.classList.add("temp-speaker");
        else card.classList.remove("temp-speaker");
        card.style.backgroundImage = `url("${p.img}")`;
      }
      if (speakingActor && p.name.toLowerCase() === speakingActor.name.toLowerCase()) {
        card.classList.add("speaking");
      } else {
        card.classList.remove("speaking");
      }
    });
  }
  _clearLocal() {
    var _a;
    const overlay = document.getElementById("storyteller-cinema-overlay");
    if (!overlay) return;
    (_a = overlay.querySelector(".subtitle-container")) == null ? void 0 : _a.classList.remove("active");
    this.refreshPortraits(null);
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
      this._toggleLayerVisibility(false);
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
    var _a;
    if (!path) {
      if (this.cinematicSprite) this.cinematicSprite.visible = false;
      this._lastBackgroundPath = null;
      return;
    }
    console.log(`Storyteller Cinema | Updating background to: ${path}`);
    if (this._lastBackgroundPath === path && this.cinematicSprite) {
      this.cinematicSprite.visible = true;
      const dim = ((_a = canvas.scene) == null ? void 0 : _a.getFlag("storyteller-cinema", "cinematicBgDim")) ?? 0;
      this.cinematicSprite.alpha = 1 - Math.min(1, Math.max(0, Number(dim)));
      return;
    }
    this._lastBackgroundPath = path;
    if (!canvas.ready) return;
    const isV14 = !!canvas.effects;
    const parent = isV14 ? canvas.primary || canvas.rendered || canvas.stage : canvas.rendered || canvas.stage;
    if (this.cinematicContainer && (this.cinematicContainer.destroyed || this.cinematicContainer.parent && this.cinematicContainer.parent !== parent)) {
      if (this.cinematicContainer.parent) {
        try {
          this.cinematicContainer.parent.removeChild(this.cinematicContainer);
        } catch (e) {
        }
      }
      this.cinematicContainer = null;
      this.cinematicSprite = null;
    }
    if (!this.cinematicContainer) {
      this.cinematicContainer = new PIXI.Container();
      this.cinematicContainer.sortableChildren = true;
      parent.addChild(this.cinematicContainer);
      try {
        const weather = canvas.weather;
        if (weather && parent.children.includes(weather)) {
          const weatherIndex = parent.getChildIndex(weather);
          parent.setChildIndex(this.cinematicContainer, weatherIndex);
          console.log(`Storyteller Cinema | Container layered at index ${weatherIndex} (below weather) inside parent group`);
        } else {
          const topIndex = Math.max(0, parent.children.length - 1);
          parent.setChildIndex(this.cinematicContainer, topIndex);
          console.log(`Storyteller Cinema | Container layered at top index ${topIndex} of primary group`);
        }
      } catch (e) {
        console.warn("Storyteller Cinema | Failed to set specific layer index, staying at top of parent.", e);
      }
    }
    PIXI.Assets.load(path).then((tex) => {
      var _a2, _b;
      if (!tex) {
        console.error("Storyteller Cinema | Texture failed to load:", path);
        return;
      }
      if (this.cinematicSprite && this.cinematicSprite.destroyed) {
        this.cinematicSprite = null;
      }
      if (!this.cinematicSprite) {
        this.cinematicSprite = new PIXI.Sprite(tex);
        (_a2 = this.cinematicContainer) == null ? void 0 : _a2.addChild(this.cinematicSprite);
      } else {
        this.cinematicSprite.texture = tex;
      }
      if (this.cinematicSprite) {
        this.cinematicSprite.visible = true;
        const rect = canvas.dimensions.sceneRect;
        this.cinematicSprite.position.set(rect.x, rect.y);
        const tex2 = this.cinematicSprite.texture;
        if (tex2 && tex2.valid) {
          const ratio = tex2.width / tex2.height;
          const sceneRatio = rect.width / rect.height;
          if (sceneRatio > ratio) {
            this.cinematicSprite.width = rect.width;
            this.cinematicSprite.height = rect.width / ratio;
          } else {
            this.cinematicSprite.height = rect.height;
            this.cinematicSprite.width = rect.height * ratio;
          }
        } else {
          this.cinematicSprite.width = rect.width;
          this.cinematicSprite.height = rect.height;
        }
        const dim = ((_b = canvas.scene) == null ? void 0 : _b.getFlag("storyteller-cinema", "cinematicBgDim")) ?? 0;
        this.cinematicSprite.alpha = 1 - Math.min(1, Math.max(0, Number(dim)));
      }
    }).catch((err) => {
      console.error("Storyteller Cinema | Failed to load background texture:", err);
    });
  }
  _toggleLayerVisibility(visible) {
    const isV14 = !!canvas.effects;
    if (canvas.visibility) canvas.visibility.visible = visible;
    if (isV14) {
      if (canvas.primary) {
        const p = canvas.primary;
        p.visible = true;
        for (const child of p.children) {
          if (child === canvas.weather || child === this.cinematicContainer) {
            continue;
          }
          child.visible = visible;
        }
      }
      if (canvas.effects) {
        canvas.effects.visible = visible;
      }
      if (canvas.interface) canvas.interface.visible = visible;
      if (canvas.controls) canvas.controls.visible = visible;
      const layers = ["walls", "sounds", "notes", "lighting", "tokens", "templates"];
      for (const l of layers) {
        if (canvas[l]) canvas[l].visible = visible;
      }
    } else {
      if (canvas.grid) canvas.grid.visible = visible;
      const layers = ["walls", "sounds", "notes", "lighting", "tokens", "templates"];
      for (const l of layers) {
        if (canvas[l]) canvas[l].visible = visible;
      }
      if (canvas.weather) canvas.weather.visible = true;
    }
    if (canvas.tiles) {
      canvas.tiles.visible = true;
      if (canvas.tiles.placeables) {
        for (const t of canvas.tiles.placeables) {
          const showInCinema = t.document.getFlag("storyteller-cinema", "showInCinema") || false;
          if (t.mesh) t.mesh.visible = visible ? !t.document.hidden : showInCinema && !t.document.hidden;
        }
      }
    }
    if (canvas.drawings) {
      canvas.drawings.visible = true;
      if (canvas.drawings.placeables) {
        for (const d of canvas.drawings.placeables) {
          const showInCinema = d.document.getFlag("storyteller-cinema", "showInCinema") || false;
          d.visible = visible ? !d.document.hidden : showInCinema && !d.document.hidden;
        }
      }
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
            <div class="portraits-container"></div>
        `;
    document.body.appendChild(overlay);
    this.refreshPortraits();
  }
}
export {
  StorytellerAPI as S
};
//# sourceMappingURL=api.js.map
