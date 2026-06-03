// Feature: event-data-refresh, Property 3: Comparison detects real differences (sensitivity)

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import {
  compareEventFields,
  MUTABLE_FIELDS,
  normalizeFieldValue,
} from '#core/event-field-comparator';
import type { MutableFields, MutableFieldName } from '#core/event-field-comparator';

import { mutableFieldsArb } from '#test/helpers/event-generators';

/**
 * Property 3: For any two MutableFields objects that differ in at least one field
 * after normalization, compareEventFields SHALL return { hasChanges: true } with
 * changedFields containing at least the differing field name.
 *
 * Validates: Requirements 5.3, 5.6
 */
describe('Property 3: Comparison detects real differences (sensitivity)', () => {
  it('detects at least one changed field when a field is mutated to a different normalized value', () => {
    // Strategy:
    // 1. Generate a base MutableFields object
    // 2. Pick a random field index and mutate that field to a different value
    //    (ensuring it's different after normalization)
    // 3. Compare the base against the mutated version

    const mutatedPairArb = fc
      .tuple(
        mutableFieldsArb,
        fc.integer({ min: 0, max: MUTABLE_FIELDS.length - 1 }),
        fc.oneof(fc.stringMatching(/^[A-Za-z0-9]{1,50}$/), fc.constant(null)),
      )
      .filter(([base, fieldIndex, newValue]) => {
        const fieldName: MutableFieldName = MUTABLE_FIELDS[fieldIndex]!;
        const originalNormalized = normalizeFieldValue(base[fieldName]);
        const newNormalized = normalizeFieldValue(newValue);
        // Ensure the new value is actually different after normalization
        return originalNormalized !== newNormalized;
      })
      .map(([base, fieldIndex, newValue]) => {
        const fieldName: MutableFieldName = MUTABLE_FIELDS[fieldIndex]!;
        const mutated: MutableFields = { ...base, [fieldName]: newValue };
        return { base, mutated, fieldName };
      });

    fc.assert(
      fc.property(mutatedPairArb, ({ base, mutated, fieldName }) => {
        const result = compareEventFields(mutated, base);

        expect(result.hasChanges).toBe(true);
        expect(result.changedFields.length).toBeGreaterThanOrEqual(1);
        expect(result.changedFields).toContain(fieldName);
      }),
      { numRuns: 100 },
    );
  });
});
