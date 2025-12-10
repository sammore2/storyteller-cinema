var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
class CinematicProxy {
  constructor(token) {
    this.token = token;
    this.sprite = new PIXI.Sprite();
    this.container = new PIXI.Container();
    const getSetting = (key, def) => {
      try {
        return game.settings.get("storyteller-cinema", key);
      } catch {
        return def;
      }
    };
    this.settings = {
      refHeight: getSetting("referenceHeight", 30) / 100,
      minDepth: getSetting("minScale", 0.5),
      maxDepth: getSetting("maxScale", 1.2)
    };
    this._initialized = false;
    this.init();
  }
  async init() {
    var _a, _b;
    if (!this.token.actor) return;
    const imgSrc = this.token.actor.img || this.token.document.texture.src;
    console.log(`Storyteller Cinema | 🎭 Init Proxy for ${this.token.name}. Image: ${imgSrc}`);
    try {
      this.texture = await foundry.canvas.TextureLoader.loader.loadTexture(imgSrc);
    } catch (err) {
      console.error("Storyteller Cinema | ❌ Texture Load Failed:", err);
      this.texture = null;
    }
    let safeTexture = this.texture;
    const isValidTex = (t) => t && t instanceof PIXI.Texture && t.valid;
    if (!isValidTex(safeTexture)) {
      console.warn(`Storyteller Cinema | ⚠️ Invalid Texture for ${this.token.name}. Trying fallback.`);
      if (isValidTex((_a = this.token.mesh) == null ? void 0 : _a.texture)) {
        safeTexture = this.token.mesh.texture;
      } else {
        console.warn("Storyteller Cinema | ⚠️ Fallback to EMPTY texture.");
        safeTexture = ((_b = PIXI.Texture) == null ? void 0 : _b.EMPTY) || new PIXI.Texture(new PIXI.BaseTexture());
      }
    }
    if (!safeTexture) {
      console.error("Storyteller Cinema | ❌ Could not find ANY valid texture. Aborting Sprite creation.");
      return;
    }
    try {
      this.sprite.texture = safeTexture;
    } catch (pixiError) {
      console.error("Storyteller Cinema | ❌ PIXI Sprite Crash suppressed:", pixiError);
      return;
    }
    this.sprite.anchor.set(0.5, 1);
    this.container.addChild(this.sprite);
    canvas.tokens.addChild(this.container);
    canvas.tokens.sortChildren();
    console.log(`Storyteller Cinema | ✅ Proxy Created for ${this.token.name}`);
    this._initialized = true;
    this.refresh();
  }
  /**
   * Atualiza posição e escala do Proxy baseado no Token Controller
   */
  refresh() {
    if (!this._initialized || !this.token) return;
    const tokenCenter = this.token.center;
    const halfHeight = this.token.h * this.token.document.texture.scaleY / 2;
    this.container.position.set(tokenCenter.x, tokenCenter.y + halfHeight);
    if (this.token.mesh) {
      this.container.zIndex = this.token.mesh.zIndex + 1;
    }
    this.container.visible = true;
    this.container.alpha = 1;
    this._applyStandeeEffect();
  }
  _applyStandeeEffect() {
    if (!this.texture || !this.texture.valid) return;
    const sceneHeight = canvas.dimensions.height;
    const yRatio = Math.max(0, Math.min(1, this.token.y / sceneHeight));
    const depthScale = this.settings.minDepth + yRatio * (this.settings.maxDepth - this.settings.minDepth);
    const targetHeightPx = sceneHeight * this.settings.refHeight;
    const texHeight = this.texture.height || 100;
    const baseScale = targetHeightPx / texHeight;
    const finalScale = baseScale * depthScale;
    this.container.rotation = 0;
    const rot = this.token.document.rotation;
    const isLookingLeft = rot > 90 && rot < 270;
    const scaleX = isLookingLeft ? -Math.abs(finalScale) : Math.abs(finalScale);
    this.sprite.scale.set(scaleX, Math.abs(finalScale));
  }
  destroy() {
    if (this.container && !this.container.destroyed) {
      this.container.destroy({ children: true });
    }
  }
}
class ProxyManager {
  static enable() {
    console.log("Storyteller Cinema | 🎭 Spawning Proxies...");
    canvas.tokens.placeables.forEach((token) => {
      if (!token.actor) return;
      if (token.mesh) token.mesh.alpha = 0;
      if (!this.proxies.has(token.id)) {
        this.proxies.set(token.id, new CinematicProxy(token));
      }
    });
  }
  static disable() {
    console.log("Storyteller Cinema | 🎭 Destroying Proxies...");
    canvas.tokens.placeables.forEach((token) => {
      if (token.mesh) token.mesh.alpha = token.document.hidden ? 0.5 : 1;
    });
    this.proxies.forEach((proxy) => proxy.destroy());
    this.proxies.clear();
  }
  static update(token) {
    const proxy = this.proxies.get(token.id);
    if (proxy) proxy.refresh();
  }
}
__publicField(ProxyManager, "proxies", /* @__PURE__ */ new Map());
export {
  ProxyManager as P
};
//# sourceMappingURL=proxy.js.map
