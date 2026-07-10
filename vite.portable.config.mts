import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

/** Portable build: the whole app (JS, CSS, fonts) inlined into ONE html file
 *  that runs from a double-click (file://) with localStorage persistence. */
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  base: './',
  build: {
    outDir: 'dist-portable',
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
  },
});
