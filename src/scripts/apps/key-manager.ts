/**
 * Key Manager Application
 * Handles multiple licensing keys and features a premium packs showcase.
 */
// @ts-ignore
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class KeyManager extends (HandlebarsApplicationMixin(ApplicationV2) as any) {
    private _hookId: number | null = null;

    constructor(options = {}) {
        super(options);
    }

    static get DEFAULT_OPTIONS() {
        return {
            tagName: "form",
            id: "storyteller-cinema-key-manager",
            window: {
                title: "Storyteller's Cinema - Premium Hub",
                icon: "fas fa-key",
                resizable: true,
                width: 650,
                height: 520
            },
            position: {
                width: 650,
                height: 520
            },
            form: {
                handler: KeyManager._onSubmit,
                submitOnChange: false,
                closeOnSubmit: false
            },
            actions: {
                addKey: KeyManager._onAddKey,
                removeKey: KeyManager._onRemoveKey,
                connectPatreon: KeyManager._onConnectPatreon
            }
        };
    }

    static get PARTS() {
        return {
            form: {
                template: "modules/storyteller-cinema/templates/key-manager.hbs"
            }
        };
    }

    async _prepareContext(_options: any): Promise<any> {
        // Puxar chaves configuradas (armazenadas como array ou string separada por vírgulas)
        const premiumKeysSetting = game.settings.get('storyteller-cinema', 'premiumKey') as string || '';
        const keysArray = premiumKeysSetting.split(',').map(k => k.trim()).filter(Boolean);

        // Validar e detalhar as chaves ativas a partir do que o SkinManager carregou
        const activeKeysList = [];
        const unlockedPacks = new Set<string>(['classics']);

        for (const key of keysArray) {
            const isDev = key.startsWith('sammore-dev-') && key.endsWith('5633');
            let tier = "Avulsa/Promocional";
            let typeClass = "promo";

            if (isDev) {
                tier = "Desenvolvedor";
                typeClass = "dev";
                unlockedPacks.add('the-umbra');
            } else if (key.toLowerCase() === 'classics') {
                tier = "Gratuito";
                typeClass = "free";
            } else {
                // Consultar se o Worker/GitHub já salvou informações para essa chave
                try {
                    const res = await fetch(`https://storyteller-cinema-proxy.robsammore.workers.dev/packs?key=${encodeURIComponent(key)}`);
                    if (res.ok) {
                        const data = await res.json();
                        (data.packs || []).forEach((p: string) => unlockedPacks.add(p));
                        
                        // Inferir o tier baseado nos pacotes
                        if (data.packs?.includes('cyberpunk-neon')) {
                            tier = "Patreon Silver";
                            typeClass = "patreon";
                        } else if (data.packs?.includes('the-umbra') && data.packs?.length > 2) {
                            tier = "Patreon Gold";
                            typeClass = "patreon";
                        } else if (data.packs?.includes('the-umbra')) {
                            tier = "Patreon Bronze";
                            typeClass = "patreon";
                        }
                    }
                } catch (_) {
                    tier = "Patreon/Avulsa";
                    typeClass = "patreon";
                }
            }

            activeKeysList.push({
                key,
                tier,
                typeClass
            });
        }

        // Definir a vitrine estática de pacotes premium com banners correspondentes
        const packsShowcase = [
            {
                id: 'the-umbra',
                title: 'Bronze Suporter (The Umbra Pack)',
                description: 'Estética sombria e misteriosa perfeita para crônicas góticas e mistérios arcanos.',
                banner: 'modules/storyteller-cinema/assets/premium-banner/premium-banner.png', // Usando o banner clássico de fundo
                link: 'https://www.patreon.com/c/storyteller_cinema',
                unlocked: unlockedPacks.has('the-umbra')
            },
            {
                id: 'cyberpunk-neon',
                title: 'Silver Suporter (Cyberpunk Neon Pack)',
                description: 'Visuais futuristas vibrantes, luzes de neon e telas de dados de alta tecnologia.',
                banner: 'modules/storyteller-cinema/assets/premium-banner/premium-banner.png',
                link: 'https://www.patreon.com/c/storyteller_cinema',
                unlocked: unlockedPacks.has('cyberpunk-neon')
            },
            {
                id: 'gold-pack',
                title: 'Gold Suporter (Arsenal Cinemático Completo)',
                description: 'Desbloqueia absolutamente todas as skins do acervo, incluindo Steampunk Gears e Eldritch Abyss.',
                banner: 'modules/storyteller-cinema/assets/premium-banner/premium-banner.png',
                link: 'https://www.patreon.com/c/storyteller_cinema',
                unlocked: unlockedPacks.has('eldritch-abyss') || unlockedPacks.has('steampunk-gears')
            }
        ];

        return {
            activeKeys: activeKeysList,
            packs: packsShowcase
        };
    }

    _onRender(_context: any, _options: any): void {
        super._onRender(_context, _options);
        if (!this._hookId) {
            this._hookId = Hooks.on('storyteller-cinema-skins-updated', () => {
                if (this.rendered) this.render();
            });
        }
    }

    static async _onSubmit(_event: any, _form: any, _formData: any) {
        // Sem necessidade de manipulação tradicional de submit
    }

    static async _onAddKey(this: KeyManager, event: Event, _target: HTMLElement) {
        event.preventDefault();
        const container = this.element;
        const input = container.querySelector('.new-key-field') as HTMLInputElement;
        const newKey = input?.value?.trim();

        if (!newKey) {
            ui.notifications?.warn("Storyteller Cinema | Digite uma chave premium para adicionar.");
            return;
        }

        const currentKeysSetting = game.settings.get('storyteller-cinema', 'premiumKey') as string || '';
        const keysList = currentKeysSetting.split(',').map(k => k.trim()).filter(Boolean);

        if (keysList.includes(newKey)) {
            ui.notifications?.info("Storyteller Cinema | Esta chave já está cadastrada.");
            return;
        }

        keysList.push(newKey);
        await game.settings.set('storyteller-cinema', 'premiumKey', keysList.join(','));
        ui.notifications?.info("Storyteller Cinema | Chave adicionada com sucesso!");
        input.value = "";
        
        // Disparar recarga de skins
        if (window.StorytellerCinema?.skins) {
            await window.StorytellerCinema.skins.init();
        }
        this.render();
    }

    static async _onRemoveKey(this: KeyManager, event: Event, _target: HTMLElement) {
        event.preventDefault();
        // @ts-ignore
        const keyToRemove = event.currentTarget?.dataset?.key || _target?.dataset?.key;
        if (!keyToRemove) return;

        const currentKeysSetting = game.settings.get('storyteller-cinema', 'premiumKey') as string || '';
        const keysList = currentKeysSetting.split(',').map(k => k.trim()).filter(Boolean);
        const filteredKeys = keysList.filter(k => k !== keyToRemove);

        await game.settings.set('storyteller-cinema', 'premiumKey', filteredKeys.join(','));
        ui.notifications?.info("Storyteller Cinema | Chave removida.");

        // Disparar recarga de skins
        if (window.StorytellerCinema?.skins) {
            await window.StorytellerCinema.skins.init();
        }
        this.render();
    }

    static _onConnectPatreon(this: KeyManager, event: Event, _target: HTMLElement) {
        event.preventDefault();
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        
        const popup = window.open(
            'https://storyteller-cinema-proxy.robsammore.workers.dev/oauth/login',
            'PatreonLogin',
            `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
        );

        if (popup) {
            const messageListener = async (e: MessageEvent) => {
                if (e.origin !== 'https://storyteller-cinema-proxy.robsammore.workers.dev') return;
                
                if (e.data?.type === 'PATREON_KEY_ACTIVATED' && e.data?.key) {
                    const newKey = e.data.key;
                    const currentKeysSetting = game.settings.get('storyteller-cinema', 'premiumKey') as string || '';
                    const keysList = currentKeysSetting.split(',').map(k => k.trim()).filter(Boolean);

                    if (!keysList.includes(newKey)) {
                        keysList.push(newKey);
                        await game.settings.set('storyteller-cinema', 'premiumKey', keysList.join(','));
                        ui.notifications?.info("Storyteller Cinema | Patreon conectado e chave premium ativada!");
                        
                        if (window.StorytellerCinema?.skins) {
                            await window.StorytellerCinema.skins.init();
                        }
                        this.render();
                    }
                    window.removeEventListener('message', messageListener);
                }
            };
            window.addEventListener('message', messageListener);
        }
    }
}
