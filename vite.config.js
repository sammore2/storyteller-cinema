import { defineConfig } from 'vite';
import fs from 'fs';

export default defineConfig({
  publicDir: 'static',
  plugins: [
    {
      name: 'copy-to-foundry',
      apply: 'build',
      closeBundle() {
        const targetDir = 'D:\\FoundryVTT-WindowsPortable-14.359\\Data\\modules\\storyteller-cinema';
        try {
          // PROVISÓRIO: Copia recursivamente para o Foundry Portable
          fs.cpSync('dist', targetDir, { recursive: true, force: true });
          // Também copia a pasta static se necessário (o Vite já faz isso para o dist, mas garantimos aqui)
          fs.cpSync('static', targetDir, { recursive: true, force: true });
          // Copia o module.json (que está na pasta static) para a raiz do destino
          fs.copyFileSync('static/module.json', `${targetDir}/module.json`);
          
          console.log(`\n\x1b[32m[Storyteller] Build copiado para: ${targetDir}\x1b[0m\n`);
        } catch (err) {
          console.error('\n\x1b[31m[Storyteller] Erro ao copiar para o Foundry:\x1b[0m', err.message);
        }
      }
    }
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    minify: false, // Importante para ler os imports
    lib: {
      entry: 'src/scripts/main.js',
      name: 'storyteller-cinema',
      formats: ['es'],
      fileName: 'main'
    },
    rollupOptions: {
      output: {
        // ESTRUTURA PERFEITA (Mirroring):
        // 1. Libs externas -> vendor.js (Limpeza)
        // 2. Arquivos locais -> Mantêm caminho original (core/depth.js, etc)
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
          if (id.includes('src/scripts/')) {
            // Remove o prefixo absoluto e 'src/scripts/' para pegar o caminho relativo
            // Ex: .../src/scripts/core/depth.js -> core/depth
            const relative = id.split('src/scripts/')[1];
            if (relative && relative !== 'main.js') {
              return relative.replace('.js', ''); // Retorna 'core/depth'
            }
          }
        },
        entryFileNames: '[name].js', // main.js
        chunkFileNames: '[name].js', // Mantém o nome retornado pelo manualChunks (ex: core/depth.js)
        assetFileNames: (assetInfo) => {
          // Garante que o CSS principal fique na raiz como style.css para o module.json achar
          if (assetInfo.name === 'style.css' || assetInfo.name === 'main.css' || assetInfo.name.endsWith('.css')) {
            return 'style.css';
          }
          return 'assets/[name][extname]';
        }
      }
    }
  }
});
