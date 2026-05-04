# Technology Stack

## Core
- **JavaScript (ES Modules)**: Modern module-based architecture.
- **Vite 6**: Build tool and dev server.
- **Svelte 4**: UI framework for configuration and HUD components.
- **Sass (SCSS)**: Preprocessor for styling.
- **Foundry VTT V13**: Target platform for the module.

## Build Pipeline
- **vite build**: Produces production-ready assets in `dist/`.
- **Manual Chunking**: Configured in `vite.config.js` to maintain a mirrored directory structure in `dist/` for core scripts (e.g., `src/scripts/core/depth.js` -> `dist/core/depth.js`).
- **Asset Management**: CSS is bundled into a single `style.css` in `dist/`.

## Development Tools
- **Get Shit Done (GSD)**: Architectural and workflow framework (`get-shit-done-cc`).
- **Git**: Version control.

## Versions
- `storyteller-cinema`: 1.0.4
- `vite`: ^6.0.3
- `svelte`: ^4.2.19
- `sass`: ^1.83.0

---
*Last updated: 2026-05-04*
