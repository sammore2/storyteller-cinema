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
    await token.document.update(pos, {
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
let cinematicContainer = null;
async function setCinematicBackground(active) {
  var _a, _b, _c, _d, _e;
  if (active) {
    const bgPath = canvas.scene.getFlag("storyteller-cinema", "cinematicBg");
    if ((_a = canvas.primary) == null ? void 0 : _a.background) {
      canvas.primary.background.visible = false;
    }
    if (canvas.grid) canvas.grid.visible = false;
    if (canvas.walls) canvas.walls.visible = false;
    if (canvas.templates) canvas.templates.visible = false;
    if (canvas.foreground) canvas.foreground.visible = false;
    if ((_b = canvas.controls) == null ? void 0 : _b.doors) canvas.controls.doors.visible = false;
    if (bgPath) {
      try {
        const tex = await foundry.canvas.loadTexture(bgPath);
        if (!tex) return;
        if (cinematicContainer) {
          if (cinematicContainer.destroyed || cinematicContainer.parent !== canvas.primary) {
            if (!cinematicContainer.destroyed) cinematicContainer.destroy({ children: true });
            cinematicContainer = null;
          }
        }
        if (!cinematicContainer) {
          cinematicContainer = new PIXI.Container();
          cinematicContainer.eventMode = "none";
          const sprite2 = new PIXI.Sprite(tex);
          sprite2.anchor.set(0.5);
          cinematicContainer.addChild(sprite2);
          canvas.primary.addChildAt(cinematicContainer, 0);
        }
        const sprite = cinematicContainer.children[0];
        sprite.texture = tex;
        const rect = canvas.dimensions.sceneRect;
        const scaleW = window.innerWidth / rect.width;
        const scaleH = window.innerHeight / rect.height;
        const cameraScale = Math.min(scaleW, scaleH);
        const visibleWorldWidth = window.innerWidth / cameraScale;
        const visibleWorldHeight = window.innerHeight / cameraScale;
        const cx = rect.x + rect.width / 2;
        const cy = rect.y + rect.height / 2;
        sprite.position.set(cx, cy);
        const targetWidth = Math.max(rect.width, visibleWorldWidth);
        const targetHeight = Math.max(rect.height, visibleWorldHeight);
        const texScaleX = targetWidth / tex.width;
        const texScaleY = targetHeight / tex.height;
        const finalScale = Math.max(texScaleX, texScaleY);
        sprite.scale.set(finalScale);
      } catch (err) {
        console.error("Storyteller Cinema | BG Error:", err);
      }
    }
  } else {
    if ((_c = canvas.primary) == null ? void 0 : _c.background) {
      const hasBgImage = (_d = canvas.scene.background) == null ? void 0 : _d.src;
      const hasTexture = canvas.primary.background.texture;
      if (hasBgImage && hasTexture) {
        canvas.primary.background.visible = true;
      }
    }
    if (canvas.grid) canvas.grid.visible = true;
    if (canvas.walls) canvas.walls.visible = true;
    if (canvas.templates) canvas.templates.visible = true;
    if (canvas.foreground) canvas.foreground.visible = true;
    if ((_e = canvas.controls) == null ? void 0 : _e.doors) canvas.controls.doors.visible = true;
    if (cinematicContainer) {
      cinematicContainer.destroy({ children: true, texture: false });
      cinematicContainer = null;
    }
  }
}
async function toggleCinematicMode(active, options = {}) {
  console.log("Storyteller Cinema | Toggle Called. Target:", active);
  const overlay = document.getElementById("storyteller-cinema-overlay");
  if (active) {
    const battleView = {
      x: canvas.stage.pivot.x,
      y: canvas.stage.pivot.y,
      scale: canvas.stage.scale.x
    };
    canvas.storytellerBattleView = battleView;
    await ensureGhostMode(true);
    await setCinematicBackground(true);
    if (overlay) overlay.classList.add("active");
    document.body.classList.add("cinematic-mode");
    const rect = canvas.dimensions.sceneRect;
    const scaleW = window.innerWidth / rect.width;
    const scaleH = window.innerHeight / rect.height;
    let targetScale = Math.max(scaleW, scaleH);
    const minZ = canvas.minScale || 0.1;
    const maxZ = canvas.maxScale || 3;
    targetScale = Math.max(minZ, Math.min(maxZ, targetScale));
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    await canvas.animatePan({ x: cx, y: cy, scale: targetScale, duration: 800 });
    if (cinematicContainer && cinematicContainer.children[0]) {
      const sprite = cinematicContainer.children[0];
      const tex = sprite.texture;
      const visibleWorldWidth = window.innerWidth / targetScale;
      const visibleWorldHeight = window.innerHeight / targetScale;
      sprite.position.set(cx, cy);
      const targetWidth = Math.max(rect.width, visibleWorldWidth);
      const targetHeight = Math.max(rect.height, visibleWorldHeight);
      const texScaleX = targetWidth / tex.width;
      const texScaleY = targetHeight / tex.height;
      const finalScale = Math.max(texScaleX, texScaleY);
      sprite.scale.set(finalScale);
    }
    if (canvas.tokens) {
      for (const token of canvas.tokens.placeables) {
        const existingBattlePos = token.document.getFlag("storyteller-cinema", "battlePos");
        if (!existingBattlePos) {
          const currentPos = { x: token.document.x, y: token.document.y };
          await token.document.setFlag("storyteller-cinema", "battlePos", currentPos);
        }
        if (token.mesh) token.mesh.alpha = 0;
        const updates = {};
        const cinPos = token.document.getFlag("storyteller-cinema", "cinematicPos");
        if (cinPos) {
          updates.x = cinPos.x;
          updates.y = cinPos.y;
        }
        const cinTexture = token.document.getFlag("storyteller-cinema", "cinematicTexture");
        if (cinTexture) {
          const existingOriginal = token.document.getFlag("storyteller-cinema", "originalTexture");
          if (!existingOriginal) {
            await token.document.setFlag("storyteller-cinema", "originalTexture", token.document.texture.src);
          }
          try {
            await foundry.canvas.loadTexture(cinTexture);
          } catch (e) {
          }
          updates["texture.src"] = cinTexture;
        }
        if (Object.keys(updates).length > 0) {
          await silentTeleport(token, updates);
        }
        applyVisualDepth(token);
        if (token.mesh) {
          const CanvasAnimation = foundry.canvas.animation.CanvasAnimation;
          CanvasAnimation.animate([{ parent: token.mesh, attribute: "alpha", to: 1 }], { duration: 400, name: `FadeIn-${token.id}` });
        }
      }
    }
  } else {
    await ensureGhostMode(false, true);
    await setCinematicBackground(false);
    if (overlay) overlay.classList.remove("active");
    document.body.classList.remove("cinematic-mode");
    if (canvas.storytellerBattleView) {
      const v = canvas.storytellerBattleView;
      await canvas.animatePan({ x: v.x, y: v.y, scale: v.scale, duration: 800 });
      canvas.storytellerBattleView = null;
    }
    if (canvas.tokens) {
      for (const token of canvas.tokens.placeables) {
        if (token.document) {
          const currentPos = { x: token.document.x, y: token.document.y };
          await token.document.setFlag("storyteller-cinema", "cinematicPos", currentPos);
          const battlePos = token.document.getFlag("storyteller-cinema", "battlePos");
          if (token.mesh) {
            token.mesh.alpha = 0;
          }
          const updates = {};
          const originalTexture = token.document.getFlag("storyteller-cinema", "originalTexture");
          if (originalTexture) {
            try {
              await foundry.canvas.loadTexture(originalTexture);
            } catch (e) {
            }
            updates["texture.src"] = originalTexture;
            await token.document.unsetFlag("storyteller-cinema", "originalTexture");
          }
          if (battlePos) {
            updates.x = battlePos.x;
            updates.y = battlePos.y;
          }
          if (Object.keys(updates).length > 0) {
            await silentTeleport(token, updates);
          }
          if (token.mesh) {
            token.mesh.scale.set(token.document.texture.scaleX, token.document.texture.scaleY);
            const targetAlpha = token.document.hidden ? 0.5 : 1;
            const CanvasAnimation = foundry.canvas.animation.CanvasAnimation;
            CanvasAnimation.animate([{ parent: token.mesh, attribute: "alpha", to: targetAlpha }], { duration: 400, name: `FadeOut-${token.id}` });
            token.refresh();
          }
        }
      }
    }
  }
}
export {
  createOverlay as c,
  toggleCinematicMode as t
};
//# sourceMappingURL=cinematic.js.map
