import '../styles/style.scss';
import { StorytellerAPI } from './core/api.js';
import { SkinManager } from './core/skin-manager.js';
import { applyVisualDepth } from './core/depth.js';
import { registerUIHooks } from './hooks/ui.js';
import { registerRenderHooks } from './hooks/render.js';
import './lib/shim.js'; // Import libWrapper Shim

/**
 * Storyteller Cinema | Main Entry Point (TypeScript)
 */
Hooks.once('init', async function () {
  console.log('Storyteller Cinema | Initializing...');

  // 1. REGISTER SETTINGS
  game.settings.register('storyteller-cinema', 'activeSkin', {
    name: "Active Skin",
    scope: "client",
    config: false,
    type: String,
    default: 'default',
    onChange: (value: string) => {
      if (window.StorytellerCinema?.skins) {
        window.StorytellerCinema.skins.apply(value);
      }
    }
  });

  game.settings.register('storyteller-cinema', 'customSkins', {
    name: "Custom Skins",
    scope: "client",
    config: false,
    type: Array,
    default: []
  });

  game.settings.register('storyteller-cinema', 'referenceHeight', {
    name: "Reference Height (%)",
    hint: "Token height relative to the screen height.",
    scope: "world",
    config: true,
    type: Number,
    default: 35,
    range: { min: 10, max: 80, step: 5 }
  });

  game.settings.register('storyteller-cinema', 'minScale', {
    name: "Min Depth Scale",
    hint: "Scale multiplier at the top (background).",
    scope: "world",
    config: true,
    type: Number,
    default: 0.5,
    range: { min: 0.1, max: 1.0, step: 0.1 }
  });

  game.settings.register('storyteller-cinema', 'maxScale', {
    name: "Max Depth Scale",
    hint: "Scale multiplier at the bottom (foreground).",
    scope: "world",
    config: true,
    type: Number,
    default: 1.2,
    range: { min: 1.0, max: 3.0, step: 0.1 }
  });

  // INITIALIZE API
  window.StorytellerCinema = new StorytellerAPI();
  window.StorytellerCinema.skins = new SkinManager();

  window.StorytellerCinema.init();
  window.StorytellerCinema.skins.init();

  // LIBWRAPPER HOOKS
  const visTarget = 'foundry.canvas.groups.CanvasVisibility.prototype.tokenVision';
  try {
    libWrapper.register('storyteller-cinema', visTarget, function (this: any, wrapped: Function, ...args: any[]) {
      if (window.StorytellerCinema?.active) return false;
      return wrapped(...args);
    }, 'MIXED');
  } catch (err) {
    console.warn("Storyteller Cinema | Visibility wrapper failed:", err);
  }

  const polygonTarget = 'foundry.canvas.geometry.ClockwiseSweepPolygon.testCollision';
  try {
    libWrapper.register('storyteller-cinema', polygonTarget, function (this: any, wrapped: Function, ...args: any[]) {
      if (window.StorytellerCinema?.active) return false;
      return wrapped(...args);
    }, 'MIXED');
  } catch (err) {
    console.warn("Storyteller Cinema | Polygon wrapper failed:", err);
  }

  // SETUP UI HOOKS
  registerUIHooks();
  registerRenderHooks();

  // KEYBINDINGS
  game.keybindings.register('storyteller-cinema', 'toggle-mode', {
    name: "Toggle Cinematic Mode",
    hint: "Switch view",
    editable: [{ key: "KeyZ", modifiers: ["Shift"] }],
    onDown: () => {
      if (game.user?.isGM) {
        const current = canvas.scene?.getFlag('storyteller-cinema', 'active');
        canvas.scene?.setFlag('storyteller-cinema', 'active', !current);
      }
    },
    restricted: false
  });
});

Hooks.on('canvasReady', () => {
  if (!canvas.scene) return;
  const viewMode = canvas.scene.getFlag('storyteller-cinema', 'viewMode');
  const isActive = canvas.scene.getFlag('storyteller-cinema', 'active') || false;
  const shouldBeCinematic = !!(isActive || viewMode === 'cinematic');

  window.StorytellerCinema.toggle(shouldBeCinematic, { init: true });
});

Hooks.on('updateScene', async (doc: any, change: any) => {
  if (!doc.isView) return;

  const activeChange = change.flags?.['storyteller-cinema']?.active;
  if (activeChange !== undefined) {
    setTimeout(() => {
      window.StorytellerCinema.toggle(activeChange);
    }, 50);
  }

  if (window.StorytellerCinema.active) {
    const flagChange = change.flags?.['storyteller-cinema']?.cinematicBg;
    if (flagChange !== undefined) {
      window.StorytellerCinema.toggle(true);
    }
    window.StorytellerCinema.enforceVision();
  }
});

Hooks.on('updateToken', (tokenDocument: any, change: any, options: any) => {
  if (!change.x && !change.y) return;
  if (change.flags?.['storyteller-cinema']) return;
  if (options.skippingMemory) return;

  if (game.user?.isGM || tokenDocument.isOwner) {
    const isCinematic = window.StorytellerCinema?.active;
    const targetFlag = isCinematic ? 'cinematicPos' : 'battlePos';
    const newPos = { x: change.x ?? tokenDocument.x, y: change.y ?? tokenDocument.y };

    tokenDocument.setFlag('storyteller-cinema', targetFlag, newPos);

    if (isCinematic && tokenDocument.object) {
      applyVisualDepth(tokenDocument.object);
    }
  }
});
