/**
 * Skin Manager for Storyteller Cinema
 */

interface SkinData {
    id: string;
    name: string;
    author?: string;
    version?: string;
    autoDownload?: boolean;
    pack?: string;
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

    private static SKIN_TO_PACK: Record<string, string> = {
        'blood-moon': 'the-umbra'
    };

    constructor() {
        this.skins = new Map();
        this.activeSkin = 'default';
        this._styleTag = null;
    }

    async init(): Promise<void> {
        console.log("Storyteller Cinema | Initializing Skin Manager...");
        this.skins.clear();
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


    private proxyUrl = "https://storyteller-cinema-proxy.robsammore.workers.dev";

    private async _loadHubSkins(): Promise<void> {
        const ignoreDev = game.settings?.get('storyteller-cinema', 'ignoreDevKeys') as boolean || false;
        let keys = game.settings?.get('storyteller-cinema', 'premiumKeys') as string[] || [];
        if (ignoreDev) {
            keys = keys.filter(k => !(k.startsWith('sammore-dev-') && k.endsWith('5633')));
        }

        try {
            // 1. Load the free classics pack first (always allowed)
            await this._loadPack('classics', 'classics');

            // 2. Iterate and validate each key against the proxy
            const loadedPacks = new Set<string>();
            for (const key of keys) {
                const normalizedKey = key.toLowerCase();
                if (!normalizedKey || normalizedKey === 'classics') continue;

                const isDev = !ignoreDev && key.startsWith('sammore-dev-') && key.endsWith('5633');
                let allowedPacks = [];
                let allowedSkins = [];

                if (isDev) {
                    allowedPacks = ['the-umbra', 'cyberpunk-neon', 'eldritch-abyss', 'steampunk-gears'];
                } else {
                    const listUrl = `${this.proxyUrl}/packs?key=${encodeURIComponent(key)}`;
                    const res = await fetch(listUrl);
                    if (!res.ok) {
                        console.warn(`Storyteller Cinema | Key '${key}' is invalid or expired.`);
                        continue;
                    }
                    try {
                        const data = await res.json();
                        allowedPacks = data.packs || [];
                        allowedSkins = data.skins || [];
                    } catch (err) {
                        console.error("Storyteller Cinema | Failed to parse key info:", err);
                        continue;
                    }
                }

                // 2a. Carregar pacotes inteiros autorizados
                for (const packId of allowedPacks) {
                    if (packId !== 'classics' && !loadedPacks.has(packId)) {
                        await this._loadPack(packId, key);
                        loadedPacks.add(packId);
                    }
                }

                // 2b. Carregar skins avulsas/individuais autorizadas
                for (const skinId of allowedSkins) {
                    const packId = SkinManager.SKIN_TO_PACK[skinId];
                    if (packId && !this.skins.has(`${packId}-${skinId}`)) {
                        await this._loadSingleSkin(packId, skinId, key);
                    }
                }
            }
        } catch (err) {
            console.error("Storyteller Cinema | Hub skin synchronization failed:", err);
        }
    }

    private async _loadPack(packId: string, premiumKey: string): Promise<void> {
        const isClassicsPack = packId === 'classics';
        // Fetch pack.json via Proxy (using classics key as default for free pack to satisfy worker global key validation)
        const activeKey = isClassicsPack ? 'classics' : premiumKey;
        const packUrl = `${this.proxyUrl}/fetch/packs/${packId}/pack.json?key=${encodeURIComponent(activeKey)}`;
        const packRes = await fetch(packUrl);
        if (!packRes.ok) {
            console.warn(`Storyteller Cinema | Pack '${packId}' not found.`);
            return;
        }

        let pack: { id?: string; name?: string; skins?: string[] };
        try { pack = JSON.parse(await packRes.text()); } catch {
            console.warn(`Storyteller Cinema | Invalid pack.json for '${packId}'.`);
            return;
        }

        const skinIds = pack.skins || [];
        for (const skinId of skinIds) {
            // Fetch each skin.json via Proxy with cache buster
            const skinUrl = `${this.proxyUrl}/fetch/packs/${packId}/skins/${skinId}/skin.json?key=${encodeURIComponent(activeKey)}&v=${Date.now()}`;
            const skinRes = await fetch(skinUrl);
            if (!skinRes.ok) {
                console.warn(`Storyteller Cinema | Skin '${skinId}' in pack '${packId}' not found.`);
                continue;
            }

            let skinData: any;
            try { skinData = await skinRes.json(); } catch {
                console.warn(`Storyteller Cinema | Invalid skin.json for '${skinId}' in pack '${packId}'.`);
                continue;
            }

            // Build asset paths relative to the pack structure
            const baseAssetPath = `packs/${packId}/skins/${skinId}`;
            const assets = {
                ...(skinData.files || {}),
                ...(skinData.assets || {}),
                ...(skinData.options?.assets || {})
            };
            const mappedAssets: Record<string, string> = {};
            for (const [key, relativePath] of Object.entries(assets)) {
                if (typeof relativePath === 'string') {
                    mappedAssets[key] = relativePath.startsWith('packs/') ? relativePath : `${baseAssetPath}/${relativePath}`;
                }
            }

            const mappedSkin: SkinData = {
                id: `${packId}-${skinData.id}`,
                name: skinData.name || skinData.id || skinId,
                author: skinData.author || 'The Blacksmith',
                version: skinData.version || '1.0.0',
                pack: packId, // Mark which pack this skin belongs to
                assets: mappedAssets,
                options: {
                    theme: skinData.options?.theme || 'dark',
                    filter: skinData.options?.filter || 'none',
                    barTexture: skinData.options?.barTexture,
                    backgroundTexture: skinData.options?.backgroundTexture,
                    overlayTexture: skinData.options?.overlayTexture,
                    styles: {
                        '--cinematic-bar-bg': '#000000',
                        '--cinematic-bar-border': 'none',
                        '--cinematic-text-color': '#ffffff',
                        ...(skinData.options?.styles || {})
                    }
                }
            };

            await this.register(mappedSkin, false);
        }
    }

    private async _loadSingleSkin(packId: string, skinId: string, premiumKey: string): Promise<void> {
        const packUrl = `${this.proxyUrl}/fetch/packs/${packId}/skins/${skinId}/skin.json?key=${encodeURIComponent(premiumKey)}&v=${Date.now()}`;
        const skinRes = await fetch(packUrl);
        if (!skinRes.ok) {
            console.warn(`Storyteller Cinema | Skin '${skinId}' in pack '${packId}' not found.`);
            return;
        }

        let skinData: any;
        try { skinData = await skinRes.json(); } catch {
            console.warn(`Storyteller Cinema | Invalid skin.json for '${skinId}' in pack '${packId}'.`);
            return;
        }

        // Build asset paths relative to the pack structure
        const baseAssetPath = `packs/${packId}/skins/${skinId}`;
        const assets = {
            ...(skinData.files || {}),
            ...(skinData.assets || {}),
            ...(skinData.options?.assets || {})
        };
        const mappedAssets: Record<string, string> = {};
        for (const [key, relativePath] of Object.entries(assets)) {
            if (typeof relativePath === 'string') {
                mappedAssets[key] = relativePath.startsWith('packs/') ? relativePath : `${baseAssetPath}/${relativePath}`;
            }
        }

        const mappedSkin: SkinData = {
            id: `${packId}-${skinData.id}`,
            name: skinData.name || skinData.id || skinId,
            author: skinData.author || 'The Blacksmith',
            version: skinData.version || '1.0.0',
            pack: packId,
            assets: mappedAssets,
            options: {
                theme: skinData.options?.theme || 'dark',
                filter: skinData.options?.filter || 'none',
                barTexture: skinData.options?.barTexture,
                backgroundTexture: skinData.options?.backgroundTexture,
                overlayTexture: skinData.options?.overlayTexture,
                styles: {
                    '--cinematic-bar-bg': '#000000',
                    '--cinematic-bar-border': 'none',
                    '--cinematic-text-color': '#ffffff',
                    ...(skinData.options?.styles || {})
                }
            }
        };

        await this.register(mappedSkin, false);
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

        // Find the specific key that unlocked this skin's pack
        let keys = game.settings?.get('storyteller-cinema', 'premiumKeys') as string[] || [];

        if (skin.assets) {
            const borderPath = skin.assets.border;
            const portraitBorderPath = skin.assets.portraitBorder || skin.assets.cardBorder;
            const bgPath = skin.assets.background;
            const topBarPath = skin.assets.topBar;
            const bottomBarPath = skin.assets.bottomBar;
            const footerPath = skin.assets.footer;

            skin.options = skin.options || {};
            skin.options.styles = skin.options.styles || {};
            const skinVersion = skin.version || '1.0.0';

            const getProxyUrl = (relativePath: string) => {
                const isClassicsAsset = relativePath.startsWith('packs/classics/');
                let matchingKey = 'classics';
                if (!isClassicsAsset) {
                    // Find the key that owns this pack (using a quick devKey bypass or fallback to the first key in the list)
                    matchingKey = keys.find(k => k.startsWith('sammore-dev-') && k.endsWith('5633')) || keys[0] || 'classics';
                }
                return `${this.proxyUrl}/fetch/${relativePath}?key=${encodeURIComponent(matchingKey)}&v=${skinVersion}`;
            };

            if (borderPath) {
                skin.options.styles['--cinematic-bar-border-image'] = `url("${getProxyUrl(borderPath)}")`;
            }
            if (portraitBorderPath) {
                skin.options.styles['--cinematic-portrait-border-image'] = `url("${getProxyUrl(portraitBorderPath)}")`;
            }
            if (bgPath) {
                skin.options.backgroundTexture = getProxyUrl(bgPath);
                skin.options.styles['--cinematic-portrait-background'] = `url("${getProxyUrl(bgPath)}")`;
            }
            if (topBarPath) {
                skin.options.barTopTexture = getProxyUrl(topBarPath);
                skin.options.styles['--cinematic-bar-top-texture'] = `url("${getProxyUrl(topBarPath)}")`;
            }
            if (bottomBarPath) {
                skin.options.barBottomTexture = getProxyUrl(bottomBarPath);
                skin.options.styles['--cinematic-bar-bottom-texture'] = `url("${getProxyUrl(bottomBarPath)}")`;
            }
            if (footerPath) {
                skin.options.footerTexture = getProxyUrl(footerPath);
                skin.options.styles['--cinematic-footer-texture'] = `url("${getProxyUrl(footerPath)}")`;
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

        Hooks.call('storyteller-cinema-skins-updated');

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
        const filename = `${skin.id}.json`;

        // Attempt download
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => { try { URL.revokeObjectURL(url); } catch (_) { } }, 1000);

        // Also copy to clipboard as fallback
        try {
            navigator.clipboard.writeText(data);
            ui.notifications?.info(`Storyteller Cinema | Skin exported. JSON also copied to clipboard.`);
        } catch (_) {
            // Clipboard unavailable; download is the only method
        }
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
        // Apenas o narrador (GM) tem acesso para navegar/criar pastas no sistema de arquivos do servidor
        if (!game.user?.isGM) return;

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

        skin.options = skin.options || {};
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

        const timestamp = Date.now();
        const sanitize = (p?: string): string | null => {
            if (!p) return null;
            if (p.startsWith('http') || p.startsWith('blob:')) return p;

            // Add cache buster for local file paths
            const cleanPath = p.startsWith('/') ? p : `/${p}`;
            return `${cleanPath}?v=${timestamp}`;
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
