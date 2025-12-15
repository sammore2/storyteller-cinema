import { applyVisualDepth } from './depth.js';

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

// REAL IMPLEMENTATION OF `setCinematicBackground` with V13 Token Safety
async function setCinematicBackground(active) {
    if (active) {
        const bgPath = canvas.scene.getFlag('storyteller-cinema', 'cinematicBg');

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

        if (cinematicContainer) {
            cinematicContainer.destroy({ children: true, texture: false });
            cinematicContainer = null;
        }
    }
}


// --- EXPORTED TOGGLE ---

export async function toggleCinematicMode(active, options = {}) {
    console.log("Storyteller Cinema | Toggle Called. Target:", active);
    const overlay = document.getElementById('storyteller-cinema-overlay');

    if (active) {
        // --- 1. ACTIVATE ---

        // Attempt to convert to Cinematic Visuals
        await setCinematicBackground(true);

        // SAVE BATTLE VIEW
        const battleView = {
            x: canvas.stage.pivot.x,
            y: canvas.stage.pivot.y,
            scale: canvas.stage.scale.x
        };
        canvas.storytellerBattleView = battleView;

        // Cinematic Mode: Enable Ghost Mode (No Walls / Free Movement)
        await ensureGhostMode(true);

        if (overlay) overlay.classList.add('active');
        document.body.classList.add('cinematic-mode');

        // PAN TO FIT SCREEN (Optimal Cinematic View)
        // 1. Calculate Target Camera Scale (Fit Scene to Screen)
        const rect = canvas.dimensions.sceneRect;
        const scaleW = window.innerWidth / rect.width;
        const scaleH = window.innerHeight / rect.height;

        // CHANGE: Use Math.max (COVER behavior) to ensure NO BLACK BARS.
        let targetScale = Math.max(scaleW, scaleH);

        // CRITICAL FIX: Foundry clamps zoom options.
        const minZ = canvas.minScale || 0.1;
        const maxZ = canvas.maxScale || 3.0;
        targetScale = Math.max(minZ, Math.min(maxZ, targetScale));

        const cx = rect.x + rect.width / 2;
        const cy = rect.y + rect.height / 2;

        await canvas.animatePan({ x: cx, y: cy, scale: targetScale, duration: 800 });

        // Update Background Sprite AFTER calculating the final scale logic
        // We need to ensure it covers the visible area at THIS scale.
        if (cinematicContainer && cinematicContainer.children[0]) {
            const sprite = cinematicContainer.children[0];
            const tex = sprite.texture;

            // Re-calc visible area based on the CLAMPED scale
            const visibleWorldWidth = window.innerWidth / targetScale;
            const visibleWorldHeight = window.innerHeight / targetScale;

            // Ensure position is correct
            sprite.position.set(cx, cy);

            const targetWidth = Math.max(rect.width, visibleWorldWidth);
            const targetHeight = Math.max(rect.height, visibleWorldHeight);

            const texScaleX = targetWidth / tex.width;
            const texScaleY = targetHeight / tex.height;
            const finalScale = Math.max(texScaleX, texScaleY);

            sprite.scale.set(finalScale);
        }


        if (canvas.tokens) {
            for (const token of canvas.tokens.placeables) {
                // ... (Token Logic Stays Same)
                // Read-Only Battle Save
                const existingBattlePos = token.document.getFlag('storyteller-cinema', 'battlePos');
                if (!existingBattlePos) {
                    const currentPos = { x: token.document.x, y: token.document.y };
                    await token.document.setFlag('storyteller-cinema', 'battlePos', currentPos);
                }

                // --- VISUAL CLEANUP: HIDE BEFORE OP ---
                if (token.mesh) token.mesh.alpha = 0;

                const updates = {};
                const cinPos = token.document.getFlag('storyteller-cinema', 'cinematicPos');
                if (cinPos) {
                    updates.x = cinPos.x;
                    updates.y = cinPos.y;
                }

                // --- CINEMATIC TEXTURE SWAP ---
                const cinTexture = token.document.getFlag('storyteller-cinema', 'cinematicTexture');
                if (cinTexture) {
                    // SAFETY: Only save original if NOT already saved (prevents overwriting with cinematic texture if stuck)
                    const existingOriginal = token.document.getFlag('storyteller-cinema', 'originalTexture');
                    if (!existingOriginal) {
                        await token.document.setFlag('storyteller-cinema', 'originalTexture', token.document.texture.src);
                    }

                    // Preload Texture
                    try { await foundry.canvas.loadTexture(cinTexture); } catch (e) { }

                    // Add to updates
                    updates["texture.src"] = cinTexture;
                }

                // EXECUTE SINGLE ATOMIC UPDATE
                if (Object.keys(updates).length > 0) {
                    await silentTeleport(token, updates);
                }

                applyVisualDepth(token);

                // --- REVEAL ---
                if (token.mesh) {
                    // Simple fade in using V13 API
                    const CanvasAnimation = foundry.canvas.animation.CanvasAnimation;
                    CanvasAnimation.animate([{ parent: token.mesh, attribute: "alpha", to: 1 }], { duration: 400, name: `FadeIn-${token.id}` });
                }
            }
        }

    } else {
        // --- 2. DEACTIVATE ---
        // Battle Mode: Disable Ghost Mode (Walls Active / Constrained)
        await ensureGhostMode(false, true);
        await setCinematicBackground(false);

        if (overlay) overlay.classList.remove('active');
        document.body.classList.remove('cinematic-mode');

        // RESTORE BATTLE VIEW
        if (canvas.storytellerBattleView) {
            const v = canvas.storytellerBattleView;
            await canvas.animatePan({ x: v.x, y: v.y, scale: v.scale, duration: 800 });
            canvas.storytellerBattleView = null;
        }

        if (canvas.tokens) {
            // ... (Token Logic Stays Same)
            for (const token of canvas.tokens.placeables) {
                if (token.document) {
                    const currentPos = { x: token.document.x, y: token.document.y };
                    await token.document.setFlag('storyteller-cinema', 'cinematicPos', currentPos);

                    const battlePos = token.document.getFlag('storyteller-cinema', 'battlePos');

                    if (token.mesh) {
                        // Fade out before revert
                        token.mesh.alpha = 0;
                    }

                    const updates = {};

                    // --- CINEMATIC TEXTURE RESTORE ---
                    const originalTexture = token.document.getFlag('storyteller-cinema', 'originalTexture');
                    if (originalTexture) {
                        try { await foundry.canvas.loadTexture(originalTexture); } catch (e) { }
                        updates["texture.src"] = originalTexture;
                        await token.document.unsetFlag('storyteller-cinema', 'originalTexture');
                    }

                    if (battlePos) {
                        updates.x = battlePos.x;
                        updates.y = battlePos.y;
                    }

                    // EXECUTE SINGLE ATOMIC UPDATE
                    if (Object.keys(updates).length > 0) {
                        await silentTeleport(token, updates);
                    }

                    if (token.mesh) {
                        token.mesh.scale.set(token.document.texture.scaleX, token.document.texture.scaleY);
                        // Restore visibility based on hidden state
                        const targetAlpha = token.document.hidden ? 0.5 : 1;
                        const CanvasAnimation = foundry.canvas.animation.CanvasAnimation;
                        CanvasAnimation.animate([{ parent: token.mesh, attribute: "alpha", to: targetAlpha }], { duration: 400, name: `FadeOut-${token.id}` });
                        token.refresh();
                    }
                }
            }
        }
    }
}

// --- AUTO-REFRESH ON SETTINGS CHANGE ---
Hooks.on('updateScene', (document, change, options, userId) => {
    if (!document.isView) return; // Only if it's the current scene

    // Check if cinematic mode is active on the BODY
    if (!window.document.body.classList.contains('cinematic-mode')) return;

    // Check if our flag changed
    const flagChange = change.flags?.['storyteller-cinema']?.cinematicBg;
    if (flagChange !== undefined) {
        console.log("Storyteller Cinema | Background updated, refreshing...");
        setCinematicBackground(true);
    }
});
