// Feature: almedals-planner-extension, Property 6: Normalizer whitespace trimming

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import { normalizeEvent } from '#core/event-normalizer';
import { createMockEventCard } from '#test/helpers/dom-helpers';

import type { NormalizerSuccess } from '#core/types';

/**
 * Property 6: For any Event_Card with whitespace-padded string fields,
 * normalizeEvent produces trimmed values.
 *
 * Validates: Requirements 6.5
 */
describe('Property 6: Normalizer whitespace trimming', () => {
  /** Generates a whitespace string of 1–5 characters. */
  const whitespaceArb: fc.Arbitrary<string> = fc
    .array(fc.constantFrom(' ', '\t', '\n'), { minLength: 1, maxLength: 5 })
    .map((chars) => chars.join(''));

  /** Generates a non-empty string with leading/trailing whitespace. */
  const paddedStringArb: fc.Arbitrary<string> = fc
    .tuple(
      whitespaceArb,
      fc.stringMatching(/^[A-Za-z0-9]{1,40}$/),
      whitespaceArb,
    )
    .map(([leading, core, trailing]) => `${leading}${core}${trailing}`);

  it('trims all string fields in the normalized event', () => {
    fc.assert(
      fc.property(
        paddedStringArb,
        paddedStringArb,
        paddedStringArb,
        paddedStringArb,
        paddedStringArb,
        (paddedTitle, paddedOrganiser, paddedLocation, paddedDescription, paddedTopic) => {
          const card = createMockEventCard({
            title: paddedTitle,
            organiser: paddedOrganiser,
            location: paddedLocation,
            description: paddedDescription,
            primaryTopic: paddedTopic,
          });

          const result = normalizeEvent(card);

          if (!result.ok) {
            // If the card fails normalization (e.g., title trims to empty), skip
            return;
          }

          const event = (result as NormalizerSuccess).event;

          // All string fields should be trimmed (no leading/trailing whitespace)
          expect(event.title).toBe(event.title.trim());
          if (event.organiser !== null) {
            expect(event.organiser).toBe(event.organiser.trim());
          }
          if (event.location !== null) {
            expect(event.location).toBe(event.location.trim());
          }
          if (event.description !== null) {
            expect(event.description).toBe(event.description.trim());
          }
          if (event.topic !== null) {
            expect(event.topic).toBe(event.topic.trim());
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
