Hooks.once("init", async function() {
  console.log("Storyteller Cinema | Iniciado"), game.settings.register("storyteller-cinema", "minScale", {
    name: "Escala Mínima (Fundo)",
    hint: "Tamanho do token quando estiver no topo da cena (0.0 a 1.0).",
    scope: "world",
    config: !0,
    type: Number,
    default: 0.6
  }), game.settings.register("storyteller-cinema", "maxScale", {
    name: "Escala Máxima (Frente)",
    hint: "Tamanho do token quando estiver na parte inferior da cena (1.0 ou mais).",
    scope: "world",
    config: !0,
    type: Number,
    default: 1.2
  });
});
Hooks.on("getSceneControlButtons", (e) => {
  const o = e.find((n) => n.name === "token");
  o && o.tools.push({
    name: "cinematic",
    title: "Modo Cinema",
    icon: "fas fa-film",
    toggle: !0,
    active: document.body.classList.contains("cinematic-mode"),
    onClick: (n) => {
      n ? document.body.classList.add("cinematic-mode") : document.body.classList.remove("cinematic-mode");
    }
  });
});
Hooks.on("updateToken", (e, o, n, a) => {
  if (!o.y && !o.x) return;
  const t = e.object;
  if (!t || !t.scene) return;
  const s = t.scene.dimensions.height, c = t.y, l = Math.max(0, Math.min(1, c / s)), i = game.settings.get("storyteller-cinema", "minScale"), m = game.settings.get("storyteller-cinema", "maxScale"), r = i + l * (m - i);
  t.mesh.scale.set(r);
});
Hooks.on("refreshToken", (e) => {
  if (!e.scene) return;
  const o = e.scene.dimensions.height, n = Math.max(0, Math.min(1, e.y / o)), a = game.settings.get("storyteller-cinema", "minScale"), t = game.settings.get("storyteller-cinema", "maxScale"), s = a + n * (t - a);
  e.mesh.scale.set(s);
});
Hooks.on("renderSceneConfig", (e, o, n) => {
  const a = e.object.getFlag("storyteller-cinema", "mood") || "Normal", t = `
  < div class="form-group" >
      <label>Mood Cinemático</label>
      <div class="form-fields">
        <select name="flags.storyteller-cinema.mood">
          <option value="Normal" ${a === "Normal" ? "selected" : ""}>Normal</option>
          <option value="Noir" ${a === "Noir" ? "selected" : ""}>Noir</option>
          <option value="Blood" ${a === "Blood" ? "selected" : ""}>Blood</option>
        </select>
      </div>
      <p class="notes">Define um filtro visual global para esta cena.</p>
    </div >
  `;
  o.find('div[data-tab="basic"] .form-group').last().after(t);
});
Hooks.on("canvasReady", (e) => {
  document.body.classList.remove("filter-noir", "filter-blood");
  const o = e.scene.getFlag("storyteller-cinema", "mood");
  o === "Noir" ? document.body.classList.add("filter-noir") : o === "Blood" && document.body.classList.add("filter-blood");
});
//# sourceMappingURL=main.js.map
