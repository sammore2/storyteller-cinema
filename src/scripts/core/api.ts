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
    private _draggedPositions: Map<string, {x: number, y: number}> = new Map();

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
        const skin = options.skin || game.settings.get('storyteller-cinema', 'activeSkin') || 'default';

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
            this.refreshPortraits();
            document.body.classList.add('cinematic-mode');
            if (skin) {
                document.body.classList.add(`cinematic-skin-${skin}`);
                document.body.dataset.cinematicSkin = skin;
            }

            // Camera Pan
            await this._panCameraToFit(options.init || false);

            this._reparentWeather(true);
            const saved = canvas.scene?.getFlag('storyteller-cinema', 'draggedPositions') as Record<string, {x: number, y: number}> || {};
            for (const [id, pos] of Object.entries(saved)) {
                this._draggedPositions.set(id, pos);
            }
            this._updateCinemaElements(true);

            // 3. MANIPULATE CANVAS LAYERS
            if (canvas.ready) {
                this._refreshAllPlaceables();
                this.enforceVision();
            }

        } else {
            // --- DEACTIVATE ---
            // Clear subtitles only; preserve stage (portraits/sceneCast)
            this._clearSubtitles();
            this._reparentWeather(false);
            this._updateCinemaElements(false);

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
            canvas.tokens!.eventMode = active ? 'passive' : 'static';
            canvas.tiles!.interactiveChildren = !active;
            canvas.tiles!.eventMode = active ? 'passive' : 'static';
            canvas.drawings!.interactiveChildren = !active;
            canvas.drawings!.eventMode = active ? 'passive' : 'static';
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
    async clear(): Promise<void> {
        const socket = (game as any).modules.get('storyteller-cinema')?.socket;
        if (socket && game.user?.isGM) {
            socket.executeForEveryone('clearSubtitle');
        } else {
            this._clearLocal();
        }
        if (game.ready && game.user?.isGM) {
            await game.settings.set('storyteller-cinema', 'activePortraits', []);
            await game.settings.set('storyteller-cinema', 'sceneCast', []);
            const tray = (window as any).StorytellerCinema?.cinemaTray;
            if (tray) tray.render(true);
        }
    }

    clearSubtitles(): void {
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
        ui.notifications.info(game.i18n.localize('STORYTELLER_CINEMA.Notification.StageClear'));
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

        // Wait for fade out if it was active
        container.classList.remove('active');
        setTimeout(() => {
            container.innerHTML = `
                <div class="actor-name">${actorName}</div>
                <div class="message-text">${message}</div>
            `;
            container.classList.add('active');

            // Handle Portrait
            if (options.portrait) {
                this.refreshPortraits({ name: actorName, img: options.portrait });
            } else {
                this.refreshPortraits(null);
            }

            // Auto-clear if duration provided
            if (options.duration) {
                this._subtitleTimeout = setTimeout(() => {
                    this._clearLocal();
                }, options.duration);
            }
        }, 100);
    }

    refreshPortraits(speakingActor: { name: string, img: string } | null = null): void {
        const overlay = document.getElementById('storyteller-cinema-overlay');
        if (!overlay) return;

        let container = overlay.querySelector('.portraits-container') as HTMLElement;
        if (!container) {
            container = document.createElement('div');
            container.className = 'portraits-container';
            overlay.appendChild(container);
        }

        const activeIds = (game.settings.get('storyteller-cinema', 'activePortraits') as string[]) || [];
        const portraitsToShow: { name: string, img: string, isTemp?: boolean }[] = [];

        activeIds.forEach(id => {
            let img = 'icons/svg/book.svg';
            let name = 'Narrator';

            if (id !== 'narrator') {
                const actor = game.actors?.get(id);
                if (actor) {
                    img = actor.img || '';
                    name = actor.name || '';
                } else {
                    return;
                }
            } else {
                img = (game.user as any)?.avatar || 'icons/svg/book.svg';
            }
            portraitsToShow.push({ name, img });
        });

        // Add temporary speaker if not already on stage
        if (speakingActor && speakingActor.name) {
            const alreadyExists = portraitsToShow.some(p => p.name.toLowerCase() === speakingActor.name.toLowerCase());
            if (!alreadyExists) {
                portraitsToShow.push({ name: speakingActor.name, img: speakingActor.img, isTemp: true });
            }
        }

        if (portraitsToShow.length === 0) {
            container.classList.remove('active');
            const cards = Array.from(container.querySelectorAll('.portrait-card')) as HTMLElement[];
            cards.forEach(card => card.classList.remove('active'));
            setTimeout(() => {
                const currentActive = (game.settings.get('storyteller-cinema', 'activePortraits') as string[]) || [];
                if (currentActive.length === 0) {
                    container.innerHTML = "";
                }
            }, 800);
            return;
        }

        container.classList.add('active');

        // Track existing cards in the DOM by actor name
        const existingCards = Array.from(container.querySelectorAll('.portrait-card')) as HTMLElement[];
        
        // Remove cards that are no longer in portraitsToShow
        existingCards.forEach(card => {
            const cardName = card.querySelector('.portrait-name')?.textContent || "";
            const stillExists = portraitsToShow.some(p => p.name.toLowerCase() === cardName.toLowerCase());
            if (!stillExists) {
                card.classList.remove('active');
                setTimeout(() => card.remove(), 800);
            }
        });

        // Render / Update portraits
        portraitsToShow.forEach(p => {
            let card = existingCards.find(c => {
                const cardName = c.querySelector('.portrait-name')?.textContent || "";
                return cardName.toLowerCase() === p.name.toLowerCase();
            });

            if (!card) {
                // Create new card (triggers fade/slide-in)
                card = document.createElement('div');
                card.className = 'portrait-card';
                if (p.isTemp) card.classList.add('temp-speaker');
                card.innerHTML = `<div class="portrait-image-area" style="background-image: url('${p.img}')"></div><div class="portrait-name">${p.name}</div>`;
                container.appendChild(card);
 
                // Force reflow and activate
                void card.offsetWidth;
                card.classList.add('active');
            } else {
                // Update properties of existing card
                if (p.isTemp) card.classList.add('temp-speaker');
                else card.classList.remove('temp-speaker');
                const imgArea = card.querySelector('.portrait-image-area') as HTMLElement;
                if (imgArea) {
                    imgArea.style.backgroundImage = `url("${p.img}")`;
                }
            }

            // Update speaking class
            if (speakingActor && p.name.toLowerCase() === speakingActor.name.toLowerCase()) {
                card.classList.add('speaking');
            } else {
                card.classList.remove('speaking');
            }
        });
    }

    _clearSubtitles(): void {
        const overlay = document.getElementById('storyteller-cinema-overlay');
        if (!overlay) return;
        overlay.querySelector('.subtitle-container')?.classList.remove('active');
    }

    _clearLocal(): void {
        this._clearSubtitles();
        this.refreshPortraits(null);
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
            this._toggleLayerVisibility(false);
        }
    }

    private _reparentWeather(active: boolean): void {
        if (!canvas.ready) return;
        const weather = (canvas as any).weather as any;
        if (!weather) return;
        const primary = (canvas as any).primary as any;
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

    private _updateCinemaElements(active: boolean): void {
        const overlay = document.getElementById('storyteller-cinema-overlay');
        if (!overlay) return;

        const existing = overlay.querySelector('.cinema-elements') as HTMLElement;
        if (existing) {
            existing.innerHTML = '';
            if (!active) { existing.remove(); return; }
        } else if (!active) { return; }

        const elContainer = document.createElement('div');
        elContainer.className = 'cinema-elements';
        elContainer.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:5;';
        overlay.appendChild(elContainer);

        if (!canvas.ready) return;

        const cr = canvas.app.view.getBoundingClientRect();
        const ox = cr.left, oy = cr.top;

        const makeDrag = (el: HTMLElement, docId: string) => {
            el.style.cursor = 'move';
            el.style.userSelect = 'none';
            el.style.pointerEvents = 'auto';
            let dragging = false, offX = 0, offY = 0;
            const onDown = (e: MouseEvent) => {
                dragging = true;
                const r = el.getBoundingClientRect();
                offX = e.clientX - r.left;
                offY = e.clientY - r.top;
                el.style.cursor = 'grabbing';
                e.preventDefault();
            };
            const onMove = (e: MouseEvent) => {
                if (!dragging) return;
                el.style.left = (e.clientX - offX) + 'px';
                el.style.top = (e.clientY - offY) + 'px';
                e.preventDefault();
            };
            const onUp = async () => {
                if (!dragging) return;
                dragging = false;
                el.style.cursor = 'move';
                const pos = { x: parseFloat(el.style.left), y: parseFloat(el.style.top) };
                this._draggedPositions.set(docId, pos);
                
                if (game.user?.isGM && canvas.scene) {
                    const saved = canvas.scene.getFlag('storyteller-cinema', 'draggedPositions') as Record<string, {x: number, y: number}> || {};
                    const updated = { ...saved, [docId]: pos };
                    await canvas.scene.setFlag('storyteller-cinema', 'draggedPositions', updated);
                }
            };
            el.addEventListener('mousedown', onDown);
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
        };

        const savedPos = (id: string) => {
            const mem = this._draggedPositions.get(id);
            if (mem) return mem;
            const saved = canvas.scene?.getFlag('storyteller-cinema', 'draggedPositions') as Record<string, {x: number, y: number}> || {};
            const p = saved[id];
            if (p) return p;
            return null;
        };

        const canDrag = game.user?.isGM;

        if (canvas.tiles?.placeables) {
            for (const t of canvas.tiles.placeables) {
                const show = t.document.getFlag('storyteller-cinema', 'showInCinema') || false;
                if (!show || t.document.hidden || !t.mesh) continue;
                const b = t.mesh.getBounds();
                const sp = savedPos(t.document.uuid);
                const img = document.createElement('img');
                img.src = t.document.texture.src;
                img.draggable = false;
                img.dataset.uuid = t.document.uuid;
                img.style.cssText = `position:absolute;left:${sp ? sp.x : (b.x + ox)}px;top:${sp ? sp.y : (b.y + oy)}px;width:${b.width}px;height:${b.height}px;object-fit:fill;`;
                if (canDrag) {
                    makeDrag(img, t.document.uuid);
                }
                elContainer.appendChild(img);
            }
        }

        if (canvas.drawings?.placeables) {
            for (const d of canvas.drawings.placeables) {
                const show = d.document.getFlag('storyteller-cinema', 'showInCinema') || false;
                if (!show || d.document.hidden) continue;
                const doc = d.document;
                const sc = canvas.stage.scale;
                const gfx = d.text || d.shape;
                let sx: number, sy: number;
                if (gfx && typeof gfx.getBounds === 'function') {
                    const b = gfx.getBounds();
                    sx = b.x + ox; sy = b.y + oy;
                } else {
                    const pivot = canvas.stage.pivot;
                    sx = (doc.x - pivot.x) * sc.x + window.innerWidth / 2;
                    sy = (doc.y - pivot.y) * sc.y + window.innerHeight / 2;
                }
                const sp = savedPos(doc.uuid);
                const div = document.createElement('div');
                div.textContent = doc.text || '';
                div.dataset.uuid = doc.uuid;
                div.style.cssText = `position:absolute;left:${sp ? sp.x : sx}px;top:${sp ? sp.y : sy}px;width:${doc.width * sc.x}px;height:${doc.height * sc.y}px;color:${doc.textColor || '#fff'};font-size:${doc.fontSize || 48}px;font-family:${doc.fontFamily || 'Signika, sans-serif'};text-align:${doc.textAlign || 'left'};overflow:hidden;white-space:${doc.wrap ? 'pre-wrap' : 'nowrap'};`;
                if (canDrag) {
                    makeDrag(div, doc.uuid);
                }
                elContainer.appendChild(div);
            }
        }
    }

    syncDraggedPositions(positions: Record<string, {x: number, y: number}>): void {
        const overlay = document.getElementById('storyteller-cinema-overlay');
        if (!overlay) return;
        const elContainer = overlay.querySelector('.cinema-elements') as HTMLElement;
        if (!elContainer) return;

        for (const [id, pos] of Object.entries(positions)) {
            this._draggedPositions.set(id, pos);
            const el = elContainer.querySelector(`[data-uuid="${id}"]`) as HTMLElement;
            if (el) {
                el.style.left = pos.x + 'px';
                el.style.top = pos.y + 'px';
            }
        }
    }

    private async _setCinematicBackground(active: boolean): Promise<void> {
        if (!canvas.ready || !canvas.scene) return;

        if (active) {
            const bgPath = canvas.scene.getFlag('storyteller-cinema', 'cinematicBg') as string;
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

    private _updateCanvasBackground(path: string): void {
        if (!path) {
            if (this.cinematicSprite) this.cinematicSprite.visible = false;
            this._lastBackgroundPath = null;
            return;
        }

        console.log(`Storyteller Cinema | Updating background to: ${path}`);
        if (this._lastBackgroundPath === path && this.cinematicSprite) {
            this.cinematicSprite.visible = true;
            const dim = canvas.scene?.getFlag('storyteller-cinema', 'cinematicBgDim') ?? 0;
            this.cinematicSprite.alpha = 1 - Math.min(1, Math.max(0, Number(dim)));
            return;
        }
        this._lastBackgroundPath = path;

        if (!canvas.ready) return;

        // V14 Check: If container/sprite were destroyed by a scene change, we must recreate them
        const isV14 = !!(canvas as any).effects;
        const parent = isV14 ? canvas.stage : ((canvas as any).rendered || canvas.stage);

        if (this.cinematicContainer && (this.cinematicContainer.destroyed || (this.cinematicContainer.parent && this.cinematicContainer.parent !== parent))) {
            if (this.cinematicContainer.parent) {
                try { this.cinematicContainer.parent.removeChild(this.cinematicContainer); } catch(e) {}
            }
            this.cinematicContainer = null;
            this.cinematicSprite = null;
        }

        if (!this.cinematicContainer) {
            this.cinematicContainer = new (PIXI as any).Container();
            this.cinematicContainer.sortableChildren = true;
            
            parent.addChild(this.cinematicContainer);

            try {
                const weather = (canvas as any).weather;
                if (weather && parent.children.includes(weather)) {
                    const weatherIndex = parent.getChildIndex(weather);
                    parent.setChildIndex(this.cinematicContainer, weatherIndex);
                    console.log(`Storyteller Cinema | Container layered at index ${weatherIndex} (below weather) inside stage`);
                } else {
                    const effects = (canvas as any).effects;
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
            } catch(e) {
                console.warn("Storyteller Cinema | Failed to set specific layer index, staying at top of parent stage.", e);
            }
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
                
                // Align to top-left of the scene bounds to avoid shifting
                this.cinematicSprite.position.set(rect.x, rect.y);

                // Scale proportionally (preserving aspect ratio) to cover the scene bounds
                const tex = this.cinematicSprite.texture;
                if (tex && tex.valid) {
                    const ratio = tex.width / tex.height;
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

                const dim = canvas.scene?.getFlag('storyteller-cinema', 'cinematicBgDim') ?? 0;
                this.cinematicSprite.alpha = 1 - Math.min(1, Math.max(0, Number(dim)));
            }
        }).catch((err: Error) => {
            console.error("Storyteller Cinema | Failed to load background texture:", err);
        });
    }

    private _toggleLayerVisibility(visible: boolean): void {
        const isV14 = !!(canvas as any).effects;

        if ( (canvas as any).visibility ) (canvas as any).visibility.visible = visible;

        // Hide token meshes in V14 to prevent them from showing up when visibility/fog of war is toggled
        if ( canvas.tokens?.placeables ) {
            for ( const t of canvas.tokens.placeables ) {
                if ( t.mesh ) t.mesh.visible = visible ? !t.document.hidden : false;
            }
        }

        // Hide primary canvas group children (background, tiles, template meshes, etc.) in all versions (V11-V14)
        if ( (canvas as any).primary ) {
            const p = (canvas as any).primary;
            p.visible = true; // Keep primary group visible so weather can render
            if ( p.background ) p.background.visible = visible;
            for ( const child of p.children ) {
                if ( child === (canvas as any).weather || child === this.cinematicContainer || child === p.background ) {
                    continue;
                }
                const isTile = child.object?.document?.documentName === "Tile" || child.placeable?.document?.documentName === "Tile" || child.constructor.name === "Tile";
                if (isTile) {
                    child.alpha = visible ? (child.object?.document?.alpha ?? 1) : 0;
                    child.visible = visible ? !child.object?.document?.hidden : true;
                } else {
                    child.visible = visible;
                }
            }
        }

        if ( isV14 ) {
            // V14 Selective Hiding
            if ( (canvas as any).effects ) {
                (canvas as any).effects.visible = visible;
            }

            if ( (canvas as any).interface ) (canvas as any).interface.visible = visible;
            if ( canvas.controls ) canvas.controls.visible = visible;

            // Hide interaction layers in V14 as well (excluding drawings and tiles)
            const layers = ["walls", "sounds", "notes", "lighting", "tokens", "templates"];
            for ( const l of layers ) {
                if ( (canvas as any)[l] ) (canvas as any)[l].visible = visible;
            }
        } else {
            // V13 and Legacy Fallback
            if (canvas.grid) canvas.grid.visible = visible;
            const layers = ["background", "foreground", "walls", "sounds", "notes", "lighting", "tokens", "templates"];
            for ( const l of layers ) {
                if ( (canvas as any)[l] ) (canvas as any)[l].visible = visible;
            }
            // Weather stays visible in V13 too
            if ( canvas.weather ) canvas.weather.visible = true;
        }

        // Handle individual tiles visibility based on the showInCinema flag
        if ( canvas.tiles ) {
            canvas.tiles.visible = true;
            if ( canvas.tiles.placeables ) {
                for ( const t of canvas.tiles.placeables ) {
                    if (t.mesh) {
                        t.mesh.visible = visible ? !t.document.hidden : true;
                        t.mesh.alpha = visible ? (t.document.alpha ?? 1) : 0;
                    }
                    t.visible = visible ? !t.document.hidden : true;
                    t.alpha = visible ? (t.document.alpha ?? 1) : 0;
                }
            }
        }

        // Handle individual drawings visibility based on the showInCinema flag
        if ( canvas.drawings ) {
            canvas.drawings.visible = true;
            if ( canvas.drawings.placeables ) {
                for ( const d of canvas.drawings.placeables ) {
                    d.visible = visible ? !d.document.hidden : false;
                }
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
