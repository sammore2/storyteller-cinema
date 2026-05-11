var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
class CinemaTray extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor() {
    super(...arguments);
    /** The current actor speaking through the tray */
    __publicField(this, "speakingAs", null);
    /** Whether chat messages are intercepted as subtitles */
    __publicField(this, "isDirectorMode", false);
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
      speakingAsId: (_a = this.speakingAs) == null ? void 0 : _a.id,
      directorMode: this.isDirectorMode
    };
  }
  /**
   * Update the visual overlay on the chat input
   */
  updateChatOverlay() {
  }
  _onRender(context, options) {
    super._onRender(context, options);
    const html = this.element;
    const DraggableClass = foundry.applications.ux.Draggable;
    new DraggableClass(this, html, html, false);
    html.querySelectorAll(".actor-btn").forEach((btn) => {
      btn.addEventListener("click", (ev) => {
        var _a;
        const dataset = ev.currentTarget.dataset;
        if (((_a = this.speakingAs) == null ? void 0 : _a.id) === dataset.id) {
          this.speakingAs = null;
          window.StorytellerCinema.clear();
        } else {
          this.speakingAs = { id: dataset.id, name: dataset.name, img: dataset.img };
          window.StorytellerCinema.say(dataset.name, "", {
            portrait: dataset.img,
            side: "left"
          });
        }
        this.render();
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
    const narratorBtn = html.querySelector(".narrator-btn");
    if (narratorBtn) {
      narratorBtn.addEventListener("click", (ev) => {
        var _a;
        ev.preventDefault();
        console.log("Storyteller Cinema | Narrator Clicked");
        if (((_a = this.speakingAs) == null ? void 0 : _a.id) === "narrator") {
          this.speakingAs = null;
          window.StorytellerCinema.clear();
        } else {
          this.speakingAs = {
            id: "narrator",
            name: "Narrator",
            img: game.user.avatar || "icons/svg/book.svg"
          };
          window.StorytellerCinema.say("Narrator", "", {
            portrait: this.speakingAs.img,
            side: "left"
          });
        }
        this.render();
      });
    }
    const directorBtn = html.querySelector(".director-mode-btn");
    if (directorBtn) {
      directorBtn.addEventListener("click", (ev) => {
        ev.preventDefault();
        this.isDirectorMode = !this.isDirectorMode;
        console.log("Storyteller Cinema | Director Mode:", this.isDirectorMode);
        ui.notifications.info(`Director Mode is now ${this.isDirectorMode ? "ON" : "OFF"}`);
        this.render();
      });
    }
    const clearBtn = html.querySelector(".clear-btn");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        window.StorytellerCinema.clear();
      });
      clearBtn.addEventListener("dblclick", () => {
        window.StorytellerCinema.clearCast();
      });
    }
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
    height: "auto",
    top: 100,
    left: 100
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
