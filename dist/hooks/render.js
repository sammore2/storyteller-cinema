function registerRenderHooks() {
  Hooks.on("refreshToken", (token) => {
    var _a;
    const active = (_a = window.StorytellerCinema) == null ? void 0 : _a.active;
    if (!active) {
      if (token.mesh) token.mesh.visible = true;
      if (token.bars) token.bars.visible = true;
      if (token.nameplate) token.nameplate.visible = true;
      return;
    }
    if (token.mesh) {
      token.mesh.visible = false;
    }
    if (token.bars) token.bars.visible = false;
    if (token.nameplate) token.nameplate.visible = false;
    if (token.effects) token.effects.visible = false;
    if (token.targetArrows) token.targetArrows.visible = false;
    if (token.targetPips) token.targetPips.visible = false;
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
