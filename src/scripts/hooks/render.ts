/**
 * Rendering Hooks for Storyteller Cinema
 */
export function registerRenderHooks(): void {
    /**
     * Refresh Token Hook
     */
    Hooks.on('refreshToken', (token: any) => {
        const active = window.StorytellerCinema?.active;
        
        if (!active) {
            if (token.mesh) token.mesh.visible = true;
            if (token.bars) token.bars.visible = true;
            if (token.nameplate) token.nameplate.visible = true;
            return;
        }

        // Hide Mesh (Tactical Sprite)
        if (token.mesh) {
            token.mesh.visible = false;
        }

        // Hide UI Elements (Bars, Names, Effects)
        if (token.bars) token.bars.visible = false;
        if (token.nameplate) token.nameplate.visible = false;
        if (token.effects) token.effects.visible = false;
        if (token.target) token.target.visible = false;
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
