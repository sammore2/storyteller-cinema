# Plano — Sistema Premium de Skins

## Modelo de Negócio
- **Plataforma**: Patreon
- **Tiers**: Bronze ($3), Prata ($5), Ouro ($8)
- **Entrega**: Chave única por patrono via welcome message do Patreon

## Estrutura do Hub (`storyteller-cinema-hub`)

```
storyteller-cinema-hub/
├── .github/
│   ├── workflows/sync-patrons.yml   → GitHub Action (roda a cada hora)
│   └── scripts/sync-patrons.js      → Sincroniza Patreon → gera chaves
├── keys/                            → Chaves criadas automaticamente (KEY.txt)
├── expired/                         → Chaves expiradas movidas pra cá
├── packs/
│   └── the-umbra/
│       ├── pack.json                → Metadados do pack + lista de skins
│       └── skins/
│           └── crimson-court/
│               ├── skin.json        → Definição da skin + assets paths
│               └── assets/          → Imagens da skin
├── skins.json                       → Legacy (gratuito/antigo)
└── skins/                           → Legacy assets
```

## Fluxo Completo

1. Pessoa assina Patreon → recebe chave por mensagem automática
2. GitHub Action (a cada hora) detecta novo patrono via API do Patreon
3. Action cria `keys/STC-XXXXXXXX.txt` com `{"tier":"ouro","packs":["the-umbra"]}`
4. Usuário cola a chave no Foundry (Config → Premium Key)
5. Módulo valida: fetch `keys/CHAVE.txt` no GitHub → 200 = válido
6. Módulo baixa os packs liberados → registra as skins
7. Ao aplicar uma skin premium, assets são baixados do GitHub

## Código Alterado no Módulo

### `src/scripts/core/skin-manager.ts`
- `_loadHubSkins()` agora carrega `skins.json` (legado) + packs premium
- `_loadLegacyHubSkins(token)` — método extraído do antigo
- `_loadPatronPacks(token, key)` — valida chave e carrega packs
- `_loadPack(token, packId)` — baixa um pack individual
- Interface `SkinData` ganhou campo `pack?: string`

### `src/scripts/main.ts`
- Novo setting `premiumKey` (String, configurável pelo usuário)

### `static/lang/en.json`
- Traduções do novo setting

## GitHub Action (`sync-patrons.yml`)
- Roda a cada hora (cron: `0 * * * *`)
- Usa `PATREON_CREATOR_TOKEN` (secreto do repositório)
- Cria/deleta arquivos em `keys/` conforme patronos ativos/inativos
- Commita e push automático

## Secrets Necessários no Repositório
- `PATREON_CREATOR_TOKEN` ✅ (já criado)
- `GH_PAT` — token classic do GitHub com escopo `repo`

## Pendente (você)
- [ ] Criar tiers no Patreon (Bronze / Prata / Ouro)
- [ ] Definir no `sync-patrons.js` qual tier → quais packs
- [ ] Criar os assets dos packs (imagens)
- [ ] Testar o fluxo completo

## Status Atual
- [x] Módulo refatorado pra suportar packs
- [x] Setting `premiumKey` adicionado
- [x] GitHub Action criado
- [x] Estrutura de exemplo no hub
- [ ] Patreon tiers configurados
- [ ] Assets criados
- [ ] Testes
