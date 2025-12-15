
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class CinematicSceneConfig extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: "cinematic-scene-config",
        tag: "form",
        window: {
            title: "Configuração de Cena Cinemática",
            icon: "fas fa-film",
            resizable: true,
            controls: []
        },
        position: {
            width: 480,
            height: "auto"
        },
        form: {
            handler: CinematicSceneConfig.submit,
            closeOnSubmit: true
        }
    };

    static PARTS = {
        form: {
            template: "modules/storyteller-cinema/templates/cinematic-scene-config.hbs"
        }
    };

    /** @override */
    constructor(options = {}) {
        super(options);
        this.scene = options.scene;
    }

    /** @override */
    async _prepareContext(_options) {
        const flags = this.scene.flags["storyteller-cinema"] || {};

        return {
            viewMode: flags.viewMode || "battlemap",
            cinematicBg: flags.cinematicBg || "",
            // Helper for Select Options
            viewModes: {
                battlemap: "📍 Battlemap (Tático)",
                cinematic: "🎬 Cinematic (Imersivo)"
            }
        };
    }

    /**
     * Handle form submission.
     * @param {Event} event 
     * @param {HTMLFormElement} form 
     * @param {FormDataExtended} formData 
     */
    static async submit(event, form, formData) {
        const data = formData.object;

        // "this" here refers to the class instance because Handler calls it bound or we use the instance method
        // Actually in V13 AppV2, handler receives (event, form, formData).
        // WE need access to 'this.scene'. 
        // The standard Handler definition in DEFAULT_OPTIONS is static, but we can bind it or use an instance method.
        // Let's switch to instance method in DEFAULT_OPTIONS or manually bind in constructor? 
        // Actually, V13 AppV2 form handler 'this' IS the application instance.

        await this.scene.setFlag("storyteller-cinema", "viewMode", data.viewMode);
        await this.scene.setFlag("storyteller-cinema", "cinematicBg", data.cinematicBg);

        console.log("Storyteller Cinema | Scene Config Saved.");
    }
}
