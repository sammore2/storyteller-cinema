import '../styles/style.scss';

Hooks.once('init', async function () {
  console.log('Storyteller Cinema | Iniciado');

  // Register World Settings for Scale Limits
  game.settings.register('storyteller-cinema', 'minScale', {
    name: 'Escala Mínima (Fundo)',
    hint: 'Tamanho do token quando estiver no topo da cena (0.0 a 1.0).',
    scope: 'world',
    config: true,
    type: Number,
    default: 0.6
  });

  game.settings.register('storyteller-cinema', 'maxScale', {
    name: 'Escala Máxima (Frente)',
    hint: 'Tamanho do token quando estiver na parte inferior da cena (1.0 ou mais).',
    scope: 'world',
    config: true,
    type: Number,
    default: 1.2
  });
});

/**
 * Adds the Cinematic Mode toggle button to the Token Layer controls.
 */
Hooks.on('getSceneControlButtons', (controls) => {
  let tokenLayer = null;

  // Lógica Híbrida (Camaleão): Adapta-se ao formato recebido (Array ou Objeto)
  if (Array.isArray(controls)) {
    tokenLayer = controls.find(c => c.name === 'token');
    if (tokenLayer) console.log("Storyteller Cinema | ✅ Detectado formato Array.");
  } else if (typeof controls === 'object' && controls !== null) {
    // Tenta acesso direto por propriedade (comum em estruturas de chave-valor/Map)
    if (controls.token) {
      tokenLayer = controls.token;
      console.log("Storyteller Cinema | ✅ Detectado formato Objeto (Propriedade Direta).");
    } else if (controls['token']) {
      tokenLayer = controls['token'];
      console.log("Storyteller Cinema | ✅ Detectado formato Objeto (Chave).");
    }
  }

  // Validação: Se encontrou a layer e ela possui ferramentas (tools)
  if (tokenLayer && Array.isArray(tokenLayer.tools)) {
    // Verificação de duplicatas antes de injetar
    if (tokenLayer.tools.find(t => t.name === 'cinematic')) {
      // Botão já existe, nada a fazer
      return;
    }

    tokenLayer.tools.push({
      name: 'cinematic',
      title: 'Modo Cinema',
      icon: 'fas fa-film',
      toggle: true,
      active: document.body.classList.contains('cinematic-mode'),
      onClick: (toggled) => {
        if (toggled) document.body.classList.add('cinematic-mode');
        else document.body.classList.remove('cinematic-mode');
      }
    });
    console.log("Storyteller Cinema | ✅ Botão injetado via " + (Array.isArray(controls) ? "Array" : "Objeto"));
  } else {
    // Log silencioso ou warning dependendo da severidade desejada, aqui mantemos informativo
    console.warn("Storyteller Cinema | ⚠️ Layer 'token' não encontrada ou inválida nos controles fornecidos.", controls);
  }
});

/**
 * Applies visual depth scaling to tokens based on their Y position.
 * This effect is purely visual (Client-Side) and alters the Mesh scale.
 */
Hooks.on('updateToken', (tokenDocument, changes, context, userId) => {
  // Only apply if strictly necessary changes occurred (y position) or on full refresh logic
  if (!changes.y && !changes.x) return;

  const token = tokenDocument.object;
  if (!token || !token.scene) return;

  const sceneHeight = token.scene.dimensions.height;
  const tokenY = token.y;

  // Calculate ratio (0 at top, 1 at bottom)
  const ratio = Math.max(0, Math.min(1, tokenY / sceneHeight));

  const minScale = game.settings.get('storyteller-cinema', 'minScale');
  const maxScale = game.settings.get('storyteller-cinema', 'maxScale');

  // Interpolate scale
  const newScale = minScale + (ratio * (maxScale - minScale));

  // Apply to Mesh only (does not save to DB)
  token.mesh.scale.set(newScale);
});

// Also apply scale on Token Refresh/Draw to ensure initial state is correct
Hooks.on('refreshToken', (token) => {
  if (!token.scene) return;
  const sceneHeight = token.scene.dimensions.height;
  const ratio = Math.max(0, Math.min(1, token.y / sceneHeight));
  const minScale = game.settings.get('storyteller-cinema', 'minScale');
  const maxScale = game.settings.get('storyteller-cinema', 'maxScale');
  const newScale = minScale + (ratio * (maxScale - minScale));
  token.mesh.scale.set(newScale);
});

/**
 * Injects the "Mood" selection into the Scene Configuration dialog logic.
 */
Hooks.on('renderSceneConfig', (app, html, data) => {
  const mood = app.object.getFlag('storyteller-cinema', 'mood') || 'Normal';

  const formGroup = `
  <div class="form-group">
      <label>Mood Cinemático</label>
      <div class="form-fields">
        <select name="flags.storyteller-cinema.mood">
          <option value="Normal" ${mood === 'Normal' ? 'selected' : ''}>Normal</option>
          <option value="Noir" ${mood === 'Noir' ? 'selected' : ''}>Noir</option>
          <option value="Blood" ${mood === 'Blood' ? 'selected' : ''}>Blood</option>
        </select>
      </div>
      <p class="notes">Define um filtro visual global para esta cena.</p>
    </div>
  `;

  // Inject into the "Basic" tab (usually the first tab)
  html.find('div[data-tab="basic"] .form-group').last().after(formGroup);
});

/**
 * Applies the specific Scene Mood filter when the Canvas is ready.
 */
Hooks.on('canvasReady', (canvas) => {
  // Remove existing filters
  document.body.classList.remove('filter-noir', 'filter-blood');

  const mood = canvas.scene.getFlag('storyteller-cinema', 'mood');
  if (mood === 'Noir') {
    document.body.classList.add('filter-noir');
  } else if (mood === 'Blood') {
    document.body.classList.add('filter-blood');
  }
});
