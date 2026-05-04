function registerRenderHooks() {
  Hooks.on("refreshToken", (token) => {
    var _a;
    if (!((_a = window.StorytellerCinema) == null ? void 0 : _a.active)) {
      token.renderable = true;
      return;
    }
    const cinematicTexture = token.document.getFlag("storyteller-cinema", "cinematicTexture");
    token.renderable = !!cinematicTexture;
  });
  Hooks.on("refreshTile", (tile) => {
    var _a;
    tile.renderable = !((_a = window.StorytellerCinema) == null ? void 0 : _a.active);
  });
  Hooks.on("refreshDrawing", (drawing) => {
    var _a;
    drawing.renderable = !((_a = window.StorytellerCinema) == null ? void 0 : _a.active);
  });
  Hooks.on("refreshMeasuredTemplate", (template) => {
    var _a;
    template.renderable = !((_a = window.StorytellerCinema) == null ? void 0 : _a.active);
  });
  Hooks.on("refreshAmbientLight", (light) => {
    var _a;
    light.renderable = !((_a = window.StorytellerCinema) == null ? void 0 : _a.active);
  });
}
export {
  registerRenderHooks as r
};
//# sourceMappingURL=render.js.map
