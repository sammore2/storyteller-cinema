<script>
  export let scene;

  // Inicializa o estado com o valor atual da flag ou padrão 'battlemap'
  let viewMode = scene.getFlag("storyteller-cinema", "viewMode") || "battlemap";

  /**
   * Atualiza a flag quando o valor do select muda.
   */
  async function updateViewMode(event) {
    viewMode = event.target.value;
    await scene.setFlag("storyteller-cinema", "viewMode", viewMode);
    console.log(`Storyteller Cinema | 🎬 View Mode set to: ${viewMode}`);
  }
</script>

<div class="form-group">
  <label for="viewModeSelect">Visualização Padrão</label>
  <div class="form-fields">
    <select id="viewModeSelect" value={viewMode} on:change={updateViewMode}>
      <option value="battlemap">📍 Battlemap (Tático)</option>
      <option value="cinematic">🎬 Cinematic (Imersivo)</option>
    </select>
  </div>
  <p class="notes">
    Define se esta cena deve abrir automaticamente no Modo Cinemático (Troca de
    assets, Escala de Profundidade).
  </p>
</div>
