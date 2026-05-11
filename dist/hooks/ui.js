import { S as SkinConfig } from "../apps/skin-config.js";
import { D as DialogueConsole } from "../apps/dialogue-console.js";
import { C as CinemaTray } from "../apps/cinema-tray.js";
function registerUIHooks() {
  Hooks.once("ready", () => {
    var _a;
    window.StorytellerCinema.dialogueConsole = new DialogueConsole();
    window.StorytellerCinema.cinemaTray = new CinemaTray();
    if ((_a = game.user) == null ? void 0 : _a.isGM) {
      window.StorytellerCinema.cinemaTray.render(true);
    }
  });
  Hooks.on("getSceneControlButtons", (controls) => {
    var _a;
    if (!Array.isArray(controls)) return;
    const tokenLayer = controls.find((c) => c.name === "token");
    if (tokenLayer && tokenLayer.tools && ((_a = game.user) == null ? void 0 : _a.isGM)) {
      tokenLayer.tools.push({
        name: "cinematic",
        title: "Storyteller Cinema 2.5D",
        icon: "fas fa-film",
        toggle: true,
        onClick: async () => {
          if (!canvas.scene) return;
          const current = canvas.scene.getFlag("storyteller-cinema", "active") || false;
          await canvas.scene.setFlag("storyteller-cinema", "active", !current);
        }
      });
    }
  });
  Hooks.on("renderSceneConfig", (app, html) => {
    var _a, _b;
    const scene = app.document ?? app.object;
    if (!scene) return;
    let root = html instanceof HTMLElement ? html : html[0];
    if (!(root instanceof HTMLElement)) return;
    const submitBtn = root.querySelector('button[type="submit"]');
    if (submitBtn) {
      if (root.querySelector(".storyteller-cinema-config")) return;
      const flags = ((_a = scene.flags) == null ? void 0 : _a["storyteller-cinema"]) || {};
      const bgValue = flags.cinematicBg || "";
      const viewMode = flags.viewMode || "battlemap";
      const container = document.createElement("div");
      container.className = "storyteller-cinema-config";
      container.style.borderTop = "1px solid var(--color-border-light-2)";
      container.style.paddingTop = "10px";
      container.style.marginTop = "10px";
      const appearanceTab = root.querySelector('.tab[data-tab="appearance"]') || root.querySelector('.tab[data-tab="basic"]');
      const targetContainer = appearanceTab || ((_b = submitBtn.closest(".form-footer")) == null ? void 0 : _b.previousElementSibling);
      if (!targetContainer) return;
      container.innerHTML = `
                <hr>
                <h3 class="form-header" style="color: white; font-size: 13px;"><i class="fas fa-film"></i> Storyteller Cinema</h3>
                <div class="form-group">
                    <label>Default View Mode</label>
                    <div class="form-fields">
                        <select name="flags.storyteller-cinema.viewMode">
                            <option value="battlemap" ${viewMode === "battlemap" ? "selected" : ""}>📍 Battlemap (Tactical)</option>
                            <option value="cinematic" ${viewMode === "cinematic" ? "selected" : ""}>🎬 Cinematic (Immersive)</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>Cinematic Background</label>
                    <div class="form-fields">
                        <button type="button" class="file-picker" data-type="imagevideo" data-target="flags.storyteller-cinema.cinematicBg" title="Browse Files" tabindex="-1">
                            <i class="fas fa-file-import fa-fw"></i>
                        </button>
                        <input class="image" type="text" name="flags.storyteller-cinema.cinematicBg" placeholder="Image path..." value="${bgValue}">
                    </div>
                </div>
            `;
      targetContainer.appendChild(container);
      const btn = container.querySelector("button.file-picker");
      if (btn) {
        btn.onclick = (event) => {
          var _a2, _b2;
          event.preventDefault();
          const FilePickerClass = ((_b2 = (_a2 = foundry.applications) == null ? void 0 : _a2.apps) == null ? void 0 : _b2.FilePicker) || FilePicker;
          const fp = new FilePickerClass({
            type: "image",
            current: bgValue,
            callback: (path) => {
              const input = container.querySelector("input[name='flags.storyteller-cinema.cinematicBg']");
              if (input) {
                input.value = path;
                input.dispatchEvent(new Event("change", { bubbles: true }));
              }
            }
          });
          return fp.browse();
        };
      }
      app.setPosition({ height: "auto" });
    }
  });
  let saveTimeout = null;
  window.addEventListener("wheel", (event) => {
    var _a;
    if (!event.shiftKey || !document.body.classList.contains("cinematic-mode")) return;
    const hoverToken = (_a = canvas.tokens) == null ? void 0 : _a.hover;
    if (!hoverToken) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const delta = event.deltaY > 0 ? -0.05 : 0.05;
    let current = hoverToken._cinemaScalePreview ?? hoverToken.document.getFlag("storyteller-cinema", "cinematicScale") ?? 1;
    let newScale = Math.max(0.1, Math.min(5, current + delta));
    newScale = Math.round(newScale * 100) / 100;
    hoverToken._cinemaScalePreview = newScale;
    hoverToken.refresh();
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      hoverToken.document.setFlag("storyteller-cinema", "cinematicScale", newScale).then(() => {
        hoverToken._cinemaScalePreview = null;
      });
    }, 600);
  }, { passive: false, capture: true });
  Hooks.on("renderTokenConfig", (app, html) => {
    var _a;
    if (!(app == null ? void 0 : app.document) || !html) return;
    const flags = ((_a = app.document.flags) == null ? void 0 : _a["storyteller-cinema"]) || {};
    const cinematicTexture = flags.cinematicTexture || "";
    let root = html instanceof HTMLElement ? html : html[0];
    const appearanceTab = root.querySelector('.tab[data-tab="appearance"]');
    if (!appearanceTab) return;
    if (appearanceTab.querySelector('input[name="flags.storyteller-cinema.cinematicTexture"]')) return;
    const formGroup = document.createElement("div");
    formGroup.className = "form-group";
    formGroup.innerHTML = `
            <label>Cinematic Portrait <span class="units">(Optional)</span></label>
            <div class="form-fields">
                <button type="button" class="file-picker" data-type="imagevideo" data-target="flags.storyteller-cinema.cinematicTexture" title="Browse Files" tabindex="-1">
                    <i class="fas fa-file-import fa-fw"></i>
                </button>
                <input class="image" type="text" name="flags.storyteller-cinema.cinematicTexture" placeholder="path/to/image.webp" value="${cinematicTexture}">
            </div>
        `;
    appearanceTab.appendChild(formGroup);
    const btn = formGroup.querySelector("button.file-picker");
    if (btn) {
      btn.onclick = (event) => {
        var _a2, _b;
        event.preventDefault();
        const FilePickerClass = ((_b = (_a2 = foundry.applications) == null ? void 0 : _a2.apps) == null ? void 0 : _b.FilePicker) || FilePicker;
        const fp = new FilePickerClass({
          type: "imagevideo",
          current: cinematicTexture,
          callback: (path) => {
            formGroup.querySelector("input").value = path;
          }
        });
        return fp.browse();
      };
    }
    app.setPosition({ height: "auto" });
  });
  Hooks.on("renderTileConfig", (app, html) => {
    var _a;
    if (!(app == null ? void 0 : app.document) || !html) return;
    const flags = ((_a = app.document.flags) == null ? void 0 : _a["storyteller-cinema"]) || {};
    const cinematicTexture = flags.cinematicTexture || "";
    let root = html instanceof HTMLElement ? html : html[0];
    const basicTab = root.querySelector('.tab[data-tab="basic"]');
    if (!basicTab) return;
    if (basicTab.querySelector('input[name="flags.storyteller-cinema.cinematicTexture"]')) return;
    const formGroup = document.createElement("div");
    formGroup.className = "form-group";
    formGroup.innerHTML = `
            <label>Cinematic Portrait <span class="units">(Optional)</span></label>
            <div class="form-fields">
                <button type="button" class="file-picker" data-type="imagevideo" data-target="flags.storyteller-cinema.cinematicTexture" title="Browse Files" tabindex="-1">
                    <i class="fas fa-file-import fa-fw"></i>
                </button>
                <input class="image" type="text" name="flags.storyteller-cinema.cinematicTexture" placeholder="path/to/image.webp" value="${cinematicTexture}">
            </div>
        `;
    basicTab.appendChild(formGroup);
    const btn = formGroup.querySelector("button.file-picker");
    if (btn) {
      btn.onclick = (event) => {
        var _a2, _b;
        event.preventDefault();
        const FilePickerClass = ((_b = (_a2 = foundry.applications) == null ? void 0 : _a2.apps) == null ? void 0 : _b.FilePicker) || FilePicker;
        const fp = new FilePickerClass({
          type: "imagevideo",
          current: cinematicTexture,
          callback: (path) => {
            formGroup.querySelector("input").value = path;
          }
        });
        return fp.browse();
      };
    }
    app.setPosition({ height: "auto" });
  });
  Hooks.on("getActorContextOptions", (_app, options) => {
    console.log(">>> STORYTELLER CINEMA V14 - CONTEXT MENU HOOK <<<", options);
    options.push({
      label: "Cinema: Stage Actor",
      icon: '<i class="fas fa-users-plus"></i>',
      visible: (target) => {
        var _a, _b;
        const actorId = ((_a = target.closest("[data-document-id]")) == null ? void 0 : _a.getAttribute("data-document-id")) || ((_b = target.closest("[data-entry-id]")) == null ? void 0 : _b.getAttribute("data-entry-id"));
        if (!actorId) return false;
        const cast = game.settings.get("storyteller-cinema", "sceneCast") || [];
        return !cast.includes(actorId);
      },
      onClick: async (_event, target) => {
        var _a, _b, _c;
        const actorId = ((_a = target.closest("[data-document-id]")) == null ? void 0 : _a.getAttribute("data-document-id")) || ((_b = target.closest("[data-entry-id]")) == null ? void 0 : _b.getAttribute("data-entry-id"));
        if (!actorId) return;
        const cast = game.settings.get("storyteller-cinema", "sceneCast") || [];
        if (!cast.includes(actorId)) {
          cast.push(actorId);
          await game.settings.set("storyteller-cinema", "sceneCast", cast);
          (_c = window.StorytellerCinema.cinemaTray) == null ? void 0 : _c.render(true);
          ui.notifications.info(`Actor added to Stage.`);
        }
      }
    });
    options.push({
      label: "Cinema: Unstage Actor",
      icon: '<i class="fas fa-users-slash"></i>',
      visible: (target) => {
        var _a, _b;
        const actorId = ((_a = target.closest("[data-document-id]")) == null ? void 0 : _a.getAttribute("data-document-id")) || ((_b = target.closest("[data-entry-id]")) == null ? void 0 : _b.getAttribute("data-entry-id"));
        if (!actorId) return false;
        const cast = game.settings.get("storyteller-cinema", "sceneCast") || [];
        return cast.includes(actorId);
      },
      onClick: async (_event, target) => {
        var _a, _b, _c;
        const actorId = ((_a = target.closest("[data-document-id]")) == null ? void 0 : _a.getAttribute("data-document-id")) || ((_b = target.closest("[data-entry-id]")) == null ? void 0 : _b.getAttribute("data-entry-id"));
        if (!actorId) return;
        const cast = game.settings.get("storyteller-cinema", "sceneCast") || [];
        const newCast = cast.filter((id) => id !== actorId);
        await game.settings.set("storyteller-cinema", "sceneCast", newCast);
        (_c = window.StorytellerCinema.cinemaTray) == null ? void 0 : _c.render(true);
        ui.notifications.info(`Actor removed from Stage.`);
      }
    });
  });
  Hooks.on("preCreateChatMessage", (document2, data, _options, _userId) => {
    var _a;
    const tray = window.StorytellerCinema.cinemaTray;
    if ((tray == null ? void 0 : tray.speakingAs) && !data.content.startsWith("/") && !((_a = data.rolls) == null ? void 0 : _a.length)) {
      const speaker = {
        actor: tray.speakingAs.id,
        alias: tray.speakingAs.name
      };
      document2.updateSource({ speaker });
    }
  });
}
function createHUDButton() {
  var _a, _b;
  if (document.getElementById("storyteller-cinema-toggle")) return;
  if (!((_a = game.user) == null ? void 0 : _a.isGM)) return;
  const container = document.createElement("div");
  container.id = "storyteller-cinema-toggle";
  container.innerHTML = `
        <div class="hud-toggle-action">
            <i class="fas fa-film"></i> 
            <span class="label">Storyteller Cinema</span>
        </div>
        <div class="hud-controls">
            <span class="separator">|</span>
            <div class="custom-skin-select" title="Change Skin">
                <span class="current-value">Loading...</span>
                <i class="fas fa-chevron-down"></i>
                <ul class="dropdown-options"></ul>
            </div>
            <i class="fas fa-comment-dots open-dialogue" title="Open Dialogue Console"></i>
            <i class="fas fa-cog open-config" title="Open Skin Studio"></i>
        </div>
    `;
  document.body.appendChild(container);
  const toggleAction = container.querySelector(".hud-toggle-action");
  const customSelect = container.querySelector(".custom-skin-select");
  const currentValueSpan = customSelect.querySelector(".current-value");
  const optionsList = customSelect.querySelector(".dropdown-options");
  const configBtn = container.querySelector(".open-config");
  const dialogueBtn = container.querySelector(".open-dialogue");
  const controls = container.querySelector(".hud-controls");
  toggleAction.onclick = async (e) => {
    e.stopPropagation();
    customSelect.classList.remove("open");
    if (!canvas.scene) return;
    const current = canvas.scene.getFlag("storyteller-cinema", "active") || false;
    await canvas.scene.setFlag("storyteller-cinema", "active", !current);
  };
  const updateHUDVisibility = () => {
    const isActive = document.body.classList.contains("cinematic-mode");
    container.classList.toggle("active", isActive);
    controls.style.display = isActive ? "flex" : "none";
    if (!isActive) customSelect.classList.remove("open");
  };
  updateHUDVisibility();
  const populateSkins = () => {
    var _a2, _b2, _c, _d;
    const skins = ((_b2 = (_a2 = window.StorytellerCinema) == null ? void 0 : _a2.skins) == null ? void 0 : _b2.getSkins()) || [];
    const activeId = ((_d = (_c = window.StorytellerCinema) == null ? void 0 : _c.skins) == null ? void 0 : _d.activeSkin) || "default";
    const activeSkin = skins.find((s) => s.id === activeId);
    currentValueSpan.textContent = activeSkin ? activeSkin.name : "Select Skin";
    optionsList.innerHTML = skins.map((s) => `
            <li data-value="${s.id}" class="${s.id === activeId ? "selected" : ""}">${s.name}</li>
        `).join("");
    optionsList.querySelectorAll("li").forEach((li) => {
      li.onclick = (e) => {
        var _a3;
        e.stopPropagation();
        const skinId = li.dataset.value;
        customSelect.classList.remove("open");
        currentValueSpan.textContent = li.textContent.trim();
        (_a3 = window.StorytellerCinema.skins) == null ? void 0 : _a3.apply(skinId);
      };
    });
  };
  if ((_b = window.StorytellerCinema) == null ? void 0 : _b.skins) populateSkins();
  else setTimeout(populateSkins, 500);
  customSelect.onclick = (e) => {
    e.stopPropagation();
    customSelect.classList.toggle("open");
  };
  document.addEventListener("click", (e) => {
    if (!customSelect.contains(e.target)) {
      customSelect.classList.remove("open");
    }
  });
  configBtn.onclick = (e) => {
    e.stopPropagation();
    customSelect.classList.remove("open");
    new SkinConfig().render(true, { focus: true });
  };
  dialogueBtn.onclick = (e) => {
    e.stopPropagation();
    customSelect.classList.remove("open");
    new DialogueConsole().render(true, { focus: true });
  };
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === "class") updateHUDVisibility();
    });
  });
  observer.observe(document.body, { attributes: true });
  Hooks.on("storyteller-cinema-skins-updated", populateSkins);
}
Hooks.on("ready", createHUDButton);
Hooks.on("canvasReady", createHUDButton);
export {
  registerUIHooks as r
};
//# sourceMappingURL=ui.js.map
