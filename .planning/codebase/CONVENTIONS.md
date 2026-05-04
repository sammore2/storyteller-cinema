# Coding Conventions

## General Principles
- **Modularity**: Logic is split into specialized "Core" engines (API, Depth, Skins).
- **Native Interop**: Minimize direct patches; use `Hooks` and `libWrapper` for system compatibility.
- **V13 Compatibility**: Modern JS (ES Modules) is standard.

## Naming Conventions
- **Classes**: `PascalCase` (e.g., `StorytellerAPI`).
- **Methods**: `camelCase` (e.g., `toggleMode()`).
- **Private Methods**: Prefixed with an underscore `_` (e.g., `_createOverlay()`).
- **Variables**: `camelCase`.
- **Constants**: `UPPER_SNAKE_CASE` (rarely used, mostly in configuration).

## Patterns
- **Singleton**: Main logic classes are instantiated once and exposed globally via `window`.
- **Event-Driven**: Most logic is reactive to `Hooks.on('eventName', ...)`.
- **Flag-based State**: Persistent state is stored in Foundry's flag system (`document.setFlag()`).

## Error Handling
- Use `try/catch` around external library interactions (like `libWrapper`).
- Log warnings with the `Storyteller Cinema |` prefix for easier debugging.
- Use optional chaining (`?.`) when accessing global objects like `canvas` or `game`.

## Styling
- Use **Sass (SCSS)** for component-based styling.
- Namespace CSS classes (e.g., `.storyteller-cinema-config`) to avoid conflicts with core Foundry UI.

---
*Last updated: 2026-05-04*
