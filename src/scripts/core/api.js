export class StorytellerAPI {
    constructor() {
        this.active = false;
        this.cinematicContainer = null;
        this.cinematicSprite = null;

        // Cache used for Vision Override
        this._visionCache = new Map();
        this._sceneLightCache = null;
        this._visionOverrideActive = false;
    }

    /**
     * Initializes the API (called from main.js)
     */
    init() {
        console.log("Storyteller Cinema | API Initialized");
        this._createOverlay();
        // Register itself independently if needed, but main.js will attach it to window
    }

    /**
     * Main Entry Point for Toggling Mode
     * @param {boolean} active 
     * @param {object} options { skin: 'default', init: boolean }
     */
    async toggle(active, options = {}) {
        const overlay = document.getElementById('storyteller-cinema-overlay');
        const skin = options.skin || 'default';
        this.active = active;

        // 1. Vision & Light Logic (The "Disarmament" Strategy)
        if (active) {
            await this._applyVisionOverride(true);
        } else {
            await this._applyVisionOverride(false);
        }

        if (active) {
            // --- ACTIVATE ---
            await this._setCinematicBackground(true);

            // Save Battle View (Pivot/Scale)
            if (canvas.ready) {
                const battleView = {
                    x: canvas.stage.pivot.x,
                    y: canvas.stage.pivot.y,
                    scale: canvas.stage.scale.x
                };
                canvas.storytellerBattleView = battleView;
            }

            // GM Actions
            if (game.user.isGM) {
                await this._ensureGhostMode(true);
            }

            // UI
            if (overlay) overlay.classList.add('active');
            document.body.classList.add('cinematic-mode');
            if (skin) {
                document.body.classList.add(`cinematic-skin-${skin}`);
                document.body.dataset.cinematicSkin = skin;
            }

            // Camera Pan
            await this._panCameraToFit(options.init);

            // V13 Occlusion: Force refresh on all objects to trigger render hooks
            this._refreshAllPlaceables();

        } else {
            // --- DEACTIVATE ---
            if (game.user.isGM) {
                await this._ensureGhostMode(false, true);
            }
            await this._setCinematicBackground(false);

            // UI
            if (overlay) overlay.classList.remove('active');
            document.body.classList.remove('cinematic-mode');

            const skins = Array.from(document.body.classList).filter(c => c.startsWith('cinematic-skin-'));
            skins.forEach(c => document.body.classList.remove(c));
            delete document.body.dataset.cinematicSkin;

            // Restore Camera
            if (canvas.storytellerBattleView) {
                const v = canvas.storytellerBattleView;
                await canvas.animatePan({ x: v.x, y: v.y, scale: v.scale, duration: 800 });
                canvas.storytellerBattleView = null;
            }

            // V13 Occlusion: Restore visibility
            this._refreshAllPlaceables();
        }
    }

    /* ---------------------------------------------------------------------- */
    /* LOGIC: VISION & LIGHTING (THE FIX)                                     */
    /* ---------------------------------------------------------------------- */

    _applyVisionOverride(active) {
        if (!canvas.ready || !canvas.scene) return;

        // V13+ Compatibility: Environment Model
        const environment = canvas.scene.environment; // V13
        // Fallback for V11/12 if needed, though target is V13.
        // We will write to the environment object in memory.

        if (active) {
            this._visionOverrideActive = true;

            // 1. Force Global Light (Memory Only)
            if (this._sceneLightCache === null) {
                // Check V13 structure vs Legacy
                if (environment && environment.globalLight) {
                    this._sceneLightCache = environment.globalLight.enabled;
                    // Modify memory (Not DB) - hope Foundry respects this for rendering
                    environment.globalLight.enabled = true;
                    environment.globalLight.source = true; // Ensure logic sees it as valid source
                } else {
                    // Legacy Fallback
                    this._sceneLightCache = canvas.scene.globalLight;
                    canvas.scene.globalLight = true;
                }
            }

        } else {
            this._visionOverrideActive = false;

            // Restore Light
            if (this._sceneLightCache !== null) {
                if (environment && environment.globalLight) {
                    environment.globalLight.enabled = this._sceneLightCache;
                } else {
                    canvas.scene.globalLight = this._sceneLightCache;
                }
                this._sceneLightCache = null;
            }
        }

        // Commit Updates (Triggers the libWrapper check)
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
            const bgPath = canvas.scene.getFlag('storyteller-cinema', 'cinematicBg');

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

        // Evita flash: Se o fundo já é o mesmo, não faz nada
        if (this._lastBackgroundPath === path) return;
        this._lastBackgroundPath = path;

        if (!canvas.ready) return;

        // 1. Ensure Container exists in Primary Group
        if (!this.cinematicContainer) {
            this.cinematicContainer = new PIXI.Container();
            this.cinematicContainer.sort = 1000; // Above Map/Tiles
            this.cinematicContainer.elevation = 0; // Standard Elevation
            canvas.primary.addChild(this.cinematicContainer);
        }

        // 2. Load Texture (Async in background, but immediate container setup)
        foundry.canvas.loadTexture(path).then(tex => {
            if (!tex) return;
            if (!this.cinematicSprite) {
                this.cinematicSprite = new PIXI.Sprite(tex);
                this.cinematicContainer.addChild(this.cinematicSprite);
            } else {
                this.cinematicSprite.texture = tex;
            }
            this.cinematicSprite.visible = true;

            // Fit logic
            const rect = canvas.dimensions.sceneRect;
            this.cinematicSprite.width = rect.width;
            this.cinematicSprite.height = rect.height;
            this.cinematicSprite.position.set(rect.x, rect.y);
        });
    }

    _fitSpriteToScreen(sprite, tex) {
        // Obsoleto - agora usado CSS background-size: cover
    }

    _toggleLayerVisibility(visible) {
        // V13 - Grid and UI elements
        if (canvas.grid) canvas.grid.visible = visible;
        if (canvas.interface?.grid) canvas.interface.grid.visible = visible;
        
        // Interaction Layers (Individual control via hooks is better for selective visibility)
        if (canvas.drawings) canvas.drawings.visible = visible;
        if (canvas.templates) canvas.templates.visible = visible;
    }

    /**
     * Triggers a refresh on all placeable objects to invoke the V13 render hooks.
     */
    _refreshAllPlaceables() {
        if (!canvas.ready) return;
        
        // V14 Compatible Layer Iteration
        const layerNames = ["tokens", "tiles", "drawings", "templates", "lighting"];
        
        for (const name of layerNames) {
            // Avoid deprecated templates access in V14
            if (name === "templates" && game.release.generation >= 14) continue;

            const layer = canvas[name];
            if (!layer?.placeables) continue;

            for (const obj of layer.placeables) {
                // V13/V14 - Set refresh flag to trigger hooks
                if (obj.renderFlags) {
                    obj.renderFlags.set({refresh: true});
                } else if (typeof obj.refresh === 'function') {
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
        const maxZ = canvas.maxScale || 3.0;
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
        game.settings.set("core", "unconstrainedMovement", target).catch(() => { });
    }

    _createOverlay() {
        if (document.getElementById('storyteller-cinema-overlay')) return;
        const overlay = document.createElement('div');
        overlay.id = 'storyteller-cinema-overlay';
        overlay.innerHTML = '<div class="cinematic-bar top"></div><div class="cinematic-bar bottom"></div>';
        document.body.appendChild(overlay);
    }
}
