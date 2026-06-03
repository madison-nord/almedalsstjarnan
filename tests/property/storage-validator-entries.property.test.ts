// Feature: production-readiness, Property 3: Storage validator filters malformed entries and preserves valid entries unchanged

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import { validateStarredEvents, isValidStarredEntry } from '#core/storage-validator';

import { mixedStorageRecordArb } from '../helpers/event-generators';

/**
 * Validates: Requirements 3.3, 3.4, 3.5, 3.6
 *
 * For any object containing a mix of valid StarredEvent entries and malformed
 * entries (missing fields, wrong types, id/key mismatch), the storage validator
 * SHALL return exactly the subset of entries that satisfy all validation checks,
 * with each valid entry identical to the input (round-trip preservation).
 */
describe('Property 3: Storage validator filters malformed entries and preserves valid entries unchanged', () => {
  it('returns exactly the valid subset and excludes malformed entries', () => {
    fc.assert(
      fc.property(mixedStorageRecordArb, ({ record, validKeys, malformedKeys }) => {
        const result = validateStarredEvents(record);

        // Valid entries are preserved unchanged (round-trip preservation)
        for (const key of validKeys) {
          expect(result.valid[key]).toEqual(record[key]);
        }

        // All returned valid keys are entries that pass isValidStarredEntry
        for (const [key, value] of Object.entries(result.valid)) {
          expect(isValidStarredEntry(key, value)).toBe(true);
        }

        // Malformed entries are excluded from valid result
        for (const key of malformedKeys) {
          expect(result.valid[key]).toBeUndefined();
        }

        // invalidKeys contains exactly the malformed keys
        for (const key of malformedKeys) {
          expect(result.invalidKeys).toContain(key);
        }

        // No valid key appears in invalidKeys
        for (const key of validKeys) {
          expect(result.invalidKeys).not.toContain(key);
        }
      }),
      { numRuns: 100 },
    );
  });
});
