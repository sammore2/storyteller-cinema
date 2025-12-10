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
  let o = null;
  if (Array.isArray(e) ? (o = e.find((t) => t.name === "token"), o && console.log("Storyteller Cinema | ✅ Detectado formato Array.")) : typeof e == "object" && e !== null && (e.token ? (o = e.token, console.log("Storyteller Cinema | ✅ Detectado formato Objeto (Propriedade Direta).")) : e.token && (o = e.token, console.log("Storyteller Cinema | ✅ Detectado formato Objeto (Chave)."))), o && Array.isArray(o.tools)) {
    if (o.tools.find((t) => t.name === "cinematic"))
      return;
    o.tools.push({
      name: "cinematic",
      title: "Modo Cinema",
      icon: "fas fa-film",
      toggle: !0,
      active: document.body.classList.contains("cinematic-mode"),
      onClick: (t) => {
        t ? document.body.classList.add("cinematic-mode") : document.body.classList.remove("cinematic-mode");
      }
    }), console.log("Storyteller Cinema | ✅ Botão injetado via " + (Array.isArray(e) ? "Array" : "Objeto"));
  } else
    console.warn("Storyteller Cinema | ⚠️ Layer 'token' não encontrada ou inválida nos controles fornecidos.", e);
});
Hooks.on("updateToken", (e, o, t, n) => {
  if (!o.y && !o.x) return;
  const a = e.object;
  if (!a || !a.scene) return;
  const i = a.scene.dimensions.height, l = a.y, r = Math.max(0, Math.min(1, l / i)), s = game.settings.get("storyteller-cinema", "minScale"), c = game.settings.get("storyteller-cinema", "maxScale"), m = s + r * (c - s);
  a.mesh.scale.set(m);
});
Hooks.on("refreshToken", (e) => {
  if (!e.scene) return;
  const o = e.scene.dimensions.height, t = Math.max(0, Math.min(1, e.y / o)), n = game.settings.get("storyteller-cinema", "minScale"), a = game.settings.get("storyteller-cinema", "maxScale"), i = n + t * (a - n);
  e.mesh.scale.set(i);
});
Hooks.on("renderSceneConfig", (e, o, t) => {
  const n = e.object.getFlag("storyteller-cinema", "mood") || "Normal", a = `
  <div class="form-group">
      <label>Mood Cinemático</label>
      <div class="form-fields">
        <select name="flags.storyteller-cinema.mood">
          <option value="Normal" ${n === "Normal" ? "selected" : ""}>Normal</option>
          <option value="Noir" ${n === "Noir" ? "selected" : ""}>Noir</option>
          <option value="Blood" ${n === "Blood" ? "selected" : ""}>Blood</option>
        </select>
      </div>
      <p class="notes">Define um filtro visual global para esta cena.</p>
    </div>
  `;
  o.find('div[data-tab="basic"] .form-group').last().after(a);
});
Hooks.on("canvasReady", (e) => {
  document.body.classList.remove("filter-noir", "filter-blood");
  const o = e.scene.getFlag("storyteller-cinema", "mood");
  o === "Noir" ? document.body.classList.add("filter-noir") : o === "Blood" && document.body.classList.add("filter-blood");
});
//# sourceMappingURL=main.js.map
