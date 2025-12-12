# Estudo Aprofundado: Lógica JS Avançada, Svelte 5 e o Ecossistema Foundry

> "Superficialidade é o erro fatal do engenheiro de software."
> Este documento analisa **Lógica de Programação**, **Padrões de Projeto** e a arquitetura do **Svelte 5** contrastada com a **ApplicationV2** do Foundry VTT.

---

## Parte 1: O Tao do JavaScript (Além do Básico)

Dominar o Foundry V13 exige dominar o JS moderno, não apenas fazer "JQuery soup".

### 1.1. Reatividade Nativa com `Proxy` & `Reflect`
Antes de importar frameworks, entenda como o JS moderno lida com observação de estado, base do Svelte e do Vue.

*   **O Padrão Proxy:** Permite interceptar operações fundamentais (leitura, escrita).
    ```javascript
    const estadoJogo = { cena: "Intro", tokens: [] };
    
    const reativo = new Proxy(estadoJogo, {
        set(target, property, value) {
            console.log(`Alterando ${property} de ${target[property]} para ${value}`);
            const sucesso = Reflect.set(target, property, value);
            if (sucesso) renderizarInterface(); // Reatividade "na unha"
            return sucesso;
        }
    });
    ```
    *Aplicação no Foundry:* É assim que o `foundry.data.fields` valida dados, mas você pode usar para criar "Stores" locais sem dependências.

### 1.2. Programação Funcional (Imutabilidade & Pureza)
Erros de "Side Effects" são a causa #1 de bugs em módulos complexos (ex: alterar um ator dentro de um loop de renderização).
*   **Imutabilidade:** Nunca altere `this.actor.system` diretamente. Use `foundry.utils.deepClone()` ou updates atômicos.
*   **Funções Puras:**
    *   *Impuro:* `function getDano() { return this.arma.dano + Math.random(); }`
    *   *Puro:* `function calcularDano(danoBase, seed) { ... }` (Fácil de testar).

---

## Parte 2: Anatomia do Svelte 5 (Runes & Compilador)

O Svelte mudou radicalmente na versão 5. Ele não é mais apenas "reativo por atribuição", ele agora usa **Sinais (Signals)** via **Runes**.

### 2.1. O Compilador vs. O Runtime
Diferente de React (que carrega uma `react-dom` gigante), o Svelte é um **compilador**.
*   **Código Fonte:** `.svelte` com lógica declarativa.
*   **Código Final:** JavaScript Imperativo, cirúrgico, que manipula o DOM diretamente (`elem.textContent = value`).
*   *Vantagem:* Performance bruta próxima do Vanilla JS.

### 2.2. As Runes (A nova Lógica)
*   `$state(0)`: Cria um sinal reativo (substitui `let count = 0`).
*   `$derived(count * 2)`: Valor computado que só atualiza se a dependência mudar (memoização automática).
*   `$effect(() => { ... })`: Side-effects controlados (ex: salvar no DB quando o state mudar).

---

## Parte 3: O Dilema de Arquitetura (Svelte vs Foundry AppV2)

Aqui vive a tensão. O Svelte quer controlar o DOM. A ApplicationV2 *também* quer.

### 3.1. Onde eles colidem
1.  **Ciclo de Vida:** A AppV2 tem `_onRender`, `close`, `minimize`. O Svelte tem `onMount`, `onDestroy`. Sincronizar esses dois relógios é propenso a vazamento de memória (ex: fechar a janela do Foundry mas esquecer de destruir a instância Svelte).
2.  **Estilos:** Foundry usa CSS global + `scoped` via classes. Svelte usa CSS hash scoping. Misturar pode quebrar temas do sistema (D&D5e, PF2e).

### 3.2. Onde eles convergem (O Caminho do Meio)
É possível usar Svelte dentro do Foundry, mas exige disciplina:
*   **Montagem Manual:** No método `_onRender` da AppV2, você instancia o Svelte e o anexa a uma `div` container.
*   **Lixo:** No método `close`, você **DEVE** chamar `app.$destroy()` (Svelte 4) ou desmontar (Svelte 5).

### 3.3. A Veredito para este Projeto
Dada a instrução de **rigor com a ApplicationV2**:
*   **Risco:** Adicionar um build step (Vite + Svelte Plugin) aumenta a complexidade de manutenção para terceiros.
*   **Solução Recomendada:** Usar a **Lógica** do Svelte (Sinais/Proxies) mas com a renderização padrão (Handlebars) ou Lit-HTML (mais leve), OU usar o Svelte estritamente encapsulado dentro de janelas complexas, nunca invadindo o HUD global sem cuidado.
*   **Simulação:** Podemos criar classes `CinemaStore` usando `Proxies` nativos do JS (ver 1.1) para ter a reatividade do Svelte sem trazer o framework inteiro.

---
*Estudo gerado pelo Agente Antigravity para referência interna.*
