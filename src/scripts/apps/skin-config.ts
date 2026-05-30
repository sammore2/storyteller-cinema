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
            tagName: "form",
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
            },
            form: {
                handler: SkinConfig._onSubmit,
                submitOnChange: true,
                closeOnSubmit: false
            },
            actions: {
                selectSkin: SkinConfig._onSelectSkin,
                deleteSkin: SkinConfig._onDeleteSkin,
                createSkin: SkinConfig._createNewSkin,
                importSkin: SkinConfig._importSkinDialog,
                saveSkin: SkinConfig._onSaveSkin,
                exportSkin: SkinConfig._onExportSkin,
                applySkin: SkinConfig._onApplySkin
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
        super._onRender(_context, _options);
        if (!this._hookId) {
            this._hookId = Hooks.on('storyteller-cinema-skins-updated', () => {
                if (this.rendered) this.render();
            });
        }
        const f = this.element; if (!f) return;
        const sync = () => {
            const bw = (f.querySelector('[name="border.width"]') as HTMLInputElement)?.value ?? '0';
            const bs = (f.querySelector('[name="border.style"]') as HTMLSelectElement)?.value ?? 'none';
            const bc = (f.querySelector('[name="border.color"]') as HTMLInputElement)?.value ?? '#000000';
            const v = `${bw}px ${bs} ${bc}`;
            this.tempSkinData.options.styles['--cinematic-bar-border'] = v;
            document.documentElement.style.setProperty('--cinematic-bar-border', v);
        };
        f.querySelectorAll('.border-input').forEach((el: Element) => el.addEventListener('change', sync));
        const nameInput = f.querySelector('[name="name"]') as HTMLInputElement;
        if (nameInput) nameInput.addEventListener('change', () => { this.tempSkinData.name = nameInput.value; });
        f.querySelectorAll('file-picker[name="options.portraitBorder"]').forEach((fp: any) => {
            fp.addEventListener('change', () => {
                const val = (fp as any).value ?? '';
                this.tempSkinData.options.portraitBorder = val;
                this.tempSkinData.options.styles['--cinematic-portrait-border-image'] = val ? `url(${this._cssUrl(val)})` : 'none';
                document.documentElement.style.setProperty('--cinematic-portrait-border-image', val ? `url(${this._cssUrl(val)})` : 'none');
            });
        });
    }

    static async _onSubmit(
        this: SkinConfig,
        _event: SubmitEvent | Event,
        _form: HTMLFormElement,
        formData: any
    ): Promise<void> {
        // Expand flat dot-notation keys
        const expanded = (foundry.utils as any).expandObject(formData.object) as any;

        this.tempSkinData.name = expanded.name;
        this.tempSkinData.options = this.tempSkinData.options || {};
        this.tempSkinData.options.barTexture = expanded.options?.barTexture || '';
        this.tempSkinData.options.barTopTexture = expanded.options?.barTopTexture || '';
        this.tempSkinData.options.barBottomTexture = expanded.options?.barBottomTexture || '';
        this.tempSkinData.options.footerTexture = expanded.options?.footerTexture || '';
        this.tempSkinData.options.portraitBorder = expanded.options?.portraitBorder || '';
        this.tempSkinData.options.overlayTexture = expanded.options?.overlayTexture || '';
        this.tempSkinData.options.filter = expanded.options?.filter || '';

        this.tempSkinData.options.styles = this.tempSkinData.options.styles || {};
        this.tempSkinData.options.styles['--cinematic-bar-bg'] = expanded.options?.styles?.['--cinematic-bar-bg'] || '#000000';
        this.tempSkinData.options.styles['--cinematic-footer-bg'] = expanded.options?.styles?.['--cinematic-footer-bg'] || 'transparent';
        this.tempSkinData.options.styles['--cinematic-portrait-name-bg'] = expanded.options?.styles?.['--cinematic-portrait-name-bg'] || 'none';
        this.tempSkinData.options.styles['--cinematic-portrait-border-image'] = expanded.options?.portraitBorder ? `url(${this._cssUrl(expanded.options.portraitBorder)})` : 'none';
        
        // Map Footer Texture
        const footerTexture = expanded.options?.footerTexture || '';
        this.tempSkinData.options.styles['--cinematic-footer-texture'] = footerTexture ? `url(${footerTexture})` : 'none';

        // Reconstruct border string – read directly from DOM to avoid partial formData
        const f = _form || this.element;
        const bw = (f.querySelector('[name="border.width"]') as HTMLInputElement)?.value ?? '0';
        const bs = (f.querySelector('[name="border.style"]') as HTMLSelectElement)?.value ?? 'none';
        const bc = (f.querySelector('[name="border.color"]') as HTMLInputElement)?.value ?? '#000000';
        this.tempSkinData.options.styles['--cinematic-bar-border'] = `${bw}px ${bs} ${bc}`;

        this.render();
    }

    static _onSelectSkin(this: SkinConfig, _event: PointerEvent, target: HTMLElement): void {
        const id = target.dataset.id;
        if (!id) return;
        this.selectedSkinId = id;
        this.tempSkinData = null;
        this.render();
    }

    static async _onDeleteSkin(this: SkinConfig, event: PointerEvent, target: HTMLElement): Promise<void> {
        event.stopPropagation();
        const id = target.dataset.id;
        if (!id) return;
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

    _captureFormData(this: SkinConfig): void {
        const form = this.element;
        if (!form) return;
        const opts = this.tempSkinData.options || {};
        form.querySelectorAll('file-picker[name]').forEach((fp: any) => {
            const name = fp.getAttribute('name');
            const val = fp.value ?? fp.getAttribute('value') ?? '';
            if (name === 'options.barTopTexture') opts.barTopTexture = val;
            else if (name === 'options.barBottomTexture') opts.barBottomTexture = val;
            else if (name === 'options.barTexture') opts.barTexture = val;
            else if (name === 'options.footerTexture') opts.footerTexture = val;
            else if (name === 'options.overlayTexture') opts.overlayTexture = val;
            else if (name === 'options.portraitBorder') opts.portraitBorder = val;
            else if (name === 'options.filter') opts.filter = val;
        });
        this.tempSkinData.options = opts;
        this.tempSkinData.options.styles = this.tempSkinData.options.styles || {};
        this.tempSkinData.options.styles['--cinematic-portrait-border-image'] = opts.portraitBorder ? `url(${this._cssUrl(opts.portraitBorder)})` : 'none';
    }

    static _onApplySkin(this: SkinConfig): void {
        this._captureFormData();
        const skins = window.StorytellerCinema.skins;
        if (this.tempSkinData && skins) {
            skins.register(this.tempSkinData, false);
            skins.apply(this.tempSkinData.id);
            ui.notifications?.info("Storyteller Cinema | Skin Applied (Not Saved)");
        }
    }

    static _onSaveSkin(this: SkinConfig): void {
        this._captureFormData();
        const skins = window.StorytellerCinema.skins;
        if (this.tempSkinData && skins) {
            skins.register(this.tempSkinData, true);
            skins.apply(this.tempSkinData.id);
            ui.notifications?.info("Storyteller Cinema | Skin Saved & Applied");
        }
    }

    static _onExportSkin(this: SkinConfig): void {
        const skins = window.StorytellerCinema.skins;
        if (!skins) return;
        const id = this.selectedSkinId;
        skins.exportSkin(id);
    }

    static _createNewSkin(this: SkinConfig): void {
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

    static _importSkinDialog(this: SkinConfig): void {
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

    private _cssUrl(p: string): string {
        if (!p || p.startsWith('http') || p.startsWith('/') || p.startsWith('blob:')) return p;
        return `/${p}`;
    }
}
