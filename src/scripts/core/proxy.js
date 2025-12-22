/**
 * CinematicProxy
 * 
 * Uma entidade visual (PIXI.Container) que substitui visualmente o Token na cena.
 * - Usa a imagem do ATOR (Full Body) se disponível.
 * - Aplica o efeito Standee (2.5D, Rotação 0, Flip).
 * - Segue o Token invisível (Controller).
 */
export class CinematicProxy {
    constructor(token) {
        this.token = token;
        this.sprite = new PIXI.Sprite();
        this.container = new PIXI.Container();

        // Dynamic import workaround removed - switching to direct import if possible, 
        // or ensure _executeVisuals handles it robustly.
        // Actually, let's keep the dynamic import logic but make it cleaner,
        // OR better yet, let's trust the static import at the top of the file since we fixed the cycle.

        // Settings with Safe Defaults
        const getSetting = (key, def) => {
            try { return game.settings.get('storyteller-cinema', key); }
            catch { return def; }
        };

        this.settings = {
            refHeight: (getSetting('referenceHeight', 30)) / 100,
            minDepth: getSetting('minScale', 0.5),
            maxDepth: getSetting('maxScale', 1.2)
        };

        this._initialized = false;

        this.init();
    }

    async init() {
        if (!this.token.actor) return;

        const imgSrc = this.token.actor.img || this.token.document.texture.src;
        console.log(`Storyteller Cinema | 🎭 Init Proxy for ${this.token.name}. Image: ${imgSrc}`);

        try {
            // V13 SAFE: Namespace correto para evitar warnings
            // foundry.canvas.TextureLoader.loader.loadTexture retorna Promise<PIXI.Texture>
            this.texture = await foundry.canvas.TextureLoader.loader.loadTexture(imgSrc);
        } catch (err) {
            console.error("Storyteller Cinema | ❌ Texture Load Failed:", err);
            this.texture = null;
        }

        // SALVAGUARDA SUPREMA:
        let safeTexture = this.texture;

        // Helper para validar textura
        const isValidTex = (t) => t && (t instanceof PIXI.Texture) && t.valid;

        if (!isValidTex(safeTexture)) {
            console.warn(`Storyteller Cinema | ⚠️ Invalid Texture for ${this.token.name}. Trying fallback.`);

            if (isValidTex(this.token.mesh?.texture)) {
                safeTexture = this.token.mesh.texture;
            } else {
                console.warn("Storyteller Cinema | ⚠️ Fallback to EMPTY texture.");
                // Garante que PIXI.Texture.EMPTY existe, senão cria uma nova
                safeTexture = PIXI.Texture?.EMPTY || new PIXI.Texture(new PIXI.BaseTexture());
            }
        }

        // Última verificação antes de atribuir
        if (!safeTexture) {
            console.error("Storyteller Cinema | ❌ Could not find ANY valid texture. Aborting Sprite creation.");
            return;
        }

        // Atribuição Blindada
        try {
            this.sprite.texture = safeTexture;
        } catch (pixiError) {
            console.error("Storyteller Cinema | ❌ PIXI Sprite Crash suppressed:", pixiError);
            // Se falhar aqui, não há o que fazer além de não mostrar o sprite
            return;
        }

        this.sprite.anchor.set(0.5, 1);
        this.container.addChild(this.sprite);

        // Z-Index Sorting
        // Adiciona e ordena imediatamente para evitar delay visual
        canvas.tokens.addChild(this.container);
        canvas.tokens.sortChildren();

        console.log(`Storyteller Cinema | ✅ Proxy Created for ${this.token.name}`);

        this._initialized = true;
        this.refresh();
    }

    /**
     * Atualiza posição e escala do Proxy baseado no Token Controller
     */
    refresh() {
        if (!this._initialized || !this.token) return;

        // Sincroniza Posição (Centro-Baixo do grid)
        const tokenCenter = this.token.center;
        const halfHeight = (this.token.h * this.token.document.texture.scaleY) / 2;

        this.container.position.set(tokenCenter.x, tokenCenter.y + halfHeight);

        // Z-Index (Sortable)
        // Sincroniza com o zIndex do token para que fique na mesma "camada" visual
        if (this.token.mesh) {
            this.container.zIndex = this.token.mesh.zIndex + 1;
        }

        // Garante visibilidade
        this.container.visible = true;
        this.container.alpha = 1;

        // Aplica Efeitos Visuais (Standee 2.5D)
        this._applyStandeeEffect();
    }

    _applyStandeeEffect() {
        if (!this.texture || !this.texture.valid) return; // Segurança extra

        // 1. Escala por Profundidade
        const sceneHeight = canvas.dimensions.height;
        const yRatio = Math.max(0, Math.min(1, this.token.y / sceneHeight));

        // Interpolação Linear (Lerp)
        const depthScale = this.settings.minDepth +
            (yRatio * (this.settings.maxDepth - this.settings.minDepth));

        // Normalização pela Altura de Referência
        const targetHeightPx = sceneHeight * this.settings.refHeight;

        // Evita divisão por zero
        const texHeight = this.texture.height || 100;
        const baseScale = targetHeightPx / texHeight;

        const finalScale = baseScale * depthScale;

        // 2. Rotação e Flip (Standee)
        this.container.rotation = 0;

        // Detecta direção do Token para Flip
        const rot = this.token.document.rotation;
        const isLookingLeft = rot > 90 && rot < 270;

        const scaleX = isLookingLeft ? -Math.abs(finalScale) : Math.abs(finalScale);

        this.sprite.scale.set(scaleX, Math.abs(finalScale));
    }

    destroy() {
        if (this.container && !this.container.destroyed) {
            this.container.destroy({ children: true });
        }
    }
}


/**
 * Gerenciador Singleton dos Proxies
 */
export class ProxyManager {
    static proxies = new Map();

    static enable() {
        console.log("Storyteller Cinema | 🎭 Spawning Proxies...");

        // Oculta Tokens Reais e Cria Proxies
        canvas.tokens.placeables.forEach(token => {
            if (!token.actor) return;

            // Salva estado original de visibilidade se necessário, ou apenas forçamos.
            if (token.mesh) token.mesh.alpha = 0;

            // Cria Proxy
            if (!this.proxies.has(token.id)) {
                this.proxies.set(token.id, new CinematicProxy(token));
            }
        });
    }

    static disable() {
        console.log("Storyteller Cinema | 🎭 Destroying Proxies...");

        // Restaura Tokens Reais e Destrói Proxies
        // Importante checar document.alpha para não mostrar token escondido pelo GM
        canvas.tokens.placeables.forEach(token => {
            if (token.mesh) token.mesh.alpha = token.document.hidden ? 0.5 : 1;
        });

        this.proxies.forEach(proxy => proxy.destroy());
        this.proxies.clear();
    }

    static update(token) {
        // Chamado no hook updateToken/refreshToken
        const proxy = this.proxies.get(token.id);
        if (proxy) proxy.refresh();
    }
}
