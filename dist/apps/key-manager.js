var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
class KeyManager extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options = {}) {
    super(options);
    __publicField(this, "_hookId", null);
  }
  static get DEFAULT_OPTIONS() {
    return {
      tagName: "form",
      id: "storyteller-cinema-key-manager",
      window: {
        title: "Storyteller's Cinema - Premium Hub",
        icon: "fas fa-key",
        resizable: true,
        width: 650,
        height: 520
      },
      position: {
        width: 650,
        height: 520
      },
      form: {
        handler: KeyManager._onSubmit,
        submitOnChange: false,
        closeOnSubmit: false
      },
      actions: {
        addKey: KeyManager._onAddKey,
        removeKey: KeyManager._onRemoveKey,
        connectPatreon: KeyManager._onConnectPatreon
      }
    };
  }
  static get PARTS() {
    return {
      form: {
        template: "modules/storyteller-cinema/templates/key-manager.hbs"
      }
    };
  }
  async _prepareContext(_options) {
    var _a, _b, _c, _d;
    const premiumKeysSetting = game.settings.get("storyteller-cinema", "premiumKey") || "";
    const keysArray = premiumKeysSetting.split(",").map((k) => k.trim()).filter(Boolean);
    const activeKeysList = [];
    const unlockedPacks = /* @__PURE__ */ new Set(["classics"]);
    for (const key of keysArray) {
      const isDev = key.startsWith("sammore-dev-") && key.endsWith("5633");
      let tier = "Avulsa/Promocional";
      let typeClass = "promo";
      if (isDev) {
        tier = "Desenvolvedor";
        typeClass = "dev";
        unlockedPacks.add("the-umbra");
      } else if (key.toLowerCase() === "classics") {
        tier = "Gratuito";
        typeClass = "free";
      } else {
        try {
          const res = await fetch(`https://storyteller-cinema-proxy.robsammore.workers.dev/packs?key=${encodeURIComponent(key)}`);
          if (res.ok) {
            const data = await res.json();
            (data.packs || []).forEach((p) => unlockedPacks.add(p));
            if ((_a = data.packs) == null ? void 0 : _a.includes("cyberpunk-neon")) {
              tier = "Patreon Silver";
              typeClass = "patreon";
            } else if (((_b = data.packs) == null ? void 0 : _b.includes("the-umbra")) && ((_c = data.packs) == null ? void 0 : _c.length) > 2) {
              tier = "Patreon Gold";
              typeClass = "patreon";
            } else if ((_d = data.packs) == null ? void 0 : _d.includes("the-umbra")) {
              tier = "Patreon Bronze";
              typeClass = "patreon";
            }
          }
        } catch (_) {
          tier = "Patreon/Avulsa";
          typeClass = "patreon";
        }
      }
      activeKeysList.push({
        key,
        tier,
        typeClass
      });
    }
    const packsShowcase = [
      {
        id: "the-umbra",
        title: "Bronze Suporter (The Umbra Pack)",
        description: "Estética sombria e misteriosa perfeita para crônicas góticas e mistérios arcanos.",
        banner: "modules/storyteller-cinema/assets/premium-banner/premium-banner.png",
        // Usando o banner clássico de fundo
        link: "https://www.patreon.com/c/storyteller_cinema",
        unlocked: unlockedPacks.has("the-umbra")
      },
      {
        id: "cyberpunk-neon",
        title: "Silver Suporter (Cyberpunk Neon Pack)",
        description: "Visuais futuristas vibrantes, luzes de neon e telas de dados de alta tecnologia.",
        banner: "modules/storyteller-cinema/assets/premium-banner/premium-banner.png",
        link: "https://www.patreon.com/c/storyteller_cinema",
        unlocked: unlockedPacks.has("cyberpunk-neon")
      },
      {
        id: "gold-pack",
        title: "Gold Suporter (Arsenal Cinemático Completo)",
        description: "Desbloqueia absolutamente todas as skins do acervo, incluindo Steampunk Gears e Eldritch Abyss.",
        banner: "modules/storyteller-cinema/assets/premium-banner/premium-banner.png",
        link: "https://www.patreon.com/c/storyteller_cinema",
        unlocked: unlockedPacks.has("eldritch-abyss") || unlockedPacks.has("steampunk-gears")
      }
    ];
    return {
      activeKeys: activeKeysList,
      packs: packsShowcase
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
  static async _onSubmit(_event, _form, _formData) {
  }
  static async _onAddKey(event, _target) {
    var _a, _b, _c, _d, _e;
    event.preventDefault();
    const container = this.element;
    const input = container.querySelector(".new-key-field");
    const newKey = (_a = input == null ? void 0 : input.value) == null ? void 0 : _a.trim();
    if (!newKey) {
      (_b = ui.notifications) == null ? void 0 : _b.warn("Storyteller Cinema | Digite uma chave premium para adicionar.");
      return;
    }
    const currentKeysSetting = game.settings.get("storyteller-cinema", "premiumKey") || "";
    const keysList = currentKeysSetting.split(",").map((k) => k.trim()).filter(Boolean);
    if (keysList.includes(newKey)) {
      (_c = ui.notifications) == null ? void 0 : _c.info("Storyteller Cinema | Esta chave já está cadastrada.");
      return;
    }
    keysList.push(newKey);
    await game.settings.set("storyteller-cinema", "premiumKey", keysList.join(","));
    (_d = ui.notifications) == null ? void 0 : _d.info("Storyteller Cinema | Chave adicionada com sucesso!");
    input.value = "";
    if ((_e = window.StorytellerCinema) == null ? void 0 : _e.skins) {
      await window.StorytellerCinema.skins.init();
    }
    this.render();
  }
  static async _onRemoveKey(event, _target) {
    var _a, _b, _c, _d, _e;
    event.preventDefault();
    const keyToRemove = ((_b = (_a = event.currentTarget) == null ? void 0 : _a.dataset) == null ? void 0 : _b.key) || ((_c = _target == null ? void 0 : _target.dataset) == null ? void 0 : _c.key);
    if (!keyToRemove) return;
    const currentKeysSetting = game.settings.get("storyteller-cinema", "premiumKey") || "";
    const keysList = currentKeysSetting.split(",").map((k) => k.trim()).filter(Boolean);
    const filteredKeys = keysList.filter((k) => k !== keyToRemove);
    await game.settings.set("storyteller-cinema", "premiumKey", filteredKeys.join(","));
    (_d = ui.notifications) == null ? void 0 : _d.info("Storyteller Cinema | Chave removida.");
    if ((_e = window.StorytellerCinema) == null ? void 0 : _e.skins) {
      await window.StorytellerCinema.skins.init();
    }
    this.render();
  }
  static _onConnectPatreon(event, _target) {
    event.preventDefault();
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open(
      "https://storyteller-cinema-proxy.robsammore.workers.dev/oauth/login",
      "PatreonLogin",
      `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
    );
    if (popup) {
      const messageListener = async (e) => {
        var _a, _b, _c, _d;
        if (e.origin !== "https://storyteller-cinema-proxy.robsammore.workers.dev") return;
        if (((_a = e.data) == null ? void 0 : _a.type) === "PATREON_KEY_ACTIVATED" && ((_b = e.data) == null ? void 0 : _b.key)) {
          const newKey = e.data.key;
          const currentKeysSetting = game.settings.get("storyteller-cinema", "premiumKey") || "";
          const keysList = currentKeysSetting.split(",").map((k) => k.trim()).filter(Boolean);
          if (!keysList.includes(newKey)) {
            keysList.push(newKey);
            await game.settings.set("storyteller-cinema", "premiumKey", keysList.join(","));
            (_c = ui.notifications) == null ? void 0 : _c.info("Storyteller Cinema | Patreon conectado e chave premium ativada!");
            if ((_d = window.StorytellerCinema) == null ? void 0 : _d.skins) {
              await window.StorytellerCinema.skins.init();
            }
            this.render();
          }
          window.removeEventListener("message", messageListener);
        }
      };
      window.addEventListener("message", messageListener);
    }
  }
}
export {
  KeyManager
};
//# sourceMappingURL=key-manager.js.map
