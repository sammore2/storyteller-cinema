const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
class SkinConfig extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options = {}) {
    super(options);
    this.selectedSkinId = "default";
    this.tempSkinData = null;
  }
  static get DEFAULT_OPTIONS() {
    return {
      tag: "form",
      id: "storyteller-cinema-skin-config",
      window: {
        title: "Storyteller Cinema - Skin Studio",
        icon: "fas fa-film",
        resizable: true,
        width: 800,
        height: 600
      },
      position: {
        width: 800,
        height: 600
      }
    };
  }
  static get PARTS() {
    return {
      form: {
        template: "modules/storyteller-cinema/templates/skin-config.hbs"
      }
    };
  }
  /* ---------------------------------------------------------------------- */
  /* DATA PREPARATION                                                       */
  /* ---------------------------------------------------------------------- */
  async _prepareContext(options) {
    const skinManager = window.StorytellerCinema.skins;
    const allSkins = skinManager.getSkins();
    const activeSkinId = skinManager.activeSkin;
    let currentSkin = this.tempSkinData;
    if (!currentSkin) {
      currentSkin = allSkins.find((s) => s.id === this.selectedSkinId) || allSkins[0];
      this.tempSkinData = JSON.parse(JSON.stringify(currentSkin));
    }
    return {
      skins: allSkins,
      activeSkin: activeSkinId,
      selectedSkin: this.tempSkinData
    };
  }
  /* ---------------------------------------------------------------------- */
  /* EVENT HANDLERS                                                         */
  /* ---------------------------------------------------------------------- */
  _onRender(context, options) {
    if (!this._hookId) {
      this._hookId = Hooks.on("storyteller-cinema-skins-updated", () => {
        if (this.rendered) this.render();
      });
    }
    const skinItems = this.element.querySelectorAll(".skin-item");
    skinItems.forEach((el) => {
      el.addEventListener("click", (ev) => {
        const id = el.dataset.id;
        this.selectedSkinId = id;
        this.tempSkinData = null;
        this.render();
      });
    });
    const inputs = this.element.querySelectorAll("input");
    inputs.forEach((input) => {
      input.addEventListener("change", (ev) => this._onInputChange(ev));
    });
    const applyBtn = this.element.querySelector(".apply-skin-btn");
    if (applyBtn) {
      applyBtn.addEventListener("click", () => {
        if (this.tempSkinData) {
          window.StorytellerCinema.skins.register(this.tempSkinData, false);
          window.StorytellerCinema.skins.apply(this.tempSkinData.id);
          ui.notifications.info("Storyteller Cinema | Skin Applied (Not Saved)");
        }
      });
    }
    const saveBtn = this.element.querySelector(".save-skin-btn");
    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        if (this.tempSkinData) {
          window.StorytellerCinema.skins.register(this.tempSkinData, true);
          window.StorytellerCinema.skins.apply(this.tempSkinData.id);
          ui.notifications.info("Storyteller Cinema | Skin Saved & Applied");
        }
      });
    }
    const createBtn = this.element.querySelector(".create-skin-btn");
    if (createBtn) {
      createBtn.addEventListener("click", () => this._createNewSkin());
    }
    const exportBtn = this.element.querySelector(".export-skin-btn");
    if (exportBtn) {
      exportBtn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        const id = exportBtn.dataset.id || this.selectedSkinId;
        window.StorytellerCinema.skins.exportSkin(id);
      });
    }
    const importBtn = this.element.querySelector(".import-skin-btn");
    if (importBtn) {
      importBtn.addEventListener("click", () => this._importSkinDialog());
    }
    const filePickers = this.element.querySelectorAll(".file-picker");
    filePickers.forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        const target = btn.dataset.target;
        const currentVal = this._getValue(this.tempSkinData, target);
        const filePicker = new FilePicker({
          type: "image",
          current: currentVal,
          callback: (path) => {
            this._setValue(this.tempSkinData, target, path);
            this.render();
          }
        });
        return filePicker.browse();
      });
    });
  }
  _onInputChange(event) {
    event.preventDefault();
    const input = event.currentTarget;
    const field = input.name;
    const value = input.value;
    this._setValue(this.tempSkinData, field, value);
  }
  _createNewSkin() {
    const newId = `custom-${Date.now()}`;
    const newSkin = {
      id: newId,
      name: "New Custom Skin",
      author: game.user.name,
      version: "1.0.0",
      options: {
        theme: "dark",
        styles: {
          "--cinematic-bar-bg": "#000000"
        }
      }
    };
    window.StorytellerCinema.skins.register(newSkin);
    this.selectedSkinId = newId;
    this.tempSkinData = null;
    this.render();
  }
  _importSkinDialog() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => this._processImportFile(e.target.files[0]);
    input.click();
  }
  async _processImportFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target.result;
      const imported = await window.StorytellerCinema.skins.importSkin(content);
      if (imported) {
        this.selectedSkinId = imported.id;
        this.tempSkinData = null;
        this.render();
      }
    };
    reader.readAsText(file);
  }
  /* ---------------------------------------------------------------------- */
  /* HELPERS                                                                */
  /* ---------------------------------------------------------------------- */
  // Dot notation setter
  _setValue(obj, path, value) {
    const keys = path.split(".");
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
  }
  /** @override */
  async _close(options) {
    if (this._hookId) {
      Hooks.off("storyteller-cinema-skins-updated", this._hookId);
      this._hookId = null;
    }
    return super._close(options);
  }
  // Dot notation getter
  _getValue(obj, path) {
    return path.split(".").reduce((o, i) => o == null ? void 0 : o[i], obj);
  }
}
export {
  SkinConfig as S
};
//# sourceMappingURL=skin-config.js.map
