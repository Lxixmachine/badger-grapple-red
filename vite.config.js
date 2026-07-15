import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';

function campRandallDemoEntry() {
  return {
    name: 'camp-randall-demo-entry',
    apply: 'build',
    async closeBundle() {
      const outputDirectory = resolve(process.cwd(), 'dist');
      const gameEntry = resolve(outputDirectory, 'index.html');
      const demoEntry = resolve(outputDirectory, 'camp-randall-demo.html');
      const gameHtml = await readFile(gameEntry, 'utf8');
      const demoHtml = gameHtml
        .replace(
          /<title>[^<]*<\/title>/,
          '<title>Badger Grapple Red - Camp Randall Demo</title>'
        )
        .replace(
          '<div id="note">v22.4 Roster Motion</div>',
          '<div id="note">v22.6 Camp Randall Collision</div>'
        )
        .replace(
          '</head>',
          '<script>window.BADGER_ENTRY_MODE = "camp-randall";</script>\n</head>'
        );
      await writeFile(demoEntry, demoHtml, 'utf8');
    }
  };
}

export default defineConfig({
  base: './',
  plugins: [campRandallDemoEntry()],
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
