import { createOverlay } from '../core/cinematic.js';

export function registerInitHooks() {
    Hooks.once('init', () => {
        console.log('Storyteller Cinema | 🎬 Initializing (MODE: V11 MODULAR - STABILITY)...');

        createOverlay();

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

    }); // Fecha o Hooks.once('init')

    Hooks.once('ready', () => {
        createOverlay();
    });
}
