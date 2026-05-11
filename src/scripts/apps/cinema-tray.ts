const { ApplicationV2, HandlebarsApplicationMixin } = (foundry.applications as any).api;

/**
 * Persistent Stage Tray for GM control
 */
export class CinemaTray extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: "storyteller-cinema-tray",
        tag: "div",
        classes: ["storyteller-cinema-tray-app"],
        window: {
            frame: false,
            resizable: false
        },
        position: {
            width: "auto",
            height: "auto"
        }
    };

    static PARTS = {
        tray: {
            template: "modules/storyteller-cinema/templates/cinema-tray.hbs"
        }
    };

    /** @override */
    _insertElement(element: HTMLElement) {
        // EXACT INJECTION LIKE THEATRE INSERTS
        const chatNotifications = document.getElementById("chat-notifications");
        const uiColumn = document.getElementById("ui-right-column-1");
        
        const parent = chatNotifications || uiColumn || document.body;
        parent.appendChild(element);

        // Detect side for CSS projection
        const isLeft = parent.closest("#ui-left") !== null;
        element.setAttribute("data-side", isLeft ? "left" : "right");
    }

    /** The current actor speaking through the tray */
    speakingAs: { id: string, name: string, img: string } | null = null;

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
            speakingAsId: this.speakingAs?.id
        };
    }

    /**
     * Update the visual overlay on the chat input
     */
    updateChatOverlay() {
        let wrapper = document.querySelector('.storyteller-cinema-chat-cover-wrapper');
        if (!wrapper) {
            const chatMessage = document.getElementById("chat-message");
            if (!chatMessage) return;
            
            wrapper = document.createElement('div');
            wrapper.className = 'storyteller-cinema-chat-cover-wrapper';
            wrapper.innerHTML = `
                <div class="storyteller-cinema-chat-cover">
                    <img src="" alt="">
                    <span class="actor-name"></span>
                </div>
            `;
            chatMessage.parentElement?.insertBefore(wrapper, chatMessage);
        }

        const cover = wrapper.querySelector('.storyteller-cinema-chat-cover');
        if (!cover) return;

        if (this.speakingAs) {
            (cover.querySelector('img') as HTMLImageElement).src = this.speakingAs.img;
            (cover.querySelector('.actor-name') as HTMLElement).textContent = this.speakingAs.name;
            cover.classList.add('active');
        } else {
            cover.classList.remove('active');
        }
    }

    _onRender(context: any, options: any) {
        super._onRender(context, options);
        const html = this.element;
        this.updateChatOverlay();

        // Click on actor -> Toggle Speaking As & Open Dialogue Console
        html.querySelectorAll('.actor-btn').forEach((btn: any) => {
            btn.addEventListener('click', (ev: any) => {
                const dataset = ev.currentTarget.dataset;
                
                // Toggle Speaking As
                if (this.speakingAs?.id === dataset.id) {
                    this.speakingAs = null;
                } else {
                    this.speakingAs = { id: dataset.id, name: dataset.name, img: dataset.img };
                }
                
                this.updateChatOverlay();
                this.render(); // Update active state in tray

                const console = (window as any).StorytellerCinema.dialogueConsole;
                if (console) {
                    console.render(true);
                    setTimeout(() => {
                        const consoleHtml = console.element;
                        if (consoleHtml) {
                            (consoleHtml.querySelector('[name="actorName"]') as HTMLInputElement).value = this.speakingAs ? dataset.name : "";
                            (consoleHtml.querySelector('[name="portrait"]') as HTMLInputElement).value = this.speakingAs ? dataset.img : "";
                            consoleHtml.querySelector('[name="message"]')?.focus();
                        }
                    }, 100);
                }
            });


            // Right click -> Just stage them (show portrait)
            btn.addEventListener('contextmenu', (ev: any) => {
                ev.preventDefault();
                const dataset = ev.currentTarget.dataset;
                window.StorytellerCinema.say(dataset.name, "", {
                    portrait: dataset.img,
                    side: 'left'
                });
            });
        });

        // Narrator Mode
        html.querySelector('.narrator-btn')?.addEventListener('click', () => {
            const console = (window as any).StorytellerCinema.dialogueConsole;
            if (console) {
                console.render(true);
                setTimeout(() => {
                    const consoleHtml = console.element;
                    if (consoleHtml) {
                        (consoleHtml.querySelector('[name="actorName"]') as HTMLInputElement).value = "";
                        (consoleHtml.querySelector('[name="portrait"]') as HTMLInputElement).value = "";
                        consoleHtml.querySelector('[name="message"]')?.focus();
                    }
                }, 100);
            }
        });

        // Clear Stage
        html.querySelector('.clear-btn')?.addEventListener('click', () => {
            window.StorytellerCinema.clearCast();
        });
    }
}
