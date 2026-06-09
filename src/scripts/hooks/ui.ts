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

        // Initialize CSS Variables from settings
        const root = document.documentElement;
        root.style.setProperty('--stage-font-family', game.settings.get('storyteller-cinema', 'stageFontFamily') as string);
        root.style.setProperty('--stage-font-size', `${game.settings.get('storyteller-cinema', 'stageFontSize')}px`);
        root.style.setProperty('--stage-actor-font-size', `${game.settings.get('storyteller-cinema', 'stageActorFontSize')}px`);
        root.style.setProperty('--stage-actor-font-family', game.settings.get('storyteller-cinema', 'stageActorFontFamily') as string);
        root.style.setProperty('--tray-idle-opacity', game.settings.get('storyteller-cinema', 'trayOpacity') as string);

        // Render tray immediately
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

        const tabsNav = root.querySelector('.sheet-tabs, nav[data-group="main"], nav[data-group="sheet"]');
        if (!tabsNav) return;

        const flags = (scene.flags?.['storyteller-cinema'] as any) || {};
        const bgValue = flags.cinematicBg || "";
        const viewMode = flags.viewMode || "battlemap";
        const bgDimValue = flags.cinematicBgDim ?? 0;

        // Registrar a aba no sistema de abas nativo da aplicação se ainda não estiver presente
        if (app.options.tabs?.sheet) {
            const hasTab = app.options.tabs.sheet.tabs.some((t: any) => t.id === 'storyteller-cinema');
            if (!hasTab) {
                app.options.tabs.sheet.tabs.push({
                    id: 'storyteller-cinema',
                    icon: 'fas fa-film',
                    label: 'STORYTELLER_CINEMA.Scene.TabName'
                });
            }
        }

        // 1. Adicionar o botão da aba na navegação (se ainda não existir)
        let tabLink = tabsNav.querySelector('a[data-tab="storyteller-cinema"]') as HTMLAnchorElement;
        if (!tabLink) {
            tabLink = document.createElement('a');
            tabLink.className = 'item';
            tabLink.dataset.tab = 'storyteller-cinema';
            tabLink.dataset.group = 'sheet';
            tabLink.innerHTML = `<i class="fas fa-film"></i> ${game.i18n.localize('STORYTELLER_CINEMA.Scene.TabName') || 'STC'}`;
            tabsNav.appendChild(tabLink);
        }

        // 2. Adicionar o container da aba com os campos (se ainda não existir)
        let tabContainer = root.querySelector('.tab[data-tab="storyteller-cinema"]') as HTMLDivElement;
        if (!tabContainer) {
            tabContainer = document.createElement('div');
            tabContainer.className = 'tab';
            tabContainer.dataset.tab = 'storyteller-cinema';
            tabContainer.dataset.group = 'sheet';
            tabContainer.style.padding = '20px 10px 40px 10px'; // Prevenir que o botão de salvar encoste nos inputs

            tabContainer.innerHTML = `
                <div class="form-group">
                    <label>${game.i18n.localize('STORYTELLER_CINEMA.Scene.ViewModeLabel')}</label>
                    <div class="form-fields">
                        <select name="flags.storyteller-cinema.viewMode">
                            <option value="battlemap" ${viewMode === 'battlemap' ? 'selected' : ''}>${game.i18n.localize('STORYTELLER_CINEMA.Scene.ViewModeBattlemap')}</option>
                            <option value="cinematic" ${viewMode === 'cinematic' ? 'selected' : ''}>${game.i18n.localize('STORYTELLER_CINEMA.Scene.ViewModeCinematic')}</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>${game.i18n.localize('STORYTELLER_CINEMA.Scene.BgLabel')}</label>
                    <div class="form-fields">
                        <button type="button" class="file-picker" data-type="imagevideo" data-target="flags.storyteller-cinema.cinematicBg" title="Browse Files" tabindex="-1">
                            <i class="fas fa-file-import fa-fw"></i>
                        </button>
                        <input class="image" type="text" name="flags.storyteller-cinema.cinematicBg" placeholder="Image path..." value="${bgValue}">
                    </div>
                </div>
                <div class="form-group">
                    <label>${game.i18n.localize('STORYTELLER_CINEMA.Scene.BgDimLabel')}</label>
                    <div class="form-fields">
                        <input type="range" name="flags.storyteller-cinema.cinematicBgDim" min="0" max="1" step="0.05" value="${bgDimValue}">
                        <span class="range-value" style="margin-left: 8px; font-weight: bold; color: white;">${Math.round(bgDimValue * 100)}%</span>
                    </div>
                </div>
            `;

            // Colocar a nova aba antes do footer do formulário
            const formFooter = root.querySelector('.form-footer') || root.querySelector('button[type="submit"]')?.parentElement;
            if (formFooter) {
                formFooter.parentNode?.insertBefore(tabContainer, formFooter);
            } else {
                root.appendChild(tabContainer);
            }
        }

        // 3. Registrar o clique de mudança para nossa aba usando a API nativa
        tabLink.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (typeof app.changeTab === 'function') {
                app.changeTab('storyteller-cinema', 'sheet');
            }
        });

        // 4. Listeners dos inputs
        const rangeInput = tabContainer.querySelector("input[name='flags.storyteller-cinema.cinematicBgDim']") as HTMLInputElement;
        const rangeValueSpan = tabContainer.querySelector(".range-value") as HTMLElement;
        if (rangeInput) {
            rangeInput.oninput = () => {
                if (rangeValueSpan) rangeValueSpan.textContent = `${Math.round(Number(rangeInput.value) * 100)}%`;
            };
            rangeInput.onchange = async () => {
                await scene.setFlag('storyteller-cinema', 'cinematicBgDim', Number(rangeInput.value));
            };
        }

        const bgInput = tabContainer.querySelector("input[name='flags.storyteller-cinema.cinematicBg']") as HTMLInputElement;
        if (bgInput) {
            bgInput.onchange = async () => {
                await scene.setFlag('storyteller-cinema', 'cinematicBg', bgInput.value);
            };
        }

        const btn = tabContainer.querySelector("button.file-picker") as HTMLButtonElement;
        if (btn) {
            btn.onclick = (event) => {
                event.preventDefault();
                const FilePickerClass = (foundry as any).applications?.apps?.FilePicker || FilePicker;
                const fp = new FilePickerClass({
                    type: "image",
                    current: bgValue,
                    callback: async (path: string) => {
                        if (bgInput) {
                            bgInput.value = path;
                            bgInput.dispatchEvent(new Event('change', { bubbles: true }));
                        }
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
            label: game.i18n.localize('STORYTELLER_CINEMA.Context.StageActor'),
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
                    ui.notifications.info(game.i18n.localize('STORYTELLER_CINEMA.Notification.ActorAdded'));
                }
            }
        });

        options.push({
            label: game.i18n.localize('STORYTELLER_CINEMA.Context.UnstageActor'),
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
                ui.notifications.info(game.i18n.localize('STORYTELLER_CINEMA.Notification.ActorRemoved'));
            }
        });
    });

    // --- PREMIUM BANNER & PATREON OAUTH ACTIVATION ---
    Hooks.on('renderSettingsConfig', (_app: any, html: any) => {
        let root = html instanceof HTMLElement ? html : html[0];
        if (!(root instanceof HTMLElement)) return;

        // Localizar aba ou seção do Storyteller Cinema
        const stcGroup = root.querySelector('.tab[data-tab="storyteller-cinema"]') || root.querySelector('[data-category="storyteller-cinema"]');
        if (!stcGroup) return;

        // Verificar se o banner já foi renderizado
        if (stcGroup.querySelector('.storyteller-cinema-premium-banner')) return;

        const bannerContainer = document.createElement('div');
        bannerContainer.className = 'storyteller-cinema-premium-banner';
        bannerContainer.style.background = 'url("/modules/storyteller-cinema/assets/premium-banner/premium-banner.png") no-repeat center center';
        bannerContainer.style.backgroundSize = 'cover';
        bannerContainer.style.width = '100%';
        bannerContainer.style.aspectRatio = '10 / 3';
        bannerContainer.style.borderRadius = '5px';
        bannerContainer.style.display = 'flex';
        bannerContainer.style.alignItems = 'flex-end';
        bannerContainer.style.justifyContent = 'flex-start';
        bannerContainer.style.padding = '0 30px 15px 30px';
        bannerContainer.style.marginBottom = '15px';
        bannerContainer.style.position = 'relative';
        bannerContainer.style.boxSizing = 'border-box';

        const patreonBtn = document.createElement('button');
        patreonBtn.type = 'button';
        patreonBtn.className = 'patreon-connect-btn';
        patreonBtn.innerHTML = '<i class="fas fa-key"></i> Gerenciar Premium';
        patreonBtn.style.background = '#e9c46a';
        patreonBtn.style.color = '#121212';
        patreonBtn.style.border = 'none';
        patreonBtn.style.padding = '12px 24px';
        patreonBtn.style.fontSize = '14px';
        patreonBtn.style.fontWeight = 'bold';
        patreonBtn.style.borderRadius = '4px';
        patreonBtn.style.cursor = 'pointer';
        patreonBtn.style.transition = 'background 0.2s, transform 0.1s';
        patreonBtn.style.boxShadow = '0 4px 10px rgba(0,0,0,0.4)';

        patreonBtn.onmouseover = () => { patreonBtn.style.background = '#f4a261'; };
        patreonBtn.onmouseout = () => { patreonBtn.style.background = '#e9c46a'; };
        patreonBtn.onmousedown = () => { patreonBtn.style.transform = 'scale(0.95)'; };
        patreonBtn.onmouseup = () => { patreonBtn.style.transform = 'scale(1)'; };

        patreonBtn.onclick = async (e) => {
            e.preventDefault();
            const { KeyManager } = await import('../apps/key-manager.js');
            new KeyManager().render(true, { focus: true });
        };

        bannerContainer.appendChild(patreonBtn);
        stcGroup.prepend(bannerContainer);
    });

    // --- ECOSYSTEM: recebe templates de módulos externos (ex: journal-css) ---
    const _registeredExternalTemplates: Record<string, any[]> = {};

    Hooks.on('registerStorytellerCinemaTemplates', (data: {
        moduleId: string;
        label: string;
        icon: string;
        templates: { id: string; name: string; moduleId: string; tier: string }[];
    }) => {
        if (!data?.moduleId || !Array.isArray(data.templates)) return;
        _registeredExternalTemplates[data.moduleId] = data.templates;
        (window as any).StorytellerCinema._externalTemplates = _registeredExternalTemplates;
        Hooks.callAll('storyteller-cinema-external-templates-updated', _registeredExternalTemplates);
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
            <div class="custom-skin-select" title="${game.i18n.localize('STORYTELLER_CINEMA.HUD.ChangeSkin')}">
                <span class="current-value">${game.i18n.localize('STORYTELLER_CINEMA.HUD.Loading')}</span>
                <i class="fas fa-chevron-down"></i>
                <ul class="dropdown-options"></ul>
            </div>
            <!-- Obsolete: Director Console entry point removed -->
            <i class="fas fa-cog open-config" title="${game.i18n.localize('STORYTELLER_CINEMA.HUD.OpenSkinStudio')}"></i>
        </div>
    `;

    document.body.appendChild(container);

    const toggleAction = container.querySelector('.hud-toggle-action') as HTMLElement;
    const customSelect = container.querySelector('.custom-skin-select') as HTMLElement;
    const currentValueSpan = customSelect.querySelector('.current-value') as HTMLElement;
    const optionsList = customSelect.querySelector('.dropdown-options') as HTMLElement;
    const configBtn = container.querySelector('.open-config') as HTMLElement;
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
        currentValueSpan.textContent = activeSkin ? activeSkin.name : game.i18n.localize('STORYTELLER_CINEMA.HUD.SelectSkin');

        const packNames: Record<string, string> = {
            'system': 'Skins Padrão',
            'classics': 'Classics Pack',
            'the-umbra': 'The Umbra Pack',
            'cyberpunk-neon': 'Cyberpunk Neon',
            'eldritch-abyss': 'Eldritch Abyss',
            'steampunk-gears': 'Steampunk Gears',
            'custom': 'Customizadas'
        };

        const grouped: Record<string, typeof skins> = {};
        for (const s of skins) {
            let category = 'system';
            if (s.pack) {
                category = s.pack;
            } else if (s.id.startsWith('custom-')) {
                category = 'custom';
            }
            if (!grouped[category]) grouped[category] = [];
            grouped[category].push(s);
        }

        let htmlContent = '';
        for (const [catKey, catSkins] of Object.entries(grouped)) {
            const catName = packNames[catKey] || catKey.charAt(0).toUpperCase() + catKey.slice(1);
            htmlContent += `<li class="dropdown-group-header">${catName}</li>`;
            for (const s of catSkins) {
                htmlContent += `
                    <li data-value="${s.id}" class="dropdown-item ${s.id === activeId ? 'selected' : ''}">${s.name}</li>
                `;
            }
        }
        optionsList.innerHTML = htmlContent;

        optionsList.querySelectorAll('li[data-value]').forEach(li => {
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

    /* Obsolete: Dialogue Console removed
    dialogueBtn.onclick = (e) => {
        e.stopPropagation();
        customSelect.classList.remove('open');
        new DialogueConsole().render(true, { focus: true });
    };
    */

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
