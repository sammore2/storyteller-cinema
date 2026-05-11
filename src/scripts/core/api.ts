import { SkinManager } from "./skin-manager";

/**
 * Storyteller Cinema API
 * Managed in TypeScript for V14 stability.
 */
export class StorytellerAPI {
    active: boolean;
    cinematicContainer: any | null;
    cinematicSprite: any | null;
    skins?: SkinManager;
    
    private _sceneLightCache: any | null;
    private _visionOverrideActive: boolean;
    private _lastBackgroundPath: string | null = null;

    constructor() {
        this.active = false;
        this.cinematicContainer = null;
        this.cinematicSprite = null;

        // Cache used for Vision Override
        this._sceneLightCache = null;
        this._visionOverrideActive = false;
    }

    /**
     * Initializes the API
     */
    init(): void {
        console.log("Storyteller Cinema | API Initialized");
        this._createOverlay();
    }

    /**
     * Main Entry Point for Toggling Mode
     */
    async toggle(active: boolean, options: { skin?: string, init?: boolean } = {}): Promise<void> {
        const overlay = document.getElementById('storyteller-cinema-overlay');
        const skin = options.skin || 'default';
        this.active = active;

        // 1. Vision & Light Logic
        this._applyVisionOverride(active);

        if (active) {
            // --- ACTIVATE ---
            await this._setCinematicBackground(true);

            // Save Battle View
            if (canvas.ready) {
                (canvas as any).storytellerBattleView = {
                    x: canvas.stage.pivot.x,
                    y: canvas.stage.pivot.y,
                    scale: canvas.stage.scale.x
                };
            }

            // GM Actions
            if (game.user?.isGM) {
                this._ensureGhostMode(true);
            }

            // UI
            if (overlay) overlay.classList.add('active');
            document.body.classList.add('cinematic-mode');
            if (skin) {
                document.body.classList.add(`cinematic-skin-${skin}`);
                document.body.dataset.cinematicSkin = skin;
            }

            // Camera Pan
            await this._panCameraToFit(options.init || false);

            // Force refresh
            this._refreshAllPlaceables();

        } else {
            // --- DEACTIVATE ---
            if (game.user?.isGM) {
                this._ensureGhostMode(false, true);
            }
            await this._setCinematicBackground(false);

            // UI
            if (overlay) overlay.classList.remove('active');
            document.body.classList.remove('cinematic-mode');

            const skins = Array.from(document.body.classList).filter(c => c.startsWith('cinematic-skin-'));
            skins.forEach(c => document.body.classList.remove(c));
            delete document.body.dataset.cinematicSkin;

            // Restore Camera
            const battleView = (canvas as any).storytellerBattleView;
            if (battleView) {
                await canvas.animatePan({ x: battleView.x, y: battleView.y, scale: battleView.scale, duration: 800 });
                (canvas as any).storytellerBattleView = null;
            }

            this._refreshAllPlaceables();
        }
    }

    private _applyVisionOverride(active: boolean): void {
        if (!canvas.ready || !canvas.scene) return;

        const environment: any = (canvas.scene as any).environment;

        if (active) {
            this._visionOverrideActive = true;
            if (this._sceneLightCache === null) {
                if (environment?.globalLight) {
                    this._sceneLightCache = environment.globalLight.enabled;
                    environment.globalLight.enabled = true;
                    environment.globalLight.source = true;
                } else {
                    this._sceneLightCache = (canvas.scene as any).globalLight;
                    (canvas.scene as any).globalLight = true;
                }
            }
        } else {
            this._visionOverrideActive = false;
            if (this._sceneLightCache !== null) {
                if (environment?.globalLight) {
                    environment.globalLight.enabled = this._sceneLightCache;
                } else {
                    (canvas.scene as any).globalLight = this._sceneLightCache;
                }
                this._sceneLightCache = null;
            }
        }

        canvas.perception.update({
            refreshVision: true,
            refreshLighting: true
        }, true);
    }

    enforceVision(): void {
        if (this._visionOverrideActive) {
            this._applyVisionOverride(true);
        }
    }

    private async _setCinematicBackground(active: boolean): Promise<void> {
        if (!canvas.ready || !canvas.scene) return;

        if (active) {
            const bgPath = canvas.scene.getFlag('storyteller-cinema', 'cinematicBg') as string;
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

    private _updateCanvasBackground(path: string): void {
        if (!path) {
            if (this.cinematicSprite) this.cinematicSprite.visible = false;
            this._lastBackgroundPath = null;
            return;
        }

        if (this._lastBackgroundPath === path) return;
        this._lastBackgroundPath = path;

        if (!canvas.ready) return;

        if (!this.cinematicContainer) {
            this.cinematicContainer = new (PIXI as any).Container();
            (this.cinematicContainer as any).sort = 1000;
            (this.cinematicContainer as any).elevation = 0;
            canvas.primary.addChild(this.cinematicContainer);
        }

        (foundry.canvas as any).loadTexture(path).then((tex: any) => {
            if (!tex) return;
            if (!this.cinematicSprite) {
                this.cinematicSprite = new (PIXI as any).Sprite(tex);
                this.cinematicContainer?.addChild(this.cinematicSprite);
            } else {
                this.cinematicSprite.texture = tex;
            }
            if (this.cinematicSprite) {
                this.cinematicSprite.visible = true;
                const rect = canvas.dimensions!.sceneRect;
                this.cinematicSprite.width = rect.width;
                this.cinematicSprite.height = rect.height;
                this.cinematicSprite.position.set(rect.x, rect.y);
            }
        });
    }

    private _toggleLayerVisibility(visible: boolean): void {
        if (canvas.grid) canvas.grid.visible = visible;
        if ((canvas as any).interface?.grid) (canvas as any).interface.grid.visible = visible;
        if (canvas.drawings) canvas.drawings.visible = visible;
        if ((canvas as any).templates) (canvas as any).templates.visible = visible;
    }

    private _refreshAllPlaceables(): void {
        if (!canvas.ready) return;
        const layerNames = ["tokens", "tiles", "drawings", "templates", "lighting"];
        
        for (const name of layerNames) {
            const layer = (canvas as any)[name];
            if (!layer?.placeables) continue;

            for (const obj of layer.placeables) {
                if (obj.renderFlags) {
                    obj.renderFlags.set({refresh: true});
                } else if (typeof obj.refresh === 'function') {
                    obj.refresh();
                }
            }
        }
    }

    private async _panCameraToFit(isInit: boolean): Promise<void> {
        if (!canvas.dimensions) return;
        const rect = canvas.dimensions.sceneRect;
        const scaleW = window.innerWidth / rect.width;
        const scaleH = window.innerHeight / rect.height;
        let targetScale = Math.max(scaleW, scaleH);

        const minZ = (canvas as any).minScale || 0.1;
        const maxZ = (canvas as any).maxScale || 3.0;
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

    private _ensureGhostMode(target: boolean, force: boolean = false): void {
        const current = game.settings.get("core", "unconstrainedMovement");
        if (current === target && !force) return;
        game.settings.set("core", "unconstrainedMovement", target).catch(() => { });
    }

    private _createOverlay(): void {
        if (document.getElementById('storyteller-cinema-overlay')) return;
        const overlay = document.createElement('div');
        overlay.id = 'storyteller-cinema-overlay';
        overlay.innerHTML = '<div class="cinematic-bar top"></div><div class="cinematic-bar bottom"></div>';
        document.body.appendChild(overlay);
    }
}
