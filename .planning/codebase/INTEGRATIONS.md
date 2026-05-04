# Integrations

## Core System
- **Foundry VTT (V13)**: The primary host environment.
  - **Hooks Engine**: Listens to `init`, `canvasReady`, `updateScene`, `updateToken`, and `refreshToken` to manage state transitions and visual updates.
  - **Data Models**: Interacts with `Scene` and `Token` documents via flags (`storyteller-cinema` namespace) to persist cinematic settings and positions.
  - **Settings API**: Registers global and client-side settings for skins, scaling, and reference heights.
  - **Keybindings API**: Maps `Shift+Z` to toggle Cinematic Mode.

## External Modules
- **libWrapper**: **Required Dependency**. 
  - Used to intercept and modify core Foundry VTT methods without conflicts.
  - **Vision Interception**: Patches `foundry.canvas.groups.CanvasVisibility.prototype.tokenVision` to disable fog/vision during cinematic mode.
  - **Collision Interception**: Patches `foundry.canvas.geometry.ClockwiseSweepPolygon.testCollision` to bypass wall/collision logic when the cinematic view is active.

## Graphics Engine
- **PIXI.js**: The underlying rendering engine for Foundry VTT.
  - **Stage/Container**: Interacts with `canvas.app.stage` and `canvas.interface` to inject background textures and UI overlays.
  - **Sprite Manipulation**: Scales and positions token sprites based on screen coordinates (simulating depth).

---
*Last updated: 2026-05-04*
