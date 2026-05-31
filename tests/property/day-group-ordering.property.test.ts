// Feature: stars-page-sorting, Property 5: Time-based sort produces correctly ordered day-groups

import { describe, it } from 'vitest';
import fc from 'fast-check';

import { sortEvents } from '#core/sorter';
import { groupEventsByDate } from '#ui/stars/components/EventGrid';

import { starredEventArrayArb } from '#test/helpers/event-generators';

/**
 * Validates: Requirements 2.1, 3.1, 3.2
 *
 * For any array of starred events and any time-based sort order,
 * `groupEventsByDate` applied to the sorted events SHALL produce groups
 * whose date keys are ordered ascending for chronological sort and
 * descending for reverse-chronological sort.
 */

const timeBasedSortOrderArb = fc.constantFrom('chronological' as const, 'reverse-chronological' as const);

describe('Property 5: Time-based sort produces correctly ordered day-groups', () => {
  it('chronological sort produces day-groups in ascending date order', () => {
    fc.assert(
      fc.property(starredEventArrayArb, (events) => {
        const sorted = sortEvents(events, 'chronological');
        const groups = groupEventsByDate(sorted);

        for (let i = 1; i < groups.length; i++) {
          const prevDate = groups[i - 1]!.dateKey;
          const currDate = groups[i]!.dateKey;
          if (prevDate >= currDate) return false;
        }
        return true;
      }),
      { numRuns: 100 },
    );
  });

  it('reverse-chronological sort produces day-groups in descending date order', () => {
    fc.assert(
      fc.property(starredEventArrayArb, (events) => {
        const sorted = sortEvents(events, 'reverse-chronological');
        const groups = groupEventsByDate(sorted);

        for (let i = 1; i < groups.length; i++) {
          const prevDate = groups[i - 1]!.dateKey;
          const currDate = groups[i]!.dateKey;
          if (prevDate <= currDate) return false;
        }
        return true;
      }),
      { numRuns: 100 },
    );
  });

  it('for any time-based sort order, groups are in correct date order', () => {
    fc.assert(
      fc.property(starredEventArrayArb, timeBasedSortOrderArb, (events, order) => {
        const sorted = sortEvents(events, order);
        const groups = groupEventsByDate(sorted);

        for (let i = 1; i < groups.length; i++) {
          const prevDate = groups[i - 1]!.dateKey;
          const currDate = groups[i]!.dateKey;

          if (order === 'chronological') {
            if (prevDate >= currDate) return false;
          } else {
            if (prevDate <= currDate) return false;
          }
        }
        return true;
      }),
      { numRuns: 100 },
    );
  });
});
