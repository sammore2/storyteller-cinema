var D = Object.defineProperty;
var R = (e, t, o) => t in e ? D(e, t, { enumerable: !0, configurable: !0, writable: !0, value: o }) : e[t] = o;
var C = (e, t, o) => R(e, typeof t != "symbol" ? t + "" : t, o);
function v() {
}
function N(e) {
  return e();
}
function O() {
  return /* @__PURE__ */ Object.create(null);
}
function $(e) {
  e.forEach(N);
}
function I(e) {
  return typeof e == "function";
}
function V(e, t) {
  return e != e ? t == t : e !== t || e && typeof e == "object" || typeof e == "function";
}
function X(e) {
  return Object.keys(e).length === 0;
}
function f(e, t) {
  e.appendChild(t);
}
function G(e, t, o) {
  e.insertBefore(t, o || null);
}
function T(e) {
  e.parentNode && e.parentNode.removeChild(e);
}
function g(e) {
  return document.createElement(e);
}
function Y(e) {
  return document.createTextNode(e);
}
function A() {
  return Y(" ");
}
function z(e, t, o, n) {
  return e.addEventListener(t, o, n), () => e.removeEventListener(t, o, n);
}
function b(e, t, o) {
  o == null ? e.removeAttribute(t) : e.getAttribute(t) !== o && e.setAttribute(t, o);
}
function U(e) {
  return Array.from(e.childNodes);
}
function F(e, t) {
  e.value = t ?? "";
}
function P(e, t, o) {
  for (let n = 0; n < e.options.length; n += 1) {
    const a = e.options[n];
    if (a.__value === t) {
      a.selected = !0;
      return;
    }
  }
  e.selectedIndex = -1;
}
let M;
function _(e) {
  M = e;
}
const h = [], H = [];
let S = [];
const L = [], K = /* @__PURE__ */ Promise.resolve();
let k = !1;
function Q() {
  k || (k = !0, K.then(j));
}
function w(e) {
  S.push(e);
}
const x = /* @__PURE__ */ new Set();
let y = 0;
function j() {
  if (y !== 0)
    return;
  const e = M;
  do {
    try {
      for (; y < h.length; ) {
        const t = h[y];
        y++, _(t), J(t.$$);
      }
    } catch (t) {
      throw h.length = 0, y = 0, t;
    }
    for (_(null), h.length = 0, y = 0; H.length; ) H.pop()();
    for (let t = 0; t < S.length; t += 1) {
      const o = S[t];
      x.has(o) || (x.add(o), o());
    }
    S.length = 0;
  } while (h.length);
  for (; L.length; )
    L.pop()();
  k = !1, x.clear(), _(e);
}
function J(e) {
  if (e.fragment !== null) {
    e.update(), $(e.before_update);
    const t = e.dirty;
    e.dirty = [-1], e.fragment && e.fragment.p(e.ctx, t), e.after_update.forEach(w);
  }
}
function W(e) {
  const t = [], o = [];
  S.forEach((n) => e.indexOf(n) === -1 ? t.push(n) : o.push(n)), o.forEach((n) => n()), S = t;
}
const Z = /* @__PURE__ */ new Set();
function ee(e, t) {
  e && e.i && (Z.delete(e), e.i(t));
}
function te(e, t, o) {
  const { fragment: n, after_update: a } = e.$$;
  n && n.m(t, o), w(() => {
    const r = e.$$.on_mount.map(N).filter(I);
    e.$$.on_destroy ? e.$$.on_destroy.push(...r) : $(r), e.$$.on_mount = [];
  }), a.forEach(w);
}
function ne(e, t) {
  const o = e.$$;
  o.fragment !== null && (W(o.after_update), $(o.on_destroy), o.fragment && o.fragment.d(t), o.on_destroy = o.fragment = null, o.ctx = []);
}
function oe(e, t) {
  e.$$.dirty[0] === -1 && (h.push(e), Q(), e.$$.dirty.fill(0)), e.$$.dirty[t / 31 | 0] |= 1 << t % 31;
}
function ae(e, t, o, n, a, r, s = null, i = [-1]) {
  const c = M;
  _(e);
  const l = e.$$ = {
    fragment: null,
    ctx: [],
    // state
    props: r,
    update: v,
    not_equal: a,
    bound: O(),
    // lifecycle
    on_mount: [],
    on_destroy: [],
    on_disconnect: [],
    before_update: [],
    after_update: [],
    context: new Map(t.context || (c ? c.$$.context : [])),
    // everything else
    callbacks: O(),
    dirty: i,
    skip_bound: !1,
    root: t.target || c.$$.root
  };
  s && s(l.root);
  let d = !1;
  if (l.ctx = o ? o(e, t.props || {}, (u, m, ...p) => {
    const E = p.length ? p[0] : m;
    return l.ctx && a(l.ctx[u], l.ctx[u] = E) && (!l.skip_bound && l.bound[u] && l.bound[u](E), d && oe(e, u)), m;
  }) : [], l.update(), d = !0, $(l.before_update), l.fragment = n ? n(l.ctx) : !1, t.target) {
    if (t.hydrate) {
      const u = U(t.target);
      l.fragment && l.fragment.l(u), u.forEach(T);
    } else
      l.fragment && l.fragment.c();
    t.intro && ee(e.$$.fragment), te(e, t.target, t.anchor), j();
  }
  _(c);
}
class re {
  constructor() {
    /**
     * ### PRIVATE API
     *
     * Do not use, may change at any time
     *
     * @type {any}
     */
    C(this, "$$");
    /**
     * ### PRIVATE API
     *
     * Do not use, may change at any time
     *
     * @type {any}
     */
    C(this, "$$set");
  }
  /** @returns {void} */
  $destroy() {
    ne(this, 1), this.$destroy = v;
  }
  /**
   * @template {Extract<keyof Events, string>} K
   * @param {K} type
   * @param {((e: Events[K]) => void) | null | undefined} callback
   * @returns {() => void}
   */
  $on(t, o) {
    if (!I(o))
      return v;
    const n = this.$$.callbacks[t] || (this.$$.callbacks[t] = []);
    return n.push(o), () => {
      const a = n.indexOf(o);
      a !== -1 && n.splice(a, 1);
    };
  }
  /**
   * @param {Partial<Props>} props
   * @returns {void}
   */
  $set(t) {
    this.$$set && !X(t) && (this.$$.skip_bound = !0, this.$$set(t), this.$$.skip_bound = !1);
  }
}
const se = "4";
typeof window < "u" && (window.__svelte || (window.__svelte = { v: /* @__PURE__ */ new Set() })).v.add(se);
function ie(e) {
  let t, o, n, a, r, s, i, c, l, d, u;
  return {
    c() {
      t = g("div"), o = g("label"), o.textContent = "Visualização Padrão", n = A(), a = g("div"), r = g("select"), s = g("option"), s.textContent = "📍 Battlemap (Tático)", i = g("option"), i.textContent = "🎬 Cinematic (Imersivo)", c = A(), l = g("p"), l.textContent = `Define se esta cena deve abrir automaticamente no Modo Cinemático (Troca de\r
    assets, Escala de Profundidade).`, b(o, "for", "viewModeSelect"), s.__value = "battlemap", F(s, s.__value), i.__value = "cinematic", F(i, i.__value), b(r, "id", "viewModeSelect"), b(a, "class", "form-fields"), b(l, "class", "notes"), b(t, "class", "form-group");
    },
    m(m, p) {
      G(m, t, p), f(t, o), f(t, n), f(t, a), f(a, r), f(r, s), f(r, i), P(
        r,
        /*viewMode*/
        e[0]
      ), f(t, c), f(t, l), d || (u = z(
        r,
        "change",
        /*updateViewMode*/
        e[1]
      ), d = !0);
    },
    p(m, [p]) {
      p & /*viewMode*/
      1 && P(
        r,
        /*viewMode*/
        m[0]
      );
    },
    i: v,
    o: v,
    d(m) {
      m && T(t), d = !1, u();
    }
  };
}
function le(e, t, o) {
  let { scene: n } = t, a = n.getFlag("storyteller-cinema", "viewMode") || "battlemap";
  async function r(s) {
    o(0, a = s.target.value), await n.setFlag("storyteller-cinema", "viewMode", a), console.log(`Storyteller Cinema | 🎬 View Mode set to: ${a}`);
  }
  return e.$$set = (s) => {
    "scene" in s && o(2, n = s.scene);
  }, [a, r, n];
}
class ce extends re {
  constructor(t) {
    super(), ae(this, t, le, ie, V, { scene: 2 });
  }
}
Hooks.once("init", () => {
  console.log("Storyteller Cinema | 🎬 Initializing (CACHE CHECK: VER 2.0 - ATOMIC FLAGS)..."), game.settings.register("storyteller-cinema", "minScale", {
    name: "Escala Mínima (Fundo)",
    hint: "Tamanho quando o token está no topo da cena (0.0 a 1.0).",
    scope: "world",
    config: !0,
    type: Number,
    default: 1
  }), game.settings.register("storyteller-cinema", "maxScale", {
    name: "Escala Visual Máxima (Frente)",
    hint: "Tamanho visual quando o token está na parte inferior (perto).",
    scope: "world",
    config: !0,
    type: Number,
    default: 2
  }), game.settings.register("storyteller-cinema", "baseScale", {
    name: "Escala Física Manual",
    hint: 'Usado apenas se a "Escala Inteligente" estiver desligada. Padrão: 1.5.',
    scope: "world",
    config: !0,
    type: Number,
    default: 1.5
  }), game.settings.register("storyteller-cinema", "smartScale", {
    name: "Escala Inteligente (Auto-Adaptável)",
    hint: "Ajusta automaticamente o tamanho do token baseado na altura da imagem de fundo. Garante consistência entre cenas de resoluções diferentes.",
    scope: "world",
    config: !0,
    type: Boolean,
    default: !0
  }), game.settings.register("storyteller-cinema", "sceneHeightPercentage", {
    name: "% da Altura da Cena",
    hint: "Qual porcentagem da tela (altura) o token deve ocupar no modo inteligente? Padrão: 15%.",
    scope: "world",
    config: !0,
    type: Number,
    range: { min: 5, max: 90, step: 1 },
    default: 15
  });
});
async function q(e) {
  if (console.log(`Storyteller Cinema | 🔄 Toggling Mode: ${e ? "ON" : "OFF"}`), canvas.tokens.placeables.length === 0) {
    console.log("Storyteller Cinema | ⚠️ Nenhum token na cena para transformar."), e ? document.body.classList.add("cinematic-mode") : document.body.classList.remove("cinematic-mode");
    return;
  }
  let t = 1.5;
  if (game.settings.get("storyteller-cinema", "smartScale") && canvas.scene)
    try {
      const n = canvas.scene.dimensions.height, a = canvas.scene.grid.size, r = game.settings.get("storyteller-cinema", "sceneHeightPercentage") / 100, s = n * r;
      t = s / a, console.log(`Storyteller Cinema | 📏 Smart Scale Calc: Height ${n}px * ${r} = ${s}px / Grid ${a} = Scale ${t.toFixed(2)}`);
    } catch (n) {
      console.error("Storyteller Cinema | ❌ Erro ao calcular Smart Scale:", n), t = game.settings.get("storyteller-cinema", "baseScale");
    }
  else
    t = game.settings.get("storyteller-cinema", "baseScale");
  if (e) {
    document.body.classList.add("cinematic-mode");
    const n = [];
    for (const a of canvas.tokens.placeables) {
      if (!a.actor) continue;
      const r = {};
      a.document.getFlag("storyteller-cinema", "originalState") ? console.log(`Storyteller Cinema | ℹ️ Original State already exists for [${a.name}]. Skipping snapshot.`) : (r.flags = {
        "storyteller-cinema": {
          originalState: {
            src: a.document.texture.src,
            scaleX: a.document.texture.scaleX,
            scaleY: a.document.texture.scaleY
          }
        }
      }, console.log(`Storyteller Cinema | 💾 Planning to Save Original State for [${a.name}]:`, r.flags["storyteller-cinema"].originalState));
      const i = a.document.getFlag("storyteller-cinema", "cinematicScaleOverride"), c = i != null && i > 0 ? i : t, l = a.actor.img, d = a.document.texture.scaleX;
      (r.flags || // Tem flags para salvar
      l && (a.document.texture.src !== l || Math.abs(d - c) > 0.05)) && (r.texture || (r.texture = {}), r.texture.src = l, r.texture.scaleX = c, r.texture.scaleY = c, n.push(a.document.update(r)));
    }
    n.length > 0 && (console.log(`Storyteller Cinema | 🎬 Applying Metamorphosis to ${n.length} tokens (Promise.all)...`), await Promise.all(n));
  } else {
    document.body.classList.remove("cinematic-mode");
    const n = [];
    for (const a of canvas.tokens.placeables) {
      const r = a.document.getFlag("storyteller-cinema", "originalState");
      if (r) {
        console.log(`Storyteller Cinema | 🔙 Restoring [${a.name}] using DB Flags...`);
        const s = {
          texture: {
            src: r.src,
            scaleX: r.scaleX,
            scaleY: r.scaleY
          },
          flags: {
            "storyteller-cinema": {
              "-=originalState": null
            }
          }
        };
        n.push(a.document.update(s));
      } else
        console.log(`Storyteller Cinema | ⚠️ No saved state for [${a.name}]. Assuming already restored.`);
    }
    n.length > 0 && (console.log(`Storyteller Cinema | 🔙 Restoring ${n.length} tokens (Promise.all)...`), await Promise.all(n));
  }
}
Hooks.on("renderSceneConfig", (e, t, o) => {
  const n = e.document ?? e.object;
  if (!n) return;
  console.log("Storyteller Cinema | ✅ Scene Config Renderizada.");
  let a = t;
  if (t && typeof t.jquery < "u")
    a = t[0];
  else if (!(t instanceof HTMLElement))
    return;
  if (!a) return;
  const r = document.createElement("div");
  r.className = "storyteller-cinema-mount form-group";
  const s = a.querySelector('input[name="backgroundColor"], input[name="data.backgroundColor"]');
  if (s) {
    const i = s.closest(".form-group");
    i ? i.after(r) : s.after(r);
  } else {
    const i = a.querySelector('button[type="submit"]');
    if (i)
      i.before(r);
    else {
      const c = a.tagName === "FORM" ? a : a.querySelector("form");
      c ? c.appendChild(r) : a.appendChild(r);
    }
  }
  new ce({
    target: r,
    props: { scene: n }
  });
});
Hooks.on("getSceneControlButtons", (e) => {
  const o = (Array.isArray(e) ? e : Object.values(e)).find((n) => n.name === "token" || n.name === "tokens");
  if (o && Array.isArray(o.tools)) {
    if (o.tools.some((n) => n.name === "cinematic")) return;
    o.tools.push({
      name: "cinematic",
      title: "Modo Cinema",
      icon: "fas fa-film",
      button: !0,
      toggle: !0,
      active: document.body.classList.contains("cinematic-mode"),
      onClick: async (n) => {
        await q(n);
      }
    });
  }
});
Hooks.on("renderTokenConfig", (e, t, o) => {
  const n = e.document ?? e.object;
  if (!n) return;
  let a = t;
  if (t && typeof t.jquery < "u") a = t[0];
  else if (!(t instanceof HTMLElement)) return;
  if (!a) return;
  const r = n.getFlag("storyteller-cinema", "cinematicScaleOverride"), s = document.createElement("div");
  s.className = "form-group slim", s.innerHTML = `
    <label>Escala Cinemática (Override)</label>
    <div class="form-fields">
        <input type="number" step="0.1" name="flags.storyteller-cinema.cinematicScaleOverride" placeholder="Global (${game.settings.get("storyteller-cinema", "baseScale")})" value="${r ?? ""}">
    </div>
    <p class="notes">Deixe em branco para usar a escala global. Define o tamanho deste token específico no modo cinema.</p>
  `;
  const i = a.querySelector('input[name="scale"], input[name="texture.scaleX"]');
  if (i) {
    const c = i.closest(".form-group");
    c ? c.after(s) : i.after(s);
  } else {
    const c = a.querySelector(".form-group:last-child");
    c && c.after(s);
  }
});
Hooks.on("canvasReady", async (e) => {
  const t = e.scene;
  if (!t) return;
  console.log("Storyteller Cinema | 🏁 Canvas Ready - Checking View Mode...");
  const o = t.getFlag("storyteller-cinema", "viewMode");
  console.log(`Storyteller Cinema | 🏳️ Flag 'viewMode': ${o}`);
  const n = o === "cinematic";
  n && console.log(`🎬 Storyteller Cinema | Cena [${t.name}] configurada para MODO CINEMÁTICO. Ativando Metamorfose.`), await q(n);
});
function B(e) {
  if (!document.body.classList.contains("cinematic-mode") || !e.scene || !e.mesh) return;
  const t = e.scene.dimensions.height, o = e.y, n = Math.max(0, Math.min(1, o / t)), a = game.settings.get("storyteller-cinema", "minScale"), r = game.settings.get("storyteller-cinema", "maxScale"), s = a + n * (r - a), i = e.document.texture.scaleX;
  e.mesh.scale.set(i * s);
}
Hooks.on("updateToken", (e, t, o, n) => {
  if (t.y === void 0 && t.x === void 0) return;
  const a = e.object;
  a && B(a);
});
Hooks.on("refreshToken", (e) => {
  B(e);
});
//# sourceMappingURL=main.js.map
