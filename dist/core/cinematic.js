import { a as applyVisualDepth } from "./depth.js";
function createOverlay() {
  if (document.getElementById("storyteller-cinema-overlay")) return;
  const overlay = document.createElement("div");
  overlay.id = "storyteller-cinema-overlay";
  overlay.innerHTML = '<div class="cinematic-bar top"></div><div class="cinematic-bar bottom"></div>';
  document.body.appendChild(overlay);
}
async function setGhostMode(active) {
  let toolFound = false;
  const allPossibleButtons = Array.from(document.querySelectorAll(".control-tool, button, .fas.fa-ghost"));
  const ghostBtn = allPossibleButtons.find((el) => {
    const target = el.tagName === "I" ? el.closest("li, button") : el;
    if (!target) return false;
    const textToCheck = ((target.dataset.tooltip || "") + (target.title || "") + (target.getAttribute("aria-label") || "")).toLowerCase();
    return target.dataset.tool === "noclip" || target.querySelector(".fa-ghost") || textToCheck.includes("irrestrito") || textToCheck.includes("unrestricted") || textToCheck.includes("ghost");
  });
  let isVisuallyActive = false;
  let clickTarget = null;
  if (ghostBtn) {
    clickTarget = ghostBtn.tagName === "I" ? ghostBtn.closest("li, button") : ghostBtn;
    if (clickTarget) {
      isVisuallyActive = clickTarget.classList.contains("active");
    }
  }
  console.log("Storyteller Cinema | Ghost Mode Target:", active, "| Visual State:", isVisuallyActive);
  if (isVisuallyActive === active) {
    console.log("Storyteller Cinema | Ghost Mode already in target state.");
    return;
  }
  try {
    if (ui.controls && ui.controls.controls) {
      const controlList = Array.isArray(ui.controls.controls) ? ui.controls.controls : Object.values(ui.controls.controls);
      const tokenLayer = controlList.find((c) => c.name === "token" || c.name === "tokens");
      if (tokenLayer && tokenLayer.tools) {
        const toolsList = Array.isArray(tokenLayer.tools) ? tokenLayer.tools : Object.values(tokenLayer.tools);
        const noclipTool = toolsList.find(
          (t) => ["noclip", "bypass", "ghost", "unrestricted"].includes(t.name) || t.icon && t.icon.includes("fa-ghost") || t.title && (t.title.toLowerCase().includes("irrestrito") || t.title.toLowerCase().includes("unrestricted"))
        );
        if (noclipTool) {
          console.log("Storyteller Cinema | API Tool Found:", noclipTool.name);
          if (typeof noclipTool.onClick === "function") {
            noclipTool.onClick();
          } else {
            noclipTool.active = active;
          }
          ui.controls.render();
          toolFound = true;
        }
      }
    }
  } catch (err) {
    console.error("Storyteller Cinema | API Toggle Error:", err);
  }
  if (!toolFound && clickTarget) {
    console.log("Storyteller Cinema | Clicking Ghost Button via DOM");
    clickTarget.click();
  }
  await new Promise((resolve) => setTimeout(resolve, 50));
}
async function toggleCinematicMode(active) {
  console.log("Storyteller Cinema | Toggle Called. Active:", active);
  const overlay = document.getElementById("storyteller-cinema-overlay");
  if (active) {
    await setGhostMode(true);
    if (overlay) overlay.classList.add("active");
    document.body.classList.add("cinematic-mode");
    console.log("Storyteller Cinema | 🟢 Visual Novel Mode ON");
    if (canvas.tokens) {
      for (const token of canvas.tokens.placeables) {
        await token.document.setFlag("storyteller-cinema", "battlePos", { x: token.document.x, y: token.document.y });
        const cinPos = token.document.getFlag("storyteller-cinema", "cinematicPos");
        if (cinPos) {
          await token.document.update({ x: cinPos.x, y: cinPos.y }, { animate: false });
        }
        applyVisualDepth(token);
      }
    }
  } else {
    if (overlay) overlay.classList.remove("active");
    document.body.classList.remove("cinematic-mode");
    console.log("Storyteller Cinema | 🔴 Visual Novel Mode OFF");
    if (canvas.tokens) {
      for (const token of canvas.tokens.placeables) {
        if (token.document) {
          await token.document.setFlag("storyteller-cinema", "cinematicPos", { x: token.document.x, y: token.document.y });
          const battlePos = token.document.getFlag("storyteller-cinema", "battlePos");
          if (token.mesh) {
            token.mesh.scale.set(token.document.texture.scaleX, token.document.texture.scaleY);
            token.mesh.rotation = Math.toRadians(token.document.rotation);
            token.mesh.alpha = token.document.hidden ? 0.5 : 1;
            token.refresh();
          }
          if (battlePos) {
            await token.document.update({ x: battlePos.x, y: battlePos.y }, { animate: false });
          }
        }
      }
    }
    await setGhostMode(false);
  }
  console.log("Storyteller Cinema | Automation Check Complete");
}
export {
  createOverlay as c,
  toggleCinematicMode as t
};
//# sourceMappingURL=cinematic.js.map
