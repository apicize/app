import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    typecheck: {
      tsconfig: path.resolve(__dirname, '__tests__/tsconfig.json'),
    },
  },
  resolve: {
    alias: {
      '@apicize/lib-typescript': path.resolve(__dirname, '../lib-typescript/src'),
    },
  },
});
