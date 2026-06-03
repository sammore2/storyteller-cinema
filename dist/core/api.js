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
    __publicField(this, "_draggedPositions", /* @__PURE__ */ new Map());
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
    var _a, _b, _c;
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
      this._reparentWeather(true);
      const saved = ((_b = canvas.scene) == null ? void 0 : _b.getFlag("storyteller-cinema", "draggedPositions")) || {};
      for (const [id, pos] of Object.entries(saved)) {
        this._draggedPositions.set(id, pos);
      }
      this._updateCinemaElements(true);
      if (canvas.ready) {
        this._refreshAllPlaceables();
        this.enforceVision();
      }
    } else {
      this._clearSubtitles();
      this._reparentWeather(false);
      this._updateCinemaElements(false);
      if ((_c = game.user) == null ? void 0 : _c.isGM) {
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
      canvas.tokens.eventMode = active ? "passive" : "static";
      canvas.tiles.interactiveChildren = !active;
      canvas.tiles.eventMode = active ? "passive" : "static";
      canvas.drawings.interactiveChildren = !active;
      canvas.drawings.eventMode = active ? "passive" : "static";
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
      var _a, _b, _c, _d;
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
        const activeGM = ((_b = game.users) == null ? void 0 : _b.activeGM) || ((_c = game.users) == null ? void 0 : _c.find((u) => u.isGM && u.active)) || ((_d = game.users) == null ? void 0 : _d.find((u) => u.isGM));
        img = (activeGM == null ? void 0 : activeGM.avatar) || "icons/svg/book.svg";
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
        card.innerHTML = `<div class="portrait-image-area" style="background-image: url('${p.img}')"></div><div class="portrait-name">${p.name}</div>`;
        container.appendChild(card);
        void card.offsetWidth;
        card.classList.add("active");
      } else {
        if (p.isTemp) card.classList.add("temp-speaker");
        else card.classList.remove("temp-speaker");
        const imgArea = card.querySelector(".portrait-image-area");
        if (imgArea) {
          imgArea.style.backgroundImage = `url("${p.img}")`;
        }
      }
      if (speakingActor && p.name.toLowerCase() === speakingActor.name.toLowerCase()) {
        card.classList.add("speaking");
      } else {
        card.classList.remove("speaking");
      }
    });
  }
  _clearSubtitles() {
    var _a;
    const overlay = document.getElementById("storyteller-cinema-overlay");
    if (!overlay) return;
    (_a = overlay.querySelector(".subtitle-container")) == null ? void 0 : _a.classList.remove("active");
  }
  _clearLocal() {
    this._clearSubtitles();
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
  _reparentWeather(active) {
    if (!canvas.ready) return;
    const weather = canvas.weather;
    if (!weather) return;
    const primary = canvas.primary;
    if (!primary) return;
    if (active) {
      if (weather.parent === primary) {
        primary.removeChild(weather);
        canvas.stage.addChild(weather);
        if (this.cinematicContainer && canvas.stage.children.includes(this.cinematicContainer)) {
          const idx = canvas.stage.getChildIndex(this.cinematicContainer);
          canvas.stage.setChildIndex(weather, idx + 1);
        }
      }
    } else {
      if (weather.parent === canvas.stage) {
        canvas.stage.removeChild(weather);
        primary.addChild(weather);
      }
    }
  }
  _updateCinemaElements(active) {
    var _a, _b, _c;
    const overlay = document.getElementById("storyteller-cinema-overlay");
    if (!overlay) return;
    const existing = overlay.querySelector(".cinema-elements");
    if (existing) {
      existing.innerHTML = "";
      if (!active) {
        existing.remove();
        return;
      }
    } else if (!active) {
      return;
    }
    const elContainer = document.createElement("div");
    elContainer.className = "cinema-elements";
    elContainer.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:5;";
    overlay.appendChild(elContainer);
    if (!canvas.ready) return;
    const cr = canvas.app.view.getBoundingClientRect();
    const ox = cr.left, oy = cr.top;
    const makeDrag = (el, docId) => {
      el.style.cursor = "move";
      el.style.userSelect = "none";
      el.style.pointerEvents = "auto";
      let dragging = false, offX = 0, offY = 0;
      const onDown = (e) => {
        dragging = true;
        const r = el.getBoundingClientRect();
        offX = e.clientX - r.left;
        offY = e.clientY - r.top;
        el.style.cursor = "grabbing";
        e.preventDefault();
      };
      const onMove = (e) => {
        if (!dragging) return;
        el.style.left = e.clientX - offX + "px";
        el.style.top = e.clientY - offY + "px";
        e.preventDefault();
      };
      const onUp = async () => {
        var _a2;
        if (!dragging) return;
        dragging = false;
        el.style.cursor = "move";
        const pos = { x: parseFloat(el.style.left), y: parseFloat(el.style.top) };
        this._draggedPositions.set(docId, pos);
        if (((_a2 = game.user) == null ? void 0 : _a2.isGM) && canvas.scene) {
          const saved = canvas.scene.getFlag("storyteller-cinema", "draggedPositions") || {};
          const updated = { ...saved, [docId]: pos };
          await canvas.scene.setFlag("storyteller-cinema", "draggedPositions", updated);
        }
      };
      el.addEventListener("mousedown", onDown);
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    };
    const savedPos = (id) => {
      var _a2;
      const mem = this._draggedPositions.get(id);
      if (mem) return mem;
      const saved = ((_a2 = canvas.scene) == null ? void 0 : _a2.getFlag("storyteller-cinema", "draggedPositions")) || {};
      const p = saved[id];
      if (p) return p;
      return null;
    };
    const canDrag = (_a = game.user) == null ? void 0 : _a.isGM;
    if ((_b = canvas.tiles) == null ? void 0 : _b.placeables) {
      for (const t of canvas.tiles.placeables) {
        const show = t.document.getFlag("storyteller-cinema", "showInCinema") || false;
        if (!show || t.document.hidden || !t.mesh) continue;
        const b = t.mesh.getBounds();
        const sp = savedPos(t.document.uuid);
        const img = document.createElement("img");
        img.src = t.document.texture.src;
        img.draggable = false;
        img.dataset.uuid = t.document.uuid;
        img.style.cssText = `position:absolute;left:${sp ? sp.x : b.x + ox}px;top:${sp ? sp.y : b.y + oy}px;width:${b.width}px;height:${b.height}px;object-fit:fill;`;
        if (canDrag) {
          makeDrag(img, t.document.uuid);
        }
        elContainer.appendChild(img);
      }
    }
    if ((_c = canvas.drawings) == null ? void 0 : _c.placeables) {
      for (const d of canvas.drawings.placeables) {
        const show = d.document.getFlag("storyteller-cinema", "showInCinema") || false;
        if (!show || d.document.hidden) continue;
        const doc = d.document;
        const sc = canvas.stage.scale;
        const gfx = d.text || d.shape;
        let sx, sy;
        if (gfx && typeof gfx.getBounds === "function") {
          const b = gfx.getBounds();
          sx = b.x + ox;
          sy = b.y + oy;
        } else {
          const pivot = canvas.stage.pivot;
          sx = (doc.x - pivot.x) * sc.x + window.innerWidth / 2;
          sy = (doc.y - pivot.y) * sc.y + window.innerHeight / 2;
        }
        const sp = savedPos(doc.uuid);
        const div = document.createElement("div");
        div.textContent = doc.text || "";
        div.dataset.uuid = doc.uuid;
        div.style.cssText = `position:absolute;left:${sp ? sp.x : sx}px;top:${sp ? sp.y : sy}px;width:${doc.width * sc.x}px;height:${doc.height * sc.y}px;color:${doc.textColor || "#fff"};font-size:${doc.fontSize || 48}px;font-family:${doc.fontFamily || "Signika, sans-serif"};text-align:${doc.textAlign || "left"};overflow:hidden;white-space:${doc.wrap ? "pre-wrap" : "nowrap"};`;
        if (canDrag) {
          makeDrag(div, doc.uuid);
        }
        elContainer.appendChild(div);
      }
    }
  }
  syncDraggedPositions(positions) {
    const overlay = document.getElementById("storyteller-cinema-overlay");
    if (!overlay) return;
    const elContainer = overlay.querySelector(".cinema-elements");
    if (!elContainer) return;
    for (const [id, pos] of Object.entries(positions)) {
      this._draggedPositions.set(id, pos);
      const el = elContainer.querySelector(`[data-uuid="${id}"]`);
      if (el) {
        el.style.left = pos.x + "px";
        el.style.top = pos.y + "px";
      }
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
    const parent = isV14 ? canvas.stage : canvas.rendered || canvas.stage;
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
          console.log(`Storyteller Cinema | Container layered at index ${weatherIndex} (below weather) inside stage`);
        } else {
          const effects = canvas.effects;
          if (effects && parent.children.includes(effects)) {
            const effectsIndex = parent.getChildIndex(effects);
            parent.setChildIndex(this.cinematicContainer, effectsIndex + 1);
            console.log(`Storyteller Cinema | Container layered above effects at index ${effectsIndex + 1} inside stage`);
          } else {
            const topIndex = Math.max(0, parent.children.length - 1);
            parent.setChildIndex(this.cinematicContainer, topIndex);
            console.log(`Storyteller Cinema | Container layered at top index ${topIndex} inside stage`);
          }
        }
      } catch (e) {
        console.warn("Storyteller Cinema | Failed to set specific layer index, staying at top of parent stage.", e);
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
    var _a, _b, _c, _d, _e, _f, _g, _h, _i;
    const isV14 = !!canvas.effects;
    if (canvas.visibility) canvas.visibility.visible = visible;
    if ((_a = canvas.tokens) == null ? void 0 : _a.placeables) {
      for (const t of canvas.tokens.placeables) {
        if (t.mesh) t.mesh.visible = visible ? t.isVisible : false;
      }
    }
    if (canvas.primary) {
      const p = canvas.primary;
      p.visible = true;
      if (p.background) p.background.visible = visible;
      for (const child of p.children) {
        if (child === canvas.weather || child === this.cinematicContainer || child === p.background) {
          continue;
        }
        const isTile = ((_c = (_b = child.object) == null ? void 0 : _b.document) == null ? void 0 : _c.documentName) === "Tile" || ((_e = (_d = child.placeable) == null ? void 0 : _d.document) == null ? void 0 : _e.documentName) === "Tile" || child.constructor.name === "Tile";
        if (isTile) {
          child.alpha = visible ? ((_g = (_f = child.object) == null ? void 0 : _f.document) == null ? void 0 : _g.alpha) ?? 1 : 0;
          child.visible = visible ? !((_i = (_h = child.object) == null ? void 0 : _h.document) == null ? void 0 : _i.hidden) : true;
        } else {
          child.visible = visible;
        }
      }
    }
    if (isV14) {
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
      const layers = ["background", "foreground", "walls", "sounds", "notes", "lighting", "tokens", "templates"];
      for (const l of layers) {
        if (canvas[l]) canvas[l].visible = visible;
      }
      if (canvas.weather) canvas.weather.visible = true;
    }
    if (canvas.tiles) {
      canvas.tiles.visible = true;
      if (canvas.tiles.placeables) {
        for (const t of canvas.tiles.placeables) {
          if (t.mesh) {
            t.mesh.visible = visible ? !t.document.hidden : true;
            t.mesh.alpha = visible ? t.document.alpha ?? 1 : 0;
          }
          t.visible = visible ? !t.document.hidden : true;
          t.alpha = visible ? t.document.alpha ?? 1 : 0;
        }
      }
    }
    if (canvas.drawings) {
      canvas.drawings.visible = true;
      if (canvas.drawings.placeables) {
        for (const d of canvas.drawings.placeables) {
          d.visible = visible ? !d.document.hidden : false;
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
            <div class="cinematic-bar bottom"></div>
            <div class="cinematic-footer">
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
