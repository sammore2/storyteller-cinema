/**
 * Skin Config Application
 */
// @ts-ignore
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class SkinConfig extends (HandlebarsApplicationMixin(ApplicationV2) as any) {
    selectedSkinId: string;
    tempSkinData: any | null;
    private _hookId: number | null = null;

    constructor(options = {}) {
        super(options);
        this.selectedSkinId = 'default';
        this.tempSkinData = null; 
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

    async _prepareContext(_options: any): Promise<any> {
        const skinManager = window.StorytellerCinema.skins;
        if (!skinManager) return {};

        const allSkins = skinManager.getSkins();
        const activeSkinId = skinManager.activeSkin;

        let currentSkin = this.tempSkinData;
        if (!currentSkin) {
            currentSkin = allSkins.find(s => s.id === this.selectedSkinId) || allSkins[0];
            this.tempSkinData = JSON.parse(JSON.stringify(currentSkin));
        }

        return {
            skins: allSkins,
            activeSkin: activeSkinId,
            selectedSkin: this.tempSkinData
        };
    }

    _onRender(_context: any, _options: any): void {
        if (!this._hookId) {
            this._hookId = Hooks.on('storyteller-cinema-skins-updated', () => {
                if (this.rendered) this.render();
            });
        }

        const skinItems = this.element.querySelectorAll('.skin-item');
        skinItems.forEach((el: any) => {
            el.addEventListener('click', () => {
                const id = el.dataset.id;
                this.selectedSkinId = id;
                this.tempSkinData = null;
                this.render();
            });
        });

        const deleteBtns = this.element.querySelectorAll('.delete-skin');
        deleteBtns.forEach((btn: any) => {
            btn.addEventListener('click', async (ev: Event) => {
                ev.stopPropagation();
                const id = btn.dataset.id;
                const skins = window.StorytellerCinema.skins;
                if (!skins) return;

                // @ts-ignore
                const confirmed = await foundry.applications.api.DialogV2.confirm({
                    window: { title: "Delete Skin" },
                    content: `<p>Are you sure you want to delete this skin?</p>`,
                    rejectClose: false,
                    modal: true
                });

                if (confirmed) {
                    await skins.delete(id);
                    if (this.selectedSkinId === id) {
                        this.selectedSkinId = 'default';
                        this.tempSkinData = null;
                        this.render();
                    }
                }
            });
        });

        const inputs = this.element.querySelectorAll('input');
        inputs.forEach((input: any) => {
            input.addEventListener('change', (ev: any) => this._onInputChange(ev));
        });

        const applyBtn = this.element.querySelector('.apply-skin-btn');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                const skins = window.StorytellerCinema.skins;
                if (this.tempSkinData && skins) {
                    skins.register(this.tempSkinData, false);
                    skins.apply(this.tempSkinData.id);
                    ui.notifications?.info("Storyteller Cinema | Skin Applied (Not Saved)");
                }
            });
        }

        const saveBtn = this.element.querySelector('.save-skin-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                const skins = window.StorytellerCinema.skins;
                if (this.tempSkinData && skins) {
                    skins.register(this.tempSkinData, true);
                    skins.apply(this.tempSkinData.id);
                    ui.notifications?.info("Storyteller Cinema | Skin Saved & Applied");
                }
            });
        }

        const createBtn = this.element.querySelector('.create-skin-btn');
        if (createBtn) {
            createBtn.addEventListener('click', () => this._createNewSkin());
        }

        const exportBtn = this.element.querySelector('.export-skin-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', (ev: Event) => {
                ev.stopPropagation();
                const skins = window.StorytellerCinema.skins;
                if (!skins) return;
                const id = (exportBtn as any).dataset.id || this.selectedSkinId;
                skins.exportSkin(id);
            });
        }

        const importBtn = this.element.querySelector('.import-skin-btn');
        if (importBtn) {
            importBtn.addEventListener('click', () => this._importSkinDialog());
        }

        const filePickers = this.element.querySelectorAll('.file-picker');
        filePickers.forEach((btn: any) => {
            btn.addEventListener('click', (event: Event) => {
                event.preventDefault();
                const target = btn.dataset.target;
                const currentVal = this._getValue(this.tempSkinData, target);
                const startPath = currentVal || 'storyteller-cinema/';

                const FilePickerClass = (foundry as any).applications?.apps?.FilePicker || FilePicker;
                const filePicker = new FilePickerClass({
                    type: "image",
                    current: startPath,
                    callback: (path: string) => {
                        this._setValue(this.tempSkinData, target, path);
                        this.render();
                    }
                });
                return filePicker.browse();
            });
        });
    }

    _onInputChange(event: any): void {
        event.preventDefault();
        const input = event.currentTarget;
        const field = input.name;
        const value = input.value;
        this._setValue(this.tempSkinData, field, value);
    }

    _createNewSkin(): void {
        const skins = window.StorytellerCinema.skins;
        if (!skins) return;

        const newId = `custom-${Date.now()}`;
        const newSkin = {
            id: newId,
            name: "New Custom Skin",
            author: game.user?.name || "Unknown",
            version: "1.0.0",
            options: {
                theme: "dark",
                styles: {
                    "--cinematic-bar-bg": "#000000"
                }
            }
        };

        skins.register(newSkin);
        this.selectedSkinId = newId;
        this.tempSkinData = null;
        this.render();
    }

    _importSkinDialog(): void {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e: any) => this._processImportFile(e.target.files[0]);
        input.click();
    }

    async _processImportFile(file: any): Promise<void> {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e: any) => {
            const skins = window.StorytellerCinema.skins;
            if (!skins) return;
            const content = e.target.result;
            const imported = await skins.importSkin(content);
            if (imported) {
                this.selectedSkinId = imported.id;
                this.tempSkinData = null;
                this.render();
            }
        };
        reader.readAsText(file);
    }

    _setValue(obj: any, path: string, value: any): void {
        const keys = path.split('.');
        let current = obj;
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) current[keys[i]] = {};
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
    }

    async _close(options: any): Promise<void> {
        if (this._hookId) {
            Hooks.off('storyteller-cinema-skins-updated', this._hookId);
            this._hookId = null;
        }
        return super._close(options);
    }

    _getValue(obj: any, path: string): any {
        return path.split('.').reduce((o, i) => o?.[i], obj);
    }
}
