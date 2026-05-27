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
        const activePortraits = (game.settings.get('storyteller-cinema', 'activePortraits') as string[]) || [];
        const actors = castIds.map(id => game.actors?.get(id)).filter(a => !!a).map((a: any) => ({
            id: a.id,
            name: a.name,
            img: a.img,
            isActiveOnStage: activePortraits.includes(a.id)
        }));

        return {
            actors: actors,
            active: (game as any).settings.get('storyteller-cinema', 'cinemaModeActive'),
            speakingAsId: this.speakingAs?.id,
            isNarratorActive: activePortraits.includes('narrator'),
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

        // Click on actor -> Toggle active portrait + speakingAs
        html.querySelectorAll('.actor-btn').forEach((btn: any) => {
            btn.addEventListener('click', async (ev: any) => {
                const dataset = ev.currentTarget.dataset;
                const activePortraits = (game.settings.get('storyteller-cinema', 'activePortraits') as string[]) || [];
                
                let newPortraits = [...activePortraits];
                
                if (this.isDirectorMode) {
                    // Director Mode: Click selects speaker, never removes from stage
                    if (this.speakingAs?.id === dataset.id) {
                        this.speakingAs = null;
                    } else {
                        this.speakingAs = { id: dataset.id, name: dataset.name, img: dataset.img };
                        if (!newPortraits.includes(dataset.id)) {
                            newPortraits.push(dataset.id);
                        }
                    }
                } else {
                    // Normal Mode: Click toggles stage presence
                    if (activePortraits.includes(dataset.id)) {
                        newPortraits = activePortraits.filter(id => id !== dataset.id);
                        if (this.speakingAs?.id === dataset.id) {
                            this.speakingAs = null;
                        }
                    } else {
                        newPortraits = [...activePortraits, dataset.id];
                        this.speakingAs = { id: dataset.id, name: dataset.name, img: dataset.img };
                    }
                }

                await game.settings.set('storyteller-cinema', 'activePortraits', newPortraits);
                this.render(); 
            });

            // Right click -> Toggle portrait on stage without changing speakingAs
            btn.addEventListener('contextmenu', async (ev: any) => {
                ev.preventDefault();
                const dataset = ev.currentTarget.dataset;
                const activePortraits = (game.settings.get('storyteller-cinema', 'activePortraits') as string[]) || [];
                
                let newPortraits: string[];
                if (activePortraits.includes(dataset.id)) {
                    newPortraits = activePortraits.filter(id => id !== dataset.id);
                } else {
                    newPortraits = [...activePortraits, dataset.id];
                }

                await game.settings.set('storyteller-cinema', 'activePortraits', newPortraits);
                this.render();
            });
        });

        // Narrator Mode
        const narratorBtn = html.querySelector('.narrator-btn');
        if (narratorBtn) {
            narratorBtn.addEventListener('click', async (ev: any) => {
                ev.preventDefault();
                console.log("Storyteller Cinema | Narrator Clicked");
                const activePortraits = (game.settings.get('storyteller-cinema', 'activePortraits') as string[]) || [];
                
                let newPortraits = [...activePortraits];
                
                if (this.isDirectorMode) {
                    if (this.speakingAs?.id === 'narrator') {
                        this.speakingAs = null;
                    } else {
                        this.speakingAs = { 
                            id: 'narrator', 
                            name: 'Narrator', 
                            img: (game.user as any)?.avatar || 'icons/svg/book.svg' 
                        };
                        if (!newPortraits.includes('narrator')) {
                            newPortraits.push('narrator');
                        }
                    }
                } else {
                    if (activePortraits.includes('narrator')) {
                        newPortraits = activePortraits.filter(id => id !== 'narrator');
                        if (this.speakingAs?.id === 'narrator') {
                            this.speakingAs = null;
                        }
                    } else {
                        newPortraits = [...activePortraits, 'narrator'];
                        this.speakingAs = { 
                            id: 'narrator', 
                            name: 'Narrator', 
                            img: (game.user as any)?.avatar || 'icons/svg/book.svg' 
                        };
                    }
                }

                await game.settings.set('storyteller-cinema', 'activePortraits', newPortraits);
                this.render();
            });

            narratorBtn.addEventListener('contextmenu', async (ev: any) => {
                ev.preventDefault();
                const activePortraits = (game.settings.get('storyteller-cinema', 'activePortraits') as string[]) || [];
                
                let newPortraits: string[];
                if (activePortraits.includes('narrator')) {
                    newPortraits = activePortraits.filter(id => id !== 'narrator');
                } else {
                    newPortraits = [...activePortraits, 'narrator'];
                }

                await game.settings.set('storyteller-cinema', 'activePortraits', newPortraits);
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
                ui.notifications.info(game.i18n.localize(
                    this.isDirectorMode
                        ? 'STORYTELLER_CINEMA.DirectorMode.On'
                        : 'STORYTELLER_CINEMA.DirectorMode.Off'
                ));
                if (!this.isDirectorMode) {
                    (window as any).StorytellerCinema.clearSubtitles();
                }
                this.render();
            });
        }

        // Clear Subtitle & Stage
        const clearBtn = html.querySelector('.clear-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                (window as any).StorytellerCinema.clearSubtitles();
            });

            clearBtn.addEventListener('dblclick', () => {
                (window as any).StorytellerCinema.clear();
            });
        }
    }
}
