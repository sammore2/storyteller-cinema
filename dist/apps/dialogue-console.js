var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
class DialogueConsole extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options = {}) {
    super(options);
    __publicField(this, "_lastActor", "");
    __publicField(this, "_lastPortrait", "");
  }
  async _prepareContext(_options) {
    var _a;
    const actors = ((_a = game.actors) == null ? void 0 : _a.map((a) => ({
      id: a.id,
      name: a.name,
      img: a.img
    }))) || [];
    return {
      lastActor: this._lastActor,
      lastPortrait: this._lastPortrait,
      actors
    };
  }
  _onRender(context, options) {
    var _a, _b, _c, _d, _e;
    super._onRender(context, options);
    const html = this.element;
    html.querySelectorAll(".actor-item").forEach((item) => {
      item.addEventListener("click", (ev) => {
        const el = ev.currentTarget;
        const nameInput = html.querySelector('[name="actorName"]');
        const portraitInput = html.querySelector('[name="portrait"]');
        nameInput.value = el.dataset.name;
        portraitInput.value = el.dataset.img;
        html.querySelectorAll(".cast-item").forEach((i) => i.classList.remove("active"));
        el.classList.add("active");
      });
    });
    (_a = html.querySelector(".narrator-toggle")) == null ? void 0 : _a.addEventListener("click", (ev) => {
      const el = ev.currentTarget;
      html.querySelector('[name="actorName"]').value = "";
      html.querySelector('[name="portrait"]').value = "";
      html.querySelectorAll(".cast-item").forEach((i) => i.classList.remove("active"));
      el.classList.add("active");
    });
    (_b = html.querySelector(".btn-send")) == null ? void 0 : _b.addEventListener("click", () => this._onSend());
    (_c = html.querySelector(".btn-clear")) == null ? void 0 : _c.addEventListener("click", () => {
      window.StorytellerCinema.clear();
    });
    (_d = html.querySelector(".file-picker")) == null ? void 0 : _d.addEventListener("click", (ev) => {
      const button = ev.currentTarget;
      const targetName = button.dataset.target;
      const input = html.querySelector(`[name="${targetName}"]`);
      new FilePicker({
        type: "image",
        current: input.value,
        callback: (path) => {
          input.value = path;
          this._lastPortrait = path;
        }
      }).browse();
    });
    (_e = html.querySelector('textarea[name="message"]')) == null ? void 0 : _e.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) {
        ev.preventDefault();
        this._onSend();
      }
    });
  }
  _onSend() {
    const html = this.element;
    const actorName = html.querySelector('[name="actorName"]').value;
    const portrait = html.querySelector('[name="portrait"]').value;
    const messageInput = html.querySelector('[name="message"]');
    const message = messageInput.value;
    if (!message) return;
    this._lastActor = actorName;
    this._lastPortrait = portrait;
    window.StorytellerCinema.say(actorName, message, {
      portrait,
      side: "left"
    });
    messageInput.value = "";
    messageInput.focus();
  }
}
__publicField(DialogueConsole, "DEFAULT_OPTIONS", {
  id: "storyteller-cinema-dialogue-console",
  tag: "form",
  classes: ["storyteller-cinema-app", "dialogue-console-app"],
  window: {
    title: "Cinema Director Console",
    icon: "fas fa-comment-dots",
    resizable: true
  },
  position: {
    width: 400,
    height: "auto"
  }
});
__publicField(DialogueConsole, "PARTS", {
  form: {
    template: "modules/storyteller-cinema/templates/dialogue-console.hbs"
  }
});
export {
  DialogueConsole as D
};
//# sourceMappingURL=dialogue-console.js.map
