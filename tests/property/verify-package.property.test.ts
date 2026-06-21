// Feature: chrome-store-publishing, Property 1: Deny-list completeness
// Feature: chrome-store-publishing, Property 2: Require-list accuracy
// Feature: chrome-store-publishing, Property 3: Clean build passes verification

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

import { DENY_PATTERNS, REQUIRED_CHECKS, verifyEntries } from '../../scripts/verify-package';

// --- Custom Arbitraries ---

/** Safe filename segment (no slashes, no special patterns that accidentally match deny rules). */
const safeSegmentArb: fc.Arbitrary<string> = fc
  .string({ minLength: 1, maxLength: 12, unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-_'.split('')) })
  .filter((s) => s !== 'test' && s !== 'tests' && s !== 'node_modules');

/** File extension that does NOT match deny patterns (no .map). */
const safeExtensionArb: fc.Arbitrary<string> = fc.constantFrom(
  '.js',
  '.ts',
  '.html',
  '.css',
  '.json',
  '.png',
  '.svg',
);

/**
 * Generates a safe file path that will NOT match any DENY_PATTERNS.
 * Avoids .map suffix, .kiro/ prefix, tests/ or test/ directories, and node_modules/ prefix.
 */
const safeFilePathArb: fc.Arbitrary<string> = fc
  .tuple(
    fc.array(safeSegmentArb, { minLength: 0, maxLength: 3 }),
    safeSegmentArb,
    safeExtensionArb,
  )
  .map(([dirs, name, ext]) => {
    const path = dirs.length > 0 ? `${dirs.join('/')}/${name}${ext}` : `${name}${ext}`;
    return path;
  })
  .filter((path) => !DENY_PATTERNS.some((p) => p.test(path)));

/** Generates a file path that matches a specific deny pattern. */
function denyPatternEntryArb(patternIndex: number): fc.Arbitrary<string> {
  switch (patternIndex) {
    case 0: // /\.map$/
      return safeSegmentArb.map((name) => `${name}.map`);
    case 1: // /^\.kiro\//
      return safeSegmentArb.map((name) => `.kiro/${name}.json`);
    case 2: // /(?:^|\/)tests?\//
      return fc
        .tuple(fc.constantFrom('test', 'tests'), safeSegmentArb)
        .map(([dir, name]) => `${dir}/${name}.ts`);
    case 3: // /^node_modules\//
      return safeSegmentArb.map((name) => `node_modules/${name}/index.js`);
    default:
      return safeSegmentArb.map((name) => `${name}.map`);
  }
}

/** Generates at least one entry matching a deny pattern, mixed with safe entries. */
const entryListWithDenyMatchesArb: fc.Arbitrary<{
  entries: readonly string[];
  deniedEntries: readonly string[];
}> = fc
  .tuple(
    fc.array(safeFilePathArb, { minLength: 0, maxLength: 10 }),
    fc
      .array(
        fc
          .integer({ min: 0, max: DENY_PATTERNS.length - 1 })
          .chain((idx) => denyPatternEntryArb(idx)),
        { minLength: 1, maxLength: 5 },
      )
      .filter((arr) => arr.length > 0),
  )
  .map(([safe, denied]) => {
    // Shuffle denied entries into the safe list
    const entries = [...safe, ...denied];
    return { entries, deniedEntries: denied };
  });

/** Generates a file path matching a specific required category. */
function requiredCategoryEntryArb(categoryIndex: number): fc.Arbitrary<string> {
  switch (categoryIndex) {
    case 0: // manifest.json
      return fc.constant('manifest.json');
    case 1: // .js files
      return safeSegmentArb.map((name) => `${name}.js`);
    case 2: // .html files
      return safeSegmentArb.map((name) => `${name}.html`);
    case 3: // _locales/ directory
      return fc
        .tuple(fc.constantFrom('en', 'sv', 'de', 'fr'), safeSegmentArb)
        .map(([locale, name]) => `_locales/${locale}/${name}.json`);
    case 4: // icons/ directory
      return safeSegmentArb.map((name) => `icons/${name}.png`);
    default:
      return fc.constant('manifest.json');
  }
}

/**
 * Generates entries that satisfy ALL required categories and match ZERO deny patterns.
 * This represents a "clean" build.
 */
const cleanBuildEntriesArb: fc.Arbitrary<readonly string[]> = fc
  .tuple(
    // One entry per required category
    ...REQUIRED_CHECKS.map((_, i) => requiredCategoryEntryArb(i)),
    // Additional safe entries
    fc.array(safeFilePathArb, { minLength: 0, maxLength: 10 }),
  )
  .map((parts) => {
    const additional = parts[parts.length - 1] as string[];
    const required = parts.slice(0, -1) as string[];
    return [...required, ...additional];
  })
  .filter((entries) => !entries.some((e) => DENY_PATTERNS.some((p) => p.test(e))));

// --- Property Tests ---

describe('Property 1: Deny-list completeness', () => {
  /**
   * **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.7**
   *
   * For any list of file entries containing deny-pattern matches,
   * verifyEntries must report ALL matching entries in disallowedFiles
   * and set valid to false.
   */
  it('all deny-pattern matches are reported in disallowedFiles', () => {
    fc.assert(
      fc.property(entryListWithDenyMatchesArb, ({ entries, deniedEntries }) => {
        const result = verifyEntries(entries);

        // Every denied entry must appear in disallowedFiles
        for (const denied of deniedEntries) {
          expect(result.disallowedFiles).toContain(denied);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('valid is false when deny-pattern matches exist', () => {
    fc.assert(
      fc.property(entryListWithDenyMatchesArb, ({ entries }) => {
        const result = verifyEntries(entries);
        expect(result.valid).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});

describe('Property 2: Require-list accuracy', () => {
  /**
   * **Validates: Requirements 6.5, 6.8**
   *
   * For any list of file entries, missingRequired reports exactly those
   * categories with no matching entry — no false positives, no false negatives.
   */
  it('missingRequired matches exactly the categories with no entry', () => {
    fc.assert(
      fc.property(
        fc.array(safeFilePathArb, { minLength: 0, maxLength: 15 }),
        (entries) => {
          const result = verifyEntries(entries);

          // Independently compute expected missing categories
          const expectedMissing: string[] = [];
          for (const check of REQUIRED_CHECKS) {
            const hasMatch = entries.some((entry) => check.pattern.test(entry));
            if (!hasMatch) {
              expectedMissing.push(check.label);
            }
          }

          // No false negatives: every truly missing category is reported
          for (const label of expectedMissing) {
            expect(result.missingRequired).toContain(label);
          }

          // No false positives: every reported category is truly missing
          for (const label of result.missingRequired) {
            expect(expectedMissing).toContain(label);
          }

          // Exact count match
          expect(result.missingRequired.length).toBe(expectedMissing.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Property 3: Clean build passes verification', () => {
  /**
   * **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**
   *
   * For any list of file entries with at least one entry per required category
   * and zero deny-pattern matches, verifyEntries returns valid: true with
   * empty disallowedFiles and empty missingRequired.
   */
  it('entries satisfying all requirements with no deny matches yield valid=true', () => {
    fc.assert(
      fc.property(cleanBuildEntriesArb, (entries) => {
        const result = verifyEntries(entries);

        expect(result.valid).toBe(true);
        expect(result.disallowedFiles).toHaveLength(0);
        expect(result.missingRequired).toHaveLength(0);
      }),
      { numRuns: 100 },
    );
  });
});
