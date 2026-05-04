# Directory Structure

## Root
- `dist/`: Compiled production assets (Vite output).
- `src/`: Source files.
- `static/`: Static assets (module.json, etc.).
- `storage/`: Local data/cache (if any).
- `.agent/`: GSD workflow and skill definitions.
- `.planning/`: Project management and architectural documentation.

## Source (`src/`)
- `components/`: Svelte components for complex UI (e.g., `ViewModeSelect.svelte`).
- `scripts/`: Main logic directory.
  - `main.js`: Module entry point.
  - `apps/`: Foundry Application classes (Configuration sheets).
  - `core/`: Fundamental logic engines (API, Depth, Skins).
  - `hooks/`: Lifecycle hook registration and HUD integration.
  - `lib/`: Third-party libraries or shims (e.g., `libWrapper` shim).
- `styles/`: Styling assets.
  - `style.scss`: Primary SCSS file (bundled by Vite).

## Key Locations
- `static/module.json`: Primary manifest for Foundry VTT.
- `src/scripts/main.js`: Initialization sequence.
- `src/scripts/core/api.js`: Core cinematic mode implementation.

---
*Last updated: 2026-05-04*
