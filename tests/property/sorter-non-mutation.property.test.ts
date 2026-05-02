// Feature: almedals-planner-extension, Property 5: Sorter non-mutation

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import { sortEvents } from '#core/sorter';

import { starredEventArrayArb, sortOrderArb } from '#test/helpers/event-generators';

describe('Property 5: Sorter non-mutation', () => {
  it('original array is unchanged after sort', () => {
    fc.assert(
      fc.property(starredEventArrayArb, sortOrderArb, (events, order) => {
        // Take a snapshot of the original array contents
        const snapshot = events.map((e) => e.id);

        sortEvents(events, order);

        // The original array must be unchanged
        expect(events.map((e) => e.id)).toEqual(snapshot);
      }),
      { numRuns: 100 },
    );
  });
});
