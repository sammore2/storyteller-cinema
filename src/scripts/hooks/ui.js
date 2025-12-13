import { toggleCinematicMode } from '../core/cinematic.js';
import ViewModeSelect from '../../components/ViewModeSelect.svelte';

export function registerUIHooks() {
    Hooks.on('getSceneControlButtons', (controls) => {
        // PROTEÇÃO: Normaliza controls (pode vir como Objeto ou Array)
        const controlList = Array.isArray(controls) ? controls : Object.values(controls);

        const tokenLayer = controlList.find(c => c.name === 'token');
        if (tokenLayer && tokenLayer.tools) {
            tokenLayer.tools.push({
                name: 'cinematic',
                title: 'Modo Cinema 2.5D',
                icon: 'fas fa-film',
                toggle: true,
                active: document.body.classList.contains('cinematic-mode'),
                onClick: async (tog) => await toggleCinematicMode(tog)
            });
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
    // Variável de controle do Debounce (Escopo do Módulo)
    let saveTimeout = null;

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

        // 1. Leitura: Tenta pegar do preview local, senão pega do banco, senão 1.0
        let current = hoverToken._cinemaScalePreview ?? hoverToken.document.getFlag('storyteller-cinema', 'cinematicScale') ?? 1.0;

        // 2. Cálculo com Limites
        let newScale = Math.max(0.1, Math.min(5.0, current + delta));
        newScale = Math.round(newScale * 100) / 100; // Arredonda 2 casas

        // 3. ATUALIZAÇÃO VISUAL INSTANTÂNEA (Sem Banco de Dados)
        hoverToken._cinemaScalePreview = newScale;
        hoverToken.refresh(); // O depth.js vai ler o _cinemaScalePreview agora

        // 4. GRAVAÇÃO NO BANCO (Debounced / Atrasada)
        if (saveTimeout) clearTimeout(saveTimeout);

        saveTimeout = setTimeout(() => {
            // Salva e limpa o preview (pois o banco já terá o valor)
            hoverToken.document.setFlag('storyteller-cinema', 'cinematicScale', newScale).then(() => {
                hoverToken._cinemaScalePreview = null;
            });
            console.log("Storyteller Cinema | Salvo no Banco:", newScale.toFixed(2));
        }, 600); // Espera 600ms de inatividade

    }, { passive: false, capture: true }); // Capture is key to running before Foundry
}

// === HUD BUTTON (Floating Top-Right) ===
function createHUDButton() {
    if (document.getElementById('storyteller-cinema-toggle')) return;

    const btn = document.createElement('div');
    btn.id = 'storyteller-cinema-toggle';
    btn.innerHTML = '<i class="fas fa-film"></i>';
    btn.title = "Alternar Modo Cinema";

    // Initial State
    if (document.body.classList.contains('cinematic-mode')) btn.classList.add('active');

    btn.onclick = async () => {
        const isActive = document.body.classList.contains('cinematic-mode');
        await toggleCinematicMode(!isActive);
        // Visual Feedback immediate
        btn.classList.toggle('active', !isActive);
    };

    document.body.appendChild(btn);
}

// Ensure button exists on load
Hooks.on('ready', createHUDButton);
Hooks.on('canvasReady', createHUDButton);
