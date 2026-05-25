const { ApplicationV2, HandlebarsApplicationMixin } = (foundry.applications as any).api;

/**
 * Persistent Stage Tray for GM control
 */
export class CinemaTray extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: "storyteller-cinema-tray",
        tagName: "div",
        classes: ["storyteller-cinema-tray-app"],
        window: {
            frame: false,
            resizable: false
        },
        position: {
            width: "auto",
            height: "auto",
            top: 100,
            left: 100
        }
    };

    static PARTS = {
        tray: {
            template: "modules/storyteller-cinema/templates/cinema-tray.hbs"
        }
    };



    /** The current actor speaking through the tray */
    speakingAs: { id: string, name: string, img: string } | null = null;
    
    /** Whether chat messages are intercepted as subtitles */
    isDirectorMode: boolean = false;

    async _prepareContext(_options: any) {
        const castIds = (game.settings.get('storyteller-cinema', 'sceneCast') as string[]) || [];
        const actors = castIds.map(id => game.actors?.get(id)).filter(a => !!a).map((a: any) => ({
            id: a.id,
            name: a.name,
            img: a.img
        }));

        return {
            actors: actors,
            active: (game as any).settings.get('storyteller-cinema', 'cinemaModeActive'),
            speakingAsId: this.speakingAs?.id,
            directorMode: this.isDirectorMode
        };
    }

    /**
     * Update the visual overlay on the chat input
     */
    updateChatOverlay() {
        // REMOVED: Redundant and overlapping with the new giant tray
    }

    _onRender(context: any, options: any) {
        super._onRender(context, options);
        const html = this.element;

        // Make the whole div movable (V14 namespaced Draggable)
        const DraggableClass = (foundry.applications.ux as any).Draggable;
        new DraggableClass(this, html, html, false);

        // Click on actor -> Toggle Speaking As
        html.querySelectorAll('.actor-btn').forEach((btn: any) => {
            btn.addEventListener('click', (ev: any) => {
                const dataset = ev.currentTarget.dataset;
                
                if (this.speakingAs?.id === dataset.id) {
                    this.speakingAs = null;
                    (window as any).StorytellerCinema.clear();
                } else {
                    this.speakingAs = { id: dataset.id, name: dataset.name, img: dataset.img };
                    // Activate Stage Instantly
                    (window as any).StorytellerCinema.say(dataset.name, "", {
                        portrait: dataset.img,
                        side: 'left'
                    });
                }
                
                this.render(); 
            });

            // Right click -> Show portrait without text
            btn.addEventListener('contextmenu', (ev: any) => {
                ev.preventDefault();
                const dataset = ev.currentTarget.dataset;
                (window as any).StorytellerCinema.say(dataset.name, "", {
                    portrait: dataset.img,
                    side: 'left'
                });
            });
        });

        // Narrator Mode
        const narratorBtn = html.querySelector('.narrator-btn');
        if (narratorBtn) {
            narratorBtn.addEventListener('click', (ev: any) => {
                ev.preventDefault();
                console.log("Storyteller Cinema | Narrator Clicked");
                if (this.speakingAs?.id === 'narrator') {
                    this.speakingAs = null;
                    (window as any).StorytellerCinema.clear();
                } else {
                    this.speakingAs = { 
                        id: 'narrator', 
                        name: 'Narrator', 
                        img: (game.user as any).avatar || 'icons/svg/book.svg' 
                    };
                    // Activate Stage Instantly for Narrator
                    (window as any).StorytellerCinema.say("Narrator", "", {
                        portrait: this.speakingAs.img,
                        side: 'left'
                    });
                }
                this.render();
            });
        }

        // Director Mode Toggle
        const directorBtn = html.querySelector('.director-mode-btn');
        if (directorBtn) {
            directorBtn.addEventListener('click', (ev: any) => {
                ev.preventDefault();
                this.isDirectorMode = !this.isDirectorMode;
                console.log("Storyteller Cinema | Director Mode:", this.isDirectorMode);
                ui.notifications.info(`Director Mode is now ${this.isDirectorMode ? 'ON' : 'OFF'}`);
                this.render();
            });
        }

        // Clear Subtitle & Stage
        const clearBtn = html.querySelector('.clear-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                (window as any).StorytellerCinema.clear();
            });

            clearBtn.addEventListener('dblclick', () => {
                (window as any).StorytellerCinema.clearCast();
            });
        }
    }
}
