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
      tagName: "form",
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
      },
      form: {
        handler: SkinConfig._onSubmit,
        submitOnChange: true,
        closeOnSubmit: false
      },
      actions: {
        selectSkin: SkinConfig._onSelectSkin,
        deleteSkin: SkinConfig._onDeleteSkin,
        createSkin: SkinConfig._createNewSkin,
        importSkin: SkinConfig._importSkinDialog,
        saveSkin: SkinConfig._onSaveSkin,
        exportSkin: SkinConfig._onExportSkin,
        applySkin: SkinConfig._onApplySkin
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
    super._onRender(_context, _options);
    if (!this._hookId) {
      this._hookId = Hooks.on("storyteller-cinema-skins-updated", () => {
        if (this.rendered) this.render();
      });
    }
  }
  static async _onSubmit(_event, _form, formData) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r;
    const expanded = foundry.utils.expandObject(formData.object);
    this.tempSkinData.name = expanded.name;
    this.tempSkinData.options = this.tempSkinData.options || {};
    this.tempSkinData.options.barTexture = ((_a = expanded.options) == null ? void 0 : _a.barTexture) || "";
    this.tempSkinData.options.barTopTexture = ((_b = expanded.options) == null ? void 0 : _b.barTopTexture) || "";
    this.tempSkinData.options.barBottomTexture = ((_c = expanded.options) == null ? void 0 : _c.barBottomTexture) || "";
    this.tempSkinData.options.footerTexture = ((_d = expanded.options) == null ? void 0 : _d.footerTexture) || "";
    this.tempSkinData.options.portraitBorder = ((_e = expanded.options) == null ? void 0 : _e.portraitBorder) || "";
    this.tempSkinData.options.overlayTexture = ((_f = expanded.options) == null ? void 0 : _f.overlayTexture) || "";
    this.tempSkinData.options.filter = ((_g = expanded.options) == null ? void 0 : _g.filter) || "";
    this.tempSkinData.options.styles = this.tempSkinData.options.styles || {};
    this.tempSkinData.options.styles["--cinematic-bar-bg"] = ((_i = (_h = expanded.options) == null ? void 0 : _h.styles) == null ? void 0 : _i["--cinematic-bar-bg"]) || "#000000";
    this.tempSkinData.options.styles["--cinematic-footer-bg"] = ((_k = (_j = expanded.options) == null ? void 0 : _j.styles) == null ? void 0 : _k["--cinematic-footer-bg"]) || "transparent";
    this.tempSkinData.options.styles["--cinematic-portrait-name-bg"] = ((_m = (_l = expanded.options) == null ? void 0 : _l.styles) == null ? void 0 : _m["--cinematic-portrait-name-bg"]) || "none";
    this.tempSkinData.options.styles["--cinematic-portrait-border-image"] = ((_n = expanded.options) == null ? void 0 : _n.portraitBorder) ? `url(${expanded.options.portraitBorder})` : "none";
    const footerTexture = ((_o = expanded.options) == null ? void 0 : _o.footerTexture) || "";
    this.tempSkinData.options.styles["--cinematic-footer-texture"] = footerTexture ? `url(${footerTexture})` : "none";
    const borderWidth = ((_p = expanded.border) == null ? void 0 : _p.width) ?? 0;
    const borderStyle = ((_q = expanded.border) == null ? void 0 : _q.style) ?? "none";
    const borderColor = ((_r = expanded.border) == null ? void 0 : _r.color) ?? "#000000";
    const newBorder = `${borderWidth}px ${borderStyle} ${borderColor}`;
    this.tempSkinData.options.styles["--cinematic-bar-border"] = newBorder;
    this.render();
  }
  static _onSelectSkin(_event, target) {
    const id = target.dataset.id;
    if (!id) return;
    this.selectedSkinId = id;
    this.tempSkinData = null;
    this.render();
  }
  static async _onDeleteSkin(event, target) {
    event.stopPropagation();
    const id = target.dataset.id;
    if (!id) return;
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
  _captureFormData() {
    const form = this.element;
    if (!form) return;
    const opts = this.tempSkinData.options || {};
    form.querySelectorAll("file-picker[name]").forEach((fp) => {
      const name = fp.getAttribute("name");
      const val = fp.value ?? fp.getAttribute("value") ?? "";
      if (name === "options.barTopTexture") opts.barTopTexture = val;
      else if (name === "options.barBottomTexture") opts.barBottomTexture = val;
      else if (name === "options.barTexture") opts.barTexture = val;
      else if (name === "options.footerTexture") opts.footerTexture = val;
      else if (name === "options.overlayTexture") opts.overlayTexture = val;
      else if (name === "options.portraitBorder") opts.portraitBorder = val;
      else if (name === "options.filter") opts.filter = val;
    });
    this.tempSkinData.options = opts;
  }
  static _onApplySkin() {
    var _a;
    this._captureFormData();
    const skins = window.StorytellerCinema.skins;
    if (this.tempSkinData && skins) {
      skins.register(this.tempSkinData, false);
      skins.apply(this.tempSkinData.id);
      (_a = ui.notifications) == null ? void 0 : _a.info("Storyteller Cinema | Skin Applied (Not Saved)");
    }
  }
  static _onSaveSkin() {
    var _a;
    this._captureFormData();
    const skins = window.StorytellerCinema.skins;
    if (this.tempSkinData && skins) {
      skins.register(this.tempSkinData, true);
      skins.apply(this.tempSkinData.id);
      (_a = ui.notifications) == null ? void 0 : _a.info("Storyteller Cinema | Skin Saved & Applied");
    }
  }
  static _onExportSkin() {
    const skins = window.StorytellerCinema.skins;
    if (!skins) return;
    const id = this.selectedSkinId;
    skins.exportSkin(id);
  }
  static _createNewSkin() {
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
  static _importSkinDialog() {
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
