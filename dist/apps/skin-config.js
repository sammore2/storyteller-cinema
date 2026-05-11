var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
class SkinConfig extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options = {}) {
    super(options);
    __publicField(this, "selectedSkinId");
    __publicField(this, "tempSkinData");
    __publicField(this, "_hookId", null);
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
  async _prepareContext(_options) {
    const skinManager = window.StorytellerCinema.skins;
    if (!skinManager) return {};
    const allSkins = skinManager.getSkins();
    const activeSkinId = skinManager.activeSkin;
    let currentSkin = this.tempSkinData;
    if (!currentSkin) {
      currentSkin = allSkins.find((s) => s.id === this.selectedSkinId) || allSkins[0];
      this.tempSkinData = JSON.parse(JSON.stringify(currentSkin));
    }
    const borderStr = this._getValue(this.tempSkinData, "options.styles.--cinematic-bar-border") || "0px none #000000";
    const borderParts = borderStr.split(" ");
    const borderData = {
      width: parseInt(borderParts[0]) || 0,
      style: borderParts[1] || "none",
      color: borderParts[2] || "#000000"
    };
    return {
      skins: allSkins,
      activeSkin: activeSkinId,
      selectedSkin: this.tempSkinData,
      border: borderData
    };
  }
  _onRender(_context, _options) {
    var _a, _b, _c, _d, _e, _f;
    if (!this._hookId) {
      this._hookId = Hooks.on("storyteller-cinema-skins-updated", () => {
        if (this.rendered) this.render();
      });
    }
    const inputs = this.element.querySelectorAll("input:not(.border-input), select:not(.border-input)");
    inputs.forEach((input) => {
      input.addEventListener("change", (ev) => this._onInputChange(ev));
    });
    const borderInputs = this.element.querySelectorAll(".border-input");
    borderInputs.forEach((input) => {
      input.addEventListener("change", () => {
        const width = this.element.querySelector('[name="border.width"]').value;
        const style = this.element.querySelector('[name="border.style"]').value;
        const color = this.element.querySelector('[name="border.color"]').value;
        const newBorder = `${width}px ${style} ${color}`;
        this._setValue(this.tempSkinData, "options.styles.--cinematic-bar-border", newBorder);
      });
    });
    const skinItems = this.element.querySelectorAll(".skin-item");
    skinItems.forEach((el) => {
      el.addEventListener("click", () => {
        const id = el.dataset.id;
        this.selectedSkinId = id;
        this.tempSkinData = null;
        this.render();
      });
    });
    (_a = this.element.querySelector(".delete-skin")) == null ? void 0 : _a.addEventListener("click", (ev) => this._onDeleteSkin(ev));
    (_b = this.element.querySelector(".apply-skin-btn")) == null ? void 0 : _b.addEventListener("click", () => this._onApplySkin());
    (_c = this.element.querySelector(".save-skin-btn")) == null ? void 0 : _c.addEventListener("click", () => this._onSaveSkin());
    (_d = this.element.querySelector(".create-skin-btn")) == null ? void 0 : _d.addEventListener("click", () => this._createNewSkin());
    (_e = this.element.querySelector(".export-skin-btn")) == null ? void 0 : _e.addEventListener("click", () => this._onExportSkin());
    (_f = this.element.querySelector(".import-skin-btn")) == null ? void 0 : _f.addEventListener("click", () => this._importSkinDialog());
    const filePickers = this.element.querySelectorAll(".file-picker");
    filePickers.forEach((btn) => {
      btn.addEventListener("click", () => this._onFilePicker(btn));
    });
  }
  _onInputChange(event) {
    const input = event.currentTarget;
    const field = input.name;
    const value = input.value;
    this._setValue(this.tempSkinData, field, value);
    const others = this.element.querySelectorAll(`[name="${field}"]`);
    others.forEach((other) => {
      if (other !== input) other.value = value;
    });
  }
  async _onDeleteSkin(ev) {
    ev.stopPropagation();
    const id = ev.currentTarget.dataset.id;
    const skins = window.StorytellerCinema.skins;
    if (!skins) return;
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: "Delete Skin" },
      content: `<p>Are you sure you want to delete this skin?</p>`,
      rejectClose: false,
      modal: true
    });
    if (confirmed) {
      await skins.delete(id);
      if (this.selectedSkinId === id) {
        this.selectedSkinId = "default";
        this.tempSkinData = null;
        this.render();
      }
    }
  }
  _onApplySkin() {
    var _a;
    const skins = window.StorytellerCinema.skins;
    if (this.tempSkinData && skins) {
      skins.register(this.tempSkinData, false);
      skins.apply(this.tempSkinData.id);
      (_a = ui.notifications) == null ? void 0 : _a.info("Storyteller Cinema | Skin Applied (Not Saved)");
    }
  }
  _onSaveSkin() {
    var _a;
    const skins = window.StorytellerCinema.skins;
    if (this.tempSkinData && skins) {
      skins.register(this.tempSkinData, true);
      skins.apply(this.tempSkinData.id);
      (_a = ui.notifications) == null ? void 0 : _a.info("Storyteller Cinema | Skin Saved & Applied");
    }
  }
  _onExportSkin() {
    const skins = window.StorytellerCinema.skins;
    if (!skins) return;
    const id = this.selectedSkinId;
    skins.exportSkin(id);
  }
  _onFilePicker(btn) {
    var _a, _b;
    const target = btn.dataset.target;
    const currentVal = this._getValue(this.tempSkinData, target);
    const startPath = currentVal || "storyteller-cinema/";
    const FilePickerClass = ((_b = (_a = foundry.applications) == null ? void 0 : _a.apps) == null ? void 0 : _b.FilePicker) || FilePicker;
    const filePicker = new FilePickerClass({
      type: "image",
      current: startPath,
      callback: (path) => {
        this._setValue(this.tempSkinData, target, path);
        this.render();
      }
    });
    filePicker.browse();
  }
  _createNewSkin() {
    var _a;
    const skins = window.StorytellerCinema.skins;
    if (!skins) return;
    const newId = `custom-${Date.now()}`;
    const newSkin = {
      id: newId,
      name: "New Custom Skin",
      author: ((_a = game.user) == null ? void 0 : _a.name) || "Unknown",
      version: "1.0.0",
      options: {
        theme: "dark",
        styles: {
          "--cinematic-bar-bg": "#000000",
          "--cinematic-bar-border": "2px solid #ff6400"
        }
      }
    };
    skins.register(newSkin);
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
      const skins = window.StorytellerCinema.skins;
      if (!skins) return;
      const content = e.target.result;
      const imported = await skins.importSkin(content);
      if (imported) {
        this.selectedSkinId = imported.id;
        this.tempSkinData = null;
        this.render();
      }
    };
    reader.readAsText(file);
  }
  _setValue(obj, path, value) {
    const keys = path.split(".");
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
  }
  async _close(options) {
    if (this._hookId) {
      Hooks.off("storyteller-cinema-skins-updated", this._hookId);
      this._hookId = null;
    }
    return super._close(options);
  }
  _getValue(obj, path) {
    return path.split(".").reduce((o, i) => o == null ? void 0 : o[i], obj);
  }
}
export {
  SkinConfig as S
};
//# sourceMappingURL=skin-config.js.map
