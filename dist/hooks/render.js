function registerRenderHooks() {
  Hooks.on("refreshToken", (token) => {
    var _a;
    if (!((_a = window.StorytellerCinema) == null ? void 0 : _a.active)) {
      if (token.mesh) token.mesh.visible = true;
      return;
    }
    if (token.mesh) {
      token.mesh.visible = false;
    }
  });
  Hooks.on("refreshTile", (tile) => {
    var _a;
    if (!((_a = window.StorytellerCinema) == null ? void 0 : _a.active)) {
      if (tile.mesh) tile.mesh.visible = true;
      return;
    }
    if (tile.mesh) {
      tile.mesh.visible = false;
    }
  });
}
export {
  registerRenderHooks as r
};
//# sourceMappingURL=render.js.map
