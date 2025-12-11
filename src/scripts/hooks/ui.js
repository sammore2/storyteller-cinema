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

    // --- Interaction: Shift+Wheel SCALING (Hijack Rotation) ---
    window.addEventListener('wheel', (event) => {
        // Only active if Shift is held AND Cinematic Mode is ON
        if (!event.shiftKey || !document.body.classList.contains('cinematic-mode')) return;

        const hoverToken = canvas.tokens?.hover;
        if (!hoverToken) return;

        // STOP EVERYTHING: Prevent Foundry Rotation
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        // Calculate Delta (+/- 0.05)
        const delta = event.deltaY > 0 ? -0.05 : 0.05;

        // Get current flag (default 1.0)
        const currentScale = hoverToken.document.getFlag('storyteller-cinema', 'cinematicScale') || 1.0;

        let newScale = currentScale + delta;
        // Safety Limits (0.1x to 5.0x)
        newScale = Math.max(0.1, Math.min(5.0, newScale));
        // Round to 2 decimals
        newScale = Math.round(newScale * 100) / 100;

        // Update Flag (Async)
        hoverToken.document.setFlag('storyteller-cinema', 'cinematicScale', newScale);

        // Immediate visual feedback (optional, but good)
        // refresh() will allow depth.js to read the new flag (once promise resolves or optimistic)
        // Since setFlag updates document, it triggers visual refresh automatically eventually.

    }, { passive: false, capture: true }); // Capture is key to running before Foundry
}
