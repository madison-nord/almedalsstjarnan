import { describe, it, expect, vi, afterEach } from 'vitest';
import { existsSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';

import { verifyEntries, DENY_PATTERNS, REQUIRED_CHECKS, main } from '../../scripts/verify-package';

// ─── verifyEntries: Deny pattern tests ────────────────────────────

describe('verifyEntries', () => {
  describe('deny patterns', () => {
    describe('.map files', () => {
      it('flags source map files ending in .map', () => {
        const result = verifyEntries(['bundle.js.map', 'styles.css.map']);

        expect(result.disallowedFiles).toContain('bundle.js.map');
        expect(result.disallowedFiles).toContain('styles.css.map');
        expect(result.valid).toBe(false);
      });

      it('does not flag mapping.js (contains "map" but does not end in .map)', () => {
        const result = verifyEntries([
          'mapping.js',
          'manifest.json',
          'popup.html',
          '_locales/sv/messages.json',
          'icons/icon-16.png',
        ]);

        expect(result.disallowedFiles).not.toContain('mapping.js');
      });
    });

    describe('.kiro/ directory', () => {
      it('flags files under .kiro/ directory', () => {
        const result = verifyEntries(['.kiro/specs/test/tasks.md']);

        expect(result.disallowedFiles).toContain('.kiro/specs/test/tasks.md');
        expect(result.valid).toBe(false);
      });
    });

    describe('tests/ and test/ directories', () => {
      it('flags files in tests/ directory', () => {
        const result = verifyEntries(['tests/unit/foo.test.ts']);

        expect(result.disallowedFiles).toContain('tests/unit/foo.test.ts');
        expect(result.valid).toBe(false);
      });

      it('flags files in test/ directory', () => {
        const result = verifyEntries(['test/bar.ts']);

        expect(result.disallowedFiles).toContain('test/bar.ts');
        expect(result.valid).toBe(false);
      });

      it('flags nested test directories (e.g. src/tests/)', () => {
        const result = verifyEntries(['src/tests/helper.ts']);

        expect(result.disallowedFiles).toContain('src/tests/helper.ts');
        expect(result.valid).toBe(false);
      });

      it('does not flag test-utils.js in a non-test directory', () => {
        const result = verifyEntries([
          'test-utils.js',
          'manifest.json',
          'popup.html',
          '_locales/sv/messages.json',
          'icons/icon-16.png',
        ]);

        expect(result.disallowedFiles).not.toContain('test-utils.js');
      });
    });

    describe('node_modules/ directory', () => {
      it('flags files under node_modules/', () => {
        const result = verifyEntries(['node_modules/react/index.js']);

        expect(result.disallowedFiles).toContain('node_modules/react/index.js');
        expect(result.valid).toBe(false);
      });
    });
  });

  // ─── verifyEntries: Edge cases ────────────────────────────────────

  describe('edge cases', () => {
    it('returns valid false with all required categories missing for empty entry list', () => {
      const result = verifyEntries([]);

      expect(result.valid).toBe(false);
      expect(result.disallowedFiles).toEqual([]);
      expect(result.missingRequired).toHaveLength(REQUIRED_CHECKS.length);
    });

    it('does not flag _locales/sv/messages.json as disallowed', () => {
      const result = verifyEntries(['_locales/sv/messages.json']);

      expect(result.disallowedFiles).not.toContain('_locales/sv/messages.json');
    });

    it('does not flag src/manifest.json as disallowed', () => {
      const result = verifyEntries(['src/manifest.json']);

      expect(result.disallowedFiles).not.toContain('src/manifest.json');
    });
  });

  // ─── verifyEntries: Complete valid package ────────────────────────

  describe('complete valid package', () => {
    it('returns valid true when all required categories present and no denied files', () => {
      const entries = [
        'manifest.json',
        'background.js',
        'popup.html',
        '_locales/sv/messages.json',
        'icons/icon-16.png',
      ];

      const result = verifyEntries(entries);

      expect(result.valid).toBe(true);
      expect(result.disallowedFiles).toEqual([]);
      expect(result.missingRequired).toEqual([]);
    });
  });

  // ─── verifyEntries: Required checks ──────────────────────────────

  describe('required checks', () => {
    it('reports manifest.json as missing when not present', () => {
      const result = verifyEntries([
        'background.js',
        'popup.html',
        '_locales/sv/messages.json',
        'icons/icon-16.png',
      ]);

      expect(result.missingRequired).toContain('manifest.json');
      expect(result.valid).toBe(false);
    });

    it('reports compiled JavaScript as missing when no .js files present', () => {
      const result = verifyEntries([
        'manifest.json',
        'popup.html',
        '_locales/sv/messages.json',
        'icons/icon-16.png',
      ]);

      expect(result.missingRequired).toContain('compiled JavaScript files');
      expect(result.valid).toBe(false);
    });

    it('reports HTML files as missing when no .html files present', () => {
      const result = verifyEntries([
        'manifest.json',
        'background.js',
        '_locales/sv/messages.json',
        'icons/icon-16.png',
      ]);

      expect(result.missingRequired).toContain('HTML files');
      expect(result.valid).toBe(false);
    });

    it('reports _locales/ directory as missing when no matching entries', () => {
      const result = verifyEntries([
        'manifest.json',
        'background.js',
        'popup.html',
        'icons/icon-16.png',
      ]);

      expect(result.missingRequired).toContain('_locales/ directory');
      expect(result.valid).toBe(false);
    });

    it('reports icons/ directory as missing when no matching entries', () => {
      const result = verifyEntries([
        'manifest.json',
        'background.js',
        'popup.html',
        '_locales/sv/messages.json',
      ]);

      expect(result.missingRequired).toContain('icons/ directory');
      expect(result.valid).toBe(false);
    });
  });

  // ─── Exported constants ───────────────────────────────────────────

  describe('exported constants', () => {
    it('DENY_PATTERNS contains 4 patterns', () => {
      expect(DENY_PATTERNS).toHaveLength(4);
    });

    it('REQUIRED_CHECKS contains 5 checks', () => {
      expect(REQUIRED_CHECKS).toHaveLength(5);
    });
  });
});

// ─── main() function ────────────────────────────────────────────────

describe('main', () => {
  const zipPath = resolve(import.meta.dirname, '..', '..', 'almedalsstjarnan.zip');
  const tmpPath = zipPath + '.test-bak';

  afterEach(() => {
    vi.restoreAllMocks();
    // Safety: ensure zip is restored if a test fails midway
    if (existsSync(tmpPath) && !existsSync(zipPath)) {
      renameSync(tmpPath, zipPath);
    }
  });

  it('exits with code 1 and prints error when zip file cannot be read', () => {
    const zipExists = existsSync(zipPath);
    if (zipExists) {
      renameSync(zipPath, tmpPath);
    }

    const processExitError = new Error('process.exit called');
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw processExitError;
    });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      main();
    } catch (e: unknown) {
      // Expected: our process.exit mock throws to halt execution
      expect(e).toBe(processExitError);
    } finally {
      if (zipExists) {
        renameSync(tmpPath, zipPath);
      }
    }

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Error reading zip file'));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('processes the actual zip and produces meaningful output', () => {
    if (!existsSync(zipPath)) {
      return;
    }

    const processExitError = new Error('process.exit called');
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw processExitError;
    });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    let exited = false;
    try {
      main();
    } catch (e: unknown) {
      if (e === processExitError) {
        exited = true;
      } else {
        throw e;
      }
    }

    const allOutput = [
      ...logSpy.mock.calls.flat(),
      ...errorSpy.mock.calls.flat(),
    ].join(' ');

    // main() should produce some output (either pass or fail message)
    expect(allOutput.length).toBeGreaterThan(0);

    if (!exited) {
      // No exit means verification passed
      expect(allOutput).toContain('Package verification passed');
    } else {
      // Exit means verification failed — should report specific violations
      expect(exitSpy).toHaveBeenCalledWith(1);
      const hasDisallowed = allOutput.includes('Disallowed files found');
      const hasMissing = allOutput.includes('Required files missing');
      expect(hasDisallowed || hasMissing).toBe(true);
    }
  });
});
