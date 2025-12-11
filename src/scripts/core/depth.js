/**
 * Aplica escala visual híbrida (Auto Viewport + Manual Adjustment).
 */
export function applyVisualDepth(token) {
  if (!token.mesh || !token.scene) return;

  // --- 1. Math: Viewport Target (Auto Scale) ---
  const screenHeight = canvas.app.renderer.screen.height;
  const refHeightPercent = game.settings.get('storyteller-cinema', 'referenceHeight') || 30;

  // Altura alvo na tela em pixels
  const targetPx = screenHeight * (refHeightPercent / 100);

  // Altura da textura original
  const texHeight = token.document.texture.src ? (token.texture?.height || 100) : 100;

  // Escala automática para atingir o targetPx
  const autoScale = targetPx / texHeight;

  // --- 2. Manual Adjustments (User Control) ---

  // Grid Size: Tokens grandes (2x2) devem ser maiores
  const gridSizeMult = Math.max(token.document.width, token.document.height);

  // Manual Scale: Respeita o slider "Scale" da ficha do token.
  // Usamos Math.abs para pegar a magnitude do tamanho (ignorando flip por enquanto)
  const docScaleX = token.document.texture.scaleX;
  const manualTweak = Math.abs(docScaleX) || 1;

  const manualMultiplier = gridSizeMult * manualTweak;

  // --- 3. Depth Factor (Parallax) ---
  const sceneHeight = token.scene.dimensions.height;
  let ratio = token.y / sceneHeight;
  ratio = Math.max(0, Math.min(1, ratio));

  const minDepth = game.settings.get('storyteller-cinema', 'minScale') || 0.5;
  const maxDepth = game.settings.get('storyteller-cinema', 'maxScale') || 1.0;

  const depthFactor = minDepth + (ratio * (maxDepth - minDepth));

  // --- 4. Final Calculation ---
  const finalScale = autoScale * manualMultiplier * depthFactor;

  // --- 5. Application with Flip Preservation ---
  if (Number.isFinite(finalScale)) {
    // Detecta Flip Horizontal do Documento
    const sign = Math.sign(docScaleX) || 1;

    token.mesh.scale.set(finalScale * sign, finalScale);

    // Trava Rotação Visual (Sempre em pé)
    token.mesh.rotation = 0;
  }
}
