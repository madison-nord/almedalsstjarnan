// Feature: production-readiness, Property 1: fnv1aHex deterministic consistency

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import { deriveEventId } from '#core/event-normalizer';

describe('Property 1: fnv1aHex deterministic consistency', () => {
  /**
   * **Validates: Requirements 1.3**
   *
   * For any input strings (title and startDateTime), calling deriveEventId
   * with null icsUrl and null detailUrl (which triggers the fnv1aHex fallback)
   * produces the same result on repeated calls, and the output is a valid
   * 16-character hex string.
   */
  it('deriveEventId hash fallback produces deterministic 16-char hex output', () => {
    const titleArb = fc.string({ minLength: 1, maxLength: 200 });
    const startDateTimeArb = fc.string({ minLength: 1, maxLength: 50 });

    fc.assert(
      fc.property(titleArb, startDateTimeArb, (title, startDateTime) => {
        // Call deriveEventId twice with null icsUrl and detailUrl to trigger hash fallback
        const result1 = deriveEventId(null, null, title, startDateTime);
        const result2 = deriveEventId(null, null, title, startDateTime);

        // Assert deterministic: same inputs produce identical output
        expect(result1).toBe(result2);

        // Assert output is exactly 16 characters long
        expect(result1).toHaveLength(16);

        // Assert output is a valid hex string (only hex digits)
        expect(result1).toMatch(/^[0-9a-f]{16}$/);
      }),
      { numRuns: 100 },
    );
  });
});
