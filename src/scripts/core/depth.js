/**
 * Aplica APENAS escala de profundidade baseada em Y.
 */
export function applyVisualDepth(token) {
  if (!token.mesh || !token.scene) return;

  // Se modo desligado, reverte para escala original do documento e retorna
  if (!document.body.classList.contains('cinematic-mode')) {
    const originalScaleX = token.document.texture.scaleX;
    const originalScaleY = token.document.texture.scaleY;

    // Só aplica se diferente para evitar loop
    if (token.mesh.scale.x !== originalScaleX || token.mesh.scale.y !== originalScaleY) {
      token.mesh.scale.set(originalScaleX, originalScaleY);
    }
    return;
  }

  // --- Cálculo de Escala Simples ---
  const sceneHeight = token.scene.dimensions.height;

  // Ratio: 0.0 (Topo) -> 1.0 (Baixo)
  let ratio = token.y / sceneHeight;
  ratio = Math.max(0, Math.min(1, ratio));

  const minMult = game.settings.get('storyteller-cinema', 'minScale');
  const maxMult = game.settings.get('storyteller-cinema', 'maxScale');

  // Fator de Profundidade Linear
  const depthFactor = minMult + (ratio * (maxMult - minMult));

  // Escala Base do Documento (O tamanho físico que o usuário definiu)
  const baseScale = token.document.texture.scaleX;

  // Escala Final Visual
  const finalScale = baseScale * depthFactor;

  // Apply safely
  if (Number.isFinite(finalScale)) {
    token.mesh.scale.set(finalScale, finalScale);
  }
}
