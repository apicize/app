import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  base: '',
  root: './site',
  srcDir: './site/src',
  publicDir: './site/src',
  outDir: '.dist-site',
  build: {
    assets: '_assets',
    assetsPrefix: '.',
    format: 'file',
  }
});
