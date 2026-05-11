import { defineConfig, loadEnv } from 'vite';
import path from 'path';
import fs from 'fs';
import checker from 'vite-plugin-checker';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const targetDir = env.FOUNDRY_MODULE_PATH;

  return {
    publicDir: 'static',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    plugins: [
      checker({ typescript: true }),
      {
        name: 'foundry-deploy',
        apply: 'build',
        closeBundle() {
          if (!targetDir) {
            console.warn('\n\x1b[33m[Foundry-Deploy] FOUNDRY_MODULE_PATH não definida no .env. Pulando deploy...\x1b[0m\n');
            return;
          }
          try {
            if (!fs.existsSync(targetDir)) {
              fs.mkdirSync(targetDir, { recursive: true });
            }
            fs.cpSync('dist', targetDir, { recursive: true, force: true });
            // Garantir que o module.json esteja na raiz
            fs.copyFileSync('static/module.json', path.join(targetDir, 'module.json'));
            
            console.log(`\n\x1b[32m[Foundry-Deploy] Build implantado em: ${targetDir}\x1b[0m\n`);
          } catch (err: any) {
            console.error('\n\x1b[31m[Foundry-Deploy] Erro no deploy:\x1b[0m', err.message);
          }
        }
      }
    ],
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: true,
      minify: false,
      lib: {
        entry: 'src/scripts/main.ts',
        name: 'storyteller-cinema',
        formats: ['es'],
        fileName: 'main'
      },
      rollupOptions: {
        output: {
          assetFileNames: (assetInfo) => {
            if (assetInfo.name?.endsWith('.css')) return 'style.css';
            return 'assets/[name][extname]';
          },
          chunkFileNames: '[name].js',
          manualChunks(id) {
            if (id.includes('node_modules')) return 'vendor';
            if (id.includes('src/scripts/')) {
              const relative = id.split('src/scripts/')[1];
              if (relative && relative !== 'main.ts') {
                return relative.replace('.ts', '').replace('.js', '');
              }
            }
          }
        }
      }
    }
  };
});
