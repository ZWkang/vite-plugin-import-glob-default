import Plugin from '../../src/index';
import { defineConfig } from 'vite';

import path from 'path'

import vue from '@vitejs/plugin-vue';

function pathResolve(dir: string) {
  return path.resolve(__dirname, dir);
}

console.log(pathResolve('.'))

export default defineConfig({
  plugins: [
    Plugin(),
    vue()],
  build: {
    minify: false,
  },
  resolve: {
    alias: {
      '@': pathResolve('.')
    }
  }
});
