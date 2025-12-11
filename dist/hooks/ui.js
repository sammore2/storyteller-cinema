import { t as toggleCinematicMode } from "../core/cinematic.js";
import { S as SvelteComponent, i as init, s as safe_not_equal, n as noop, d as detach, a as select_option, b as insert, c as append, l as listen, e as element, f as space, g as attr, h as set_input_value } from "../vendor.js";
function create_fragment(ctx) {
  let div1;
  let label;
  let t1;
  let div0;
  let select;
  let option0;
  let option1;
  let t4;
  let p;
  let mounted;
  let dispose;
  return {
    c() {
      div1 = element("div");
      label = element("label");
      label.textContent = "Visualização Padrão";
      t1 = space();
      div0 = element("div");
      select = element("select");
      option0 = element("option");
      option0.textContent = "📍 Battlemap (Tático)";
      option1 = element("option");
      option1.textContent = "🎬 Cinematic (Imersivo)";
      t4 = space();
      p = element("p");
      p.textContent = "Define se esta cena deve abrir automaticamente no Modo Cinemático (Troca de\r\n    assets, Escala de Profundidade).";
      attr(label, "for", "viewModeSelect");
      option0.__value = "battlemap";
      set_input_value(option0, option0.__value);
      option1.__value = "cinematic";
      set_input_value(option1, option1.__value);
      attr(select, "id", "viewModeSelect");
      attr(div0, "class", "form-fields");
      attr(p, "class", "notes");
      attr(div1, "class", "form-group");
    },
    m(target, anchor) {
      insert(target, div1, anchor);
      append(div1, label);
      append(div1, t1);
      append(div1, div0);
      append(div0, select);
      append(select, option0);
      append(select, option1);
      select_option(
        select,
        /*viewMode*/
        ctx[0]
      );
      append(div1, t4);
      append(div1, p);
      if (!mounted) {
        dispose = listen(
          select,
          "change",
          /*updateViewMode*/
          ctx[1]
        );
        mounted = true;
      }
    },
    p(ctx2, [dirty]) {
      if (dirty & /*viewMode*/
      1) {
        select_option(
          select,
          /*viewMode*/
          ctx2[0]
        );
      }
    },
    i: noop,
    o: noop,
    d(detaching) {
      if (detaching) {
        detach(div1);
      }
      mounted = false;
      dispose();
    }
  };
}
function instance($$self, $$props, $$invalidate) {
  let { scene } = $$props;
  let viewMode = scene.getFlag("storyteller-cinema", "viewMode") || "battlemap";
  async function updateViewMode(event) {
    $$invalidate(0, viewMode = event.target.value);
    await scene.setFlag("storyteller-cinema", "viewMode", viewMode);
    console.log(`Storyteller Cinema | 🎬 View Mode set to: ${viewMode}`);
  }
  $$self.$$set = ($$props2) => {
    if ("scene" in $$props2) $$invalidate(2, scene = $$props2.scene);
  };
  return [viewMode, updateViewMode, scene];
}
class ViewModeSelect extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance, create_fragment, safe_not_equal, { scene: 2 });
  }
}
function registerUIHooks() {
  Hooks.on("getSceneControlButtons", (controls) => {
    const controlList = Array.isArray(controls) ? controls : Object.values(controls);
    const tokenLayer = controlList.find((c) => c.name === "token");
    if (tokenLayer && tokenLayer.tools) {
      if (!tokenLayer.tools.some((t) => t.name === "cinematic")) {
        tokenLayer.tools.push({
          name: "cinematic",
          title: "Modo Cinema 2.5D",
          icon: "fas fa-film",
          toggle: true,
          active: document.body.classList.contains("cinematic-mode"),
          onClick: async (tog) => await toggleCinematicMode(tog)
        });
      }
    }
  });
  Hooks.on("renderSceneConfig", (app, html) => {
    const scene = app.document ?? app.object;
    if (!scene) return;
    let root = html;
    if (html.jquery) root = html[0];
    if (!(root instanceof HTMLElement)) return;
    const submitBtn = root.querySelector('button[type="submit"]');
    if (submitBtn) {
      if (root.querySelector(".storyteller-cinema-mount")) return;
      const mountPoint = document.createElement("div");
      mountPoint.className = "form-group storyteller-cinema-mount";
      submitBtn.parentElement.insertBefore(mountPoint, submitBtn);
      new ViewModeSelect({ target: mountPoint, props: { scene } });
    }
  });
  window.addEventListener("wheel", (event) => {
    var _a;
    if (!event.shiftKey || !document.body.classList.contains("cinematic-mode")) return;
    const hoverToken = (_a = canvas.tokens) == null ? void 0 : _a.hover;
    if (!hoverToken) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const delta = event.deltaY > 0 ? -0.05 : 0.05;
    const currentScale = hoverToken.document.getFlag("storyteller-cinema", "cinematicScale") || 1;
    let newScale = currentScale + delta;
    newScale = Math.max(0.1, Math.min(5, newScale));
    newScale = Math.round(newScale * 100) / 100;
    hoverToken.document.setFlag("storyteller-cinema", "cinematicScale", newScale);
  }, { passive: false, capture: true });
}
export {
  registerUIHooks as r
};
//# sourceMappingURL=ui.js.map
