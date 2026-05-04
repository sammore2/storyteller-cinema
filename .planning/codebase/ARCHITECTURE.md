# Architecture

## Overview
Storyteller Cinema follows an **Event-Driven Singleton** pattern. It hooks into the Foundry VTT rendering and data update loops to transform the standard tactical canvas into a cinematic visual novel interface.

## Core Components

### Entry Point (`src/scripts/main.js`)
- Initializes global singletons.
- Registers module settings and keybindings.
- Orchestrates `libWrapper` patches for core system overrides.
- Sets up primary `Hooks` listeners.

### API Controller (`src/scripts/core/api.js`)
- **Central State Manager**: Manages the `active` state of the cinematic mode.
- **Overlay Manager**: Handles the creation and management of the HTML/CSS widescreen overlay (`storyteller-cinema-overlay`).
- **Vision Override**: Implements the "Disarmament" strategy, bypassing Foundry's lighting and fog systems when cinematic mode is active.
- **Layer Control**: Manages the visibility of native canvas layers (Grid, Walls, Fog, etc.).

### Visual Depth Engine (`src/scripts/core/depth.js`)
- **Parallax/Perspective Scaling**: Calculates token scale based on their Y-coordinate relative to the screen height.
- **Coordinate Transformation**: Handles the math for placing tokens in "Cinematic Position" vs. "Battle Position".

### Skin Manager (`src/scripts/core/skin-manager.js`)
- **Theming**: Manages the loading and application of visual "Skins" (Noir, Cyberpunk, etc.).
- **Asset Injection**: Dynamically updates CSS variables and background textures.

### UI & Configuration (`src/scripts/hooks/ui.js`)
- **HUD Integration**: Injects the cinematic toggle and skin selector into the Foundry VTT UI.
- **Config Sheets**: Extends Scene and Token configuration sheets to add cinematic-specific fields.

## Data Flow
1. **Trigger**: User presses `Shift+Z` or toggles the HUD button.
2. **Flag Update**: `canvas.scene` flag `active` is toggled.
3. **Hook Response**: `updateScene` hook catches the flag change.
4. **Execution**: `StorytellerAPI.toggle()` is called.
5. **UI Update**: CSS classes are applied to `<body>`; PIXI layers are hidden; Background is injected.
6. **Interaction**: Tokens moved in cinematic mode save their `cinematicPos`; moved in normal mode save `battlePos`.

---
*Last updated: 2026-05-04*
