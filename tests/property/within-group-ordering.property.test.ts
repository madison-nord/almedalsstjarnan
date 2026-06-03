// Feature: stars-page-sorting, Property 7: Within-group events ordered by start time ascending with id tiebreaker

/**
 * Property-based test for within-group event ordering.
 *
 * Validates: Requirements 3.3, 3.4
 *
 * For any array of starred events and any time-based sort order, within each
 * day-group produced by groupEventsByDate, events SHALL be ordered by
 * startDateTime ascending, with id ascending as a deterministic tiebreaker
 * for identical start times.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import { sortEvents } from '#core/sorter';
import { starredEventArrayArb } from '#test/helpers/event-generators';
import { groupEventsByDate } from '#ui/stars/components/EventGrid';

const timeBasedSortArb = fc.constantFrom('chronological' as const, 'reverse-chronological' as const);

describe('Property 7: Within-group events ordered by start time ascending with id tiebreaker', () => {
  /**
   * Validates: Requirements 3.3
   *
   * Within each day-group, events are ordered by startDateTime ascending
   * regardless of whether the overall sort is chronological or reverse-chronological.
   */
  it('within each day-group, events are ordered by startDateTime ascending', () => {
    fc.assert(
      fc.property(starredEventArrayArb, timeBasedSortArb, (events, order) => {
        const sorted = sortEvents(events, order);
        const groups = groupEventsByDate(sorted);

        for (const group of groups) {
          for (let i = 1; i < group.events.length; i++) {
            const prev = group.events[i - 1]!;
            const curr = group.events[i]!;
            if (order === 'chronological') {
              expect(prev.startDateTime <= curr.startDateTime).toBe(true);
            } else {
              // reverse-chronological: within same day, events are descending
              expect(prev.startDateTime >= curr.startDateTime).toBe(true);
            }
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Validates: Requirements 3.4
   *
   * When two events within the same day-group have identical startDateTime,
   * they are ordered by id ascending as a deterministic tiebreaker.
   */
  it('events with identical startDateTime within a group are ordered by id ascending', () => {
    fc.assert(
      fc.property(starredEventArrayArb, timeBasedSortArb, (events, order) => {
        const sorted = sortEvents(events, order);
        const groups = groupEventsByDate(sorted);

        for (const group of groups) {
          for (let i = 1; i < group.events.length; i++) {
            const prev = group.events[i - 1]!;
            const curr = group.events[i]!;
            if (prev.startDateTime === curr.startDateTime) {
              expect(prev.id < curr.id).toBe(true);
            }
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});
