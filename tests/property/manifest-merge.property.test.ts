// Feature: almedals-planner-extension, Property 14: Manifest merge precedence

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

import { mergeManifest } from '#extension/manifest/merge-manifest';

/**
 * Generates a JSON-like object arbitrary suitable for manifest merge testing.
 * Produces objects with string, number, boolean, null, array, and nested object values.
 */
const jsonValueArb: fc.Arbitrary<unknown> = fc.letrec((tie) => ({
  value: fc.oneof(
    { depthSize: 'small' },
    fc.string(),
    fc.integer(),
    fc.boolean(),
    fc.constant(null),
    fc.array(fc.oneof(fc.string(), fc.integer(), fc.boolean()), {
      maxLength: 5,
    }),
    fc.dictionary(
      fc.string({ minLength: 1, maxLength: 10 }),
      tie('value'),
      { maxKeys: 4 },
    ),
  ),
})).value;

const manifestObjectArb: fc.Arbitrary<Record<string, unknown>> = fc.dictionary(
  fc.string({ minLength: 1, maxLength: 15 }),
  jsonValueArb,
  { maxKeys: 8 },
);

describe('Property 14: Manifest merge precedence', () => {
  /**
   * **Validates: Requirements 2.9, 17.3**
   *
   * All keys from both base and override must be present in the merged result.
   */
  it('result contains all keys from both base and override', () => {
    fc.assert(
      fc.property(manifestObjectArb, manifestObjectArb, (base, override) => {
        const result = mergeManifest(base, override);
        const resultKeys = Object.keys(result);

        for (const key of Object.keys(base)) {
          expect(resultKeys).toContain(key);
        }
        for (const key of Object.keys(override)) {
          expect(resultKeys).toContain(key);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 2.9, 17.3**
   *
   * Override values take precedence: for any key present in both base and override,
   * the result value must match the override (for non-object values or arrays).
   */
  it('override values take precedence for non-object keys', () => {
    fc.assert(
      fc.property(manifestObjectArb, manifestObjectArb, (base, override) => {
        const result = mergeManifest(base, override);

        for (const key of Object.keys(override)) {
          const overrideVal = override[key];
          const baseVal = base[key];

          // If both are plain objects (not arrays, not null), they get deep-merged
          // so we skip those — they are tested in the nested merge property below.
          const bothAreObjects =
            typeof baseVal === 'object' &&
            baseVal !== null &&
            !Array.isArray(baseVal) &&
            typeof overrideVal === 'object' &&
            overrideVal !== null &&
            !Array.isArray(overrideVal);

          if (!bothAreObjects) {
            expect(result[key]).toEqual(overrideVal);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 2.9, 17.3**
   *
   * Nested objects are recursively merged: when both base and override have
   * a plain object at the same key, the result contains keys from both.
   */
  it('nested objects are recursively merged', () => {
    const nestedObjectArb = fc.dictionary(
      fc.string({ minLength: 1, maxLength: 10 }),
      fc.string(),
      { minKeys: 1, maxKeys: 5 },
    );

    fc.assert(
      fc.property(nestedObjectArb, nestedObjectArb, (baseNested, overrideNested) => {
        const base = { nested: baseNested as Record<string, unknown> };
        const override = { nested: overrideNested as Record<string, unknown> };
        const result = mergeManifest(base, override);
        const resultNested = result['nested'] as Record<string, unknown>;

        // All keys from base nested should be present
        for (const key of Object.keys(baseNested)) {
          expect(resultNested).toHaveProperty(key);
        }
        // All keys from override nested should be present
        for (const key of Object.keys(overrideNested)) {
          expect(resultNested).toHaveProperty(key);
        }
        // Override values take precedence in the nested object
        for (const key of Object.keys(overrideNested)) {
          expect(resultNested[key]).toEqual(overrideNested[key]);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 2.9, 17.3**
   *
   * Merging with an empty override returns a result equal to the base.
   */
  it('merging with empty override preserves base', () => {
    fc.assert(
      fc.property(manifestObjectArb, (base) => {
        const result = mergeManifest(base, {});
        expect(result).toEqual(base);
      }),
      { numRuns: 100 },
    );
  });
});
