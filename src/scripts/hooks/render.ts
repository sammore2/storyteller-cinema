/**
 * Rendering Hooks for Storyteller Cinema
 */
export function registerRenderHooks(): void {
    /**
     * Refresh Token Hook
     */
    Hooks.on('refreshToken', (token: any) => {
        if (!window.StorytellerCinema?.active) {
            if (token.mesh) token.mesh.visible = true;
            return;
        }

        if (token.mesh) {
            token.mesh.visible = false;
        }
    });

    /**
     * Refresh Tile Hook
     */
    Hooks.on('refreshTile', (tile: any) => {
        if (!window.StorytellerCinema?.active) {
            if (tile.mesh) tile.mesh.visible = true;
            return;
        }

        if (tile.mesh) {
            tile.mesh.visible = false;
        }
    });
}
