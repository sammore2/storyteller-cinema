import { t as toggleCinematicMode } from "../core/cinematic.js";
function registerUIHooks() {
  Hooks.on("getSceneControlButtons", (controls) => {
    const controlList = Array.isArray(controls) ? controls : Object.values(controls);
    const tokenLayer = controlList.find((c) => c.name === "token");
    if (tokenLayer && tokenLayer.tools) {
      tokenLayer.tools.push({
        name: "cinematic",
        title: "Modo Cinema 2.5D",
        icon: "fas fa-film",
        toggle: true,
        active: document.body.classList.contains("cinematic-mode"),
        onClick: async (tog) => await toggleCinematicMode(tog)
      });
    }
  });
  Hooks.on("renderSceneConfig", (app, html) => {
    const scene = app.document ?? app.object;
    if (!scene) return;
    let root = html;
    if (html.jquery) root = html[0];
    if (!(root instanceof HTMLElement)) return;
    const submitBtn = root.querySelector('button[type="submit"]');
    if (submitBtn) {
      if (root.querySelector(".storyteller-cinema-config")) return;
      const flags = scene.flags["storyteller-cinema"] || {};
      const bgValue = flags.cinematicBg || "";
      const viewMode = flags.viewMode || "battlemap";
      const container = document.createElement("div");
      container.className = "storyteller-cinema-config";
      container.style.borderTop = "1px solid var(--color-border-light-2)";
      container.style.paddingTop = "10px";
      container.style.marginTop = "10px";
      const appearanceTab = root.querySelector('.tab[data-tab="appearance"]') || root.querySelector('.tab[data-tab="basic"]');
      const targetContainer = appearanceTab || submitBtn.closest(".form-footer").previousElementSibling;
      container.innerHTML = `
                <hr>
                <h3 class="form-header"><i class="fas fa-film"></i> Storyteller Cinema</h3>
                
                <div class="form-group">
                    <label>Modo de Visualização Padrão</label>
                    <div class="form-fields">
                        <select name="flags.storyteller-cinema.viewMode">
                            <option value="battlemap" ${viewMode === "battlemap" ? "selected" : ""}>📍 Battlemap (Tático)</option>
                            <option value="cinematic" ${viewMode === "cinematic" ? "selected" : ""}>🎬 Cinematic (Imersivo)</option>
                        </select>
                    </div>
                    <p class="notes">Define como esta cena deve ser iniciada.</p>
                </div>

                <div class="form-group">
                    <label>Fundo Cinemático</label>
                    <div class="form-fields">
                        <button type="button" class="file-picker" data-type="imagevideo" data-target="flags.storyteller-cinema.cinematicBg" title="Browse Files" tabindex="-1">
                            <i class="fas fa-file-import fa-fw"></i>
                        </button>
                        <input class="image" type="text" name="flags.storyteller-cinema.cinematicBg" placeholder="Caminho da imagem..." value="${bgValue}">
                    </div>
                    <p class="notes">Imagem exibida apenas no modo cinema (substitui o mapa).</p>
                </div>
            `;
      targetContainer.appendChild(container);
      const btn = container.querySelector("button.file-picker");
      if (btn) {
        btn.onclick = (event) => {
          var _a, _b;
          event.preventDefault();
          const FilePickerClass = ((_b = (_a = foundry.applications) == null ? void 0 : _a.apps) == null ? void 0 : _b.FilePicker) || FilePicker;
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
      console.log("Storyteller Cinema | Salvo no Banco:", newScale.toFixed(2));
    }, 600);
  }, { passive: false, capture: true });
  Hooks.on("renderTokenConfig", (app, html, data) => {
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
            <label>Imagem Cinemática <span class="units">(Opcional)</span></label>
            <div class="form-fields">
                <button type="button" class="file-picker" data-type="imagevideo" data-target="flags.storyteller-cinema.cinematicTexture" title="Navegar Arquivos" tabindex="-1">
                    <i class="fas fa-file-import fa-fw"></i>
                </button>
                <input class="image" type="text" name="flags.storyteller-cinema.cinematicTexture" placeholder="path/to/image.webp" value="${cinematicTexture}">
            </div>
            <p class="notes">Se definido, o token mudará para esta imagem quando o Modo Cinema for ativado.</p>
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
}
function createHUDButton() {
  if (document.getElementById("storyteller-cinema-toggle")) return;
  const btn = document.createElement("div");
  btn.id = "storyteller-cinema-toggle";
  btn.innerHTML = '<i class="fas fa-film"></i>';
  btn.title = "Alternar Modo Cinema";
  if (document.body.classList.contains("cinematic-mode")) btn.classList.add("active");
  btn.onclick = async () => {
    const isActive = document.body.classList.contains("cinematic-mode");
    await toggleCinematicMode(!isActive);
    btn.classList.toggle("active", !isActive);
  };
  document.body.appendChild(btn);
}
Hooks.on("ready", createHUDButton);
Hooks.on("canvasReady", createHUDButton);
export {
  registerUIHooks as r
};
//# sourceMappingURL=ui.js.map
