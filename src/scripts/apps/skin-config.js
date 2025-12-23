const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class SkinConfig extends HandlebarsApplicationMixin(ApplicationV2) {

    constructor(options = {}) {
        super(options);
        this.selectedSkinId = 'default';
        this.tempSkinData = null; // For editing before save
    }

    static get DEFAULT_OPTIONS() {
        return {
            tag: "form",
            id: "storyteller-cinema-skin-config",
            window: {
                title: "Storyteller Cinema - Skin Studio",
                icon: "fas fa-film",
                resizable: true,
                width: 800,
                height: 600
            },
            position: {
                width: 800,
                height: 600
            }
        };
    }

    static get PARTS() {
        return {
            form: {
                template: "modules/storyteller-cinema/templates/skin-config.hbs"
            }
        };
    }

    /* ---------------------------------------------------------------------- */
    /* DATA PREPARATION                                                       */
    /* ---------------------------------------------------------------------- */

    async _prepareContext(options) {
        const skinManager = window.StorytellerCinema.skins;
        const allSkins = skinManager.getSkins();
        const activeSkinId = skinManager.activeSkin;

        // Determine which skin we are editing
        let currentSkin = this.tempSkinData;
        if (!currentSkin) {
            currentSkin = allSkins.find(s => s.id === this.selectedSkinId) || allSkins[0];
            // Deep clone to avoid mutating live data directly
            this.tempSkinData = JSON.parse(JSON.stringify(currentSkin));
        }

        return {
            skins: allSkins,
            activeSkin: activeSkinId,
            selectedSkin: this.tempSkinData
        };
    }

    /* ---------------------------------------------------------------------- */
    /* EVENT HANDLERS                                                         */
    /* ---------------------------------------------------------------------- */

    _onRender(context, options) {
        // 1. Skin Selection
        const skinItems = this.element.querySelectorAll('.skin-item');
        skinItems.forEach(el => {
            el.addEventListener('click', (ev) => {
                const id = el.dataset.id;
                this.selectedSkinId = id;
                this.tempSkinData = null; // Reset temp data on switch
                this.render();
            });
        });

        // 2. Input Changes (Live Update or State Update)
        const inputs = this.element.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('change', (ev) => this._onInputChange(ev));
        });

        // 3. Apply Button
        const applyBtn = this.element.querySelector('.apply-skin-btn');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                if (this.tempSkinData) {
                    // Update live manager
                    window.StorytellerCinema.skins.register(this.tempSkinData);
                    window.StorytellerCinema.skins.apply(this.tempSkinData.id);
                }
            });
        }

        // 4. Create Button
        const createBtn = this.element.querySelector('.create-skin-btn');
        if (createBtn) {
            createBtn.addEventListener('click', () => this._createNewSkin());
        }

        // 5. File Pickers
        const filePickers = this.element.querySelectorAll('.file-picker');
        filePickers.forEach(btn => {
            btn.addEventListener('click', event => {
                event.preventDefault();
                const target = btn.dataset.target; // e.g., "options.barTexture"
                const currentVal = this._getValue(this.tempSkinData, target);

                const filePicker = new FilePicker({
                    type: "image",
                    current: currentVal,
                    callback: (path) => {
                        this._setValue(this.tempSkinData, target, path);
                        this.render(); // Re-render to show value
                    }
                });
                return filePicker.browse();
            });
        });
    }

    _onInputChange(event) {
        event.preventDefault();
        const input = event.currentTarget;
        const field = input.name;
        const value = input.value;

        // Update temp data
        this._setValue(this.tempSkinData, field, value);

        // Optional: Live Preview logic hooks here
        // window.StorytellerCinema.skins._preview(this.tempSkinData);
    }

    _createNewSkin() {
        const newId = `custom-${Date.now()}`;
        const newSkin = {
            id: newId,
            name: "New Custom Skin",
            author: game.user.name,
            version: "1.0.0",
            options: {
                theme: "dark",
                styles: {
                    "--cinematic-bar-bg": "#000000"
                }
            }
        };

        window.StorytellerCinema.skins.register(newSkin);
        this.selectedSkinId = newId;
        this.tempSkinData = null;
        this.render();
    }

    /* ---------------------------------------------------------------------- */
    /* HELPERS                                                                */
    /* ---------------------------------------------------------------------- */

    // Dot notation setter
    _setValue(obj, path, value) {
        const keys = path.split('.');
        let current = obj;
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) current[keys[i]] = {};
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
    }

    // Dot notation getter
    _getValue(obj, path) {
        return path.split('.').reduce((o, i) => o?.[i], obj);
    }
}
