// import { applyVisualDepth } from './depth.js';

export function createOverlay() {
    if (document.getElementById('storyteller-cinema-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'storyteller-cinema-overlay';
    overlay.innerHTML = '<div class="cinematic-bar top"></div><div class="cinematic-bar bottom"></div>';
    document.body.appendChild(overlay);
}

// -----------------------------------------------------------------------------
// HELPER: Wait for Ghost Mode 
// -----------------------------------------------------------------------------
async function ensureGhostMode(targetState, force = false) {
    const currentState = game.settings.get("core", "unconstrainedMovement");
    if (currentState === targetState && !force) return;
    try {
        await game.settings.set("core", "unconstrainedMovement", targetState);
        await new Promise(r => setTimeout(r, 300));
    } catch (e) {
        // Ignore setting errors
    }
}

// -----------------------------------------------------------------------------
// HELPER: Silent Teleport (Aggressively Suppresses V13 Deprecation Warning)
// -----------------------------------------------------------------------------
async function silentTeleport(token, pos) {
    // CAPTURE ORIGINAL METHODS
    const originalWarn = console.warn;
    const originalError = console.error; // Sometimes deprecations log as errors

    // DEFINING THE FILTER
    // We filter any message that mentions the specific deprecated field.
    const isPolluted = (...args) => {
        const msg = args.map(a => {
            if (a instanceof Error) return a.message;
            return a?.toString() || '';
        }).join(' ');
        return msg.includes('DatabaseUpdateOperation#teleport');
    };

    // APPLY PATCHES
    console.warn = function (...args) {
        if (isPolluted(...args)) return;
        originalWarn.apply(console, args);
    };
    console.error = function (...args) {
        if (isPolluted(...args)) return;
        originalError.apply(console, args);
    };

    try {
        // EXECUTE TELEPORT
        // 'teleport: true' is indeed the functionality we want.
        await token.document.update(pos, {
            animate: false,
            animation: { duration: 0 },
            teleport: true,
            skippingMemory: true
        });
    } catch (err) {
        // Allow genuine errors
        originalError.apply(console, ["Storyteller Cinema | Teleport Error:", err]);
    } finally {
        // RESTORE CONSOLE
        console.warn = originalWarn;
        console.error = originalError;
    }
}


// --- HELPER: CINEMATIC BACKGROUND ---
let cinematicContainer = null;

Hooks.on('canvasReady', () => {
    const viewMode = canvas.scene.getFlag('storyteller-cinema', 'viewMode');
    // PERSISTENCE: Check if it's currently active in DB
    const isActive = canvas.scene.getFlag('storyteller-cinema', 'active') || false;

    // Check if cinematic is mandated by flag or legacy viewMode
    const shouldBeCinematic = isActive || viewMode === 'cinematic';

    // Use 'default' skin or fetch from flag if we had one (simplified for now)
    // The new signature is (active, skin). We won't pass object options anymore.
    toggleCinematicMode(shouldBeCinematic, 'default');
});

// REAL IMPLEMENTATION OF `setCinematicBackground` with V13 Token Safety
async function setCinematicBackground(active) {
    if (active) {
        const bgPath = canvas.scene.getFlag('storyteller-cinema', 'cinematicBg');
        console.log("Storyteller Cinema | 🖼️ Setting Background. Path:", bgPath);

        // --- HIDE CLUTTER ---
        // CRITICAL FIX: DO NOT HIDE canvas.primary (It contains Tokens in V13!)
        if (canvas.primary?.background) {
            canvas.primary.background.visible = false;
        }

        if (canvas.grid) canvas.grid.visible = false;
        if (canvas.walls) canvas.walls.visible = false;
        if (canvas.templates) canvas.templates.visible = false;
        if (canvas.foreground) canvas.foreground.visible = false;

        if (canvas.controls?.doors) canvas.controls.doors.visible = false;

        // --- HIDE LIGHTING & ATMOSPHERE ---
        if (canvas.lighting) canvas.lighting.visible = false;
        if (canvas.effects) canvas.effects.visible = false;
        if (canvas.fog) canvas.fog.visible = false;

        if (bgPath) {
            try {
                const tex = await foundry.canvas.loadTexture(bgPath);

                // STALE CONTAINER CHECK
                if (cinematicContainer) {
                    if (cinematicContainer.destroyed || cinematicContainer.parent !== canvas.primary) {
                        if (!cinematicContainer.destroyed) cinematicContainer.destroy({ children: true });
                        cinematicContainer = null;
                    }
                }

                if (!cinematicContainer) {
                    cinematicContainer = new PIXI.Container();
                    cinematicContainer.eventMode = 'none'; // Passive

                    const sprite = new PIXI.Sprite(tex);
                    sprite.anchor.set(0.5);
                    cinematicContainer.addChild(sprite);

                    // Insert BEHIND tokens (index 0 of primary)
                    canvas.primary.addChildAt(cinematicContainer, 0);
                }

                const sprite = cinematicContainer.children[0];
                sprite.texture = tex;

                // --- CAMERA & SCALE LOGIC ---
                // 1. Calculate Target Camera Scale (Fit Scene to Screen)
                // We do this EARLY to determine how big the background needs to be to fill the screen.
                const rect = canvas.dimensions.sceneRect;
                const scaleW = window.innerWidth / rect.width;
                const scaleH = window.innerHeight / rect.height;
                const cameraScale = Math.min(scaleW, scaleH); // Removed margin for tighter fit

                // 2. Calculate Visible World Area at that scale
                const visibleWorldWidth = window.innerWidth / cameraScale;
                const visibleWorldHeight = window.innerHeight / cameraScale;

                // 3. Centralize Sprite to SCENE
                const cx = rect.x + rect.width / 2;
                const cy = rect.y + rect.height / 2;
                sprite.position.set(cx, cy);

                // 4. Scale Sprite to COVER the LARGER of (Scene, Visible Screen)
                // This ensures "Widescreen" images fill the side bars if the map is square.
                const targetWidth = Math.max(rect.width, visibleWorldWidth);
                const targetHeight = Math.max(rect.height, visibleWorldHeight);

                const texScaleX = targetWidth / tex.width;
                const texScaleY = targetHeight / tex.height;
                const finalScale = Math.max(texScaleX, texScaleY);

                sprite.scale.set(finalScale);

            } catch (err) {
                console.error("Storyteller Cinema | BG Error:", err);
            }
        }

    } else {
        // Restore
        // SAFETY: Only enable visibility if there IS a background texture/image.
        // Forcing visible=true on an empty background mesh crashes Foundry's collisionTest (#getTextureAlpha).
        if (canvas.primary?.background) {
            const hasBgImage = canvas.scene.background?.src;
            const hasTexture = canvas.primary.background.texture;

            // Only restore if valid. If no BG, Foundry keeps it handled/hidden naturally.
            if (hasBgImage && hasTexture) {
                canvas.primary.background.visible = true;
            }
        }

        if (canvas.grid) canvas.grid.visible = true;

        // --- RESTORE CLUTTER ---
        if (canvas.walls) canvas.walls.visible = true;
        if (canvas.templates) canvas.templates.visible = true;
        if (canvas.foreground) canvas.foreground.visible = true;
        if (canvas.controls?.doors) canvas.controls.doors.visible = true;

        // --- RESTORE LIGHTING & ATMOSPHERE ---
        if (canvas.lighting) canvas.lighting.visible = true;
        if (canvas.effects) canvas.effects.visible = true;
        if (canvas.fog) canvas.fog.visible = true;

        if (cinematicContainer) {
            cinematicContainer.destroy({ children: true, texture: false });
            cinematicContainer = null;
        }
    }
}


// Variável externa à função para guardar o estado anterior da visão
let _visionCache = true;

export function toggleCinematicMode(active, skin = 'default') {
    const body = document.body;

    if (active) {
        // 1. Aplica o CSS (Visual da Interface)
        body.classList.add('cinematic-mode');
        if (skin !== 'default') {
            body.classList.add(`cinematic-skin-${skin}`);
        }

        // 2. Desliga a Névoa de Guerra (Visual do Canvas)
        // Isso faz com que o mapa seja visível sem precisar de luzes ou tokens
        if (canvas.ready) {
            _visionCache = canvas.sight.tokenVision; // Salva como estava (geralmente true)
            canvas.sight.tokenVision = false;        // Desliga a restrição
            canvas.perception.refresh();             // Atualiza a renderização
        }

    } else {
        // 1. Remove o CSS
        body.classList.remove('cinematic-mode');

        // Limpa classes de skins antigas
        const skinClasses = Array.from(body.classList).filter(c => c.startsWith('cinematic-skin-'));
        skinClasses.forEach(c => body.classList.remove(c));

        // 2. Restaura a Névoa de Guerra
        if (canvas.ready) {
            canvas.sight.tokenVision = _visionCache; // Devolve o valor original
            canvas.perception.refresh();             // Atualiza a renderização
        }
    }
}

// --- AUTO-REFRESH ON SETTINGS CHANGE ---
Hooks.on('updateScene', (document, change, options, userId) => {
    if (!document.isView) return; // Only if it's the current scene

    // 1. Check for ACTIVATION Toggle
    const activeChange = change.flags?.['storyteller-cinema']?.active;
    if (activeChange !== undefined) {
        toggleCinematicMode(activeChange);
    }

    // 2. Refresh Background if already active
    if (window.document.body.classList.contains('cinematic-mode')) {
        const flagChange = change.flags?.['storyteller-cinema']?.cinematicBg;
        if (flagChange !== undefined) {
            console.log("Storyteller Cinema | Background updated, refreshing...");
            setCinematicBackground(true);
        }
    }
});
