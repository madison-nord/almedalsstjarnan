// Feature: ux-enhancements, Property 1: filter returns only matching events
// Validates: Requirements 2.1, 2.2

/**
 * Property test: For any array of starred events and for any non-empty filter
 * string, applying the text filter SHALL return only events where the title,
 * organiser, or topic contains the filter string (case-insensitive).
 * Additionally, no event that matches the filter SHALL be excluded from the results.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import { filterEvents } from '#core/event-filter';

import { starredEventArrayArb } from '#test/helpers/event-generators';

/**
 * Helper: checks if an event matches a filter string (case-insensitive)
 * by checking title, organiser, or topic.
 */
function eventMatchesFilter(
  event: { readonly title: string; readonly organiser: string | null; readonly topic: string | null },
  filter: string,
): boolean {
  const lowerFilter = filter.toLowerCase();
  const title = event.title.toLowerCase();
  const organiser = (event.organiser ?? '').toLowerCase();
  const topic = (event.topic ?? '').toLowerCase();

  return (
    title.includes(lowerFilter) ||
    organiser.includes(lowerFilter) ||
    topic.includes(lowerFilter)
  );
}

/** Generates a non-empty filter string suitable for text matching. */
const nonEmptyFilterArb: fc.Arbitrary<string> = fc
  .string({ minLength: 1, maxLength: 10 })
  .filter((s) => s.trim().length > 0);

describe('Property 1: filter returns only matching events', () => {
  it('every returned event matches the filter (no false positives)', () => {
    fc.assert(
      fc.property(
        starredEventArrayArb,
        nonEmptyFilterArb,
        (events, filter) => {
          const result = filterEvents(events, filter);

          for (const event of result) {
            expect(eventMatchesFilter(event, filter)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('no matching event is excluded from the results (no false negatives)', () => {
    fc.assert(
      fc.property(
        starredEventArrayArb,
        nonEmptyFilterArb,
        (events, filter) => {
          const result = filterEvents(events, filter);
          const resultIds = new Set(result.map((e) => e.id));

          for (const event of events) {
            if (eventMatchesFilter(event, filter)) {
              expect(resultIds.has(event.id)).toBe(true);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('empty filter returns all events unchanged', () => {
    fc.assert(
      fc.property(
        starredEventArrayArb,
        (events) => {
          const result = filterEvents(events, '');
          expect(result).toEqual(events);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('filter is case-insensitive', () => {
    fc.assert(
      fc.property(
        starredEventArrayArb,
        nonEmptyFilterArb,
        (events, filter) => {
          const resultLower = filterEvents(events, filter.toLowerCase());
          const resultUpper = filterEvents(events, filter.toUpperCase());

          const idsLower = resultLower.map((e) => e.id).sort();
          const idsUpper = resultUpper.map((e) => e.id).sort();

          expect(idsLower).toEqual(idsUpper);
        },
      ),
      { numRuns: 100 },
    );
  });
});
