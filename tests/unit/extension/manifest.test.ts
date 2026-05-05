import { describe, it, expect } from 'vitest';

import manifest from '#extension/manifest/base.json';

describe('base.json manifest icon references', () => {
  describe('action.default_icon', () => {
    it('references PNG files for all icon sizes', () => {
      const defaultIcon = manifest.action.default_icon;

      expect(defaultIcon['16']).toBe('icons/icon-16.png');
      expect(defaultIcon['32']).toBe('icons/icon-32.png');
      expect(defaultIcon['48']).toBe('icons/icon-48.png');
      expect(defaultIcon['128']).toBe('icons/icon-128.png');
    });

    it('does not reference any SVG files', () => {
      const values = Object.values(manifest.action.default_icon);

      for (const value of values) {
        expect(value).not.toMatch(/\.svg$/);
      }
    });
  });

  describe('top-level icons', () => {
    it('references PNG files for all icon sizes', () => {
      const icons = manifest.icons;

      expect(icons['16']).toBe('icons/icon-16.png');
      expect(icons['32']).toBe('icons/icon-32.png');
      expect(icons['48']).toBe('icons/icon-48.png');
      expect(icons['128']).toBe('icons/icon-128.png');
    });

    it('does not reference any SVG files', () => {
      const values = Object.values(manifest.icons);

      for (const value of values) {
        expect(value).not.toMatch(/\.svg$/);
      }
    });
  });
});
