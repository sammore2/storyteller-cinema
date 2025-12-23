// Shim for V13/V12 compatibility
const FilePickerClass = foundry.applications?.apps?.FilePicker || FilePicker;

export class SkinManager {
    constructor() {
        this.skins = new Map();
        this.activeSkin = 'default';
        this._styleTag = null;
    }

    init() {
        console.log("Storyteller Cinema | Initializing Skin Manager...");
        this._createStyleTag();
        this._registerDefaultSkins();

        // Ensure User Data folder exists (for manual uploads/downloads)
        this._ensureDirectory('storyteller-cinema').catch(err => console.warn("Storyteller Cinema | Could not create root folder:", err));

        this._loadCustomSkins(); // <--- FIX: Load saved skins

        // Load saved skin setting
        const savedSkin = game.settings.get('storyteller-cinema', 'activeSkin') || 'default';
        this.apply(savedSkin);
    }

    /**
     * Registers a new skin definition
     * @param {Object} skinData The skin definition object
     * @param {boolean} persist Whether to save to database (default: false)
     */
    async register(skinData, persist = false) {
        if (!skinData.id) {
            console.error("Storyteller Cinema | Skin missing ID:", skinData);
            return;
        }

        // If checking out existing, merge to ensure refs don't break, or just overwrite.
        // Overwrite is safer for full updates.
        this.skins.set(skinData.id, skinData);

        console.log(`Storyteller Cinema | Skin Registered: ${skinData.name} (${skinData.id})`);

        if (persist) {
            await this._saveCustomSkin(skinData);
        }

        // Notify UI to re-render names
        Hooks.call('storyteller-cinema-skins-updated');
    }

    /**
     * Loads custom skins from settings
     */
    _loadCustomSkins() {
        const customSkins = game.settings.get('storyteller-cinema', 'customSkins') || [];
        customSkins.forEach(skin => {
            this.register(skin, false); // No need to re-save
        });
    }

    /**
     * Saves a skin to the customSkins setting
     */
    async _saveCustomSkin(skinData) {
        // Validation: Don't save default/system skins
        if (skinData.author === 'System' || !skinData.id) return;

        const customSkins = game.settings.get('storyteller-cinema', 'customSkins') || [];

        // Remove existing version of this skin if any
        const others = customSkins.filter(s => s.id !== skinData.id);

        // Add new version
        others.push(skinData);

        await game.settings.set('storyteller-cinema', 'customSkins', others);
        console.log("Storyteller Cinema | Custom Skins Saved to DB.");
        Hooks.call('storyteller-cinema-skins-updated');
    }

    /**
     * Deletes a custom skin
     * @param {string} skinId 
     */
    async delete(skinId) {
        if (!this.skins.has(skinId)) return;

        const skin = this.skins.get(skinId);
        if (skin.author === 'System') {
            ui.notifications.warn("Storyteller Cinema | Cannot delete system skins.");
            return;
        }

        // 1. Remove from Map
        this.skins.delete(skinId);

        // 2. Remove from DB
        const customSkins = game.settings.get('storyteller-cinema', 'customSkins') || [];
        const filtered = customSkins.filter(s => s.id !== skinId);
        await game.settings.set('storyteller-cinema', 'customSkins', filtered);

        // 3. Reset if active
        if (this.activeSkin === skinId) {
            this.apply('default');
        }

        console.log(`Storyteller Cinema | Deleted Skin: ${skinId}`);
        Hooks.call('storyteller-cinema-skins-updated');
    }

    /**
     * Applies a skin by ID
     * @param {string} skinId 
     */
    async apply(skinId) {
        if (!this.skins.has(skinId)) {
            // Wait a moment in case styles haven't populated? No, logical fallback.
            console.warn(`Storyteller Cinema | Skin '${skinId}' not found. Reverting to default.`);
            skinId = 'default';
        }

        const skin = this.skins.get(skinId);
        this.activeSkin = skinId;

        // 1. Update Body Class
        // Remove old skin classes
        const classes = document.body.className.split(" ").filter(c => !c.startsWith("cinematic-skin-"));
        document.body.className = classes.join(" ");
        // Add new class
        document.body.classList.add(`cinematic-skin-${skinId}`);
        document.body.dataset.cinematicSkin = skinId;

        // 2. Inject CSS Variables
        this._injectCSS(skin);

        // 3. Save Setting
        if (game.settings.get('storyteller-cinema', 'activeSkin') !== skinId) {
            await game.settings.set('storyteller-cinema', 'activeSkin', skinId);
        }

        console.log(`Storyteller Cinema | Applied Skin: ${skin.name}`);
    }

    getSkins() {
        return Array.from(this.skins.values());
    }

    /**
     * Exports a skin to a JSON file
     * @param {string} skinId 
     */
    exportSkin(skinId) {
        const skin = this.skins.get(skinId);
        if (!skin) {
            ui.notifications.error("Storyteller Cinema | Skin not found.");
            return;
        }

        const data = JSON.stringify(skin, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${skin.id}.json`;
        a.click();
    }
    /**
     * Imports a skin from a JSON string or object
     * @param {string|object} jsonData 
     */
    async importSkin(jsonData) {
        let skin;
        try {
            skin = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
        } catch (e) {
            ui.notifications.error("Storyteller Cinema | Invalid JSON.");
            return;
        }

        if (!skin.id || !skin.name) {
            ui.notifications.error("Storyteller Cinema | Invalid Skin definition.");
            return;
        }

        // --- AUTO-DOWNLOAD LOGIC ---
        if (skin.autoDownload && skin.assets) {
            ui.notifications.info("Storyteller Cinema | Downloading skin assets...");

            // Prepare Target Directory
            const targetDir = `storyteller-cinema/${skin.id}`;
            await this._ensureDirectory(targetDir);

            // Download Each Asset
            for (const [key, url] of Object.entries(skin.assets)) {
                if (!url || !url.startsWith('http')) continue;

                // Extract filename
                const filename = url.split('/').pop();

                // Download
                const savedPath = await this._downloadAndSave(url, targetDir, filename);

                if (savedPath) {
                    // Update Skin Definition with Local Path
                    skin.options[key] = savedPath; // e.g. options.barTexture = "storyteller-cinema/gold/bg.png"
                    // Also clear root assets key if desired, but keeping options sync is key
                }
            }
            ui.notifications.info("Storyteller Cinema | Assets downloaded successfully.");
        }
        // ---------------------------------------

        // Register and Save to DB
        await this.register(skin, true);
        await this.apply(skin.id);

        ui.notifications.info(`Storyteller Cinema | Imported skin: ${skin.name}`);
        return skin;
    }

    /* ---------------------------------------------------------------------- */
    /* INTERNALS                                                              */
    /* ---------------------------------------------------------------------- */

    async _ensureDirectory(path) {
        const source = 'data';
        const parts = path.split('/');
        let currentPath = "";

        for (const part of parts) {
            currentPath = currentPath ? `${currentPath}/${part}` : part;
            try {
                // Check if exists
                await FilePickerClass.browse(source, currentPath);
            } catch (e) {
                // If not, try to create
                try {
                    await FilePickerClass.createDirectory(source, currentPath);
                    console.log(`Storyteller Cinema | Created directory: ${currentPath}`);
                } catch (err) {
                    // Ignore if it already exists (race condition) or if root modules/ folder is protected
                    if (!err.message.includes("EEXIST")) {
                        console.warn(`Storyteller Cinema | Failed to create ${currentPath}`, err);
                    }
                }
            }
        }
    }

    async _downloadAndSave(url, targetDir, filename) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const blob = await response.blob();
            const file = new File([blob], filename, { type: blob.type });

            const result = await FilePickerClass.upload('data', targetDir, file);
            return result.path;
        } catch (err) {
            console.error(`Storyteller Cinema | Failed to fetch ${url}`, err);
            return null;
        }
    }

    _createStyleTag() {
        if (!document.getElementById('storyteller-cinema-skin-styles')) {
            this._styleTag = document.createElement('style');
            this._styleTag.id = 'storyteller-cinema-skin-styles';
            document.head.appendChild(this._styleTag);
        } else {
            this._styleTag = document.getElementById('storyteller-cinema-skin-styles');
        }
    }

    _injectCSS(skin) {
        if (!this._styleTag) this._createStyleTag();

        let css = `:root { \n`;

        // Styles
        if (skin.options.styles) {
            for (const [key, value] of Object.entries(skin.options.styles)) {
                css += `    ${key}: ${value};\n`;
            }
        }

        // Filters (Global)
        if (skin.options.filter) {
            css += `    --cinematic-filter: ${skin.options.filter};\n`;
        } else {
            css += `    --cinematic-filter: none;\n`;
        }

        // Helper to sanitize path (ensure / if not http)
        const sanitize = (p) => {
            if (!p) return null;
            if (p.startsWith('http') || p.startsWith('/')) return p;
            return `/${p}`;
        };

        // Bar Background Texture (Standard or Legacy)
        const barTex = sanitize(skin.options.barTexture || skin.options.backgroundTexture);
        if (barTex) {
            css += `    --cinematic-bg-texture: url('${barTex}');\n`;
        } else {
            css += `    --cinematic-bg-texture: none;\n`;
        }

        // Overlay Texture
        const overlayTex = sanitize(skin.options.overlayTexture);
        if (overlayTex) {
            css += `    --cinematic-overlay-texture: url('${overlayTex}');\n`;
        } else {
            css += `    --cinematic-overlay-texture: none;\n`;
        }

        css += `}\n`;

        // Apply Filter specifically to the scene container or body if needed
        // Assuming style.scss uses var(--cinematic-filter)

        this._styleTag.innerHTML = css;
    }

    _registerDefaultSkins() {
        // 1. DEFAULT
        this.register({
            id: 'default',
            name: 'Classic Black',
            author: 'Storyteller',
            version: '1.0.0',
            options: {
                theme: 'dark',
                styles: {
                    '--cinematic-bar-bg': '#000000',
                    '--cinematic-bar-border': 'none',
                    '--cinematic-text-color': '#ffffff'
                }
            }
        });

        // 2. VIGNETTE
        this.register({
            id: 'vignette',
            name: 'Soft Vignette',
            author: 'Storyteller',
            version: '1.0.0',
            options: {
                theme: 'dark',
                styles: {
                    '--cinematic-bar-bg': 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 50%, transparent 100%)',
                    '--cinematic-bar-border': 'none',
                    '--cinematic-text-color': '#e0e0e0'
                }
            }
        });

        // 3. NOIR
        this.register({
            id: 'noir',
            name: 'Noir Detective',
            author: 'Storyteller',
            version: '1.0.0',
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

        // 4. SEPIA
        this.register({
            id: 'sepia',
            name: 'Old Photograph',
            author: 'Storyteller',
            version: '1.0.0',
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
