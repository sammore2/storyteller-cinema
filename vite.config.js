import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
  publicDir: 'static',
  plugins: [
    svelte()
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
