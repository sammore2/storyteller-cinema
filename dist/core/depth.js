function applyVisualDepth(token) {
  var _a;
  if (!token.mesh || !token.scene) return;
  const screenHeight = canvas.app.renderer.screen.height;
  const refHeightPercent = game.settings.get("storyteller-cinema", "referenceHeight") || 30;
  const targetPx = screenHeight * (refHeightPercent / 100);
  const texHeight = token.document.texture.src ? ((_a = token.texture) == null ? void 0 : _a.height) || 100 : 100;
  const autoScale = targetPx / texHeight;
  const gridSizeMult = Math.max(token.document.width, token.document.height);
  const docScaleX = token.document.texture.scaleX;
  const manualTweak = Math.abs(docScaleX) || 1;
  const quickZoom = token._cinemaScalePreview ?? token.document.getFlag("storyteller-cinema", "cinematicScale") ?? 1;
  const manualMultiplier = gridSizeMult * manualTweak * quickZoom;
  const sceneHeight = token.scene.dimensions.height;
  let ratio = token.y / sceneHeight;
  ratio = Math.max(0, Math.min(1, ratio));
  const minDepth = game.settings.get("storyteller-cinema", "minScale") || 0.5;
  const maxDepth = game.settings.get("storyteller-cinema", "maxScale") || 1;
  const depthFactor = minDepth + ratio * (maxDepth - minDepth);
  const finalScale = autoScale * manualMultiplier * depthFactor;
  if (Number.isFinite(finalScale)) {
    const sign = Math.sign(docScaleX) || 1;
    token.mesh.scale.set(finalScale * sign, finalScale);
    token.mesh.rotation = 0;
  }
}
export {
  applyVisualDepth as a
};
//# sourceMappingURL=depth.js.map
