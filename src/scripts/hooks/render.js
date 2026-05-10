/**
 * Rendering Hooks for Storyteller Cinema
 * Consolidates scale, position, and visibility management for tokens and tiles.
 */
import { applyVisualDepth } from "../core/depth.js";

export function registerRenderHooks() {
    /**
     * Refresh Token Hook
     * Manages tactical token visibility when Cinematic Mode is active.
     */
    Hooks.on('refreshToken', (token) => {
        if (!window.StorytellerCinema?.active) {
            if (token.mesh) token.mesh.visible = true;
            return;
        }

        // In Cinematic Mode, we hide tactical tokens because we will use the Stage (Fase 3)
        if (token.mesh) {
            token.mesh.visible = false;
        }
    });

    /**
     * Refresh Tile Hook
     * Manages Tile visibility in Cinematic Mode.
     */
    Hooks.on('refreshTile', (tile) => {
        if (!window.StorytellerCinema?.active) {
            if (tile.mesh) tile.mesh.visible = true;
            return;
        }

        // Hide tiles in cinematic mode for now
        if (tile.mesh) {
            tile.mesh.visible = false;
        }
    });
}
