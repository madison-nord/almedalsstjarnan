// Feature: production-readiness, Property 2: Storage validator rejects invalid top-level values

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import { validateStarredEvents } from '#core/storage-validator';

/**
 * Validates: Requirements 3.1, 3.2
 *
 * For any value that is not a non-null, non-array object (including null,
 * arrays, strings, numbers, and booleans), the storage validator SHALL
 * return an empty valid record with no invalid keys.
 */
describe('Property 2: Storage validator rejects invalid top-level values', () => {
  it('returns empty valid record and empty invalidKeys for any non-object value', () => {
    const invalidTopLevelArb = fc.oneof(
      fc.constant(null),
      fc.array(fc.anything()),
      fc.string(),
      fc.integer(),
      fc.double(),
      fc.boolean(),
    );

    fc.assert(
      fc.property(invalidTopLevelArb, (input) => {
        const result = validateStarredEvents(input);

        expect(result.valid).toEqual({});
        expect(result.invalidKeys).toEqual([]);
      }),
      { numRuns: 100 },
    );
  });
});
