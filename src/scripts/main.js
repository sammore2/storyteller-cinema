import '../styles/style.scss';
import { registerInitHooks } from './hooks/init.js';
import { registerUIHooks } from './hooks/ui.js';
import { applyVisualDepth } from './core/depth.js'; // VOLTOU
import { toggleCinematicMode } from './core/cinematic.js';

// =============================================================================
// Entry Point: Registration
// =============================================================================

registerInitHooks();
registerUIHooks();

// =============================================================================
// Reactive Hooks (Interactive Visual Novel Logic)
// =============================================================================

// Hook principal de atualização visual (Animação/Movimento)
Hooks.on('refreshToken', (token) => {
  // Se estiver em modo cinema, aplica a matemática de profundidade
  if (document.body.classList.contains('cinematic-mode')) {
    applyVisualDepth(token);
  }
});

Hooks.on('canvasReady', async (canvas) => {
  const scene = canvas.scene;
  if (!scene) return;

  const shouldActivate = scene.getFlag('storyteller-cinema', 'viewMode') === 'cinematic';

  // Espera tokens carregarem se necessário
  if (shouldActivate) {
    let maxTries = 20;
    while (canvas.tokens?.placeables?.length === 0 && maxTries > 0) {
      await new Promise(r => setTimeout(r, 100));
      maxTries--;
    }
  }

  await toggleCinematicMode(shouldActivate);
});

Hooks.on('updateScene', (scene, data) => {
  if (!canvas.ready || scene.id !== canvas.scene?.id) return;

  if (data.flags && data.flags['storyteller-cinema'] && data.flags['storyteller-cinema'].viewMode !== undefined) {
    const newMode = data.flags['storyteller-cinema'].viewMode;
    toggleCinematicMode(newMode === 'cinematic');
  }
});

// Suporte a Novos Tokens (Drop)
Hooks.on('createToken', (tokenDoc) => {
  if (document.body.classList.contains('cinematic-mode')) {
    // Dá um tempinho para o objeto ser criado e aplica o visual
    setTimeout(() => {
      if (tokenDoc.object) applyVisualDepth(tokenDoc.object);
    }, 50);
  }
});
// =============================================================================
