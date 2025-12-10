# Storyteller's Cinema

**Storyteller's Cinema** é um módulo para Foundry VTT focado em imersão visual e narrativa. Ele adiciona ferramentas para criar uma profundidade de cena dinâmica e filtros visuais (Moods) para enriquecer a atmosfera dos seus jogos.

![Foundry Version](https://img.shields.io/badge/Foundry-v12%20|%20v13-orange)

## ✨ Funcionalidades

### 1. Depth Scaling (Escala de Profundidade)
Tokens são redimensionados visualmente com base na sua posição Y na cena. Isso cria um efeito de "falso 3D" (2.5D), onde personagens ao fundo (topo da tela) parecem menores e distantes, enquanto personagens à frente (base da tela) parecem maiores e próximos.

*   **Automático:** Funciona assim que você move um token.
*   **Configurável:** Ajuste os limites de escala mínima e máxima nas configurações do módulo.
*   **Visual Apenas:** A alteração é apenas no *Mesh* visual, não alterando o tamanho real da grade ou colisão do token.

### 2. Cinematic Mode (Modo Cinema)
Adiciona um botão "Modo Cinema" (ícone de filme) nos controles de Token.
Quando ativado, ele aplica a classe CSS `.cinematic-mode` ao corpo do Foundry. Isso pode ser usado em conjunto com CSS customizado para ocultar a UI, escurecer bordas ou dar foco à ação.

### 3. Scene Moods (Humor da Cena)
Define filtros visuais globais por cena.
Vá nas **Configurações da Cena (Scene Config)** e procure pela opção **"Mood Cinemático"** na aba Básica.

Opções disponíveis:
*   **Normal:** Sem filtros.
*   **Noir:** Filtro preto e branco de alto contraste e granulação (estilo filme Noir).
*   **Blood:** Filtro avermelhado intenso (estilo horror/combate).

## 📦 Instalação

1.  Copie o link do Manifesto: `(Link do seu module.json GitHub release)`
2.  No Foundry VTT, vá em **Add-on Modules** -> **Install Module**.
3.  Cole o link e clique em Install.

### Dependências
Este módulo lista as seguintes dependências opcionais/recomendadas para certas automações (conforme `module.json`):
-   Sequencer
-   Monk's Active Tile Triggers

## ⚙️ Configuração

Vá em **Configure Settings** -> **Module Settings** -> **Storyteller's Cinema**.

| Configuração | Descrição | Padrão |
| :--- | :--- | :--- |
| **Escala Mínima (Fundo)** | Tamanho do token no topo da cena (0.0 a 1.0). | `0.6` |
| **Escala Máxima (Frente)** | Tamanho do token na base da cena (1.0+). | `1.2` |

## 🛠️ Compatibilidade

Testado no Foundry V12 e V13.

## 📝 Licença

[GNU General Public License v3.0](LICENSE)
