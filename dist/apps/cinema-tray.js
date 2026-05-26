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
    const activePortraits = game.settings.get("storyteller-cinema", "activePortraits") || [];
    const actors = castIds.map((id) => {
      var _a2;
      return (_a2 = game.actors) == null ? void 0 : _a2.get(id);
    }).filter((a) => !!a).map((a) => ({
      id: a.id,
      name: a.name,
      img: a.img,
      isActiveOnStage: activePortraits.includes(a.id)
    }));
    return {
      actors,
      active: game.settings.get("storyteller-cinema", "cinemaModeActive"),
      speakingAsId: (_a = this.speakingAs) == null ? void 0 : _a.id,
      isNarratorActive: activePortraits.includes("narrator"),
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
      btn.addEventListener("click", async (ev) => {
        var _a, _b;
        const dataset = ev.currentTarget.dataset;
        const activePortraits = game.settings.get("storyteller-cinema", "activePortraits") || [];
        let newPortraits = [...activePortraits];
        if (this.isDirectorMode) {
          if (((_a = this.speakingAs) == null ? void 0 : _a.id) === dataset.id) {
            this.speakingAs = null;
          } else {
            this.speakingAs = { id: dataset.id, name: dataset.name, img: dataset.img };
            if (!newPortraits.includes(dataset.id)) {
              newPortraits.push(dataset.id);
            }
          }
        } else {
          if (activePortraits.includes(dataset.id)) {
            newPortraits = activePortraits.filter((id) => id !== dataset.id);
            if (((_b = this.speakingAs) == null ? void 0 : _b.id) === dataset.id) {
              this.speakingAs = null;
            }
          } else {
            newPortraits = [...activePortraits, dataset.id];
            this.speakingAs = { id: dataset.id, name: dataset.name, img: dataset.img };
          }
        }
        await game.settings.set("storyteller-cinema", "activePortraits", newPortraits);
        this.render();
      });
      btn.addEventListener("contextmenu", async (ev) => {
        ev.preventDefault();
        const dataset = ev.currentTarget.dataset;
        const activePortraits = game.settings.get("storyteller-cinema", "activePortraits") || [];
        let newPortraits;
        if (activePortraits.includes(dataset.id)) {
          newPortraits = activePortraits.filter((id) => id !== dataset.id);
        } else {
          newPortraits = [...activePortraits, dataset.id];
        }
        await game.settings.set("storyteller-cinema", "activePortraits", newPortraits);
        this.render();
      });
    });
    const narratorBtn = html.querySelector(".narrator-btn");
    if (narratorBtn) {
      narratorBtn.addEventListener("click", async (ev) => {
        var _a, _b, _c, _d;
        ev.preventDefault();
        console.log("Storyteller Cinema | Narrator Clicked");
        const activePortraits = game.settings.get("storyteller-cinema", "activePortraits") || [];
        let newPortraits = [...activePortraits];
        if (this.isDirectorMode) {
          if (((_a = this.speakingAs) == null ? void 0 : _a.id) === "narrator") {
            this.speakingAs = null;
          } else {
            this.speakingAs = {
              id: "narrator",
              name: "Narrator",
              img: ((_b = game.user) == null ? void 0 : _b.avatar) || "icons/svg/book.svg"
            };
            if (!newPortraits.includes("narrator")) {
              newPortraits.push("narrator");
            }
          }
        } else {
          if (activePortraits.includes("narrator")) {
            newPortraits = activePortraits.filter((id) => id !== "narrator");
            if (((_c = this.speakingAs) == null ? void 0 : _c.id) === "narrator") {
              this.speakingAs = null;
            }
          } else {
            newPortraits = [...activePortraits, "narrator"];
            this.speakingAs = {
              id: "narrator",
              name: "Narrator",
              img: ((_d = game.user) == null ? void 0 : _d.avatar) || "icons/svg/book.svg"
            };
          }
        }
        await game.settings.set("storyteller-cinema", "activePortraits", newPortraits);
        this.render();
      });
      narratorBtn.addEventListener("contextmenu", async (ev) => {
        ev.preventDefault();
        const activePortraits = game.settings.get("storyteller-cinema", "activePortraits") || [];
        let newPortraits;
        if (activePortraits.includes("narrator")) {
          newPortraits = activePortraits.filter((id) => id !== "narrator");
        } else {
          newPortraits = [...activePortraits, "narrator"];
        }
        await game.settings.set("storyteller-cinema", "activePortraits", newPortraits);
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
        if (!this.isDirectorMode) {
          window.StorytellerCinema.clearSubtitles();
        }
        this.render();
      });
    }
    const clearBtn = html.querySelector(".clear-btn");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        window.StorytellerCinema.clearSubtitles();
      });
      clearBtn.addEventListener("dblclick", () => {
        window.StorytellerCinema.clear();
      });
    }
  }
}
__publicField(CinemaTray, "DEFAULT_OPTIONS", {
  id: "storyteller-cinema-tray",
  tagName: "div",
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
