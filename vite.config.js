import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: 'static',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: 'src/scripts/main.js',
      name: 'storyteller-cinema',
      formats: ['es'],
      fileName: 'main'
    },
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css' || assetInfo.name === 'main.css') return 'style.css';
          return assetInfo.name;
        }
      }
    }
  }
});
