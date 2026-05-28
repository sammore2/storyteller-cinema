/**
 * Skin Manager for Storyteller Cinema
 */

interface SkinData {
    id: string;
    name: string;
    author?: string;
    version?: string;
    autoDownload?: boolean;
    assets?: Record<string, string>;
    options: {
        theme?: string;
        filter?: string;
        styles?: Record<string, string>;
        barTexture?: string;
        barTopTexture?: string;
        barBottomTexture?: string;
        backgroundTexture?: string;
        overlayTexture?: string;
        footerTexture?: string;
    };
}

// @ts-ignore
const FilePickerClass = foundry.applications?.apps?.FilePicker || FilePicker;

export class SkinManager {
    skins: Map<string, SkinData>;
    activeSkin: string;
    private _styleTag: HTMLStyleElement | null;

    constructor() {
        this.skins = new Map();
        this.activeSkin = 'default';
        this._styleTag = null;
    }

    async init(): Promise<void> {
        console.log("Storyteller Cinema | Initializing Skin Manager...");
        this._createStyleTag();
        this._registerDefaultSkins();

        // Ensure User Data folder exists
        this._ensureDirectory('storyteller-cinema').catch(err => console.warn("Storyteller Cinema | Root folder error:", err));

        this._loadCustomSkins();

        // Load Premium Hub Skins and await them
        await this._loadHubSkins();

        // Load saved skin setting
        const savedSkin = game.settings?.get('storyteller-cinema', 'activeSkin') || 'default';
        await this.apply(savedSkin);
    }


    private _objectUrls: Map<string, string> = new Map();

    private async _fetchAssetAsObjectURL(relativePath: string, token: string): Promise<string | null> {
        try {
            const url = `https://api.github.com/repos/sammore2/storyteller-cinema-hub/contents/${relativePath}`;
            const response = await fetch(url, {
                headers: {
                    "Authorization": `token ${token}`,
                    "Accept": "application/vnd.github.v3.raw"
                }
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const blob = await response.blob();
            return URL.createObjectURL(blob);
        } catch (err) {
            console.error(`Storyteller Cinema | Failed to fetch asset as Blob: ${relativePath}`, err);
            return null;
        }
    }

    private async _loadHubSkins(): Promise<void> {
        // Load premium skins exclusively from the private GitHub repository using the token
        const token = game.settings?.get('storyteller-cinema', 'premiumGitHubToken') as string;
        if (token) {
            try {
                // Fetch skins.json from private repository API
                const url = "https://api.github.com/repos/sammore2/storyteller-cinema-hub/contents/skins.json";
                const response = await fetch(url, {
                    headers: {
                        "Authorization": `token ${token}`,
                        "Accept": "application/vnd.github.v3.raw"
                    }
                });

                if (response.ok) {
                    const data = await response.json().catch(err => {
                        console.error("Storyteller Cinema | Failed to parse skins.json from GitHub:", err);
                        return null;
                    });

                    if (data && Array.isArray(data.skins)) {
                        for (const skin of data.skins) {
                            const mappedSkin: SkinData = {
                                id: skin.id,
                                name: game.i18n.has(skin.name) ? game.i18n.localize(skin.name) : (skin.name || skin.id),
                                author: skin.author || 'The Blacksmith',
                                version: skin.version || '1.0.0',
                                assets: { ...(skin.files || {}), ...(skin.assets || {}) }, // Merge legacy files + new assets (footer, etc.)
                                options: {
                                    theme: skin.options?.theme || 'dark',
                                    filter: skin.options?.filter || 'none',
                                    barTexture: skin.options?.barTexture,
                                    backgroundTexture: skin.options?.backgroundTexture,
                                    overlayTexture: skin.options?.overlayTexture,
                                    styles: {
                                        '--cinematic-bar-bg': skin.options?.styles?.['--cinematic-bar-bg'] || '#000000',
                                        '--cinematic-bar-border': skin.options?.styles?.['--cinematic-bar-border'] || 'none',
                                        '--cinematic-text-color': skin.options?.styles?.['--cinematic-text-color'] || '#ffffff',
                                        ...skin.options?.styles
                                    }
                                }
                            };

                            await this.register(mappedSkin, false);
                        }
                        console.log("Storyteller Cinema | Premium Hub Skins loaded from private GitHub repo.");
                    }
                } else {
                    console.warn(`Storyteller Cinema | Premium skin sync failed with HTTP status ${response.status}`);
                }
            } catch (err) {
                console.error("Storyteller Cinema | Premium skin synchronization failed:", err);
            }
        }
    }







    async register(skinData: SkinData, persist: boolean = false): Promise<void> {
        if (!skinData.id) {
            console.error("Storyteller Cinema | Skin missing ID:", skinData);
            return;
        }

        this.skins.set(skinData.id, skinData);
        console.log(`Storyteller Cinema | Skin Registered: ${skinData.name} (${skinData.id})`);

        if (persist) {
            await this._saveCustomSkin(skinData);
        }

        Hooks.call('storyteller-cinema-skins-updated');
    }

    private _loadCustomSkins(): void {
        const customSkins = (game.settings?.get('storyteller-cinema', 'customSkins') as SkinData[]) || [];
        customSkins.forEach(skin => {
            this.register(skin, false);
        });
    }

    private async _saveCustomSkin(skinData: SkinData): Promise<void> {
        if (skinData.author === 'System' || !skinData.id) return;

        const customSkins = (game.settings?.get('storyteller-cinema', 'customSkins') as SkinData[]) || [];
        const others = customSkins.filter(s => s.id !== skinData.id);
        others.push(skinData);

        await game.settings?.set('storyteller-cinema', 'customSkins', others);
        Hooks.call('storyteller-cinema-skins-updated');
    }

    async delete(skinId: string): Promise<void> {
        const skin = this.skins.get(skinId);
        if (!skin) return;

        if (skin.author === 'System') {
            ui.notifications?.warn("Storyteller Cinema | Cannot delete system skins.");
            return;
        }

        this.skins.delete(skinId);

        const customSkins = (game.settings?.get('storyteller-cinema', 'customSkins') as SkinData[]) || [];
        const filtered = customSkins.filter(s => s.id !== skinId);
        await game.settings?.set('storyteller-cinema', 'customSkins', filtered);

        if (this.activeSkin === skinId) {
            this.apply('default');
        }

        Hooks.call('storyteller-cinema-skins-updated');
    }

    async apply(skinId: string): Promise<void> {
        let skin = this.skins.get(skinId);
        if (!skin) {
            console.warn(`Storyteller Cinema | Skin '${skinId}' not found. Reverting to default.`);
            skinId = 'default';
            skin = this.skins.get('default')!;
        }

        // Revoke old object URLs to release memory
        for (const url of this._objectUrls.values()) {
            URL.revokeObjectURL(url);
        }
        this._objectUrls.clear();

        // If it's a premium skin and has assets, fetch them on the fly using token
        const token = game.settings?.get('storyteller-cinema', 'premiumGitHubToken') as string;
        if (skin.assets && token) {
            ui.notifications?.info(`Storyteller Cinema | Loading secure premium assets for: ${skin.name}...`);
                            const borderPath = skin.assets.border;
                            const portraitBorderPath = skin.assets.portraitBorder || skin.assets.cardBorder;
                            const bgPath = skin.assets.background;
                            const topBarPath = skin.assets.topBar;
                            const bottomBarPath = skin.assets.bottomBar;

            skin.options.styles = skin.options.styles || {};

            if (borderPath) {
                const borderObjUrl = await this._fetchAssetAsObjectURL(borderPath, token);
                if (borderObjUrl) {
                    this._objectUrls.set('border', borderObjUrl);
                    skin.options.styles['--cinematic-bar-border-image'] = `url("${borderObjUrl}")`;
                }
            }

            if (portraitBorderPath) {
                const portraitBorderObjUrl = await this._fetchAssetAsObjectURL(portraitBorderPath, token);
                if (portraitBorderObjUrl) {
                    this._objectUrls.set('portraitBorder', portraitBorderObjUrl);
                    skin.options.styles['--cinematic-portrait-border-image'] = `url("${portraitBorderObjUrl}")`;
                }
            }

            if (bgPath) {
                const bgObjUrl = await this._fetchAssetAsObjectURL(bgPath, token);
                if (bgObjUrl) {
                    this._objectUrls.set('background', bgObjUrl);
                    skin.options.backgroundTexture = bgObjUrl;
                    skin.options.styles['--cinematic-portrait-background'] = `url("${bgObjUrl}")`;
                }
            }

            if (topBarPath) {
                const topBarObjUrl = await this._fetchAssetAsObjectURL(topBarPath, token);
                if (topBarObjUrl) {
                    this._objectUrls.set('topBar', topBarObjUrl);
                    skin.options.barTopTexture = topBarObjUrl;
                    skin.options.styles['--cinematic-bar-top-texture'] = `url("${topBarObjUrl}")`;
                }
            }

            if (bottomBarPath) {
                const bottomBarObjUrl = await this._fetchAssetAsObjectURL(bottomBarPath, token);
                if (bottomBarObjUrl) {
                    this._objectUrls.set('bottomBar', bottomBarObjUrl);
                    skin.options.barBottomTexture = bottomBarObjUrl;
                    skin.options.styles['--cinematic-bar-bottom-texture'] = `url("${bottomBarObjUrl}")`;
                }
            }

            const footerPath = skin.assets.footer;
            if (footerPath) {
                const footerObjUrl = await this._fetchAssetAsObjectURL(footerPath, token);
                if (footerObjUrl) {
                    this._objectUrls.set('footer', footerObjUrl);
                    skin.options.footerTexture = footerObjUrl;
                    skin.options.styles['--cinematic-footer-texture'] = `url("${footerObjUrl}")`;
                }
            }
        }

        this.activeSkin = skinId;

        // Update Body Class
        const classes = document.body.className.split(" ").filter(c => !c.startsWith("cinematic-skin-"));
        document.body.className = classes.join(" ");
        document.body.classList.add(`cinematic-skin-${skinId}`);
        document.body.dataset.cinematicSkin = skinId;

        // Inject CSS Variables
        this._injectCSS(skin);

        // Save Setting
        if (game.settings?.get('storyteller-cinema', 'activeSkin') !== skinId) {
            await game.settings?.set('storyteller-cinema', 'activeSkin', skinId);
        }

        console.log(`Storyteller Cinema | Applied Skin: ${skin.name}`);
    }

    getSkins(): SkinData[] {
        return Array.from(this.skins.values());
    }

    exportSkin(skinId: string): void {
        const skin = this.skins.get(skinId);
        if (!skin) {
            ui.notifications?.error("Storyteller Cinema | Skin not found.");
            return;
        }

        const data = JSON.stringify(skin, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${skin.id}.json`;
        a.click();
    }

    async importSkin(jsonData: string | object): Promise<SkinData | undefined> {
        let skin: SkinData;
        try {
            skin = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
        } catch (e) {
            ui.notifications?.error("Storyteller Cinema | Invalid JSON.");
            return;
        }

        if (!skin.id || !skin.name) {
            ui.notifications?.error("Storyteller Cinema | Invalid Skin definition.");
            return;
        }

        // AUTO-DOWNLOAD LOGIC
        if (skin.autoDownload && skin.assets) {
            ui.notifications?.info("Storyteller Cinema | Downloading skin assets...");
            const targetDir = `storyteller-cinema/${skin.id}`;
            await this._ensureDirectory(targetDir);

            for (const [key, url] of Object.entries(skin.assets)) {
                if (!url || !url.startsWith('http')) continue;
                const filename = url.split('/').pop()!;
                const savedPath = await this._downloadAndSave(url, targetDir, filename);
                if (savedPath) {
                    (skin.options as any)[key] = savedPath;
                }
            }
            ui.notifications?.info("Storyteller Cinema | Assets downloaded successfully.");
        }

        await this.register(skin, true);
        await this.apply(skin.id);

        ui.notifications?.info(`Storyteller Cinema | Imported skin: ${skin.name}`);
        return skin;
    }

    private async _ensureDirectory(path: string): Promise<void> {
        const source = 'data';
        const parts = path.split('/');
        let currentPath = "";

        for (const part of parts) {
            currentPath = currentPath ? `${currentPath}/${part}` : part;
            try {
                // @ts-ignore
                await FilePickerClass.browse(source, currentPath);
            } catch (e) {
                try {
                    // @ts-ignore
                    await FilePickerClass.createDirectory(source, currentPath);
                } catch (err: any) {
                    if (!err.message.includes("EEXIST")) {
                        console.warn(`Storyteller Cinema | Failed to create ${currentPath}`, err);
                    }
                }
            }
        }
    }

    private async _downloadAndSave(url: string, targetDir: string, filename: string, token?: string): Promise<string | null> {
        try {
            const headers: Record<string, string> = {};
            if (token) {
                headers["Authorization"] = `token ${token}`;
            }
            const response = await fetch(url, { headers });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const blob = await response.blob();
            const file = new File([blob], filename, { type: blob.type });

            // @ts-ignore
            const result = await FilePickerClass.upload('data', targetDir, file);
            return result.path;
        } catch (err) {
            console.error(`Storyteller Cinema | Failed to fetch ${url}`, err);
            return null;
        }
    }


    private _createStyleTag(): void {
        const existing = document.getElementById('storyteller-cinema-skin-styles');
        if (!existing) {
            this._styleTag = document.createElement('style');
            this._styleTag.id = 'storyteller-cinema-skin-styles';
            document.head.appendChild(this._styleTag);
        } else {
            this._styleTag = existing as HTMLStyleElement;
        }
    }

    private _injectCSS(skin: SkinData): void {
        if (!this._styleTag) this._createStyleTag();

        let css = `:root { \n`;

        if (skin.options.styles) {
            const skipKeys = new Set([
                '--cinematic-bg-texture',
                '--cinematic-bar-top-texture',
                '--cinematic-bar-bottom-texture',
                '--cinematic-footer-texture',
                '--cinematic-overlay-texture'
            ]);
            for (const [key, value] of Object.entries(skin.options.styles)) {
                if (skipKeys.has(key)) continue;
                css += `    ${key}: ${value};\n`;
            }
        }

        css += `    --cinematic-filter: ${skin.options.filter || 'none'};\n`;

        const sanitize = (p?: string): string | null => {
            if (!p) return null;
            if (p.startsWith('http') || p.startsWith('/') || p.startsWith('blob:')) return p;
            return `/${p}`;
        };

        const barTex = sanitize(skin.options.barTexture || skin.options.backgroundTexture);
        if (barTex) {
            css += `    --cinematic-bg-texture: url("${barTex}");\n`;
        }

        const barTopTex = sanitize(skin.options.barTopTexture);
        if (barTopTex) {
            css += `    --cinematic-bar-top-texture: url("${barTopTex}");\n`;
        }

        const barBottomTex = sanitize(skin.options.barBottomTexture);
        if (barBottomTex) {
            css += `    --cinematic-bar-bottom-texture: url("${barBottomTex}");\n`;
        }

        const footerTex = sanitize(skin.options.footerTexture);
        if (footerTex) {
            css += `    --cinematic-footer-texture: url("${footerTex}");\n`;
        }

        const overlayTex = sanitize(skin.options.overlayTexture);
        if (overlayTex) {
            css += `    --cinematic-overlay-texture: url("${overlayTex}");\n`;
        }

        css += `}\n`;
        this._styleTag!.innerHTML = css;
    }

    private _registerDefaultSkins(): void {
        this.register({
            id: 'default',
            name: 'Classic Black',
            author: 'System',
            options: {
                theme: 'dark',
                styles: {
                    '--cinematic-bar-bg': '#000000',
                    '--cinematic-bar-border': 'none',
                    '--cinematic-text-color': '#ffffff'
                }
            }
        });

        this.register({
            id: 'vignette',
            name: 'Soft Vignette',
            author: 'System',
            options: {
                theme: 'dark',
                styles: {
                    '--cinematic-bar-bg': 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 50%, transparent 100%)',
                    '--cinematic-bar-border': 'none',
                    '--cinematic-text-color': '#e0e0e0'
                }
            }
        });

        this.register({
            id: 'noir',
            name: 'Noir Detective',
            author: 'System',
            options: {
                theme: 'dark',
                filter: 'grayscale(100%) contrast(1.2)',
                styles: {
                    '--cinematic-bar-bg': '#1a1a1a',
                    '--cinematic-bar-border': '1px solid #333',
                    '--cinematic-text-color': '#cccccc'
                }
            }
        });

        this.register({
            id: 'sepia',
            name: 'Old Photograph',
            author: 'System',
            options: {
                theme: 'light',
                filter: 'sepia(0.8) contrast(0.9)',
                styles: {
                    '--cinematic-bar-bg': '#3b2f2f',
                    '--cinematic-bar-border': '2px solid #8b7355',
                    '--cinematic-text-color': '#f4ebd0'
                }
            }
        });
    }
}
