import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import webExtension from 'vite-plugin-web-extension';
import { resolve } from 'node:path';
import { cpSync } from 'node:fs';
import { mergeManifest } from './src/extension/manifest/merge-manifest';
import baseManifest from './src/extension/manifest/base.json';
import chromeOverride from './src/extension/manifest/chrome.json';

/**
 * Copies static extension assets (_locales) to the dist directory
 * after the build completes. Icons are handled via Vite's publicDir
 * (public/icons/) so they are available before the web-extension plugin
 * finalizes the manifest.
 */
function copyExtensionAssets(): Plugin {
  return {
    name: 'copy-extension-assets',
    closeBundle() {
      const outDir = resolve(__dirname, 'dist');
      cpSync(resolve(__dirname, '_locales'), resolve(outDir, '_locales'), { recursive: true });
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    webExtension({
      manifest: () => mergeManifest(baseManifest, chromeOverride),
      additionalInputs: ['src/ui/stars/stars.html'],
    }),
    copyExtensionAssets(),
  ],
  publicDir: 'public',
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
