import { a as applyVisualDepth } from "./depth.js";
function createOverlay() {
  if (document.getElementById("storyteller-cinema-overlay")) return;
  const overlay = document.createElement("div");
  overlay.id = "storyteller-cinema-overlay";
  overlay.innerHTML = '<div class="cinematic-bar top"></div><div class="cinematic-bar bottom"></div>';
  document.body.appendChild(overlay);
}
async function ensureGhostMode(targetState, force = false) {
  const currentState = game.settings.get("core", "unconstrainedMovement");
  if (currentState === targetState && !force) return;
  try {
    await game.settings.set("core", "unconstrainedMovement", targetState);
    await new Promise((r) => setTimeout(r, 300));
  } catch (e) {
  }
}
async function silentTeleport(token, pos) {
  const originalWarn = console.warn;
  const originalError = console.error;
  const isPolluted = (...args) => {
    const msg = args.map((a) => {
      if (a instanceof Error) return a.message;
      return (a == null ? void 0 : a.toString()) || "";
    }).join(" ");
    return msg.includes("DatabaseUpdateOperation#teleport");
  };
  console.warn = function(...args) {
    if (isPolluted(...args)) return;
    originalWarn.apply(console, args);
  };
  console.error = function(...args) {
    if (isPolluted(...args)) return;
    originalError.apply(console, args);
  };
  try {
    await token.document.update({ x: pos.x, y: pos.y }, {
      animate: false,
      animation: { duration: 0 },
      teleport: true,
      skippingMemory: true
    });
  } catch (err) {
    originalError.apply(console, ["Storyteller Cinema | Teleport Error:", err]);
  } finally {
    console.warn = originalWarn;
    console.error = originalError;
  }
}
async function toggleCinematicMode(active, options = {}) {
  console.log("Storyteller Cinema | Toggle Called. Target:", active);
  const overlay = document.getElementById("storyteller-cinema-overlay");
  if (active) {
    await ensureGhostMode(true);
    if (overlay) overlay.classList.add("active");
    document.body.classList.add("cinematic-mode");
    if (canvas.tokens) {
      for (const token of canvas.tokens.placeables) {
        const existingBattlePos = token.document.getFlag("storyteller-cinema", "battlePos");
        if (!existingBattlePos) {
          const currentPos = { x: token.document.x, y: token.document.y };
          await token.document.setFlag("storyteller-cinema", "battlePos", currentPos);
        }
        const cinPos = token.document.getFlag("storyteller-cinema", "cinematicPos");
        if (cinPos) {
          await silentTeleport(token, cinPos);
        }
        applyVisualDepth(token);
      }
    }
  } else {
    await ensureGhostMode(true, true);
    if (overlay) overlay.classList.remove("active");
    document.body.classList.remove("cinematic-mode");
    if (canvas.tokens) {
      for (const token of canvas.tokens.placeables) {
        if (token.document) {
          const currentPos = { x: token.document.x, y: token.document.y };
          await token.document.setFlag("storyteller-cinema", "cinematicPos", currentPos);
          const battlePos = token.document.getFlag("storyteller-cinema", "battlePos");
          if (token.mesh) {
            token.mesh.scale.set(token.document.texture.scaleX, token.document.texture.scaleY);
            token.mesh.alpha = token.document.hidden ? 0.5 : 1;
            token.refresh();
          }
          if (battlePos) {
            await silentTeleport(token, battlePos);
          }
        }
      }
    }
    await new Promise((r) => setTimeout(r, 500));
    await ensureGhostMode(false);
  }
}
export {
  createOverlay as c,
  toggleCinematicMode as t
};
//# sourceMappingURL=cinematic.js.map
