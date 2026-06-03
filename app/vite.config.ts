import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      // Redirect bare 'monaco-editor' imports to our selective entry so only the
      // languages we actually use are bundled. The regex ensures subpath imports
      // (monaco-editor/esm/…) are unaffected and still resolve from node_modules.
      { find: /^monaco-editor$/, replacement: path.resolve(__dirname, './src/monaco-editor.ts') },
      { find: '@', replacement: path.resolve(__dirname, './src') },
    ],
  },
  base: './',
  server: {
    port: 1420,
    strictPort: true,
  },
  worker: {
    format: 'es',
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('/node_modules/')) return
          // Monaco is self-contained (no React/MUI deps) so it's safe to split out.
          // React, MUI, MobX etc. share circular init dependencies and must stay
          // in the same chunk to preserve Rollup's module evaluation order.
          if (/(monaco-editor|react-monaco-editor|monaco-graphql)/.test(id)) return 'vendor-monaco'
          return 'vendor'
        },
      },
    },
  },
})
