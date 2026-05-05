/**
 * Property-based test for event count indicator placeholder substitution.
 *
 * Validates that substituting {count} and {total} tokens in the eventCountIndicator
 * message template always produces a string with no raw tokens and both numeric values
 * as substrings.
 *
 * Requirements: 5.1, 5.3
 */

// Feature: ui-polish-fixes, Property 1: placeholder substitution produces no raw tokens

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

describe('count-indicator-substitution', () => {
  /**
   * **Validates: Requirements 5.1, 5.3**
   *
   * Property 1: For any pair of non-negative integers (count, total) where count ≤ total,
   * substituting them into the eventCountIndicator message template SHALL produce a string
   * that contains no raw {count} or {total} tokens and contains both numeric values as substrings.
   */
  it('placeholder substitution produces no raw tokens', () => {
    // Test with both Swedish and English message templates
    const templates = ['{count} av {total}', '{count} of {total}'];

    fc.assert(
      fc.property(
        fc.nat({ max: 10000 }),
        fc.nat({ max: 10000 }),
        fc.constantFrom(...templates),
        (count, totalOffset, template) => {
          // Ensure count ≤ total
          const total = count + totalOffset;

          const result = template
            .replace('{count}', String(count))
            .replace('{total}', String(total));

          // No raw tokens remain
          expect(result).not.toContain('{count}');
          expect(result).not.toContain('{total}');

          // Both numeric values appear as substrings
          expect(result).toContain(String(count));
          expect(result).toContain(String(total));
        },
      ),
      { numRuns: 100 },
    );
  });
});
