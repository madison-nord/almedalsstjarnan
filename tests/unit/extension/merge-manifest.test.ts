import { describe, it, expect } from 'vitest';

import { mergeManifest } from '#extension/manifest/merge-manifest';

describe('mergeManifest', () => {
  it('returns an empty object when both inputs are empty', () => {
    expect(mergeManifest({}, {})).toEqual({});
  });

  it('returns base keys when override is empty', () => {
    const base = { name: 'ext', version: '1.0' };
    expect(mergeManifest(base, {})).toEqual({ name: 'ext', version: '1.0' });
  });

  it('returns override keys when base is empty', () => {
    const override = { minimum_chrome_version: '110' };
    expect(mergeManifest({}, override)).toEqual({
      minimum_chrome_version: '110',
    });
  });

  it('overrides a simple key from base with override value', () => {
    const base = { version: '0.1.0' };
    const override = { version: '0.2.0' };
    expect(mergeManifest(base, override)).toEqual({ version: '0.2.0' });
  });

  it('preserves keys from both base and override', () => {
    const base = { name: 'ext', version: '0.1.0' };
    const override = { minimum_chrome_version: '110' };
    const result = mergeManifest(base, override);

    expect(result).toHaveProperty('name', 'ext');
    expect(result).toHaveProperty('version', '0.1.0');
    expect(result).toHaveProperty('minimum_chrome_version', '110');
  });

  it('deep merges nested objects', () => {
    const base = {
      action: {
        default_popup: 'popup.html',
        default_icon: { '16': 'icon-16.png', '32': 'icon-32.png' },
      },
    };
    const override = {
      action: {
        default_icon: { '48': 'icon-48.png' },
      },
    };
    const result = mergeManifest(base, override);

    expect(result).toEqual({
      action: {
        default_popup: 'popup.html',
        default_icon: {
          '16': 'icon-16.png',
          '32': 'icon-32.png',
          '48': 'icon-48.png',
        },
      },
    });
  });

  it('replaces arrays instead of concatenating them', () => {
    const base = { permissions: ['storage', 'downloads'] };
    const override = { permissions: ['tabs'] };
    const result = mergeManifest(base, override);

    expect(result).toEqual({ permissions: ['tabs'] });
  });

  it('does not concatenate arrays in nested objects', () => {
    const base = {
      content_scripts: [{ matches: ['*://example.com/*'], js: ['a.js'] }],
    };
    const override = {
      content_scripts: [{ matches: ['*://other.com/*'], js: ['b.js'] }],
    };
    const result = mergeManifest(base, override);

    expect(result).toEqual({
      content_scripts: [{ matches: ['*://other.com/*'], js: ['b.js'] }],
    });
  });

  it('override takes precedence for conflicting keys', () => {
    const base = { name: 'base-name', description: 'base-desc' };
    const override = { name: 'override-name' };
    const result = mergeManifest(base, override);

    expect(result).toEqual({
      name: 'override-name',
      description: 'base-desc',
    });
  });

  it('handles null values in override', () => {
    const base = { key: 'value' };
    const override = { key: null };
    const result = mergeManifest(base, override);

    expect(result).toEqual({ key: null });
  });

  it('handles deeply nested objects (3+ levels)', () => {
    const base = {
      level1: {
        level2: {
          level3: { a: 1, b: 2 },
        },
      },
    };
    const override = {
      level1: {
        level2: {
          level3: { b: 3, c: 4 },
        },
      },
    };
    const result = mergeManifest(base, override);

    expect(result).toEqual({
      level1: {
        level2: {
          level3: { a: 1, b: 3, c: 4 },
        },
      },
    });
  });

  it('does not mutate the base object', () => {
    const base = { name: 'ext', nested: { key: 'val' } };
    const baseCopy = JSON.parse(JSON.stringify(base)) as typeof base;
    mergeManifest(base, { name: 'other', nested: { key: 'new' } });

    expect(base).toEqual(baseCopy);
  });

  it('does not mutate the override object', () => {
    const override = { name: 'ext', nested: { key: 'val' } };
    const overrideCopy = JSON.parse(JSON.stringify(override)) as typeof override;
    mergeManifest({ name: 'base' }, override);

    expect(override).toEqual(overrideCopy);
  });

  it('merges the real base.json with chrome.json correctly', async () => {
    const base = await import('#extension/manifest/base.json');
    const chrome = await import('#extension/manifest/chrome.json');
    const result = mergeManifest(
      base.default as Record<string, unknown>,
      chrome.default as Record<string, unknown>,
    );

    // Chrome override adds minimum_chrome_version
    expect(result).toHaveProperty('minimum_chrome_version', '110');
    // Base keys are preserved
    expect(result).toHaveProperty('manifest_version', 3);
    expect(result).toHaveProperty('version', '0.1.0');
    expect(result).toHaveProperty('permissions');
  });
});
