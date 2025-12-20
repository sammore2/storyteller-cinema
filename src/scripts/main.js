import '../styles/style.scss';
import { toggleCinematicMode, createOverlay } from './core/cinematic.js';
import { applyVisualDepth } from './core/depth.js';
import { registerUIHooks } from './hooks/ui.js';

/* ------------------------------------------------------------------------- */
/* INIT HOOK                                                                 */
/* ------------------------------------------------------------------------- */
Hooks.once('init', async function () {
  console.log('Storyteller Cinema | Initializing...');

  // 1. REGISTER SETTINGS (INLINE to guarantee availability)
  game.settings.register('storyteller-cinema', 'referenceHeight', {
    name: "Reference Height (%)",
    hint: "Percentage of the scene height that the token should occupy when at the front.",
    scope: "world",
    config: true,
    type: Number,
    default: 30, // 30% da tela
    range: { min: 10, max: 100, step: 5 }
  });

  game.settings.register('storyteller-cinema', 'minScale', {
    name: "Min Depth Scale",
    hint: "Scale multiplier at the top of the screen (background).",
    scope: "world",
    config: true,
    type: Number,
    default: 0.5,
    range: { min: 0.1, max: 1.0, step: 0.1 }
  });

  game.settings.register('storyteller-cinema', 'maxScale', {
    name: "Max Depth Scale",
    hint: "Scale multiplier at the bottom of the screen (foreground).",
    scope: "world",
    config: true,
    type: Number,
    default: 1.2,
    range: { min: 1.0, max: 3.0, step: 0.1 }
  });

  // 2. Setup Overlay
  createOverlay();

  // 3. Register UI Logic
  registerUIHooks();

  // 4. Keybindings
  game.keybindings.register('storyteller-cinema', 'toggle-mode', {
    name: "Toggle Cinematic Mode",
    hint: "Switch between Battle Map and Visual Novel views",
    editable: [{ key: "KeyZ", modifiers: ["Shift"] }],
    onDown: () => {
      const isCinematic = document.body.classList.contains('cinematic-mode');
      toggleCinematicMode(!isCinematic);
    },
    restricted: false,
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL
  });
});

/* ------------------------------------------------------------------------- */
/* CANVAS READY                                                              */
/* ------------------------------------------------------------------------- */
Hooks.on('canvasReady', () => {
  const viewMode = canvas.scene.getFlag('storyteller-cinema', 'viewMode');
  const shouldBeCinematic = viewMode === 'cinematic';

  // Use init: true to prevent transition animations if desired, or let it animate.
  // Generally on load we might want instant switch, but toggleCinematicMode handles mechanics.
  toggleCinematicMode(shouldBeCinematic, { init: true });
});

/* ------------------------------------------------------------------------- */
/* UPDATE TOKEN (Reactive Memory + Visual Depth)                             */
/* ------------------------------------------------------------------------- */
Hooks.on('updateToken', (tokenDocument, change, options) => {
  if (!change.x && !change.y) return;
  if (change.flags?.['storyteller-cinema']) return;
  if (options.skippingMemory) return;

  // Simple Try/Catch just for safety
  try {
    if (game.user.isGM || tokenDocument.isOwner) {
      const isCinematic = document.body.classList.contains('cinematic-mode');
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
  if (document.body.classList.contains('cinematic-mode')) {
    applyVisualDepth(token);
  }
});

console.log("Storyteller Cinema | Main Loaded (Inlined)");
