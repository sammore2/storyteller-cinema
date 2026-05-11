import '../styles/style.scss';
import { StorytellerAPI } from './core/api.js';
import { SkinManager } from './core/skin-manager.js';
import { applyVisualDepth } from './core/depth.js';
import { registerUIHooks } from './hooks/ui.js';
import { registerRenderHooks } from './hooks/render.js';
import { registerChatHooks } from './hooks/chat.js';
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

  game.settings.register('storyteller-cinema', 'cinemaModeActive', {
    name: "Cinema Mode Active",
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });

  game.settings.register('storyteller-cinema', 'sceneCast', {
    name: "Scene Cast",
    scope: "world",
    config: false,
    type: Array,
    default: []
  });

  game.settings.register('storyteller-cinema', 'stageFontFamily', {
    name: "Stage Font Family",
    hint: "The font family used for dialogue subtitles on the stage.",
    scope: "world",
    config: true,
    type: String,
    default: 'Inter',
    choices: {
      'Inter': 'Inter (Modern Sans)',
      'Roboto': 'Roboto (Clean Sans)',
      'Outfit': 'Outfit (Geometric)',
      'Merriweather': 'Merriweather (Classic Serif)',
      'Courier Prime': 'Courier Prime (Typewriter)'
    },
    onChange: () => window.location.reload()
  });

  game.settings.register('storyteller-cinema', 'stageFontSize', {
    name: "Stage Font Size (px)",
    hint: "The font size for dialogue subtitles.",
    scope: "world",
    config: true,
    type: Number,
    default: 24,
    range: { min: 14, max: 48, step: 2 },
    onChange: () => window.location.reload()
  });

  game.settings.register('storyteller-cinema', 'stageActorFontSize', {
    name: "Stage Actor Name Font Size (px)",
    hint: "The font size for the actor's name above the dialogue.",
    scope: "world",
    config: true,
    type: Number,
    default: 28,
    range: { min: 14, max: 60, step: 2 },
    onChange: () => window.location.reload()
  });

  game.settings.register('storyteller-cinema', 'stageActorFontFamily', {
    name: "Stage Actor Font Family",
    hint: "The font family used for the character's name.",
    scope: "world",
    config: true,
    type: String,
    default: 'Merriweather',
    choices: {
      'Inter': 'Inter (Modern Sans)',
      'Roboto': 'Roboto (Clean Sans)',
      'Outfit': 'Outfit (Geometric)',
      'Merriweather': 'Merriweather (Classic Serif)',
      'Courier Prime': 'Courier Prime (Typewriter)'
    },
    onChange: () => window.location.reload()
  });

  game.settings.register('storyteller-cinema', 'trayOpacity', {
    name: "Tray Idle Opacity",
    hint: "Opacity of the Stage Tray when not hovered.",
    scope: "client",
    config: true,
    type: Number,
    default: 0.4,
    range: { min: 0.1, max: 1.0, step: 0.1 },
    onChange: (value: number) => {
        document.documentElement.style.setProperty('--tray-idle-opacity', value.toString());
    }
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
  registerChatHooks();

  // Re-render tray if actors change
  Hooks.on('updateActor', (actor: any) => {
    const tray = (window as any).StorytellerCinema.cinemaTray;
    if (tray) {
        const castIds = (game.settings.get('storyteller-cinema', 'sceneCast') as string[]) || [];
        if (castIds.includes(actor.id)) {
            tray.render();
        }
    }
  });

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

Hooks.once('socketlib.ready', () => {
  const socket = (window as any).socketlib?.registerModule('storyteller-cinema');
  if (socket) {
    socket.register('showSubtitle', (actorName: string, message: string, options: any) => {
      window.StorytellerCinema._showSubtitleLocal(actorName, message, options);
    });
    socket.register('clearSubtitle', () => {
      window.StorytellerCinema._clearLocal();
    });
    (game as any).modules.get('storyteller-cinema').socket = socket;
  } else {
    console.warn("Storyteller Cinema | Socketlib registration failed. Broadcast features will be disabled.");
  }
});
