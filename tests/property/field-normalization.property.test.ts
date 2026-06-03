// Feature: event-data-refresh, Property 1: Field normalization converts whitespace-only to null and trims

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import { normalizeFieldValue } from '#core/event-field-comparator';

/**
 * Property 1: For any string value (including empty strings, whitespace-only strings,
 * and strings with leading/trailing whitespace), normalizeFieldValue SHALL return null
 * for empty or whitespace-only inputs, and a trimmed string otherwise. For any null
 * input, it SHALL return null.
 *
 * Validates: Requirements 5.1
 */
describe('Property 1: Field normalization converts whitespace-only to null and trims', () => {
  it('null input produces null output', () => {
    fc.assert(
      fc.property(fc.constant(null), (value) => {
        expect(normalizeFieldValue(value)).toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  it('whitespace-only strings produce null output', () => {
    const whitespaceOnlyArb: fc.Arbitrary<string> = fc
      .array(fc.constantFrom(' ', '\t', '\n', '\r', '\f', '\v'), {
        minLength: 1,
        maxLength: 20,
      })
      .map((chars) => chars.join(''));

    fc.assert(
      fc.property(whitespaceOnlyArb, (value) => {
        expect(normalizeFieldValue(value)).toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  it('non-whitespace strings produce trimmed output with no leading/trailing whitespace', () => {
    const nonWhitespaceStringArb: fc.Arbitrary<string> = fc
      .tuple(
        fc.string({ minLength: 0, maxLength: 10 }),
        fc.stringMatching(/^[A-Za-z0-9]{1,40}$/),
        fc.string({ minLength: 0, maxLength: 10 }),
      )
      .map(([leading, core, trailing]) => `${leading}${core}${trailing}`);

    fc.assert(
      fc.property(nonWhitespaceStringArb, (value) => {
        const result = normalizeFieldValue(value);

        // Since the string contains at least one non-whitespace character,
        // the result should never be null
        expect(result).not.toBeNull();

        // Result should have no leading or trailing whitespace
        expect(result).toBe(result!.trim());
      }),
      { numRuns: 100 },
    );
  });
});
