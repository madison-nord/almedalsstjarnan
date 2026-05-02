// Feature: almedals-planner-extension, Property 2: Sorter idempotence

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import { sortEvents } from '#core/sorter';

import { starredEventArrayArb, sortOrderArb } from '#test/helpers/event-generators';

describe('Property 2: Sorter idempotence', () => {
  it('sorting twice produces the same result as sorting once', () => {
    fc.assert(
      fc.property(starredEventArrayArb, sortOrderArb, (events, order) => {
        const sortedOnce = sortEvents(events, order);
        const sortedTwice = sortEvents(sortedOnce, order);

        expect(sortedTwice).toEqual(sortedOnce);
      }),
      { numRuns: 100 },
    );
  });
});
