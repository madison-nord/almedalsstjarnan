// Feature: almedals-planner-extension, Property 4: Sorter ordering correctness

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import type { StarredEvent, SortOrder } from '#core/types';
import { sortEvents } from '#core/sorter';

import { starredEventArrayArb, sortOrderArb } from '#test/helpers/event-generators';

/**
 * Verifies that each adjacent pair in the sorted array satisfies
 * the sort order's comparison predicate (including tiebreakers).
 */
function isCorrectlyOrdered(sorted: readonly StarredEvent[], order: SortOrder): boolean {
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]!;
    const b = sorted[i + 1]!;

    switch (order) {
      case 'chronological': {
        if (a.startDateTime < b.startDateTime) continue;
        if (a.startDateTime > b.startDateTime) return false;
        // Equal startDateTime → id ascending
        if (a.id > b.id) return false;
        break;
      }
      case 'reverse-chronological': {
        if (a.startDateTime > b.startDateTime) continue;
        if (a.startDateTime < b.startDateTime) return false;
        // Equal startDateTime → id ascending
        if (a.id > b.id) return false;
        break;
      }
      case 'alphabetical-by-title': {
        const cmp = a.title.localeCompare(b.title, 'sv');
        if (cmp < 0) continue;
        if (cmp > 0) return false;
        // Equal title → id ascending
        if (a.id > b.id) return false;
        break;
      }
      case 'starred-desc': {
        if (a.starredAt > b.starredAt) continue;
        if (a.starredAt < b.starredAt) return false;
        // Equal starredAt → startDateTime ascending
        if (a.startDateTime > b.startDateTime) return false;
        break;
      }
    }
  }
  return true;
}

describe('Property 4: Sorter ordering correctness', () => {
  it('each adjacent pair satisfies the sort order comparison', () => {
    fc.assert(
      fc.property(starredEventArrayArb, sortOrderArb, (events, order) => {
        const sorted = sortEvents(events, order);

        expect(isCorrectlyOrdered(sorted, order)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});
