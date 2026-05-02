// Feature: almedals-planner-extension, Property 7: Normalizer required field rejection

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import { normalizeEvent } from '#core/event-normalizer';
import { createMockEventCard } from '#test/helpers/dom-helpers';

import type { NormalizerError } from '#core/types';

/**
 * Property 7: For any Event_Card missing required fields,
 * normalizeEvent returns NormalizerError.
 *
 * Validates: Requirements 6.3
 */
describe('Property 7: Normalizer required field rejection', () => {
  /** Generates a whitespace-only or empty string. */
  const emptyishStringArb: fc.Arbitrary<string> = fc.oneof(
    fc.constant(''),
    fc
      .array(fc.constantFrom(' ', '\t', '\n'), { minLength: 1, maxLength: 5 })
      .map((chars) => chars.join('')),
  );

  it('returns NormalizerError when title is missing or empty (no ICS)', () => {
    fc.assert(
      fc.property(emptyishStringArb, (emptyTitle) => {
        const card = createMockEventCard({
          title: emptyTitle,
          icsDataUri: null,
        });

        const result = normalizeEvent(card);

        expect(result.ok).toBe(false);
        const error = result as NormalizerError;
        expect(error.reason).toBeTruthy();
      }),
      { numRuns: 100 },
    );
  });

  it('returns NormalizerError when startDateTime cannot be determined (no ICS, empty time)', () => {
    fc.assert(
      fc.property(emptyishStringArb, (emptyTime) => {
        const card = createMockEventCard({
          timeText: emptyTime,
          icsDataUri: null,
        });

        const result = normalizeEvent(card);

        expect(result.ok).toBe(false);
        const error = result as NormalizerError;
        expect(error.reason).toBeTruthy();
      }),
      { numRuns: 100 },
    );
  });

  it('returns NormalizerError when both title and startDateTime are missing (no ICS)', () => {
    fc.assert(
      fc.property(emptyishStringArb, emptyishStringArb, (emptyTitle, emptyTime) => {
        const card = createMockEventCard({
          title: emptyTitle,
          timeText: emptyTime,
          icsDataUri: null,
        });

        const result = normalizeEvent(card);

        expect(result.ok).toBe(false);
        const error = result as NormalizerError;
        expect(error.reason).toBeTruthy();
      }),
      { numRuns: 100 },
    );
  });
});
