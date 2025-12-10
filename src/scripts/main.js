import '../styles/style.scss';
import { registerInitHooks } from './hooks/init.js';
import { registerUIHooks } from './hooks/ui.js';
// import { applyVisualDepth } from './core/depth.js'; // REMOVIDO PARA CLEANUP
import { toggleCinematicMode } from './core/cinematic.js';

// =============================================================================
// Entry Point: Registration
// =============================================================================

registerInitHooks();
registerUIHooks();

// =============================================================================
// Reactive Hooks (Proxy Logic)
// =============================================================================

import { ProxyManager } from './core/proxy.js';

Hooks.on('refreshToken', (token) => {
  // Se estiver em modo cinema, atualiza o proxy correspondente
  if (document.body.classList.contains('cinematic-mode')) {
    ProxyManager.update(token);
  }
});

Hooks.on('canvasReady', async (canvas) => {
  const scene = canvas.scene;
  if (!scene) return;

  const shouldActivate = scene.getFlag('storyteller-cinema', 'viewMode') === 'cinematic';
  if (shouldActivate) {
    // Safe wait loop
    let maxTries = 20;
    while (canvas.tokens?.placeables?.length === 0 && maxTries > 0) {
      await new Promise(r => setTimeout(r, 100));
      maxTries--;
    }
  }
  await toggleCinematicMode(shouldActivate);
});

Hooks.on('updateScene', (scene, data) => {
  // Apenas se for a cena ativa
  if (!canvas.ready || scene.id !== canvas.scene?.id) return;

  // Verifica se a flag de viewMode mudou
  if (data.flags && data.flags['storyteller-cinema'] && data.flags['storyteller-cinema'].viewMode !== undefined) {
    const newMode = data.flags['storyteller-cinema'].viewMode;
    toggleCinematicMode(newMode === 'cinematic');
  }
});

Hooks.on('createToken', (tokenDoc) => {
  if (document.body.classList.contains('cinematic-mode')) {
    setTimeout(() => { if (tokenDoc.object) tokenDoc.object.refresh() }, 100);
  }
});
