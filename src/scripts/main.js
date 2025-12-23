import '../styles/style.scss';
import { StorytellerAPI } from './core/api.js';
import { applyVisualDepth } from './core/depth.js';
import { registerUIHooks } from './hooks/ui.js';
import './lib/shim.js'; // Import libWrapper Shim

/* ------------------------------------------------------------------------- */
/* INIT HOOK                                                                 */
/* ------------------------------------------------------------------------- */
Hooks.once('init', async function () {
  console.log('Storyteller Cinema | Initializing...');

  // 1. REGISTER SETTINGS (MUST BE FIRST)
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

  // 0. INITIALIZE API
  window.StorytellerCinema = new StorytellerAPI();
  window.StorytellerCinema.init();

  // REGISTER LIBWRAPPER HOOK (Canvas Visibility Override)
  // Target: 'foundry.canvas.groups.CanvasVisibility.prototype.tokenVision' (V13 Namespace)
  // Logic: Use CanvasVisibility to control the global "Active" state of token vision.
  // If we return 'false', the system assumes Token Vision is disabled for the current render frame,
  // showing the full scene (assuming Global Light is active).
  const visTarget = 'foundry.canvas.groups.CanvasVisibility.prototype.tokenVision';

  try {
    libWrapper.register('storyteller-cinema', visTarget, function (wrapped, ...args) {
      if (window.StorytellerCinema?.active) return false;
      return wrapped(...args);
    }, 'MIXED');
    console.log("Storyteller Cinema | Hook registered on", visTarget);
  } catch (err) {
    console.warn("Storyteller Cinema | Failed to register Visibility wrapper:", err);
    // Fallback: Try global 'CanvasVisibility' if namespace fails?
    try {
      libWrapper.register('storyteller-cinema', 'CanvasVisibility.prototype.tokenVision', function (wrapped, ...args) {
        if (window.StorytellerCinema?.active) return false;
        return wrapped(...args);
      }, 'MIXED');
      console.log("Storyteller Cinema | Hook registered on Global CanvasVisibility");
    } catch (e2) {
      console.error("Storyteller Cinema | ALL wrapper attempts failed:", e2);
    }
  }

  // 2. SETUP UI HOOKS
  registerUIHooks();

  // 3. KEYBINDINGS
  game.keybindings.register('storyteller-cinema', 'toggle-mode', {
    name: "Toggle Cinematic Mode",
    hint: "Switch view",
    editable: [{ key: "KeyZ", modifiers: ["Shift"] }],
    onDown: () => {
      if (game.user.isGM) {
        const current = canvas.scene.getFlag('storyteller-cinema', 'active');
        canvas.scene.setFlag('storyteller-cinema', 'active', !current);
      }
    },
    restricted: false
  });

});

/* ------------------------------------------------------------------------- */
/* CANVAS READY                                                              */
/* ------------------------------------------------------------------------- */
Hooks.on('canvasReady', () => {
  // API handles check internal? No, check flag.
  const viewMode = canvas.scene.getFlag('storyteller-cinema', 'viewMode');
  const isActive = canvas.scene.getFlag('storyteller-cinema', 'active') || false;
  const shouldBeCinematic = isActive || viewMode === 'cinematic';

  // Call API
  window.StorytellerCinema.toggle(shouldBeCinematic, { init: true });
});

/* ------------------------------------------------------------------------- */
/* UPDATE SCENE (The Critical Hook)                                          */
/* ------------------------------------------------------------------------- */
Hooks.on('updateScene', async (document, change, options, userId) => {
  if (!document.isView) return;

  const activeChange = change.flags?.['storyteller-cinema']?.active;
  if (activeChange !== undefined) {
    // Stack Delay for Vision Safety
    setTimeout(() => {
      window.StorytellerCinema.toggle(activeChange);
    }, 50);
  }

  // Background Update
  if (window.StorytellerCinema.active) {
    const flagChange = change.flags?.['storyteller-cinema']?.cinematicBg;
    if (flagChange !== undefined) {
      // Re-trigger toggle true to refresh BG
      window.StorytellerCinema.toggle(true);
    }

    // Enforce Vision (Race Condition Guard)
    window.StorytellerCinema.enforceVision();
  }
});


/* ------------------------------------------------------------------------- */
/* UPDATE TOKEN (Reactive Memory + Visual Depth)                             */
/* ------------------------------------------------------------------------- */
Hooks.on('updateToken', (tokenDocument, change, options) => {
  if (!change.x && !change.y) return;
  if (change.flags?.['storyteller-cinema']) return;
  if (options.skippingMemory) return;

  try {
    if (game.user.isGM || tokenDocument.isOwner) {
      const isCinematic = window.StorytellerCinema?.active;
      const targetFlag = isCinematic ? 'cinematicPos' : 'battlePos';
      const newPos = { x: change.x ?? tokenDocument.x, y: change.y ?? tokenDocument.y };

      tokenDocument.setFlag('storyteller-cinema', targetFlag, newPos);

      if (isCinematic && tokenDocument.object) {
        applyVisualDepth(tokenDocument.object);
      }
    }
  } catch (err) {
    console.error("Storyteller Cinema | Update Error:", err);
  }
});

/* ------------------------------------------------------------------------- */
/* REFRESH TOKEN (Visual Lock: Size & Rotation)                              */
/* ------------------------------------------------------------------------- */
Hooks.on('refreshToken', (token) => {
  if (window.StorytellerCinema?.active) {
    applyVisualDepth(token);
  }
});
