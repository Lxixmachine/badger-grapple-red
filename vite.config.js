import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  build: {
    assetsDir: 'assets',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        game: resolve(process.cwd(), 'index.html'),
        mapEditor: resolve(process.cwd(), 'map-editor.html')
      }
    }
  }
});
