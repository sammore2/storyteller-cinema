/**
 * Cinematic Scene Config Application
 */
// @ts-ignore
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class CinematicSceneConfig extends (HandlebarsApplicationMixin(ApplicationV2) as any) {
    scene: any;

    constructor(options: any = {}) {
        super(options);
        this.scene = options.scene;
    }

    static get DEFAULT_OPTIONS() {
        return {
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
    }

    static get PARTS() {
        return {
            form: {
                template: "modules/storyteller-cinema/templates/cinematic-scene-config.hbs"
            }
        };
    }

    async _prepareContext(_options: any): Promise<any> {
        const flags = (this.scene.flags?.["storyteller-cinema"] as any) || {};

        return {
            viewMode: flags.viewMode || "battlemap",
            cinematicBg: flags.cinematicBg || "",
            viewModes: {
                battlemap: "📍 Battlemap (Tático)",
                cinematic: "🎬 Cinematic (Imersivo)"
            }
        };
    }

    static async submit(this: CinematicSceneConfig, _event: Event, _form: HTMLFormElement, formData: any): Promise<void> {
        const data = formData.object;

        await this.scene.setFlag("storyteller-cinema", "viewMode", data.viewMode);
        await this.scene.setFlag("storyteller-cinema", "cinematicBg", data.cinematicBg);

        console.log("Storyteller Cinema | Scene Config Saved.");
    }
}
