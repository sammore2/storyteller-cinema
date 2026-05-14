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
    private _subtitleTimeout: any | null = null;

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

            // 3. MANIPULATE CANVAS LAYERS
            if (canvas.ready) {
                this._refreshAllPlaceables();
                this.enforceVision();
            }

        } else {
            // --- DEACTIVATE ---
            this.clear(); // Clear subtitles/portraits

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

        // 3. GLOBAL INTERACTION LOCK
        if (canvas.ready) {
            canvas.tokens!.interactiveChildren = !active;
            canvas.tiles!.interactiveChildren = !active;
            canvas.drawings!.interactiveChildren = !active;
        }
    }

    /**
     * Broadcast or show a cinematic message
     */
    async say(actorName: string, message: string, options: { portrait?: string, side?: 'left' | 'right', duration?: number } = {}): Promise<void> {
        const socket = (game as any).modules.get('storyteller-cinema')?.socket;

        if (socket && game.user?.isGM) {
            socket.executeForEveryone('showSubtitle', actorName, message, options);
        } else {
            this._showSubtitleLocal(actorName, message, options);
        }
    }

    /**
     * Clear all active cinematic UI elements
     */
    clear(): void {
        const socket = (game as any).modules.get('storyteller-cinema')?.socket;
        if (socket && game.user?.isGM) {
            socket.executeForEveryone('clearSubtitle');
        } else {
            this._clearLocal();
        }
    }

    /**
     * Clear the entire scene cast (the tray)
     */
    async clearCast(): Promise<void> {
        if (!game.user?.isGM) return;
        await game.settings.set('storyteller-cinema', 'sceneCast', []);
        (window as any).StorytellerCinema.cinemaTray?.render(true);
        ui.notifications.info("Cinema Stage cleared.");
    }

    _showSubtitleLocal(actorName: string, message: string, options: any = {}): void {
        const overlay = document.getElementById('storyteller-cinema-overlay');
        if (!overlay) return;

        const container = overlay.querySelector('.subtitle-container');
        if (!container) return;

        // Clear existing timeout
        if (this._subtitleTimeout) {
            clearTimeout(this._subtitleTimeout);
            this._subtitleTimeout = null;
        }

        // Update Subtitle
        container.classList.remove('active', 'left', 'right');
        const side = options.side || 'left';
        container.classList.add(side);

        // Wait for fade out if it was active
        setTimeout(() => {
            container.innerHTML = `
                <div class="actor-name">${actorName}</div>
                <div class="message-text">${message}</div>
            `;
            container.classList.add('active');

            // Handle Portrait
            this._showPortraitLocal(options.portrait, options.side || 'left');

            // Auto-clear if duration provided
            if (options.duration) {
                this._subtitleTimeout = setTimeout(() => {
                    this._clearLocal();
                }, options.duration);
            }
        }, 100);
    }

    _showPortraitLocal(path: string | undefined, side: 'left' | 'right'): void {
        const overlay = document.getElementById('storyteller-cinema-overlay');
        if (!overlay) return;

        const container = overlay.querySelector(`.portrait-container.${side}`) as HTMLElement;
        if (!container) return;

        if (!path) {
            container.classList.remove('active');
            return;
        }

        container.style.backgroundImage = `url("${path}")`;
        container.classList.add('active');
    }

    _clearLocal(): void {
        const overlay = document.getElementById('storyteller-cinema-overlay');
        if (!overlay) return;

        overlay.querySelector('.subtitle-container')?.classList.remove('active');
        overlay.querySelectorAll('.portrait-container').forEach(p => p.classList.remove('active'));
    }

    private _applyVisionOverride(active: boolean): void {
        if (!canvas.ready || !canvas.scene) return;

        // Detection
        const isV14 = !!(canvas.scene as any).environment;
        const environment = (canvas.scene as any).environment;

        if (active) {
            this._visionOverrideActive = true;
            if (this._sceneLightCache === null) {
                if (isV14 && environment) {
                    // V14 Path
                    this._sceneLightCache = {
                        version: 14,
                        enabled: environment.globalLight?.enabled,
                        darkness: canvas.scene.darkness
                    };
                    if (environment.globalLight) environment.globalLight.enabled = true;
                    (canvas.scene as any).updateSource({ darkness: 0 }, { render: false });
                } else {
                    // V13 and below Path
                    this._sceneLightCache = {
                        version: 13,
                        enabled: (canvas.scene as any).globalLight,
                        darkness: (canvas.scene as any).darkness
                    };
                    (canvas.scene as any).updateSource({ globalLight: true, darkness: 0 }, { render: false });
                }
            }
        } else {
            this._visionOverrideActive = false;
            if (this._sceneLightCache !== null) {
                if (this._sceneLightCache.version === 14 && environment?.globalLight) {
                    environment.globalLight.enabled = this._sceneLightCache.enabled;
                }
                const updateData: any = { darkness: this._sceneLightCache.darkness };
                if (this._sceneLightCache.version === 13) updateData.globalLight = this._sceneLightCache.enabled;

                (canvas.scene as any).updateSource(updateData, { render: false });
                this._sceneLightCache = null;
            }
        }

        canvas.perception.update({
            refreshVision: true,
            refreshLighting: true,
            refreshPrimary: true
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

        console.log(`Storyteller Cinema | Updating background to: ${path}`);
        if (this._lastBackgroundPath === path && this.cinematicSprite) {
            this.cinematicSprite.visible = true;
            return;
        }
        this._lastBackgroundPath = path;

        if (!canvas.ready) return;

        // V14 Check: If container/sprite were destroyed by a scene change, we must recreate them
        if (this.cinematicContainer && (this.cinematicContainer.destroyed || !canvas.stage.children.includes(this.cinematicContainer))) {
            this.cinematicContainer = null;
            this.cinematicSprite = null;
        }

        if (!this.cinematicContainer) {
            this.cinematicContainer = new (PIXI as any).Container();
            this.cinematicContainer.sortableChildren = true;
            this.cinematicContainer.zIndex = 10000; // High Z-Index
            canvas.stage.addChild(this.cinematicContainer);
        }

        // Universal PIXI Asset Loading (V13/V14)
        (PIXI as any).Assets.load(path).then((tex: any) => {
            if (!tex) {
                console.error("Storyteller Cinema | Texture failed to load:", path);
                return;
            }

            if (this.cinematicSprite && this.cinematicSprite.destroyed) {
                this.cinematicSprite = null;
            }

            if (!this.cinematicSprite) {
                this.cinematicSprite = new (PIXI as any).Sprite(tex);
                this.cinematicContainer?.addChild(this.cinematicSprite);
            } else {
                this.cinematicSprite.texture = tex;
            }

            if (this.cinematicSprite) {
                this.cinematicSprite.visible = true;
                const rect = (canvas as any).dimensions!.sceneRect;
                this.cinematicSprite.width = rect.width;
                this.cinematicSprite.height = rect.height;
                this.cinematicSprite.position.set(rect.x, rect.y);
            }
        }).catch((err: Error) => {
            console.error("Storyteller Cinema | Failed to load background texture:", err);
        });
    }

    private _toggleLayerVisibility(visible: boolean): void {
        // V14+ Hybrid Group Hiding
        const groups = ["primary", "effects", "interface", "controls"];
        let anyGroupHidden = false;

        for ( const g of groups ) {
            if ( (canvas as any)[g] ) {
                (canvas as any)[g].visible = visible;
                anyGroupHidden = true;
            }
        }
        
        // V13 and Legacy Fallback
        if ( !anyGroupHidden || !visible ) {
            if (canvas.grid) canvas.grid.visible = visible;
            if ((canvas as any).interface?.grid) (canvas as any).interface.grid.visible = visible;
            
            const layers = ["drawings", "walls", "sounds", "notes", "lighting", "tokens", "tiles", "templates"];
            for ( const l of layers ) {
                if ( (canvas as any)[l] ) (canvas as any)[l].visible = visible;
            }
        }
    }

    private _refreshAllPlaceables(): void {
        if (!canvas.ready) return;
        const layerNames = ["tokens", "tiles", "drawings", "lighting"];

        // Use measuredTemplates if available (V14+)
        if ((canvas as any).measuredTemplates) layerNames.push("measuredTemplates");

        for (const name of layerNames) {
            const layer = (canvas as any)[name];
            if (!layer?.placeables) continue;

            for (const obj of layer.placeables) {
                if (obj.renderFlags) {
                    obj.renderFlags.set({ refresh: true });
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
