import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

export default defineConfig({
  // Verze pluginu se čte přímo z package.json při buildu, aby nemohla ujet
  // (dřív byla natvrdo duplikovaná v src/telemetry.ts).
  define: {
    __PLUGIN_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    minify: true,
    rollupOptions: {
      external: ['markedit-api'],
      output: {
        // MarkEdit loads plain scripts; keep everything in one CJS file.
        inlineDynamicImports: true,
      },
    },
    lib: {
      entry: 'src/main.ts',
      formats: ['cjs'],
      fileName: () => 'tightprint.js',
    },
  },
});
