var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
class CinemaTray extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor() {
    super(...arguments);
    /** The current actor speaking through the tray */
    __publicField(this, "speakingAs", null);
  }
  /** @override */
  _insertElement(element) {
    const chatNotifications = document.getElementById("chat-notifications");
    const uiColumn = document.getElementById("ui-right-column-1");
    const parent = chatNotifications || uiColumn || document.body;
    parent.appendChild(element);
    const isLeft = parent.closest("#ui-left") !== null;
    element.setAttribute("data-side", isLeft ? "left" : "right");
  }
  async _prepareContext(_options) {
    var _a;
    const castIds = game.settings.get("storyteller-cinema", "sceneCast") || [];
    const actors = castIds.map((id) => {
      var _a2;
      return (_a2 = game.actors) == null ? void 0 : _a2.get(id);
    }).filter((a) => !!a).map((a) => ({
      id: a.id,
      name: a.name,
      img: a.img
    }));
    return {
      actors,
      active: game.settings.get("storyteller-cinema", "cinemaModeActive"),
      speakingAsId: (_a = this.speakingAs) == null ? void 0 : _a.id
    };
  }
  /**
   * Update the visual overlay on the chat input
   */
  updateChatOverlay() {
  }
  _onRender(context, options) {
    var _a, _b;
    super._onRender(context, options);
    const html = this.element;
    html.querySelectorAll(".actor-btn").forEach((btn) => {
      btn.addEventListener("click", (ev) => {
        var _a2;
        const dataset = ev.currentTarget.dataset;
        if (((_a2 = this.speakingAs) == null ? void 0 : _a2.id) === dataset.id) {
          this.speakingAs = null;
        } else {
          this.speakingAs = { id: dataset.id, name: dataset.name, img: dataset.img };
        }
        this.updateChatOverlay();
        this.render();
        const console = window.StorytellerCinema.dialogueConsole;
        if (console) {
          console.render(true);
          setTimeout(() => {
            var _a3;
            const consoleHtml = console.element;
            if (consoleHtml) {
              consoleHtml.querySelector('[name="actorName"]').value = this.speakingAs ? dataset.name : "";
              consoleHtml.querySelector('[name="portrait"]').value = this.speakingAs ? dataset.img : "";
              (_a3 = consoleHtml.querySelector('[name="message"]')) == null ? void 0 : _a3.focus();
            }
          }, 100);
        }
      });
      btn.addEventListener("contextmenu", (ev) => {
        ev.preventDefault();
        const dataset = ev.currentTarget.dataset;
        window.StorytellerCinema.say(dataset.name, "", {
          portrait: dataset.img,
          side: "left"
        });
      });
    });
    (_a = html.querySelector(".narrator-btn")) == null ? void 0 : _a.addEventListener("click", () => {
      const console = window.StorytellerCinema.dialogueConsole;
      if (console) {
        console.render(true);
        setTimeout(() => {
          var _a2;
          const consoleHtml = console.element;
          if (consoleHtml) {
            consoleHtml.querySelector('[name="actorName"]').value = "";
            consoleHtml.querySelector('[name="portrait"]').value = "";
            (_a2 = consoleHtml.querySelector('[name="message"]')) == null ? void 0 : _a2.focus();
          }
        }, 100);
      }
    });
    (_b = html.querySelector(".clear-btn")) == null ? void 0 : _b.addEventListener("click", () => {
      window.StorytellerCinema.clearCast();
    });
  }
}
__publicField(CinemaTray, "DEFAULT_OPTIONS", {
  id: "storyteller-cinema-tray",
  tag: "div",
  classes: ["storyteller-cinema-tray-app"],
  window: {
    frame: false,
    resizable: false
  },
  position: {
    width: "auto",
    height: "auto"
  }
});
__publicField(CinemaTray, "PARTS", {
  tray: {
    template: "modules/storyteller-cinema/templates/cinema-tray.hbs"
  }
});
export {
  CinemaTray as C
};
//# sourceMappingURL=cinema-tray.js.map
