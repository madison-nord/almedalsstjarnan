import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import { mergeManifest } from '#extension/manifest/merge-manifest';
import baseManifest from '#extension/manifest/base.json';
import chromeOverride from '#extension/manifest/chrome.json';

// Feature: ui-display-bugs, Property 1: Icon paths resolve in built manifest
// Validates: Requirements 1.1, 2.1

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

describe('Icon path resolution', () => {
  const merged = mergeManifest(
    baseManifest as Record<string, unknown>,
    chromeOverride as Record<string, unknown>,
  );

  const icons = merged.icons as Record<string, string>;
  const action = merged.action as { readonly default_icon: Record<string, string> };
  const defaultIcon = action.default_icon;

  const expectedSizes = ['16', '32', '48', '128'] as const;

  describe('merged manifest icons field', () => {
    it('contains entries for all required sizes (16, 32, 48, 128)', () => {
      for (const size of expectedSizes) {
        expect(icons[size]).toBeDefined();
      }
    });

    it('references PNG files that exist relative to project root', () => {
      for (const size of expectedSizes) {
        const iconPath = icons[size]!;
        const resolved = path.resolve(PROJECT_ROOT, iconPath);
        expect(
          fs.existsSync(resolved),
          `Expected icon file to exist: ${resolved}`,
        ).toBe(true);
      }
    });

    it('all icon paths point to the icons/ directory', () => {
      for (const size of expectedSizes) {
        const iconPath = icons[size]!;
        expect(iconPath).toMatch(/^icons\/icon-\d+\.png$/);
      }
    });
  });

  describe('merged manifest action.default_icon field', () => {
    it('contains entries for all required sizes (16, 32, 48, 128)', () => {
      for (const size of expectedSizes) {
        expect(defaultIcon[size]).toBeDefined();
      }
    });

    it('references PNG files that exist relative to project root', () => {
      for (const size of expectedSizes) {
        const iconPath = defaultIcon[size]!;
        const resolved = path.resolve(PROJECT_ROOT, iconPath);
        expect(
          fs.existsSync(resolved),
          `Expected icon file to exist: ${resolved}`,
        ).toBe(true);
      }
    });

    it('all icon paths point to the icons/ directory', () => {
      for (const size of expectedSizes) {
        const iconPath = defaultIcon[size]!;
        expect(iconPath).toMatch(/^icons\/icon-\d+\.png$/);
      }
    });
  });

  describe('icons and action.default_icon consistency', () => {
    it('both fields reference the same icon paths for each size', () => {
      for (const size of expectedSizes) {
        expect(icons[size]).toBe(defaultIcon[size]);
      }
    });
  });
});
