import { applyVisualDepth } from './depth.js';

export function createOverlay() {
    if (document.getElementById('storyteller-cinema-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'storyteller-cinema-overlay';
    overlay.innerHTML = '<div class="cinematic-bar top"></div><div class="cinematic-bar bottom"></div>';
    document.body.appendChild(overlay);
}

export async function toggleCinematicMode(active) {
    const overlay = document.getElementById('storyteller-cinema-overlay');

    if (active) {
        // --- ATIVAR ---
        if (overlay) overlay.classList.add('active');
        document.body.classList.add('cinematic-mode');
        console.log("Storyteller Cinema | 🟢 Visual Novel Mode ON");

        // Aplica efeito inicial em todos os tokens
        canvas.tokens.placeables.forEach(token => {
            applyVisualDepth(token);
        });

    } else {
        // --- DESATIVAR (HARD RESET) ---
        if (overlay) overlay.classList.remove('active');
        document.body.classList.remove('cinematic-mode');
        console.log("Storyteller Cinema | 🔴 Visual Novel Mode OFF");

        // Restaura todos os tokens para o estado Original (Battlemap)
        if (canvas.tokens) {
            canvas.tokens.placeables.forEach(token => {
                if (token.mesh && token.document) {
                    // Hard Reset: Volta para os dados do Documento
                    token.mesh.scale.set(token.document.texture.scaleX, token.document.texture.scaleY);

                    // IMPORTANTE: Rotação em Radianos (Foundry DB = Graus, PIXI = Radianos)
                    token.mesh.rotation = Math.toRadians(token.document.rotation);

                    token.mesh.alpha = token.document.hidden ? 0.5 : 1;

                    // Força redesenho para garantir que mudanças de cor/borda voltem
                    token.refresh();
                }
            });
        }
    }
}
