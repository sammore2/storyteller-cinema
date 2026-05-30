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
            if (token.mesh) token.mesh.visible = token.isVisible;
            if (token.bars) token.bars.visible = token.isVisible;
            if (token.nameplate) token.nameplate.visible = token.isVisible;
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
        if (token.targetArrows) token.targetArrows.visible = false;
        if (token.targetPips) token.targetPips.visible = false;
    });

    /**
     * Refresh Drawing Hook — persiste a visibilidade do showInCinema
     */
    Hooks.on('refreshDrawing', (drawing: any) => {
        const active = window.StorytellerCinema?.active;
        if (!active) {
            drawing.visible = !drawing.document.hidden;
            return;
        }

        const showInCinema = drawing.document.getFlag('storyteller-cinema', 'showInCinema') || false;
        drawing.visible = showInCinema && !drawing.document.hidden;
    });

    /**
     * Refresh Tile Hook
     */
    Hooks.on('refreshTile', (tile: any) => {
        const active = window.StorytellerCinema?.active;
        if (!active) {
            if (tile.mesh) tile.mesh.visible = !tile.document.hidden;
            return;
        }

        const showInCinema = tile.document.getFlag('storyteller-cinema', 'showInCinema') || false;
        if (tile.mesh) {
            tile.mesh.visible = showInCinema && !tile.document.hidden;
        }
    });

    /**
     * Inject Cinematic visibility checkbox in Drawing Config
     */
    Hooks.on('renderDrawingConfig', (app: any, html: any) => {
        const $html = html.jquery ? html : $(html);
        const doc = app.document || app.object;
        if (!doc) return;

        const flag = doc.getFlag('storyteller-cinema', 'showInCinema') || false;
        const form = $html.find('form').length ? $html.find('form') : $html;
        
        let target = form.find('.tab[data-tab="position"]');
        if (!target.length) target = form.find('.tab[data-tab="text"]');
        if (!target.length) target = form.find('.form-group').first().parent();

        if (target.length) {
            const checkboxHTML = `
                <div class="form-group">
                    <label>${game.i18n.localize('STORYTELLER_CINEMA.ShowInCinema.Label')}</label>
                    <div class="form-fields">
                        <input type="checkbox" name="flags.storyteller-cinema.showInCinema" ${flag ? 'checked' : ''}/>
                    </div>
                    <p class="notes">${game.i18n.localize('STORYTELLER_CINEMA.ShowInCinema.HintDrawing')}</p>
                </div>
            `;
            target.append(checkboxHTML);
            if (typeof app.setPosition === 'function') {
                app.setPosition({ height: "auto" });
            }
        }
    });

    /**
     * Inject Cinematic visibility checkbox in Tile Config
     */
    Hooks.on('renderTileConfig', (app: any, html: any) => {
        const $html = html.jquery ? html : $(html);
        const doc = app.document || app.object;
        if (!doc) return;

        const flag = doc.getFlag('storyteller-cinema', 'showInCinema') || false;
        const form = $html.find('form').length ? $html.find('form') : $html;

        let target = form.find('.tab[data-tab="basic"]');
        if (!target.length) target = form.find('.tab[data-tab="position"]');
        if (!target.length) target = form.find('.form-group').first().parent();

        if (target.length) {
            const checkboxHTML = `
                <div class="form-group">
                    <label>${game.i18n.localize('STORYTELLER_CINEMA.ShowInCinema.Label')}</label>
                    <div class="form-fields">
                        <input type="checkbox" name="flags.storyteller-cinema.showInCinema" ${flag ? 'checked' : ''}/>
                    </div>
                    <p class="notes">${game.i18n.localize('STORYTELLER_CINEMA.ShowInCinema.HintTile')}</p>
                </div>
            `;
            target.append(checkboxHTML);
            if (typeof app.setPosition === 'function') {
                app.setPosition({ height: "auto" });
            }
        }
    });
}
