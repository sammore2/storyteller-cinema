# Technical Concerns

## 1. Foundry V13 Compatibility (High Priority)
- **PrimaryCanvasGroup Refactor**: The V13 `PrimaryCanvasGroup` uses a `CachedContainer` system that ignores traditional `.visible = false` toggles. This breaks the module's core ability to hide tokens and tiles.
- **Rendering Pipeline**: Direct PIXI stage manipulation is increasingly restricted; hooks like `refreshToken` and `refreshTile` are now necessary to maintain visual consistency.

## 2. Brittle Vision Overrides
- **libWrapper Dependency**: The module relies heavily on `libWrapper` to patch internal Foundry functions like `tokenVision`. If these internal functions are restructured, the module breaks.
- **Race Conditions**: Toggling vision and lighting simultaneously during the cinematic transition often leads to "ghosting" effects or vision not being properly restored.

## 3. UI/UX Consistency
- **Z-Index Conflicts**: The widescreen overlay is an HTML `div`. While it covers the canvas, it can interfere with Foundry's HUD elements (Chat, Sidebars) if not carefully indexed.
- **Widescreen Aspect Ratio**: Fixed heights for cinematic bars (`13vh`) might not scale well on ultra-wide or mobile displays.

## 4. Performance
- **Texture Loading**: Switching between skins triggers heavy PIXI texture loads which can cause momentary stutters on lower-end hardware.
- **Camera Panning**: The `_panCameraToFit` logic is complex and relies on manual coordinate calculation, which is prone to edge-case failures on non-standard scene dimensions.

## 5. Technical Debt
- **Global Namespace**: Reliance on `window.StorytellerCinema` is a legacy pattern; migrating to a proper ESModule singleton managed by a loader would be more robust.
- **Lack of Tests**: Zero automated test coverage makes refactoring the complex PIXI logic dangerous.

---
*Last updated: 2026-05-04*
