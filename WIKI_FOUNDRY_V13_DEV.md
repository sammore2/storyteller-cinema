# Guia Avançado de Desenvolvimento: Foundry VTT V13, Application V2 e JavaScript Moderno

Este documento serve como a "Bíblia" de consulta para o desenvolvimento deste projeto e futuros módulos, focado em **rigor técnico**, **Application V2** e **JavaScript robusto**. O objetivo é eliminar a superficialidade e erros comuns de iniciantes.

---

## 1. Foundry VTT V13: A Mudança de Paradigma

Com a V13 (e o final da V12), o Foundry consolidou a **Application V2 API**. Abandonar a `FormApplication` legada não é opcional para projetos de longo prazo.

### 1.1. Application V2 vs V1
| Característica | Application V1 (`FormApplication`) | Application V2 (`foundry.applications.api.ApplicationV2`) |
| :--- | :--- | :--- |
| **Renderização** | Síncrona/JQuery dependente | Assíncrona, baseada em Promises e HTML nativo |
| **Estado** | `getData()` monolítico | Reativo (parcialmente), foco em getters e partes |
| **Form Submission** | `_updateObject` mágico | `Process` manual e granular (FormData nativo) |
| **CSS** | Classes globais propensas a colisão | Encapsulamento encorajado, variáveis CSS (tokens) |

### 1.2. A Estrutura Canônica de uma AppV2

Não basta "trocar a classe". A arquitetura muda.

```javascript
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class MinhaAppRobusta extends HandlebarsApplicationMixin(ApplicationV2) {
  
  // 1. Definição Estática (Configuração)
  static DEFAULT_OPTIONS = {
    tag: "form", // O elemento raiz
    id: "minha-app-robusta",
    classes: ["storyteller", "janela-padrao"],
    window: {
      title: "Título da Janela",
      resizable: true,
      controls: [ // Botões no header da janela
        { 
          icon: "fa-solid fa-cog", 
          label: "Config", 
          action: "configure", // Nome do handler
        } 
      ]
    },
    position: { width: 400, height: 'auto' },
    actions: { // Mapeamento direto de data-action
      salvar: MinhaAppRobusta.#onSubmit,
      resetar: MinhaAppRobusta.#onReset
    }
  };

  // 2. Partes (O conceito de "Partials" evoluído)
  static PARTS = {
    header: { template: "modules/meu-modulo/templates/header.hbs" },
    body: { template: "modules/meu-modulo/templates/body.hbs", scrollable: [".content"] },
    footer: { template: "modules/meu-modulo/templates/footer.hbs" }
  };

  // 3. Preparação de Contexto (O antigo getData)
  async _prepareContext(options) {
    // AVISO: Data preparation deve ser PURA. Não cause side-effects aqui.
    const parentData = await super._prepareContext(options);
    return {
      ...parentData,
      minhaVariavel: this.document.name, // Exemplo
      config: game.settings.get("meu-modulo", "config")
    };
  }
  
  // 4. Action Handlers (Substituindo JQuery listeners manuais)
  static async #onSubmit(event, target) {
    // 'this' aqui é a instância da App
    const formData = new FormDataExtended(this.element);
    try {
        await this.document.update(formData.object);
        this.close();
    } catch (err) {
        ui.notifications.error("Erro ao salvar!");
        console.error(err);
    }
  }
}
```

---

## 2. JavaScript Profundo: Evitando Armadilhas Mortais (The "Bad Parts")

A maioria dos bugs no Foundry vem de má compreensão do JS, não da API do Foundry.

### 2.1. O Inferno do `this` e Contexto
No Foundry V1, usávamos `bind(this)` em todo lugar. Na V2 e JS Moderno, prefira:
*   **Métodos estáticos privados (`static #handler`)** para handlers de eventos se eles não precisam de estado interno complexo (passados via `actions`).
*   **Arrow functions** em listeners manuais (se necessário): `this.element.addEventListener('click', (e) => this._onClick(e));`.

### 2.2. Promises "Soltas" (Floating Promises)
** Erro Crítico:** Disparar uma operação assíncrona (como `update`, `setFlag`) sem `await` ou `return` dentro de um Hook ou função de renderização.

*   **Errado:**
    ```javascript
    Hooks.on('ready', () => {
      game.actors.forEach(a => a.update({ name: a.name.trim() })); // CAOS!
      // O Foundry vai tentar atualizar centenas de documentos em paralelo.
      // Vai causar Race Conditions no banco de dados.
    });
    ```

*   **Correto (Serializado):**
    ```javascript
    Hooks.on('ready', async () => {
      for (const actor of game.actors) {
        await actor.update({ name: actor.name.trim() });
      }
    });
    ```
*   **Correto (Paralelo Controlado - Promise.all):**
    ```javascript
    Hooks.on('ready', async () => {
      const updates = game.actors.map(a => a.update({ name: a.name.trim() }));
      await Promise.all(updates); // Espera todos terminarem.
    });
    ```

### 2.3. Mutabilidade de Objetos (Object Reference Hell)
O Foundry armazena dados em cache. Se você mudar um objeto retornado por `game.settings.get` ou `actor.system` DIRETAMENTE, você corrompe o cache local sem atualizar o banco de dados.

*   **Regra de Ouro:** Sempre clone antes de mutar localmente se não for salvar imediatamente, ou use `foundry.utils.deepClone()`.
*   **Atualização:** Use `doc.update({ "system.path.to.prop": value })`. Nunca faça `doc.system.prop = value; doc.save()`.

---

## 3. Padrões de Projeto para Módulos Robustos

### 3.1. O Padrão "Service/Manager" (Singleton)
Evite espalhar lógica solta no `main.js`. Centralize lógica de negócios em Classes Estáticas ou Singletons.

```javascript
// managers/CinemaManager.js
export class CinemaManager {
  static #instance;
  
  constructor() {
    if (CinemaManager.#instance) return CinemaManager.#instance;
    CinemaManager.#instance = this;
    this._state = { active: false };
  }

  static get instance() {
    return this.#instance || new this();
  }

  /**
   * Ativar modo cinema. Validações ocorrem AQUI, não na UI.
   * @returns {Promise<void>}
   */
  async activateCinemaMode(sceneId) {
    if (!game.user.isGM) throw new Error("Permissão negada.");
    if (!sceneId) throw new Error("Cena inválida.");
    
    console.log("CinemaManager | Ativando...");
    // ... lógica real ...
  }
}
```

### 3.2. Data Models (Foundry V10+)
Não use objetos JSON puros para dados complexos. Defina `DataModel`. Isso garante tipagem e validação automática.

```javascript
/* Definindo um Schema de dados para suas configurações */
class CinemaConfigModel extends foundry.abstract.DataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      overlayColor: new fields.ColorField({ initial: "#000000" }),
      opacity: new fields.NumberField({ required: true, min: 0, max: 1, initial: 0.8 }),
      mode: new fields.StringField({ choices: ["theater", "minimal"], initial: "theater" })
    };
  }
}
```

---

## 4. Checklist Anti-Superficialidade

Antes de commitar qualquer código:

1.  **Tratamento de Erros:** Onde está o `try/catch`? Se a API do Foundry falhar (ex: rede), o usuário recebe um feedback (`ui.notifications.error`) ou o módulo trava silenciosamente?
2.  **Compatibilidade:** Usei `foundry.utils.isNewerVersion` se preciso suportar versões antigas? (Nota: Foque na V12/V13).
3.  **Localização (i18n):** NUNCA escreva strings hardcoded. Use `game.i18n.localize("MODULE.Key")`.
4.  **Performance:**
    *   Estou fazendo loops dentro do `Hook 'renderScene'`? (Perigoso!)
    *   Estou atualizando o canvas a cada frame?
5.  **Acessibilidade:** Os botões têm `aria-label` ou `title`?

## 5. Recursos de Consulta

*   **API Docs:** [foundryvtt.com/api/](https://foundryvtt.com/api/)
*   **Wiki da Comunidade:** [foundryvtt.wiki](https://foundryvtt.wiki)
*   **Foundry VTT Community Wiki:** [foundryvtt.wiki](https://foundryvtt.wiki)

## 7. Cookbook: Receitas de Implementação V2

### 7.1. Drag and Drop (Sem Mágica)
Na V2, o `dragDrop` não é automático nas options. Você deve instanciar a classe auxiliar.

```javascript
/* No constructor da sua ApplicationV2 */
constructor(options) {
  super(options);
  // Gerenciador manual de DragDrop
  this.dragDrop = new DragDrop({
    dragSelector: ".item-list .item",
    dropSelector: ".sheet-body",
    permissions: { dragstart: this._canDragStart.bind(this), drop: this._canDragDrop.bind(this) },
    callbacks: { dragstart: this._onDragStart.bind(this), drop: this._onDrop.bind(this) }
  });
}

/* No método _onRender */
_onRender(context, options) {
  super._onRender(context, options);
  // Re-bind a cada renderização, pois o DOM muda
  this.dragDrop.bind(this.element);
}

_onDragStart(event) {
  // Lógica padrão de DataTransfer do HTML5
  const li = event.currentTarget;
  const data = { type: "Item", uuid: li.dataset.uuid };
  event.dataTransfer.setData("text/plain", JSON.stringify(data));
}
```

### 7.2. Abas (Tabs) com `PARTS`
Esqueça o JQuery `Tabs`. Use a estrutura de `PARTS` para separar o conteúdo.

```javascript
static PARTS = {
  header: { template: "..." },
  tabs: { template: "templates/generic/tab-navigation.hbs" }, // Template nativo
  character: { template: "...", scrollable: [".content"] },
  inventory: { template: "...", scrollable: [".content"] }
};

static TABS = {
  sheet: {
    tabs: [
      { id: "character", label: "Personagem", icon: "fa-solid fa-user" },
      { id: "inventory", label: "Inventário", icon: "fa-solid fa-suitcase" }
    ],
    initial: "character",
    labelPrefix: "MYMODULE.TABS"
  }
};

async _prepareContext(options) {
  const context = await super._prepareContext(options);
  // O mixin HandlebarsApplicationMixin cuida da lógica básica se você passar isso:
  context.tabs = this._getTabsPartContext("sheet"); 
  return context;
}
```

### 7.3. Remove ContextMenu (JQuery) -> Use Actions
Evite `ContextMenu.create` (que depende de JQuery) se possível. Prefira botões explícitos com `actions` ou tooltips. Se for *obrigatório* um menu de clique direito, use `native context menu` ou encapsule o JQuery no `_onRender` com muito cuidado.

*Melhor Prática V2:* Botão de "Três Pontinhos" (Kebab Menu) que abre um `<dialog>` ou muda o estado da row.

```html
<!-- No HBS -->
<div class="item-row">
  <span>Espada</span>
  <button type="button" data-action="openItemMenu" data-item-id="{{item.id}}">
    <i class="fa-solid fa-ellipsis-vertical"></i>
  </button>
</div>
```

### 7.4. Reatividade (ApplicationV2)
A V2 não é o Vue.js, mas tem truques. A renderização é "custosa", então evite `render(true)` a cada keystroke.
*Estratégia:* Use `change` para formulários e `render` apenas quando o estado lógico mudar. Para atualizações em tempo real (ex: barra de HP), manipule o DOM diretamente no `_onRender` se a performance for crítica, ou use `Partials` pequenos e re-renderize apenas a "part" afetada.

## 8. Arquitetura de Sincronização (SocketLib)
Para módulos como o nosso (Cinema), sincronia é tudo. Não confie apenas no banco de dados para gatilhos instantâneos.

1.  **Instalação Padrão:** Use a biblioteca `socketlib` (módulo mais estável para isso). Não reinvente a roda com `game.socket.emit` puro a menos que seja trivial.
2.  **Registro:**
    ```javascript
    // No Hook 'socketlib.ready'
    let socket;
    Hooks.once("socketlib.ready", () => {
        socket = socketlib.registerModule("storyteller-cinema");
        socket.register("triggerScene", CinemaManager.triggerScene);
    });
    ```
3.  **Padrão GM Proxy:** Se um jogador clica em algo que muda o mundo, ele não tem permissão. Envie o pedido via socket para ser executado "AsGM".

## 9. Dominando o Canvas (V13+)
O Canvas da V13 é WebGL puro com camadas (`CanvasLayer`).
*   **Lights:** Agora existem luzes sensíveis a som (Audio Reactive).
*   **Performance:** Se for desenhar no canvas, use `PIXI.Container` e adicione à camada correta (`canvas.effects` ou uma camada customizada injetada). NUNCA insira HTML cru sobre o canvas (use a interface para isso).

## 10. Debugging de Elite & Performance
Não desenvolva no escuro.

1.  **Hooks Debug:** `CONFIG.debug.hooks = true` no console mostra TUDO que está disparando. Útil para achar aquele hook obscuro de `preUpdateToken`.
2.  **Gargalos de Renderização:** Se o módulo deixa o Foundry lento, instale o **"Prime Performance"** para comparar ou use a aba *Performance* do Chrome DevTools. O vilão geralmente é renderizar a _Sheet_ inteira quando só um número mudou.
3.  **Compendium Folders:** Na V13, pastas em compêndios são cidadãos de primeira classe. Organize seus assets (prefabs de cenas) em pastas dentro do pack para facilitar a busca pelo usuário.

---
*Documento gerado pelo Agente Antigravity - Dezembro 2025*
