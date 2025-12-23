import { a as applyVisualDepth } from "./depth.js";
class StorytellerAPI {
  constructor() {
    this.active = false;
    this.cinematicContainer = null;
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
      await this._processTokens(true);
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
      await this._processTokens(false);
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
    if (active) {
      const bgPath = canvas.scene.getFlag("storyteller-cinema", "cinematicBg");
      this._toggleLayerVisibility(false);
      if (bgPath) {
        try {
          const tex = await foundry.canvas.loadTexture(bgPath);
          if (!this.cinematicContainer || this.cinematicContainer.destroyed) {
            this.cinematicContainer = new PIXI.Container();
            this.cinematicContainer.eventMode = "none";
            const sprite2 = new PIXI.Sprite(tex);
            sprite2.anchor.set(0.5);
            this.cinematicContainer.addChild(sprite2);
            canvas.primary.addChildAt(this.cinematicContainer, 0);
          } else {
            if (this.cinematicContainer.parent !== canvas.primary) {
              canvas.primary.addChildAt(this.cinematicContainer, 0);
            }
          }
          const sprite = this.cinematicContainer.children[0];
          sprite.texture = tex;
          this._fitSpriteToScreen(sprite, tex);
        } catch (err) {
          console.error("Storyteller Cinema | BG Error:", err);
        }
      }
    } else {
      this._toggleLayerVisibility(true);
      if (this.cinematicContainer) {
        this.cinematicContainer.destroy({ children: true, texture: false });
        this.cinematicContainer = null;
      }
    }
  }
  _fitSpriteToScreen(sprite, tex) {
    const rect = canvas.dimensions.sceneRect;
    const scaleW = window.innerWidth / rect.width;
    const scaleH = window.innerHeight / rect.height;
    const cameraScale = Math.min(scaleW, scaleH);
    const visibleWorldW = window.innerWidth / cameraScale;
    const visibleWorldH = window.innerHeight / cameraScale;
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    sprite.position.set(cx, cy);
    const targetW = Math.max(rect.width, visibleWorldW);
    const targetH = Math.max(rect.height, visibleWorldH);
    const sX = targetW / tex.width;
    const sY = targetH / tex.height;
    sprite.scale.set(Math.max(sX, sY));
  }
  _toggleLayerVisibility(visible) {
    var _a, _b;
    if ((_a = canvas.primary) == null ? void 0 : _a.background) canvas.primary.background.visible = visible;
    if (canvas.grid) canvas.grid.visible = visible;
    if (canvas.walls) canvas.walls.visible = visible;
    if (canvas.templates) canvas.templates.visible = visible;
    if (canvas.foreground) canvas.foreground.visible = visible;
    if ((_b = canvas.controls) == null ? void 0 : _b.doors) canvas.controls.doors.visible = visible;
    if (canvas.lighting) canvas.lighting.visible = visible;
    if (canvas.effects) canvas.effects.visible = visible;
    if (canvas.fog) canvas.fog.visible = visible;
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
  /* ---------------------------------------------------------------------- */
  /* LOGIC: TOKENS                                                          */
  /* ---------------------------------------------------------------------- */
  async _processTokens(active) {
    if (!canvas.tokens) return;
    for (const token of canvas.tokens.placeables) {
      if (active) {
        const existingBattlePos = token.document.getFlag("storyteller-cinema", "battlePos");
        if (game.user.isGM && !existingBattlePos) {
          await token.document.setFlag("storyteller-cinema", "battlePos", { x: token.document.x, y: token.document.y });
        }
        if (token.mesh) token.mesh.alpha = 0;
        const cinPos = token.document.getFlag("storyteller-cinema", "cinematicPos");
        const updates = {};
        if (cinPos) {
          updates.x = cinPos.x;
          updates.y = cinPos.y;
        }
        if (game.user.isGM) {
          const cinTex = token.document.getFlag("storyteller-cinema", "cinematicTexture");
          if (cinTex) {
            const orig = token.document.getFlag("storyteller-cinema", "originalTexture");
            if (!orig) await token.document.setFlag("storyteller-cinema", "originalTexture", token.document.texture.src);
            updates["texture.src"] = cinTex;
          }
          if (Object.keys(updates).length > 0) await this._silentTeleport(token, updates);
        }
        applyVisualDepth(token);
        if (token.mesh) {
          const CanvasAnimation = foundry.canvas.animation.CanvasAnimation;
          CanvasAnimation.animate([{ parent: token.mesh, attribute: "alpha", to: 1 }], { duration: 400, name: `FadeIn-${token.id}` });
        }
      } else {
        if (token.document) {
          if (game.user.isGM) {
            await token.document.setFlag("storyteller-cinema", "cinematicPos", { x: token.document.x, y: token.document.y });
          }
          if (token.mesh) token.mesh.alpha = 0;
          const updates = {};
          if (game.user.isGM) {
            const orig = token.document.getFlag("storyteller-cinema", "originalTexture");
            if (orig) {
              updates["texture.src"] = orig;
              await token.document.unsetFlag("storyteller-cinema", "originalTexture");
            }
            const bPos = token.document.getFlag("storyteller-cinema", "battlePos");
            if (bPos) {
              updates.x = bPos.x;
              updates.y = bPos.y;
            }
            if (Object.keys(updates).length > 0) await this._silentTeleport(token, updates);
          }
          if (token.mesh) {
            token.mesh.scale.set(token.document.texture.scaleX, token.document.texture.scaleY);
            const targetAlpha = token.document.hidden ? 0.5 : 1;
            const CanvasAnimation = foundry.canvas.animation.CanvasAnimation;
            CanvasAnimation.animate([{ parent: token.mesh, attribute: "alpha", to: targetAlpha }], { duration: 400, name: `FadeOut-${token.id}` });
            token.refresh();
          }
        }
      }
    }
  }
  async _silentTeleport(token, pos) {
    const originalWarn = console.warn;
    const originalError = console.error;
    const isPolluted = (...args) => args.some((a) => ((a == null ? void 0 : a.toString()) || "").includes("DatabaseUpdateOperation#teleport"));
    console.warn = (...args) => {
      if (!isPolluted(...args)) originalWarn.apply(console, args);
    };
    console.error = (...args) => {
      if (!isPolluted(...args)) originalError.apply(console, args);
    };
    try {
      await token.document.update(pos, { animate: false, animation: { duration: 0 }, teleport: true, skippingMemory: true });
    } catch (e) {
      originalError.apply(console, ["Teleport Error", e]);
    } finally {
      console.warn = originalWarn;
      console.error = originalError;
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
    overlay.innerHTML = '<div class="cinematic-bar top"></div><div class="cinematic-bar bottom"></div>';
    document.body.appendChild(overlay);
  }
}
export {
  StorytellerAPI as S
};
//# sourceMappingURL=api.js.map
