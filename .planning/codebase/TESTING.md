# Testing Practices

## Automated Testing
- **Current State**: No automated unit or integration tests are currently implemented in the repository.
- **Tools Available**: The project uses `Vite`, which is compatible with `Vitest`, though it is not yet configured.

## Manual Verification (UAT)
- **Environment**: Testing must be performed within a running Foundry VTT instance.
- **Workflow**:
  1. `npm run build` to compile changes.
  2. Refresh the browser in Foundry.
  3. Toggle Cinematic Mode via `Shift+Z`.
  4. Verify occlusion of tokens, tiles, and grid.
  5. Verify camera zoom and pan behavior.
  6. Test on both GM and Player views (for vision/flag persistence).

## Recommended Improvements
- Implement `Vitest` for core logic testing (Scaling math, flag parsing).
- Add a mock Foundry environment for CI/CD validation.

---
*Last updated: 2026-05-04*
