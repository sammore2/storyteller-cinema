import { SkinConfig } from '../apps/skin-config.js';
import { DialogueConsole } from '../apps/dialogue-console.js';
import { CinemaTray } from '../apps/cinema-tray.js';

/**
 * UI Hooks Registration for Storyteller Cinema
 */
export function registerUIHooks(): void {
    Hooks.once('ready', () => {
        (window as any).StorytellerCinema.dialogueConsole = new DialogueConsole();
        (window as any).StorytellerCinema.cinemaTray = new CinemaTray();
        
        // Render tray immediately (it's hidden by CSS until cinema-mode is active)
        if (game.user?.isGM) {
            (window as any).StorytellerCinema.cinemaTray.render(true);
        }
    });

    Hooks.on('getSceneControlButtons', (controls: any) => {
        if (!Array.isArray(controls)) return;
        const tokenLayer = controls.find(c => c.name === 'token');
        if (tokenLayer && tokenLayer.tools && game.user?.isGM) {
            tokenLayer.tools.push({
                name: 'cinematic',
                title: 'Storyteller Cinema 2.5D',
                icon: 'fas fa-film',
                toggle: true,
                onClick: async () => {
                    if (!canvas.scene) return;
                    const current = canvas.scene.getFlag('storyteller-cinema', 'active') || false;
                    await canvas.scene.setFlag('storyteller-cinema', 'active', !current);
                }
            });
        }
    });

    Hooks.on('renderSceneConfig', (app: any, html: any) => {
        const scene = app.document ?? app.object;
        if (!scene) return;

        let root = html instanceof HTMLElement ? html : html[0];
        if (!(root instanceof HTMLElement)) return;

        const submitBtn = root.querySelector('button[type="submit"]');

        if (submitBtn) {
            if (root.querySelector('.storyteller-cinema-config')) return;

            const flags = (scene.flags?.['storyteller-cinema'] as any) || {};
            const bgValue = flags.cinematicBg || "";
            const viewMode = flags.viewMode || "battlemap";

            const container = document.createElement('div');
            container.className = 'storyteller-cinema-config';
            container.style.borderTop = "1px solid var(--color-border-light-2)";
            container.style.paddingTop = "10px";
            container.style.marginTop = "10px";

            const appearanceTab = root.querySelector('.tab[data-tab="appearance"]') || root.querySelector('.tab[data-tab="basic"]');
            const targetContainer = appearanceTab || submitBtn.closest('.form-footer')?.previousElementSibling;

            if (!targetContainer) return;

            container.innerHTML = `
                <hr>
                <h3 class="form-header" style="color: white; font-size: 13px;"><i class="fas fa-film"></i> Storyteller Cinema</h3>
                <div class="form-group">
                    <label>Default View Mode</label>
                    <div class="form-fields">
                        <select name="flags.storyteller-cinema.viewMode">
                            <option value="battlemap" ${viewMode === 'battlemap' ? 'selected' : ''}>📍 Battlemap (Tactical)</option>
                            <option value="cinematic" ${viewMode === 'cinematic' ? 'selected' : ''}>🎬 Cinematic (Immersive)</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>Cinematic Background</label>
                    <div class="form-fields">
                        <button type="button" class="file-picker" data-type="imagevideo" data-target="flags.storyteller-cinema.cinematicBg" title="Browse Files" tabindex="-1">
                            <i class="fas fa-file-import fa-fw"></i>
                        </button>
                        <input class="image" type="text" name="flags.storyteller-cinema.cinematicBg" placeholder="Image path..." value="${bgValue}">
                    </div>
                </div>
            `;

            targetContainer.appendChild(container);

            const btn = container.querySelector("button.file-picker") as HTMLButtonElement;
            if (btn) {
                btn.onclick = (event) => {
                    event.preventDefault();
                    const FilePickerClass = (foundry as any).applications?.apps?.FilePicker || FilePicker;
                    const fp = new FilePickerClass({
                        type: "image",
                        current: bgValue,
                        callback: (path: string) => {
                            const input = container.querySelector("input[name='flags.storyteller-cinema.cinematicBg']") as HTMLInputElement;
                            if (input) {
                                input.value = path;
                                input.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                        }
                    });
                    return fp.browse();
                };
            }

            app.setPosition({ height: "auto" });
        }
    });

    // Interaction: Shift+Wheel SCALING
    let saveTimeout: any = null;

    window.addEventListener('wheel', (event: WheelEvent) => {
        if (!event.shiftKey || !document.body.classList.contains('cinematic-mode')) return;

        const hoverToken = canvas.tokens?.hover;
        if (!hoverToken) return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        const delta = event.deltaY > 0 ? -0.05 : 0.05;
        let current = hoverToken._cinemaScalePreview ?? hoverToken.document.getFlag('storyteller-cinema', 'cinematicScale') ?? 1.0;

        let newScale = Math.max(0.1, Math.min(5.0, current + delta));
        newScale = Math.round(newScale * 100) / 100;

        hoverToken._cinemaScalePreview = newScale;
        hoverToken.refresh();

        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            hoverToken.document.setFlag('storyteller-cinema', 'cinematicScale', newScale).then(() => {
                hoverToken._cinemaScalePreview = null;
            });
        }, 600);
    }, { passive: false, capture: true });

    // Token Config Injection
    Hooks.on('renderTokenConfig', (app: any, html: any) => {
        if (!app?.document || !html) return;
        const flags = (app.document.flags?.["storyteller-cinema"] as any) || {};
        const cinematicTexture = flags.cinematicTexture || "";
        let root = html instanceof HTMLElement ? html : html[0];
        const appearanceTab = root.querySelector('.tab[data-tab="appearance"]');
        if (!appearanceTab) return;

        if (appearanceTab.querySelector('input[name="flags.storyteller-cinema.cinematicTexture"]')) return;

        const formGroup = document.createElement("div");
        formGroup.className = "form-group";
        formGroup.innerHTML = `
            <label>Cinematic Portrait <span class="units">(Optional)</span></label>
            <div class="form-fields">
                <button type="button" class="file-picker" data-type="imagevideo" data-target="flags.storyteller-cinema.cinematicTexture" title="Browse Files" tabindex="-1">
                    <i class="fas fa-file-import fa-fw"></i>
                </button>
                <input class="image" type="text" name="flags.storyteller-cinema.cinematicTexture" placeholder="path/to/image.webp" value="${cinematicTexture}">
            </div>
        `;
        appearanceTab.appendChild(formGroup);

        const btn = formGroup.querySelector("button.file-picker") as HTMLButtonElement;
        if (btn) {
            btn.onclick = (event) => {
                event.preventDefault();
                const FilePickerClass = (foundry as any).applications?.apps?.FilePicker || FilePicker;
                const fp = new FilePickerClass({
                    type: "imagevideo",
                    current: cinematicTexture,
                    callback: (path: string) => {
                        (formGroup.querySelector("input") as HTMLInputElement).value = path;
                    }
                });
                return fp.browse();
            };
        }
        app.setPosition({ height: "auto" });
    });

    // Tile Config Injection
    Hooks.on('renderTileConfig', (app: any, html: any) => {
        if (!app?.document || !html) return;
        const flags = (app.document.flags?.["storyteller-cinema"] as any) || {};
        const cinematicTexture = flags.cinematicTexture || "";
        let root = html instanceof HTMLElement ? html : html[0];
        const basicTab = root.querySelector('.tab[data-tab="basic"]');
        if (!basicTab) return;

        if (basicTab.querySelector('input[name="flags.storyteller-cinema.cinematicTexture"]')) return;

        const formGroup = document.createElement("div");
        formGroup.className = "form-group";
        formGroup.innerHTML = `
            <label>Cinematic Portrait <span class="units">(Optional)</span></label>
            <div class="form-fields">
                <button type="button" class="file-picker" data-type="imagevideo" data-target="flags.storyteller-cinema.cinematicTexture" title="Browse Files" tabindex="-1">
                    <i class="fas fa-file-import fa-fw"></i>
                </button>
                <input class="image" type="text" name="flags.storyteller-cinema.cinematicTexture" placeholder="path/to/image.webp" value="${cinematicTexture}">
            </div>
        `;
        basicTab.appendChild(formGroup);

        const btn = formGroup.querySelector("button.file-picker") as HTMLButtonElement;
        if (btn) {
            btn.onclick = (event) => {
                event.preventDefault();
                const FilePickerClass = (foundry as any).applications?.apps?.FilePicker || FilePicker;
                const fp = new FilePickerClass({
                    type: "imagevideo",
                    current: cinematicTexture,
                    callback: (path: string) => {
                        (formGroup.querySelector("input") as HTMLInputElement).value = path;
                    }
                });
                return fp.browse();
            };
        }
        app.setPosition({ height: "auto" });
    });

    // --- CONTEXT MENU: ACTOR DIRECTORY ---
    Hooks.on('getActorContextOptions', (_app: any, options: any[]) => {
        console.log(">>> STORYTELLER CINEMA V14 - CONTEXT MENU HOOK <<<", options);
        
        options.push({
            label: "Cinema: Stage Actor",
            icon: '<i class="fas fa-user-plus"></i>',
            visible: (target: HTMLElement) => {
                const actorId = target.closest('[data-document-id]')?.getAttribute('data-document-id') || target.closest('[data-entry-id]')?.getAttribute('data-entry-id');
                if (!actorId) return false;
                const cast = (game.settings.get('storyteller-cinema', 'sceneCast') as string[]) || [];
                return !cast.includes(actorId);
            },
            onClick: async (_event: PointerEvent, target: HTMLElement) => {
                const actorId = target.closest('[data-document-id]')?.getAttribute('data-document-id') || target.closest('[data-entry-id]')?.getAttribute('data-entry-id');
                if (!actorId) return;
                
                const cast = (game.settings.get('storyteller-cinema', 'sceneCast') as string[]) || [];
                if (!cast.includes(actorId)) {
                    cast.push(actorId);
                    await game.settings.set('storyteller-cinema', 'sceneCast', cast);
                    (window as any).StorytellerCinema.cinemaTray?.render(true);
                    ui.notifications.info(`Actor added to Stage.`);
                }
            }
        });

        options.push({
            label: "Cinema: Unstage Actor",
            icon: '<i class="fas fa-user-minus"></i>',
            visible: (target: HTMLElement) => {
                const actorId = target.closest('[data-document-id]')?.getAttribute('data-document-id') || target.closest('[data-entry-id]')?.getAttribute('data-entry-id');
                if (!actorId) return false;
                const cast = (game.settings.get('storyteller-cinema', 'sceneCast') as string[]) || [];
                return cast.includes(actorId);
            },
            onClick: async (_event: PointerEvent, target: HTMLElement) => {
                const actorId = target.closest('[data-document-id]')?.getAttribute('data-document-id') || target.closest('[data-entry-id]')?.getAttribute('data-entry-id');
                if (!actorId) return;

                const cast = (game.settings.get('storyteller-cinema', 'sceneCast') as string[]) || [];
                const newCast = cast.filter(id => id !== actorId);
                await game.settings.set('storyteller-cinema', 'sceneCast', newCast);
                (window as any).StorytellerCinema.cinemaTray?.render(true);
                ui.notifications.info(`Actor removed from Stage.`);
            }
        });
    });

    // --- CHAT INTEGRATION: SPEAKING AS ---
    Hooks.on('preCreateChatMessage', (document: any, data: any, _options: any, _userId: string) => {
        const tray = (window as any).StorytellerCinema.cinemaTray;
        if (tray?.speakingAs && !data.content.startsWith('/') && !data.rolls?.length) {
            const speaker = {
                actor: tray.speakingAs.id,
                alias: tray.speakingAs.name
            };
            document.updateSource({ speaker });
        }
    });

    // --- SIDEBAR AWARENESS (Handled natively by injection into #chat-notifications) ---


}



/**
 * HUD BUTTON
 */
function createHUDButton(): void {
    if (document.getElementById('storyteller-cinema-toggle')) return;
    if (!game.user?.isGM) return;

    const container = document.createElement('div');
    container.id = 'storyteller-cinema-toggle';
    container.innerHTML = `
        <div class="hud-toggle-action">
            <i class="fas fa-film"></i> 
            <span class="label">Storyteller Cinema</span>
        </div>
        <div class="hud-controls">
            <span class="separator">|</span>
            <div class="custom-skin-select" title="Change Skin">
                <span class="current-value">Loading...</span>
                <i class="fas fa-chevron-down"></i>
                <ul class="dropdown-options"></ul>
            </div>
            <i class="fas fa-comment-dots open-dialogue" title="Open Dialogue Console"></i>
            <i class="fas fa-cog open-config" title="Open Skin Studio"></i>
        </div>
    `;

    document.body.appendChild(container);

    const toggleAction = container.querySelector('.hud-toggle-action') as HTMLElement;
    const customSelect = container.querySelector('.custom-skin-select') as HTMLElement;
    const currentValueSpan = customSelect.querySelector('.current-value') as HTMLElement;
    const optionsList = customSelect.querySelector('.dropdown-options') as HTMLElement;
    const configBtn = container.querySelector('.open-config') as HTMLElement;
    const dialogueBtn = container.querySelector('.open-dialogue') as HTMLElement;
    const controls = container.querySelector('.hud-controls') as HTMLElement;

    toggleAction.onclick = async (e) => {
        e.stopPropagation();
        customSelect.classList.remove('open');
        if (!canvas.scene) return;
        const current = canvas.scene.getFlag('storyteller-cinema', 'active') || false;
        await canvas.scene.setFlag('storyteller-cinema', 'active', !current);
    };

    const updateHUDVisibility = () => {
        const isActive = document.body.classList.contains('cinematic-mode');
        container.classList.toggle('active', isActive);
        controls.style.display = isActive ? 'flex' : 'none';
        if (!isActive) customSelect.classList.remove('open');
    };

    updateHUDVisibility();

    const populateSkins = () => {
        const skins = window.StorytellerCinema?.skins?.getSkins() || [];
        const activeId = window.StorytellerCinema?.skins?.activeSkin || 'default';
        const activeSkin = skins.find(s => s.id === activeId);
        currentValueSpan.textContent = activeSkin ? activeSkin.name : 'Select Skin';

        optionsList.innerHTML = skins.map(s => `
            <li data-value="${s.id}" class="${s.id === activeId ? 'selected' : ''}">${s.name}</li>
        `).join('');

        optionsList.querySelectorAll('li').forEach(li => {
            (li as HTMLElement).onclick = (e) => {
                e.stopPropagation();
                const skinId = (li as HTMLElement).dataset.value!;
                customSelect.classList.remove('open');
                currentValueSpan.textContent = li.textContent!.trim();
                window.StorytellerCinema.skins?.apply(skinId);
            };
        });
    };

    if (window.StorytellerCinema?.skins) populateSkins();
    else setTimeout(populateSkins, 500);

    customSelect.onclick = (e) => {
        e.stopPropagation();
        customSelect.classList.toggle('open');
    };

    document.addEventListener('click', (e) => {
        if (!customSelect.contains(e.target as Node)) {
            customSelect.classList.remove('open');
        }
    });

    configBtn.onclick = (e) => {
        e.stopPropagation();
        customSelect.classList.remove('open');
        new SkinConfig().render(true, { focus: true });
    };

    dialogueBtn.onclick = (e) => {
        e.stopPropagation();
        customSelect.classList.remove('open');
        new DialogueConsole().render(true, { focus: true });
    };

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === "class") updateHUDVisibility();
        });
    });
    observer.observe(document.body, { attributes: true });

    Hooks.on('storyteller-cinema-skins-updated', populateSkins);
}

Hooks.on('ready', createHUDButton);
Hooks.on('canvasReady', createHUDButton);
