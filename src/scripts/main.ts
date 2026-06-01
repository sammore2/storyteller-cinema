import '../styles/style.scss';
import { StorytellerAPI } from './core/api.js';
import { SkinManager } from './core/skin-manager.js';
import { registerUIHooks } from './hooks/ui.js';
import { registerRenderHooks } from './hooks/render.js';
import { registerChatHooks } from './hooks/chat.js';
import './lib/shim.js'; // Import libWrapper Shim

/**
 * Storyteller Cinema | Main Entry Point (TypeScript)
 */
Hooks.once('init', function () {
  console.log('Storyteller Cinema | Initializing...');

  // Safe fallback for PIXI.Sprite.prototype to prevent errors in third-party modules (e.g. monks-active-tiles)
  const PIXI = (window as any).PIXI;
  if (PIXI && PIXI.Sprite) {
    const proto = PIXI.Sprite.prototype as any;
    const dummyMethods = ['clear', 'beginFill', 'lineStyle', 'drawRect', 'drawRoundedRect', 'drawCircle', 'endFill'];
    for (const method of dummyMethods) {
      if (typeof proto[method] !== 'function') {
        proto[method] = function(this: any) {
          return this;
        };
      }
    }
  }

  // 1. REGISTER SETTINGS
  game.settings.register('storyteller-cinema', 'activeSkin', {
    name: "Active Skin",
    scope: "world",
    config: false,
    type: String,
    default: 'default',
    onChange: (value: string) => {
      if (window.StorytellerCinema?.skins) {
        window.StorytellerCinema.skins.apply(value);
      }
    }
  });




  game.settings.register('storyteller-cinema', 'premiumKey', {
    name: "STORYTELLER_CINEMA.Settings.premiumKey.Name",
    hint: "STORYTELLER_CINEMA.Settings.premiumKey.Hint",
    scope: "world",
    config: true,
    type: String,
    default: "",
    onChange: () => {
      if (window.StorytellerCinema?.skins) {
        window.StorytellerCinema.skins.init();
      }
    }
  });

  game.settings.register('storyteller-cinema', 'customSkins', {
    name: "Custom Skins",
    scope: "world",
    config: false,
    type: Array,
    default: []
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

  game.settings.register('storyteller-cinema', 'activePortraits', {
    name: "Active Portraits",
    scope: "world",
    config: false,
    type: Array,
    default: [],
    onChange: () => {
      if (window.StorytellerCinema) {
        window.StorytellerCinema.refreshPortraits();
      }
    }
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
    onChange: (value: string) => {
      document.documentElement.style.setProperty('--stage-font-family', value);
    }
  });

  game.settings.register('storyteller-cinema', 'stageFontSize', {
    name: "Stage Font Size (px)",
    hint: "The font size for dialogue subtitles.",
    scope: "world",
    config: true,
    type: Number,
    default: 24,
    range: { min: 14, max: 48, step: 2 },
    onChange: (value: number) => {
      document.documentElement.style.setProperty('--stage-font-size', `${value}px`);
    }
  });

  game.settings.register('storyteller-cinema', 'stageActorFontSize', {
    name: "Stage Actor Name Font Size (px)",
    hint: "The font size for the actor's name above the dialogue.",
    scope: "world",
    config: true,
    type: Number,
    default: 28,
    range: { min: 14, max: 60, step: 2 },
    onChange: (value: number) => {
      document.documentElement.style.setProperty('--stage-actor-font-size', `${value}px`);
    }
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
    onChange: (value: string) => {
      document.documentElement.style.setProperty('--stage-actor-font-family', value);
    }
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

// Skin manager init (async) moved to setup hook to avoid blocking init
Hooks.once('setup', async () => {
  if (window.StorytellerCinema?.skins) {
    await window.StorytellerCinema.skins.init();
  }
});

// Patch Drawing.prototype.isVisible ONCE, after Foundry is ready.
// Cannot use libWrapper because Drawing is not exported in a libWrapper-discoverable namespace.
// CONFIG.Drawing.objectClass is the canonical reference to the Drawing class in V13/V14.
Hooks.once('ready', () => {
  const DrawingClass = (CONFIG as any).Drawing?.objectClass;
  if (!DrawingClass) {
    console.warn('Storyteller Cinema | Could not find Drawing class via CONFIG.Drawing.objectClass');
    return;
  }
  const proto = DrawingClass.prototype;
  if (proto._scIsVisiblePatched) return;

  // Walk prototype chain to find where isVisible is actually defined
  let targetProto = proto;
  while (targetProto && !Object.getOwnPropertyDescriptor(targetProto, 'isVisible')) {
    targetProto = Object.getPrototypeOf(targetProto);
  }
  const originalDescriptor = targetProto ? Object.getOwnPropertyDescriptor(targetProto, 'isVisible') : null;

  if (originalDescriptor?.get) {
    Object.defineProperty(proto, 'isVisible', {
      get(this: any) {
        if (window.StorytellerCinema?.active) {
          const showInCinema = this.document?.getFlag?.('storyteller-cinema', 'showInCinema') || false;
          if (!showInCinema) return false;
        }
        return originalDescriptor.get!.call(this);
      },
      configurable: true
    });
    proto._scIsVisiblePatched = true;
    console.log('Storyteller Cinema | Drawing.isVisible patched successfully.');
  } else {
    console.warn('Storyteller Cinema | Could not find isVisible getter on Drawing prototype chain.');
  }
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
    const dimChange = change.flags?.['storyteller-cinema']?.cinematicBgDim;
    if (flagChange !== undefined || dimChange !== undefined) {
      window.StorytellerCinema.toggle(true);
    }
    const dragChange = change.flags?.['storyteller-cinema']?.draggedPositions;
    if (dragChange !== undefined) {
      window.StorytellerCinema.syncDraggedPositions(dragChange);
    }
    window.StorytellerCinema.enforceVision();
  }
});


// updateToken hook removed (2.5D feature abandoned)

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

Hooks.once('ready', () => {
  const fontFamily = game.settings.get('storyteller-cinema', 'stageFontFamily') as string;
  const fontSize = game.settings.get('storyteller-cinema', 'stageFontSize') as number;
  const actorFontFamily = game.settings.get('storyteller-cinema', 'stageActorFontFamily') as string;
  const actorFontSize = game.settings.get('storyteller-cinema', 'stageActorFontSize') as number;
  const idleOpacity = game.settings.get('storyteller-cinema', 'trayOpacity') as number;

  document.documentElement.style.setProperty('--stage-font-family', fontFamily);
  document.documentElement.style.setProperty('--stage-font-size', `${fontSize}px`);
  document.documentElement.style.setProperty('--stage-actor-font-family', actorFontFamily);
  document.documentElement.style.setProperty('--stage-actor-font-size', `${actorFontSize}px`);
  document.documentElement.style.setProperty('--tray-idle-opacity', idleOpacity.toString());
});
