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
        // 0. Reactivity
        if (!this._hookId) {
            this._hookId = Hooks.on('storyteller-cinema-skins-updated', () => {
                if (this.rendered) this.render();
            });
        }

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

        // 1.5 Delete Button
        const deleteBtns = this.element.querySelectorAll('.delete-skin');
        deleteBtns.forEach(btn => {
            btn.addEventListener('click', async (ev) => {
                ev.stopPropagation(); // Stop selection
                const id = btn.dataset.id;

                const confirmed = await foundry.applications.api.DialogV2.confirm({
                    window: { title: "Delete Skin" },
                    content: `<p>Are you sure you want to delete this skin?</p>`,
                    rejectClose: false,
                    modal: true
                });

                if (confirmed) {
                    await window.StorytellerCinema.skins.delete(id);
                    // If we deleted the selected one, switch to default
                    if (this.selectedSkinId === id) {
                        this.selectedSkinId = 'default';
                        this.tempSkinData = null;
                        this.render();
                    }
                }
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
                    // Just update memory and apply (preview)
                    window.StorytellerCinema.skins.register(this.tempSkinData, false);
                    window.StorytellerCinema.skins.apply(this.tempSkinData.id);
                    ui.notifications.info("Storyteller Cinema | Skin Applied (Not Saved)");
                }
            });
        }

        // 3.5 Save Button
        const saveBtn = this.element.querySelector('.save-skin-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                if (this.tempSkinData) {
                    // Update memory AND save to DB
                    window.StorytellerCinema.skins.register(this.tempSkinData, true);
                    window.StorytellerCinema.skins.apply(this.tempSkinData.id);
                    ui.notifications.info("Storyteller Cinema | Skin Saved & Applied");
                }
            });
        }

        // 4. Create Button
        const createBtn = this.element.querySelector('.create-skin-btn');
        if (createBtn) {
            createBtn.addEventListener('click', () => this._createNewSkin());
        }

        // 6. Export Button
        const exportBtn = this.element.querySelector('.export-skin-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', (ev) => {
                ev.stopPropagation(); // Avoid triggering parent clicks
                // Get ID from the button itself (if in list) or use selected
                const id = exportBtn.dataset.id || this.selectedSkinId;
                window.StorytellerCinema.skins.exportSkin(id);
            });
        }

        // 7. Import Button
        const importBtn = this.element.querySelector('.import-skin-btn');
        if (importBtn) {
            importBtn.addEventListener('click', () => this._importSkinDialog());
        }

        // 5. File Pickers
        const filePickers = this.element.querySelectorAll('.file-picker');
        filePickers.forEach(btn => {
            btn.addEventListener('click', event => {
                event.preventDefault();
                const target = btn.dataset.target; // <--- RESTORED
                const currentVal = this._getValue(this.tempSkinData, target);

                // UX IMPROVEMENT: Default to User Data folder, NOT module folder (Permissions)
                // This allows users to upload files without hitting "Read Only" errors.
                const startPath = currentVal || 'storyteller-cinema/';

                const FilePickerClass = foundry.applications?.apps?.FilePicker || FilePicker;
                const filePicker = new FilePickerClass({
                    type: "image",
                    current: startPath,
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

    _importSkinDialog() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => this._processImportFile(e.target.files[0]);
        input.click();
    }

    async _processImportFile(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            const content = e.target.result;
            const imported = await window.StorytellerCinema.skins.importSkin(content);
            if (imported) {
                this.selectedSkinId = imported.id;
                this.tempSkinData = null;
                this.render();
            }
        };
        reader.readAsText(file);
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

    /** @override */
    async _close(options) {
        if (this._hookId) {
            Hooks.off('storyteller-cinema-skins-updated', this._hookId);
            this._hookId = null;
        }
        return super._close(options);
    }

    // Dot notation getter
    _getValue(obj, path) {
        return path.split('.').reduce((o, i) => o?.[i], obj);
    }
}
