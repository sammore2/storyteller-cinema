export function createOverlay() {
    if (document.getElementById('storyteller-cinema-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'storyteller-cinema-overlay';
    // Barras pretas via CSS apenas
    overlay.innerHTML = '<div class="cinematic-bar top"></div><div class="cinematic-bar bottom"></div>';
    document.body.appendChild(overlay);
}

import { ProxyManager } from './proxy.js';

export async function toggleCinematicMode(active) {
    const overlay = document.getElementById('storyteller-cinema-overlay');

    if (active) {
        if (overlay) overlay.classList.add('active');
        document.body.classList.add('cinematic-mode');
        console.log("Storyteller Cinema | 🟢 Mode ON");

        // Ativa Proxies
        ProxyManager.enable();

    } else {
        if (overlay) overlay.classList.remove('active');
        document.body.classList.remove('cinematic-mode');
        console.log("Storyteller Cinema | 🔴 Mode OFF");

        // Desativa Proxies (Restaura Tokens)
        ProxyManager.disable();
    }

    // Não precisamos mais forçar o refresh do canvas inteiro manualmente
    // pois o ProxyManager já lida com os tokens.
}
