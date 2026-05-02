// Feature: almedals-planner-extension, Property 3: Sorter length preservation

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import { sortEvents } from '#core/sorter';

import { starredEventArrayArb, sortOrderArb } from '#test/helpers/event-generators';

describe('Property 3: Sorter length preservation', () => {
  it('output length equals input length', () => {
    fc.assert(
      fc.property(starredEventArrayArb, sortOrderArb, (events, order) => {
        const result = sortEvents(events, order);

        expect(result).toHaveLength(events.length);
      }),
      { numRuns: 100 },
    );
  });
});
