import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import webExtension from 'vite-plugin-web-extension';
import { resolve } from 'node:path';
import { mergeManifest } from './src/extension/manifest/merge-manifest';
import baseManifest from './src/extension/manifest/base.json';
import chromeOverride from './src/extension/manifest/chrome.json';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    webExtension({
      manifest: () => mergeManifest(baseManifest, chromeOverride),
      additionalInputs: ['src/ui/stars/stars.html'],
    }),
  ],
  resolve: {
    alias: {
      '#core': resolve(__dirname, 'src/core'),
      '#ui': resolve(__dirname, 'src/ui'),
      '#features': resolve(__dirname, 'src/features'),
      '#extension': resolve(__dirname, 'src/extension'),
      '#test': resolve(__dirname, 'tests'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: mode === 'development',
  },
}));
