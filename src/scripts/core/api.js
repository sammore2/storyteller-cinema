import { applyVisualDepth } from './depth.js';

export class StorytellerAPI {
    constructor() {
        this.active = false;
        this.cinematicContainer = null;

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

            // Token Hiding & Depth
            await this._processTokens(true);

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

            // Restore Tokens
            await this._processTokens(false);
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
        if (active) {
            const bgPath = canvas.scene.getFlag('storyteller-cinema', 'cinematicBg');

            // Hiding Clutter
            this._toggleLayerVisibility(false);

            if (bgPath) {
                try {
                    const tex = await foundry.canvas.loadTexture(bgPath);
                    if (!this.cinematicContainer || this.cinematicContainer.destroyed) {
                        this.cinematicContainer = new PIXI.Container();
                        this.cinematicContainer.eventMode = 'none';
                        const sprite = new PIXI.Sprite(tex);
                        sprite.anchor.set(0.5);
                        this.cinematicContainer.addChild(sprite);
                        canvas.primary.addChildAt(this.cinematicContainer, 0);
                    } else {
                        // Ensure it's in the scene
                        if (this.cinematicContainer.parent !== canvas.primary) {
                            canvas.primary.addChildAt(this.cinematicContainer, 0);
                        }
                    }

                    const sprite = this.cinematicContainer.children[0];
                    sprite.texture = tex;

                    // Fit Logic
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
        const cameraScale = Math.min(scaleW, scaleH); // Mimic camera zoom

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
        if (canvas.primary?.background) canvas.primary.background.visible = visible;
        if (canvas.grid) canvas.grid.visible = visible;
        if (canvas.walls) canvas.walls.visible = visible;
        if (canvas.templates) canvas.templates.visible = visible;
        if (canvas.foreground) canvas.foreground.visible = visible;
        if (canvas.controls?.doors) canvas.controls.doors.visible = visible;
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

    /* ---------------------------------------------------------------------- */
    /* LOGIC: TOKENS                                                          */
    /* ---------------------------------------------------------------------- */

    async _processTokens(active) {
        if (!canvas.tokens) return;

        for (const token of canvas.tokens.placeables) {
            if (active) {
                // Battle Save (GM)
                const existingBattlePos = token.document.getFlag('storyteller-cinema', 'battlePos');
                if (game.user.isGM && !existingBattlePos) {
                    await token.document.setFlag('storyteller-cinema', 'battlePos', { x: token.document.x, y: token.document.y });
                }

                // Hide Mesh temporarily
                if (token.mesh) token.mesh.alpha = 0;

                // Move to Cinematic Pos if exists
                const cinPos = token.document.getFlag('storyteller-cinema', 'cinematicPos');
                const updates = {};
                if (cinPos) { updates.x = cinPos.x; updates.y = cinPos.y; }

                // Swap Texture (GM)
                if (game.user.isGM) {
                    const cinTex = token.document.getFlag('storyteller-cinema', 'cinematicTexture');
                    if (cinTex) {
                        const orig = token.document.getFlag('storyteller-cinema', 'originalTexture');
                        if (!orig) await token.document.setFlag('storyteller-cinema', 'originalTexture', token.document.texture.src);
                        updates["texture.src"] = cinTex;
                    }
                    if (Object.keys(updates).length > 0) await this._silentTeleport(token, updates);
                }

                applyVisualDepth(token); // Apply Parallax

                // Reveal
                if (token.mesh) {
                    const CanvasAnimation = foundry.canvas.animation.CanvasAnimation;
                    CanvasAnimation.animate([{ parent: token.mesh, attribute: "alpha", to: 1 }], { duration: 400, name: `FadeIn-${token.id}` });
                }

            } else {
                // Deactivate
                if (token.document) {
                    if (game.user.isGM) {
                        await token.document.setFlag('storyteller-cinema', 'cinematicPos', { x: token.document.x, y: token.document.y });
                    }

                    if (token.mesh) token.mesh.alpha = 0;

                    const updates = {};
                    if (game.user.isGM) {
                        const orig = token.document.getFlag('storyteller-cinema', 'originalTexture');
                        if (orig) {
                            updates["texture.src"] = orig;
                            await token.document.unsetFlag('storyteller-cinema', 'originalTexture');
                        }
                        const bPos = token.document.getFlag('storyteller-cinema', 'battlePos');
                        if (bPos) { updates.x = bPos.x; updates.y = bPos.y; }

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
        // Suppress V13 Deprecation Warning logic
        const originalWarn = console.warn;
        const originalError = console.error;
        const isPolluted = (...args) => args.some(a => (a?.toString() || '').includes('DatabaseUpdateOperation#teleport'));

        console.warn = (...args) => { if (!isPolluted(...args)) originalWarn.apply(console, args); };
        console.error = (...args) => { if (!isPolluted(...args)) originalError.apply(console, args); };

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
