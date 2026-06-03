// Feature: event-data-refresh, Property 2: Self-comparison yields no changes (idempotence)

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import { compareEventFields } from '#core/event-field-comparator';

import { mutableFieldsArb } from '../helpers/event-generators';

/**
 * Property 2: For any valid MutableFields object, comparing it against itself
 * (or a structurally identical copy) SHALL produce { hasChanges: false, changedFields: [] }.
 *
 * Validates: Requirements 5.4, 5.5
 */
describe('Property 2: Self-comparison yields no changes (idempotence)', () => {
  it('comparing any MutableFields against itself yields hasChanges === false and empty changedFields', () => {
    fc.assert(
      fc.property(mutableFieldsArb, (fields) => {
        const result = compareEventFields(fields, fields);

        expect(result.hasChanges).toBe(false);
        expect(result.changedFields).toEqual([]);
      }),
      { numRuns: 100 },
    );
  });

  it('comparing a MutableFields against a structurally identical copy yields no changes', () => {
    fc.assert(
      fc.property(mutableFieldsArb, (fields) => {
        const copy = { ...fields };
        const result = compareEventFields(fields, copy);

        expect(result.hasChanges).toBe(false);
        expect(result.changedFields).toEqual([]);
      }),
      { numRuns: 100 },
    );
  });
});
