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

        // Load saved skin setting
        const savedSkin = game.settings.get('storyteller-cinema', 'activeSkin') || 'default';
        this.apply(savedSkin);
    }

    /**
     * Registers a new skin definition
     * @param {Object} skinData The skin definition object
     */
    register(skinData) {
        if (!skinData.id) {
            console.error("Storyteller Cinema | Skin missing ID:", skinData);
            return;
        }
        this.skins.set(skinData.id, skinData);
        console.log(`Storyteller Cinema | Skin Registered: ${skinData.name} (${skinData.id})`);
    }

    /**
     * Applies a skin by ID
     * @param {string} skinId 
     */
    async apply(skinId) {
        if (!this.skins.has(skinId)) {
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

    /* ---------------------------------------------------------------------- */
    /* INTERNALS                                                              */
    /* ---------------------------------------------------------------------- */

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

        // Backgrounds
        if (skin.options.backgroundTexture) {
            css += `    --cinematic-bg-texture: url('${skin.options.backgroundTexture}');\n`;
        } else {
            css += `    --cinematic-bg-texture: none;\n`;
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
