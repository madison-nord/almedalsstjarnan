import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import webExtension from 'vite-plugin-web-extension';
import { resolve } from 'node:path';
import { cpSync, copyFileSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
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

/**
 * Adds manualChunks configuration only for builds that support code splitting.
 * The vite-plugin-web-extension builds background/content scripts individually
 * with codeSplitting disabled, which conflicts with manualChunks. This plugin
 * safely applies the chunking config only for multi-entry HTML builds.
 */
function vendorChunks(): Plugin {
  return {
    name: 'vendor-chunks',
    outputOptions(options) {
      // Skip when code splitting is explicitly disabled (individual script builds)
      if ((options as Record<string, unknown>).codeSplitting === false) {
        return;
      }
      const output = options;
      output.manualChunks = (id: string) => {
        if (id.includes('node_modules/react')) {
          return 'vendor-react';
        }
      };
      return output;
    },
  };
}

/**
 * Fixes the stars page CSS reference after build.
 *
 * Vite deduplicates identical CSS entry points (popup.css and stars.css both
 * contain only Tailwind directives) into a single chunk named after the first
 * entry (popup.css). This plugin copies that CSS to dist/stars.css and updates
 * the stars HTML to reference it, ensuring stars.html loads its own stylesheet.
 */
function fixStarsCss(): Plugin {
  return {
    name: 'fix-stars-css',
    closeBundle() {
      const outDir = resolve(__dirname, 'dist');
      const starsHtml = resolve(outDir, 'src/ui/stars/stars.html');
      const popupCss = resolve(outDir, 'popup.css');
      const starsCss = resolve(outDir, 'stars.css');

      // Only run when the stars HTML exists (multi-entry build step)
      if (!existsSync(starsHtml)) return;

      // Copy popup.css → stars.css (they contain identical Tailwind output)
      if (existsSync(popupCss) && !existsSync(starsCss)) {
        copyFileSync(popupCss, starsCss);
      }

      // Rewrite the <link> in stars.html to reference /stars.css
      let html = readFileSync(starsHtml, 'utf-8');
      if (html.includes('/popup.css')) {
        html = html.replace('/popup.css', '/stars.css');
        writeFileSync(starsHtml, html, 'utf-8');
      }
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
    vendorChunks(),
    fixStarsCss(),
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
