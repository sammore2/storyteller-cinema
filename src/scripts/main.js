import '../styles/style.scss';
import ViewModeSelect from '../components/ViewModeSelect.svelte';

// =============================================================================
// Settings & Init
// =============================================================================

Hooks.once('init', () => {
  console.log('Storyteller Cinema | 🎬 Initializing (CACHE CHECK: VER 2.0 - ATOMIC FLAGS)...');

  game.settings.register('storyteller-cinema', 'minScale', {
    name: 'Escala Mínima (Fundo)',
    hint: 'Tamanho quando o token está no topo da cena (0.0 a 1.0).',
    scope: 'world',
    config: true,
    type: Number,
    default: 1.0
  });

  game.settings.register('storyteller-cinema', 'maxScale', {
    name: 'Escala Visual Máxima (Frente)',
    hint: 'Tamanho visual quando o token está na parte inferior (perto).',
    scope: 'world',
    config: true,
    type: Number,
    default: 2.0
  });

  game.settings.register('storyteller-cinema', 'baseScale', {
    name: 'Escala Física Manual',
    hint: 'Usado apenas se a "Escala Inteligente" estiver desligada. Padrão: 1.5.',
    scope: 'world',
    config: true,
    type: Number,
    default: 1.5
  });

  game.settings.register('storyteller-cinema', 'smartScale', {
    name: 'Escala Inteligente (Auto-Adaptável)',
    hint: 'Ajusta automaticamente o tamanho do token baseado na altura da imagem de fundo. Garante consistência entre cenas de resoluções diferentes.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register('storyteller-cinema', 'sceneHeightPercentage', {
    name: '% da Altura da Cena',
    hint: 'Qual porcentagem da tela (altura) o token deve ocupar no modo inteligente? Padrão: 15%.',
    scope: 'world',
    config: true,
    type: Number,
    range: { min: 5, max: 90, step: 1 },
    default: 15
  });
});

// =============================================================================
// Core Logic: Toggle Cinematic Mode
// =============================================================================

/**
 * Alterna o modo cinemático.
 * Atualiza Texture e Scale via Document Update (Promise.all para garantia de execução).
 */
async function toggleCinematicMode(active) {
  console.log(`Storyteller Cinema | 🔄 Toggling Mode: ${active ? 'ON' : 'OFF'}`);

  if (canvas.tokens.placeables.length === 0) {
    console.log("Storyteller Cinema | ⚠️ Nenhum token na cena para transformar.");
    if (active) document.body.classList.add('cinematic-mode');
    else document.body.classList.remove('cinematic-mode');
    return;
  }

  // Lógica de Escala Global
  let globalBaseScale = 1.5;
  const useSmartScale = game.settings.get('storyteller-cinema', 'smartScale');

  if (useSmartScale && canvas.scene) {
    try {
      const height = canvas.scene.dimensions.height;
      const gridSize = canvas.scene.grid.size;
      const percent = game.settings.get('storyteller-cinema', 'sceneHeightPercentage') / 100;

      const targetPixels = height * percent;
      globalBaseScale = targetPixels / gridSize;

      console.log(`Storyteller Cinema | 📏 Smart Scale Calc: Height ${height}px * ${percent} = ${targetPixels}px / Grid ${gridSize} = Scale ${globalBaseScale.toFixed(2)}`);
    } catch (e) {
      console.error("Storyteller Cinema | ❌ Erro ao calcular Smart Scale:", e);
      globalBaseScale = game.settings.get('storyteller-cinema', 'baseScale');
    }
  } else {
    globalBaseScale = game.settings.get('storyteller-cinema', 'baseScale');
  }

  if (active) {
    document.body.classList.add('cinematic-mode');

    const updatePromises = [];
    for (const token of canvas.tokens.placeables) {
      if (!token.actor) continue;

      // Objeto de Update Atômico
      const updateData = {};

      // 1. Persistência de Estado (Snapshot)
      const savedOriginal = token.document.getFlag('storyteller-cinema', 'originalState');

      if (!savedOriginal) {
        // Usa sintaxe de objeto aninhado para garantir persistência correta de Objetos em Flags
        updateData.flags = {
          "storyteller-cinema": {
            originalState: {
              src: token.document.texture.src,
              scaleX: token.document.texture.scaleX,
              scaleY: token.document.texture.scaleY
            }
          }
        };
        console.log(`Storyteller Cinema | 💾 Planning to Save Original State for [${token.name}]:`, updateData.flags["storyteller-cinema"].originalState);
      } else {
        console.log(`Storyteller Cinema | ℹ️ Original State already exists for [${token.name}]. Skipping snapshot.`);
      }

      // Determina a escala final
      const overrideScale = token.document.getFlag('storyteller-cinema', 'cinematicScaleOverride');
      const finalScale = (overrideScale !== undefined && overrideScale !== null && overrideScale > 0) ? overrideScale : globalBaseScale;

      // 2. Preparar Transformação
      const targetImg = token.actor.img;
      const currentScale = token.document.texture.scaleX;

      const needsUpdate =
        updateData.flags || // Tem flags para salvar
        (targetImg && (token.document.texture.src !== targetImg || Math.abs(currentScale - finalScale) > 0.05));

      if (needsUpdate) {
        // Prepara dados de textura de forma aninhada também
        if (!updateData.texture) updateData.texture = {};
        updateData.texture.src = targetImg;
        updateData.texture.scaleX = finalScale;
        updateData.texture.scaleY = finalScale;

        updatePromises.push(token.document.update(updateData));
      }
    }

    if (updatePromises.length > 0) {
      console.log(`Storyteller Cinema | 🎬 Applying Metamorphosis to ${updatePromises.length} tokens (Promise.all)...`);
      await Promise.all(updatePromises);
    }

  } else {
    document.body.classList.remove('cinematic-mode');

    const updatePromises = [];
    for (const token of canvas.tokens.placeables) {
      // 1. Recuperar do Flag (Persistência)
      const savedOriginal = token.document.getFlag('storyteller-cinema', 'originalState');

      if (savedOriginal) {
        console.log(`Storyteller Cinema | 🔙 Restoring [${token.name}] using DB Flags...`);
        // Restaura mantendo estrutura limpa
        const updateData = {
          texture: {
            src: savedOriginal.src,
            scaleX: savedOriginal.scaleX,
            scaleY: savedOriginal.scaleY
          },
          flags: {
            "storyteller-cinema": {
              "-=originalState": null
            }
          }
        };
        updatePromises.push(token.document.update(updateData));
      }
      else {
        console.log(`Storyteller Cinema | ⚠️ No saved state for [${token.name}]. Assuming already restored.`);
      }
    }

    if (updatePromises.length > 0) {
      console.log(`Storyteller Cinema | 🔙 Restoring ${updatePromises.length} tokens (Promise.all)...`);
      await Promise.all(updatePromises);
    }
  }
}

// =============================================================================
// Hooks: UI Injection (No jQuery)
// =============================================================================

Hooks.on('renderSceneConfig', (app, html, data) => {
  const scene = app.document ?? app.object;
  if (!scene) return;

  console.log("Storyteller Cinema | ✅ Scene Config Renderizada.");

  // Resolve o elemento HTML nativo de forma segura
  // html no Foundry pode ser um jQuery object ou HTMLElement
  let formElement = html;
  if (html && typeof html.jquery !== 'undefined') {
    formElement = html[0];
  } else if (!(html instanceof HTMLElement)) {
    // Fallback extremo se não for nenhum dos dois
    return;
  }

  // Debug para garantir
  if (!formElement) return;

  // Ponto de montagem Svelte
  const mountPoint = document.createElement('div');
  mountPoint.className = 'storyteller-cinema-mount form-group';

  // Estratégia de Injeção: Background Color Field
  // Procura pelo input de cor de fundo
  const bgInput = formElement.querySelector('input[name="backgroundColor"], input[name="data.backgroundColor"]');

  if (bgInput) {
    // Encontra o container .form-group pai
    const formGroup = bgInput.closest('.form-group');
    if (formGroup) {
      formGroup.after(mountPoint);
    } else {
      // Se não achar o grupo, injeta depois do input mesmo
      bgInput.after(mountPoint);
    }
  } else {
    // Fallback: Botão de submit
    const submitBtn = formElement.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.before(mountPoint);
    } else {
      // Fallback final: append no form
      const form = formElement.tagName === 'FORM' ? formElement : formElement.querySelector('form');
      if (form) form.appendChild(mountPoint);
      else formElement.appendChild(mountPoint);
    }
  }

  // Montagem do Componente Svelte
  new ViewModeSelect({
    target: mountPoint,
    props: { scene }
  });
});

/**
 * Injeção no Token Layer (Botão Lateral)
 */
Hooks.on('getSceneControlButtons', (controls) => {
  // Conversão robusta para Array
  const controlList = Array.isArray(controls) ? controls : Object.values(controls);

  // Procura por layer 'token' ou 'tokens'
  const tokenLayer = controlList.find(c => c.name === 'token' || c.name === 'tokens');

  if (tokenLayer && Array.isArray(tokenLayer.tools)) {
    if (tokenLayer.tools.some(t => t.name === 'cinematic')) return;

    tokenLayer.tools.push({
      name: 'cinematic',
      title: 'Modo Cinema',
      icon: 'fas fa-film',
      button: true,
      toggle: true,
      active: document.body.classList.contains('cinematic-mode'),
      onClick: async (toggled) => {
        await toggleCinematicMode(toggled);
      }
    });
  }
});

/**
 * Automação ao Carregar Cena (Canvas Ready)
 */
/**
 * Injeção na Configuração do Token (Override de Escala)
 */
Hooks.on('renderTokenConfig', (app, html, data) => {
  const token = app.document ?? app.object;
  if (!token) return;

  // Resolve elemento
  let formElement = html;
  if (html && typeof html.jquery !== 'undefined') formElement = html[0];
  else if (!(html instanceof HTMLElement)) return;

  if (!formElement) return;

  // Valor atual ou vazio
  const currentOverride = token.getFlag('storyteller-cinema', 'cinematicScaleOverride');

  // HTML do campo
  const formGroup = document.createElement('div');
  formGroup.className = 'form-group slim'; // 'slim' para alinhar melhor em abas
  formGroup.innerHTML = `
    <label>Escala Cinemática (Override)</label>
    <div class="form-fields">
        <input type="number" step="0.1" name="flags.storyteller-cinema.cinematicScaleOverride" placeholder="Global (${game.settings.get('storyteller-cinema', 'baseScale')})" value="${currentOverride ?? ''}">
    </div>
    <p class="notes">Deixe em branco para usar a escala global. Define o tamanho deste token específico no modo cinema.</p>
  `;

  // Injeção na aba 'appearance' (Aparência) ou 'scale' slider
  const scaleInput = formElement.querySelector('input[name="scale"], input[name="texture.scaleX"]');
  if (scaleInput) {
    const group = scaleInput.closest('.form-group');
    if (group) group.after(formGroup);
    else scaleInput.after(formGroup);
  } else {
    // Fallback
    const lastGroup = formElement.querySelector('.form-group:last-child');
    if (lastGroup) lastGroup.after(formGroup);
  }
});

/**
 * Automação ao Carregar Cena (Canvas Ready)
 */
Hooks.on('canvasReady', async (canvas) => {
  const scene = canvas.scene;
  if (!scene) return;

  console.log(`Storyteller Cinema | 🏁 Canvas Ready - Checking View Mode...`);

  const viewMode = scene.getFlag('storyteller-cinema', 'viewMode');
  console.log(`Storyteller Cinema | 🏳️ Flag 'viewMode': ${viewMode}`);

  const shouldActivate = viewMode === 'cinematic';

  if (shouldActivate) {
    console.log(`🎬 Storyteller Cinema | Cena [${scene.name}] configurada para MODO CINEMÁTICO. Ativando Metamorfose.`);
  }

  await toggleCinematicMode(shouldActivate);
});

// =============================================================================
// Hooks: Visual Depth Scaling
// =============================================================================

function applyDepthScaling(token) {
  if (!document.body.classList.contains('cinematic-mode')) return;
  if (!token.scene || !token.mesh) return;

  const sceneHeight = token.scene.dimensions.height;
  const tokenY = token.y;
  const ratio = Math.max(0, Math.min(1, tokenY / sceneHeight));

  const minScale = game.settings.get('storyteller-cinema', 'minScale');
  const maxScale = game.settings.get('storyteller-cinema', 'maxScale');

  // Interpolação Linear (Fator de Profundidade)
  const depthFactor = minScale + (ratio * (maxScale - minScale));

  // Escala Base (Física) do Token
  const baseScale = token.document.texture.scaleX;

  // Aplica Multiplicação (Base * Profundidade)
  token.mesh.scale.set(baseScale * depthFactor);
}

Hooks.on('updateToken', (tokenDocument, changes, context, userId) => {
  if (changes.y === undefined && changes.x === undefined) return;
  const token = tokenDocument.object;
  if (token) applyDepthScaling(token);
});

Hooks.on('refreshToken', (token) => {
  applyDepthScaling(token);
});
