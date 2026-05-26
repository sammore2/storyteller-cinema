const { ApplicationV2, HandlebarsApplicationMixin } = (foundry.applications as any).api;

/**
 * Dialogue Console for Storyteller Cinema
 */
export class DialogueConsole extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: "storyteller-cinema-dialogue-console",
        tagName: "form",
        classes: ["storyteller-cinema-app", "dialogue-console-app"],
        window: {
            title: "Cinema Director Console",
            icon: "fas fa-comment-dots",
            resizable: true
        },
        position: {
            width: 400,
            height: "auto"
        }
    };

    static PARTS = {
        form: {
            template: "modules/storyteller-cinema/templates/dialogue-console.hbs"
        }
    };

    private _lastActor: string = "";
    private _lastPortrait: string = "";

    constructor(options: any = {}) {
        super(options);
    }

    async _prepareContext(_options: any) {
        const actors = (game.actors as any)?.map((a: any) => ({
            id: a.id,
            name: a.name,
            img: a.img
        })) || [];

        return {
            lastActor: this._lastActor,
            lastPortrait: this._lastPortrait,
            actors: actors
        };
    }

    _onRender(context: any, options: any) {
        super._onRender(context, options);
        const html = this.element;

        // Quick Cast Selection
        html.querySelectorAll('.actor-item').forEach((item: any) => {
            item.addEventListener('click', (ev: any) => {
                const el = ev.currentTarget;
                const nameInput = html.querySelector('[name="actorName"]') as HTMLInputElement;
                const portraitInput = html.querySelector('[name="portrait"]') as HTMLInputElement;
                
                nameInput.value = el.dataset.name;
                portraitInput.value = el.dataset.img;

                // Visual Feedback
                html.querySelectorAll('.cast-item').forEach((i: any) => i.classList.remove('active'));
                el.classList.add('active');
            });
        });

        // Narrator Toggle
        html.querySelector('.narrator-toggle')?.addEventListener('click', (ev: any) => {
            const el = ev.currentTarget;
            (html.querySelector('[name="actorName"]') as HTMLInputElement).value = "";
            (html.querySelector('[name="portrait"]') as HTMLInputElement).value = "";
            
            html.querySelectorAll('.cast-item').forEach((i: any) => i.classList.remove('active'));
            el.classList.add('active');
        });

        // Send Button
        html.querySelector('.btn-send')?.addEventListener('click', () => this._onSend());
        
        // Clear Button
        html.querySelector('.btn-clear')?.addEventListener('click', () => {
            window.StorytellerCinema.clear();
        });

        // File Picker
        html.querySelector('.file-picker')?.addEventListener('click', (ev: any) => {
            const button = ev.currentTarget;
            const targetName = button.dataset.target;
            const input = html.querySelector(`[name="${targetName}"]`) as HTMLInputElement;

            new FilePicker({
                type: "image",
                current: input.value,
                callback: (path: string) => {
                    input.value = path;
                    this._lastPortrait = path;
                }
            }).browse();
        });

        // Enter Key to Send (Cmd/Ctrl + Enter)
        html.querySelector('textarea[name="message"]')?.addEventListener('keydown', (ev: any) => {
            if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) {
                ev.preventDefault();
                this._onSend();
            }
        });
    }

    private _onSend() {
        const html = this.element;
        const actorName = (html.querySelector('[name="actorName"]') as HTMLInputElement).value;
        const portrait = (html.querySelector('[name="portrait"]') as HTMLInputElement).value;
        const messageInput = html.querySelector('[name="message"]') as HTMLTextAreaElement;
        const message = messageInput.value;

        if (!message) return;

        // Save last values
        this._lastActor = actorName;
        this._lastPortrait = portrait;

        // Send to API
        window.StorytellerCinema.say(actorName, message, {
            portrait: portrait,
            side: 'left'
        });

        // Clear only message
        messageInput.value = "";
        messageInput.focus();
    }
}
