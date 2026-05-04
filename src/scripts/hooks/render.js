/**
 * Storyteller Cinema | Rendering Hooks (Foundry V13)
 * Handles the "Kill Switch" for tactical elements and filtering tokens.
 */

export function registerRenderHooks() {
    /**
     * Token Refresh Hook
     * Sets renderable based on cinematic state and portrait availability.
     */
    Hooks.on('refreshToken', (token) => {
        // If mode is NOT active, ensure it's visible.
        if (!window.StorytellerCinema?.active) {
            token.renderable = true;
            return;
        }

        const cinematicTexture = token.document.getFlag('storyteller-cinema', 'cinematicTexture');
        
        // BUSINESS RULE: If no cinematic portrait is set, hide the token entirely.
        // Otherwise, ensure it is renderable (since it might have been set to false before).
        token.renderable = !!cinematicTexture;
    });

    /**
     * Tile Refresh Hook
     * Hides all tiles/objects in cinematic mode.
     */
    Hooks.on('refreshTile', (tile) => {
        tile.renderable = !window.StorytellerCinema?.active;
    });

    /**
     * Drawing Refresh Hook
     * Hides all drawings/annotations in cinematic mode.
     */
    Hooks.on('refreshDrawing', (drawing) => {
        drawing.renderable = !window.StorytellerCinema?.active;
    });

    /**
     * Measured Template Refresh Hook
     * Hides all spell templates/areas in cinematic mode.
     */
    Hooks.on('refreshMeasuredTemplate', (template) => {
        template.renderable = !window.StorytellerCinema?.active;
    });

    /**
     * Ambient Light Refresh Hook
     * (Optional: Hide lights if they leak through the cinematic background)
     */
    Hooks.on('refreshAmbientLight', (light) => {
        light.renderable = !window.StorytellerCinema?.active;
    });
}
