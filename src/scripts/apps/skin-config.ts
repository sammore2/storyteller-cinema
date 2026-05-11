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

        // Parse Border String: "2px solid #8b7355"
        const borderStr = this._getValue(this.tempSkinData, 'options.styles.--cinematic-bar-border') || '0px none #000000';
        const borderParts = borderStr.split(' ');
        const borderData = {
            width: parseInt(borderParts[0]) || 0,
            style: borderParts[1] || 'none',
            color: borderParts[2] || '#000000'
        };

        return {
            skins: allSkins,
            activeSkin: activeSkinId,
            selectedSkin: this.tempSkinData,
            border: borderData
        };
    }

    _onRender(_context: any, _options: any): void {
        if (!this._hookId) {
            this._hookId = Hooks.on('storyteller-cinema-skins-updated', () => {
                if (this.rendered) this.render();
            });
        }

        // General Inputs
        const inputs = this.element.querySelectorAll('input:not(.border-input), select:not(.border-input)');
        inputs.forEach((input: any) => {
            input.addEventListener('change', (ev: any) => this._onInputChange(ev));
        });

        // Modular Border Inputs
        const borderInputs = this.element.querySelectorAll('.border-input');
        borderInputs.forEach((input: any) => {
            input.addEventListener('change', () => {
                const width = (this.element.querySelector('[name="border.width"]') as any).value;
                const style = (this.element.querySelector('[name="border.style"]') as any).value;
                const color = (this.element.querySelector('[name="border.color"]') as any).value;
                const newBorder = `${width}px ${style} ${color}`;
                this._setValue(this.tempSkinData, 'options.styles.--cinematic-bar-border', newBorder);
            });
        });

        // Skin Selection
        const skinItems = this.element.querySelectorAll('.skin-item');
        skinItems.forEach((el: any) => {
            el.addEventListener('click', () => {
                const id = el.dataset.id;
                this.selectedSkinId = id;
                this.tempSkinData = null;
                this.render();
            });
        });

        // Actions
        this.element.querySelector('.delete-skin')?.addEventListener('click', (ev: any) => this._onDeleteSkin(ev));
        this.element.querySelector('.apply-skin-btn')?.addEventListener('click', () => this._onApplySkin());
        this.element.querySelector('.save-skin-btn')?.addEventListener('click', () => this._onSaveSkin());
        this.element.querySelector('.create-skin-btn')?.addEventListener('click', () => this._createNewSkin());
        this.element.querySelector('.export-skin-btn')?.addEventListener('click', () => this._onExportSkin());
        this.element.querySelector('.import-skin-btn')?.addEventListener('click', () => this._importSkinDialog());

        // File Pickers
        const filePickers = this.element.querySelectorAll('.file-picker');
        filePickers.forEach((btn: any) => {
            btn.addEventListener('click', () => this._onFilePicker(btn));
        });
    }

    _onInputChange(event: any): void {
        const input = event.currentTarget;
        const field = input.name;
        const value = input.value;
        this._setValue(this.tempSkinData, field, value);

        // Sync other inputs with same name (e.g., text <-> color picker)
        const others = this.element.querySelectorAll(`[name="${field}"]`);
        others.forEach((other: any) => {
            if (other !== input) other.value = value;
        });
    }

    async _onDeleteSkin(ev: any): Promise<void> {
        ev.stopPropagation();
        const id = ev.currentTarget.dataset.id;
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
    }

    _onApplySkin(): void {
        const skins = window.StorytellerCinema.skins;
        if (this.tempSkinData && skins) {
            skins.register(this.tempSkinData, false);
            skins.apply(this.tempSkinData.id);
            ui.notifications?.info("Storyteller Cinema | Skin Applied (Not Saved)");
        }
    }

    _onSaveSkin(): void {
        const skins = window.StorytellerCinema.skins;
        if (this.tempSkinData && skins) {
            skins.register(this.tempSkinData, true);
            skins.apply(this.tempSkinData.id);
            ui.notifications?.info("Storyteller Cinema | Skin Saved & Applied");
        }
    }

    _onExportSkin(): void {
        const skins = window.StorytellerCinema.skins;
        if (!skins) return;
        const id = this.selectedSkinId;
        skins.exportSkin(id);
    }

    _onFilePicker(btn: any): void {
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
        filePicker.browse();
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
                    "--cinematic-bar-bg": "#000000",
                    "--cinematic-bar-border": "2px solid #ff6400"
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
