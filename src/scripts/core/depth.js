/**
 * Aplica escala visual híbrida (Auto Viewport + Manual Config + Quick Zoom).
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

  // Manual Scale: Respeita o slider "Scale" da ficha do token (Ajuste Permanente)
  const docScaleX = token.document.texture.scaleX;
  const manualTweak = Math.abs(docScaleX) || 1;

  // --- NOVO: Cinematic Scale (Shift + Scroll - Ajuste Temporário/Rápido) ---
  // Prioriza o preview local (instantâneo) sobre o dado do banco (lento)
  const quickZoom = token._cinemaScalePreview ?? token.document.getFlag('storyteller-cinema', 'cinematicScale') ?? 1.0;

  // Combina todos os multiplicadores manuais
  const manualMultiplier = gridSizeMult * manualTweak * quickZoom;

  // --- 3. Depth Factor (Parallax) ---
  const sceneHeight = token.scene.dimensions.height;
  let ratio = token.y / sceneHeight;
  ratio = Math.max(0, Math.min(1, ratio));

  const minDepth = game.settings.get('storyteller-cinema', 'minScale') || 0.5;
  const maxDepth = game.settings.get('storyteller-cinema', 'maxScale') || 1.0;

  const depthFactor = minDepth + (ratio * (maxDepth - minDepth));

  // --- 4. Final Calculation ---
  // Agora inclui o quickZoom na conta!
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
