/**
 * Property-based test for date grouping and within-group ordering.
 *
 * Feature: ux-enhancements, Property 2: date grouping and within-group ordering
 *
 * Validates: Requirements 2.3, 2.4
 *
 * For any array of starred events sorted chronologically, grouping by date
 * SHALL produce groups where:
 * (a) every event in a group has the same date component in its startDateTime,
 * (b) within each group events are ordered by startDateTime ascending, and
 * (c) the groups themselves are ordered by date ascending.
 */

import { describe, it } from 'vitest';
import fc from 'fast-check';

import { sortEvents } from '#core/sorter';
import { starredEventArrayArb } from '#test/helpers/event-generators';

import { groupEventsByDate } from '#ui/stars/components/EventGrid';

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Extracts the date portion (YYYY-MM-DD) from an ISO 8601 date-time string.
 */
function extractDateKey(isoString: string): string {
  const tIndex = isoString.indexOf('T');
  if (tIndex === -1) return isoString;
  return isoString.slice(0, tIndex);
}

// ─── Property Tests ───────────────────────────────────────────────

describe('Property 2: date grouping and within-group ordering', () => {
  it('(a) every event in a group has the same date component in its startDateTime', () => {
    fc.assert(
      fc.property(starredEventArrayArb, (events) => {
        const sorted = sortEvents(events, 'chronological');
        const groups = groupEventsByDate(sorted);

        for (const group of groups) {
          for (const event of group.events) {
            const eventDate = extractDateKey(event.startDateTime);
            if (eventDate !== group.dateKey) return false;
          }
        }
        return true;
      }),
      { numRuns: 100 },
    );
  });

  it('(b) within each group events are ordered by startDateTime ascending', () => {
    fc.assert(
      fc.property(starredEventArrayArb, (events) => {
        const sorted = sortEvents(events, 'chronological');
        const groups = groupEventsByDate(sorted);

        for (const group of groups) {
          for (let i = 1; i < group.events.length; i++) {
            const prev = group.events[i - 1]!;
            const curr = group.events[i]!;
            if (prev.startDateTime > curr.startDateTime) return false;
          }
        }
        return true;
      }),
      { numRuns: 100 },
    );
  });

  it('(c) the groups themselves are ordered by date ascending', () => {
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

  it('all events are preserved after grouping (no events lost or duplicated)', () => {
    fc.assert(
      fc.property(starredEventArrayArb, (events) => {
        const sorted = sortEvents(events, 'chronological');
        const groups = groupEventsByDate(sorted);

        const totalGrouped = groups.reduce((sum, g) => sum + g.events.length, 0);
        return totalGrouped === sorted.length;
      }),
      { numRuns: 100 },
    );
  });
});
