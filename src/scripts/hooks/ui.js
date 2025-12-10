import { toggleCinematicMode } from '../core/cinematic.js';
import ViewModeSelect from '../../components/ViewModeSelect.svelte';

export function registerUIHooks() {
    Hooks.on('getSceneControlButtons', (controls) => {
        // PROTEÇÃO: Normaliza controls
        const controlList = Array.isArray(controls) ? controls : Object.values(controls);

        const tokenLayer = controlList.find(c => c.name === 'token');
        if (tokenLayer && tokenLayer.tools) {
            // Evita duplicatas
            if (!tokenLayer.tools.some(t => t.name === 'cinematic')) {
                tokenLayer.tools.push({
                    name: 'cinematic',
                    title: 'Modo Cinema 2.5D',
                    icon: 'fas fa-film',
                    toggle: true,
                    active: document.body.classList.contains('cinematic-mode'),
                    onClick: async (tog) => await toggleCinematicMode(tog)
                });
            }
        }
    });

    Hooks.on('renderSceneConfig', (app, html) => {
        const scene = app.document ?? app.object;
        if (!scene) return;

        // PROTEÇÃO: V12+ usa HTMLElement, V11- usava JQuery
        let root = html;
        if (html.jquery) root = html[0];

        if (!(root instanceof HTMLElement)) return;

        // Procura botão submit de forma nativa e segura
        const submitBtn = root.querySelector('button[type="submit"]');

        if (submitBtn) {
            // Evita injeção duplicada
            if (root.querySelector('.storyteller-cinema-mount')) return;

            const mountPoint = document.createElement('div');
            mountPoint.className = 'form-group storyteller-cinema-mount';
            submitBtn.parentElement.insertBefore(mountPoint, submitBtn); // Insert before submit

            new ViewModeSelect({ target: mountPoint, props: { scene } });
        }
    });
}
