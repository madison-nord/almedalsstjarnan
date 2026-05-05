// Feature: ux-enhancements, Property 6: badge count matches starred event count
// Validates: Requirements 7.4, 7.6

/**
 * Property test: For any record of starred events (including the empty record),
 * the badge text SHALL equal the string representation of the number of entries
 * when the count is greater than zero, and SHALL be the empty string when the
 * count is zero.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import type { StarredEvent, EventId } from '#core/types';

import { starredEventArb } from '#test/helpers/event-generators';

import { computeBadgeText } from '#extension/background';

describe('Property 6: badge count matches starred event count', () => {
  it('badge text equals String(count) when count > 0, and empty string when count === 0', () => {
    fc.assert(
      fc.property(
        fc.array(starredEventArb, { minLength: 0, maxLength: 50 }).map((events) => {
          // Deduplicate by ID to create a valid Record<EventId, StarredEvent>
          const record: Record<EventId, StarredEvent> = {};
          for (const event of events) {
            record[event.id] = event;
          }
          return record;
        }),
        (starredEvents) => {
          const result = computeBadgeText(starredEvents);
          const count = Object.keys(starredEvents).length;

          if (count > 0) {
            expect(result).toBe(String(count));
          } else {
            expect(result).toBe('');
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('empty record always produces empty string badge text', () => {
    const result = computeBadgeText({});
    expect(result).toBe('');
  });

  it('single-entry record produces "1"', () => {
    fc.assert(
      fc.property(starredEventArb, (event) => {
        const record: Record<EventId, StarredEvent> = { [event.id]: event };
        const result = computeBadgeText(record);
        expect(result).toBe('1');
      }),
      { numRuns: 100 },
    );
  });
});
