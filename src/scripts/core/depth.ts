/**
 * Applies hybrid visual scale (Auto Viewport + Manual Config + Quick Zoom).
 */
export function applyVisualDepth(token: any): void {
  if (!token.mesh || !token.scene || !canvas.app) return;

  // --- 1. Math: Viewport Target (Auto Scale) ---
  const screenHeight = canvas.app.renderer.screen.height;

  // SAFE SETTINGS GETTER
  const getSettingSafe = (key: string, def: number): number => {
    if (!game.settings?.settings?.has(`storyteller-cinema.${key}`)) return def;
    return game.settings.get('storyteller-cinema', key) as number;
  };

  const refHeightPercent = getSettingSafe('referenceHeight', 35);

  // Target height in pixels
  const targetPx = screenHeight * (refHeightPercent / 100);

  // Texture height check
  const texHeight = Math.max(token.mesh?.texture?.height || 100, 100);
  
  // Auto scale to reach targetPx
  const autoScale = targetPx / texHeight;

  // --- 2. Manual Adjustments ---

  // Grid Size
  const gridSizeMult = Math.max(token.document.width, token.document.height);

  // Manual Scale
  const docScaleX = token.document.texture.scaleX || 1;
  const manualTweak = Math.abs(docScaleX) || 1;

  // Cinematic Scale (Shift + Scroll)
  const quickZoom = token._cinemaScalePreview ?? token.document.getFlag('storyteller-cinema', 'cinematicScale') ?? 1.0;

  // Combined multipliers
  const manualMultiplier = gridSizeMult * manualTweak * quickZoom;

  // --- 3. Depth Factor (Parallax) ---
  const sceneHeight = token.scene.dimensions.height;
  let ratio = token.y / sceneHeight;
  ratio = Math.max(0, Math.min(1, ratio));

  const minDepth = getSettingSafe('minScale', 0.5);
  const maxDepth = getSettingSafe('maxScale', 1.2);

  const depthFactor = minDepth + (ratio * (maxDepth - minDepth));

  // --- 4. Final Calculation ---
  const finalScale = autoScale * manualMultiplier * depthFactor;

  // --- 5. Application ---
  if (Number.isFinite(finalScale)) {
    const sign = Math.sign(docScaleX) || 1;
    token.mesh.scale.set(finalScale * sign, finalScale);
    token.mesh.rotation = 0; // Always upright
  }
}
